---
phase: 33-friend-profile-redesign
plan: "03"
subsystem: ui-components
tags: [ui, components, reanimated, header, blurred-wash, friend-profile, phase-33]
dependency_graph:
  requires: []
  provides:
    - AvatarCircle.onLoad (onLoad prop pass-through for blurred-wash trigger)
    - FriendProfileBlurredWash (Z-stacked blurred avatar backdrop — D-02 / REQ-FP-05)
    - FriendProfileHeader (Telegram-style collapsing header — D-01 / D-07 / REQ-FP-04)
  affects:
    - src/components/common/AvatarCircle.tsx (non-breaking prop add)
    - src/components/friends/FriendProfileBlurredWash.tsx (new)
    - src/components/friends/FriendProfileHeader.tsx (new)
tech_stack:
  added: []
  patterns:
    - Reanimated v4 useDerivedValue for scroll-driven SharedValue composition
    - expo-image blurRadius={40} for GPU-side blur (NOT expo-blur BlurView)
    - useReducedMotion short-circuit on every useAnimatedStyle block
    - useTheme().isDark for dark/light gradient switching (useTheme returns isDark, not mode)
key_files:
  created:
    - src/components/friends/FriendProfileBlurredWash.tsx
    - src/components/friends/FriendProfileHeader.tsx
  modified:
    - src/components/common/AvatarCircle.tsx
decisions:
  - surface.elevated not used — all references resolve to colors.surface.card per PATTERNS §Corrections row 2
  - useTheme() returns isDark (boolean), not mode string — FriendProfileBlurredWash uses isDark for gradient switching
  - FriendProfileHeader does NOT own scrollY — consumed as prop so Stack.Screen headerTitle (Plan 06) shares same SharedValue reference
  - washOpacity passed to FriendProfileBlurredWash as useDerivedValue (which IS a SharedValue<number>) — type-correct
  - No UI-SPEC interpolation ranges adjusted — all verbatim from the animation contract
metrics:
  duration: "3 min"
  completed: "2026-05-13"
  tasks: 3
  files: 3
---

# Phase 33 Plan 03: Header Components (AvatarCircle + BlurredWash + Header) Summary

Three header-area components built as pure presentational components. The collapsing-header animation is fully spec'd here; Plan 06 imports finished components rather than mixing layout with data.

## What Was Built

**Task 1 — AvatarCircle.tsx (modified)**
Added `onLoad?: () => void` as an optional prop to `AvatarCircleProps`. Forwarded to the inner `<Image>` element. Non-breaking: all existing callers unaffected. This unblocks `FriendProfileBlurredWash` from triggering its cross-fade on image decode.

**Task 2 — FriendProfileBlurredWash.tsx (new)**
Blurred avatar backdrop rendered via `expo-image` native `blurRadius={40}` (NOT `expo-blur` BlurView per RESEARCH). Overlay `LinearGradient` with dark/light gradient stops from UI-SPEC §Blurred-Avatar Wash Technique. Cross-fade on avatar load: `withTiming` over `ANIMATION.duration.normal` (300ms). Composes scroll-driven `washOpacity` SharedValue (passed by parent) with local `loadOpacity` SharedValue: final `opacity = washOpacity.value * loadOpacity.value`. Falls back to `colors.surface.card` solid rectangle when `avatarUrl` is null.

**Task 3 — FriendProfileHeader.tsx (new)**
Telegram-style collapsing header. Receives `scrollY` as a prop (parent screen owns it). Three `useAnimatedStyle` blocks (avatarStyle, nameStyle, statusPillStyle) each with `if (reducedMotion)` short-circuit to static collapsed values. `washOpacity` derived via `useDerivedValue` (a SharedValue) and passed to `FriendProfileBlurredWash`. Layout: Z-stacked View with BlurredWash at back + centered column containing avatar/name/username/status pill. StatusPill renders only when `status !== null` (D-07).

## Key Output Details for Plan 06

### FriendProfileHeaderProps shape (Plan 06 consumes this verbatim)

```typescript
interface FriendProfileHeaderProps {
  scrollY: SharedValue<number>;     // owned by parent screen
  displayName: string;
  username: string;
  avatarUrl: string | null;
  status: StatusValue | null;       // StatusValue = 'free' | 'busy' | 'maybe'
  contextTag: string | null;
  statusExpiresAt: string | null;
  lastActiveAt: string | null;
  onAvatarPress?: () => void;
}
```

### scrollY ownership
`scrollY` is consumed as a prop in `FriendProfileHeader` — it is NOT owned here. The parent screen (Plan 06) creates `const scrollY = useSharedValue(0)` and also passes it to `Stack.Screen options.headerTitle` for the nav-title cross-fade. This matches UI-SPEC §Reanimated Implementation Notes line 643.

### useTheme() `isDark` vs `mode`
`useTheme()` returns `{ colors, isDark, theme, setTheme }`. There is no `mode` field. `FriendProfileBlurredWash` uses `isDark` (boolean) to select between dark and light gradient stops. This was discovered by reading `src/theme/ThemeContext.tsx` — adjusted from the plan's draft code which referenced `mode`.

### surface.elevated NOT used
`surface.elevated` does not exist in the theme (`src/theme/colors.ts` and `light-colors.ts` expose only `surface.base`, `surface.card`, `surface.overlay`). All fallback usages resolved to `colors.surface.card` per PATTERNS §Corrections row 2. Verified by `grep -c "surface.elevated" src/components/friends/FriendProfileBlurredWash.tsx` → 0 (the two hits are in comments only).

### Interpolation ranges
All ranges used verbatim from UI-SPEC §Header Collapse Animation Contract. No adjustments needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Adjustment] useTheme() mode → isDark**
- **Found during:** Task 2
- **Issue:** Plan's draft code referenced `const { colors, mode } = useTheme()` but `ThemeContext.tsx` exposes `isDark: boolean`, not `mode: string`.
- **Fix:** Used `isDark` for the dark/light gradient switching ternary in `FriendProfileBlurredWash`.
- **Files modified:** `src/components/friends/FriendProfileBlurredWash.tsx`
- **Commit:** 710c572

## Manual Hardware Smoke Gates Carried Forward

- **REQ-FP-04** (header collapse on device) — Reanimated v4 scroll-driven animation cannot be reliably tested in jsdom. Manual smoke deferred to Plan 06 SUMMARY after screen assembly.
- **REQ-FP-05** (wash fade-in on real avatar decode) — `expo-image` `onLoad` fires on native image decode; jsdom cannot simulate GPU-side blur + native decode timing. Manual smoke deferred to Plan 06 SUMMARY.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `src/components/common/AvatarCircle.tsx` | FOUND |
| `src/components/friends/FriendProfileBlurredWash.tsx` | FOUND |
| `src/components/friends/FriendProfileHeader.tsx` | FOUND |
| `.planning/phases/33-friend-profile-redesign/33-03-SUMMARY.md` | FOUND |
| Commit c18ce04 (AvatarCircle onLoad) | FOUND |
| Commit 710c572 (FriendProfileBlurredWash) | FOUND |
| Commit 687e73d (FriendProfileHeader) | FOUND |
| No unexpected file deletions | PASSED |
