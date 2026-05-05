---
phase: 27-plans-squad-polish
plan: "04"
subsystem: plans-explore-squad
tags: [skeleton, empty-state, animation-tokens, plans, map, squad]
dependency_graph:
  requires: [27-02]
  provides: [PLANS-01, PLANS-04, SQUAD-03]
  affects: [PlansListScreen, ExploreMapView, squad]
tech_stack:
  added: []
  patterns:
    - PlanCardSkeleton used in PlansListScreen list-view loading gate
    - absoluteFill overlay with pointerEvents=none for non-interactive map empty state
    - ANIMATION.duration.staggerDelay replaces raw magic number in Animated.stagger
key_files:
  created: []
  modified:
    - src/screens/plans/PlansListScreen.tsx
    - src/components/maps/ExploreMapView.tsx
    - src/app/(tabs)/squad.tsx
decisions:
  - "D-03/D-04 enforced: skeleton condition is loading && plans.length === 0, list view only (invitations modal is unaffected)"
  - "D-09 enforced: empty state copy is exactly 'No plans nearby' / 'None of your friends have plans within 25km.'"
  - "ANIMATION.duration.staggerDelay (= 80) is now the single authoritative source; raw 80 removed from squad.tsx"
metrics:
  duration_minutes: 10
  completed_date: "2026-05-05"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Phase 27 Plan 04: Structural UI Wiring — Skeleton, Map Empty State, Stagger Token Summary

**One-liner:** Wired PlanCardSkeleton loading gate in PlansListScreen, absoluteFill empty-state overlay in ExploreMapView, and ANIMATION.duration.staggerDelay token replacing raw 80 in squad.tsx.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire skeleton loading in PlansListScreen (PLANS-01) | 33871a4 | src/screens/plans/PlansListScreen.tsx |
| 2 | Add map empty state overlay (PLANS-04) | 1e4d579 | src/components/maps/ExploreMapView.tsx |
| 3 | Replace raw 80 with staggerDelay token (SQUAD-03) | a916157 | src/app/(tabs)/squad.tsx |

## What Was Built

### Task 1 — PlansListScreen skeleton (PLANS-01)
- Added `import { PlanCardSkeleton } from '@/components/plans/PlanCardSkeleton'`
- Added `loading` to the `usePlans()` destructure
- Inserted a ternary guard before the plans FlatList: when `loading && plans.length === 0`, renders 3 `PlanCardSkeleton` cards in a padded View instead of the FlatList
- The Invitations Modal is a separate code path and is unaffected (D-04 enforced)

### Task 2 — ExploreMapView empty state overlay (PLANS-04)
- Added `Text` to react-native imports; added `Ionicons` from `@expo/vector-icons`
- Expanded `@/theme` import with `SPACING`, `RADII`, `FONT_SIZE`, `FONT_FAMILY`
- Added `emptyCard`, `emptyHeading`, `emptyBody` styles in the `useMemo([colors])` StyleSheet
- Added `absoluteFill` overlay after `</MapView>` inside the root View: triggers when `visiblePlans.length === 0`
- `pointerEvents="none"` on the overlay container ensures map pins and pan/zoom remain fully interactive (T-27-04-01 mitigated)
- D-09 locked copy: "No plans nearby" / "None of your friends have plans within 25km."

### Task 3 — squad.tsx stagger token (SQUAD-03)
- Added `ANIMATION` to the existing `@/theme` import line
- Replaced `Animated.stagger(80, ...)` with `Animated.stagger(ANIMATION.duration.staggerDelay, ...)`
- `AnimatedCard` function left completely untouched (opacity + translateY both intact)
- `duration: 300`, `useNativeDriver: true`, `hasAnimated.current` guard — all unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three additions are wired to live data (loading state from usePlans, visiblePlans from ExploreMapView computed memo, ANIMATION token from theme).

## Threat Flags

None — no new network endpoints or auth paths introduced. T-27-04-01 (map overlay intercept) mitigated via `pointerEvents="none"` as planned.

## Self-Check: PASSED

- FOUND: src/screens/plans/PlansListScreen.tsx
- FOUND: src/components/maps/ExploreMapView.tsx
- FOUND: src/app/(tabs)/squad.tsx
- FOUND commit 33871a4 (Task 1)
- FOUND commit 1e4d579 (Task 2)
- FOUND commit a916157 (Task 3)
