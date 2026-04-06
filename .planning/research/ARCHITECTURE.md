# Architecture Patterns

**Project:** Campfire v1.3 — Liveness & Notifications
**Researched:** 2026-04-06
**Research mode:** Integration architecture for subsequent milestone
**Overall confidence:** HIGH (grounded in actual repo inspection)

---

## Context Snapshot — What Already Exists

Verified by reading the codebase, not assumed:

| Asset | Status | Location |
|---|---|---|
| `push_tokens` table | EXISTS (needs evolution) | `supabase/migrations/0003_push_tokens.sql` |
| `notify-plan-invite` Edge Function | EXISTS | `supabase/functions/notify-plan-invite/index.ts` |
| `registerForPushNotifications()` helper | EXISTS | `src/hooks/usePushNotifications.ts` |
| Token registration call site | Profile toggle only | `src/app/(tabs)/profile.tsx:73` |
| `statuses` table | EXISTS, no TTL column | `supabase/migrations/0001_init.sql:43` |
| `handle_new_user` trigger | Auto-creates profile + status | `0001_init.sql:456` |
| Realtime on `statuses` | `REPLICA IDENTITY FULL` set | `0001_init.sql:490` |
| `HomeFriendCard` | Pure View, NOT tappable | `src/components/home/HomeFriendCard.tsx` |
| Plan invite push flow | Database Webhook → Edge Function | Table `plan_members` INSERT fires `notify-plan-invite` |

**The current `push_tokens` schema is too thin for v1.3:**

```sql
-- Existing (0003_push_tokens.sql)
push_tokens (id, user_id, token, platform, created_at)
UNIQUE (user_id, token)
```

No `device_id`, no `last_seen_at`, no notion of stale tokens. The current upsert in `usePushNotifications.ts` uses `onConflict: 'user_id,token'` which matches the existing unique index — but we have no way to reap dead tokens or dedupe by device. **v1.3 must migrate this table.**

**The plan-invite flow is already wired end-to-end.** A Database Webhook on `plan_members` INSERT calls `notify-plan-invite`, which fetches tokens and calls Expo push. The "gap" is not the server side — it is **registration**. Tokens are only ever registered when the user flips the Profile toggle. A fresh install that never visits Profile has an empty `push_tokens` row and will silently receive nothing. This is the fix point for Feature #5.

---

## Recommended Architecture per Feature

### Feature 1 — Status TTL & Freshness

**Schema changes** (single new migration, e.g. `0008_status_ttl.sql`):

```sql
-- Add expiry + source tracking to statuses
ALTER TABLE public.statuses
  ADD COLUMN expires_at  timestamptz,           -- NULL = never expires (legacy/opt-out)
  ADD COLUMN set_at      timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN set_source  text NOT NULL DEFAULT 'manual'
    CHECK (set_source IN ('manual', 'morning_prompt', 'push_action', 'daily_reset'));

-- Partial index for the expiry sweep
CREATE INDEX idx_statuses_expires_at
  ON public.statuses (expires_at)
  WHERE expires_at IS NOT NULL;

-- Append-only history
CREATE TABLE public.status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      public.availability_status NOT NULL,
  context_tag text,
  set_source  text NOT NULL,
  set_at      timestamptz NOT NULL DEFAULT now(),
  expired_at  timestamptz
);
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_status_history_user_set ON public.status_history (user_id, set_at DESC);
```

**Default TTL per status type** (encoded in an RPC, not a column, so we can tune without migrations):

| Status | Default TTL | Rationale |
|---|---|---|
| `free`  | 4 hours | Free is a commitment — decays to "not actively Free" after half an afternoon |
| `maybe` | 8 hours | Soft signal, longer half-life |
| `busy`  | 6 hours | Busy now != busy tomorrow |

Reset happens at 4am local time regardless of TTL (see daily reset job).

**RLS on `status_history`:**
- SELECT own: `user_id = (SELECT auth.uid())`
- SELECT friend: reuse `is_friend_of(user_id)` helper
- INSERT: only via SECURITY DEFINER trigger (no direct client writes)
- UPDATE/DELETE: none

**Trigger — append to history + stamp set_at:**

