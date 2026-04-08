# Phase 3: Friend Went Free Loop — Research

**Researched:** 2026-04-08
**Domain:** Supabase Database Webhooks, Edge Functions (Deno), expo-notifications local scheduling + iOS categories, Postgres timezone math, outbox rate-limiting
**Confidence:** HIGH on stack & code patterns (verified in-repo), MEDIUM on Database Webhook version-control story, MEDIUM-LOW on Hermes `Intl` timezone reliability on iOS (known issue, requires mitigation)

## Summary

Phase 3 is a composition phase, not a greenfield one. Every piece of infrastructure it needs already exists in-repo or as a well-trodden Supabase pattern: the outbox trigger pattern mirrors Phase 2's `on_status_transition`, the Edge Function fan-out mirrors `notify-plan-invite` nearly verbatim, the iOS category registration pattern is already established in `src/lib/notifications-init.ts` at module scope, and Zustand already owns the shared status state via `src/stores/useStatusStore.ts`. The new work is (a) the `free_transitions` outbox + trigger, (b) the `friend_free_pushes` rate-limit log, (c) the `profiles.timezone` + `profiles.notify_friend_free` columns, (d) the `notify-friend-free` Edge Function, and (e) two new iOS categories added directly to `notifications-init.ts`. The client-side expiry scheduler is the only genuinely new pattern — and it's a straight application of `Notifications.scheduleNotificationAsync` with a `DateTriggerInput`.

Two things deserve plan-phase attention before execution:

1. **Database Webhook wiring is NOT fully version-controlled.** The Supabase Dashboard UI for "Database Webhooks" writes a trigger under the hood that calls `supabase_functions.http_request(...)` with the service role key baked in. Authoring it as a `supabase/migrations/0010_*.sql` file requires using `net.http_post` from `pg_net` directly (or calling `supabase_functions.http_request` if the shim exists on this project — verify). There is an active Supabase bug where Authorization headers configured in the Dashboard get dropped on webhook update (GH #38848). Plan should ship the trigger in the migration using `pg_net` (if `pg_net` is enabled) OR document the Dashboard click-path as a deployment step alongside the migration.

2. **`Intl.DateTimeFormat().resolvedOptions().timeZone` is unreliable on Hermes + iOS.** Known Hermes issues return `UTC` in some device configurations, and the resolved timezone does not always update when the user changes device timezone mid-session. D-15's "detect and write on every launch" strategy is the correct mitigation, but the planner must add a fallback path: if the resolved value is literally `'UTC'` AND the device's `new Date().getTimezoneOffset()` is non-zero, treat the `Intl` result as bogus and either skip the write (keep whatever was stored previously) or fall back to an offset-derived IANA guess. D-16 fail-open behavior (treat NULL as UTC, push anyway outside quiet hours) is the right safety net.

**Primary recommendation:**
- Ship migration `0010_friend_went_free_v1_3.sql` adding: `free_transitions`, `friend_free_pushes`, `profiles.timezone`, `profiles.notify_friend_free`, the `statuses` AFTER UPDATE trigger → `free_transitions` INSERT, and the webhook trigger (via `net.http_post` if `pg_net` is enabled, else document a Dashboard step).
- Copy `notify-plan-invite/index.ts` to `notify-friend-free/index.ts` and add the rate-limit gauntlet (quiet hours → per-pair 15min → per-recipient 5min → daily cap → recipient busy/dead → recipient disabled → self) with logging to `friend_free_pushes` on every decision.
- Add `friend_free` (body-only) and `expiry_warning` (KEEP_IT / HEADS_DOWN) categories to `src/lib/notifications-init.ts` at module scope.
- Wire the expo-notifications response listener in `src/lib/notifications-init.ts` (or a thin `notifications-response.ts` sibling imported by the root layout) to dispatch KEEP_IT / HEADS_DOWN to `useStatusStore` directly (not through the `useStatus` hook, because response listeners run outside React).
- Client-side expiry scheduler lives inside `useStatus.setStatus`: cancel any previously-scheduled ID stored in AsyncStorage under `campfire:expiry_notification_id`, schedule a new `DateTriggerInput` at `status_expires_at - 30min` if that window is > 30min out, persist the returned ID.

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01..D-21 — all authoritative)

