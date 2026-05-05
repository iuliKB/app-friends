---
phase: 27-plans-squad-polish
plan: "05"
subsystem: plans-components, squad-components
tags: [animation, haptics, spring, rsvp, wish-list]
dependency_graph:
  requires: [27-01, 27-02]
  provides: [PLANS-02, SQUAD-04]
  affects: []
tech_stack:
  added: []
  patterns: [Animated.Value-per-button, AnimatedTouchable, spring-press-feedback, fire-and-forget-haptic]
key_files:
  created: []
  modified:
    - src/components/plans/RSVPButtons.tsx
    - src/components/plans/__tests__/RSVPButtons.test.tsx
    - src/components/squad/WishListItem.tsx
    - src/components/squad/__tests__/WishListItem.test.tsx
decisions:
  - "Three separate Animated.Values in RSVPButtons — one per button (going/maybe/out); never shared to ensure only tapped button animates"
  - "AnimatedTouchable defined at module scope (not inside component) to avoid re-creation on re-render"
  - "triggerBounce guard mirrors handlePress guard — both check savingRsvp !== null || disabled before acting"
  - "Animated.View wrapper pattern for WishListItem Pressable — scale on the wrapper, not on the Pressable itself"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-05"
  tasks_completed: 2
  files_modified: 4
---

# Phase 27 Plan 05: RSVP Spring Bounce + WishListItem Press Feedback Summary

**One-liner:** RSVPButtons gets per-button overshoot spring (0.92→1.05→1.0) with selectionAsync haptic; WishListItem Pressable gets Animated.View compress-and-release spring (1.0→0.96→1.0).

## What Was Built

### Task 1: RSVP spring bounce + haptic (40ae9a3)

Refactored `src/components/plans/RSVPButtons.tsx` to add PLANS-02 interaction polish:

- `AnimatedTouchable` created at module scope via `Animated.createAnimatedComponent(TouchableOpacity)`
- `scaleAnims` ref with three independent `Animated.Value(1)` instances — one per button (going, maybe, out)
- `triggerBounce(value)` function: guards on `savingRsvp !== null || disabled`, fires `Haptics.selectionAsync()` fire-and-forget, then runs `Animated.sequence` with 3 spring steps (0.92 → 1.05 → 1.0) on only the tapped button's anim
- Button render updated: `TouchableOpacity` → `AnimatedTouchable`, `{ transform: [{ scale: scaleAnims[value] }] }` added to style, `onPress` now calls `triggerBounce` then `handlePress`
- All existing guards (`disabled`, `savingRsvp`), loading spinners, `activeOpacity={0.8}`, and accessibility props preserved

Test: promoted the `selectionAsync` assertion from `toBeDefined()` to `toHaveBeenCalledTimes(1)`. The disabled guard test (`does not call haptics when disabled={true}`) was already meaningful and passes.

### Task 2: WishListItem spring press feedback (93ab249)

Updated `src/components/squad/WishListItem.tsx` to add SQUAD-04 interaction polish:

- Added `useRef` and `Animated` imports; added `ANIMATION` to theme import
- `scaleAnim = useRef(new Animated.Value(1)).current` added inside component function
- Pressable wrapped in `<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>` 
- `onPressIn`: spring to `0.96` using `ANIMATION.easing.spring` spread + `useNativeDriver: true`
- `onPressOut`: spring to `1.0` using same config
- `pressed && { opacity: 0.7 }` style removed; Pressable `style` changed from function `({ pressed }) => [...]` to plain array `[...]`
- All children, `accessibilityLabel`, and `onPress={onToggleClaim}` preserved unchanged

Test: promoted spring spy assertion from `expect(springSpy).toBeDefined()` to `expect(springSpy).toHaveBeenCalled()`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both components are fully wired to their animation values with no placeholders.

## Threat Flags

None — both changes are client-only animation/haptic additions. T-27-05-01 (DoS guard) is mitigated by the `if (savingRsvp !== null || disabled) return` guard in `triggerBounce`. T-27-05-02 (optimistic haptic) is accepted per plan.

## Self-Check: PASSED

- [x] `src/components/plans/RSVPButtons.tsx` exists with `scaleAnims`, `selectionAsync`, `AnimatedTouchable`, `toValue: 0.92`, `toValue: 1.05`
- [x] `src/components/squad/WishListItem.tsx` exists with `scaleAnim`, `toValue: 0.96`, `Animated.View`, no `opacity: 0.7`
- [x] Commit 40ae9a3 exists (Task 1)
- [x] Commit 93ab249 exists (Task 2)
- [x] All 15 tests pass (0 failures)