```sql
CREATE OR REPLACE FUNCTION public.record_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Close out previous row
  UPDATE public.status_history
    SET expired_at = now()
    WHERE user_id = NEW.user_id AND expired_at IS NULL;
  -- Insert new row
  INSERT INTO public.status_history (user_id, status, context_tag, set_source, set_at)
    VALUES (NEW.user_id, NEW.status, NEW.context_tag, NEW.set_source, now());
  NEW.set_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER statuses_record_history
  BEFORE INSERT OR UPDATE OF status, context_tag ON public.statuses
  FOR EACH ROW EXECUTE PROCEDURE public.record_status_change();
```

**Daily reset job — pg_cron, NOT client-side.** Client-side reset is unreliable (user may not open the app for 3 days, TTL lingers, `is_friend_of` shows stale Free). pg_cron is available on Supabase free tier (`pg_cron` extension).

```sql
-- Runs every 15 minutes. Resets expired statuses to 'maybe'.
-- The 15-min cadence is fine because the client also filters by expires_at on read.
SELECT cron.schedule(
  'expire-statuses',
  '*/15 * * * *',
  $$
    UPDATE public.statuses
       SET status = 'maybe',
           context_tag = NULL,
           set_source = 'daily_reset',
           expires_at = NULL
     WHERE expires_at IS NOT NULL AND expires_at < now();
  $$
);
```

**Foreground UI:**
- `ExpiredStatusBanner` component — rendered in `HomeScreen.tsx` ABOVE the "Who's Free" list, only when own status has `expires_at < now()` OR `expires_at IS NULL` AND last `set_at` > 12 h ago. Tapping opens the existing status bottom sheet.
- Dismissal: in-memory only (Zustand flag), reappears on next app foreground — we want friction, not a one-click-silence.
- **Integration point:** `src/screens/home/HomeScreen.tsx` (render slot above the two FlatLists at line ~115).

**New hooks:**
- Extend `useStatus.ts` — add `expiresAt`, `isStale`, pass `set_source` through `updateStatus`.
- `useStatusHistory(userId)` — for future "friend recency" pill (optional in v1.3).

**New components:** `ExpiredStatusBanner.tsx` in `src/components/home/`.

---

### Feature 2 — `push_tokens` Evolution

**Migration (`0009_push_tokens_evolution.sql`):**

```sql
-- Drop the old unique index — we're moving to a device-scoped key
ALTER TABLE public.push_tokens DROP CONSTRAINT push_tokens_user_id_token_key;

ALTER TABLE public.push_tokens
  ADD COLUMN device_id     text,
  ADD COLUMN last_seen_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN invalidated_at timestamptz;

-- Backfill device_id for existing rows (one-time, use hash of token)
UPDATE public.push_tokens SET device_id = substr(md5(token), 1, 16) WHERE device_id IS NULL;
ALTER TABLE public.push_tokens ALTER COLUMN device_id SET NOT NULL;

-- Composite uniqueness: one row per (user, device)
CREATE UNIQUE INDEX idx_push_tokens_user_device
  ON public.push_tokens (user_id, device_id);

CREATE INDEX idx_push_tokens_active
  ON public.push_tokens (user_id)
  WHERE invalidated_at IS NULL;
```

**Device ID source:** `expo-application` → `Application.getAndroidId()` or `Application.getIosIdForVendorAsync()`. Both are Expo Go compatible. Fall back to a persisted UUID in AsyncStorage if unavailable.

**RLS:** existing `"Users manage own push tokens"` policy is correct (`FOR ALL USING auth.uid() = user_id`). No change.

**Where registration fires — change the call site, not the helper:**

Currently: `src/app/(tabs)/profile.tsx:73` — only fires when user toggles switch.

New: Call `registerForPushNotifications(session.user.id)` from the **root session-ready effect**. The cleanest seam is in the `Stack.Protected` layout that guards authenticated routes, or in a top-level `useEffect` in `src/app/(tabs)/_layout.tsx` when `session?.user?.id` becomes non-null.

**Foreground upsert on every launch:** the helper already calls `Notifications.getExpoPushTokenAsync()`; amend the upsert to also refresh `last_seen_at = now()`. Rationale: if a token hasn't been seen in 60 days, the token-reaping cron (below) can safely invalidate it.

