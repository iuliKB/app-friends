# Phase 2: Status Liveness & TTL — Research

**Researched:** 2026-04-07
**Domain:** Mood + Context + Window + Heartbeat redesign (Supabase schema + RLS + view + trigger + RN client rewrite)
**Confidence:** HIGH — every claim grounded in direct file inspection of the current repo.

---

## Summary

Every open technical question from the plan brief has been answered against the live codebase. The most important findings:

1. **pg_cron is NOT enabled** — no `CREATE EXTENSION pg_cron`, no `cron.schedule(...)`, no `supabase/config.toml` in the repo. Retention must run as a **scheduled Edge Function** (or manual periodic job). Do not plan pg_cron into Phase 2.
2. **`src/utils/` does not exist.** The established convention for hand-rolled helpers is `src/lib/` (see `action-sheet.ts`, `notifications-init.ts`, `supabase.ts`, `username.ts`). Phase 2 should create `src/lib/heartbeat.ts` and `src/lib/windows.ts` — **not** `src/utils/`. Context's D-11/D-15/D-29 wording ("src/utils/") must be overridden by the planner to match established convention.
3. **`useStatus` has NO realtime subscription and NO React Query.** It's plain `useState` + direct `supabase.from('statuses')` calls (verified in `src/hooks/useStatus.ts:7-66`). The realtime subscription for friend statuses lives in a **different** hook: `src/hooks/useHomeScreen.ts:22-46`. D-25's "React Query cache" wording is wrong for this codebase — cross-screen sync must happen via Zustand (`src/stores/useHomeStore.ts`) or a shared store, NOT React Query. There is no `@tanstack/react-query` anywhere in the project (zero-deps rule).
4. **Friend reads go through `get_friends` RPC + a second query on `statuses`** (`src/hooks/useHomeScreen.ts:55-93`, `src/hooks/useFriends.ts:45-77`). Switching friend reads to the `effective_status` view means updating the second query — not touching `get_friends`. The realtime subscription stays pointed at the `statuses` table (views can't be published to Supabase Realtime, but the table underneath still broadcasts).
5. **`is_friend_of(target_user uuid)` already exists** (`supabase/migrations/0001_init.sql:168-181`) and is the canonical "user OR friend" check. Copy it verbatim for `status_history` RLS.
6. **No Reanimated.** The codebase uses `Animated.Value` throughout (verified: `src/components/common/OfflineBanner.tsx:8`, `src/components/common/FAB.tsx:16`, `src/components/friends/FriendActionSheet.tsx:37`, `src/components/chat/MessageBubble.tsx:52`, `src/screens/home/HomeScreen.tsx:32`). `react-native-reanimated` is NOT installed and must not be added.
7. **AppState 'active' listener already exists** in `src/app/(tabs)/_layout.tsx:31-50` for push re-registration. The heartbeat `touch()` must **reuse the same `useEffect`** — adding a second listener doubles fires and debounce complexity.
8. **`updated_at` IS currently used as a staleness signal** in `src/hooks/useHomeScreen.ts:81-138` (sorts free friends by `updated_at DESC`). This code path must change — sort by `last_active_at` (fresh activity) or by the commit time on `effective_status`.

**Primary recommendation:** Migration 0009 lands the schema + trigger + view + RLS; `src/lib/windows.ts` and `src/lib/heartbeat.ts` hold the two pure utilities; `useStatus` is rewritten to do one optimistic upsert (mood + tag + window + `last_active_at`) with a debounced `touch()`; `useHomeScreen` is rewritten to read `effective_status` and hydrate `last_active_at` into the `FriendWithStatus` shape; `MoodPicker` is a pure `Animated.timing` expand/collapse using the `OfflineBanner` pattern with three stacked `Pressable` rows + horizontal chip rows.

---

## User Constraints (from 02-CONTEXT.md)

### Locked Decisions (copy from D-01..D-37 in 02-CONTEXT.md)

All 37 decisions in `.planning/phases/02-status-liveness-ttl/02-CONTEXT.md` §`<decisions>` are locked. The planner MUST treat them as spec. Key ones this research directly touches:

- **D-01, D-02**: Labels stay Free/Busy/Maybe, color tokens unchanged.
- **D-03..D-07**: Preset chips only, 5 per mood, stored in existing `statuses.context_tag`, exported from `src/components/status/moodPresets.ts`.
- **D-08..D-12**: Fixed window set `1h / 3h / Until 6pm / Until 10pm / Rest of day`; time-of-day hidden at ≥17:30 / ≥21:30; display format "for 1h" / "until 6pm" / "rest of day".
- **D-13..D-16**: `last_active_at` column; client `touch()` debounced 60s; client-side `computeHeartbeatState`; view `effective_status` encodes only ALIVE vs DEAD (FADING is client-only).
- **D-17..D-21**: Migration 0009 schema + backfill `updated_at + 24h`; `status_history` scoped to mood transitions only; SELECT RLS "user OR friend"; nightly rollup keeps first transition/day then 30d GC.
- **D-22..D-25**: MoodPicker = 3 stacked rows with two-stage commit, tap-again-to-cancel, spinner overlay; sync via React Query cache (**NOTE: codebase has no React Query — see Finding 3**).
- **D-26..D-29**: ReEngagementBanner copies OfflineBanner animated-height pattern, 3 actions, auto-dismiss 8s; `HomeFriendCard` renders ALIVE/FADING/DEAD per heartbeat with 0.6 opacity on FADING and section move for DEAD; `"Xh ago"` formatter is an inline helper, zero deps.
- **D-30..D-32**: Label string updates to HomeFriendCard + StatusPill; no Phase 1 SMOKE-TEST edits; Phase 2 ships its own SMOKE-TEST.md appended to Phase 5 inputs.
- **D-33, D-34**: `useStatus` rewrite — `currentStatus`, `setStatus(mood, tag, windowId)`, `touch()`, `heartbeatState`; 60s debounce on `touch()`.
- **D-35..D-37**: Phase 3/4 boundaries — Phase 2 ships data + utility only, not the scheduled pushes.

### Claude's Discretion (from D-final block of 02-CONTEXT.md)

- MoodPicker padding/radius/easing (use existing tokens + `Animated.timing`)
- Whether to use `LayoutAnimation` or `Animated.timing` — **verified: `Animated.timing` is the established pattern, no LayoutAnimation in use**
- `getWindowOptions` thresholds (≥17:30, ≥21:30 are sensible defaults)
- Retention job host: pg_cron vs Edge Function — **verified: pg_cron unavailable, use Edge Function**
- Rollup algorithm (first-transition-of-day is the proposed default)
- Optional pulse on "Update" button

### Deferred Ideas (OUT OF SCOPE — do not research or plan)

Freeform context text; "Down to hang/Reach out first/Heads down" relabel; time-adaptive window options; freeform custom window; server-side FADING enum; pg_cron 5am reset; `profiles.timezone`; per-friend mute; snooze on ReEngagementBanner; sound effects; pulse animation unless discoverability fails in dogfooding.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TTL-01 | Window selection on every mood, 5 options, time-of-day hidden when not meaningful | Finding 9 (`src/lib/windows.ts` pure helper), Finding 13 (no date lib — vanilla `Date`) |
| TTL-02 | Optional preset context chip per mood (5 per mood) stored in existing `statuses.context_tag` | `context_tag` column confirmed at `supabase/migrations/0001_init.sql:46` |
| TTL-03 | Own status display "{Mood} · {tag?} · {window}" | Finding 9 — `windows.ts` exports display-ready labels |
| TTL-04 | Friends see unknown/muted once expired OR heartbeat DEAD via `effective_status` view | Finding 4 (existing friend query path), Finding 14 (view+realtime interaction) |
| TTL-05 | Staleness is activity-based, no cron clear | Finding 1 (no pg_cron), Finding 3 (no scheduled UPDATE needed) |
| TTL-06 | ReEngagementBanner when own heartbeat FADING | Finding 10 (OfflineBanner pattern full source) |
| TTL-07 | `status_history` via SECURITY DEFINER trigger, RLS SELECT own/friend | Finding 6 (`is_friend_of` exists), Finding 7 (existing trigger examples) |
| TTL-08 | Retention: log on transitions only, 7d rollup, 30d GC | Finding 1 (no pg_cron → scheduled Edge Function) |
| HEART-01 | `last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()` on `statuses` | Finding 11 (backfill pattern from 0008) |
| HEART-02 | Client updates on cold launch + AppState 'active' | Finding 12 (existing AppState listener in `(tabs)/_layout.tsx`) |
| HEART-03 | Client-side `computeHeartbeatState(expires_at, last_active_at)` | Finding 2 (utility lives in `src/lib/heartbeat.ts`) |
| HEART-04 | FADING dimmed with "Xh ago"; DEAD moves to Everyone Else | Finding 8 (current `updated_at` downstream usage must be replaced) |
| HEART-05 | ReEngagementBanner actions Keep it / Update / Heads down | Finding 10 |

---

## Finding 1 — pg_cron Availability

**What:** pg_cron is **NOT enabled** on this project. Retention (D-20) must run as a **scheduled Edge Function** or deferred to a manual cron outside the repo. No `supabase/config.toml` exists to check, and no migration enables the extension.

**Evidence:**
- `Grep "pg_cron|cron\.schedule|CREATE EXTENSION"` across `supabase/` → **0 matches**
- `supabase/migrations/` contains 8 files (`0001_init.sql` through `0008_push_tokens_v1_3.sql`); none enables pg_cron
- `supabase/config.toml` does not exist
- Phase 1 STATE.md Pending Todo: "Phase 2 plan-phase: Verify pg_cron availability on the current Supabase free-tier dashboard" — still **unverified by any committed code**
- Supabase free-tier projects do support pg_cron via dashboard extension toggle, but it's NOT wired up in this repo

**Implication for planning:**
- Plan the nightly retention job as a **`supabase/functions/status-history-retention/index.ts` Edge Function** triggered by Supabase Scheduled Functions (or GitHub Actions hitting the function URL with a secret) — mirror the "outbox + Edge Function" pattern from the v1.3 research.
- Do NOT plan `cron.schedule(...)` SQL into migration 0009.
- The Edge Function should do both the 7-day rollup and the 30-day GC in a single invocation.
- **ASK the user at plan-phase:** "Do you want me to (a) include an Edge Function + external scheduler, (b) enable pg_cron via Supabase dashboard first (requires dashboard action), or (c) defer retention as a manual operator task for v1.3 and ship the trigger+view+data now?" Option (c) is viable because with `log-on-transitions-only` the growth rate is bounded — a user with 4 transitions/day produces ~120 rows/month, under 5K rows/year — a manual cleanup job once a month is acceptable for v1.3 dogfooding.

---

## Finding 2 — `src/utils/` vs `src/lib/` Convention

**What:** `src/utils/` **does not exist**. The established convention for zero-dep helpers is `src/lib/`.

**Evidence:**
- `ls src/utils` → not found
- `ls src/lib` → `action-sheet.ts`, `notifications-init.ts`, `supabase.ts`, `username.ts`
- Phase 1 CONTEXT.md D-21 explicitly placed new notification code at `src/lib/notifications-init.ts`, confirming `src/lib/` is the chosen home for zero-dep utilities
- 02-CONTEXT.md §`<notable_findings>` already flags this: "No existing src/utils/ directory referenced — scout did not find src/utils/date.ts or similar. Planner should verify and create src/utils/ if missing (or prefer src/lib/ if that's the established convention in the codebase — check first)."

**Implication for planning:**
- Create new files as **`src/lib/heartbeat.ts`** and **`src/lib/windows.ts`** (NOT `src/utils/`).
- Override the literal path wording in D-11, D-15, D-29 when the planner writes task files — this is a convention fix, not a spec change.
- Imports use the `@/lib/heartbeat` and `@/lib/windows` aliases (the `@/` alias is proven in every existing hook).

---

## Finding 3 — `useStatus` Current Implementation

**What:** Plain React `useState` + direct Supabase calls. **No realtime subscription. No React Query. No cache.** One-row fetch on mount, one-field update per user action.

**Evidence:** `src/hooks/useStatus.ts:1-66` (full file)

**Current API surface:**
```ts
{
  status: StatusValue | null,      // 'free' | 'busy' | 'maybe'
  contextTag: EmojiTag,            // nullable string
  loading: boolean,
  saving: boolean,
  updateStatus: (newStatus) => Promise<{ error }>,
  updateContextTag: (emoji) => Promise<{ error }>,
}
```

**Critical observations:**
- **No subscription.** Line 15-29 is a one-shot fetch in `useEffect`. If another device/screen updates the user's status, this hook will NOT see it until next mount.
- **No `last_active_at` read.** No `updated_at` read either. Staleness is ignored.
- **Writes are split**: `updateStatus` writes `status` only; `updateContextTag` writes `context_tag` only. Two separate UPDATEs.
- **No optimistic rollback.** Local state is only set after success.
- **No cross-screen sync mechanism.** Home and Profile today each call `useStatus()` independently and maintain their own copy — if one screen commits, the other shows stale data until navigated away and back.
- **Calls `markPushPromptEligible()`** on every successful write (lines 41-42, 58-59) — this must be preserved in the rewrite.

**Implication for planning:**
- D-25 says "both mount `MoodPicker` bound to the same `useStatus` hook; any commit from one surface updates the other instantly via React Query cache (existing pattern from v1.0 chat/status)." **This is factually wrong about the codebase.** There is no React Query; the "existing pattern" is either Zustand (`useHomeStore`) or nothing at all.
- **Recommended approach:** Lift the `currentStatus` state into a new Zustand store `src/stores/useStatusStore.ts` (mirrors the existing `useHomeStore`, `useAuthStore` pattern). `useStatus` becomes a thin hook over the store + subscription. A single realtime channel on `statuses WHERE user_id = auth.uid()` keeps the store in sync. Both Home and Profile read from the same store — instant cross-screen sync for free.
- Alternatively, one hook instance is mounted high in the tree (e.g., in `(tabs)/_layout.tsx` as a side-effect) and both screens get the same shared subscription via the Zustand store. This is simpler than passing props.
- Preserve `markPushPromptEligible()` call on successful commits.
- `setStatus(mood, tag, windowId)` does ONE upsert writing all four fields (`status`, `context_tag`, `status_expires_at`, `last_active_at`) in one round-trip. Optimistic: update store first, rollback on error.
- `touch()` is a separate write that only updates `last_active_at` — debounced 60s via a module-scoped timestamp.

---

## Finding 4 — Realtime Subscriptions on `statuses`

**What:** Two places touch `statuses` via realtime or read.

**Evidence:**
- `src/hooks/useHomeScreen.ts:22-46` — **the only realtime subscription on statuses**. Uses `supabase.channel('home-statuses').on('postgres_changes', { event: '*', schema: 'public', table: 'statuses', filter: 'user_id=in.(...)' })`. Refetches all friends on every event.
- `src/hooks/useHomeScreen.ts:80-82` — reads `statuses` directly: `.from('statuses').select('user_id, status, context_tag, updated_at').in('user_id', friendIds)`
- `src/hooks/useFriends.ts:64-67` — a second read on `statuses` (only `status, context_tag`, no `updated_at`)
- `src/hooks/useStatus.ts:18, 35, 53` — own-status reads and writes; NO subscription
- `src/app/friends/[id].tsx:39` — friend profile screen reads `statuses` once on mount

**Implication for planning:**
- The realtime subscription **stays on the `statuses` table** (Supabase Realtime only broadcasts from tables, not from views). `statuses` already has `REPLICA IDENTITY FULL` (`0001_init.sql:490`), so filter-by-user events work.
- Read queries for friend-facing data (D-16) switch from `.from('statuses')` to `.from('effective_status')` (the view).
- **When the view is defined as `SELECT ... FROM statuses`**, the published realtime events on `statuses` still fire on ANY mutation (mood commit, `touch()`, etc.), and the client handler re-queries the view. This is correct — expiry transitions are computed at read time by the view.
- **Pitfall:** the current handler `fetchAllFriends()` re-fetches everything on every realtime event. That will also fire on every `touch()` update (once per 60s per active friend) — which is fine for v1.3 scale (3-15 friends) but worth documenting.
- `useFriends.ts:64-67` should also switch to the view — consistency.
- `src/app/friends/[id].tsx:39` should also switch to the view.

---

## Finding 5 — Friend List Query Path

**What:** `get_friends` RPC returns friend metadata only (no status). The caller does a **second** query on `statuses` and joins client-side. Sort order is enum-based, client-side.

**Evidence:**
- `supabase/migrations/0001_init.sql:503-532` — `get_friends()` SELECT returns `friend_id, username, display_name, avatar_url, friendship_status, created_at`. **No status columns.**
- `src/hooks/useFriends.ts:45-91` — calls `get_friends`, then `.from('statuses').select('user_id, status, context_tag').in('user_id', friendIds)`, builds a `statusMap`, joins in JS.
- `src/hooks/useHomeScreen.ts:55-109` — same pattern but also reads `updated_at` and stores it in `useHomeStore.statusUpdatedAt` for Free-friends sort (`useHomeScreen.ts:134-139`).
- `STATUS_ORDER` / `STATUS_SORT_ORDER` declared at module level in both hooks (divergent: `useFriends.ts:28` has `{free:0, busy:1, maybe:2}`; `useHomeScreen.ts:8` has `{free:0, maybe:1, busy:2}` — **inconsistent**).

**Implication for planning:**
- To support D-16 (friends read from `effective_status`), change the second query in **both** `useFriends.ts` and `useHomeScreen.ts` to:
  ```ts
  .from('effective_status')
  .select('user_id, effective_status, status_expires_at, last_active_at, context_tag')
  .in('user_id', friendIds)
  ```
- The view returns `effective_status` which is NULL when DEAD — client maps NULL → no mood rendered (per D-28 DEAD case).
- Hydrate `FriendWithStatus` with the extra fields `status_expires_at`, `last_active_at` so `HomeFriendCard` can compute heartbeat state per friend.
- `useHomeStore.statusUpdatedAt` (used for free-friends sort by recency at `useHomeScreen.ts:134-139`) should be replaced by sort on `last_active_at` or kept if the view exposes the original `updated_at` column too.
- **Fix the `STATUS_SORT_ORDER` divergence** between the two hooks in Phase 2 since we're touching both — add as a sub-task or flag explicitly for the planner.
- `get_friends` RPC itself does NOT need changes. Leave the SQL function alone.

---

## Finding 6 — Existing SECURITY DEFINER Patterns (Trigger + Function)

**What:** The codebase has a well-established `SECURITY DEFINER ... SET search_path = ''` pattern and the canonical `is_friend_of` helper.

**Evidence (verbatim from `supabase/migrations/0001_init.sql:168-181`):**
```sql
CREATE OR REPLACE FUNCTION public.is_friend_of(target_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = (SELECT auth.uid()) AND addressee_id = target_user)
        OR (addressee_id = (SELECT auth.uid()) AND requester_id = target_user)
      )
  );
$$;
```

**The `statuses` table already has a "user OR friend" SELECT RLS policy** (`0001_init.sql:218-224`) — copy this verbatim for `status_history`:
```sql
CREATE POLICY "statuses_select_own_or_friend"
  ON public.statuses FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_friend_of(user_id)
  );
```

**Existing trigger pattern** (`0001_init.sql:456-490`): `handle_new_user()` is `LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''` — use as template for the new `on_status_transition` trigger. Other SECURITY DEFINER helpers: `is_plan_creator` (`0004_fix_plan_members_rls_recursion.sql`), `is_plan_member` (`0005_fix_plans_select_rls.sql`), `get_friends`, `get_free_friends`, `get_or_create_dm_channel`.

**Implication for planning:**
- Migration 0009 imports no new helpers — `is_friend_of` is already available.
- `on_status_transition` trigger function signature:
  ```sql
  CREATE OR REPLACE FUNCTION public.on_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
  BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.status_history (user_id, status, context_tag, status_expires_at)
      VALUES (NEW.user_id, NEW.status, NEW.context_tag, NEW.status_expires_at);
    END IF;
    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER on_status_transition
    AFTER UPDATE ON public.statuses
    FOR EACH ROW
    EXECUTE FUNCTION public.on_status_transition();
  ```
- `IS DISTINCT FROM` guard enforces D-21 (trigger fires only on mood transitions, not context-tag-only or window-only updates). PITFALLS.md Pitfall 11 specifically flagged this as a must-have.
- `status_history` SELECT policy copies the statuses pattern verbatim:
  ```sql
  CREATE POLICY "status_history_select_own_or_friend"
    ON public.status_history FOR SELECT
    TO authenticated
    USING (
      user_id = (SELECT auth.uid())
      OR public.is_friend_of(user_id)
    );
  ```
- **No INSERT/UPDATE/DELETE policies** for `status_history` — clients never write. Trigger runs as SECURITY DEFINER and bypasses RLS on its INSERT.
- **Still enable RLS** on `status_history` — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` — per PITFALLS.md Pitfall 1 and Phase 1 convention.

---

## Finding 7 — No Existing Trigger on `statuses`

**What:** Currently no trigger exists on the `statuses` table. This is the first one.

**Evidence:** `Grep "CREATE TRIGGER" supabase/migrations/` — matches only `on_auth_user_created` (on `auth.users`), `updated_at` triggers on `messages` / `plans`. No triggers on `statuses`.

**Implication for planning:**
- No interaction/ordering concerns with existing statuses triggers.
- Consider whether to add a generic `updated_at = now()` BEFORE UPDATE trigger for the `statuses` row. Currently `updated_at` is only updated by the client explicitly — the rewrite can keep writing `updated_at = now()` in the upsert, no trigger needed.

---

## Finding 8 — `updated_at` as Staleness Signal Downstream

**What:** `updated_at` is currently read in `useHomeScreen.ts` as a **recency signal for sorting free friends**. This consumer must be updated when we add `last_active_at`.

**Evidence:**
- `src/hooks/useHomeScreen.ts:75, 81, 89, 106, 137` — reads `updated_at` on statuses, stores in `useHomeStore.statusUpdatedAt`, sorts free friends by it descending.
- `src/types/database.ts:347` — `status_updated_at` is part of the `get_free_friends` RPC shape (the RPC itself still references `s.updated_at AS status_updated_at` in `0001_init.sql:558`).
- No other `statuses.updated_at` readers found.

**Implication for planning:**
- The "free friends, most recently active first" sort in `useHomeScreen.ts:132-139` should switch to sort by `last_active_at DESC` — this matches the heartbeat model's intent (recently active = fresher signal than recently edited).
- `get_free_friends` RPC at `0001_init.sql:538-563` is **unused by Phase 2 code paths** (Home reads `statuses` directly, not this RPC). A grep confirms no consumer calls it. It can be left alone or updated for consistency. Recommend: update in Phase 2 for consistency (one-line change) but NOT block on it — leave as a planner option.

---

## Finding 9 — SegmentedControl Current Implementation

**What:** A fully custom 44-height horizontal 3-segment component. Zero library deps. Good reference for `MoodPicker` prop shape.

**Evidence:** `src/components/status/SegmentedControl.tsx:1-72` (full file)

**Current props:**
```ts
{
  value: StatusValue | null,
  onValueChange: (v: StatusValue) => void,
  saving: boolean,
}
```

Uses `expo-haptics` on tap. Spinner overlay via `ActivityIndicator` when `saving && isActive`. Styling entirely from `@/theme` tokens (COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII). `TouchableOpacity` wrapper per segment. Active state = filled background with segment color.

**Implication for planning:**
- MoodPicker props should mirror this + extend for the two-stage flow. Suggested shape:
  ```ts
  {
    currentStatus: { status, context_tag, window_id } | null,
    onCommit: (mood, tag, windowId) => Promise<void>,
    saving: boolean,
    autoExpandMood?: StatusValue,  // from ReEngagementBanner "Update" action per D-26
  }
  ```
- Keep the `expo-haptics` `impactAsync(Light)` on row taps — established pattern.
- Spinner overlay during save: same `ActivityIndicator` + `saving` prop pattern.
- SegmentedControl stays in place as a reusable primitive (D-22 — confirmed).

---

## Finding 10 — OfflineBanner Pattern for ReEngagementBanner

**What:** Simple `Animated.Value` driving a `height` property with `useNativeDriver: false`. 200ms `Animated.timing`. No auto-dismiss — uses `useNetworkStatus` as the show/hide trigger.

**Evidence:** `src/components/common/OfflineBanner.tsx:1-38` (full file — 38 lines)

**Full source:**
```tsx
export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const heightAnim = useRef(new Animated.Value(isConnected ? 0 : 32)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isConnected ? 0 : 32,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isConnected, heightAnim]);

  return (
    <Animated.View style={[styles.banner, { height: heightAnim }]}>
      <Text style={styles.text}>No connection — some features may not work</Text>
    </Animated.View>
  );
}
```

**Implication for planning:**
- ReEngagementBanner copies this pattern exactly. Replace `isConnected` with `heartbeatState === 'fading' && !inMemoryDismissed`.
- Auto-dismiss after 8s (D-26) via a `setTimeout` inside the effect that flips `inMemoryDismissed` to `true`. Clean up timer on unmount.
- Height will be larger than 32 because there are 3 action buttons — estimate ~88-112px. Height value should come from SPACING tokens where possible, or use an auto-height measurement + interpolate. **Simplest:** animate `maxHeight` from 0 → 200 with `useNativeDriver: false` (same trick, allows variable content).
- `useNativeDriver: false` is required for `height`/`maxHeight` animation — locked by React Native. `translateY` would allow `useNativeDriver: true` but requires absolute positioning. Stay with the OfflineBanner pattern: `height`/`maxHeight` + `useNativeDriver: false`.
- **In-memory dismissal state** lives in a `useState` inside the banner, NOT in Zustand, NOT in AsyncStorage — per D-26 "Dismissal is in-memory only — re-appears next foreground if still FADING."
- **"Update" action jump-scrolls to MoodPicker** (D-26). Implementation: pass an `onUpdate` callback up to HomeScreen which holds a ref to a ScrollView and calls `scrollTo({y: moodPickerOffset})`. Use `onLayout` on the MoodPicker wrapper to capture the offset.

---

## Finding 11 — Migration Backfill Pattern

**What:** Migration 0008 establishes the idiomatic "add nullable → backfill → set NOT NULL + default" pattern. Migration 0009 follows it.

**Evidence (verbatim from `supabase/migrations/0008_push_tokens_v1_3.sql:1-38`):**
```sql
-- Step 1: add columns nullable so existing rows are not rejected
ALTER TABLE public.push_tokens
  ADD COLUMN device_id      TEXT,
  ADD COLUMN last_seen_at   TIMESTAMPTZ,
  ADD COLUMN invalidated_at TIMESTAMPTZ;

