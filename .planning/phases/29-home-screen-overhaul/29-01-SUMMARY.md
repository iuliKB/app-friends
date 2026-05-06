---
phase: 29-home-screen-overhaul
plan: "01"
subsystem: testing
tags: [jest, react-native-testing-library, tdd, home-screen, radar-bubble, event-card, async-storage]

requires: []
provides:
  - "RED test baseline for RadarBubble DEAD non-interactive state (HOME-05)"
  - "GREEN test verification for useViewPreference AsyncStorage persistence (HOME-06)"
  - "RED test baseline for EventCard 240x160 dimensions + date-pill (HOME-08)"
affects:
  - "29-02 (implements RadarBubble DEAD state — must turn RadarBubble RED green)"
  - "29-04 (implements EventCard resize + date pill — must turn EventCard RED tests green)"

tech-stack:
  added: []
  patterns:
    - "UNSAFE_queryAllByType(Pressable) for interactive-element presence checks — queryAllByRole not reliable with string-element RN mocks"
    - "renderHook + act for async hook testing with AsyncStorage"

key-files:
  created:
    - src/components/home/__tests__/RadarBubble.dead.test.tsx
    - src/hooks/__tests__/useViewPreference.test.ts
    - src/components/home/__tests__/EventCard.phase29.test.tsx
  modified:
    - src/__mocks__/theme.js

key-decisions:
  - "Use UNSAFE_queryAllByType(Pressable) instead of queryAllByRole('button') — RTNU 13.x does not resolve accessibilityRole on string-element mocks"
  - "SHADOWS added to theme mock — EventCard imports SHADOWS.card which was missing from the stub"

patterns-established:
  - "UNSAFE_queryAllByType(Component): preferred pattern for presence/absence checks on components that use the string-element RN mock"

requirements-completed:
  - HOME-05
  - HOME-06
  - HOME-08

duration: 15min
completed: "2026-05-06"
---

# Phase 29 Plan 01: Home Screen Overhaul Test Scaffolds Summary

**Three TDD scaffolds establishing RED/GREEN baselines: RadarBubble DEAD interactivity (HOME-05), useViewPreference persistence (HOME-06), and EventCard dimension + date-pill (HOME-08)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-06T20:00:00Z
- **Completed:** 2026-05-06T20:15:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `RadarBubble.dead.test.tsx` with correct RED baseline: "DEAD has no Pressable" fails (1 Pressable found, expected 0) before Plan 02 implements non-interactive DEAD rendering
- Created `useViewPreference.test.ts` with all 3 tests GREEN — confirms HOME-06 is already implemented and AsyncStorage persistence works correctly
- Created `EventCard.phase29.test.tsx` with correct RED baselines: "width 240" and "date-pill" tests fail before Plan 04 adds testID and resizes the card
- Fixed missing `SHADOWS` export in theme mock (Rule 2 deviation — EventCard renders `SHADOWS.card` which was undefined)

## Task Commits

1. **Task 1: RadarBubble DEAD test scaffold** - `646229f` (test)
2. **Task 2: useViewPreference + EventCard test scaffolds** - `b7b7778` (test)

## Files Created/Modified

- `src/components/home/__tests__/RadarBubble.dead.test.tsx` — 3 tests; 1 RED (DEAD no Pressable), 2 GREEN (renders name, ALIVE has Pressable)
- `src/hooks/__tests__/useViewPreference.test.ts` — 3 tests; 3 GREEN (default radar, restore cards, setItem call)
- `src/components/home/__tests__/EventCard.phase29.test.tsx` — 3 tests; 1 GREEN (renders title), 2 RED (width 240, date-pill)
- `src/__mocks__/theme.js` — Added `SHADOWS` export with `fab`, `card`, `swipeCard`, `none` keys

## Decisions Made

- Used `UNSAFE_queryAllByType(Pressable)` instead of `queryAllByRole('button')` to test interactive element presence. RTNU 13.x reads `accessibilityRole` from element props, but when react-native is fully mocked as string elements (the project pattern), `queryAllByRole` returns 0 even when `accessibilityRole="button"` is present. `UNSAFE_queryAllByType` correctly traverses the fiber tree by component type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added SHADOWS to theme mock**
- **Found during:** Task 2 (EventCard test scaffold)
- **Issue:** `src/__mocks__/theme.js` exported `SHADOW` (singular, no `card` key) but `EventCard.tsx` imports `SHADOWS` (plural). Render failed with `Cannot read properties of undefined (reading 'card')`.
- **Fix:** Added `SHADOWS = { fab: {}, card: {}, swipeCard: {}, none: {} }` to theme mock and included it in `module.exports`.
- **Files modified:** `src/__mocks__/theme.js`
- **Verification:** EventCard test suite renders without error after fix.
- **Committed in:** `b7b7778` (Task 2 commit)

**2. [Rule 1 - Bug] Switched from queryAllByRole to UNSAFE_queryAllByType**
- **Found during:** Task 1 (RadarBubble test scaffold)
- **Issue:** Plan specified `queryAllByRole('button')` but this returns 0 elements even for ALIVE bubbles with `accessibilityRole="button"` in the project's string-element RN mock environment. The "ALIVE has button role" sanity test would fail, making the RED/GREEN distinction meaningless.
- **Fix:** Used `UNSAFE_queryAllByType(Pressable)` which directly queries the component tree by type. DEAD state has 0 Pressables (correct RED), ALIVE state has 1 (correct GREEN).
- **Files modified:** `src/components/home/__tests__/RadarBubble.dead.test.tsx`
- **Verification:** DEAD test fails (1 Pressable found, expected 0) — correct RED. ALIVE sanity test passes.
- **Committed in:** `646229f` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 2 missing critical, 1 Rule 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — test-only changes, no external services required.

## Next Phase Readiness

- Plan 02 (RadarBubble DEAD implementation): target test is `RadarBubble.dead.test.tsx` — "DEAD has no Pressable" must turn GREEN
- Plan 04 (EventCard resize + date pill): target tests are `EventCard.phase29.test.tsx` — "width 240" and "date-pill" tests must turn GREEN
- `useViewPreference` is fully verified GREEN — no further test work needed for HOME-06

## Self-Check

Files exist:
- src/components/home/__tests__/RadarBubble.dead.test.tsx ✓
- src/hooks/__tests__/useViewPreference.test.ts ✓
- src/components/home/__tests__/EventCard.phase29.test.tsx ✓
- src/__mocks__/theme.js (modified) ✓

Commits:
- 646229f ✓
- b7b7778 ✓

---
*Phase: 29-home-screen-overhaul*
*Completed: 2026-05-06*
