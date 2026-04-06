# Technology Stack — v1.3 Liveness & Notifications

**Project:** Campfire
**Milestone:** v1.3 — Status TTL, push notifications, morning prompt, "Friend went Free" loop
**Researched:** 2026-04-06
**Scope:** ONLY additions/changes needed for v1.3. Existing stack (React Native, Expo SDK 55, Supabase, Zustand, TypeScript strict) is locked and NOT re-researched.

---

## TL;DR

**No new npm dependencies are required for v1.3.** Every client-side package needed (`expo-notifications`, `expo-device`, `expo-constants`, `@react-native-async-storage/async-storage`) is already installed at Expo SDK 55-compatible versions. The v1.3 additions are server-side: two Postgres extensions (`pg_cron`, `pg_net`) that ship with Supabase and need to be enabled via migration, plus two Supabase Edge Functions (Deno) that use the built-in `fetch` to call Expo's push service. Client-side work is configuration, not new packages: register iOS notification categories, add differentiated Android channels, and add notification listener plumbing.

---

## Already Installed — DO NOT Re-Add

Verified by reading `/Users/iulian/Develop/campfire/package.json` and `/Users/iulian/Develop/campfire/app.config.ts`:

| Package | Installed Version | Used For v1.3 | Status |
|---------|-------------------|---------------|--------|
| `expo` | `~55.0.6` | SDK baseline | Locked |
| `expo-notifications` | `~55.0.13` | Push registration, local scheduling, categories/actions, channels, listeners | Sufficient |
| `expo-device` | `~55.0.9` | `Device.isDevice` guard before requesting push token | Sufficient |
| `expo-constants` | `~55.0.7` | Reading `easConfig.projectId` for `getExpoPushTokenAsync` | Sufficient |
| `@react-native-async-storage/async-storage` | `2.2.0` | Notification toggle persistence (already in use) | Sufficient |
| `@supabase/supabase-js` | `^2.99.2` | RPC + Realtime subscriptions for status changes | Sufficient |
| `supabase` (CLI, devDep) | `^2.81.1` | SQL migrations + Edge Function scaffolding/deploy | Sufficient |

`app.config.ts` already registers `'expo-notifications'` in the `plugins` array — no plugin add needed for baseline push. Plugin options (icon, color, sounds) should be added as tuple form for v1.3, see Configuration section.

**Existing hook `src/hooks/usePushNotifications.ts` already implements:**
- Device guard via `expo-device`
- Permissions request
- Single Android channel (`default`, name "Plan invites", MAX importance)
- `getExpoPushTokenAsync` with `projectId` from `easConfig`
- Upsert into `push_tokens` table (table assumed to exist — audit required in phase 1)

Gaps the existing hook must close are in the Integration Points section below.

---

## Additions Required for v1.3

### Client-side (React Native / Expo)

**None.** Zero new npm dependencies. Everything is configuration and new code using already-installed packages.

Explicitly **not adding**:

| Package | Why Not |
|---------|---------|
| `expo-localization` | Timezone for the morning prompt is unnecessary if the prompt is scheduled as a **local** daily notification via `Notifications.scheduleNotificationAsync` — the OS fires it in device-local time automatically. If we ever move to server-scheduled prompts, `Intl.DateTimeFormat().resolvedOptions().timeZone` is available in Hermes with no package. HIGH confidence. |
| `expo-task-manager` / `expo-background-fetch` | Morning prompt is a **local** notification scheduled once with `{ hour, minute, repeats: true }`. "Friend went Free" fan-out happens entirely server-side (Postgres trigger → Edge Function → Expo push). No background JS task needed. HIGH confidence. |
| `date-fns` / `dayjs` | TTL math is trivial with native `Date`. Avoid the dep. HIGH confidence. |
| `@notifee/react-native` | Requires a config plugin + dev build; incompatible with Expo Go managed workflow. `expo-notifications` already covers categories, actions, and channels sufficient for v1.3. HIGH confidence. |

### Server-side (Supabase)

**Postgres extensions to enable (ship with Supabase — no npm install):**