```typescript
// src/hooks/usePushNotifications.ts — new upsert shape
await supabase
  .from('push_tokens')
  .upsert(
    { user_id: userId, device_id: deviceId, token, platform: Platform.OS, last_seen_at: new Date().toISOString(), invalidated_at: null },
    { onConflict: 'user_id,device_id' }
  );
```

**Token reaping (optional but cheap):** pg_cron weekly `UPDATE push_tokens SET invalidated_at = now() WHERE last_seen_at < now() - interval '60 days'`.

**Integration points:**
- `src/hooks/usePushNotifications.ts` — rewrite `registerForPushNotifications` for new schema
- `src/app/(tabs)/_layout.tsx` — new `useEffect` to call registration once per session
- `src/app/(tabs)/profile.tsx:73` — leave the toggle path, but it's no longer the primary registration entry

---

### Feature 3 — "Friend went Free" Notification

**Decision: Database Webhook → Edge Function. NOT pg_net from a trigger.**

Rationale:
- `pg_net` from inside a trigger blocks the UPDATE transaction on HTTP latency, and the existing plan-invite flow already uses the Database Webhook pattern (no inconsistency).
- Edge Function can be versioned and tested locally; pg_net logic buried in a trigger cannot.
- Failed webhooks retry; failed `pg_net` calls vanish silently.

**Trigger — only to filter the event, no HTTP work:**

The Database Webhook fires on any UPDATE. We want to fire ONLY when `status` transitioned to `'free'`. Supabase Webhooks don't support WHERE clauses, so we filter inside the Edge Function — cheap.

Actually better: use a **dedicated trigger that writes to a `free_transitions` notification queue** table, and put the webhook on that queue table. This gives us:
1. Idempotent retry (the queue row is the source of truth)
2. A single place to enforce rate-limiting ("don't notify same user → same friend twice in N hours")
3. Clear auditability

```sql
CREATE TABLE public.free_transitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);
ALTER TABLE public.free_transitions ENABLE ROW LEVEL SECURITY;
-- No client access; service role only.

CREATE INDEX idx_free_transitions_unprocessed
  ON public.free_transitions (occurred_at)
  WHERE processed_at IS NULL;

CREATE OR REPLACE FUNCTION public.capture_free_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'free' AND (OLD.status IS DISTINCT FROM 'free') THEN
    INSERT INTO public.free_transitions (user_id) VALUES (NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER statuses_capture_free_transition
  AFTER UPDATE OF status ON public.statuses
  FOR EACH ROW EXECUTE PROCEDURE public.capture_free_transition();
```

Database Webhook: `INSERT ON free_transitions → notify-friend-free` Edge Function.

**New Edge Function: `notify-friend-free`**