- **D-01:** EXPIRY-01 is a client-side local `expo-notification` scheduled at `status_expires_at - 30min`. No server-side cron, no pg_cron, no scheduled Edge Function.
- **D-02:** Every `useStatus.setStatus` call cancels the previous expiry notification via `Notifications.cancelScheduledNotificationAsync`, then schedules a fresh one if `status_expires_at - now > 30min`.
- **D-03:** "Keep it" calls `setStatus(currentMood, currentTag, nextWindowId)` where `nextWindowId` is the next-larger window from `src/lib/windows.ts`. Reuses the existing window utility.
- **D-04:** Android Doze-mode delay (~15min in deep doze) is accepted. iOS local notifications fire reliably.
- **D-05:** Notification action buttons handled by the foreground in-app handler in `src/lib/notifications-init.ts`. No background action, no signed Edge Function. Same pattern as Phase 1 D-20 `morning_prompt`.
- **D-06:** iOS background-action mode is NOT used for v1.3. Tapping wakes the app to foreground.
- **D-07:** Dedicated AFTER UPDATE trigger on `public.statuses`, guarded by `NEW.status = 'free' AND OLD.status IS DISTINCT FROM 'free'`. Inserts one row into `free_transitions`.
- **D-08:** Trigger function is `SECURITY DEFINER` with `search_path = ''` (matches Phase 2 T-02-09 pattern).
- **D-09:** `free_transitions` schema: `id BIGSERIAL PK`, `sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`, `occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `context_tag TEXT NULL`, `sent_at TIMESTAMPTZ NULL`, `attempts SMALLINT NOT NULL DEFAULT 0`, `last_error TEXT NULL`, partial index on `(sent_at) WHERE sent_at IS NULL`, RLS denies all client SELECT.
- **D-10:** `friend_free_pushes(recipient_id, sender_id, sent_at, suppressed BOOLEAN, suppression_reason TEXT NULL)` log table. Edge Function logs every decision.
- **D-11:** Suppression reasons enum: `'pair_15min' | 'recipient_5min' | 'daily_cap' | 'quiet_hours' | 'recipient_busy' | 'recipient_disabled_pref' | 'recipient_invalidated_token' | 'self'`.
- **D-12:** Sliding window predicates: `sent_at > now() - interval '15 minutes'` / `'5 minutes'` / `'24 hours'` (rolling, not calendar-day).
- **D-13:** Retention deferred to v1.4 (mirror of TTL-08 deferral).
- **D-14:** `profiles.timezone TEXT NULL` (IANA name). Default NULL until first write.
- **D-15:** Client writes `Intl.DateTimeFormat().resolvedOptions().timeZone` on launch + sign-in if field is null or different.
- **D-16:** Edge Function computes local hour via `AT TIME ZONE recipient.timezone` in SQL. NULL → fall back to UTC; allow push unless UTC hour is in 22–08 (fail-open).
- **D-17:** Phase 3 adds `friend_free` (body-only) and `expiry_warning` (KEEP_IT / HEADS_DOWN) categories directly to `src/lib/notifications-init.ts`.
- **D-18:** Action identifiers are stable strings `KEEP_IT` and `HEADS_DOWN`.
- **D-19:** Monitoring = documented SQL query only. No auto-alerting.
- **D-20:** New `profiles.notify_friend_free BOOLEAN NOT NULL DEFAULT true` column + "Friend availability" toggle in Profile. RLS: user reads/writes own row only.
- **D-21:** "Plan invites" toggle stays independent; the global kill switch is still Phase 1's `push_tokens` row deletion.

### Claude's Discretion
- Exact column types, defaults, indexes on `free_transitions` and `friend_free_pushes`
- Edge Function file structure under `supabase/functions/notify-friend-free/`
- Expo push chunking strategy (chunk size, parallelism)
- Fail-open vs. fail-closed on minor errors
- Suppression-reason logging shape (enum enforced in code, TEXT column storage)
- Local notification reschedule debounce window
- Profile screen visual layout for the new toggle
- Analytics events — out of scope unless infra exists

### Deferred Ideas (OUT OF SCOPE)
- Configurable quiet-hours UI → v1.4
- Auto-alerting on stale outbox rows → v1.4
- `friend_free_pushes` retention rollup → v1.4
- iOS background action dispatch → v1.4
- Rich push body (avatar/image) → v1.4
- Analytics events → v1.4
- pg_cron enablement → still deferred

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FREE-01 | Push within ~5s of non-Free → Free transition | Database Webhook → Edge Function path is async but low-latency (sub-second dispatch); see §Architecture §Pattern 1 |
| FREE-02 | Skip busy recipients, skip self | `effective_status` view + `suppression_reason='recipient_busy'` / `'self'`; filter in Edge Function SQL |
| FREE-03 | Pair 15-min cap | Sliding-window query on `friend_free_pushes` — §Code Examples §Rate-Limit Gauntlet |
| FREE-04 | Recipient 5-min cap | Same sliding-window technique |
| FREE-05 | Daily cap ~3/recipient | 24-hour rolling window |
| FREE-06 | 22:00–08:00 local suppression | `AT TIME ZONE recipient.timezone` — §Code Examples §Quiet Hours |
| FREE-07 | Profile toggle | `profiles.notify_friend_free` boolean, filtered in Edge Function |
| FREE-08 | Push body format | `"{display_name} is Free • {emoji tag}"` — plain string concat in Edge Function |
| FREE-09 | Tap → DM route | Reuse Phase 1 D-08 route `/chat/room?dm_channel_id=…&friend_name=…`; cold-start guard already in Phase 1 |
| FREE-10 | Outbox queue pattern | Trigger → `free_transitions` → Webhook → Edge Function; INSERT-only keeps user write <100ms |
| FREE-11 | Operator can monitor stale rows | D-19 documented SQL query |
| EXPIRY-01 | 30-min pre-expiry warning with KEEP_IT / HEADS_DOWN | Client-side `scheduleNotificationAsync` + response listener — §Pattern 3 |

## Standard Stack

### Core (already installed — zero new deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-notifications` | ~55.0.13 | Local + remote notifications, iOS categories, response listener | [VERIFIED: package.json] Only sanctioned Expo notification package |
| `@supabase/supabase-js` | ^2.99.2 | Client used inside Edge Function (service role) | [VERIFIED: package.json + notify-plan-invite/index.ts] Same version used by existing Edge Function |
| `zustand` | ^5.0.12 | `useStatusStore` cross-screen sync (OVR-02) | [VERIFIED: package.json + useStatusStore.ts] Established store pattern |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persist scheduled expiry-notification ID between sessions | [VERIFIED: package.json] Already used for `campfire:notifications_enabled` and `campfire:push_prompt_eligible` |

