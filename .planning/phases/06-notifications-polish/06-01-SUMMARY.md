---
phase: 06-notifications-polish
plan: 01
subsystem: notifications
tags: [push-notifications, expo-notifications, supabase-edge-functions, deep-links]
dependency_graph:
  requires: []
  provides: [push_tokens-table, notify-plan-invite-edge-function, usePushNotifications-hook, notification-deep-links]
  affects: [src/app/_layout.tsx, app.config.ts]
tech_stack:
  added: [expo-notifications]
  patterns: [AsyncStorage-toggle, Device.isDevice-guard, cold-start-deep-link, Expo-Push-API-batch]
key_files:
  created:
    - supabase/migrations/0003_push_tokens.sql
    - supabase/functions/notify-plan-invite/index.ts
    - src/hooks/usePushNotifications.ts
  modified:
    - app.config.ts
    - src/app/_layout.tsx
decisions:
  - "AsyncStorage key campfire:notifications_enabled used for per-device notification toggle — default enabled (null = on)"
  - "EAS projectId driven by EAS_PROJECT_ID env var with YOUR_EAS_PROJECT_UUID placeholder fallback"
  - "Cold-start deep link uses 150ms setTimeout to ensure navigation tree is mounted before router.push"
  - "Self-invite skip in Edge Function: record.user_id === record.invited_by guard prevents plan creator from notifying themselves"
metrics:
  duration_seconds: 254
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 6 Plan 1: Push Notification Infrastructure Summary

**One-liner:** Expo push notification infrastructure with push_tokens migration, Deno Edge Function webhook delivering via Expo Push API, usePushNotifications hook with AsyncStorage toggle, and root layout cold/warm-start deep link handlers.

## What Was Built

### Task 1: Push token migration, app config, and usePushNotifications hook

**supabase/migrations/0003_push_tokens.sql** — New table `push_tokens` with:
- `id uuid`, `user_id uuid → auth.users`, `token text`, `platform text CHECK (ios/android)`, `created_at`
- `UNIQUE (user_id, token)` constraint — supports multiple devices per user, prevents duplicates
- RLS enabled: "Users manage own push tokens" policy using `(SELECT auth.uid())` pattern

**app.config.ts** — Two additions:
- `'expo-notifications'` added to plugins array (required for native module injection at EAS build time)
- `extra.eas.projectId` driven by `EAS_PROJECT_ID` env var with placeholder fallback

**src/hooks/usePushNotifications.ts** — Three exports:
- `registerForPushNotifications(userId)` — `Device.isDevice` guard, AsyncStorage toggle check, permission request, Android channel creation, `getExpoPushTokenAsync` with `easConfig.projectId ?? expoConfig.extra.eas.projectId`, upsert to `push_tokens` on conflict
- `getNotificationsEnabled()` — reads AsyncStorage key, returns `true` if null (default on)
- `setNotificationsEnabled(enabled)` — writes AsyncStorage key

**expo-notifications package installed** (was missing from node_modules despite being in package.json research; installed via `npx expo install expo-notifications`).

### Task 2: Edge Function, root layout notification listeners, and deep link handling

**supabase/functions/notify-plan-invite/index.ts** — Deno Edge Function:
- Receives `plan_members` INSERT webhook payload
- Self-invite guard: skips if `record.user_id === record.invited_by`
- Parallel fetch: inviter `display_name`, plan `title`, invitee's `push_tokens`
- Returns early if no tokens
- Batch sends via `https://exp.host/--/api/v2/push/send` with `Authorization: Bearer EXPO_ACCESS_TOKEN`
- Message format: title "Plan invite", body "{inviterName} invited you to {planTitle}", data `{ planId }`

**src/app/_layout.tsx** — Module-level and component-level additions:
- `Notifications.setNotificationHandler` at module level (outside component) — shows banner while app is in foreground
- New `useEffect` (separate from auth useEffect) with:
  - `addNotificationResponseReceivedListener` — warm-start: navigates to `/plans/${planId}` on tap
  - `getLastNotificationResponseAsync` — cold-start: navigates with `setTimeout(..., 150)` to ensure router is mounted
  - Cleanup: `responseSub.remove()` on unmount

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] expo-notifications not installed in node_modules**
- **Found during:** Task 1 lint verification
- **Issue:** `import/no-unresolved` error for `expo-notifications` — package was in package.json dependencies per RESEARCH.md but not actually installed in node_modules
- **Fix:** Ran `npx expo install expo-notifications` to install the package
- **Files modified:** package.json, package-lock.json
- **Commit:** d70a197

**2. [Rule 2 - Code Quality] Prettier formatting applied to existing files**
- **Found during:** Task 1 lint --fix pass
- **Issue:** 60 prettier errors across 19 existing source files (pre-existing)
- **Fix:** `npx expo lint --fix` auto-corrected all formatting issues
- **Files modified:** 19 existing source files
- **Commit:** b530c7d

## Self-Check

Files verified:
- [x] supabase/migrations/0003_push_tokens.sql — exists, contains CREATE TABLE + RLS + UNIQUE
- [x] supabase/functions/notify-plan-invite/index.ts — exists, contains Deno.serve + Expo Push API call
- [x] src/hooks/usePushNotifications.ts — exists, exports all 3 functions
- [x] app.config.ts — contains expo-notifications plugin + eas.projectId
- [x] src/app/_layout.tsx — contains setNotificationHandler + both listeners
- [x] npx expo lint — 0 errors, 8 warnings (all pre-existing)

## Self-Check: PASSED
