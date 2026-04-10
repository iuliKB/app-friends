---
phase: 01-push-infrastructure-dm-entry-point
plan: 05
subsystem: push-registration
tags: [push-notifications, hook-rewrite, eligibility, pre-prompt, profile-toggle]
requires:
  - "supabase/migrations/0008_push_tokens_v1_3.sql (device_id, last_seen_at, invalidated_at columns must exist)"
  - "Plan 02 (migration applied to remote — done)"
provides:
  - "RegisterResult union: registered | skipped | not_eligible | needs_pre_prompt | permission_denied"
  - "registerForPushNotifications(userId, opts?) — five-state gated registration"
  - "unregisterForPushNotifications(userId) — hard delete by (user_id, device_id)"
  - "markPushPromptEligible / isPushPromptEligible (AsyncStorage flag)"
  - "markPushPrePromptSeen / hasPushPrePromptSeen (AsyncStorage flag)"
  - "getNotificationsEnabled / setNotificationsEnabledFlag"
affects:
  - "src/app/(tabs)/profile.tsx (toggle now uses register/unregister with revert-on-failure)"
  - "Plan 04 will consume RegisterResult to render PrePromptModal in (tabs)/_layout.tsx"
  - "Plan 06 will call markPushPromptEligible from useStatus and useFriends success paths"
tech-stack:
  added: []
  patterns:
    - "Five-state result union so caller can branch on needs_pre_prompt without exceptions"
    - "Two AsyncStorage gates (eligible + pre_prompt_seen) compose to enforce 'one meaningful action then one warm-up' before native iOS prompt"
    - "Optimistic UI in toggle handler with revert on permission_denied"
key-files:
  modified:
    - "src/hooks/usePushNotifications.ts (full rewrite, ~140 lines)"
    - "src/app/(tabs)/profile.tsx (import block + handleToggleNotifications only)"
decisions:
  - "Used Option A from CONTEXT.md (return value gating) over Option B (callback) — simpler caller code, easier to reason about, no promise interleaving"
  - "device_id sourced from Device.osInternalBuildId, fallback to Constants.installationId, then Constants.sessionId — D-14"
  - "Hard delete on toggle off rather than mark invalidated_at — D-12 explicitly chose hard delete for cleaner server-side truth"
  - "Toggle ON uses skipEligibilityCheck:true because the toggle itself IS the explicit user consent — no need for a value-led modal in that path"
  - "Permission denial on toggle ON reverts the switch optimistically + shows Alert pointing to iOS Settings (Pitfall #1 from RESEARCH.md)"
metrics:
  duration: "~8 min (sequential inline, no subagent)"
  completed: "2026-04-07"
  tasks: 2
---

# Phase 01 Plan 05: usePushNotifications Rewrite Summary

Rewrote `src/hooks/usePushNotifications.ts` to support the v1.3 device-keyed schema, the eligibility + pre-prompt gates required for PUSH-08, and a hard-delete opt-out path. Rewired `src/app/(tabs)/profile.tsx` so the existing notifications toggle calls the new register/unregister pair with revert-on-failure UX. Closes PUSH-03, PUSH-04, and the runtime half of PUSH-08.

## What Was Built

### Task 1: `src/hooks/usePushNotifications.ts` (full rewrite, ~140 lines)

The previous 51-line hook only handled token registration with a single AsyncStorage flag. The rewrite adds:

