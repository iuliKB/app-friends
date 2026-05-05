---
phase: 27-plans-squad-polish
plan: "02"
subsystem: theme, plans-components
tags: [animation, skeleton, theme-token, plan-card]
dependency_graph:
  requires: [27-01]
  provides: [ANIMATION.duration.staggerDelay, PlanCardSkeleton]
  affects: [27-03, 27-04]
tech_stack:
  added: []
  patterns: [useMemo-colors, SkeletonPulse-width-wrapper]
key_files:
  created:
    - src/components/plans/PlanCardSkeleton.tsx
  modified:
    - src/theme/animation.ts
    - src/theme/__tests__/animation.test.ts
decisions:
  - "staggerDelay: 80 added to ANIMATION.duration as the authoritative source for squad card stagger interval"
  - "PlanCardSkeleton uses View wrapper pattern for partial-width SkeletonPulse (60%/40%/30%) per D-02 type contract"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-05"
  tasks_completed: 2
  files_modified: 3
---

# Phase 27 Plan 02: Animation Token + PlanCardSkeleton Summary

**One-liner:** Added `staggerDelay: 80` animation token and created `PlanCardSkeleton` shimmer placeholder matching PlanCard outer styles exactly.

## What Was Built

### Task 1: staggerDelay token (e43962b)

Added `staggerDelay: 80` to `ANIMATION.duration` in `src/theme/animation.ts`. This is the authoritative source for the squad dashboard card stagger interval — plan 03 replaces the raw `80` in `squad.tsx` with this token.

Also promoted the TDD RED `it.failing` test to a plain `it()` in `src/theme/__tests__/animation.test.ts` — the token now exists so the test is expected to pass. All 7 animation tests pass.

### Task 2: PlanCardSkeleton component (94c7940)

Created `src/components/plans/PlanCardSkeleton.tsx` as a new named export. Structure:
- Outer card: exact mirror of `PlanCard`'s card style (`surface.card`, `RADII.lg`, `border`, `SPACING.lg`)
- Image block: `SkeletonPulse width="100%" height={140}` — full-width, 140px
- Title bar: `View style={{ width: '60%' }}` wrapping `SkeletonPulse width="100%" height={20}`
- Meta line 1: `View style={{ width: '40%' }}` wrapping `SkeletonPulse width="100%" height={14}`
- Meta line 2: `View style={{ width: '30%' }}` wrapping `SkeletonPulse width="100%" height={14}`

The View wrapper pattern is required because `SkeletonPulse` only accepts `number | '100%'` for width (D-02 contract from Phase 24). Passing `"60%"` directly would be a type error.

`StyleSheet.create` is inside `useMemo([colors])` per the v1.6 `useTheme()` pattern decision.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `PlanCardSkeleton` is a complete, self-contained display component with no data dependencies or placeholders.

## Threat Flags

None — pure UI component with no network calls, auth paths, or storage access.

## Self-Check: PASSED

- [x] `src/theme/animation.ts` exists and contains `staggerDelay: 80`
- [x] `src/components/plans/PlanCardSkeleton.tsx` exists with `export function PlanCardSkeleton`
- [x] Commit e43962b exists (Task 1)
- [x] Commit 94c7940 exists (Task 2)
- [x] All 7 animation tests pass (0 failures)
