---
phase: 02-radar-view-view-toggle
plan: 02
subsystem: home-radar
tags: [radar, bubble, animation, pulse-ring, overflow-chip, interactions]
dependency_graph:
  requires: []
  provides: [RadarBubble, BubbleSizeMap, OverflowChip]
  affects: [RadarView (Plan 03)]
tech_stack:
  added: []
  patterns: [Animated.loop-isInteraction-false, expo-linear-gradient, Pressable-tap-longpress]
key_files:
  created:
    - src/components/home/RadarBubble.tsx
    - src/components/home/OverflowChip.tsx
  modified: []
decisions:
  - "PulseRing uses useNativeDriver: true with transform scale (not width/height) to stay on native thread"
  - "Resize animation uses useNativeDriver: false — width/height layout props require JS driver (commented in code)"
  - "isInteraction: false on all Animated.timing calls (3 total) to avoid blocking JS thread (D-04)"
  - "showGradient === isAlive ensures FADING friends get no gradient (matches spec)"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-11"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 02 Plan 02: RadarBubble and OverflowChip Summary

RadarBubble with embedded PulseRing (ALIVE-only, 1.7x scale loop) and OverflowChip (34px avatar with 8px status dot) — visual building blocks for RadarView (Plan 03).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RadarBubble with embedded PulseRing | 158b759 | src/components/home/RadarBubble.tsx |
| 2 | OverflowChip component | 4a4ac43 | src/components/home/OverflowChip.tsx |

## What Was Built

### RadarBubble (`src/components/home/RadarBubble.tsx`)

Exported: `RadarBubble`, `BubbleSizeMap`

- **Sized bubbles:** Free=64px, Maybe=48px, Busy/Dead=36px via `BubbleSizeMap`
- **PulseRing sub-component:** scale 1.0→1.7, 1200ms expand + 600ms pause loop, `useNativeDriver: true`, `isInteraction: false`
- **Status gradient:** `expo-linear-gradient` (ALIVE only — FADING/DEAD skip gradient), center-to-corner via `start={0.5,0.5} end={1,1}`
- **Depth effect:** `depthScale` (transform scale) and `depthOpacity` multipliers applied via outer `Animated.View`
- **Resize animation:** `Animated.timing` with `useNativeDriver: false` (required for width/height layout props)
- **FADING:** opacity 0.6, name label in `COLORS.text.secondary`, no gradient
- **DEAD:** opacity 0.5
- **Tap:** `supabase.rpc('get_or_create_dm_channel')` → router.push to DM; error: "Couldn't open chat. Try again."
- **Long-press (400ms delay):** `showActionSheet` with "View profile" + "Plan with [firstName]..."
- **hitSlop:** `{top:4,bottom:4,left:4,right:4}` when `bubbleSize < 44` for 44px effective touch area
- **Accessibility:** descriptive label including fading state, "Tap to message, hold for more."

### OverflowChip (`src/components/home/OverflowChip.tsx`)

Exported: `OverflowChip`

- **34px AvatarCircle** wrapped in Pressable (no onPress passed to AvatarCircle)
- **8×8px status dot** (borderRadius 4), bottom-right of avatar
  - DEAD → `COLORS.text.secondary`
  - FADING → status color at 0.6 opacity
  - ALIVE → status color at full opacity
- **hitSlop:** `{top:5,bottom:5,left:5,right:5}` for 44px effective touch area
- **Tap:** same DM navigation as RadarBubble
- **marginRight: SPACING.sm** for chip row spacing
- **No name label** (avatar-only per D-20)

## Decisions Made

1. `useNativeDriver: false` for width/height resize animation — explicitly commented in code since it's a non-obvious constraint (native driver only supports transform/opacity).
2. `showGradient === isAlive` is the sole condition — FADING is `heartbeatState === 'fading'` which is not `'alive'`, so FADING correctly skips gradient without extra branching.
3. PulseRing receives `targetSize` (not `sizeAnim`) since it uses scale transform, not absolute dimensions — safe for native driver.
4. `isInteraction: false` on all 3 Animated.timing calls (PulseRing expand, PulseRing opacity, resize) — satisfies T-02-05 DoS mitigation from threat model.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both components are complete with real Supabase RPC calls and routing.

## Threat Flags

None — no new network endpoints or auth paths beyond the existing get_or_create_dm_channel pattern already used in HomeFriendCard (T-02-03 accepted, T-02-04 accepted, T-02-05 mitigated via isInteraction: false).

## Self-Check: PASSED

- [x] `src/components/home/RadarBubble.tsx` exists (284 lines)
- [x] `src/components/home/OverflowChip.tsx` exists (76 lines)
- [x] Commit 158b759 exists (RadarBubble)
- [x] Commit 4a4ac43 exists (OverflowChip)
- [x] `npx tsc --noEmit` exits 0
- [x] isInteraction: false count = 3 (>= 2 required)
- [x] BubbleSizeMap: free=64, maybe=48, busy=36, dead=36