- **`RegisterResult` type union** with five states: `'registered' | 'skipped' | 'not_eligible' | 'needs_pre_prompt' | 'permission_denied'`. The five-state shape lets the caller (Plan 04's session-ready effect) branch on `'needs_pre_prompt'` without throwing or relying on side-channel state.
- **`getDeviceId()` helper** — returns `Device.osInternalBuildId ?? Constants.installationId ?? 'fallback:' + Constants.sessionId`. Stable per-install identifier per D-14. Reinstalls produce a fresh `device_id`; the old row gets reaped via `last_seen_at` staleness or a `DeviceNotRegistered` ticket error from Plan 07.
- **Two AsyncStorage flags**:
  - `campfire:push_prompt_eligible` (set by Plan 06's hooks when the user does a "meaningful action": first status set or first friend added)
  - `campfire:push_pre_prompt_seen` (set by Plan 04 after the user has seen and dismissed the pre-prompt modal — accept or decline)
- **`registerForPushNotifications(userId, opts?)`** — idempotent, gated. Gate ordering:
  1. `Device.isDevice` → else `'skipped'`
  2. Local opt-out flag → else `'skipped'`
  3. OS permission already granted → upsert + return `'registered'`
  4. `opts.skipEligibilityCheck === true` → call `requestPermissionsAsync` directly (Profile toggle ON path / pre-prompt Accept path)
  5. Eligibility flag not set → `'not_eligible'` (no prompts at all)
  6. Eligibility flag set BUT pre-prompt not yet seen → `'needs_pre_prompt'` (caller renders the modal; this branch DOES NOT call `requestPermissionsAsync`, preserving iOS's one-shot opportunity)
  7. Pre-prompt already seen → call `requestPermissionsAsync`
  Upsert payload: `device_id, token, platform, last_seen_at: new Date().toISOString(), invalidated_at: null` with `onConflict: 'user_id,device_id'`.
- **`unregisterForPushNotifications(userId)`** — sets `campfire:notifications_enabled='false'` AND hard-deletes the row matching `(user_id, device_id)`. Server-side truth per D-12 — no soft delete.
- **Helpers**: `markPushPromptEligible`, `isPushPromptEligible`, `markPushPrePromptSeen`, `hasPushPrePromptSeen`, `getNotificationsEnabled`, `setNotificationsEnabledFlag`.
- **Removed**: `setNotificationsEnabled` (the old name). Callers should use `unregisterForPushNotifications` (which owns the flag write) or `setNotificationsEnabledFlag` (only if they need to flip the flag without touching the server row).

### Task 2: `src/app/(tabs)/profile.tsx` (targeted edit)

Two surgical changes — nothing else in `profile.tsx` was touched:

- **Import block (line 24-28)**: dropped `setNotificationsEnabled`, added `unregisterForPushNotifications`.
- **`handleToggleNotifications` body (line 69-75)**: rewrote to optimistically flip the switch state, then branch on `value`. ON-path calls `registerForPushNotifications(session.user.id, { skipEligibilityCheck: true })` and reverts the switch + shows an Alert if the result is `'permission_denied'`. OFF-path calls `unregisterForPushNotifications(session.user.id)`.

The Alert copy: "Notifications blocked. Notifications are turned off in iOS Settings. Open Settings → Campfire → Notifications to re-enable."

## Deviations from Plan

None. Both tasks executed as written.

## Commits

| Task | Description                                                            | Commit  |
| ---- | ---------------------------------------------------------------------- | ------- |
| 1    | feat(01-05): rewrite usePushNotifications with eligibility and pre-prompt gates | 75545a1 |
| 2    | feat(01-05): rewire profile toggle to register/unregister with revert  | 2dfe246 |

## Verification

- `npx tsc --noEmit` → exit 0
- `npx eslint src/hooks/usePushNotifications.ts src/app/(tabs)/profile.tsx --max-warnings 0` → exit 0 for the hook (auto-fixed prettier on two long lines); profile.tsx still has 2 pre-existing prettier errors at lines 186 and 220 (unrelated to Plan 05's changes — already documented in `deferred-items.md`)
- Acceptance criteria spot-check (grep):
  - [x] `device_id` present multiple times
  - [x] `'campfire:push_prompt_eligible'` present
  - [x] `'campfire:push_pre_prompt_seen'` present
  - [x] `onConflict: 'user_id,device_id'` present
  - [x] All eight exports present (registerForPushNotifications, unregisterForPushNotifications, markPushPromptEligible, isPushPromptEligible, markPushPrePromptSeen, hasPushPrePromptSeen, getNotificationsEnabled, setNotificationsEnabledFlag)
  - [x] `RegisterResult` union includes all five states
  - [x] `requestPermissionsAsync` call sits BELOW both eligibility and pre-prompt-seen gates (`needs_pre_prompt` returned before any system prompt fires)
  - [x] `last_seen_at: new Date().toISOString()` and `invalidated_at: null` in upsert payload
  - [x] `unregisterForPushNotifications` uses `.delete().eq('user_id', userId).eq('device_id', deviceId)`
  - [x] `profile.tsx` imports `unregisterForPushNotifications`
  - [x] `profile.tsx` no longer imports `setNotificationsEnabled`
  - [x] `profile.tsx` contains `skipEligibilityCheck: true`, `permission_denied`, `'Notifications blocked'`

## Self-Check: COMPLETE

Both tasks delivered. The hook contract now matches what Plan 04 (session-ready effect) and Plan 06 (eligibility wiring) expect. The Profile toggle is consistent with the new register/unregister API. Runtime smoke testing (iOS one-shot pre-prompt, Android channel routing, device_id stability across reinstall) is gated on the deferred EAS development build per the user's pacing decision.