-- Step 2: backfill legacy rows
UPDATE public.push_tokens
   SET device_id    = 'legacy:' || id::text,
       last_seen_at = COALESCE(last_seen_at, created_at)
 WHERE device_id IS NULL;

-- Step 3: enforce NOT NULL and add default
ALTER TABLE public.push_tokens
  ALTER COLUMN device_id    SET NOT NULL,
  ALTER COLUMN last_seen_at SET NOT NULL,
  ALTER COLUMN last_seen_at SET DEFAULT now();
```

**Implication for planning:**
- Migration 0009 should follow identical structure for `status_expires_at`:
  ```sql
  -- Step 1: add nullable
  ALTER TABLE public.statuses
    ADD COLUMN status_expires_at TIMESTAMPTZ,
    ADD COLUMN last_active_at    TIMESTAMPTZ;

  -- Step 2: backfill (D-17)
  UPDATE public.statuses
     SET status_expires_at = updated_at + interval '24 hours',
         last_active_at    = COALESCE(last_active_at, updated_at, now())
   WHERE status_expires_at IS NULL;

  -- Step 3: enforce NOT NULL + default
  ALTER TABLE public.statuses
    ALTER COLUMN status_expires_at SET NOT NULL,
    ALTER COLUMN last_active_at    SET NOT NULL,
    ALTER COLUMN last_active_at    SET DEFAULT now();
  ```
- Comment header block mirrors 0008 — explain which code files consume the change (useStatus.ts, useHomeScreen.ts, useFriends.ts, the new view, etc.).
- Consider adding an index on `last_active_at` only if query patterns justify it — for the current scale (≤ 15 friends per user) it's unnecessary. Recommend: **do NOT add** unless a specific query needs it.

---

## Finding 12 — AppState Listener Location

**What:** The AppState 'active' listener for push registration already exists in `src/app/(tabs)/_layout.tsx`. Adding a second listener would double-fire events.

**Evidence:** `src/app/(tabs)/_layout.tsx:28-50`
```tsx
const appState = useRef<AppStateStatus>(AppState.currentState);
// ...
useEffect(() => {
  if (!userId) return;
  // Initial register on session-ready
  registerForPushNotifications(userId).then(...).catch(() => {});

  // Foreground re-register
  const sub = AppState.addEventListener('change', (next) => {
    if (appState.current.match(/inactive|background/) && next === 'active') {
      registerForPushNotifications(userId).then(...).catch(() => {});
    }
    appState.current = next;
  });
  return () => sub.remove();
}, [userId]);
```

**Implication for planning:**
- Phase 2 should **extend the same effect**, not create a new one. The branch that calls `registerForPushNotifications` on foreground should also call `useStatusStore.getState().touch()` (or equivalent). One listener, one subscription, one debounce clock.
- Alternative: Expose `touch` as a module-scoped function (not a hook) so it can be called from the existing effect without the effect needing to depend on hook state.
- The **cold launch** branch (initial register call) also runs `touch()` — both are already in the same `useEffect`, just add the call.
- Debounce: a module-scoped `let lastTouchAt = 0` in `src/hooks/useStatus.ts` (or `src/stores/useStatusStore.ts`) + check `Date.now() - lastTouchAt < 60_000` before writing.

---

## Finding 13 — Local-Time Math Without a Date Library

**What:** No date/time utility library is installed (zero-deps rule). Existing code uses vanilla `Date` methods. No existing helper for "until 6pm / until 10pm / rest of day" math.

**Evidence:**
- `Grep "getHours\(|setHours\(|new Date\(now"` → hits in `src/screens/plans/PlanCreateModal.tsx:25, 31-33` and `src/components/plans/PlanCard.tsx:21` — both are one-off inline usages, no shared helper.
- `package.json` has no `date-fns`, `dayjs`, `luxon`, `moment`. `@react-native-community/datetimepicker` is installed but is a picker UI, not a math library.

**Implication for planning:**
- Planner must **write `src/lib/windows.ts` from scratch** using vanilla `Date`. Recommended shape:
  ```ts
  // src/lib/windows.ts
  export type WindowId = '1h' | '3h' | 'until_6pm' | 'until_10pm' | 'rest_of_day';

  export interface WindowOption {
    id: WindowId;
    label: string;        // "for 1h", "until 6pm", "rest of day"
    expiresAt: Date;      // absolute deadline
  }

  export function getWindowOptions(now: Date): WindowOption[] {
    const options: WindowOption[] = [];
    options.push({ id: '1h', label: 'for 1h', expiresAt: addHours(now, 1) });
    options.push({ id: '3h', label: 'for 3h', expiresAt: addHours(now, 3) });

    const sixPm = setLocalTime(now, 18, 0);   // 18:00 local
    const tenPm = setLocalTime(now, 22, 0);   // 22:00 local

    // Hide if < 30 min remaining (D-09: ≥17:30 hides 6pm; ≥21:30 hides 10pm)
    if (now.getTime() < sixPm.getTime() - 30 * 60_000) {
      options.push({ id: 'until_6pm', label: 'until 6pm', expiresAt: sixPm });
    }
    if (now.getTime() < tenPm.getTime() - 30 * 60_000) {
      options.push({ id: 'until_10pm', label: 'until 10pm', expiresAt: tenPm });
    }
    options.push({
      id: 'rest_of_day',
      label: 'rest of day',
      expiresAt: setLocalTime(now, 23, 59, 59, 999),
    });
    return options;
  }

  export function computeWindowExpiry(id: WindowId, now: Date): Date {
    // Delegates through getWindowOptions for single source of truth.
    return getWindowOptions(now).find(o => o.id === id)!.expiresAt;
  }

  function addHours(d: Date, h: number): Date {
    return new Date(d.getTime() + h * 60 * 60_000);
  }
  function setLocalTime(d: Date, h: number, m: number, s = 0, ms = 0): Date {
    const next = new Date(d);
    next.setHours(h, m, s, ms);
    return next;
  }
  ```
- `computeWindowExpiry` is a thin wrapper so callers don't re-derive from `getWindowOptions` the ID → date math.
- `Date.setHours(h, m)` is local-time by definition — no timezone library needed. This matches D-11 "the device's local timezone via native Date — no timezone column on the server."
- Unit-testable as pure functions (no React, no Supabase). See Validation Architecture section.

**`src/lib/heartbeat.ts` shape** (D-15, D-29):
```ts
export type HeartbeatState = 'alive' | 'fading' | 'dead';

