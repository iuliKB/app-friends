---
phase: 04-morning-prompt-squad-goals-streak
plan: "05"
subsystem: ui
tags: [react-native, expo-notifications, async-storage, datetimepicker, morning-prompt]

# Dependency graph
requires:
  - phase: 04-03
    provides: ensureMorningPromptScheduled / cancelMorningPrompt / scheduleMorningPrompt exports from src/lib/morningPrompt.ts
provides:
  - Morning prompt toggle + time picker in Profile screen (MORN-07, MORN-08)
  - AsyncStorage hydration of campfire:morning_prompt_* keys with defaults
  - Permission flow reusing PrePromptModal for undetermined state
  - Cold-launch reschedule call inside existing tabs useEffect (D-22 point 1)
affects: [04-06, phase-05-hardware-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Permission-check-before-schedule: check getPermissionsAsync before calling ensureMorningPromptScheduled on toggle ON"
    - "Revert-on-denial: Switch reverts to OFF + writes 'false' to AsyncStorage on permission denial"
    - "Single cold-launch hook: ensureMorningPromptScheduled placed inside existing auth useEffect, no new useEffect"

key-files:
  created: []
  modified:
    - src/app/(tabs)/profile.tsx
    - src/app/(tabs)/_layout.tsx

key-decisions:
  - "PrePromptModal reused for morning-prompt undetermined permission flow — same modal, different accept/decline handlers"
  - "handleLogout left untouched — D-33 sign-out cancel is Plan 03 Task 3's responsibility via module-scope auth subscriber"
  - "cancelMorningPrompt NOT called in handleLogout to avoid double-fire with Plan 03's auth subscriber"

patterns-established:
  - "Permission gate pattern: getPermissionsAsync() before schedule, requestPermissionsAsync() only via PrePromptModal accept"
  - "AsyncStorage-only for morning prompt state — no profiles table column (D-35)"

requirements-completed:
  - MORN-07
  - MORN-08

# Metrics
duration: 7min
completed: 2026-04-10
---

# Phase 04 Plan 05: Morning Prompt UI Wiring Summary

**Profile screen Morning prompt section (Switch + DateTimePicker + permission flow) wired to AsyncStorage and morningPrompt.ts scheduler, with cold-launch hook in existing tabs useEffect**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-10T07:08:00Z
- **Completed:** 2026-04-10T07:15:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added MORNING PROMPT section to Profile screen with Switch (toggle), time picker row, inline DateTimePicker, and permission-denied hint text
- AsyncStorage hydration in `loadNotificationsEnabled` reads all three `campfire:morning_prompt_*` keys with correct defaults (enabled=true, hour=9, minute=0)
- Full permission flow: granted → schedule immediately, undetermined → PrePromptModal, denied → revert Switch + inline hint
- Cold-launch reschedule wired into the existing single `useEffect` in `src/app/(tabs)/_layout.tsx` (OVR-04 preserved — no second listener)

## Task Commits

1. **Task 1: Add Morning prompt section to Profile screen** - `61b2ff7` (feat)
2. **Task 2: Extend existing tabs useEffect to call ensureMorningPromptScheduled on cold launch** - `88a03f3` (feat)

## Files Created/Modified

- `src/app/(tabs)/profile.tsx` - Added state, hydration, handlers, JSX section, styles for morning prompt
- `src/app/(tabs)/_layout.tsx` - Added import and single `ensureMorningPromptScheduled().catch(() => {})` call in cold-launch block

## Decisions Made

- PrePromptModal reused for morning prompt undetermined flow — same component, different accept/decline handlers (`handleMorningPrePromptAccept` / `handleMorningPrePromptDecline`)
- `handleLogout` left completely untouched — Plan 03 Task 3's module-scope auth subscriber handles sign-out cancellation; adding a call here would double-fire
- No `ensureMorningPromptScheduled` call in the AppState 'active' foreground branch — OS-backed daily repeating trigger persists across foreground/background cycles

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prettier formatting errors in catch callbacks**
- **Found during:** Task 1 (lint verification)
- **Issue:** Two `.catch(() => ({ status: '...' as const }))` callback expressions were formatted as single-line, triggering Prettier errors
- **Fix:** Reformatted to multi-line object literal style matching Prettier's expected output
- **Files modified:** src/app/(tabs)/profile.tsx
- **Verification:** `npx expo lint src/app/(tabs)/profile.tsx` exits with 0 errors
- **Committed in:** 61b2ff7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - formatting)
**Impact on plan:** Trivial formatting fix; no behavioral change.

## Issues Encountered

None — both tasks followed the plan as specified. The only issue was a Prettier formatting correction on two catch callbacks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MORN-07 and MORN-08 satisfied: Profile toggle with graceful permission handling and time picker with 9:00 AM default
- Cold-launch reschedule hook live in OVR-04-compliant single useEffect
- Ready for Plan 06 (copy review) and Plan 07 (notification response handler) without any dependency on this plan's internals
- Hardware smoke test deferred to Phase 5 Hardware Verification Gate (real device required for local notifications)

---
*Phase: 04-morning-prompt-squad-goals-streak*
*Completed: 2026-04-10*
