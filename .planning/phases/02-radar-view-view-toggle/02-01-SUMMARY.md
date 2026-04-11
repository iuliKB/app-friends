---
phase: 02-radar-view-view-toggle
plan: 01
subsystem: ui
tags: [react-native, async-storage, haptics, segmented-control, view-toggle]

# Dependency graph
requires: []
provides:
  - "RadarViewToggle component — segmented Radar/Cards toggle with haptics and accessibility"
  - "useViewPreference hook — AsyncStorage-backed preference (campfire:home_view) returning [view, setView, loading]"
  - "ViewPreference type — 'radar' | 'cards' union exported from both files"
affects:
  - 02-radar-view-view-toggle
  - homescreen

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useViewPreference: [value, setter, loading] tuple hook pattern (matches AsyncStorage campfire: prefix convention)"
    - "RadarViewToggle: SegmentedControl structural clone with overlay active bg instead of status color"

key-files:
  created:
    - src/hooks/useViewPreference.ts
    - src/components/home/RadarViewToggle.tsx
  modified: []

key-decisions:
  - "COLORS.surface.overlay ('#ffffff14') confirmed in theme — no hardcoded fallback needed for RadarViewToggle active bg"
  - "Active label uses COLORS.text.primary (not COLORS.surface.base) to distinguish from SegmentedControl status pattern"

patterns-established:
  - "AsyncStorage read in useEffect with .finally(() => setLoading(false)) — consistent with other campfire: prefix hooks"
  - "setView optimistic update: setState then AsyncStorage.setItem with silent catch + console.warn"
  - "Segmented toggle active bg: COLORS.surface.overlay for non-status toggles vs COLORS.status.* for status toggles"

requirements-completed:
  - HOME-01
  - HOME-02

# Metrics
duration: 2min
completed: 2026-04-11
---

# Phase 02 Plan 01: RadarViewToggle & useViewPreference Summary

**AsyncStorage-backed useViewPreference hook and RadarViewToggle segmented control — Radar/Cards toggle with haptics, overlay active state, and accessibility attributes**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-11T06:22:26Z
- **Completed:** 2026-04-11T06:24:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- useViewPreference hook reads/writes 'campfire:home_view' from AsyncStorage, defaults to 'radar', exports ViewPreference type
- RadarViewToggle renders Radar/Cards segments with COLORS.surface.overlay active background, ImpactFeedbackStyle.Light haptics on press
- Both files compile without TypeScript errors; no new npm dependencies required

## Task Commits

Each task was committed atomically:

1. **Task 1: useViewPreference hook** - `c4c40e2` (feat)
2. **Task 2: RadarViewToggle component** - `257a577` (feat)

## Files Created/Modified

- `src/hooks/useViewPreference.ts` - AsyncStorage-backed preference hook returning [view, setView, loading]; exports ViewPreference type
- `src/components/home/RadarViewToggle.tsx` - Segmented control component for Radar/Cards view selection; exports RadarViewToggle

## Decisions Made

- `COLORS.surface.overlay` is already defined in the theme as `'#ffffff14'`, so no hardcoded fallback was needed
- Active label color is `COLORS.text.primary` (not `COLORS.surface.base` as used in SegmentedControl for status segments) — visual distinction kept per UI-SPEC

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- useViewPreference and RadarViewToggle are self-contained and ready to be wired into HomeScreen (Phase 02 Wave 2/3 plans)
- ViewPreference type is exported from both files for easy import by consumers

---
*Phase: 02-radar-view-view-toggle*
*Completed: 2026-04-11*
