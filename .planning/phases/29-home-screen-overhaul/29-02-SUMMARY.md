---
phase: 29-home-screen-overhaul
plan: "02"
subsystem: ui
tags: [react-native, home-screen, radar-bubble, heartbeat, tdd, accessibility]

requires:
  - phase: 29-01
    provides: "RED test baseline for RadarBubble DEAD non-interactive state (HOME-05)"

provides:
  - "DEAD bubble renders at opacity 0.38 with greyscale surface overlay — non-interactive, no Pressable, no PulseRing, no LinearGradient"
  - "isDead conditional render branch in RadarBubble.tsx with StyleSheet.absoluteFillObject overlay"

affects:
  - "29-03 (useViewPreference hook — no dependency on RadarBubble)"
  - "29-04 (EventCard — no dependency on RadarBubble)"
  - "29-05 (HomeScreen integration — RadarBubble DEAD state visually complete)"

tech-stack:
  added: []
  patterns:
    - "isDead ? <View> : <Pressable> conditional — splits interactive vs non-interactive render path inside a single component"
    - "StyleSheet.absoluteFillObject overlay with pointerEvents=none for greyscale simulation — prevents touch consumption by overlay"
    - "borderRadius uses targetSize/2 (static number) not sizeAnim/2 (Animated.Value) for overlay styling"

key-files:
  created: []
  modified:
    - src/components/home/RadarBubble.tsx

key-decisions:
  - "Use plain View (not Pressable) for DEAD branch — satisfies non-interactive requirement without removing touch handlers from ALIVE/FADING path"
  - "borderRadius: targetSize / 2 on overlay (not sizeAnim / 2) — Animated.Value not valid as a style prop for borderRadius without useNativeDriver: false"

patterns-established:
  - "Overlay pattern: StyleSheet.absoluteFillObject + pointerEvents=none — prevents overlay from consuming touch events on sibling elements (T-29-03 mitigation)"

requirements-completed:
  - HOME-05

duration: 8min
completed: "2026-05-06"
---

# Phase 29 Plan 02: DEAD Bubble Visual Treatment Summary

**DEAD RadarBubble renders non-interactively at opacity 0.38 with a greyscale surface overlay and no Pressable/PulseRing/LinearGradient — visually distinct from FADING (0.6, amber pulse) and ALIVE (1.0, colored pulse)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-06T20:15:00Z
- **Completed:** 2026-05-06T20:23:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Turned the RED test from Plan 01 GREEN: "DEAD bubble has no interactive button role" now passes (0 Pressable elements in DEAD render tree)
- Changed DEAD opacity from 0.5 to 0.38 — creates clear visual hierarchy: DEAD (0.38) vs FADING (0.6) vs ALIVE (1.0)
- Added greyscale simulation overlay (colors.surface.base at 0.55 opacity, absoluteFillObject, pointerEvents=none) inside the bubbleContainer above AvatarCircle
- T-29-03 mitigation applied: pointerEvents=none on overlay prevents touch event interception on nearby interactive bubbles
- All 3 RadarBubble tests GREEN, no TypeScript errors in RadarBubble.tsx

## Task Commits

1. **Task 1: Implement DEAD bubble branch in RadarBubble.tsx** - `0803400` (feat)

## Files Created/Modified

- `src/components/home/RadarBubble.tsx` — DEAD branch with isDead conditional, opacity 0.38, greyscale overlay, no Pressable/PulseRing/LinearGradient

## Decisions Made

- Used `isDead ? <View> : <Pressable>` conditional to split the render path cleanly. The outer `Animated.View` (outerWrapper) and `Text` name label are unchanged — only the interactive wrapper inside changes.
- `borderRadius: targetSize / 2` (static) on the overlay instead of `sizeAnim / 2` (Animated.Value) — using an Animated.Value as a style prop for borderRadius is not supported without `useNativeDriver: false`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - UI-only change, no external services required.

## Next Phase Readiness

- Plan 03 (useViewPreference hook): no dependency on RadarBubble — ready to execute
- Plan 04 (EventCard resize + date pill): EventCard.phase29.test.tsx RED tests remain in place — ready to execute
- Plan 05 (HomeScreen integration): RadarBubble DEAD state is complete; HomeScreen overhaul can proceed

## Self-Check

Files exist:
- src/components/home/RadarBubble.tsx (modified) ✓

Commits:
- 0803400 ✓

---
*Phase: 29-home-screen-overhaul*
*Completed: 2026-05-06*
