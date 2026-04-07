# Phase 1 Smoke-Test Checklist

**Phase:** 01 — Push Infrastructure & DM Entry Point
**Validation strategy:** Manual sign-off on EAS dev build (no JS test framework in v1.3 per zero-new-deps rule).

## Prerequisites
- [ ] EAS dev build installed on a real iPhone (Plan 01 sign-off)
- [ ] EAS dev build installed on a real Android device or emulator (Plan 01 sign-off)
- [ ] `supabase/migrations/0008_push_tokens_v1_3.sql` applied (Plan 02 sign-off)
- [ ] `notify-plan-invite` Edge Function deployed (Plan 07 sign-off)
- [ ] Two distinct test users (User A and User B), already friends
- [ ] Supabase SQL editor access for spot-checks

## Per-requirement checklist

### PUSH-01 — Token registers on session-ready
- [ ] Fresh install on iPhone, log in as User B
- [ ] Within 5 seconds, run in Supabase SQL editor:
  `SELECT * FROM public.push_tokens WHERE user_id = '<user-b-id>';`
- [ ] Expected: at least one row with non-null device_id, last_seen_at within the last minute, invalidated_at IS NULL

### PUSH-02 — Foreground re-register on AppState 'active'
- [ ] Note current `last_seen_at` for User B's row
- [ ] Background the app for 30 seconds (home button / app switcher)
- [ ] Foreground the app
- [ ] Re-query `last_seen_at` — expected: advanced to within the last 10 seconds

### PUSH-03 — Schema columns and composite unique
- [ ] In Supabase SQL editor: `\d public.push_tokens`
- [ ] Expected columns present: device_id text NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now(), invalidated_at timestamptz
- [ ] Expected indexes: idx_push_tokens_user_device (UNIQUE), idx_push_tokens_active (partial WHERE invalidated_at IS NULL)

### PUSH-04 — Toggle OFF deletes server row, ON re-registers
- [ ] On the device: Profile → Notifications toggle → OFF
- [ ] Re-query: row should be GONE for that (user_id, device_id)
- [ ] Toggle → ON
- [ ] Re-query: row reappears within 5 seconds, no UI prompt shown

### PUSH-05 — Plan invite reaches a fresh install
- [ ] Fresh install (delete + reinstall) on User B's device
- [ ] Log in as User B (DO NOT toggle the Profile notifications switch)
- [ ] On User A's device, create a plan and invite User B
- [ ] Expected: User B receives a "Plan invite" push within ~5 seconds without ever opening the Profile screen

### PUSH-06 — iOS notification action buttons (morning_prompt category)
- [ ] On iOS only. Send a local notification with categoryIdentifier 'morning_prompt' from the Expo Push Tool, OR temporarily add a "Test Push" button in the dev build that calls `Notifications.scheduleNotificationAsync({ content: { title: 'test', categoryIdentifier: 'morning_prompt' }, trigger: null })`
- [ ] On the lock screen, swipe down on the notification
- [ ] Expected: three action buttons visible — Free, Busy, Maybe

### PUSH-07 — Android channels exist
- [ ] On Android only. Settings → Apps → Campfire → Notifications
- [ ] Expected channels visible: plan_invites, friend_free, morning_prompt, system
- [ ] (Legacy `default` channel may also be present on upgraded installs — acceptable per D-18)

### PUSH-08 — iOS pre-prompt timing
- [ ] Fresh install on iPhone, log in
- [ ] Expected: NO iOS system permission prompt yet
- [ ] Set your status (Free / Busy / Maybe) for the first time
- [ ] Expected: pre-prompt modal "Stay in the loop" appears (or surfaces on next foreground)
- [ ] Tap "Sounds good"
- [ ] Expected: native iOS permission modal appears

### PUSH-09 — DeviceNotRegistered marks invalidated_at
- [ ] In Supabase SQL editor, manually corrupt a known token:
  `UPDATE public.push_tokens SET token = 'ExponentPushToken[INVALID_TEST]' WHERE user_id = '<test-user>';`
- [ ] Trigger a plan invite to that user (any flow that calls notify-plan-invite)
- [ ] Re-query: `SELECT invalidated_at FROM public.push_tokens WHERE user_id = '<test-user>';`
- [ ] Expected: invalidated_at is non-null

### PUSH-10 — EAS dev build exists
- [ ] `eas build:list --platform ios --profile development` shows a successful build
- [ ] `eas build:list --platform android --profile development` shows a successful build
- [ ] Both artifacts are installable on test devices

### DM-01 — HomeFriendCard tappable
- [ ] Single tap on any friend card on the Home screen
- [ ] Expected: chat room opens at `/chat/room?dm_channel_id=...&friend_name=...`
- [ ] Long-press on a friend card
- [ ] Expected: action sheet appears with "View profile" and "Plan with {firstName}..."
- [ ] Tap "View profile" — routes to `/friends/[id]`
- [ ] Tap "Plan with..." — routes to `/plan-create` with that friend pre-selected (verify only the long-pressed friend is selected in the picker)
- [ ] List scrolling on Home still works smoothly (Pitfall #6 — long-press should not block scroll)

## Sign-off

- [ ] All requirement checks above passed
- [ ] No regressions in existing v1.0–v1.2 features (login, status set, plan create, chat send)
- [ ] Phase ready for `/gsd:verify-work`

## If a check fails

1. Note which requirement failed and what was observed.
2. Run `/gsd:plan-phase 1 --gaps` and pass the failing item as the gap source.
3. The gap-closure plan will be added as Plan 11+ and executed before re-running this checklist.