| Extension | Purpose in v1.3 | How to Enable |
|-----------|-----------------|---------------|
| `pg_cron` | Nightly job to mark `current_status` rows as expired where `valid_until < now()`, and any other scheduled maintenance (e.g., streak rollups). | `create extension if not exists pg_cron with schema extensions;` in a migration. Schedule via `cron.schedule('name', '0 4 * * *', $$ ... $$)` in SQL. MEDIUM confidence on exact syntax — verify against current Supabase docs. |
| `pg_net` | Let Postgres triggers call Supabase Edge Functions over HTTP without round-tripping through a client. Used for "Friend went Free" fan-out: trigger on `current_status` → `net.http_post(...)` → Edge Function → Expo push. | `create extension if not exists pg_net with schema extensions;` in a migration. Call via `net.http_post(url, headers, body)`. MEDIUM confidence on exact signature — verify. |

Both are listed as supported Supabase extensions in training data. **Before shipping the migration, verify** that the current project plan has them enabled (or allows enabling) — safer to assume explicit `create extension` is required on a fresh project.

**Edge Functions runtime:**

| Component | Detail |
|-----------|--------|
| Runtime | Supabase Edge Functions run on **Deno Deploy** (Deno, not Node). Scaffolded by Supabase CLI — no package.json involvement. HIGH confidence. |
| Deno version | Determined by the Supabase CLI version (`^2.81.1` already in devDependencies). Do not pin Deno ourselves. MEDIUM confidence. |
| HTTP client | **Built-in `fetch`** — no library needed. Expo's push endpoint is `https://exp.host/--/api/v2/push/send` and accepts a JSON POST. HIGH confidence on endpoint. |
| Supabase client inside Edge Function | URL import: `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`. HIGH confidence. |
| Auth for privileged reads | `SUPABASE_SERVICE_ROLE_KEY` env var is auto-injected into Edge Functions. HIGH confidence. |

**Expo Push Service (training data, MEDIUM confidence — verify before shipping):**
- Endpoint: `POST https://exp.host/--/api/v2/push/send`
- Body: array of messages; each `{ to, title, body, data, channelId?, categoryIdentifier?, sound?, priority? }`
- Max 100 messages per request — fan-out function must batch
- Response returns tickets; a second call to `/api/v2/push/getReceipts` is required to detect `DeviceNotRegistered` so we can prune dead tokens
- No auth header required for unauthenticated projects; an **Expo access token is recommended** (set in Expo dashboard, stored as an Edge Function secret) — decide in phase plan

---

## Version Compatibility Check

Current Expo SDK: **55** (from `expo: ~55.0.6`). All `expo-*` packages are pinned to `~55.x`, which is correct. No mismatch detected. `expo-notifications@~55.0.13` is the SDK 55 release line. Nothing to upgrade — a bump would force a broader SDK change, out of scope.

**Confidence: HIGH** (direct read of package.json).

---

## Configuration Changes

### `app.config.ts` — plugin options to add

Currently:
```ts
plugins: ['expo-router', '@react-native-community/datetimepicker', 'expo-notifications'],
```

Recommended for v1.3 (swap the bare string for a tuple so we can pass options):
```ts
plugins: [
  'expo-router',
  '@react-native-community/datetimepicker',
  [
    'expo-notifications',
    {
      icon: './assets/images/notification-icon.png', // Android notification icon
      color: '#ff6b35',                              // Campfire orange
      // sounds: ['./assets/sounds/ping.wav'],        // only if we ship a custom sound
    },
  ],
],
```

**Rationale:** Android notification icon + color are only picked up via the config plugin (build-time). Setting them on a runtime channel does not colorize the status-bar icon. MEDIUM confidence — verify current `expo-notifications` plugin options docs for SDK 55.

### iOS notification categories (runtime, client-side)

Needed for the **morning prompt** so the user can tap "Free", "Busy", or "Maybe" directly from the notification. Register once at app start (e.g., `app/_layout.tsx` effect or `src/lib/notifications/categories.ts`):

```ts
await Notifications.setNotificationCategoryAsync('morning_prompt', [
  { identifier: 'free',  buttonTitle: 'Free',  options: { opensAppToForeground: false } },
  { identifier: 'busy',  buttonTitle: 'Busy',  options: { opensAppToForeground: false } },
  { identifier: 'maybe', buttonTitle: 'Maybe', options: { opensAppToForeground: false } },
]);
```

