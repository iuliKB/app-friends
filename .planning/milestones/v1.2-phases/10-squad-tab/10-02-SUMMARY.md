---
phase: 10-squad-tab
plan: "02"
subsystem: squad
tags: [swipeable-tabs, animated, flatlist, activity-cards, pagingEnabled]
dependency_graph:
  requires:
    - 10-01 (CompactFriendRow component)
    - 09-02 (IOUCard)
    - 07-02 (BirthdayCard)
    - Phase 03 (StreakCard)
  provides:
    - src/app/(tabs)/squad.tsx (Squad/Activity swipeable tab screen)
  affects:
    - tests/visual/squad-dashboard.spec.ts (tests now GREEN)
tech_stack:
  added: []
  patterns:
    - Animated.ScrollView with pagingEnabled for zero-dep tab pager
    - scrollX Animated.Value drives indicator translateX on native thread
    - Staggered card entrance animations with hasAnimated guard
    - noUncheckedIndexedAccess-safe array access with non-null assertion
key_files:
  created: []
  modified:
    - src/app/(tabs)/squad.tsx
decisions:
  - COLORS.text.tertiary does not exist in theme — replaced with COLORS.border (icons) and COLORS.text.secondary (text)
  - cardAnims array access uses non-null assertion (!) to satisfy noUncheckedIndexedAccess strict mode
  - RADII.xs and RADII.md both exist in theme (4 and 8) — no fallbacks needed
metrics:
  duration_minutes: 10
  completed_date: "2026-04-16T09:10:00Z"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 10 Plan 02: Squad/Activity Swipeable Tabs Summary

**One-liner:** squad.tsx rewritten as animated two-tab pager (Squad friends list + Activity feature cards) using Animated.ScrollView pagingEnabled with native-thread underline indicator.

## What Was Built

### Task 1: Rewrite squad.tsx as Squad/Activity swipeable tabs

Replaced the single-FlatList dashboard (friends + cards in ListFooterComponent) with a two-tab swipeable screen:

**Tab header:**
- Two `Pressable` tab buttons ("Squad" / "Activity") each `flex: 1`
- `Animated.View` orange underline indicator driven by `scrollX.interpolate` → `translateX`; runs entirely on native thread via `useNativeDriver: true`
- Tab label opacity also animated from `scrollX` — active tab full opacity, inactive at 0.45

**Paged content (Animated.ScrollView with pagingEnabled):**
- `pagerRef` typed as `useRef<ScrollView>` for `scrollTo` compatibility
- `onScroll` uses `Animated.event` with `useNativeDriver: true` to feed `scrollX`
- `onMomentumScrollEnd` updates `activeTab` state for accessibility

**Page 0 — Squad tab:**
- `FlatList<FriendWithStatus>` with `CompactFriendRow` as `renderItem`
- `ListHeaderComponent`: Friend Requests row (conditional on `pendingCount > 0`)
- `ListEmptyComponent`: "No friends yet" with people icon
- `RefreshControl` fetches friends only (separate from Activity refresh)

**Page 1 — Activity tab:**
- Vertical `ScrollView` with `RefreshControl` (fetches streak + IOU + birthday data)
- Four `AnimatedCard` wrappers (opacity + translateY entrance, staggered 80ms apart)
- `StreakCard`, `IOUCard`, `BirthdayCard`, and "More coming soon" placeholder (dashed border, lock icon)
- `hasAnimated` ref guards against re-animation on pull-to-refresh

**Auto-fixed issues (Rule 1):**
1. `COLORS.text.tertiary` — does not exist in theme type. Replaced with `COLORS.border` for icons and `COLORS.text.secondary` for body text.
2. `cardAnims[n]` — `noUncheckedIndexedAccess` makes array element type `Animated.Value | undefined`. Applied non-null assertion (`!`) since the array is initialized with exactly 4 values.

## Verification Results

- `npx tsc --noEmit` → 0 errors
- `grep "pagingEnabled" src/app/(tabs)/squad.tsx` → match found
- `grep "Activity" src/app/(tabs)/squad.tsx` → match found
- `grep "CompactFriendRow" src/app/(tabs)/squad.tsx` → match found
- `grep "indicatorTranslateX" src/app/(tabs)/squad.tsx` → match found
- Both `ScrollView` and `FlatList` present (horizontal pager + vertical friend list)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] COLORS.text.tertiary missing from theme**
- **Found during:** Task 1 — TypeScript compilation
- **Issue:** `COLORS.text` type only has `primary` and `secondary`; no `tertiary` key
- **Fix:** Replaced all 3 occurrences — icon colors use `COLORS.border`, body text uses `COLORS.text.secondary`
- **Files modified:** `src/app/(tabs)/squad.tsx`
- **Commit:** 23a7f1e (included in task commit)

**2. [Rule 1 - Bug] noUncheckedIndexedAccess on cardAnims array**
- **Found during:** Task 1 — TypeScript compilation
- **Issue:** Array element type inferred as `Animated.Value | undefined` under strict mode
- **Fix:** Non-null assertion `!` on all 4 array accesses (`cardAnims[0]!` through `cardAnims[3]!`)
- **Files modified:** `src/app/(tabs)/squad.tsx`
- **Commit:** 23a7f1e (included in task commit)

## Known Stubs

None — all data hooks are wired to real Supabase data sources from previous phases.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 23a7f1e | feat(10-02): rewrite squad.tsx as Squad/Activity swipeable tabs |

## Self-Check: PASSED

- `src/app/(tabs)/squad.tsx` — FOUND (modified)
- commit 23a7f1e — FOUND
- `npx tsc --noEmit` — 0 errors

## Awaiting

Task 2 is `checkpoint:human-verify` — visual verification of the Squad/Activity tabs in Expo Go.
