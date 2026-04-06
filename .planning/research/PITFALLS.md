# Pitfalls Research

**Domain:** Adding push notifications, status TTL/freshness, scheduled jobs, and notification action buttons to an existing React Native + Expo (managed workflow) + Supabase app (v1.3 Liveness & Notifications milestone)
**Researched:** 2026-04-06
**Confidence:** MEDIUM — grounded in existing codebase audit (`src/hooks/usePushNotifications.ts`, PROJECT.md constraints) and documented Expo + Supabase behavior. A few free-tier limits (pg_cron availability, Expo rate limits, Edge Function quotas) are flagged LOW and must be verified in the current dashboards before being load-bearing in phase plans.

---

## Critical Pitfalls

### Pitfall 1: Stale Expo Push Tokens Never Cleaned → "Friend Went Free" Silently Fails for Returning Users

**What goes wrong:**
After a user reinstalls, restores from backup, clears app data, disables and re-enables notifications, or upgrades OS in certain paths, Expo issues a **new** `ExponentPushToken[...]`. The old row in `push_tokens` lingers. When the fan-out fires, Expo's push service responds with HTTP 200 but each ticket in `data[]` carries `{ status: 'error', details: { error: 'DeviceNotRegistered' } }`. The Edge Function logs "200 OK — sent" and moves on. The user never gets another push. No exception, no alert — core loop silently dies for that cohort.

**Why it happens:**
Expo's push API returns ticket-level errors in the response body, not as a non-2xx status. Developers wire happy-path handling, log the HTTP code, and call it done. Additionally, the current `usePushNotifications.ts` only registers the token **once, on login** — there's no re-registration on app foreground, so rotations are never detected client-side either.

**How to avoid:**
- **Parse every ticket.** After `POST /--/api/v2/push/send`, iterate `data[]`; on `status === 'error'` with `details.error === 'DeviceNotRegistered'` (or `InvalidCredentials`, `MessageTooBig`), delete the offending row from `push_tokens` by exact token value.
- **Also parse receipts.** Expo returns ticket IDs; final delivery status lives at `/--/api/v2/push/getReceipts`. Schedule a second cron-driven check 15 min after send that cleans up on `DeviceNotRegistered`.
- **Re-register on every app foreground.** In root `_layout.tsx`, wire `AppState.addEventListener('change', s => s === 'active' && registerForPushNotifications(userId))`. The upsert is idempotent and cheap; it catches rotations users never notice.
- **Unique index on `token` alone** (in addition to the current `(user_id, token)` conflict target) so a device handoff moves the row to the new user instead of leaving orphans.

**Warning signs:**
- Edge Function logs show only HTTP status codes, not ticket-level parsing.
- `push_tokens` table has multiple rows per user from the same platform.
- No `push_delivery_log` or receipt-check job exists.
- `src/hooks/usePushNotifications.ts` is called only in login flow, never on foreground.

**Phase to address:** Phase "Push Infrastructure" (initial wiring of `push_tokens` and the send path). Receipt parsing and foreground re-registration must ship in the same phase that introduces the send path — not deferred.

---

### Pitfall 2: "Friend Went Free" Fan-out Becomes a Notification Storm at Lunchtime

**What goes wrong:**
At 12:00 local time, 8 out of a user's 12 friends flip `maybe → free` within 3 minutes. The naïve trigger fires one Edge Function call per transition. Each call sends one push. User A gets 8 pushes in 3 minutes, then another batch at 17:30 after work. By the end of day 2 they either mute Campfire system-wide (iOS: Settings → Notifications → Campfire → Off) or uninstall. This is exactly the cohort the feature was supposed to activate.

**Why it happens:**
Row-level triggers have no window awareness. Stateless Edge Functions can't "batch." The engineer building the feature tests with one friend flipping and everything feels fine. The storm only materializes at scale with a real social group mid-day.

**How to avoid:**
- **Coalesce on the recipient side.** Don't push "Alex is Free." Push "3 friends are free right now — tap to see" when 2+ friends flip within a 10-minute window for a given recipient.
- **Add a `notification_debounce(user_id, kind, last_sent_at)` table.** The send function skips `kind='friend_free'` if `last_sent_at > now() - interval '10 minutes'` for that recipient.
- **Hard daily cap:** max 3 `friend_free` pushes per user per day. Anything over becomes an in-app badge only.
- **Only trigger on the transition.** Trigger `WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'free')`. Re-setting Free → Free must not fire.
- **Never self-notify.** Edge Function must filter `recipient_id <> source_user_id` as the last line before sending.
- **Per-user notification_preferences row** with a single boolean at first, so you can ship a kill switch when storms happen in week 1 without a new migration.

**Warning signs:**
- Trigger definition has no `IS DISTINCT FROM` guard.
- No debounce table in the migration.
- Edge Function sends one push per row in a loop with no coalescing.
- Manual test involved only one friend flipping.

**Phase to address:** Phase "Friend went Free loop." Debounce, daily cap, and coalescing must be in the phase plan — not "fast follow."

---

### Pitfall 3: Status TTL Race — Client Thinks Expired, Server Doesn't

**What goes wrong:**
User sets Free at 10:00 with `expires_at = 12:00`. At 12:01:
- Client's local timer flips the Home card to "expired — tap to refresh"
- Server row still has `status = 'free'` because nothing has run to update it
- Another friend's Home screen (which re-queries the raw row) still shows the user as Free
- A plan invite fires at 12:05 — user is confused ("I said 2 hours, it's been 2 hours")

**Why it happens:**
TTL is *data*, not an *event*. Nothing automatically flips rows when wall-clock passes `expires_at` unless you build it. Client timers don't survive app backgrounding. Server cron runs on its own schedule. Clients and servers drift into different beliefs about the same row.

**How to avoid:**
- **`expires_at` is the source of truth, not `status`.** All reads go through a view: `effective_status = CASE WHEN expires_at IS NOT NULL AND expires_at < now() THEN 'maybe' ELSE status END`. Client and server both query the view. No flip needed for correctness; expiry is computed on read.
- **Client re-fetches on foreground.** Already cheap if queries are via the view.
- **If you also want Realtime to broadcast the flip**, add a pg_cron job every 5 min that bulk-UPDATEs expired rows to trigger Realtime `postgres_changes` (see Pitfall 12 for the publication gotcha). But correctness does not depend on the cron job running — the view handles it.
- **Never rely on `setTimeout` for TTL.** Android kills JS in background; iOS freezes JS after ~30s in background. Timers will lie.

**Warning signs:**
- Any query that reads `user_status.status` directly instead of from an `effective_status` view.
- A design doc that says "the cron job flips expired rows" without a view fallback.
- `setTimeout` or `setInterval` driving status display in a React component.

