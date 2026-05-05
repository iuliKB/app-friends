---
phase: 26-home-chat-polish
plan: "03"
subsystem: home-screen
tags: [empty-state, press-feedback, animation, spring, home]
dependency_graph:
  requires: [26-01]
  provides: [HOME-02, HOME-04]
  affects:
    - src/screens/home/HomeScreen.tsx
    - src/components/home/HomeFriendCard.tsx
    - src/components/home/HomeWidgetRow.tsx
    - src/components/status/OwnStatusCard.tsx
    - src/components/home/EventCard.tsx
tech_stack:
  added: []
  patterns:
    - Animated.spring scale 1.0→0.96→1.0 via onPressIn/onPressOut on Pressable and TouchableOpacity
    - ANIMATION.easing.spring.{damping,stiffness} tokens for consistent spring config
    - EmptyState component with ionicons icon and PrimaryButton CTA
key_files:
  created: []
  modified:
    - src/screens/home/HomeScreen.tsx
    - src/components/home/HomeFriendCard.tsx
    - src/components/home/HomeWidgetRow.tsx
    - src/components/status/OwnStatusCard.tsx
    - src/components/home/EventCard.tsx
decisions:
  - "EmptyState placed inline in ScrollView (not full-screen) — user sees status card + widgets above it, then the guiding card below"
  - "makeSpringHandlers factory pattern in HomeWidgetRow avoids duplicating spring config for 2 tiles"
  - "Animated.View wraps all card children so scale transform applies uniformly without clipping overflow"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-05"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 5
---

# Phase 26 Plan 03: Home Empty State and Press Feedback Summary

**One-liner:** Inline zero-friends EmptyState card with Squad CTA + Animated.spring scale 0.96 press feedback replacing opacity dimming on all 4 tappable home cards.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | HOME-02 zero-friends empty state card | b18d775 | src/screens/home/HomeScreen.tsx |
| 2 | HOME-04 scale spring on HomeFriendCard + HomeWidgetRow | 0200f6f | src/components/home/HomeFriendCard.tsx, src/components/home/HomeWidgetRow.tsx |
| 3 | HOME-04 scale spring on OwnStatusCard + EventCard | bafe445 | src/components/status/OwnStatusCard.tsx, src/components/home/EventCard.tsx |

## What Was Built

### HOME-02: Zero-Friends Empty State (HomeScreen)

- Added `useRouter` and `EmptyState` imports
- Added `handleNavigateToSquad` function calling `router.push('/(tabs)/squad')`
- Added inline EmptyState card below the Radar/Cards view switcher, rendered when `!loading && friends.length === 0`
- EmptyState shows: `people-outline` Ionicons icon, "No friends yet" heading, "Add a friend to see where they're at and make plans." body, "Add a friend" PrimaryButton CTA
- Condition is distinct from skeleton condition (`loading && friends.length === 0`) — mutually exclusive
- `loading={loading}` prop on RadarView and CardStackView preserved from Plan 01

### HOME-04: Scale Spring Press Feedback

Applied consistently across all 4 tappable home cards:

**HomeFriendCard** — Pressable pattern:
- Added `Animated`, `useRef`, `ANIMATION` imports
- `scaleAnim = useRef(new Animated.Value(1)).current`
- `handlePressIn` / `handlePressOut` with `Animated.spring` to 0.96 / 1.0
- Removed `pressed && styles.pressed` from Pressable style callback; replaced with static style array
- Removed `pressed: { opacity: 0.7 }` from StyleSheet
- Wrapped all children in `<Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>`

**HomeWidgetRow** — Pressable pattern (2 tiles):
- Added `Animated`, `useRef`, `ANIMATION` imports
- `iouScaleAnim` and `birthdayScaleAnim` per tile
- `makeSpringHandlers(anim)` factory returns `{ onPressIn, onPressOut }` spread onto each Pressable
- Removed `({ pressed }) => [styles.tile, pressed && styles.tilePressed]` — replaced with `style={styles.tile}`
- Removed `tilePressed: { opacity: 0.75 }` from StyleSheet
- Wrapped each tile's children in `<Animated.View style={{ transform: [{ scale: tileScaleAnim }] }}>`

**OwnStatusCard** — TouchableOpacity pattern:
- Added `ANIMATION` import
- `cardScaleAnim = useRef(new Animated.Value(1)).current`
- `handlePressIn` / `handlePressOut` added to component body
- Set `activeOpacity={1.0}` (was 0.85) to disable opacity double-feedback
- Added `onPressIn` / `onPressOut` props to TouchableOpacity
- Wrapped topRow + bottomRow in `<Animated.View style={{ transform: [{ scale: cardScaleAnim }] }}>`

**EventCard** — TouchableOpacity pattern:
- Added `Animated`, `useRef`, `ANIMATION` imports
- `cardScaleAnim = useRef(new Animated.Value(1)).current`
- `handlePressIn` / `handlePressOut` added before `handlePress`
- Set `activeOpacity={1.0}` (was 0.8)
- Added `onPressIn` / `onPressOut` props to TouchableOpacity
- Wrapped all content in `<Animated.View style={{ transform: [{ scale: cardScaleAnim }], flex: 1, justifyContent: 'flex-end' }}>`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all implementations are fully wired with real data and navigation.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. Navigation uses internal Expo Router paths only (T-26-05 accepted).

## Self-Check: PASSED

- src/screens/home/HomeScreen.tsx: FOUND (contains handleNavigateToSquad, !loading && friends.length === 0, "No friends yet")
- src/components/home/HomeFriendCard.tsx: FOUND (contains scaleAnim, ANIMATION.easing.spring.damping, no opacity: 0.7)
- src/components/home/HomeWidgetRow.tsx: FOUND (contains iouScaleAnim, birthdayScaleAnim, makeSpringHandlers, no opacity: 0.75)
- src/components/status/OwnStatusCard.tsx: FOUND (contains cardScaleAnim, activeOpacity={1.0}, ANIMATION.easing.spring.damping)
- src/components/home/EventCard.tsx: FOUND (contains cardScaleAnim, activeOpacity={1.0}, ANIMATION.easing.spring.damping)
- Commits b18d775, 0200f6f, bafe445: all present in git log
