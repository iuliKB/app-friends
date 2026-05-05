---
phase: 26
plan: "01"
subsystem: home-ui
tags: [skeleton, loading-states, ux-polish, test-scaffolds]
dependency_graph:
  requires: [24-01]  # SkeletonPulse component from Phase 24
  provides: [HOME-01-radar-skeleton, HOME-01-cardstack-skeleton, wave0-test-scaffolds]
  affects: [src/components/home/RadarView.tsx, src/components/home/CardStackView.tsx, src/screens/home/HomeScreen.tsx]
tech_stack:
  added: []
  patterns: [SkeletonPulse shimmer, loading prop guard (loading && friends.length === 0), TDD RED scaffold]
key_files:
  created:
    - tests/unit/fadingPulse.test.ts
    - tests/unit/useChatRoom.send.test.ts
  modified:
    - src/components/home/RadarView.tsx
    - src/components/home/CardStackView.tsx
    - src/screens/home/HomeScreen.tsx
decisions:
  - "Skeleton condition is loading && friends.length === 0 — pull-to-refresh keeps existing content visible (D-03)"
  - "RadarView blob left positions use percentage strings ('12%', '50%', '68%') — valid React Native DimensionValue for absolute-positioned View children"
  - "CardStackView skeleton gated on cardWidth > 0 to match existing onLayout measurement pattern before rendering"
  - "Empty state in RadarView guarded with !loading to avoid showing 'No friends yet' during skeleton phase"
metrics:
  duration_minutes: 10
  completed_date: "2026-05-05"
  tasks_completed: 3
  files_modified: 5
---

# Phase 26 Plan 01: Home Skeleton Loading States Summary

**One-liner:** SkeletonPulse shimmer placeholders wired into RadarView (3 circular blobs) and CardStackView (2 stacked cards) with HomeScreen loading prop, plus Wave 0 TDD RED scaffolds for fadingPulse and sendMessage failure path.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave 0 test scaffolds | d9ee9d2 | tests/unit/fadingPulse.test.ts, tests/unit/useChatRoom.send.test.ts |
| 2 | RadarView skeleton | e375043 | src/components/home/RadarView.tsx |
| 3 | CardStackView skeleton + HomeScreen wiring | 3e06d23 | src/components/home/CardStackView.tsx, src/screens/home/HomeScreen.tsx |

## What Was Built

### Task 1: Wave 0 Test Scaffolds

- `tests/unit/fadingPulse.test.ts`: 3 tests for `FADING_PULSE_COLOR` constant export from `RadarBubble.tsx`. Currently RED — Plan 02 will add the constant to make them GREEN.
- `tests/unit/useChatRoom.send.test.ts`: 6 tests for pure `applyFailure`/`applyRetry` state mutation logic. Tests pass GREEN (pure function logic is independent of the `failed?: boolean` type addition Plan 05 will make).

### Task 2: RadarView Skeleton

Added `loading?: boolean` prop to `RadarViewProps`. When `loading && friends.length === 0`, renders 3 `SkeletonPulse` circles at static absolute positions matching typical RadarView scatter:
- Blob 1: size 80px at left 12%, top 30
- Blob 2: size 64px at left 50%, top 75
- Blob 3: size 48px at left 68%, top 18

The empty state ("No friends yet") is now guarded with `!loading` to prevent it from flashing during the loading phase.

### Task 3: CardStackView Skeleton + HomeScreen Wiring

Added `loading?: boolean` to `CardStackViewProps`. When `loading && friends.length === 0 && cardWidth > 0`, renders 2 `SkeletonPulse` rectangles (each `width=cardWidth`, `height=80`) with `SPACING.sm` (8px) gap between them. The `cardWidth > 0` gate matches the existing onLayout measurement pattern used by the real deck rendering.

HomeScreen now passes `loading={loading}` to both `<RadarView>` and `<CardStackView>`.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- All 9 existing unit test files pass (fadingPulse.test.ts is RED as expected — plan-required scaffold state)
- No TypeScript errors introduced in modified files (pre-existing errors in profile.tsx, friends/[id].tsx, SendBar.tsx are out of scope)
- Acceptance criteria verified via grep for all key strings

## Known Stubs

None — all skeleton placeholders are fully wired to the `loading` prop from `useHomeScreen()`.

## Threat Flags

None — skeleton renders only generic shapes, no PII involved. SkeletonPulse animation uses `useNativeDriver: true` and `isInteraction: false` (already mitigated in Phase 24).

## Self-Check: PASSED

- [x] tests/unit/fadingPulse.test.ts exists
- [x] tests/unit/useChatRoom.send.test.ts exists
- [x] src/components/home/RadarView.tsx contains `loading?: boolean`, `SkeletonPulse`, `SKELETON_BLOBS`, `loading && friends.length === 0`
- [x] src/components/home/CardStackView.tsx contains `loading?: boolean`, `SkeletonPulse`, `loading && friends.length === 0 && cardWidth > 0`, `SPACING.sm`, two `height={80}` calls
- [x] src/screens/home/HomeScreen.tsx contains `loading={loading}` in both RadarView and CardStackView call sites
- [x] Commits d9ee9d2, e375043, 3e06d23 exist