**Phase to address:** Phase "Status liveness / TTL." The view-based approach should be the default design; cron is a secondary optimization, not the foundation.

---

### Pitfall 4: Daily Reset Clobbers Actively-Set Status

**What goes wrong:**
User sets Free at 23:55 local ("going out tonight") with `expires_at = 02:55 tomorrow`. Midnight hits. The daily reset job runs and sets every user to Maybe. User is now Maybe at 00:05 even though they explicitly asked for 3 hours.

**Why it happens:**
The reset job is written as "every midnight, everyone goes Maybe" without checking whether the user has an active `expires_at` spanning the boundary. Also commonly the job runs in UTC, not in the user's timezone, so "midnight" hits the wrong hour entirely.

**How to avoid:**
- **Reset respects active expires_at:**
  ```sql
  UPDATE user_status
  SET status = 'maybe', expires_at = NULL
  WHERE expires_at IS NULL OR expires_at < now();
  ```
  Rows with future `expires_at` are left alone.
- **Reset runs in the user's timezone, not UTC.** Store `timezone` as an IANA string (`America/Los_Angeles`) on `profiles`. Either schedule the cron hourly and filter by `now() AT TIME ZONE profiles.timezone`, or let clients self-reset on first foreground of a new local day.
- **Store `last_set_by_user_at`** and skip reset if the user explicitly set it within the last 6 hours.

**Warning signs:**
- Reset job is one global `UPDATE user_status SET status='maybe'` with no WHERE clause.
- No `timezone` column on `profiles`.
- Cron expression is `0 0 * * *` (UTC midnight) with no timezone adjustment.

**Phase to address:** Phase "Status liveness / TTL." Add `timezone` column and `last_set_by_user_at` in the same migration that introduces TTL.

---

### Pitfall 5: pg_cron on Supabase Free Tier — May Not Run When You Need It

**What goes wrong:**
Phase plan assumes `cron.schedule('reset', '0 * * * *', ...)` just works. On Supabase free tier, projects auto-pause after ~7 days of inactivity. Paused projects run no background jobs — pg_cron does not fire. A developer tests in dev (active), ships to a staging project that goes idle overnight, the reset job stops running, and every user's status rots. No alert fires because no one is watching.

**Why it happens:**
Free-tier auto-pause is invisible in local dev. pg_cron availability on the free tier has varied over time. Even when enabled, it requires explicit extension enablement in the dashboard.

**Confidence:** LOW on exact current free-tier rules — Supabase pricing changes quarterly. Verify in the dashboard before the phase starts.

**How to avoid:**
- **Verify in the current Supabase dashboard** (not training data, not old docs): is `pg_cron` available on your project's current tier? Can it be enabled without upgrading? Does the project auto-pause?
- **Add a cron heartbeat.** `cron.schedule('heartbeat', '* * * * *', $$ INSERT INTO cron_heartbeat VALUES (now()) $$)`. Monitor `max(ts) < now() - interval '5 minutes'` and alert. This makes silent failure loud.
- **Fallback architecture:** if cron is unreliable, drive reset and morning prompts from an external GitHub Actions workflow on `schedule:` — free, always-on, visible in the repo, and a change is just a PR.
- **Document the "project pause" failure mode** explicitly in the phase plan so future developers know.

**Warning signs:**
- Phase plan says "pg_cron will do X" without a heartbeat or fallback.
- No dashboard verification recorded before implementation started.
- `cron_heartbeat` table does not exist.

**Phase to address:** Phase "Status liveness / TTL" (first phase that needs cron). Pick architecture (pg_cron vs external) based on verified current-tier behavior, not assumption.

---

### Pitfall 6: Public "set-status from push" Edge Function = Spoof Risk

**What goes wrong:**
To make "tap Free from the morning prompt" work without opening the app, the phase wires a notification action button to POST to an Edge Function `set-status?user=abc&status=free`. That URL is readable in the push payload on jailbroken devices, in any proxy, and in CI logs that capture response bodies. An attacker — or a curious user — scripts it to flip any user's status on demand. Worse: because the Edge Function uses `service_role`, RLS provides zero protection.

**Why it happens:**
Edge Functions default to public. Developers forget that `service_role` bypasses RLS. The "it works on my device" test doesn't reveal that the URL is freely callable from cURL.

**How to avoid:**
- **HMAC-sign the payload.** When sending the push, generate a short-lived (e.g., 12h) HMAC: `hmac(user_id || status || fires_at || valid_until, SUPABASE_SERVICE_SECRET)`. Include it in the `data` field of the Expo push. Edge Function verifies HMAC and the `valid_until` timestamp before writing.
- **OR: pass the user's JWT.** In the push action handler, re-read the Supabase session and attach `access_token` as an `Authorization: Bearer` header. Edge Function validates via `createClient(url, anon, { global: { headers: { Authorization: header } } })` and uses the user context — RLS applies.
- **Never ship a service-role Edge Function that mutates user-scoped data based solely on a query param.**
- **Rate-limit inside the function** by `user_id` (token-bucket in a table) as belt-and-braces against replay.

**Warning signs:**
- Edge Function signature is `POST /set-status` with just `{ user, status }` in the body.
- Function uses `service_role` key without validating a signature or JWT.
- Phase plan doesn't mention HMAC, JWT, or signed tokens.

**Phase to address:** Phase "Notification action buttons" (and any phase that introduces server-side actions from pushes). Design the auth boundary BEFORE writing the function.

---

### Pitfall 7: iOS Notification Categories Registered Too Late → Action Buttons Never Appear

**What goes wrong:**
Developer adds `Notifications.setNotificationCategoryAsync('morning-prompt', [...actions])` when building the action-button feature, placing the call inside the morning-prompt scheduling code or a settings screen. On iOS the Free/Busy/Maybe action buttons never appear when the user pulls down the lock-screen notification. Logs show the category is registered. Everything looks right. It just doesn't work.

**Why it happens:**
On iOS, notification categories must be registered **before** the first call that triggers APNs registration (`requestPermissionsAsync`, `getExpoPushTokenAsync`). The system registers categories alongside the token. Calling it later works for *some* scheduled local notifications but not reliably for remote pushes — and the failure mode is silent.

Additionally: **action categories do not work in Expo Go at all**. Expo Go owns the APNs registration. You need an EAS development build or production build.

**How to avoid:**
- **Register categories at the top of `registerForPushNotifications`**, before `requestPermissionsAsync`. Update `src/hooks/usePushNotifications.ts` so categories are always registered before any permission/token call.
- **Also register categories at module init** in the root `_layout.tsx` (outside any component body, at file scope). Idempotent; ensures fresh registration after OTA updates that change category definitions.
- **Test on an EAS development build**, not Expo Go. The phase plan must include "build an EAS dev build" as its **first** deliverable, not its last.