### Supporting (Postgres extensions — check if enabled)
| Extension | Purpose | How to verify |
|-----------|---------|---------------|
| `pg_net` | Async HTTP from triggers; powers `net.http_post` | `SELECT * FROM pg_extension WHERE extname='pg_net';` [CITED: supabase.com/docs/guides/database/webhooks] Supabase Database Webhooks are built on pg_net |
| `supabase_functions` schema | Shim that provides `supabase_functions.http_request` trigger function used by Dashboard-authored webhooks | `SELECT to_regproc('supabase_functions.http_request');` — may or may not exist depending on project provisioning date [CITED: GitHub discussion #22668] |

**Verification step the planner MUST run first:** check both extensions in the live DB before committing to SQL-first or Dashboard-first webhook wiring.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database Webhook → Edge Function | Realtime subscription consuming `free_transitions` INSERTs from a long-running worker | No managed long-running workers on Supabase free tier — rejected |
| `pg_net` trigger | Synchronous HTTP from trigger | Violates the <100ms user-write SLO in FREE-10; rejected |
| Server-side expiry scheduler | Client `scheduleNotificationAsync` | Locked by D-01; server-side would require pg_cron (OVR-05 defers) |

**Installation:** None required. All dependencies present.

## Architecture Patterns

### Recommended File Layout
```
supabase/
├── migrations/
│   └── 0010_friend_went_free_v1_3.sql      # NEW — all schema + trigger + webhook
└── functions/
    └── notify-friend-free/
        └── index.ts                          # NEW — copy of notify-plan-invite shape

src/
├── lib/
│   ├── notifications-init.ts                 # MODIFIED — add two categories + response listener
│   ├── windows.ts                            # READ ONLY — Phase 2 shipped nextWindowId helper
│   └── expiry-scheduler.ts                   # NEW — scheduleExpiryNotification() / cancelExpiryNotification()
├── hooks/
│   ├── useStatus.ts                          # MODIFIED — call scheduleExpiryNotification on every setStatus
│   └── useProfile.ts (or equivalent)         # MODIFIED — upsert profiles.timezone on launch/sign-in
└── stores/
    └── useStatusStore.ts                      # READ ONLY — response listener reaches in directly
```

### Pattern 1: Outbox → Database Webhook → Edge Function

The established Supabase pattern for "INSERT causes async HTTP call" is:
1. Business trigger inserts into an **outbox table** (`free_transitions`) — INSERT-only, trivially <100ms [VERIFIED: Phase 2's architecture pattern is identical].
2. A **Database Webhook** (a separate trigger created via Dashboard or SQL migration) fires on INSERT to the outbox table, calling an Edge Function via `net.http_post` under the hood.
3. The Edge Function is the consumer. It reads the payload from the request body, does its work, and UPDATEs the outbox row (`sent_at = now()` on success, `attempts += 1, last_error = ...` on failure).

**Webhook payload shape** (automatic, not configurable) [CITED: supabase.com/docs/guides/database/webhooks]:
```json
{
  "type": "INSERT",
  "table": "free_transitions",
  "schema": "public",
  "record": {
    "id": 123,
    "sender_id": "uuid-...",
    "occurred_at": "2026-04-08T14:23:45.123Z",
    "context_tag": "grab a coffee",
    "sent_at": null,
    "attempts": 0,
    "last_error": null
  },
  "old_record": null
}
```

**Authentication:** Supabase Edge Functions require a JWT in the `Authorization` header by default. The Dashboard-authored webhook injects `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` automatically [CITED: supabase.com/docs/guides/functions/auth]. If the function is authored as SQL migration via `net.http_post`, the migration must read the service role key from Postgres settings or Vault and build the header explicitly.

**Known Supabase bug:** Dashboard UI drops the `Authorization` header on webhook update [CITED: github.com/supabase/supabase/issues/38848]. Workaround: if webhook is configured via Dashboard, DO NOT edit it in UI after creation — only delete + recreate.

**Latency:** `pg_net` dispatches asynchronously with sub-second scheduling; the Edge Function cold-start on Supabase free tier is typically 100-400ms. Total outbox→delivered-to-device is well within the 5-second SC for FREE-01 [CITED: supabase.com/features/database-webhooks] [CONFIDENCE: MEDIUM — no formal SLO is published].

### Pattern 2: Edge Function Rate-Limit Gauntlet

Each recipient passes through an ordered gauntlet. Order is chosen so cheapest checks run first and logging captures the FIRST reason a push was suppressed (not the last):

```
for each friend of sender:
  if friend.id == sender.id          → log 'self', continue
  if friend.notify_friend_free == false → log 'recipient_disabled_pref', continue
  if friend.effective_status == 'busy' OR effective_status IS NULL → log 'recipient_busy', continue
  (derive friend local hour via SQL AT TIME ZONE)
  if friend local hour ∈ [22, 08)    → log 'quiet_hours', continue
  if EXISTS(friend_free_pushes WHERE recipient=friend AND sender=sender AND sent_at > now()-'15min') → log 'pair_15min', continue
  if EXISTS(friend_free_pushes WHERE recipient=friend AND sent_at > now()-'5min' AND suppressed=false) → log 'recipient_5min', continue
  if (SELECT count(*) FROM friend_free_pushes WHERE recipient=friend AND sent_at > now()-'24h' AND suppressed=false) >= 3 → log 'daily_cap', continue
  (fetch push_tokens for friend filtered by invalidated_at IS NULL)
  if no tokens → log 'recipient_invalidated_token', continue
  SEND push via Expo
  parse ticket → on DeviceNotRegistered, UPDATE push_tokens SET invalidated_at=now() (copy Phase 1 D-22 pattern)
  INSERT friend_free_pushes row with suppressed=false
end for
UPDATE free_transitions SET sent_at=now(), attempts=attempts+1 WHERE id=payload.record.id
```

### Pattern 3: Client-Side Expiry Scheduling with Cancel+Reschedule

SDK 55 `expo-notifications` [CITED: docs.expo.dev/versions/latest/sdk/notifications/]:
- `Notifications.scheduleNotificationAsync({ content, trigger })` returns a string `identifier`.
- Trigger supports a discriminated union with `type: 'date' | 'timeInterval' | 'calendar' | 'daily' | 'weekly' | 'monthly' | 'yearly'`.
- `DateTriggerInput = { type: SchedulableTriggerInputTypes.DATE, date: Date | number, channelId?: string }`.
- `content.categoryIdentifier` links the notification to an iOS category for action buttons.
- `Notifications.cancelScheduledNotificationAsync(identifier)` cancels a single pending notification.
- `Notifications.getAllScheduledNotificationsAsync()` enumerates pending (useful for sanity-check in dev).
- `Notifications.cancelAllScheduledNotificationsAsync()` exists but must NOT be used — it would wipe Phase 4's morning prompt too.

**Persistence rule:** the notification ID must be stored in AsyncStorage under `campfire:expiry_notification_id` so the next `setStatus` call (which may be a fresh app launch) can cancel the previously-scheduled one. Relying on in-memory state loses the ID across process kills.

**Anti-pattern to avoid:** do NOT call `cancelAllScheduledNotificationsAsync()` to "simplify" things — it clobbers the Phase 4 daily morning prompt. Always cancel by stored ID.

### Pattern 4: Module-Scope Category Registration (Dynamic Add)

iOS categories CAN be added at runtime via `setNotificationCategoryAsync` — the "module scope" rule from Phase 1 D-20 means "before the first `requestPermissionsAsync()` call", not "in a single synchronous block". `src/lib/notifications-init.ts` already runs at module load (imported from root `_layout.tsx`), so adding two more `setNotificationCategoryAsync(...)` calls in the same file keeps them at module scope automatically [VERIFIED: reading current notifications-init.ts — it's structured exactly for this].

Expo's implementation of `setNotificationCategoryAsync` is idempotent (calling it multiple times with the same identifier is safe) and upserts the category on APNs [CITED: docs.expo.dev/versions/latest/sdk/notifications/]. Phase 3 can simply append:

```ts
Notifications.setNotificationCategoryAsync('friend_free', []).catch(() => {});  // no action buttons
Notifications.setNotificationCategoryAsync('expiry_warning', [
  { identifier: 'KEEP_IT',    buttonTitle: 'Keep it',    options: { opensAppToForeground: true } },
  { identifier: 'HEADS_DOWN', buttonTitle: 'Heads down', options: { opensAppToForeground: true } },
]).catch(() => {});
```

**Referencing a category before it's registered:** if a notification (local or remote) arrives with `categoryIdentifier: 'expiry_warning'` before the category has been registered on this install, iOS silently falls back to the default category (no action buttons). Since categories are registered at module load — before any `scheduleNotificationAsync` can ever run — this is not a risk for EXPIRY-01 local notifications. For `friend_free` remote pushes, the category must be registered on first app launch BEFORE the first permissions prompt completes, which is already the case per Phase 1 D-20.

### Pattern 5: Notification Response Listener (Action Dispatch)

`Notifications.addNotificationResponseReceivedListener` fires when the user taps a notification OR one of its action buttons. Payload shape:
```ts
response: {
  actionIdentifier: string,   // 'KEEP_IT' | 'HEADS_DOWN' | Notifications.DEFAULT_ACTION_IDENTIFIER
  notification: {
    request: {
      content: { categoryIdentifier: string, data: Record<string, any>, ... },
      trigger: ...
    }
  }
}
```

**Critical architectural point:** the listener runs at module scope (or inside a top-level `useEffect`) and does NOT have access to React hooks. It must dispatch by reaching into `useStatusStore.getState()` directly (Zustand allows this) OR call a plain-function helper that wraps `supabase.from('statuses').upsert(...)`. DO NOT try to call `useStatus()` inside the listener.

The cleanest split:
- Store the listener setup in `src/lib/notifications-init.ts` (same module as category registration).
- The listener body calls a new plain function `handleExpiryResponse(actionIdentifier)` that imports `useStatusStore` and the `computeWindowExpiry` helper directly.

### Anti-Patterns to Avoid

- **Don't call `pg_net` from inside the business trigger.** Already decided — D-07 splits outbox write from HTTP dispatch.
- **Don't use `cancelAllScheduledNotificationsAsync()`** — clobbers Phase 4's morning prompt.
- **Don't rely on Supabase Dashboard UI for webhook wiring in a commit-documented setup.** Dashboard drops Authorization headers on edit (GH #38848). Prefer SQL-migration-authored trigger via `net.http_post`.
- **Don't call React hooks inside `addNotificationResponseReceivedListener`.** The listener runs outside component render; use `useStatusStore.getState()`.
- **Don't schedule the expiry notification inside a `useEffect`.** Must live inside `useStatus.setStatus` (the write path) so it's deterministically bound to every status commit.
- **Don't forget to store the scheduled notification ID in AsyncStorage.** In-memory state is lost across cold launches.
- **Don't use `<>` for status transition comparisons.** Use `IS DISTINCT FROM` (Phase 2 OVR-09 established this).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone conversion in JS | Build date-fns-tz equivalent | Postgres `AT TIME ZONE` | Supabase ships current tzdata; no JS tz dep [CITED: postgresql.org/docs/current/datatype-datetime.html] |
| Rate-limit state store | Redis, memcached | `friend_free_pushes` table with indexed query | Postgres handles 3-15 friend squads trivially; zero new infra |
| Async HTTP from DB | Synchronous `net.http_post` inside business trigger | Outbox + separate webhook trigger | Keeps user-write SLO <100ms |
| Cross-device notification state | Server-side state per device | Client-side AsyncStorage for local notification IDs | Local notifications are per-install; no server involvement needed |
| Push send chunking | Manual chunking logic | Copy `notify-plan-invite`'s single-request pattern | Phase 3 fan-out is bounded by friend-count (max ~15 per sender) — no chunking needed |
| Timezone detection polyfill | Install `format-js/intl-datetimeformat` | `Intl.DateTimeFormat().resolvedOptions().timeZone` + fallback | Zero-new-deps rule; fallback to server UTC compare is acceptable per D-16 |

**Key insight:** Every "hard" problem in this phase has a solution already in-repo or already in Postgres/Expo's standard surface area. The real risk is over-engineering.

## Common Pitfalls

### Pitfall 1: Hermes `Intl.DateTimeFormat().resolvedOptions().timeZone` returns "UTC" on iOS

**What goes wrong:** On iOS with Hermes, certain timezone states return `"UTC"` even when the device is in e.g. Europe/London. The issue is that Hermes relies on `NSTimeZone.knownTimeZoneNames` which doesn't always include the default timezone, and depending on device state the default may silently fall through to UTC.

**Why it happens:** Hermes' `PlatformIntlApple.mm` has a workaround that manually injects `NSTimeZone.defaultTimeZone` into the valid set, but this wasn't always present and regressions have shipped. [CITED: github.com/facebook/hermes/issues/1172, github.com/facebook/hermes/issues/1100, github.com/callstack/timezone-hermes-fix]

**How to avoid:**
1. Detect the bogus result: if `Intl.DateTimeFormat().resolvedOptions().timeZone === 'UTC'` AND `new Date().getTimezoneOffset() !== 0`, the `Intl` result is lying.
2. In that case, do NOT overwrite a previously-stored timezone. Keep the stale value rather than replace with UTC.
3. If there is no previously-stored value, write NULL and let the Edge Function fail-open to UTC quiet-hours (D-16).
4. The `callstack/timezone-hermes-fix` package exists but adds a native module — violates zero-new-deps rule. Skip it.

**Warning signs in dogfooding:** a user reports getting push notifications at 2 AM local time. Check their `profiles.timezone` — if it's `'UTC'` or NULL and the device is not actually in UTC, this pitfall hit.

### Pitfall 2: Database Webhook Authorization header silently dropped on Dashboard edit

**What goes wrong:** Opening an existing webhook in Dashboard and saving it (even without touching the Authorization field) blanks the header. Subsequent trigger fires hit the Edge Function without auth and the function returns 401. [CITED: github.com/supabase/supabase/issues/38848, github.com/supabase/supabase/issues/39248]

**Why it happens:** Supabase Dashboard UI bug — the Authorization field is write-only in the UI and the save path doesn't preserve unchanged values.

**How to avoid:**
- **Option A (preferred):** Author the webhook trigger directly in migration SQL using `net.http_post`, with the service role key read from Postgres settings or Vault. No Dashboard involvement.
- **Option B:** If using Dashboard, treat webhook config as immutable. To change anything, delete and recreate. Document this in the deployment runbook.

### Pitfall 3: Response listener runs outside React — hooks don't work

**What goes wrong:** Calling `useStatus()` or any hook inside `addNotificationResponseReceivedListener` crashes with "Invalid hook call" because the listener is not a component.

**How to avoid:** Reach into Zustand directly via `useStatusStore.getState()`. Keep the listener body as plain async functions, not hooks. Register the listener at module scope (same file as category registration) so there is no subscribe/unsubscribe churn.

### Pitfall 4: Forgetting to persist the expiry notification ID

**What goes wrong:** User sets status at 2 PM with a 3h window (expiry at 5 PM, notification scheduled for 4:30 PM). App is force-killed at 3 PM. User sets a new status at 4 PM with a different window — but the cancel step can't find the previous ID (it was in React state that died with the process). Now two expiry notifications fire.

**How to avoid:** Persist the notification ID to AsyncStorage under `campfire:expiry_notification_id` immediately after `scheduleNotificationAsync` returns. Read it back on every `setStatus` before scheduling a new one.

### Pitfall 5: `IS DISTINCT FROM` vs. `<>` in the trigger guard

**What goes wrong:** Using `OLD.status <> 'free' AND NEW.status = 'free'` misses the NULL→'free' case (a brand-new status row). `NULL <> 'free'` is NULL, not TRUE, so the trigger doesn't fire on a user's first status ever set to Free.

**How to avoid:** Use `NEW.status = 'free' AND (OLD.status IS DISTINCT FROM NEW.status)` — the Phase 2 OVR-09 pattern. Note: the `statuses` table has `status NOT NULL DEFAULT 'maybe'` so the row always exists with a non-null value; the relevant edge case is a status row where `updated_at` changes without `status` changing. `IS DISTINCT FROM` is still the correct idiom for consistency with Phase 2.

### Pitfall 6: `effective_status` view cannot be published to Realtime

**What goes wrong:** Trying to subscribe to `effective_status` via Supabase Realtime silently fails. [CITED: Phase 2 PITFALLS Pitfall 12]

**How to avoid:** Edge Function reads from the view via REST (service-role client), not Realtime. Realtime is not needed in Phase 3 at all — the Edge Function runs once per outbox row and does its own SELECTs.

### Pitfall 7: Concurrent trigger fires double-sending to the same recipient

**What goes wrong:** Sender A flips to Free at 14:00:00.100. Sender B flips to Free at 14:00:00.105. Two outbox rows. Two parallel Edge Function invocations. Both read `friend_free_pushes` at 14:00:00.200, both see no row in the 5-min window, both send. Recipient gets two pushes in 100ms.

**How to avoid:** For v1.3 scale (3-15 friends per squad, bursty-but-rare), acceptable risk. Document as known limitation. If it becomes a problem, add `FOR UPDATE SKIP LOCKED` to the read path or use a Postgres advisory lock on `hashtext(recipient_id::text)`. Do NOT ship serializable transactions — too much contention for the value.

### Pitfall 8: `profiles.notify_friend_free` RLS policy inheritance

**What goes wrong:** Adding a new column to `profiles` doesn't automatically cover it under existing policies if the policy has a narrow column list (it doesn't — the current policy is `USING (true)` for SELECT). But the UPDATE policy is `WITH CHECK (id = auth.uid())` — which covers any column the user writes, including the new one. No policy change needed. [VERIFIED: supabase/migrations/0001_init.sql §198-215]

**How to avoid:** No action needed, but document the verification in the migration comments so the next developer doesn't wonder.

## Code Examples

### Verified Pattern: Edge Function Structure (copy from notify-plan-invite)

```ts
// supabase/functions/notify-friend-free/index.ts
// Source: supabase/functions/notify-plan-invite/index.ts (adapted)
import { createClient } from 'npm:@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT';
  table: 'free_transitions';
  schema: 'public';
  record: {
    id: number;
    sender_id: string;
    occurred_at: string;
    context_tag: string | null;
    sent_at: string | null;
    attempts: number;
    last_error: string | null;
  };
  old_record: null;
}

type SuppressionReason =
  | 'pair_15min' | 'recipient_5min' | 'daily_cap' | 'quiet_hours'
  | 'recipient_busy' | 'recipient_disabled_pref'
  | 'recipient_invalidated_token' | 'self';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function logDecision(
  recipient_id: string,
  sender_id: string,
  suppressed: boolean,
  reason: SuppressionReason | null
) {
  await supabase.from('friend_free_pushes').insert({
    recipient_id, sender_id, sent_at: new Date().toISOString(),
    suppressed, suppression_reason: reason,
  });
}

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  const { record } = payload;
  const senderId = record.sender_id;

  try {
    // 1. Fetch sender display name
    const { data: sender } = await supabase
      .from('profiles').select('display_name').eq('id', senderId).single();
    const senderName = sender?.display_name ?? 'Someone';

    // 2. Fetch all friends of sender who might receive the push
    //    (friendships table joined to profiles for timezone + pref + push tokens)
    //    PLUS effective_status for busy/dead filter
    const { data: candidates } = await supabase.rpc('get_friend_free_candidates', {
      p_sender: senderId,
    });
    // ^ New RPC defined in migration 0010 — returns rows with:
    //   recipient_id, timezone, notify_friend_free, effective_status,
    //   local_hour (computed via AT TIME ZONE), push_tokens[]

    for (const c of candidates ?? []) {
      // --- Gauntlet ---
      if (c.recipient_id === senderId) { await logDecision(c.recipient_id, senderId, true, 'self'); continue; }
      if (!c.notify_friend_free)        { await logDecision(c.recipient_id, senderId, true, 'recipient_disabled_pref'); continue; }
      if (c.effective_status !== 'free' && c.effective_status !== 'maybe' && c.effective_status !== null) {
        // Busy or other — skip. (null = dead heartbeat — also skip per D-35)
        if (c.effective_status === 'busy' || c.effective_status === null) {
          await logDecision(c.recipient_id, senderId, true, 'recipient_busy'); continue;
        }
      }
      if (c.local_hour !== null && (c.local_hour >= 22 || c.local_hour < 8)) {
        await logDecision(c.recipient_id, senderId, true, 'quiet_hours'); continue;
      }

      // Rate-limit checks
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const fiveMinAgo   = new Date(Date.now() - 5  * 60 * 1000).toISOString();
      const dayAgo       = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count: pairCt } = await supabase.from('friend_free_pushes')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', c.recipient_id).eq('sender_id', senderId)
        .eq('suppressed', false).gt('sent_at', fifteenMinAgo);
      if ((pairCt ?? 0) > 0) { await logDecision(c.recipient_id, senderId, true, 'pair_15min'); continue; }

      const { count: recentCt } = await supabase.from('friend_free_pushes')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', c.recipient_id).eq('suppressed', false).gt('sent_at', fiveMinAgo);
      if ((recentCt ?? 0) > 0) { await logDecision(c.recipient_id, senderId, true, 'recipient_5min'); continue; }

      const { count: dayCt } = await supabase.from('friend_free_pushes')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', c.recipient_id).eq('suppressed', false).gt('sent_at', dayAgo);
      if ((dayCt ?? 0) >= 3) { await logDecision(c.recipient_id, senderId, true, 'daily_cap'); continue; }

      if (!c.push_tokens || c.push_tokens.length === 0) {
        await logDecision(c.recipient_id, senderId, true, 'recipient_invalidated_token'); continue;
      }

      // --- Send ---
      const bodyText = record.context_tag
        ? `${senderName} is Free • ${record.context_tag}`
        : `${senderName} is Free`;
      const messages = c.push_tokens.map((token: string) => ({
        to: token,
        title: 'Friend is Free',
        body: bodyText,
        sound: 'default',
        channelId: 'friend_free',
        categoryId: 'friend_free',                         // iOS
        data: { senderId, senderName },
      }));
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
        },
        body: JSON.stringify(messages),
      });
      const body = await res.json();
      // Parse tickets for DeviceNotRegistered (copy D-22 pattern from notify-plan-invite)
      if (body.data) {
        const invalidated: string[] = [];
        body.data.forEach((ticket: any, idx: number) => {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            invalidated.push(c.push_tokens[idx]);
          }
        });
        if (invalidated.length > 0) {
          await supabase.from('push_tokens')
            .update({ invalidated_at: new Date().toISOString() })
            .in('token', invalidated);
        }
      }
      await logDecision(c.recipient_id, senderId, false, null);
    }

    // Mark outbox row as sent
    await supabase.from('free_transitions')
      .update({ sent_at: new Date().toISOString(), attempts: record.attempts + 1 })
      .eq('id', record.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    await supabase.from('free_transitions')
      .update({ attempts: record.attempts + 1, last_error: String(e) })
      .eq('id', record.id);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
```

### Verified Pattern: Outbox Trigger + Webhook (migration 0010 excerpts)

```sql
-- free_transitions outbox
CREATE TABLE public.free_transitions (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  context_tag text,
  sent_at     timestamptz,
  attempts    smallint NOT NULL DEFAULT 0,
  last_error  text
);
CREATE INDEX idx_free_transitions_unsent
  ON public.free_transitions (occurred_at)
  WHERE sent_at IS NULL;

ALTER TABLE public.free_transitions ENABLE ROW LEVEL SECURITY;
-- No client policies — only SECURITY DEFINER writes.

-- Business trigger (D-07)
CREATE OR REPLACE FUNCTION public.on_status_went_free()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'free' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.free_transitions (sender_id, context_tag)
    VALUES (NEW.user_id, NEW.context_tag);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_status_went_free
  AFTER UPDATE ON public.statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.on_status_went_free();

-- friend_free_pushes log
CREATE TABLE public.friend_free_pushes (
  id                 BIGSERIAL PRIMARY KEY,
  recipient_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at            timestamptz NOT NULL DEFAULT now(),
  suppressed         boolean NOT NULL,
  suppression_reason text
);
CREATE INDEX idx_ffp_recipient_recent
  ON public.friend_free_pushes (recipient_id, sent_at DESC);
CREATE INDEX idx_ffp_pair_recent
  ON public.friend_free_pushes (recipient_id, sender_id, sent_at DESC);
ALTER TABLE public.friend_free_pushes ENABLE ROW LEVEL SECURITY;
-- No client policies — SECURITY DEFINER / service role writes only.

-- profiles additions
ALTER TABLE public.profiles
  ADD COLUMN timezone text,
  ADD COLUMN notify_friend_free boolean NOT NULL DEFAULT true;
```

### Verified Pattern: Postgres Quiet-Hours Local Hour

```sql
-- Compute recipient's local hour at now(), returning 0-23 as int
-- or NULL if timezone is NULL
SELECT
  p.id AS recipient_id,
  CASE
    WHEN p.timezone IS NULL THEN NULL
    ELSE EXTRACT(hour FROM (now() AT TIME ZONE p.timezone))::int
  END AS local_hour
FROM public.profiles p
WHERE p.id = ANY($1::uuid[]);
```
[CITED: postgresql.org/docs/current/datatype-datetime.html] `AT TIME ZONE 'Europe/London'` on a `timestamptz` returns a naive `timestamp` in that zone. Supabase keeps tzdata current with the Postgres image (verified via `SELECT * FROM pg_timezone_names;`).

### Verified Pattern: RPC `get_friend_free_candidates`

Recommended to ship a single SECURITY DEFINER RPC that returns the joined candidate set in one query, so the Edge Function doesn't fan out to N round-trips:

```sql
CREATE OR REPLACE FUNCTION public.get_friend_free_candidates(p_sender uuid)
RETURNS TABLE (
  recipient_id uuid,
  notify_friend_free boolean,
  effective_status public.availability_status,
  local_hour int,
  push_tokens text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.notify_friend_free,
    es.effective_status,
    CASE WHEN p.timezone IS NULL THEN NULL
         ELSE EXTRACT(hour FROM (now() AT TIME ZONE p.timezone))::int
    END,
    COALESCE(
      (SELECT array_agg(t.token) FROM public.push_tokens t
       WHERE t.user_id = p.id AND t.invalidated_at IS NULL),
      ARRAY[]::text[]
    )
  FROM public.profiles p
  JOIN public.friendships f
    ON f.status = 'accepted'
   AND ((f.requester_id = p_sender AND f.addressee_id = p.id)
        OR (f.addressee_id = p_sender AND f.requester_id = p.id))
  LEFT JOIN public.effective_status es ON es.user_id = p.id
  WHERE p.id <> p_sender;
$$;
```

### Verified Pattern: Client-Side Expiry Scheduler

```ts
// src/lib/expiry-scheduler.ts
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'campfire:expiry_notification_id';
const WARNING_OFFSET_MS = 30 * 60 * 1000;

export async function scheduleExpiryNotification(
  statusExpiresAt: Date,
  currentMoodLabel: string
) {
  // Cancel previous
  const prev = await AsyncStorage.getItem(KEY);
  if (prev) {
    try { await Notifications.cancelScheduledNotificationAsync(prev); } catch {}
    await AsyncStorage.removeItem(KEY);
  }

  const fireAt = new Date(statusExpiresAt.getTime() - WARNING_OFFSET_MS);
  if (fireAt.getTime() <= Date.now() + 60_000) {
    // Too close — ReEngagementBanner already covers this
    return;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Still ' + currentMoodLabel + '?',
      body: 'Your status expires in 30 minutes',
      categoryIdentifier: 'expiry_warning',     // iOS action buttons
      sound: 'default',
      data: { kind: 'expiry_warning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: 'morning_prompt', // reuse existing DEFAULT-importance Android channel
    },
  });
  await AsyncStorage.setItem(KEY, id);
}

export async function cancelExpiryNotification() {
  const prev = await AsyncStorage.getItem(KEY);
  if (prev) {
    try { await Notifications.cancelScheduledNotificationAsync(prev); } catch {}
    await AsyncStorage.removeItem(KEY);
  }
}
```

### Verified Pattern: Notification Response Listener

```ts
// addition to src/lib/notifications-init.ts (after the category registration block)
import { useStatusStore } from '@/stores/useStatusStore';
import { computeWindowExpiry, nextLargerWindow, type WindowId } from '@/lib/windows';
import { supabase } from '@/lib/supabase';

if (Platform.OS !== 'web') {
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const action = response.actionIdentifier;
    const category = response.notification.request.content.categoryIdentifier;
    if (category !== 'expiry_warning') return;

    const current = useStatusStore.getState().currentStatus;
    if (!current) return;

    if (action === 'KEEP_IT') {
      const next: WindowId = nextLargerWindow(current.window_id);
      const expiry = computeWindowExpiry(next, new Date());
      await supabase.from('statuses').upsert({
        user_id: current.user_id,
        status: current.status,
        context_tag: current.context_tag,
        status_expires_at: expiry.toISOString(),
        last_active_at: new Date().toISOString(),
      });
      useStatusStore.getState().setCurrentStatus({
        ...current, status_expires_at: expiry.toISOString(),
      });
    } else if (action === 'HEADS_DOWN') {
      const expiry = computeWindowExpiry('3h', new Date());
      await supabase.from('statuses').upsert({
        user_id: current.user_id,
        status: 'busy',
        context_tag: null,
        status_expires_at: expiry.toISOString(),
        last_active_at: new Date().toISOString(),
      });
      useStatusStore.getState().setCurrentStatus({
        ...current, status: 'busy', context_tag: null,
        status_expires_at: expiry.toISOString(),
      });
    }
  });
}
```

**Note:** `nextLargerWindow` is assumed to exist in `src/lib/windows.ts` per D-03. Planner must verify — if not present, add it in this phase.

### Verified Pattern: Timezone Detection with Hermes Fallback

```ts
// src/hooks/useProfile.ts (or inside the session-ready effect in (tabs)/_layout.tsx)
import { supabase } from '@/lib/supabase';

export async function syncDeviceTimezone(userId: string) {
  let tz: string | null = null;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch { tz = null; }

  // Hermes iOS fallback: if we got 'UTC' but the device offset isn't zero, it's lying.
  if (tz === 'UTC' && new Date().getTimezoneOffset() !== 0) {
    tz = null;
  }
  if (!tz) return;  // Fail-open per D-16

  const { data: existing } = await supabase
    .from('profiles').select('timezone').eq('id', userId).single();
  if (existing?.timezone === tz) return;

  await supabase.from('profiles').update({ timezone: tz }).eq('id', userId);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `shouldShowAlert` in notification handler | `shouldShowBanner` + `shouldShowList` | SDK 53+ | Already correct in current notifications-init.ts |
| Expo Go for notification testing | EAS dev build required | SDK 53+ | Phase 1 D-11 — dev build first |
| `setNotificationHandler` callback-style trigger shape | Discriminated union with `type` field | SDK 50+ | Use `SchedulableTriggerInputTypes.DATE` enum |
| React Query for cross-screen state | Zustand stores | Phase 2 OVR-02 | Use `useStatusStore` |

**Deprecated/outdated:**
- `shouldShowAlert: true` — removed in SDK 53, replaced by banner/list split
- `Notifications.scheduleLocalNotificationAsync` (pre-SDK 40 API) — gone, use `scheduleNotificationAsync`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `expo-notifications` | Phase 3 scheduler + categories | ✓ | ~55.0.13 | — |
| `@supabase/supabase-js` in Edge Function | notify-friend-free | ✓ | ^2.99.2 | — |
| `zustand` | Response listener → store dispatch | ✓ | ^5.0.12 | — |
| `@react-native-async-storage/async-storage` | Persist expiry notification ID | ✓ | 2.2.0 | — |
| Phase 2 migration 0009 applied | Trigger references `statuses.status_expires_at`, `effective_status` view | ✓ | Applied 2026-04-08 | — |
| Phase 1 `push_tokens.invalidated_at` | Filter invalidated tokens in fan-out | ✓ | Migration 0008 | — |
| Phase 1 `notifications-init.ts` | Add new categories here | ✓ (exists) | — | — |
| `pg_net` extension | `net.http_post` for SQL-authored webhook trigger | **UNVERIFIED** | — | If absent → use Dashboard-authored webhook (document deployment click-path) |
| `supabase_functions.http_request` shim | Alternative to `net.http_post` | **UNVERIFIED** | — | Fall back to `net.http_post` |
| Supabase Database Webhooks (project feature) | FREE-10 fan-out dispatch | **UNVERIFIED** on free tier for this project | — | Fall back to calling the Edge Function from inside `on_status_went_free` trigger via `net.http_post` directly (not ideal — breaks the <100ms SLO) |

**Missing dependencies with no fallback:** None — all hard dependencies are present.

**Missing dependencies with fallback:**
- `pg_net`: first migration step must be `CREATE EXTENSION IF NOT EXISTS pg_net;`. If the platform rejects it, fall back to Dashboard-configured webhook and document the deployment step.

**Plan-phase action:** Run these queries against the linked project BEFORE writing the migration:
```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_net', 'supabase_functions');
SELECT to_regproc('supabase_functions.http_request') IS NOT NULL AS has_shim;
```

## Runtime State Inventory

Not applicable — this is a feature phase, not a rename/refactor phase. No stored data, live service config, OS-registered state, secrets, or build artifacts from prior phases need migration.

**Stored data:** None to rename. New tables only.
**Live service config:** One new Database Webhook (either in migration or Dashboard) — this IS new config, not a rename. Documented.
**OS-registered state:** None.
**Secrets/env vars:** Edge Function needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPO_ACCESS_TOKEN` — ALL already configured for the existing `notify-plan-invite` function on this project. No new secrets.
**Build artifacts:** None.

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` exists in the project root as of 2026-04-08. Project constraints are sourced from in-repo patterns and prior phase CONTEXT.md files:

- **Zero new npm dependencies** — enforced since Phase 1. No `date-fns`, no `format-js`, no Hermes tz-fix native module.
- **Design tokens via `@/theme`** — ESLint rule `campfire/no-hardcoded-styles` enforces; any new Profile toggle UI uses COLORS/SPACING/FONT_SIZE/RADII.
- **Migration numbering** — sequential; this phase is `0010_friend_went_free_v1_3.sql`.
- **RLS-first** — every table ships policies or an explicit comment justifying no-client-policies.
- **`src/lib/`, not `src/utils/`** — Phase 2 OVR-01 established this.
- **AsyncStorage keys prefixed with `campfire:`** — use `campfire:expiry_notification_id`.
- **No test framework** — Phase 2 OVR-10 rejected adding Jest; verification is grep + tsc + eslint + assertion scripts + runtime smoke at Phase 5 Hardware Gate.
- **All iOS hardware smoke tests defer to Phase 5 Hardware Verification Gate** — user has no Apple Dev account yet, so Phase 3 must NOT block on hardware tests.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pg_net` extension is available on the linked Supabase project | Environment Availability | HIGH — if absent, must fall back to Dashboard-only webhook authoring, breaking the "all in migration" story. Plan-phase MUST verify before task 1. |
| A2 | Supabase Database Webhooks work correctly on the project's current tier | Pattern 1 | HIGH — same mitigation: verify in Supabase Dashboard that the Webhooks feature is enabled before authoring. |
| A3 | Hermes iOS workaround for `Intl.DateTimeFormat().timeZone` works reliably for common timezones in Expo SDK 55 / RN 0.83 | Pitfall 1 | MEDIUM — dogfooding at Phase 5 Hardware Gate will confirm; fallback (store NULL) is safe. |
| A4 | Expo push notifications honor `channelId: 'friend_free'` on Android and `categoryId: 'friend_free'` on iOS when sent via Expo Push API | Code Examples §Edge Function | LOW — the same payload shape works for `notify-plan-invite` with `plan_invites` channel. |
| A5 | `nextLargerWindow(windowId)` helper exists in `src/lib/windows.ts` (or is trivially addable) | Code Examples §Response Listener | LOW — if missing, a 10-line function; plan-phase verifies. |
| A6 | The `effective_status` view can be joined in an RPC function without triggering the Realtime-publish limitation | RPC pattern | LOW — joining a view in a SELECT is fine; only Realtime subscriptions to the view fail. |
| A7 | `friend_free` Android channel (Phase 1 D-18) actually shipped and is live in the dev build | Edge Function channel ref | LOW — verified in current `notifications-init.ts` (lines 39-43). |
| A8 | `useStatusStore.currentStatus` schema includes `window_id` so the response listener can compute `nextLargerWindow` | Pattern 5 | MEDIUM — if `window_id` is not in the store shape, the listener needs to derive it from `status_expires_at` math. Plan-phase verifies the `CurrentStatus` type in `src/types/app.ts`. |
| A9 | Edge Function cold-start + DB round-trips complete inside the 5-second FREE-01 SC | Pattern 1 latency | LOW-MEDIUM — typical cold start is 100-400ms, total well under 5s; measure at Hardware Gate. |
| A10 | The `friendships` table supports the `(requester_id, addressee_id)` OR reverse query shape used in the RPC | Code Examples §RPC | HIGH-VERIFIED — checked via `supabase/migrations/0001_init.sql` §56-80 and the `is_friend_of` helper at §168-181. |

**Action for planner/discuss-phase:** A1, A2, A3, and A8 should be verified before Plan 01 executes. A1 + A2 are blocking; A3 + A8 are plan-phase sanity checks.

## Open Questions

1. **Is `pg_net` enabled on the linked Supabase project `zqmaauaopyolutfoizgq`?**
   - What we know: Supabase Database Webhooks are built on `pg_net`, and Database Webhooks are a standard Supabase feature. Likely enabled.
   - What's unclear: Whether the SQL-level `net.http_post` function is callable from a migration on this specific project, or whether only Dashboard-authored webhooks work.
   - Recommendation: Plan 01 first task runs `SELECT extname FROM pg_extension WHERE extname='pg_net';` via `supabase db query --linked -o table`. Branch on result.

2. **Does `nextLargerWindow` exist in `src/lib/windows.ts`?**
   - What we know: Phase 2 D-09 exports `WindowId` + `computeWindowExpiry`. D-03 of this phase assumes a "next-larger window" helper.
   - What's unclear: Whether Phase 2 already exported it, or whether Phase 3 adds it.
   - Recommendation: Plan-phase greps `src/lib/windows.ts` for `nextLarger` — if absent, adds it in a new dedicated task.

3. **Does `useStatusStore.CurrentStatus` carry `window_id`?**
   - What we know: `useStatusStore` shape shown in research has `currentStatus` typed as `CurrentStatus | null` from `@/types/app`.
   - What's unclear: Whether `window_id` is part of the type (required by D-03's "next-larger window" computation) or whether only `status_expires_at` is stored and window must be re-derived.
   - Recommendation: Plan-phase reads `src/types/app.ts` at task 0 and either (a) uses `window_id` directly or (b) adds a `deriveWindowId(expires_at, last_active_at)` helper.

4. **How does `/chat/room` handle cold-start deep links (FREE-09)?**
   - What we know: Phase 1 D-08 fixed the DM route. Phase 1 should handle cold-start guards for its own notifications.
   - What's unclear: Whether Phase 1 shipped a generic cold-start router-ready guard that Phase 3 can reuse, or whether Phase 3 needs to add its own.
   - Recommendation: Plan-phase reads Phase 1's current notification tap handler (likely in `notifications-init.ts` or a sibling `notifications-listeners.ts`) and extends it; does NOT duplicate the guard.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None** (Phase 2 OVR-10 explicitly rejected Jest for v1.3) |
| Config file | — |
| Quick run command | `npx tsc --noEmit` + `npx expo lint` |
| Full suite command | `npx tsc --noEmit && npx expo lint && npx supabase db query --linked -f <verification.sql>` |
| Phase gate | tsc + eslint + 6 Supabase schema-attestation SELECTs + documented Hardware Gate smoke test for Phase 5 |

### Phase Requirements → Validation Map

| Req ID | Behavior | Validation Type | Automated Check | Defers to Phase 5? |
|--------|----------|-----------------|-----------------|---------------------|
| **FREE-01** | Push within ~5s of non-Free → Free | Runtime smoke | Manual: set a friend's status to Free, stopwatch until notification lands on dev device | **YES** (Hardware Gate) |
| **FREE-02a** | Recipient who is busy is skipped | SQL assertion | Insert a contrived `friend_free_pushes` precedent + effective_status=busy row, trigger free_transitions INSERT, assert `suppression_reason='recipient_busy'` logged | Partially — SQL-only portion can run in CI via `supabase db query` against a seeded local fixture |
| **FREE-02b** | User never notified about themselves | SQL assertion | Trigger free_transitions for user A, assert no `friend_free_pushes` row exists for (A, A) OR exists with `suppression_reason='self'` | Automated via `db query` |
| **FREE-03** | Pair 15-min cap | SQL assertion | Insert a `friend_free_pushes` row in last 15min for (R, S), trigger new free_transitions from S, assert second attempt logs `suppression_reason='pair_15min'` | Automated via `db query` |
| **FREE-04** | Recipient 5-min throttle | SQL assertion | Same pattern with 5-min window | Automated via `db query` |
| **FREE-05** | Daily cap ~3 | SQL assertion | Seed 3 suppressed=false rows in last 24h for recipient, trigger, assert `suppression_reason='daily_cap'` | Automated via `db query` |
| **FREE-06** | 22:00–08:00 quiet hours | SQL assertion | Set recipient timezone to a zone where `now() AT TIME ZONE tz` is in quiet range, trigger, assert `suppression_reason='quiet_hours'`. Also test NULL timezone fail-open path. | Automated via `db query` |
| **FREE-07** | Profile toggle off → no push | SQL assertion | Set `notify_friend_free=false`, trigger, assert `suppression_reason='recipient_disabled_pref'`. Also TSC: toggle UI component type-checks. | Automated via `db query` + `tsc` |
| **FREE-08** | Body format correct | Unit-ish | Edge Function has no test framework — inspect runtime by tailing Edge Function logs during smoke. Code review: verify the template string matches the spec. | Smoke at Phase 5 |
| **FREE-09** | Tap → DM opens | Runtime smoke | Cold-start the app from a tapped friend_free notification; verify lands on `/chat/room?dm_channel_id=…` | **YES** (Hardware Gate) |
| **FREE-10** | Outbox queue + webhook firing; user-write <100ms | SQL attestation + runtime smoke | `SELECT` from `free_transitions` after triggering a status change — row should exist with `sent_at IS NOT NULL` within ~5s. Also: `supabase functions logs notify-friend-free --linked` shows invocation. User-write latency: `EXPLAIN ANALYZE UPDATE statuses ...` stays under 10ms for the trigger. | Automated (SQL) + Hardware Gate (e2e) |
| **FREE-11** | Operator monitoring query | Manual | Run the documented SQL from D-19; eyeball output. | Operator action, not automated |
| **EXPIRY-01** | 30-min pre-expiry warning with action buttons | Runtime smoke | Set status with 31-min window, wait 1 min, expect notification; tap KEEP_IT, verify status window extends; tap HEADS_DOWN on a fresh one, verify mood flips to busy. | **YES** (Hardware Gate — requires real device for local notification firing reliably) |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` + `npx expo lint` (same as Phases 1 and 2)
- **Per plan merge:** tsc + eslint + targeted `supabase db query --linked -f` verification SELECTs that assert schema shape
- **Per phase merge:** full 6-SELECT attestation (same pattern as 02-02-SUMMARY) + Edge Function deployment verification (`supabase functions deploy notify-friend-free`) + `supabase functions invoke notify-friend-free --body '{"type":"INSERT",...}'` dry-run
- **Phase gate (before Hardware Gate rollup):** all of the above green; Hardware Gate smoke test entries added to Phase 5 SMOKE-TEST.md

### Wave 0 Gaps
Phase 3 follows the established v1.3 "no Jest, no new deps" verification pattern. **Wave 0 setup needed:**
- [ ] Create `.planning/phases/03-friend-went-free-loop/03-SMOKE-TEST.md` listing the manual Hardware Gate steps (FREE-01, FREE-09, EXPIRY-01 runtime checks) and add it to Phase 5's input list per the ROADMAP planner rule
- [ ] Create a `supabase/migrations/0010_*.sql` verification SQL snippet file (e.g. `.planning/phases/03-friend-went-free-loop/03-verify.sql`) with the 6-ish post-push attestation SELECTs (pattern: 02-02-SUMMARY)
- [ ] Decide (plan-phase) whether to ship a small `scripts/verify-rate-limits.sql` containing the SQL-assertion tests for FREE-02..07 that the executor runs post-migration as acceptance

No test framework install needed. No new dependencies. No fixture library.

## Sources

### Primary (HIGH confidence)
- `supabase/functions/notify-plan-invite/index.ts` — verified reference implementation for fan-out pattern
- `supabase/migrations/0001_init.sql` — verified profiles/friendships/is_friend_of/statuses schema
- `supabase/migrations/0008_push_tokens_v1_3.sql` — verified `invalidated_at` pattern
- `supabase/migrations/0009_status_liveness_v1_3.sql` — verified Phase 2 schema + SECURITY DEFINER trigger pattern
- `src/lib/notifications-init.ts` — verified module-scope category registration structure
- `src/stores/useStatusStore.ts` — verified Zustand store shape
- `package.json` — verified installed dependency versions
- `.planning/phases/01-push-infrastructure-dm-entry-point/01-CONTEXT.md` — D-08, D-18, D-20, D-22
- `.planning/phases/02-status-liveness-ttl/02-CONTEXT.md` — OVR-01, OVR-02, OVR-05, OVR-08, OVR-09, OVR-10
- `.planning/phases/02-status-liveness-ttl/02-02-SUMMARY.md` — live-schema attestation pattern
- [Notifications - Expo Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/) — trigger shape, category linking, cancel APIs
- [Database Webhooks | Supabase Docs](https://supabase.com/docs/guides/database/webhooks) — payload shape, pg_net foundation

### Secondary (MEDIUM confidence)
- [Postgres AT TIME ZONE Explained | EDB](https://www.enterprisedb.com/postgres-tutorials/postgres-time-zone-explained) — IANA zone name semantics
- [PostgreSQL Date/Time Types Docs](https://www.postgresql.org/docs/current/datatype-datetime.html) — tzdata behavior
- [Securing Edge Functions | Supabase Docs](https://supabase.com/docs/guides/functions/auth) — JWT in Authorization header
- [How to authenticate webhooks? (Supabase Discussion #14115)](https://github.com/orgs/supabase/discussions/14115) — service role vs signature
- [Hermes Intl Support in React Native on iOS (iROOMit)](https://medium.com/@iROOMitEng/hermes-intl-support-in-react-native-on-ios-134b487bcce7) — Hermes iOS Intl caveats

### Tertiary (LOW confidence — flagged for validation)
- [Intl.DateTimeFormat iOS UTC bug (Hermes #1172)](https://github.com/facebook/hermes/issues/1172) — status of fix unclear for RN 0.83
- [Authorization headers deleted from DB webhooks on update (#38848)](https://github.com/supabase/supabase/issues/38848) — bug status as of 2025; plan-phase should check if resolved before committing to Dashboard authoring
- [callstack/timezone-hermes-fix](https://github.com/callstack/timezone-hermes-fix) — referenced as evidence the problem exists; NOT installing (zero-deps rule)
- [supabase_functions.http_request missing (Discussion #22668)](https://github.com/orgs/supabase/discussions/22668) — shim may or may not be present

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every library already installed and verified in package.json
- Architecture patterns: **HIGH** — outbox + webhook pattern is verified in Phase 2, notification pattern verified in current notifications-init.ts
- Code examples: **HIGH** for SQL and Edge Function shape (copied from verified in-repo code), **MEDIUM** for the expiry scheduler and response listener (composed from official SDK 55 docs)
- Pitfalls: **HIGH** for the SQL-level pitfalls (Phase 2 OVR-09 established the pattern), **MEDIUM-LOW** for Hermes iOS Intl reliability (known issue, mitigation is conservative)
- Environment availability: **MEDIUM** — `pg_net` availability unverified; plan-phase blocks on verifying this
- Validation architecture: **HIGH** — mirrors Phase 2's verification approach exactly

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days for stable stack; 7 days for the Hermes iOS Intl assumption if production issues surface)