export function computeHeartbeatState(
  expiresAt: Date | string | null,
  lastActiveAt: Date | string | null,
  now: Date = new Date()
): HeartbeatState {
  if (!expiresAt || !lastActiveAt) return 'dead';
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const act = typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt;
  const nowMs = now.getTime();
  if (exp.getTime() < nowMs) return 'dead';
  const sinceActiveMs = nowMs - act.getTime();
  if (sinceActiveMs > 8 * 60 * 60_000) return 'dead';
  if (sinceActiveMs > 4 * 60 * 60_000) return 'fading';
  return 'alive';
}

export function formatHoursAgo(lastActiveAt: Date | string, now: Date = new Date()): string {
  const act = typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt;
  const hours = Math.max(1, Math.floor((now.getTime() - act.getTime()) / (60 * 60_000)));
  return `${hours}h ago`;
}
```

Pure, zero deps, trivially unit-testable.

---

## Finding 14 — Realtime on Views + Other Cross-Cutting Pitfalls

**What:** Supabase Realtime does **not** broadcast from views directly — only from tables in the `supabase_realtime` publication. This is explicitly documented in PITFALLS.md Pitfall 12.

**Evidence:**
- `.planning/research/PITFALLS.md` Pitfall 12 (line 289-304): "Supabase Realtime only broadcasts changes for tables explicitly added to the `supabase_realtime` publication... Without that line, no `postgres_changes` event fires."
- `supabase/migrations/0001_init.sql:485-490` — **`statuses` already has `REPLICA IDENTITY FULL`** (needed for filtered subscriptions).
- `Grep ALTER PUBLICATION` → **0 matches**. The existing subscription in `useHomeScreen.ts` works, which means either (a) the Supabase project has a default publication that includes all public tables, or (b) it was added via dashboard. Either way, the current subscription is live — evidence that statuses IS in the publication even if no migration explicitly says so.
- The view `effective_status` is just a read-time projection of `statuses`. Mutations happen on `statuses` → publication fires → client gets the event → client re-queries `effective_status` → correct value returned.
- **Phase 2 must NOT add** `ALTER PUBLICATION supabase_realtime ADD TABLE effective_status` — views cannot be published, the migration will fail.
- **Phase 2 SHOULD verify** that `statuses` is in the publication and optionally make it explicit in 0009 with `ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;` (idempotent — wrap in `DO $$ ... $$` or ignore errors if already present).

**Other pitfalls from PITFALLS.md that directly apply to Phase 2:**

1. **Pitfall 3 — TTL race, view vs. scheduled UPDATE** (line 60-85): The view is the source of truth for correctness. ✅ Already locked in D-16. No scheduled UPDATE is needed for correctness.
2. **Pitfall 12 — Realtime doesn't broadcast expiries**: Because expiries are view-computed, there IS no `postgres_changes` event at the instant a status expires. A friend looking at another friend's status will see it flip to DEAD only when (a) they re-query (pull-to-refresh, focus), or (b) someone writes to `statuses` causing a new realtime event that triggers a re-fetch. **Implication:** consider adding a periodic re-render timer (every 60s on Home) to force the heartbeat re-compute even without a realtime event. This is acceptable; v1.3 smoke test documents it.
3. **Pitfall 11 — Recursive trigger loop**: `IS DISTINCT FROM` guard in `on_status_transition` prevents infinite recursion when trigger updates trigger themselves. ✅ Already planned.
4. **iOS AppState debouncing**: iOS fires multiple 'active' events during app swap-back under some conditions. The 60s debounce on `touch()` handles this cleanly — even 5 rapid fires collapse into 1 write.
5. **Race between optimistic UI and realtime echo**: When user commits mood on Device A, the write succeeds locally (optimistic), the database emits an event, Device A's own subscription receives its own write back, and the hook re-applies the same value. No visual flicker if the data is identical. **Pitfall:** if the hook mis-merges (e.g., drops the tag because the subscription only carries `status`), there's a flash. Mitigation: the subscription handler should re-fetch the full row, not trust the partial payload.
6. **REPLICA IDENTITY FULL and payload size**: Already set — subscription filter-by-user-id works. No action needed.

---

## Runtime State Inventory

Phase 2 is NOT a rename/refactor — this section is N/A. The only cleanup concern is whether existing `statuses` rows correctly migrate (covered by D-17 backfill in Finding 11).

---

## Architecture Patterns (Phase-Specific)

### Recommended file layout
```
src/
├── lib/
│   ├── heartbeat.ts              NEW — computeHeartbeatState + formatHoursAgo (D-15, D-29)
│   └── windows.ts                NEW — getWindowOptions + computeWindowExpiry (D-11)
├── stores/
│   └── useStatusStore.ts         NEW (recommended) — shared Zustand store for own status (Finding 3 fix)
├── hooks/
│   ├── useStatus.ts              REWRITE — thin hook over useStatusStore + subscription (D-33, D-34)
│   ├── useHomeScreen.ts          EDIT — switch read to effective_status view, hydrate last_active_at (Finding 4, 5)
│   └── useFriends.ts             EDIT — same switch (Finding 5)
├── components/
│   ├── status/
│   │   ├── MoodPicker.tsx        NEW — 3-row vertical picker with two-stage commit (D-22..D-25)
│   │   ├── moodPresets.ts        NEW — exported preset chip arrays per mood (D-06, D-07)
│   │   └── SegmentedControl.tsx  KEEP AS-IS (D-22)
│   ├── home/
│   │   ├── ReEngagementBanner.tsx NEW — OfflineBanner pattern (D-26, Finding 10)
│   │   └── HomeFriendCard.tsx    EDIT — render heartbeat state (D-28, D-30)
│   └── friends/
│       └── StatusPill.tsx         EDIT — new display format (D-31)
├── screens/
│   └── home/HomeScreen.tsx       EDIT — mount ReEngagementBanner + "What's your status today?" heading + MoodPicker
└── app/
    ├── (tabs)/
    │   ├── _layout.tsx            EDIT — extend useEffect to call touch() on cold launch + foreground (Finding 12)
    │   └── profile.tsx            EDIT — replace SegmentedControl with MoodPicker (D-22)