**Warning signs:**
- `setNotificationCategoryAsync` is called inside `useEffect` in a feature screen.
- QA was done in Expo Go, not an EAS build.
- `usePushNotifications.ts` does not contain any category registration.

**Phase to address:** Phase "Notification action buttons." Also bumps into phase "Push Infrastructure" because an EAS dev build becomes a hard dependency for real testing.

---

### Pitfall 8: Android Channel Mis-config → Notifications Silent, No Heads-up, Invisible

**What goes wrong:**
On Android 8+ (API 26+), every notification must be posted to a named channel. If you don't create one, Expo uses a default channel at `IMPORTANCE_LOW` — no sound, no heads-up, no lock-screen banner. The push "arrives" (in the shade) but the user sees nothing. For "friend went Free," which depends on being timely and visible, this is feature death.

The current `usePushNotifications.ts` does create a `default` channel at `MAX` — which is correct for plan invites — but v1.3 adds three more notification kinds (friend-free, morning-prompt, system). All going through one channel means the user cannot mute "friend-free storm" without muting critical plan invites, and once Android creates a channel, its importance cannot be changed in code — only the user can raise it.

**Why it happens:**
Android's channel system is stricter than iOS. Channel importance is locked after creation; renaming doesn't reset it. Developers think of channels as "labels" rather than permanent config rows owned by the OS.

**How to avoid:**
- **Create separate channels per notification kind before the first push of each kind:**
  - `plan-invites` (MAX, public visibility, MAX vibration) — urgent
  - `friend-free` (DEFAULT, public, default vibration) — coalesced, not urgent
  - `morning-prompt` (DEFAULT, public, default vibration) — once a day
  - `system` (LOW, private) — token errors, debug
  Users can then mute `friend-free` in system settings without losing plan invites.
- **Set `channelId` in the push payload** when sending. Expo's push service honors `channelId` on Android; missing → fallback to `default`.
- **Explicitly set `lockscreenVisibility: PUBLIC`**, `vibrationPattern`, and `lightColor` per channel. Defaults vary across OEMs (Xiaomi, Samsung) in surprising ways.
- **To reset a mis-configured channel in production**, you cannot edit importance — you must create a new channel ID (`plan-invites-v2`) and delete the old one. Plan for this by versioning channel IDs from day one (or accept the reset cost later).

**Warning signs:**
- One channel used for multiple notification kinds.
- `importance` set to `DEFAULT` or left unset for plan invites (should be MAX).
- No `channelId` sent in the Expo push payload.
- `lockscreenVisibility` not set.

**Phase to address:** Phase "Push Infrastructure." Update `src/hooks/usePushNotifications.ts` to create all four channels at registration time.

---

### Pitfall 9: Postgres Trigger Calls Edge Function Synchronously → Writes Become Slow

**What goes wrong:**
Setting your own status takes 800ms instead of the usual 80ms. The app feels laggy. The Home screen toggle has visible delay between tap and confirmation. Users complain. Profiler shows the `UPDATE user_status` is blocked on an HTTP call from the trigger function.

**Why it happens:**
A developer wires the "friend went free" trigger naïvely, calling `net.http_post(...)` but wrapping it in a CTE that waits for a response, or using `supabase_functions.http_request` in a blocking way. The trigger runs inside the UPDATE transaction, so any HTTP latency in the trigger = user-visible write latency.

**How to avoid:**
- **pg_net is async by design — use it async.** `SELECT net.http_post(...)` returns a request ID immediately; the actual HTTP call happens in the background worker. Do not wait on `net._http_response`.
- **Better: outbox pattern.** Trigger writes a row to `notification_outbox(id, kind, payload, created_at, sent_at)`. A pg_cron job runs every 30 seconds, reads unsent rows, and calls the Edge Function. This completely decouples the user's write path from push delivery latency, gives you retry/dedupe for free, and makes failures visible in a table (see Pitfall 10).
- **Never let the user's UPDATE wait on Expo's push service.** Design invariant.

**Warning signs:**
- Trigger function body contains `SELECT * FROM net._http_response WHERE ...` (waiting for a response).
- Trigger function uses `PERFORM` on a synchronous HTTP wrapper.
- Status update latency in the app is noticeably higher after v1.3 trigger is added.

**Phase to address:** Phase "Friend went Free loop." Default to the outbox pattern; do not wire triggers directly to Edge Functions.

---

### Pitfall 10: pg_net HTTP Failures Swallowed Silently

**What goes wrong:**
"Friend went Free" worked Monday. On Tuesday the Edge Function started returning 500 because of a typo in an environment variable. Pushes stop going out. No error logs, no alert, no user complaint for three days because it's a low-frequency signal. By the time someone notices, a week of engagement is lost.

**Why it happens:**
`net.http_post` returns a request ID; the response status lives in `net._http_response`. Nothing reads that table unless you build it. `supabase_functions` log panels show function invocations, but if the function is erroring on entry (wrong env var, bad secret), the logs get ignored.

**How to avoid:**
- **Outbox pattern (per Pitfall 9)** makes this explicit: unsent rows stay unsent and accumulate. A dashboard query `SELECT count(*) FROM notification_outbox WHERE sent_at IS NULL AND created_at < now() - interval '5 minutes'` becomes an obvious alert trigger.
- **If using pg_net directly**, run a scheduled job that reads `net._http_response` for failures in the last hour and inserts them into an `alerts` table or posts to a webhook.
- **Sanity monitor:** have an internal test user who should receive a push every day. Alert if they don't.

**Warning signs:**
- No query against `net._http_response` anywhere in the codebase.
- No alerting infrastructure around the notification pipeline.
- Edge Function logs are the only observability.

**Phase to address:** Phase "Friend went Free loop." Alerting is part of the feature, not optional.

---

### Pitfall 11: Recursive Trigger Loop — Edge Function Updates DB, Fires Trigger Again

**What goes wrong:**
Trigger on `user_status UPDATE` fires Edge Function. Edge Function, after sending the push, updates `user_status` to set `last_notified_at = now()`. That UPDATE re-fires the trigger. Infinite loop. Free-tier CPU budget eaten in 15 minutes. Supabase auto-throttles. Everything breaks.

**Why it happens:**
The trigger fires on any update to the row, not just on status-column changes. Developers forget that triggers are recursive by default.

**How to avoid:**
- **Trigger filters on the column that matters:** `WHEN (OLD.status IS DISTINCT FROM NEW.status)`. Writing only `last_notified_at` now doesn't re-fire the trigger.
- **Or: put auxiliary metadata in a separate table** (`user_status_meta`) with no trigger.
- **Belt and braces:** `IF pg_trigger_depth() > 0 THEN RETURN NEW; END IF;` in the trigger function body.