Schedule the daily notification with `categoryIdentifier: 'morning_prompt'` and handle the response via `Notifications.addNotificationResponseReceivedListener`, dispatching the corresponding status RPC.

**Expo Go caveat:** `setNotificationCategoryAsync` works in Expo Go on iOS (SDK 45+). `opensAppToForeground: false` handlers only run if JS can be woken; iOS background execution is limited. If unreliable in Expo Go testing, fall back to `opensAppToForeground: true` and let the app do the RPC on launch. MEDIUM confidence — test early in phase 1.

**Android:** Action buttons use the same `categoryIdentifier` field in `expo-notifications`; no separate API. HIGH confidence.

### Android notification channels (runtime, client-side)

Existing: one channel `'default'` named "Plan invites". That name becomes misleading once we have multiple notification types.

Recommended channels for v1.3:

| Channel ID | Name (user-visible) | Importance | Purpose |
|------------|---------------------|------------|---------|
| `plan_invites` | Plan invites | MAX | Someone invited you to a plan |
| `friend_free` | Friend availability | HIGH | "Alex just went Free" — noticeable but not alarming |
| `morning_prompt` | Daily status check-in | DEFAULT | The morning prompt — low disruption by design |

Create all three at app start (idempotent, safe to call every launch).

**Android channel immutability:** Once a channel is created on a device, its name/importance **cannot be changed** — only deleted and recreated, and a deleted channel lingers in system settings as "deleted." The existing `default` channel is stuck on existing installs. **Recommendation:** leave the legacy `default` channel alone, create `plan_invites` as a new channel, and migrate all new plan-invite pushes to it. Document in the phase plan. HIGH confidence on immutability.

---

## Integration Points — gaps the existing hook must close

Reading `src/hooks/usePushNotifications.ts`, v1.3 must add:

1. **Notification handler + listeners.** The hook currently only registers tokens. v1.3 needs:
   - `Notifications.setNotificationHandler({...})` to decide foreground presentation
   - `Notifications.addNotificationResponseReceivedListener(...)` to handle morning-prompt action-button taps
   - `Notifications.addNotificationReceivedListener(...)` if we want in-app badges
2. **Daily local schedule.** New helper (e.g. `src/lib/notifications/morningPrompt.ts`) wrapping `scheduleNotificationAsync` with a `DailyTriggerInput` (`{ hour, minute, repeats: true }`). Cancel + reschedule on toggle/time change.
3. **Categories registered at startup.** `setNotificationCategoryAsync('morning_prompt', ...)`.
4. **Differentiated Android channels.** See table above.
5. **Dead-token cleanup.** Server-side: when the Edge Function receives a `DeviceNotRegistered` receipt from Expo, delete the offending row from `push_tokens`. Closes the loop; belongs in the Edge Function.
6. **No timezone column needed** if the morning prompt is local-scheduled (recommended). Avoids touching `profiles`.
7. **`push_tokens` table audit.** The existing hook upserts into `push_tokens(user_id, token, platform)` with `onConflict: 'user_id,token'`. Phase 1 must verify this table + composite unique index exist, and add RLS policies if missing.

---

## Why Each Server Addition is Needed (tied to feature)

| v1.3 Feature | Server Addition Needed |
|--------------|------------------------|
| Status TTL / expired banner | `pg_cron` nightly job OR lazy check at query time. Decide in phase plan. Columns on `current_status` (`valid_until`, etc.) are schema work, not stack. |
| `status_history` | Postgres trigger on `current_status` INSERT/UPDATE. No new extension. |
| "Friend went Free" push | Postgres trigger on `current_status` UPDATE (new.state = 'free') → `pg_net.http_post` → Edge Function → read friends + `push_tokens` → batch POST to Expo push API. **Needs `pg_net` + Edge Function.** |
| Morning status prompt | Client-side `scheduleNotificationAsync` (recommended). Action-button taps call existing status RPC. **No new server infra.** |
| Plan invite push (verify + complete) | Audit the existing path. If a trigger/Edge Function does not yet exist for plan invites, create it alongside "Friend went Free" (shared fan-out Edge Function). |
| Squad Goals shared streak | Pure SQL view/materialized view over `status_history`. No new stack. |

