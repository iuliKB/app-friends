---
phase: 29-home-screen-overhaul
plan: "05"
subsystem: ui
tags: [react-native, home-screen, skeleton, loading-state, upcoming-events]

# Dependency graph
requires:
  - phase: 29-03
    provides: HomeScreen usePlans() call and UpcomingEventsSection JSX
  - phase: 29-04
    provides: EventCard at 240x160 dimensions

provides:
  - UpcomingEventsSection isLoading prop with 2x SkeletonPulse(240x160) skeleton branch
  - Animated.timing 300ms fade-out when isLoading transitions false
  - CARD_WIDTH=240, FlatList height=160, placeholderCard 240x160 synced to EventCard
  - HomeScreen extracts loading: plansLoading from usePlans() and passes isLoading={plansLoading}

affects:
  - src/components/home/UpcomingEventsSection.tsx
  - src/screens/home/HomeScreen.tsx

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isLoading prop + Animated.Value fade-out: skeletonOpacity useRef, useEffect fades 1→0 on isLoading=false"
    - "Skeleton row: Animated.View with flexDirection=row, 2x SkeletonPulse(240x160), paddingLeft=SPACING.lg"

key-files:
  created: []
  modified:
    - src/components/home/UpcomingEventsSection.tsx
    - src/screens/home/HomeScreen.tsx

key-decisions:
  - "Skeleton fade uses Animated.timing (not spring) with useNativeDriver: true — matches UI-SPEC 300ms opacity transition"
  - "skeletonOpacity.setValue(1) on isLoading=true resets animation for repeated loading cycles"

patterns-established:
  - "Three-way conditional in UpcomingEventsSection: isLoading → empty → FlatList"

requirements-completed:
  - HOME-08

# Metrics
duration: 5min
completed: "2026-05-06"
---

# Phase 29 Plan 05: Loading Skeleton for UpcomingEventsSection Summary

**Added isLoading prop to UpcomingEventsSection with 2x SkeletonPulse(240x160) skeleton branch and 300ms Animated.timing fade-out; HomeScreen extracts plansLoading from usePlans() and threads it as isLoading prop**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-06T20:13:10Z
- **Completed:** 2026-05-06
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

### Task 1 — UpcomingEventsSection
- Added `Animated`, `useEffect`, `useRef` to React/RN imports
- Added `ANIMATION` to theme imports
- Added `SkeletonPulse` import from `@/components/common/SkeletonPulse`
- Updated `CARD_WIDTH` constant from 200 → 240 (D-10)
- Added `UpcomingEventsSectionProps` interface with `isLoading?: boolean`
- Updated component signature to destructure `{ isLoading = false }`
- Added `skeletonOpacity` Animated.Value ref with `useEffect` fade-out (300ms) on `isLoading` change
- Replaced two-way conditional (empty/FlatList) with three-way (isLoading/empty/FlatList)
- Skeleton branch renders `Animated.View` with 2x `SkeletonPulse(width=240, height=160)`
- Updated `flatList.height` from 140 → 160 (D-10, Pitfall 2)
- Updated `placeholderCard` from 200×140 → 240×160 (D-10, Pitfall 3 — raw numbers)

### Task 2 — HomeScreen
- Changed `usePlans()` fire-and-forget to `const { loading: plansLoading } = usePlans()`
- Changed `<UpcomingEventsSection />` to `<UpcomingEventsSection isLoading={plansLoading} />`

## Task Commits

1. **Task 1: Add isLoading skeleton to UpcomingEventsSection, sync CARD_WIDTH=240, FlatList height=160** — `240f375` (feat)
2. **Task 2: Thread plansLoading from HomeScreen to UpcomingEventsSection** — `cdcd5af` (feat)

## Files Created/Modified

- `src/components/home/UpcomingEventsSection.tsx` — isLoading prop, skeleton branch, CARD_WIDTH=240, FlatList height=160, placeholderCard 240×160
- `src/screens/home/HomeScreen.tsx` — plansLoading extracted from usePlans(), isLoading prop threaded to UpcomingEventsSection

## Decisions Made

- Skeleton fade uses `Animated.timing` with `useNativeDriver: true` (opacity transition) — matches UI-SPEC 300ms duration
- `skeletonOpacity.setValue(1)` on `isLoading=true` resets the animation for repeated loading cycles (e.g. pull-to-refresh)
- Skeleton Animated.View uses inline style (not StyleSheet) for the row container — consistent with the pattern from 29-PATTERNS.md

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. TypeScript clean (0 errors in plan files). All 24 Jest tests pass.

## Known Stubs

None — skeleton is wired to live `plansLoading` from `usePlans()`.

## Threat Flags

None — changes are UI-only (loading state display). No new network endpoints, auth paths, or schema changes.

## User Setup Required

None — UI-only changes, no external service configuration required.

## Next Phase Readiness

- Phase 29 (Home Screen Overhaul) is now fully complete — all 5 plans executed
- HOME-08 (D-09/D-10) satisfied: events section shows shimmer skeleton while plans load
- EventCard (240×160), UpcomingEventsSection (CARD_WIDTH=240, height=160), and loading skeleton are all in sync

## Self-Check

Files exist:
- `src/components/home/UpcomingEventsSection.tsx` (modified) — FOUND
- `src/screens/home/HomeScreen.tsx` (modified) — FOUND

Commits:
- `240f375` — FOUND
- `cdcd5af` — FOUND

## Self-Check: PASSED