**Warning signs:**
- Trigger has no `WHEN` guard.
- Edge Function writes back to `user_status` for any reason.
- No recursion depth check.

**Phase to address:** Phase "Friend went Free loop." Include `IS DISTINCT FROM` guard in the initial trigger definition.

---

### Pitfall 12: Realtime Doesn't Broadcast Server-Side Expiry Updates

**What goes wrong:**
A pg_cron job runs a bulk `UPDATE user_status SET status = 'maybe' WHERE expires_at < now()`. The UPDATE succeeds — 12 rows affected. Users watching their Home screen don't see anything change. Stale "Free" cards remain until pull-to-refresh. The phase feels broken.

**Why it happens:**
Supabase Realtime only broadcasts changes for tables explicitly added to the `supabase_realtime` publication via `ALTER PUBLICATION supabase_realtime ADD TABLE user_status;`. Without that line, no `postgres_changes` event fires. Also, the listening client's RLS policies must permit `SELECT` on the updated row, or the event is silently filtered on the server side.

**Confidence:** MEDIUM. Exact behavior depends on the Supabase Realtime version and whether `REPLICA IDENTITY FULL` is set on the table.

**How to avoid:**
- **Verify the table is in the publication**: `SELECT * FROM pg_publication_tables WHERE tablename = 'user_status';` should return a row.
- **`ALTER TABLE user_status REPLICA IDENTITY FULL;`** so old values are included in the change event (required for some filter patterns).
- **Test with two devices**: device A watches friend, device B's expiry elapses, device A should see the flip within 2-3 seconds.
- **Or: prefer the view-based approach** (Pitfall 3) that doesn't require any UPDATE at all. Client re-renders when it re-queries on focus/interval. Realtime broadcasting of expiries becomes a nice-to-have, not a requirement.

**Warning signs:**
- Migration adds `user_status` without `ALTER PUBLICATION ... ADD TABLE`.
- No two-device test in the phase plan.
- Design relies exclusively on server-side UPDATE for correctness (no view fallback).

**Phase to address:** Phase "Status liveness / TTL." Include publication addition in the migration; include two-device test in the phase plan's test section.

---

### Pitfall 13: Permission Asked Cold on Sign-up → Blanket Denial, Cannot Re-ask on iOS

**What goes wrong:**
`registerForPushNotifications` is called inside the sign-up completion flow. User sees the iOS permission modal before they understand what Campfire does. They tap "Don't Allow" reflexively. On iOS, the dialog cannot be shown again programmatically. The user is now permanently unreachable by push until they manually navigate Settings → Notifications → Campfire → Allow.

**Why it happens:**
The temptation is to register push early so the token exists when it's needed. But the cost is the permission-denied state, which on iOS is terminal.

**How to avoid:**
- **Pre-prompt with an in-app screen** explaining "We'll ping you when a friend's free so you can jump in. Tap Enable to let us." The native OS modal only fires after the user taps Enable.
- **Defer until first meaningful action.** Ask after the user (a) sets their own Free status for the first time, or (b) adds their first friend — both are moments where push becomes obviously useful.
- **Handle denied state gracefully.** Detect `status === 'denied'`; show a persistent in-app banner: "Turn on notifications in Settings →" that calls `Linking.openSettings()`.
- **Consider iOS provisional authorization** (`allowProvisional: true`). Pushes arrive silently in Notification Center without a prompt. If the user engages with one, promote to full authorization.

**Warning signs:**
- `registerForPushNotifications` called in the sign-up completion callback.
- No in-app pre-prompt screen.
- No `denied`-state UI.

**Phase to address:** Phase "Push Infrastructure." Pre-prompt is part of the feature, not a later optimization.

---

## Moderate Pitfalls

### Pitfall 14: Expo Go vs EAS Dev Build — "It Works in Expo Go" Is a Trap

**What goes wrong:** Developer tests push, categories, action buttons in Expo Go — they work (or half-work). Ships to a TestFlight build and categories disappear, deep links break, or token delivery silently fails.

**Why:** Expo Go has its own APNs/FCM registration. Push tokens issued to Expo Go are not valid for a standalone build and vice versa. Action categories and some channel features only work on EAS builds.

**How to avoid:**
- **Build an EAS development build as the FIRST deliverable of the Push Infrastructure phase.** Do not defer.
- Add a test matrix to every push-related phase plan: "verified on Expo Go + verified on EAS dev build."
- **PROJECT.md already notes this** ("Push notifications require EAS development build for remote push on Android") — make it a checklist item per phase, not a footnote.

**Phase to address:** Phase "Push Infrastructure" as prerequisite for every subsequent notification phase.

### Pitfall 15: Timezone Bugs on Morning Prompt

**What goes wrong:** Everyone on Earth gets the morning prompt at 09:00 UTC — which is 01:00 in LA and 18:00 in Tokyo.

**Why:** Server cron runs in UTC. "9 AM" is interpreted server-side.

