---
phase: 03-card-stack-view
plan: "04"
subsystem: home, integration
tags: [homescreen, card-stack, wiring, placeholder-removal]
dependency_graph:
  requires: [03-03]
  provides: [HomeScreen-CardStackView-integration]
  affects: [src/screens/home/HomeScreen.tsx]
tech_stack:
  added: []
  patterns: [crossfade-animated-view, CardStackView-wired]
key_files:
  created: []
  modified:
    - src/screens/home/HomeScreen.tsx
decisions:
  - Removed FONT_SIZE, FONT_WEIGHT, RADII from HomeScreen theme import — all three were only used by the removed placeholder styles
metrics:
  duration: "~5 minutes"
  completed: "2026-04-11T14:40:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 1
---

# Phase 3 Plan 04: HomeScreen Wiring — CardStackView Integration Summary

HomeScreen cards branch now renders `<CardStackView friends={friends} />` instead of the placeholder; all dead placeholder JSX and styles removed. Human verification completed — swipe, skip, nudge, loop, and toggle all work; swipe-down undo is blocked by pull-to-refresh (deferred to gap closure).

## What Was Built

**Task 1 — Replace placeholder with CardStackView (`src/screens/home/HomeScreen.tsx`):**

- **Import added:** `import { CardStackView } from '@/components/home/CardStackView'`
- **Placeholder replaced:** `<View style={styles.cardsPlaceholder}>...</View>` (lines 127-130) replaced with `<CardStackView friends={friends} />`
- **Dead styles removed:** `cardsPlaceholder`, `placeholderHeading`, `placeholderBody` entries deleted from `StyleSheet.create`
- **Unused theme tokens removed:** `FONT_SIZE`, `FONT_WEIGHT`, `RADII` removed from `@/theme` import (were only used by removed styles)
- **Animated.View crossfade wrapper unchanged** — `styles.absoluteFill`, `opacity: cardsOpacity`, `pointerEvents` logic all untouched
- **RadarView and RadarViewToggle untouched** — radar branch fully preserved
- **Text import kept** — still used by error state rendering at line 109
- **TypeScript:** zero errors (`npx tsc --noEmit` exit 0)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 99e65e8 | feat(03-04): wire CardStackView into HomeScreen, remove placeholder |

## Verification

1. `grep "CardStackView" src/screens/home/HomeScreen.tsx` — import (line 22) and usage (line 128) both present
2. `grep "cardsPlaceholder\|placeholderHeading\|placeholderBody"` — returns nothing (dead code removed)
3. `grep "Cards View\|Coming in the next update"` — returns nothing (placeholder strings gone)
4. `grep "RadarView\|RadarViewToggle"` — both present (lines 21, 20, 122, 115)
5. `npx tsc --noEmit` — exit 0, zero errors
6. Human checkpoint (Task 2): completed — steps 1–10 and 12–13 pass; step 11 (swipe-down undo) blocked by pull-to-refresh conflict (see Known Issues below)

## Deviations from Plan

**1. [Rule 2 - Missing] Removed unused theme imports**
- **Found during:** Task 1 cleanup
- **Issue:** After removing placeholder styles, `FONT_SIZE`, `FONT_WEIGHT`, and `RADII` became unused imports
- **Fix:** Trimmed `@/theme` import to only `COLORS, SPACING` (both still used in remaining styles)
- **Files modified:** `src/screens/home/HomeScreen.tsx`
- **Commit:** 99e65e8 (same task commit)

## Known Issues

### Swipe-Down Undo Conflicts with Pull-to-Refresh (D-10)

**Reported:** User during Task 2 human verification (2026-04-11)
**Severity:** Feature gap — swipe-down undo gesture (D-10) is non-functional when CardStackView is inside the HomeScreen ScrollView
**Status:** Deferred to gap closure

**Root cause:**

`HomeScreen.tsx` renders `CardStackView` inside a `ScrollView` that has a `RefreshControl` attached (lines 88–98). The `ScrollView` owns the vertical pan gesture and triggers pull-to-refresh on a downward drag before `FriendSwipeCard` can claim it.

`FriendSwipeCard.tsx` configures its `Gesture.Pan()` with `.failOffsetY([-15, 15])` (line 115) — this intentionally yields the gesture to the parent `ScrollView` when vertical movement exceeds 15px before the horizontal threshold is crossed. As a result, the undo gesture path in `onEnd` (lines 129–133, requiring `translationY > 80` and `velocityY > 500`) is never reached.

**Affected files:**
- `src/screens/home/HomeScreen.tsx` — `ScrollView` + `RefreshControl` wraps `CardStackView`
- `src/components/home/FriendSwipeCard.tsx` — `.failOffsetY([-15, 15])` yields vertical pan to `ScrollView`

**Fix options for gap closure:**
1. Disable `RefreshControl` when the cards view is active (mirror the `pointerEvents` pattern already on the `Animated.View` crossfade wrapper)
2. Use `simultaneousWithExternalGesture` or `blocksExternalGesture` on the pan gesture to coordinate with the `ScrollView`
3. Move `CardStackView` outside the `ScrollView` so it has its own gesture context, with refresh available only on the radar branch

## Known Stubs

None — `CardStackView` is fully wired with real `friends` data from `useHomeScreen`. No placeholder text or hardcoded data.

## Threat Flags

None — T-03-07 (friends prop to CardStackView) accepted per plan: friends data was already accessible to HomeScreen for RadarView; passing it to CardStackView introduces no new exposure.

## Self-Check: PASSED