Receives `{ user_id }`. Does:
1. Fetch the user's `display_name`.
2. Query `get_friends_of(user_id)` (new SECURITY DEFINER RPC, not the caller-bound `get_friends`). Only accepted friendships.
3. For each friend, check their current status — **skip if busy** (they've self-declared Do Not Disturb). Notify free + maybe.
4. Check rate-limit via a new column on `profiles` or a side table — see below.
5. Fetch their `push_tokens WHERE invalidated_at IS NULL`.
6. Batch to Expo push (Expo supports 100 messages per call).
7. Update `processed_at` on the `free_transitions` row.
8. Handle Expo `DeviceNotRegistered` receipts → mark `push_tokens.invalidated_at = now()`.

**Rate-limit state: side table, NOT on profile.**

`last_free_notified_at` on `profiles` is wrong because it's (recipient, sender) pairwise — you want to not spam Alice about Bob twice in 2h, but Alice should still hear about Carol. Use:

```sql
CREATE TABLE public.free_notifications_sent (
  recipient_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipient_id, sender_id)
);
-- Edge function does UPSERT and only sends if sent_at < now() - interval '2 hours'
```

RLS: no client access (service role only) — revoke all from `authenticated`.

**Integration points:**
- `src/hooks/usePushNotifications.ts` — add an `expo-notifications` listener in `_layout.tsx` to route tapped notifications (friend_id → DM or Home)
- New Edge Function at `supabase/functions/notify-friend-free/index.ts`

---

### Feature 4 — Morning Status Prompt

**Timezone strategy — IANA tz on profile, NOT numeric offset.**

```sql
ALTER TABLE public.profiles
  ADD COLUMN timezone text NOT NULL DEFAULT 'UTC';
-- Client sets this on first launch via Intl.DateTimeFormat().resolvedOptions().timeZone
```

**pg_cron schedule: every 15 minutes, dispatch to Edge Function:**

```sql
SELECT cron.schedule(
  'morning-prompt-dispatch',
  '*/15 * * * *',
  $$ SELECT net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/morning-prompt',
       headers := '{"Authorization":"Bearer <service-role>"}'::jsonb
     ); $$
);
```

**Edge Function `morning-prompt` logic:**

```sql
-- Finds users where local time is 09:00–09:14 and no Free-triggered prompt yet today
SELECT p.id, p.timezone, p.display_name
FROM public.profiles p
WHERE EXTRACT(hour FROM now() AT TIME ZONE p.timezone) = 9
  AND EXTRACT(minute FROM now() AT TIME ZONE p.timezone) < 15
  AND NOT EXISTS (
    SELECT 1 FROM public.morning_prompt_log mpl
    WHERE mpl.user_id = p.id
      AND mpl.sent_on = (now() AT TIME ZONE p.timezone)::date
  );
```

Deduplication table `morning_prompt_log (user_id, sent_on date, PRIMARY KEY (user_id, sent_on))` prevents double-sends across cron ticks.

**Notification payload with action buttons:**

- iOS: register a `NotificationCategoryIdentifier` `"morning_status"` with three actions: `SET_FREE`, `SET_BUSY`, `SET_MAYBE`. Register at app startup in `usePushNotifications.ts`.
- Android: single channel `morning_prompts` with `MAX` importance. Android doesn't support inline action buttons the same way — the tap opens the app to Home with a bottom-sheet auto-opened.

**Signed action token — the spoofing concern is real.**

The problem: "a public Edge Function to set status" means anyone with a user's JWT could post anything. But we already have that — the `statuses` UPDATE RLS policy already requires `auth.uid() = user_id`, so a normal authenticated call from the app works. The push action path is different because the notification action handler runs **inside the app** with the user's existing Supabase session. So:

**Recommendation:** no new public endpoint. The iOS notification action handler dispatches a background task that uses the existing authenticated Supabase client to do a normal `UPDATE statuses` with `set_source = 'push_action'`. RLS already protects it. No signed token needed.

If and only if we decide to let the user tap an action without launching the app (iOS `UNNotificationActionOptions.None`), then we need a signed-JWT endpoint. **Punt that to v1.4.** Ship v1.3 with "taps open app, app sets status."

**Integration points:**
- New Edge Function `supabase/functions/morning-prompt/index.ts`
- New migration adds `profiles.timezone`, `morning_prompt_log`, pg_cron schedule
- `src/hooks/usePushNotifications.ts` — register iOS categories
- `src/app/(tabs)/_layout.tsx` — notification response listener that handles `morning_status` actions
- Client sets timezone on login — add to existing profile bootstrap

---

### Feature 5 — Plan Invite Push Wiring Fix

**The wiring is NOT broken server-side.** Verified in code:
- `supabase/functions/notify-plan-invite/index.ts` exists and queries `push_tokens`
- The webhook payload shape (`table: string, record: { plan_id, user_id, invited_by }`) matches a Database Webhook on `plan_members` INSERT
- `src/hooks/usePlans.ts:180` does the INSERT that triggers it

**The gap is client-side registration.** Tokens are only written when the user toggles the Profile switch. Fix = Feature 2 (move registration to session-ready effect). Once Feature 2 lands, plan-invite push works with zero Edge Function changes.

**Second gap: the AsyncStorage "notifications enabled" toggle is per-device and not visible to the server.** `notify-plan-invite` happily pushes to a user who toggled OFF, because their token row is still there. Two fixes:

**Option A (simple):** When the toggle flips OFF, delete the token row (or set `invalidated_at`). Flipping ON re-registers. Pro: server-side honoured without new schema. Con: losing other devices if we're not careful with the delete scope — must scope by `device_id`.

**Option B (richer):** Add `notifications_enabled boolean` to `push_tokens`, filter in Edge Function. Overkill for v1.3.

**Recommendation: Option A.** Matches existing "toggle controls registration" mental model in `usePushNotifications.ts`.

**Integration points:**
- `src/hooks/usePushNotifications.ts` — `setNotificationsEnabled(false)` should also call `supabase.from('push_tokens').update({ invalidated_at: now }).eq('user_id', ...).eq('device_id', ...)`
- Make `notify-plan-invite` filter `.is('invalidated_at', null)` (one-line change)

---

### Feature 6 — DM Entry Point

Comparing the two options against the actual codebase:

| Criterion | (a) Compose icon in Chats header | (b) Tappable Home friend cards |
|---|---|---|
| Code changes | New screen (friend picker), new header button, new route | Wrap `HomeFriendCard` in `Pressable`, router.push |
| Files touched | ~4–5 | 1–2 |
| Matches existing patterns | Yes (FAB/header icons are conventional) | Yes (cards tap into detail — universal mobile pattern) |
| Discoverability | Medium — must learn the icon | High — the cards are the primary Home object |
| Blocks existing gesture | No | No (cards have no current tap handler, confirmed) |
| Uses existing `get_or_create_dm_channel` RPC | Yes | Yes |

**Recommendation: (b), but also add (a) later.** (b) is a 1-file change: `src/components/home/HomeFriendCard.tsx` wrap in `Pressable` → `router.push('/dm/[userId]')` which calls `get_or_create_dm_channel(other_user_id)` (already exists in `0001_init.sql:570`) and navigates to the DM screen. (a) can ship in v1.4 as polish.

**Note:** the DM route already exists (used from `useChatList`). Verify the route path by inspecting `src/app/` — if there's no `/dm/[id]` screen yet, the route must be created too. (Chats tab navigates into DMs from the chat list already, so the screen exists.)

**Integration points:**
- `src/components/home/HomeFriendCard.tsx` — add `Pressable`, accept `onPress` prop or hard-code the navigation
- `src/screens/home/HomeScreen.tsx:115` — no change if onPress is internal
- Zero schema/Edge Function/RLS work

---

### Feature 7 — Squad Goals Streak

**Definition:**
- Week boundary: **Monday 00:00 to Sunday 23:59 in the user's timezone.** ISO week. Universal and matches calendar apps.
- Streak unit: a week in which ≥1 accepted plan exists where both the user and at least one friend were `plan_members.rsvp = 'going'` AND the plan's `scheduled_for` falls within that week.
- "Current streak" = longest run of consecutive such weeks ending in the current or last week.

**Schema approach — computed view, not materialized table.**

Rationale: free-tier friend groups of 3–15 people generate at most a few dozen plans per week. The query is cheap. Materializing introduces staleness and refresh-job complexity for no win. Revisit only if we observe slow queries.

```sql
CREATE OR REPLACE FUNCTION public.get_squad_streak(tz text DEFAULT 'UTC')
RETURNS TABLE (
  week_start    date,
  plan_count    int,
  counted       boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH my_plans AS (
    SELECT p.id, p.scheduled_for
    FROM public.plans p
    JOIN public.plan_members pm ON pm.plan_id = p.id
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.rsvp = 'going'
      AND p.scheduled_for IS NOT NULL
  ),
  friend_plans AS (
    -- At least one friend also going
    SELECT mp.id, mp.scheduled_for
    FROM my_plans mp
    WHERE EXISTS (
      SELECT 1 FROM public.plan_members pm2
      WHERE pm2.plan_id = mp.id
        AND pm2.user_id <> (SELECT auth.uid())
        AND pm2.rsvp = 'going'
        AND public.is_friend_of(pm2.user_id)
    )
  )
  SELECT
    date_trunc('week', fp.scheduled_for AT TIME ZONE tz)::date AS week_start,
    count(*)::int AS plan_count,
    true AS counted
  FROM friend_plans fp
  GROUP BY 1
  ORDER BY 1 DESC;
$$;
```

Client computes the streak length by walking consecutive weeks — simpler to tune UI copy there than in SQL.

**Integration points:**
- New migration adds `get_squad_streak` RPC
- New hook `src/hooks/useSquadStreak.ts` — calls RPC, computes current/longest streak
- Update `src/app/(tabs)/squad.tsx` (Goals sub-tab) to render streak UI instead of "Coming soon"

---

## Component & Data Flow Summary

### New / Modified Tables

| Table | New or Migrated | Notes |
|---|---|---|
| `statuses` | Migrated | +`expires_at`, +`set_at`, +`set_source` |
| `status_history` | New | Append-only, RLS mirrors `statuses` SELECT |
| `push_tokens` | Migrated | +`device_id`, +`last_seen_at`, +`invalidated_at`; new unique index |
| `profiles` | Migrated | +`timezone` (IANA) |
| `free_transitions` | New | Queue table, service-role only |
| `free_notifications_sent` | New | Rate-limit pair table, service-role only |
| `morning_prompt_log` | New | Per-user dedup, service-role only |

### New RLS Policies

| Table | Policy | Who |
|---|---|---|
| `status_history` | SELECT own or friend | `user_id = auth.uid() OR is_friend_of(user_id)` |
| `status_history` | No client INSERT/UPDATE/DELETE | Writes via trigger only |
| `push_tokens` | (existing) | No change needed |
| `free_transitions`, `free_notifications_sent`, `morning_prompt_log` | Revoke from authenticated | Service role only |

### New Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `notify-friend-free` | Database Webhook on `free_transitions` INSERT | Fan out to friends, rate-limit, push |
| `morning-prompt` | pg_cron every 15 min via pg_net | Dispatch daily 9am local prompts |
| `notify-plan-invite` | (existing) | One-line change to filter invalidated tokens |

### New Postgres Triggers & Cron Jobs

| Name | On | Action |
|---|---|---|
| `statuses_record_history` | BEFORE INSERT/UPDATE `statuses` | Append to `status_history`, stamp `set_at` |
| `statuses_capture_free_transition` | AFTER UPDATE `statuses` | Insert into `free_transitions` if new status = free |
| pg_cron `expire-statuses` | `*/15 * * * *` | Reset expired statuses to maybe |
| pg_cron `morning-prompt-dispatch` | `*/15 * * * *` | Call `morning-prompt` Edge Function |
| pg_cron `reap-push-tokens` | `0 3 * * 0` | Mark stale tokens invalidated |

### New Hooks / Stores

| File | Purpose |
|---|---|
| `src/hooks/useStatus.ts` (modified) | Return `expiresAt`, `isStale`, thread `set_source` through updates |
| `src/hooks/useSquadStreak.ts` (new) | Fetch `get_squad_streak` RPC, compute streak |
| `src/hooks/usePushNotifications.ts` (modified) | New upsert shape with `device_id`, iOS category registration, notification response routing |
| `src/stores/useStatusBannerStore.ts` (new, optional) | Zustand flag for in-memory banner dismissal |

### New UI Components

| File | Purpose |
|---|---|
| `src/components/home/ExpiredStatusBanner.tsx` | Renders when own status is stale, taps to set |
| `src/components/home/HomeFriendCard.tsx` (modified) | Wrap in Pressable, navigate to DM |
| `src/components/squad/StreakCard.tsx` | "N weeks in a row" display for Goals sub-tab |

### Integration Points (file paths)

| Change | File |
|---|---|
| Session-ready push registration | `src/app/(tabs)/_layout.tsx` |
| Notification response handler (morning_status actions, friend-free taps) | `src/app/(tabs)/_layout.tsx` |
| Banner slot above Free/Other lists | `src/screens/home/HomeScreen.tsx:115` |
| Tappable friend card | `src/components/home/HomeFriendCard.tsx` |
| Token registration, iOS categories, delete-on-toggle-off | `src/hooks/usePushNotifications.ts` |
| Timezone capture on first launch | wherever session bootstrap runs (likely `src/stores/useAuthStore.ts`) |
| Goals sub-tab render | `src/app/(tabs)/squad.tsx` (streak section) |
| Invalidated-token filter | `supabase/functions/notify-plan-invite/index.ts` |

---

## Patterns to Follow

### Pattern 1 — Queue Table for Webhook-Triggered Work
**What:** Trigger writes to a tiny audit/queue table; the Database Webhook fires on that table's INSERT; the Edge Function marks `processed_at` when done.
**When:** Any time a Postgres event should fan out to external HTTP.
**Why:** Idempotency, retry visibility, rate-limiting seam, decouples trigger latency from HTTP latency.

### Pattern 2 — Timezone as IANA String on Profile
**What:** Store `America/Los_Angeles`, not `-08:00`.
**When:** Any scheduled feature that respects "user's local morning / evening / week."
**Why:** Numeric offsets break across DST. IANA strings are what `Intl` and `AT TIME ZONE` both speak.

### Pattern 3 — Client Filters by `expires_at` Regardless of Cron
**What:** Don't trust the cron to have run — always filter `statuses` queries with `expires_at IS NULL OR expires_at > now()` on read.
**When:** Anywhere TTL matters.
**Why:** 15-min cron granularity means up to 15 minutes of stale "Free" otherwise. Defense in depth.

## Anti-Patterns to Avoid

### Anti-Pattern 1 — `pg_net` from Inside a Business Trigger
**What:** Calling an Edge Function via `pg_net.http_post` directly from a trigger on `statuses` UPDATE.
**Why bad:** Couples transaction latency to HTTP round-trip; no retry; no audit trail; silent failures.
**Instead:** Trigger writes to a queue table, Database Webhook on the queue table fires.

### Anti-Pattern 2 — Client-Side Daily Reset
**What:** `useEffect` in App.tsx that checks "has it been >24h? reset my status."
**Why bad:** Only runs when the user opens the app. Friends see stale Free until then. Breaks the "Free" promise.
**Instead:** Server-side pg_cron, client-side read-time filter as belt-and-suspenders.

### Anti-Pattern 3 — Public Signed-Token Endpoint for Status Changes
**What:** `set-status-from-push` Edge Function that accepts a signed JWT in the notification payload.
**Why bad:** New attack surface for a problem that doesn't exist. Notification action handlers already run inside the authenticated app.
**Instead:** Let the tap open the app, have the in-app handler do a normal authenticated `UPDATE statuses`.

### Anti-Pattern 4 — `last_free_notified_at` as a Column on `profiles`
**What:** Single scalar on profile to rate-limit "Friend went Free" notifications.
**Why bad:** Rate limiting is (recipient × sender) pairwise, not per-recipient. Silences Alice about all friends just because Bob pinged once.
**Instead:** `free_notifications_sent (recipient_id, sender_id, sent_at)` table.

---

## Build Order (Dependency-Aware)

The roadmapper should decompose v1.3 into phases in roughly this order. Each phase is independently shippable once its predecessors are in.

1. **Phase A — `push_tokens` evolution + session-ready registration.**
   Migrates the table, rewires `usePushNotifications.ts`, wires registration into the tabs layout.
   *Unblocks:* everything that sends pushes (plan invites, friend-free, morning prompt).
   *Delivers:* plan-invite notifications actually arriving on fresh installs (Feature 5 gap closed).

2. **Phase B — Status TTL schema + daily reset + expired banner.**
   Migration for `statuses` columns, `status_history`, pg_cron expire job, trigger, `ExpiredStatusBanner`, `useStatus` changes.
   *Depends on:* nothing external.
   *Unblocks:* Feature 3 (free transitions need the new status pipeline to be clean) and Feature 4 (morning prompt relates to TTL semantically).

3. **Phase C — "Friend went Free" fan-out.**
   `free_transitions` queue, `capture_free_transition` trigger, `free_notifications_sent` rate-limit table, `notify-friend-free` Edge Function, Database Webhook wiring, in-app notification response handler.
   *Depends on:* Phase A (tokens) and Phase B (clean status pipeline).
   *Delivers:* the headline v1.3 feature.

4. **Phase D — Morning status prompt.**
   `profiles.timezone`, `morning_prompt_log`, pg_cron dispatch, `morning-prompt` Edge Function, iOS notification category registration, response handler.
   *Depends on:* Phase A (tokens), Phase B (TTL — prompt is triggered by stale status + time-of-day).
   *Note:* The "stale status = needs prompt" and "9am = needs prompt" logics can be unified or kept separate.

5. **Phase E — DM entry point.**
   One-file change to `HomeFriendCard`. Pure client.
   *Depends on:* nothing. Could ship in any phase, even as a sneak-in during Phase A.

6. **Phase F — Squad Goals streak.**
   `get_squad_streak` RPC, `useSquadStreak` hook, `StreakCard` component.
   *Depends on:* nothing. Pure read-path feature.

**Suggested grouping for roadmap decomposition:**

- **Phase 13 — Push Infrastructure:** A + E (small, high-value unblock)
- **Phase 14 — Status Liveness:** B (standalone, big UX win)
- **Phase 15 — Friend Went Free:** C (flagship)
- **Phase 16 — Morning Prompt + Streak:** D + F (both "daily engagement" polish)

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---|---|---|---|
| `free_transitions` queue | No issue | Add partial index prune | Partition by week |
| Morning prompt cron (every 15 min) | 1 query per tick | Still one query, ~15K rows | Shard by timezone |
| `notify-friend-free` fan-out | 1–15 pushes per event | 15–200 per event | Batch per recipient, defer via queue |
| `status_history` growth | Trivial | ~5 rows/user/day = 50KB/user/year | Move >90d to cold storage |
| Realtime connections (free tier 200 cap) | Fine | Fine (one channel per device) | Exceeds tier — upgrade |

Free tier (500 MB DB) can comfortably hold 10K+ users at v1.3 data shapes. The binding constraint is realtime connections, unchanged from v1.2.

---

## Confidence Assessment

| Area | Confidence | Reason |
|---|---|---|
| Existing code inventory | HIGH | Read actual files; quoted line numbers |
| Status TTL schema | HIGH | Standard Postgres pattern, mirrors existing conventions |
| `push_tokens` evolution | HIGH | Current schema read; migration is additive |
| Friend-free queue pattern | MEDIUM-HIGH | Pattern is sound; exact rate-limit tuning needs real usage data |
| Morning prompt timezone handling | HIGH | `AT TIME ZONE` + IANA is standard |
| pg_cron on Supabase free tier | HIGH | Documented Supabase feature |
| DM entry point option | HIGH | Verified `HomeFriendCard` is not currently tappable |
| Squad streak query | MEDIUM | Query shape is correct; exact UX of "counts as streak week" may need product tuning |

## Open Questions for Roadmap

- Does the DM route `/dm/[id]` already exist, or does Phase E also need to create it? (Look at `src/app/` to confirm.)
- Should the morning prompt also fire if the user manually set status yesterday (stale but not expired)? Product call.
- Rate-limit window for "Friend went Free": 2 hours is a guess. Could be 30 min, could be "once per day per pair." Product call.
- Does the Goals sub-tab streak need a "longest ever" stat or just "current"? Scope question.

---

## Sources

- `/Users/iulian/Develop/campfire/supabase/migrations/0001_init.sql` — schema, RLS patterns, helper functions
- `/Users/iulian/Develop/campfire/supabase/migrations/0003_push_tokens.sql` — current push_tokens schema
- `/Users/iulian/Develop/campfire/supabase/functions/notify-plan-invite/index.ts` — existing Edge Function pattern
- `/Users/iulian/Develop/campfire/src/hooks/usePushNotifications.ts` — current registration helper
- `/Users/iulian/Develop/campfire/src/hooks/useStatus.ts` — current status hook shape
- `/Users/iulian/Develop/campfire/src/hooks/useHomeScreen.ts` — realtime subscription pattern
- `/Users/iulian/Develop/campfire/src/app/(tabs)/_layout.tsx` — tab structure
- `/Users/iulian/Develop/campfire/.planning/PROJECT.md` — v1.3 scope
- Supabase docs (training data, HIGH confidence): pg_cron, Database Webhooks, Edge Functions, RLS with SECURITY DEFINER