---

## Sources & Confidence

| Claim | Source | Confidence |
|-------|--------|------------|
| `expo-notifications ~55.0.13` installed, SDK-55-aligned | Direct read of `package.json` | HIGH |
| `expo-device`, `expo-constants`, `expo-notifications` plugin already wired | Direct read of `package.json`, `app.config.ts`, `src/hooks/usePushNotifications.ts` | HIGH |
| Supabase Edge Functions run on Deno with built-in `fetch` | Training data (Supabase docs as of cutoff) | MEDIUM — verify before writing Edge Function |
| Expo push endpoint + batch limit + receipt flow | Training data (Expo Push API docs) | MEDIUM — verify before shipping fan-out |
| `pg_cron` and `pg_net` available on Supabase, enabled via `create extension` | Training data (Supabase extensions list) | MEDIUM — verify against current Supabase project plan |
| Android channel IDs immutable once created | Android docs (long-standing behavior) | HIGH |
| `setNotificationCategoryAsync` works in Expo Go on iOS, SDK 55 | Training data (expo-notifications docs) | MEDIUM — test in phase 1 |
| Daily trigger `{ hour, minute, repeats: true }` on `scheduleNotificationAsync` | Training data (expo-notifications trigger API) | MEDIUM — verify SDK 55 trigger shape (Expo has changed trigger API in past SDKs) |
| `expo-notifications` plugin options `icon`/`color`/`sounds` | Training data | MEDIUM — verify before editing `app.config.ts` |

**Verification checklist (do these in phase 1 of the milestone, before writing production code):**
- [ ] Read `https://docs.expo.dev/versions/v55.0.0/sdk/notifications/` — confirm trigger shape, category API, plugin options for SDK 55
- [ ] Read `https://docs.expo.dev/push-notifications/sending-notifications/` — confirm `/push/send` schema, batch limit, receipt flow, whether access token is required
- [ ] Read Supabase docs for `pg_cron`, `pg_net`, and Edge Functions Deno version; confirm extensions are enableable on this project
- [ ] Smoke test from Supabase SQL editor: `select net.http_post(...)` against an echo endpoint before wiring a real Edge Function
- [ ] Confirm `push_tokens` table exists with correct columns and RLS policies (the client hook assumes it)

---

## Installation Summary

**Nothing to `npm install`.** All client additions are code + configuration using already-installed packages.

**SQL migrations to author (code, not installs):**

```sql
-- 00XX_v13_extensions.sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;
```

Plus migrations for `push_tokens` (audit/create), `status_history`, TTL columns on `current_status`, triggers, and cron schedules. Those are feature work and belong in ARCHITECTURE.md / phase plans.

**Edge Functions to scaffold (via `supabase functions new`):**

- `push-fanout` — receives `{ actor_id, kind: 'friend_free' | 'plan_invite', plan_id? }`, reads recipients + tokens, batches to Expo push API, handles receipts and prunes dead tokens.
- (Optional) `push-receipts` — scheduled by `pg_cron` to poll `getReceipts`. Can also be rolled into `push-fanout` as a delayed second call to keep the surface small.

Neither Edge Function requires any RN-side package.

---

## Explicit Non-Additions (recap for the roadmapper)

| Considered | Decision | Reason |
|------------|----------|--------|
| `expo-localization` | **No** | Morning prompt is local-scheduled; OS handles device time. |
| `expo-task-manager` | **No** | No background JS task needed. |
| `expo-background-fetch` | **No** | Same reason. |
| `date-fns` / `dayjs` | **No** | TTL checks trivial with native `Date`. |
| `@notifee/react-native` | **No** | Incompatible with Expo Go managed workflow. |
| Upgrading Expo SDK | **No** | Out of scope. All needed APIs exist in SDK 55. |
| Bumping `@supabase/supabase-js` | **No** | `^2.99.2` covers everything v1.3 needs. |
| Third-party push service (OneSignal, FCM direct) | **No** | Expo push is the standard managed-workflow path and is already wired. Adding a second service doubles integration surface. |

---

*Stack research for: v1.3 Liveness & Notifications additions*
*Researched: 2026-04-06*
