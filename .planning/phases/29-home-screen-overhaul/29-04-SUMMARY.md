---
phase: 29-home-screen-overhaul
plan: "04"
subsystem: ui
tags: [react-native, event-card, theme, avatar-stack, tdd, home-screen]

requires:
  - phase: 29-01
    provides: "RED test baseline for EventCard 240x160 dimensions and date-pill (EventCard.phase29.test.tsx)"

provides:
  - "EventCard resized to 240x160px (D-10)"
  - "Theme-aware date pill anchored top-left of EventCard (D-11)"
  - "Redundant inline date text removed (D-12)"
  - "AvatarStack updated to size=28 maxVisible=5"

affects:
  - "29-05 (home screen integration — EventCard is embedded in horizontal scroll section)"

tech-stack:
  added: []
  patterns:
    - "isDark conditional rgba background for theme-aware pill overlays — isDark ? rgba(185,255,59,0.15) : rgba(77,124,0,0.12)"
    - "Absolute-positioned pill as direct child of Animated.View, sibling of content layer — not nested inside flex-end content"

key-files:
  created: []
  modified:
    - src/components/home/EventCard.tsx

key-decisions:
  - "Date pill placed as Animated.View direct child (sibling of styles.content), not inside the flex-end content View — nesting it inside would cause it to stack vertically with title/avatars instead of floating top-left"

patterns-established:
  - "Theme-aware rgba pill: isDark ? rgba(light-color,0.15) : rgba(dark-color,0.12) — two rgba values per pill for light/dark mode"

requirements-completed:
  - HOME-08

duration: 10min
completed: "2026-05-06"
---

# Phase 29 Plan 04: EventCard Resize + Date Pill Summary

**EventCard resized to 240x160px with an absolutely-positioned theme-aware date pill (isDark rgba), AvatarStack bumped to size=28/maxVisible=5, and redundant inline date text removed — all EventCard.phase29 tests GREEN**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-06T20:10:00Z
- **Completed:** 2026-05-06T20:20:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Resized EventCard card dimensions from 200x140 to 240x160 in StyleSheet (D-10)
- Added `testID="event-card"` to root TouchableOpacity — enables test and accessibility targeting
- Added absolutely-positioned date pill (`testID="date-pill"`) as direct sibling of `styles.content` inside `Animated.View`, with `isDark` conditional background (D-11)
- Removed redundant inline date `<Text>` block and its `styles.date` StyleSheet entry (D-12)
- Updated AvatarStack from `size={24} maxVisible={3}` to `size={28} maxVisible={5}`
- All 3 EventCard.phase29 tests turned GREEN (2 were RED before this plan)

## Task Commits

1. **Task 1: Resize EventCard, add date pill, update AvatarStack props** - `d2b2d79` (feat)

## Files Created/Modified

- `src/components/home/EventCard.tsx` — Card dimensions updated, testID added, date pill added, inline date removed, AvatarStack props updated

## Decisions Made

- Date pill placed as a direct child of `Animated.View` (sibling of `styles.content`), not inside `styles.content`. The content View uses `justifyContent: 'flex-end'` which would stack the pill vertically alongside title and avatars. The absolute-positioned sibling approach is correct per D-11.
- Removed unused `useMemo` import after removing the inline date text (the `styles` object is a static StyleSheet, not a memoized one).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `useMemo` import**
- **Found during:** Task 1 (post-edit cleanup)
- **Issue:** `useMemo` was imported but never used after removing the inline date Text block. TypeScript would warn on unused import.
- **Fix:** Removed `useMemo` from the React import line.
- **Files modified:** `src/components/home/EventCard.tsx`
- **Verification:** `npx tsc --noEmit 2>&1 | grep EventCard` returns 0 lines.
- **Committed in:** `d2b2d79` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 cleanup)
**Impact on plan:** Trivial cleanup. No scope creep.

## Issues Encountered

None — plan executed cleanly. All grep acceptance criteria met, tests GREEN, TypeScript clean.

## User Setup Required

None — UI-only changes, no external service configuration required.

## Next Phase Readiness

- Plan 05 (Home Screen integration) can proceed — EventCard renders at 240x160 with date pill and correct AvatarStack props
- `EventCard.phase29.test.tsx` now fully GREEN (3/3)

## Self-Check

Files exist:
- src/components/home/EventCard.tsx (modified) ✓

Commits:
- d2b2d79 ✓

---
*Phase: 29-home-screen-overhaul*
*Completed: 2026-05-06*