**How to avoid:**
- **Store `timezone` on profile as IANA string** (`America/Los_Angeles`, not `-08:00` — offsets break on DST).
- **Schedule the prompt on-device**, not via server, using `Notifications.scheduleNotificationAsync({ trigger: { hour: 9, minute: 0, repeats: true, channelId: 'morning-prompt' } })`. Each phone fires at its own 9 AM. Simpler, correct, zero server involvement for the prompt itself.
- **If server-driven is required** (e.g., for users who haven't opened the app today), run cron every 15 minutes and select users where `now() AT TIME ZONE profile.timezone BETWEEN '08:55' AND '09:05'`.

**Phase to address:** Phase "Morning status prompt." On-device scheduling is the default; server-driven is a later optimization if needed.

### Pitfall 16: Morning Prompt Action Tapped 11 Hours Late

**What goes wrong:** Push fires at 09:00. User ignores it, it sits at the top of their lock screen all day. At 20:00 they finally tap "Free" from the still-visible notification. App sets them Free at 20:00 with a 12-hour expiry. They now appear Free until 08:00 tomorrow. Wrong.

**Why:** Action handler doesn't check payload freshness.

**How to avoid:**
- **Embed `fires_at` and `valid_until` in the push payload.** Action handler checks `now() < valid_until`; if stale, open the app instead of silently writing.
- **Dismiss stale pushes proactively.** When scheduling tomorrow's prompt, call `Notifications.dismissAllNotificationsAsync()` for category `morning-prompt`.
- **Short default Free window from the prompt.** 2 hours, not 12. If the user is free longer, they can re-set.
- **This pairs with Pitfall 6** (HMAC payload) — the same signed payload carries `valid_until`.

**Phase to address:** Phase "Notification action buttons."

### Pitfall 17: Current Hook Registers Once at Login, Never Re-registers

**What goes wrong:** Users whose tokens rotate (OS update, reinstall, backup restore, permission toggle) lose push coverage silently. Current `src/hooks/usePushNotifications.ts` is only called from login flows.

**Why:** No foreground hook. No AppState listener. No re-registration.

**How to avoid:**
- In root `_layout.tsx`, add:
  ```tsx
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications(user.id);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') registerForPushNotifications(user.id);
    });
    return () => sub.remove();
  }, [user?.id]);
  ```
- The upsert is idempotent and cheap.
- Also re-register after the user toggles notifications back on in Profile settings.

**Phase to address:** Phase "Push Infrastructure."

### Pitfall 18: `status_history` Grows Unboundedly

**What goes wrong:** After 3 months with 100 pilot users flipping status 10× per day, `status_history` has >100k rows. At 1000 users, millions. Free-tier 500 MB DB budget starts filling with history nobody reads.

**Why:** Insert on every change with no retention.

**How to avoid:**
- **Pick a strategy in the same phase that introduces the table.**
  1. **Retention:** pg_cron nightly `DELETE FROM status_history WHERE created_at < now() - interval '30 days'`.
  2. **Transitions only:** log only when status actually changes, not every re-set.
  3. **Daily rollup:** `status_history_daily(user_id, date, free_minutes, busy_minutes)` computed nightly; raw rows GC'd after 7 days.
- **Index pruning:** index `(user_id, created_at DESC)`; drop old partitions if you go partitioned later.
- **Do not punt this to "later."** Retention is part of the feature.

**Phase to address:** Phase "Status liveness / TTL."

### Pitfall 19: Duplicate Token Rows → Duplicate Pushes to Same Device

**What goes wrong:** `push_tokens` has 2-3 rows for the same user because current upsert key is `(user_id, token)` and reinstalls produce new tokens. Fan-out selects all, sends N pushes. User gets the same notification 3 times.

**Why:** No cleanup on reinstall. No unique index on `token` alone.

**How to avoid:**
- **Unique index on `token` column alone.** A new user using the same device moves the row; old rows die via the DeviceNotRegistered cleanup (Pitfall 1).
- **Add `last_seen_at`** column and update on foreground. Nightly `DELETE FROM push_tokens WHERE last_seen_at < now() - interval '30 days'`.
- **Dedupe at send time as safety:** `SELECT DISTINCT token FROM push_tokens WHERE user_id = ANY(...)`.

**Phase to address:** Phase "Push Infrastructure."

### Pitfall 20: AsyncStorage "Notifications Off" Toggle Doesn't Stop Server Sends

**What goes wrong:** User toggles notifications off in Profile. `AsyncStorage` flag flips. Server doesn't know. Next "friend went free" fan-out sends them a push anyway because their `push_tokens` row still exists.

**Why:** Current `setNotificationsEnabled` only writes AsyncStorage; it does not delete the token server-side.

**How to avoid:**
- **When disabling: delete the token row server-side.**
  ```ts
  export async function setNotificationsEnabled(enabled: boolean, userId: string) {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      await supabase.from('push_tokens').delete().eq('user_id', userId).eq('platform', Platform.OS);
    } else {
      await registerForPushNotifications(userId);
    }
  }
  ```
- Server-side truth is "do I have a token row?" — not "does the client say yes?"

**Phase to address:** Phase "Push Infrastructure." This is a modification to the existing hook.

### Pitfall 21: Notification Handler Not Set at Module Scope

**What goes wrong:** First push received while the app is open doesn't show a banner. Subsequent pushes work fine.

**Why:** `Notifications.setNotificationHandler({...})` was called inside a `useEffect`. The first push races the effect. Handler isn't registered yet when the push arrives.

**How to avoid:**
- Call `Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) })` at **module scope** (file top, outside any component) in the root `_layout.tsx`.
- Never inside `useEffect` or a screen component.

**Phase to address:** Phase "Push Infrastructure."

### Pitfall 22: Deep Link from Notification Tap Crashes on Cold Start

**What goes wrong:** User taps a "friend went free" push while the app is closed. App opens to white screen. Restart → works.

**Why:** Deep link handler tries to navigate to `/friends/[id]` before the auth session is hydrated and the router is mounted.

**How to avoid:**
- In root `_layout.tsx`, check `Notifications.getLastNotificationResponseAsync()` **after** auth hydration completes, not before.
- Guard the navigation on `router` readiness and `user` being non-null.
- Include "cold-start deep link test" in the phase's QA checklist.

**Phase to address:** Phase "Push Infrastructure" (handler wiring) and any phase adding a new notification type with a deep link.

### Pitfall 23: Edge Function Cold Starts Add 2-5s to Delivery

**What goes wrong:** First push of the day takes 3-5 seconds to arrive after the triggering status change. Subsequent ones are instant.

**Why:** Supabase Edge Functions cold-start after idle. Unavoidable on free tier.

**How to avoid:**
- **Accept it.** 3-5s latency is invisible for social signals. Don't over-engineer.
- **If needed:** a cron `* * * * *` ping hitting the function with `{"ping": true}` keeps it warm. Trivial invocation cost.
- **Outbox pattern** already absorbs cold-start latency transparently.

**Phase to address:** Phase "Friend went Free loop." Note in the phase plan, don't fix.

### Pitfall 24: Streak Anxiety / Fear of Breaking → Users Disengage

**What goes wrong:** "Weeks together" counter on Squad Goals starts at 3. Week 4: one flaky friend doesn't log anything. Counter resets to 0. Group messaging turns passive-aggressive ("who broke our streak?"). Users disable the feature or uninstall.

**Why:** Streak mechanics from Duolingo/Snapchat create loss aversion. In a *group* streak, one person's flakiness punishes everyone. Friendship app = wrong place for shame mechanics.

**How to avoid:**
- **Reframe language.** "Weeks together" not "streak." No "you broke it" messaging. "Welcome back" when a week is missed.
- **Grace days built in.** Miss 1 week in 8 → still counts. Don't copy Snapchat.
- **Never gate features on streaks.** Purely celebratory.
- **Private to the squad.** Don't expose to outsiders.
- **Test copy with a non-engineer reader** before shipping.

**Phase to address:** Phase "Squad Goals streak." This is a copy/UX review deliverable, not just implementation.

### Pitfall 25: "Week" Definition Ambiguity for Streaks

**What goes wrong:** Squad counter says 3 weeks, then next day says 2. Timezone boundary reclassified an event.

**Why:** `date_trunc('week', created_at)` in Postgres uses Monday-Sunday in UTC. An event at 23:58 PDT Sunday = 06:58 UTC Monday = next week.

**How to avoid:**
- **Pick a rule and write it in the phase plan.** Suggested: "Weeks are Monday 00:00 → Sunday 23:59 in the squad creator's timezone."
- **Materialize a `week_key`** on insert (not on read) using the chosen rule. Never recompute.
- **Explicit timezone arithmetic.** `date_trunc('week', event_at AT TIME ZONE creator_tz)` with explicit column, not `now()`.

**Phase to address:** Phase "Squad Goals streak."

---

## Minor Pitfalls

### Pitfall 26: iOS Badge Count Sticks Forever

**Symptom:** App icon shows "4" permanently.
**Why:** Expo doesn't auto-clear badge. Server sends `badge: N` and it sticks.
**Fix:** `Notifications.setBadgeCountAsync(0)` in root `_layout.tsx` on foreground.
**Phase:** Push Infrastructure.

### Pitfall 27: Edge Function Secret Leaked via `console.log`

**Symptom:** Service role key appears in Supabase logs.
**Why:** Developer does `console.log('req', req)` where `req` contains secrets.
**Fix:** Strict logging rule — never log full request/response bodies. Code review rule: grep for `console.log(req)` in PRs.
**Phase:** Notification action buttons / any Edge Function phase.

### Pitfall 28: Expo Push Rate Limit (~600/sec, batch of 100)

**Confidence:** LOW on exact current number — verify current Expo docs.
**Symptom:** On launch day with morning prompts firing, some users don't receive them.
**Why:** Expo push service has per-account rate limits. For a 3-15-person-squad app with early adopters, not a real concern.
**Fix:** Batch sends in groups of 100 per request; sleep between batches if > 600/sec expected. Not a v1.3 concern at this scale.
**Phase:** Friend went Free loop (if scale ever approaches it).

### Pitfall 29: Edge Function Invocation Quota

**Confidence:** LOW — verify current free-tier quota in Supabase pricing.
**Symptom:** Pushes stop mid-month.
**Why:** Monthly invocation cap on free tier.
**Fix:** Outbox pattern (Pitfall 9) batches multiple notifications into one invocation, dropping count dramatically. Alert at 70% of monthly quota.
**Phase:** Friend went Free loop.

### Pitfall 30: Foreground Push Shows No Banner Because Handler Returns Wrong Shape

**Symptom:** Push arrives while app is open; nothing visible.
**Why:** Handler returns `{ shouldShowAlert: true }` (deprecated in recent Expo SDK) instead of `{ shouldShowBanner: true, shouldShowList: true }`.
**Fix:** Use the current SDK's handler shape. Verify against Expo docs at phase start — field names have changed across SDK versions.
**Phase:** Push Infrastructure. Check Expo SDK version in `package.json` before writing the handler.

### Pitfall 31: `expires_at` Stored Without Timezone

**Symptom:** Client and server disagree on expiry by hours.
**Why:** `expires_at TIMESTAMP` (no TZ) vs `TIMESTAMPTZ`. Postgres interprets naked `TIMESTAMP` as local to the server session.
**Fix:** Always `TIMESTAMPTZ` in the migration. Client sends ISO 8601 with offset; server stores UTC-normalized.
**Phase:** Status liveness / TTL.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Trigger calls Edge Function directly (no outbox) | 1 fewer migration, 1 fewer cron job | Slow writes, silent failures, hard to retry, cold-start visible to user | Only for one-off admin tasks, never for the core loop |
| One Android channel for all notification kinds | Less code | User must mute all or none; storm becomes uninstall | Never — ship 4 channels day one |
| Scheduling morning prompt via server cron | "Centralized" control | Timezone bugs, project pause breaks it, extra Edge Function invocations | Only if you genuinely need to target offline users, which you don't for a daily prompt |
| `TIMESTAMP` (no TZ) for `expires_at` | Saves typing "TZ" | Every client-server mismatch becomes a mystery bug | Never |
| Registering push token only at login | Simple | Rotation breaks silently; users stop receiving pushes with no signal | Never — add foreground re-register |
| AsyncStorage flag as the only "off" control | No server-side code | Pushes still get sent; AsyncStorage is local-only | Never — delete the token row too |
| Skipping EAS dev build, testing only in Expo Go | Faster iteration | Action buttons, channels, deep links all differ; "works in Expo Go" is meaningless for push | Never for push phases |
| Streak UX with loss aversion ("X days or you break it") | Engagement hack | Friend-level resentment, user churn, opposite of brand | Never for a friendship app |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Expo Notifications + Expo Go | Testing categories and action buttons in Expo Go | Action categories only work on EAS dev/prod builds. Build EAS dev build before push phase starts. |
| pg_cron + Supabase free tier | Assuming cron runs on paused projects | Verify current tier behavior in dashboard. Add heartbeat. Consider external GitHub Actions as fallback. |
| pg_net + trigger functions | Expecting sync response from `net.http_post` | pg_net is async. Read `net._http_response` via polling, not in the trigger. Better: outbox pattern. |
| Supabase Realtime + pg_cron bulk UPDATE | Expecting events to fire without adding table to publication | `ALTER PUBLICATION supabase_realtime ADD TABLE user_status;` in the migration. Also `REPLICA IDENTITY FULL` if filtering on old values. |
| Expo push categories + iOS | Registering categories inside a feature screen | Register at module scope in root layout, before first `requestPermissionsAsync` call. |
| Android channels + Expo SDK | Creating one `default` channel at MAX for all kinds | Create separate channels per notification kind before first push of each kind. Channel importance locks after creation. |
| Edge Function + service_role | Passing through user intent without auth | Validate HMAC or JWT; never mutate user-scoped data based solely on URL/body params. |
| `expires_at` + client timers | `setTimeout(..., ms)` to flip UI | Timers die in background. Use view-computed `effective_status` + foreground re-fetch. |
| Current `usePushNotifications.ts` + foreground | Only called at login | Add `AppState` listener in root layout; upsert is idempotent. |
| AsyncStorage toggle + server state | Treating AsyncStorage as the switch | Deleting token row is the real switch. |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Trigger blocks UPDATE on HTTP call | Status-set latency jumps from 80ms → 800ms | Outbox pattern; pg_net async | Immediately visible on the toggle |
| Fan-out sends per-friend instead of coalesced | User gets 8 pushes in 3 min at lunch | Debounce table + coalescing | At 5+ active friends per user — immediately |
| status_history unbounded | DB size grows linearly with DAU × days | 30-day retention or transitions-only | Free-tier 500 MB cap in ~3-6 months at real scale |
| Duplicate token rows | Same device receives N copies of each push | Unique index on `token`; DeviceNotRegistered cleanup | After first reinstall by any user |
| Recursive trigger loop | CPU pegged, project throttled | `IS DISTINCT FROM` WHEN guard; `pg_trigger_depth()` check | Within minutes of first deploy if loop exists |
| Cold-start Edge Function | First push of day delayed 3-5s | Accept; optional warmer cron | Never materially; ignore |
| Client `setInterval` for TTL | Battery drain, wrong UI on background | View-based effective status + foreground refetch | When users background the app for >30s |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Permission asked cold on sign-up | Blanket denial, iOS cannot re-ask | Pre-prompt screen before native modal; defer ask to first meaningful moment |
| No "denied" state handling | Users who said no stay unreachable forever with no recovery path | Persistent in-app banner → `Linking.openSettings()` |
| Notification storm at lunchtime | Mass mute, uninstall | Coalesce "N friends are free" + debounce + daily cap |
| Self-notifications | "Alex is Free!" on Alex's phone | Filter `recipient_id <> source_user_id` at fan-out |
| Streak shame mechanics | Group resentment, disengagement | "Weeks together" framing, grace days, never gate features |
| Morning prompt at UTC midnight everywhere | Tokyo users get it at 18:00, LA at 01:00 | On-device local schedule with `trigger: { hour: 9 }` |
| Stale action on morning prompt tapped 11h later | User accidentally appears Free overnight | Embed `valid_until`; dismiss prior prompt when scheduling new one |
| "Notifications off" toggle doesn't stop pushes | User toggles off, still gets pushes for a day | Delete push_tokens row server-side on disable |
| iOS badge stuck at "4" | Users associate app with unread guilt | `setBadgeCountAsync(0)` on foreground |
| Add Friend FAB visible during no-context screens | Confusing placement | Out of scope for v1.3 (v1.2 concern) |

---

## "Looks Done But Isn't" Checklist

Items that pass a smoke test but silently fail later:

- [ ] **Receipt parsing:** send function iterates `data[]` and cleans `DeviceNotRegistered` tokens — not just checks HTTP status.
- [ ] **Foreground re-registration:** `AppState` listener in root `_layout.tsx` re-calls `registerForPushNotifications` on `active`.
- [ ] **Four Android channels exist:** `plan-invites` (MAX), `friend-free` (DEFAULT), `morning-prompt` (DEFAULT), `system` (LOW).
- [ ] **iOS categories registered at module scope**, not inside a component effect.
- [ ] **Trigger has `WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'free')`** guard, not an unconditional firing.
- [ ] **Debounce table exists** with at least `last_sent_at` check for `friend_free` kind.
- [ ] **Daily cap enforced** (e.g., max 3 friend-free pushes per recipient per day).
- [ ] **Self-filter:** fan-out excludes the source user.
- [ ] **`expires_at` is `TIMESTAMPTZ`**, not `TIMESTAMP`.
- [ ] **Reads go through `effective_status` view**, not `user_status.status` directly.
- [ ] **Daily reset respects future `expires_at`** (not a blanket UPDATE).
- [ ] **`timezone` column on profiles** is IANA string, not offset.
- [ ] **`user_status` in `supabase_realtime` publication.**
- [ ] **`status_history` retention policy** is in the migration (not a TODO).
- [ ] **`push_tokens` has unique index on `token`** alone, plus `last_seen_at`.
- [ ] **`notification_outbox` table exists** — trigger writes to it, not directly to `net.http_post`.
- [ ] **`cron_heartbeat` table exists** and is monitored.
- [ ] **Edge Function for set-status verifies HMAC or JWT** — not just reads query params.
- [ ] **Morning prompt scheduled on-device** via `scheduleNotificationAsync`, not server cron.
- [ ] **Push payload for morning prompt includes `valid_until`**; action handler checks it.
- [ ] **AsyncStorage "off" toggle also deletes the server-side token row.**
- [ ] **iOS badge cleared on foreground** via `setBadgeCountAsync(0)`.
- [ ] **Cold-start deep link handling:** `getLastNotificationResponseAsync` is read after auth hydration.
- [ ] **EAS dev build produced and tested** — push features verified on it, not only Expo Go.
- [ ] **Playwright / manual test matrix** includes: iOS EAS build, Android EAS build, Expo Go (for non-push screens only).
- [ ] **Streak copy reviewed by a non-engineer** — no loss-aversion language.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale Expo tokens never cleaned | LOW | Add receipt-parsing to send function; one-shot cleanup query against historical `push_tokens`. |
| Notification storm already shipped | MEDIUM | Deploy debounce table + filter immediately (hotfix). In-app kill-switch via `notification_preferences` row. |
| TTL race / wrong client-server state | LOW | Deploy `effective_status` view; switch reads to view in one commit; no data migration needed. |
| Daily reset clobbered active statuses | LOW | Fix reset SQL; historical data can't be un-reset but it's low impact. |
| pg_cron silently stopped (project paused) | LOW | Unpause project; add heartbeat monitor; consider GitHub Actions fallback. |
| Public set-status Edge Function exploited | HIGH | Rotate `SERVICE_ROLE_KEY`, disable function, redeploy with HMAC/JWT check. Audit `status_history` for suspicious writes. |
| iOS action buttons never appeared | MEDIUM | Move category registration to module scope, issue EAS OTA update if categories are the only change, else new build. |
| Android channel mis-configured at LOW importance | MEDIUM | Create new channel ID `*-v2`; ship update; delete old channel ID after one release. Users lose their per-channel preferences. |
| Trigger recursion pegged CPU | LOW (if caught quickly) | Add `IS DISTINCT FROM` WHEN clause; disable trigger manually until fix is deployed. |
| Duplicate token rows causing dupes | LOW | Add unique index on `token`; let constraint drop the extras (keep newest). |
| `status_history` exceeded free-tier DB | MEDIUM | Emergency `DELETE WHERE created_at < now() - interval '7 days'`; add retention job. |
| Streak feature caused user resentment | MEDIUM | Ship a "disable streak" toggle in settings; rewrite copy; consider hiding feature until v1.4 revision. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Stale Expo push tokens | Push Infrastructure | Receipt parser deployed; foreground re-registration wired |
| 2. Notification storm | Friend went Free loop | Debounce table exists; daily cap enforced; self-filter present |
| 3. TTL race | Status liveness / TTL | Reads go through `effective_status` view |
| 4. Daily reset clobber | Status liveness / TTL | Reset SQL has `WHERE expires_at IS NULL OR expires_at < now()`; tz column exists |
| 5. pg_cron on free tier | Status liveness / TTL (first phase needing cron) | Heartbeat monitor exists; dashboard verification recorded |
| 6. Public set-status function spoof | Notification action buttons | HMAC or JWT validation in function; no query-param-only writes |
| 7. iOS categories late | Notification action buttons | `setNotificationCategoryAsync` called at module scope in root layout |
| 8. Android channel mis-config | Push Infrastructure | 4 channels exist with correct importance, visibility, vibration |
| 9. Sync trigger → slow writes | Friend went Free loop | Outbox pattern deployed; no sync HTTP in trigger body |
| 10. Silent pg_net failures | Friend went Free loop | Alerting on `notification_outbox` backlog |
| 11. Recursive trigger loop | Friend went Free loop | `IS DISTINCT FROM` WHEN guard present |
| 12. Realtime doesn't broadcast expiries | Status liveness / TTL | Table in `supabase_realtime` publication; two-device test passes |
| 13. Permission asked cold | Push Infrastructure | Pre-prompt screen exists; denied-state UI exists |
| 14. Expo Go vs EAS build | Push Infrastructure (prereq) | EAS dev build produced as first deliverable |
| 15. Morning prompt tz bugs | Morning status prompt | On-device scheduling; IANA `timezone` on profile |
| 16. Stale action on old prompt | Notification action buttons | Payload has `valid_until`; handler validates |
| 17. Token registered once | Push Infrastructure | `AppState` listener in root layout |
| 18. status_history unbounded | Status liveness / TTL | Retention cron job in migration |
| 19. Duplicate token rows | Push Infrastructure | Unique index on `token` alone |
| 20. AsyncStorage-only toggle | Push Infrastructure | Disable deletes token row server-side |
| 21. Handler not at module scope | Push Infrastructure | `setNotificationHandler` at file top of `_layout.tsx` |
| 22. Cold-start deep link crash | Push Infrastructure / any deep-link phase | `getLastNotificationResponseAsync` guarded by auth ready |
| 23. Cold-start Edge Function latency | Friend went Free loop | Accepted; documented |
| 24. Streak anxiety | Squad Goals streak | Non-engineer copy review completed |
| 25. Week definition ambiguity | Squad Goals streak | `week_key` materialized on insert with documented rule |
| 26. iOS badge stuck | Push Infrastructure | `setBadgeCountAsync(0)` on foreground |
| 27. Secret leaked via console.log | Notification action buttons / any Edge Function | Logging review in PR template |
| 28. Expo rate limit | Friend went Free loop | Batching ≤100 per request; documented (not an issue at v1.3 scale) |
| 29. Edge Function quota | Friend went Free loop | Outbox batching; dashboard alert |
| 30. Handler returns wrong shape | Push Infrastructure | Handler matches current Expo SDK shape |
| 31. `expires_at` missing TZ | Status liveness / TTL | Migration uses `TIMESTAMPTZ` |

---

## Critical-Path Checklist for Plan-Phase

When plan-phase designs each v1.3 phase, verify these show up in the plan:

- [ ] **Push Infrastructure phase produces an EAS dev build as its first deliverable**, not its last.
- [ ] **Every push-sending path has receipt-parsing + token cleanup** in the same commit that adds the send.
- [ ] **Status TTL phase uses a view (`effective_status`), not a scheduled UPDATE**, as the source of truth.
- [ ] **"Friend went Free" phase uses an outbox table** with pg_cron drain, not a direct trigger→Edge-Function call.
- [ ] **Debounce + daily cap are in the initial phase plan**, not "fast follow."
- [ ] **Morning prompt is scheduled on-device**, not via server cron.
- [ ] **iOS notification categories registered at module scope** before any permission request.
- [ ] **Four Android channels (`plan-invites`, `friend-free`, `morning-prompt`, `system`) created at registration time.**
- [ ] **HMAC or JWT auth on any "set status from push" Edge Function** — never plain public endpoint.
- [ ] **pg_cron heartbeat exists** before any cron job is load-bearing.
- [ ] **IANA `timezone` column on profiles** added in the first phase that needs it.
- [ ] **`status_history` retention policy decided in the TTL phase**, not punted.
- [ ] **`expires_at` uses `TIMESTAMPTZ`**.
- [ ] **Trigger uses `IS DISTINCT FROM` guard** to avoid recursion and noise.
- [ ] **`user_status` added to `supabase_realtime` publication** in the migration.
- [ ] **AsyncStorage "off" toggle also deletes the server-side token row.**
- [ ] **Permission ask is deferred** to a meaningful moment (or pre-prompted).
- [ ] **Streak copy reviewed by a non-engineer reader** before shipping.
- [ ] **Two-device test in the plan** for Realtime and expiry broadcasting.

---

## Sources & Confidence Notes

- **Codebase audit:** `src/hooks/usePushNotifications.ts` (current push registration implementation), `.planning/PROJECT.md` (v1.3 goals and constraints). HIGH confidence on identified gaps in the existing hook (no category registration, no foreground re-register, no receipt parsing, no multi-channel, no server-side delete on disable).
- **Expo Notifications documented behavior:** HIGH on token rotation, `DeviceNotRegistered` error shape, iOS category registration timing, Android channel behavior, permission re-ask rules.
- **Supabase documented behavior:** HIGH on pg_net async semantics, Realtime publication requirements, `REPLICA IDENTITY` behavior, trigger recursion defaults. MEDIUM on Edge Function cold-start latency (workload-dependent).
- **Supabase free tier:** LOW on current rules (pg_cron availability, project auto-pause thresholds, Edge Function invocation quota). These change quarterly — **verify in the dashboard at the start of each phase that depends on them**.
- **Expo push rate limits (600/sec, 100/batch):** LOW — training-data number, verify against current Expo docs before making it load-bearing. Not a real concern at v1.3 scale regardless.
- **Android channel behavior (importance locks after creation):** HIGH — unchanged since Android 8 (API 26).
- **UX pitfalls (permission timing, streak anxiety, notification storm):** MEDIUM — well-trodden anti-patterns in social apps; not formally cited but consistent with multiple industry post-mortems.

**Items flagged LOW that MUST be verified in current docs/dashboards before building on them:**
1. pg_cron availability + auto-pause behavior on current Supabase free tier (affects Pitfall 5).
2. Exact Expo push service rate limits (affects Pitfall 28).
3. Supabase free-tier Edge Function invocation cap (affects Pitfall 29).
4. Expo Notifications SDK handler return shape for the current SDK version in `package.json` (affects Pitfall 30).

None of these change the shape of the recommended architecture; they only affect whether a built-in solution suffices or an external fallback is needed.

---
*Pitfalls research for: v1.3 Liveness & Notifications milestone (Campfire — React Native + Expo + Supabase)*
*Researched: 2026-04-06*