supabase/
├── migrations/
│   └── 0009_status_liveness_v1_3.sql  NEW — schema + trigger + view + RLS (D-17)
└── functions/
    └── status-history-retention/      NEW (optional per Finding 1 discussion)
        └── index.ts
```

### MoodPicker pseudo-structure
```tsx
function MoodPicker({ currentStatus, onCommit, saving, autoExpandMood }) {
  const [expandedMood, setExpandedMood] = useState<StatusValue | null>(autoExpandMood ?? null);
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const heightAnim = useRef(new Animated.Value(0)).current;  // OfflineBanner pattern

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: expandedMood ? MEASURED_EXPANDED_HEIGHT : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [expandedMood]);

  function handleRowTap(mood: StatusValue) {
    if (expandedMood === mood) {
      setExpandedMood(null);  // D-24: tap selected mood → collapse, no commit
      setPendingTag(null);
      return;
    }
    setExpandedMood(mood);
    setPendingTag(null);  // D-23: reset preset selection on mood change
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleWindowTap(windowId: WindowId) {
    onCommit(expandedMood!, pendingTag, windowId);  // D-23: commit on window tap
  }

  // Render: 3 stacked Pressable rows, beneath each expanded row: chip scroll + window chips
}
```

### `useStatus` rewrite shape
```ts
export function useStatus() {
  const session = useAuthStore((s) => s.session);
  const store = useStatusStore();  // { currentStatus, setStatus, touch }

  // Subscription on own statuses row — one channel per mounted session
  useEffect(() => {
    if (!session?.user.id) return;
    const ch = supabase
      .channel(`own-status:${session.user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'statuses',
        filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        store.hydrate(payload.new);  // re-fetch full row to be safe
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.user.id]);

  // Initial fetch
  useEffect(() => { if (session?.user.id) store.fetch(session.user.id); }, [session?.user.id]);

  const heartbeatState = useMemo(
    () => computeHeartbeatState(
      store.currentStatus?.status_expires_at ?? null,
      store.currentStatus?.last_active_at ?? null
    ),
    [store.currentStatus]
  );

  return {
    currentStatus: store.currentStatus,
    heartbeatState,
    setStatus: store.setStatus,
    touch: store.touch,
    saving: store.saving,
    loading: store.loading,
  };
}
```

`touch()` implementation in the store uses a module-scoped `lastTouchAt` timestamp and skips writes < 60s apart (D-34).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-screen state sync | React Query, new global event bus | Zustand store (`src/stores/useStatusStore.ts`) | Zero-deps rule; matches `useHomeStore`, `useAuthStore` precedent |
| Animated expand/collapse | Reanimated, LayoutAnimation | `Animated.Value` + `Animated.timing` on `height`/`maxHeight` with `useNativeDriver: false` | Established in OfflineBanner, FAB, MessageBubble, FriendActionSheet (Finding 10, initial grep) |
| Date/time math | `date-fns`, `dayjs` | Vanilla `Date.setHours`/`getTime` | Zero-deps rule; local TZ is automatic (Finding 13) |
| Friend lookup in RLS | New helper function | Existing `public.is_friend_of(uuid)` | Already exists, canonical pattern (Finding 6) |
| Optimistic UI w/ rollback | New framework | `store.set()` → try `supabase.upsert()` → on error `store.rollback(prev)` | Matches existing hook patterns |
| "Xh ago" formatter | New lib | Inline `Math.floor(ms / 3600_000)` in `src/lib/heartbeat.ts` | D-29 locks this; trivial to write |
| Scheduled retention | pg_cron (not enabled) | Scheduled Edge Function OR manual v1.3 operator task | Finding 1 |

**Key insight:** Phase 2 is a "no new deps" phase, and every pattern it needs has an in-repo precedent. The only new primitive is the `effective_status` view — and that's already designed in D-16.

---

## Common Pitfalls

### Pitfall 1 — Subscribing to the View
**What goes wrong:** Writing `ALTER PUBLICATION supabase_realtime ADD TABLE effective_status` in 0009 fails with "cannot add view to publication."
**Why:** Views cannot be published to Supabase Realtime.
**How to avoid:** Publish (or confirm already published) `public.statuses` only. Client subscribes to `statuses`, but reads from `effective_status`.
**Warning signs:** Any mention of publishing/subscribing to `effective_status` directly.

### Pitfall 2 — Expiry Transitions Are Silent
**What goes wrong:** A friend's `status_expires_at` passes at 18:00. No database write happens, no realtime event fires, so Device B still shows them as "Free until 6pm" until the user pulls to refresh.
**Why:** The view computes expiry at read time — no mutation = no event.
**How to avoid:** On Home, add a lightweight 60-second `setInterval` re-render (no DB call — just forces `computeHeartbeatState` to re-run with fresh `now`). This is cheap because the calculation is in-memory. Alternative: re-fetch on `useFocusEffect`.
**Warning signs:** User reports "my friend showed Free for an hour after their window ended."

### Pitfall 3 — `touch()` Causing Realtime Fanout Storm
**What goes wrong:** Every 60s, every active user writes `last_active_at = now()`. Every write fires a realtime event to every friend subscribed. For N friends with M mutuals, that's N×M events per 60s.
**Why:** The home-screen subscription handler calls `fetchAllFriends()` — a full re-fetch — on every event.
**How to avoid:** At v1.3 scale (3-15 friends) this is tolerable (~10-200 events/min across a squad). BUT: plan a **smart handler** that inspects `payload.new.user_id` and updates only that friend in the store, rather than re-fetching everyone. Optional optimization, not a blocker.
**Warning signs:** Home screen flickers during a debug session with multiple active devices.

### Pitfall 4 — Trigger Recursion
**What goes wrong:** The `on_status_transition` trigger inserts into `status_history`; if there's ever a future trigger on `status_history` that writes back to `statuses`, infinite loop.
**Why:** Classic Postgres trigger loop.
**How to avoid:** `IS DISTINCT FROM` guard on the insert (already planned) + never create a write-back trigger on `status_history`. Document this in the migration comment.

### Pitfall 5 — Clock Skew Between Client and Server
**What goes wrong:** Client's `new Date()` is 5 minutes ahead of server — `computeHeartbeatState` reports DEAD but server view still returns ALIVE, UI flickers on every re-query.
**Why:** Device clocks drift.
**How to avoid:** Source of truth for comparisons is server `now()` in the view; client-side `computeHeartbeatState` is used ONLY for the UX-only FADING state. Since ALIVE/DEAD comes from the view (server time), flicker is minimal. Accept the race as cosmetic.

### Pitfall 6 — `status_history` Unbounded Growth Without Retention
**What goes wrong:** User forgets pg_cron isn't enabled, retention never runs, `status_history` grows without bound.
**Why:** Finding 1 — no scheduled job exists.
**How to avoid:** Mandatory planner decision — either (a) ship the Edge Function + external scheduler, (b) enable pg_cron via dashboard and add a `cron.schedule` in a follow-up migration, or (c) explicitly defer retention with a dated operator task. Option (c) is viable for v1.3 scale per Finding 1.
**Warning signs:** Migration 0009 adds `status_history` without any retention mechanism or explicit deferral note.

### Pitfall 7 — D-25's Wrong Library Reference
**What goes wrong:** Planner writes tasks around `@tanstack/react-query` that doesn't exist in this codebase.
**Why:** D-25 says "existing pattern from v1.0 chat/status" but the actual pattern is Zustand + subscriptions, not React Query.
**How to avoid:** Planner reads Finding 3 and plans a Zustand store instead.
**Warning signs:** Any task plan that mentions `useQuery`, `queryClient`, or `invalidateQueries`.

### Pitfall 8 — `src/utils/` Path
**What goes wrong:** Planner creates `src/utils/heartbeat.ts` per D-15 verbatim; the directory doesn't exist; inconsistent with `src/lib/notifications-init.ts`.
**Why:** Finding 2.
**How to avoid:** Override D-11/D-15/D-29 path to `src/lib/`.

---

## Code Examples

### Migration 0009 skeleton (reference — planner fills in)
```sql
-- 0009_status_liveness_v1_3.sql
-- Phase 2 v1.3: Mood + Context + Window + Heartbeat layer.
-- Implements D-13..D-21 from .planning/phases/02-status-liveness-ttl/02-CONTEXT.md
-- Consumed by:
--   - src/hooks/useStatus.ts (rewrite) — commits status + tag + window + last_active_at
--   - src/hooks/useHomeScreen.ts (edit) — reads effective_status view, hydrates last_active_at
--   - src/hooks/useFriends.ts (edit) — same
--   - src/lib/heartbeat.ts (new) — client mirror of view logic (D-16: FADING is client-only)

-- Step 1: add columns nullable
ALTER TABLE public.statuses
  ADD COLUMN status_expires_at TIMESTAMPTZ,
  ADD COLUMN last_active_at    TIMESTAMPTZ;

-- Step 2: backfill legacy rows (D-17)
UPDATE public.statuses
   SET status_expires_at = updated_at + interval '24 hours',
       last_active_at    = COALESCE(last_active_at, updated_at, now())
 WHERE status_expires_at IS NULL;

-- Step 3: enforce NOT NULL + default
ALTER TABLE public.statuses
  ALTER COLUMN status_expires_at SET NOT NULL,
  ALTER COLUMN last_active_at    SET NOT NULL,
  ALTER COLUMN last_active_at    SET DEFAULT now();

-- Step 4: status_history table
CREATE TABLE public.status_history (
  id                BIGSERIAL PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            public.availability_status NOT NULL,
  context_tag       TEXT,
  status_expires_at TIMESTAMPTZ,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_user_occurred ON public.status_history(user_id, occurred_at DESC);
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS — SELECT own OR friend (D-19), no INSERT/UPDATE/DELETE policies (trigger writes)
CREATE POLICY "status_history_select_own_or_friend"
  ON public.status_history FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_friend_of(user_id)
  );

-- Step 6: on_status_transition trigger (D-21 — mood transitions only)
CREATE OR REPLACE FUNCTION public.on_status_transition()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.status_history (user_id, status, context_tag, status_expires_at)
    VALUES (NEW.user_id, NEW.status, NEW.context_tag, NEW.status_expires_at);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_status_transition
  AFTER UPDATE ON public.statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.on_status_transition();

-- Step 7: effective_status view (D-16)
CREATE OR REPLACE VIEW public.effective_status
WITH (security_invoker = true)  -- IMPORTANT: inherit caller's RLS on underlying statuses
AS
SELECT
  user_id,
  CASE
    WHEN status_expires_at < now() OR last_active_at < now() - interval '8 hours' THEN NULL
    ELSE status
  END AS effective_status,
  status_expires_at,
  last_active_at,
  context_tag,
  updated_at
FROM public.statuses;

-- View inherits statuses RLS via security_invoker. No separate GRANT needed beyond authenticated.
GRANT SELECT ON public.effective_status TO authenticated;

-- Step 8: ensure statuses is in realtime publication (idempotent)
-- (existing subscription in useHomeScreen.ts proves it's already in the publication;
--  this is belt-and-braces)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'statuses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
  END IF;
END $$;
```

**Important:** Use `WITH (security_invoker = true)` on the view (Postgres 15+, Supabase supports it) so RLS on the underlying `statuses` table still applies when the view is queried. Without this, a view would bypass RLS because it runs as the view owner. Plan-phase MUST confirm this syntax against the Supabase Postgres version (Postgres 15+ is standard on Supabase since 2024).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@supabase/supabase-js` | useStatus rewrite, migration consumer | ✓ | `^2.99.2` (from SUMMARY.md) | — |
| `expo-haptics` | MoodPicker feedback | ✓ (used in SegmentedControl.tsx) | installed | — |
| `react-native` `Animated` API | MoodPicker, ReEngagementBanner | ✓ | bundled | — |
| `react-native-reanimated` | N/A — should NOT be added | ✗ | — | Use `Animated` (established) |
| `date-fns` / `dayjs` | N/A — should NOT be added | ✗ | — | Vanilla `Date` |
| `@tanstack/react-query` | **D-25 says use it** — NOT installed | ✗ | — | **Zustand store (see Finding 3)** |
| pg_cron Postgres extension | Retention rollup (D-20) | ✗ | — | Scheduled Edge Function OR deferred operator task (see Finding 1) |
| Supabase Postgres 15+ for `security_invoker` view | Migration 0009 | **Unverified** | likely ✓ | Use grants-based RLS fallback if not |
| `@react-native-community/datetimepicker` | Not needed this phase | ✓ | installed | — |

**Missing dependencies with no fallback:** None — Zustand is installed and sufficient for D-25's intent.

**Missing dependencies with fallback:** pg_cron (fallback: Edge Function or deferral), `@tanstack/react-query` (fallback: Zustand, which is the correct choice anyway).

**Action item for planner (ASK USER):** Confirm Supabase project Postgres version ≥ 15 to use `WITH (security_invoker = true)` on the `effective_status` view. Supabase has been on PG 15+ by default since 2023; new projects are PG 15. Low risk but verify.

---

## Validation Architecture

**Project test framework status:** No Jest, no Vitest. Only Playwright visual regression at `tests/visual/design-system.spec.ts` (verified via `ls`). Test framework for unit tests does NOT exist.

**Per `.planning/config.json`**: the planner should check whether `workflow.nyquist_validation` is enabled. Based on Phase 1's SMOKE-TEST approach + hardware-gate deferral, Phase 2 should use **manual smoke tests + pure-function unit tests** as the validation strategy.

### Test Framework (Wave 0 decision)
| Property | Value |
|----------|-------|
| Framework | **Decision needed at plan-phase:** (a) Add Jest for pure-function unit tests (`src/lib/heartbeat.ts`, `src/lib/windows.ts`), OR (b) skip unit tests and rely on manual smoke only |
| Config file | none — would need `jest.config.js` + Babel preset if chosen |
| Quick run command | `npm test` (if framework added) |
| Full suite command | `npm test` |

**Recommendation:** Add a **minimal Jest setup** with zero test-library dependencies (just `jest`, `@types/jest`, `ts-jest`) specifically to unit-test `windows.ts` and `heartbeat.ts`. These are pure functions with critical edge-case logic (17:30 boundary, 8h boundary). Unit tests catch the regressions that manual smoke can't. BUT — this technically violates "zero new npm deps." Planner must **explicitly ask the user** whether to add Jest for unit tests, or go pure-manual.

If zero-deps rule holds: skip automated tests, rely on manual boundary checks in SMOKE-TEST.md (time-of-day boundaries require either clock manipulation or waiting for actual time, neither is great).

### Phase Requirements → Test Map (manual-first)
| Req ID | Behavior | Test Type | How Verified |
|--------|----------|-----------|--------------|
| TTL-01 | Windows hidden when not meaningful | manual boundary | Set device clock to 17:25 → see 6pm option; 17:35 → hidden |
| TTL-02 | Preset chip commits into `context_tag` | manual | Set mood + tag, check `statuses` row |
| TTL-03 | Own status display format | manual smoke | Read own status pill on Home/Profile |
| TTL-04 | Friends see DEAD via view | manual (two devices) | Device A lets expiry pass → Device B refreshes → mood shows as unknown |
| TTL-05 | No cron clearing | N/A (code inspection) | Grep migrations for pg_cron — confirmed absent |
| TTL-06 | ReEngagementBanner FADING shows on Home | manual (set `last_active_at` to 5h ago in DB, reopen app) | Banner appears |
| TTL-07 | Trigger writes to status_history on mood transition | SQL inspection | Insert test row, update status, query `status_history` |
| TTL-08 | Retention: log only on transitions, not tag/window | SQL inspection | Update `context_tag` only → no new row |
| HEART-01 | Column exists, defaults now() | SQL inspection | `\d statuses` after migration |
| HEART-02 | `touch()` fires on cold launch + foreground | manual | Background app, foreground, check last_active_at incremented |
| HEART-03 | Client computeHeartbeatState matches spec | **unit test (if Jest added)** OR manual boundary | Pass various (expires_at, last_active_at) combos, assert state |
| HEART-04 | Friend card dimming + section move | manual (two devices or DB manipulation) | |
| HEART-05 | Banner actions Keep it / Update / Heads down | manual | Verify each action's effect |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` + `npx eslint src` (matches Phase 1)
- **Per wave merge:** Same + manual boundary spot-check on any task touching `windows.ts` or `heartbeat.ts`
- **Phase gate:** Full manual SMOKE-TEST.md (Phase 2 produces its own, appended to Phase 5 inputs per D-32)

### Wave 0 Gaps
- Decision: add Jest + unit test fixtures OR accept manual-only
- `.planning/phases/02-status-liveness-ttl/SMOKE-TEST.md` — to be authored during plan-phase (D-32)
- If Jest: `jest.config.js`, `babel.config.js` for `ts-jest`, and `tests/unit/lib/heartbeat.test.ts`, `tests/unit/lib/windows.test.ts`

---

## State of the Art / Cross-Phase Integration

| Phase 1 artifact | Phase 2 interaction |
|------------------|---------------------|
| `(tabs)/_layout.tsx` AppState listener | Extend with `touch()` call — do NOT add a second listener (Finding 12) |
| `markPushPromptEligible()` from `usePushNotifications` | Preserve in `useStatus.setStatus()` — every successful commit still counts as a meaningful action for PUSH-08 |
| `usePushNotifications` hook pattern | Serves as template for `useStatus` rewrite structure |
| `@/lib/` directory convention | Phase 2 files go here (Finding 2) |

| Phase 3/4 dependency | Phase 2 delivers |
|----------------------|------------------|
| Phase 3 FREE-02 DEAD heartbeat filter | `effective_status` view returns NULL for DEAD users; Phase 3 reads `WHERE effective_status IS NOT NULL` |
| Phase 3 EXPIRY-01 30min-before push | `status_expires_at` column is the data source; Phase 3 reads from `statuses` directly |
| Phase 4 MORN-01/MORN-06 DEAD gate | `computeHeartbeatState` from `src/lib/heartbeat.ts` imported by Phase 4's prompt-fire logic |

---

## Project Constraints (from CAMPFIRE-CONTEXT.md + .planning/PROJECT.md)

(No `CLAUDE.md` at repo root; `CAMPFIRE-CONTEXT.md` is the project root context file and not structured as CLAUDE directives. Primary constraints come from `.planning/PROJECT.md` and `.planning/phases/01-*/01-CONTEXT.md`.)

- **Zero new npm deps** (PROJECT.md "Constraints"): applies to Phase 2. No `date-fns`, `dayjs`, `react-native-reanimated`. Jest would technically violate this — planner must ask.
- **TypeScript strict + `noUncheckedIndexedAccess`**: `getWindowOptions(...).find(...)!` non-null assertion above is safe by construction but planner should verify TS is happy.
- **No `any`**: all new helper types must be concrete.
- **UUIDs everywhere**: `status_history.id` can be `BIGSERIAL` for append-only append order — matches Phase 1 precedent for monotonic IDs where identity matters for order, not security.
- **FlatList for lists**: MoodPicker's 3 rows are fixed count — regular `View` or `Pressable` stack is fine, no FlatList needed. Horizontal chip row = `ScrollView horizontal` or `FlatList` — either works, ScrollView is simpler for <15 items.
- **ESLint `campfire/no-hardcoded-styles`**: every style value in new components must come from `@/theme`. Amber warning color for ReEngagementBanner needs to come from an existing token (check `COLORS.feedback.warning` or similar) — planner verifies and adds a token if missing (token addition IS acceptable per v1.1 conventions).
- **AsyncStorage prefix `campfire:`**: if `hasCommittedThisSession` flag needs persistence (D-27 says "session only" — in-memory, so no AsyncStorage needed).
- **RLS-first**: `status_history` ships with policies in the same migration. ✓ planned.
- **Hooks per domain**: `useStatus` stays one file. ✓

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase project is on Postgres 15+ (supports `WITH (security_invoker = true)` on views) | Code Examples, Environment Availability | Migration 0009 view creation fails; fall back to defining the view as SECURITY DEFINER function or a RLS-enforced view pattern |
| A2 | `statuses` is already in the `supabase_realtime` publication (no migration adds it, but the subscription in `useHomeScreen.ts` demonstrably works) | Finding 14 | Low — existing code proves it's there. The idempotent `DO $$ ... $$` block in the migration makes this safe either way. |
| A3 | React Query / `@tanstack/react-query` is truly absent from the project (checked `package.json` imports via grep) | Finding 3 | Verified by `Grep react-query|tanstack` returning 0 code matches. ASSUMPTION is actually VERIFIED. |
| A4 | Supabase scheduled Edge Functions (or an external scheduler like GitHub Actions) is an acceptable substitute for pg_cron for the retention rollup | Finding 1 | If user wants pg_cron, they need to enable the extension via dashboard — ADD explicit question at plan-phase |
| A5 | Zustand store is the correct mechanism for cross-screen own-status sync (D-25 says "React Query cache") | Finding 3 | Low — Zustand is already used for `useHomeStore`/`useAuthStore`, consistent with the codebase. User confirmation via plan-phase is trivial. |
| A6 | Adding Jest is a decision the user wants to make (violates "zero new deps" nominally but is a dev-dep, not runtime) | Validation Architecture | Low — escalate as a plan-phase question; fallback is manual-only |
| A7 | The debounce-60s for `touch()` is a module-scoped variable, not per-hook-instance, to be robust against multiple screens mounting `useStatus()` simultaneously | Finding 12, useStatus rewrite shape | Low — if two instances each have their own timer, worst case is 2x writes per 60s instead of 1x. Acceptable. |

---

## Open Questions

1. **Retention mechanism (Finding 1)** — pg_cron vs. Edge Function vs. deferred operator task?
   - What we know: pg_cron not enabled; Edge Function approach is proven in v1.3 (notify-plan-invite); deferral is viable for v1.3 scale.
   - Recommendation: **Escalate to user at plan-phase.** Default to deferred operator task with a calendar reminder + a simple SQL snippet in a one-page runbook — ships Phase 2 fastest.

2. **Unit test framework (Validation Architecture)** — Add Jest for pure-function tests, or manual-only?
   - What we know: `heartbeat.ts` and `windows.ts` have branchy logic (17:30 / 21:30 boundaries, 4h/8h thresholds) where unit tests would catch off-by-one mistakes. But zero-deps is a hard project rule.
   - Recommendation: **Escalate at plan-phase.** Lean toward adding Jest as a dev-dep (not a runtime dep); argue that the zero-deps rule targets user-facing bundle size, not dev tooling.

3. **Postgres version (A1)** — Is the Supabase project on PG 15+ for `security_invoker` view?
   - What we know: New Supabase projects have been PG 15+ since 2023; likely fine, not verified.
   - Recommendation: Planner runs `SELECT version();` via the Supabase SQL editor before finalizing 0009.

4. **Sort order for free friends (Finding 5, 8)** — Switch from `updated_at DESC` to `last_active_at DESC`?
   - What we know: `last_active_at` is the heartbeat's "freshness" signal; `updated_at` is the "last edit" signal. Semantics differ subtly.
   - Recommendation: Sort by `last_active_at DESC` — matches heartbeat philosophy "your status stays alive as long as you are."

5. **Fix for `STATUS_SORT_ORDER` divergence (Finding 5)** — Two hooks have different enum orderings. Consolidate in Phase 2?
   - What we know: `useFriends.ts` has `{free:0, busy:1, maybe:2}`; `useHomeScreen.ts` has `{free:0, maybe:1, busy:2}`. Home's version is what Users actually see (Home is the UI surface). 
   - Recommendation: Pull constant into `src/types/app.ts` or `src/lib/statusSort.ts` and import from both. Small cleanup task.

6. **`get_free_friends` RPC (Finding 8)** — Unused but still references old shape. Update or leave?
   - Recommendation: Leave alone. Not on the critical path. Add a TODO comment if touched.

---

## Pitfalls & Risks (cross-cutting)

Already covered in "Common Pitfalls" section above, but to surface the top three for planner emphasis:

1. **Silent expiry transitions** (Pitfall 2): mitigate with a `setInterval` 60s heartbeat re-render on Home, OR accept as cosmetic.
2. **pg_cron assumption** (Finding 1): do NOT plan pg_cron into 0009 without an explicit user decision.
3. **D-25's React Query wording** (Finding 3, Pitfall 7): do NOT follow literal wording; use Zustand.

---

## Sources

### Primary (HIGH confidence — direct repo inspection)
- `.planning/phases/02-status-liveness-ttl/02-CONTEXT.md` — all 37 locked decisions
- `.planning/phases/02-status-liveness-ttl/02-DISCUSSION-LOG.md` — evolution history
- `.planning/REQUIREMENTS.md` — TTL-01..08, HEART-01..05
- `.planning/PROJECT.md` — project-wide constraints (zero deps, strict TS, RLS-first)
- `.planning/ROADMAP.md` — Phase 2 scope note (redesign flag)
- `.planning/STATE.md` — pending todos (incl. "verify pg_cron availability")
- `.planning/phases/01-push-infrastructure-dm-entry-point/01-CONTEXT.md` — precedents carried forward
- `.planning/research/SUMMARY.md` — v1.3 research (warn: written before heartbeat redesign)
- `.planning/research/PITFALLS.md` — Pitfalls 3, 11, 12 directly apply to Phase 2
- `supabase/migrations/0001_init.sql` — `statuses` table, `is_friend_of`, SECURITY DEFINER patterns, `get_friends`, `statuses` RLS
- `supabase/migrations/0004_fix_plan_members_rls_recursion.sql` — SECURITY DEFINER helper pattern
- `supabase/migrations/0007_messages_replica_identity.sql` — REPLICA IDENTITY FULL example
- `supabase/migrations/0008_push_tokens_v1_3.sql` — backfill pattern template
- `src/hooks/useStatus.ts` — current implementation (full file read, 66 lines)
- `src/hooks/useFriends.ts` — friend list query path (full file read, 275 lines)
- `src/hooks/useHomeScreen.ts` — realtime subscription + `updated_at` staleness usage (full file read, 166 lines)
- `src/components/common/OfflineBanner.tsx` — animated-height pattern (full file read, 38 lines)
- `src/components/status/SegmentedControl.tsx` — replacement target + prop shape (full file read, 72 lines)
- `src/components/home/HomeFriendCard.tsx` — rendering target (full file read, 117 lines)
- `src/screens/home/HomeScreen.tsx` — mount point for MoodPicker + banner (full file read, 197 lines)
- `src/app/(tabs)/_layout.tsx` — existing AppState listener (full file read, 148 lines)
- `src/app/(tabs)/profile.tsx` — secondary mount point for MoodPicker (line 130-160)
- `ls src/lib/` — convention verification
- `ls supabase/migrations/` — sequential numbering verification (next = 0009)
- `Grep pg_cron|cron.schedule|CREATE EXTENSION supabase/` — 0 matches (pg_cron absent)
- `Grep react-native-reanimated src/` — 0 matches
- `Grep react-query|tanstack src/` — 0 matches
- `Grep SECURITY DEFINER supabase/migrations/` — pattern established
- `Grep channel\(|postgres_changes src/` — one subscription in useHomeScreen, one in useChatRoom
- `Grep updated_at src/` — consumers enumerated

### Secondary (MEDIUM)
- v1.3 research documents note pg_cron free-tier pause behavior; verification deferred (Finding 1).

### Tertiary (LOW — training data)
- Supabase `WITH (security_invoker = true)` view syntax — Postgres 15+ feature, Supabase supports it, but not verified in-repo. Flagged A1.

---

## Metadata

**Confidence breakdown:**
- Schema & migration pattern: HIGH — 0001/0004/0008 provide every primitive
- Trigger + RLS pattern: HIGH — verbatim verified templates in `0001_init.sql`
- Client hook rewrite shape: HIGH — current code fully read, gaps identified
- `src/lib/` placement: HIGH — verified by `ls`
- MoodPicker implementation: HIGH — OfflineBanner pattern + SegmentedControl pattern covers everything
- pg_cron absence: HIGH — 0 matches across all migrations
- Zustand vs React Query: HIGH — full codebase grep confirms React Query absent
- Retention Edge Function details: MEDIUM — general pattern from Phase 1 `notify-plan-invite`, specific scheduler (GitHub Actions vs Supabase Scheduled Functions) unspecified
- PG 15+ / `security_invoker`: MEDIUM — Supabase default but not verified in this project

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (30 days; nothing in the research depends on fast-moving external packages)

## RESEARCH COMPLETE
