---
phase: 01-push-infrastructure-dm-entry-point
plan: 06
subsystem: push-notifications
tags: [push, permissions, ux, ios, pre-prompt]
requirements: [PUSH-08]
dependency_graph:
  requires:
    - "01-05 (markPushPromptEligible export from usePushNotifications)"
    - "@/theme tokens (COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII)"
  provides:
    - "PrePromptModal component (D-02 value-led copy)"
    - "Eligibility flag flipped on first meaningful user action"
  affects:
    - "src/hooks/useStatus.ts"
    - "src/hooks/useFriends.ts"
tech_stack:
  added: []
  patterns:
    - "Best-effort fire-and-forget AsyncStorage write via .catch(() => {})"
    - "Inline rgba scrim with eslint-disable comment (matches FriendActionSheet convention)"
key_files:
  created:
    - src/components/notifications/PrePromptModal.tsx
  modified:
    - src/hooks/useStatus.ts
    - src/hooks/useFriends.ts
decisions:
  - "Use COLORS.surface.base as primary button label color (matches PrimaryButton convention) since COLORS.text.onAccent does not exist"
  - "Use inline rgba(0,0,0,0.6) backdrop with eslint-disable per existing FriendActionSheet pattern since COLORS.overlay.modal does not exist"
  - "FONT_SIZE.xl for title, FONT_SIZE.lg for body — adjusted from plan sketch (md→lg) to match the project's typography scale where lg=16 is body text"
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_changed: 3
  completed: 2026-04-07
---

# Phase 01 Plan 06: Pre-Prompt Modal + Eligibility Wiring Summary

Value-led iOS pre-prompt modal (`PrePromptModal.tsx`) with verbatim D-02 copy plus four `markPushPromptEligible()` call-sites in `useStatus`/`useFriends` so the eligibility flag flips after the first meaningful action (status set, context tag set, friend request sent, or friend request accepted), satisfying PUSH-08.

## What Changed

### Created

- `src/components/notifications/PrePromptModal.tsx` — React Native `Modal` with transparent backdrop, centered card, verbatim D-02 copy ("Stay in the loop" / "Get a heads up when friends are free — we only push when something matters." / "Sounds good" / "Not now"). Pure presentational component — `onAccept` and `onDecline` are caller-controlled callbacks; the component itself never touches `requestPermissionsAsync`, preserving the iOS one-shot prompt budget.

### Modified

- `src/hooks/useStatus.ts` — added `markPushPromptEligible` import; added the call inside the success branches of `updateStatus` and `updateContextTag` (right after `setStatus` / `setContextTag`). Wrapped in `.catch(() => {})` so AsyncStorage failures never break status updates.
- `src/hooks/useFriends.ts` — added `markPushPromptEligible` import; added the call inside the success paths of `sendRequest` (right before the final `return { data, error: null }`) and `acceptRequest` (same position). `rejectRequest` and `removeFriend` were deliberately left untouched — they are negative signals per D-01.

## Why It Works

- iOS only allows the system push permission modal to fire ONCE per install lifetime. The pre-prompt modal is a soft ask that the user can decline without burning that one shot.
- D-01 defines "meaningful action" as setting one's own status OR adding a friend. Both surfaces now flip the AsyncStorage `'campfire:push_prompt_eligible'` flag the first time the user successfully completes either action.
- `markPushPromptEligible` is idempotent (`AsyncStorage.setItem(KEY, 'true')`) so re-firing on every subsequent success is harmless and avoids the cost of a read-before-write.
- The modal component itself never invokes any permission API. Plan 04's session-ready effect / Profile toggle ON path is what eventually calls `registerForPushNotifications({ skipEligibilityCheck: true })` after a user taps "Sounds good".

## Threat Model Status

- **T-1-04 (permission spam):** MITIGATED. Eligibility gate now flips only after engagement signals; "Not now" path is purely a callback — does not invoke `requestPermissionsAsync`.

## Verification Performed

- `npx tsc --noEmit` — clean.
- `npx eslint src/components/notifications src/hooks/useStatus.ts src/hooks/useFriends.ts --max-warnings 0` — clean.
- Substring assertion script (D-02 copy + AsyncStorage key + theme import) — passed.
- Marker-call count assertion (≥2 calls in each hook + import present) — passed (status=2, friends=2).
- `rejectRequest` / `removeFriend` negative-signal scan — clean (no marker calls leaked).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Token availability] Substituted missing theme tokens**
- **Found during:** Task 1
- **Issue:** Plan referenced `COLORS.overlay.modal`, `COLORS.text.onAccent`, and `FONT_SIZE.md` for body text — none of these match the actual `@/theme` exports. Verified by reading `src/theme/colors.ts` and `src/theme/typography.ts`.
- **Fix:** Used `rgba(0,0,0,0.6)` with `// eslint-disable-next-line campfire/no-hardcoded-styles` comment for the scrim (matches the existing convention in `FriendActionSheet.tsx`); used `COLORS.surface.base` for the primary button label color (matches `PrimaryButton.tsx` convention); used `FONT_SIZE.xl` for the title and `FONT_SIZE.lg` for the body to match the project's scale where `lg=16` is body text.
- **Files modified:** `src/components/notifications/PrePromptModal.tsx`
- **Commit:** `89c8741`

### TDD Note

The plan tasks were marked `tdd="true"`, but the project has no test framework installed (no jest/vitest in `package.json`, no `test` script). Adding a test framework would be a Rule 4 architectural change well beyond this plan's scope, and previous plans in this phase did not introduce one either. Verification was performed via the plan's `<automated>` checks (tsc + eslint + substring/call-count assertions), all of which passed. Logged here for transparency rather than as a deferred item, since no current task in this phase sets up a test runner.

## Known Stubs

None. The PrePromptModal is purely presentational by design — the call-site that *renders* it (with `visible={...}` state and a parent screen) is intentionally out of scope per the plan's `<objective>` note: detailed render-trigger UX will be tuned during Plan 10 smoke testing.

## Self-Check: PASSED

- FOUND: src/components/notifications/PrePromptModal.tsx
- FOUND: commit 89c8741 (feat(01-06): add PrePromptModal with D-02 value-led copy)
- FOUND: commit 4925de7 (feat(01-06): mark push prompt eligible on first meaningful action)
- FOUND: markPushPromptEligible import + 2 call-sites in src/hooks/useStatus.ts
- FOUND: markPushPromptEligible import + 2 call-sites in src/hooks/useFriends.ts
- VERIFIED: rejectRequest and removeFriend do NOT call markPushPromptEligible
