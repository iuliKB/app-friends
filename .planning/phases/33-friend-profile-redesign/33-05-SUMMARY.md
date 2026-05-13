---
phase: 33-friend-profile-redesign
plan: "05"
subsystem: friends/components
tags: [ui, components, quick-actions, reanimated-press, haptics, friend-profile, phase-33]
dependency_graph:
  requires:
    - 33-04 (friendIconPalette, GroupedInsetSection, ProfileInfoRow, BioRow — directory established)
  provides:
    - src/components/friends/ActionIconButton.tsx (single icon-with-label button, D-04/D-09/REQ-FP-06)
    - src/components/friends/QuickActionsRow.tsx (4-button horizontal row layout, D-04)
  affects:
    - 33-06 (Plan 06 mounts QuickActionsRow under the header and wires handlers)
tech_stack:
  added: []
  patterns:
    - Reanimated v4 press-spring (withSpring, damping:15/stiffness:120) — same contract as BentoCard
    - expo-haptics per-button policy (light/selection/none) with useReducedMotion short-circuit
    - useTheme() + useMemo([colors]) for StyleSheet.create (v1.6 hard constraint)
    - Named constants for non-token pixel values (BUTTON_DIAMETER, ICON_GLYPH_SIZE, PRESS_SCALE, PRESS_SPRING)
key_files:
  created:
    - src/components/friends/ActionIconButton.tsx
    - src/components/friends/QuickActionsRow.tsx
  modified: []
decisions:
  - ActionIconButton wraps only the Animated.View circle (not the label) in the scale animation — label stays static during press per plan spec
  - QuickActionsRow is pure layout with zero state ownership; isMuted/muteDisabled/messageDisabled are all screen-owned props
  - haptic !== 'none' check is the guard for skipping haptics, combined with the reduceMotion guard (both must be false to fire)
metrics:
  duration: "2m"
  completed: "2026-05-13"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 33 Plan 05: Quick-Action Components Summary

**One-liner:** 48pt icon-only buttons with Reanimated v4 press-spring, per-button haptic policy, and accent tone; assembled into a 4-button centered row for Message/Mute/Photos/More.

---

## What Was Built

### `ActionIconButton` public API

```typescript
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type ActionIconHaptic = 'light' | 'selection' | 'none';

interface ActionIconButtonProps {
  iconName: IoniconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'accent';       // default: 'default'
  haptic?: ActionIconHaptic;          // default: 'light'
  disabled?: boolean;                 // default: false
  accessibilityLabel: string;
  accessibilityHint?: string;
}
```

### `QuickActionsRow` public API

```typescript
interface QuickActionsRowProps {
  onMessage: () => void;
  onToggleMute: () => void;
  onPhotos: () => void;
  onMore: () => void;
  isMuted: boolean;
  friendFirstName: string;
  muteDisabled?: boolean;     // default: false — suppress while DM channel resolving
  messageDisabled?: boolean;  // default: false — suppress during openChat push
}
```

---

## Behavior Summary

### ActionIconButton

- **Visual:** 48pt circle (`colors.surface.card`, `borderRadius: RADII.full`) with a 24pt Ionicon centered inside, and a label (`FONT_SIZE.xs`, `FONT_FAMILY.body.semibold`) below separated by `SPACING.sm`.
- **Press spring:** `withSpring(0.96, { damping: 15, stiffness: 120 })` on press-in; `withSpring(1, ...)` on press-out. Only the circle animates — the label stays static.
- **Haptic:** `haptic='light'` → `Haptics.impactAsync(ImpactFeedbackStyle.Light)`; `haptic='selection'` → `Haptics.selectionAsync()`; `haptic='none'` → no haptic.
- **Reduced motion:** `useReducedMotion() === true` short-circuits both the spring animation AND the haptic fire.
- **Tone 'accent':** paints the Ionicon glyph in `colors.interactive.accent` (used for the Message button at idle). The circle stays `colors.surface.card`.
- **Disabled:** `opacity: 0.45`, all press handlers bail early, haptic skipped.
- **Touch target:** 48pt circle + `hitSlop={{ top:4, bottom:4, left:4, right:4 }}` = 56pt effective (above 44pt floor).
- **Accessibility:** `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState={{ disabled }}`.

### QuickActionsRow

| # | Button | Icon | Tone | Haptic | Notes |
|---|--------|------|------|--------|-------|
| 1 | Message | `chatbubble-outline` | `accent` | `light` | `disabled={messageDisabled}` |
| 2 | Mute/Unmute | `notifications-off-outline` / `notifications-outline` | `default` | `selection` | Icon+label+a11y flip on `isMuted`; `disabled={muteDisabled}` |
| 3 | Photos | `images-outline` | `default` | `light` | Always enabled |
| 4 | More | `ellipsis-horizontal` | `default` | `selection` | Always enabled |

Row layout: `flexDirection:'row'`, `justifyContent:'center'`, `gap: SPACING.xl` (24px), `marginTop: SPACING.xl`.

**Pure layout — no state ownership:** `isMuted`, `muteDisabled`, `messageDisabled` are all provided by the parent screen (Plan 06). Zero `useState`, `useEffect`, `useQuery`, or `supabase` calls.

---

## State Ownership Confirmation

`QuickActionsRow` does NOT own any state. The Plan 06 screen owns:
- `isMuted` — read from `queryKeys.chat.preferences(channelId)` cache slot
- `muteDisabled` — set while the DM channel lazy-creation is in flight
- `messageDisabled` — set while `openChat()` push is in flight

---

## Manual Hardware Smoke Gate (Carried Forward)

**REQ-FP-06 visual + haptic smoke test deferred to Plan 06 SUMMARY:**

- Tap each button on iOS hardware
- Confirm each haptic fires correctly (light for Message/Photos; selection for Mute/More)
- Confirm Mute icon/label flip on `isMuted` state change
- Confirm disabled state appearance (opacity 0.45, no haptic)
- Confirm reduced-motion path (no scale spring, no haptic)

This is a manual hardware test per the v1.3 hardware-gate deferral convention.

---

## Deviations from Plan

None — plan executed exactly as written. Both components match the `<interfaces>` block in the plan verbatim, including spring config (`damping:15, stiffness:120`) which differs from BentoCard's spring (`damping:18, stiffness:320`) per UI-SPEC §Quick-Action Buttons line 382.

---

## Threat Model Coverage

| Threat | Mitigation | Implemented |
|--------|-----------|-------------|
| T-33-17: Rapid double-tap on Message fires two openChat calls | `messageDisabled` prop allows screen to suppress press while in-flight | Prop accepted; screen (Plan 06) wires the logic |
| T-33-18: Mute press before DM channel resolved double-creates DM | `muteDisabled` prop allows screen to disable until lazy creation completes | Prop accepted; screen (Plan 06) wires the logic |
| T-33-19: friendFirstName with control chars in accessibilityLabel | accept — display_name already rendered in 5+ surfaces, no new exposure | N/A (accepted per plan) |
| T-33-20: Reduced-motion users still get press handler but no visual feedback | accept — UI-SPEC §line 593-594 mandates this behavior | Correctly implemented |

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `src/components/friends/ActionIconButton.tsx` exists | FOUND |
| `src/components/friends/QuickActionsRow.tsx` exists | FOUND |
| Task 1 commit `75ba86f` | FOUND |
| Task 2 commit `c718658` | FOUND |
| tsc reports zero errors in both files | PASSED |
| Jest full suite 275/275 | PASSED |
