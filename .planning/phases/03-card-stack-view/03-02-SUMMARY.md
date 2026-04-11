---
phase: 03-card-stack-view
plan: "02"
subsystem: home, animation, gesture
tags: [friend-card, swipe-gesture, reanimated, gesture-handler, DM-navigation]
dependency_graph:
  requires: [03-01]
  provides: [FriendSwipeCard, SwipeCardProps]
  affects: [src/components/home/FriendSwipeCard.tsx]
tech_stack:
  added: []
  patterns: [Gesture.Pan-v2, GestureDetector, runOnJS-worklet-bridge, FADING-opacity-wrapper]
key_files:
  created:
    - src/components/home/FriendSwipeCard.tsx
  modified: []
decisions:
  - FADING opacity applied via static wrapper View (not useSharedValue) to avoid useNativeDriver conflict with animated transforms
  - Skip button always exits right (dir=1) to give consistent UX; gesture swipe exits in swipe direction
  - nudgeLoading state disables Nudge button during async RPC call to mitigate T-03-04 DoS
metrics:
  duration: "~8 minutes"
  completed: "2026-04-11T12:03:00Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 3 Plan 02: FriendSwipeCard — Animated Swipeable Friend Card Summary

FriendSwipeCard with full visual design, Gesture.Pan swipe physics, Nudge/Skip actions, scroll conflict resolution, and FADING opacity.

## What Was Built

**Task 1 — FriendSwipeCard component (`src/components/home/FriendSwipeCard.tsx`):**

- **Visual layout:** 64px AvatarCircle left, name (FONT_SIZE.lg/semibold) + mood·context (FONT_SIZE.md/regular) + last-active time (FONT_SIZE.sm/secondary) stacked right
- **Card surface:** `COLORS.surface.card` (#2a2a2a) with `RADII.xl` (16px) corner radius, shadow (radius:12, opacity:0.4, elevation:8)
- **Status gradient:** Left-to-right `LinearGradient` wash at 15-18% opacity (free=green, maybe=yellow, busy=red) using `StyleSheet.absoluteFill` over the card
- **FADING opacity:** 60% opacity via static wrapper `View` (keeps animated transforms on native driver without conflict)
- **Pan gesture (RNGH v2):** `Gesture.Pan()` with `activeOffsetX([-10, 10])` + `failOffsetY([-15, 15])` for scroll conflict resolution
- **Swipe fly-off:** >35% screen width threshold triggers `withTiming` fly-off in swipe direction; `runOnJS(onSkip)()` called in animation callback
- **Undo gesture:** Downward pan >80px + velocity>500 springs card back to origin; `runOnJS(onUndo)()` called
- **Skip button:** 56px `COLORS.surface.overlay` circle, close icon, "Skip" label — tap animates card off right with haptic
- **Nudge button:** 56px `COLORS.interactive.accent` circle, chatbubble icon, "Nudge" label — tap calls `get_or_create_dm_channel` RPC and navigates to DM room
- **Nudge loading state:** `nudgeLoading` disables button during async RPC to prevent double-tap spam (T-03-04 mitigation)
- **Accessibility:** Card has descriptive `accessibilityLabel` with name, mood, context, last-active, and action hint; `accessibilityRole="none"` (buttons inside have their own roles)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | cc37218 | feat(03-02): implement FriendSwipeCard with pan gesture, Nudge/Skip |

## Verification

1. `grep "GestureDetector\|Gesture\.Pan" src/components/home/FriendSwipeCard.tsx` — both present
2. `grep "activeOffsetX\|failOffsetY" src/components/home/FriendSwipeCard.tsx` — both present
3. `grep "runOnJS" src/components/home/FriendSwipeCard.tsx` — 3 lines (import + onSkip + onUndo)
4. `grep "get_or_create_dm_channel" src/components/home/FriendSwipeCard.tsx` — present
5. `npx tsc --noEmit` — zero errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — FriendSwipeCard is fully wired. Props are injected by CardStackView (Plan 03).

## Threat Flags

None — the two trust boundaries (T-03-02 Spoofing, T-03-03 Information Disclosure) are accepted per plan threat model. T-03-04 DoS mitigation (nudgeLoading) is implemented.

## Self-Check: PASSED
