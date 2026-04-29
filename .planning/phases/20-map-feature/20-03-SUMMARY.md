---
phase: 20-map-feature
plan: "03"
subsystem: maps/ui
tags: [maps, location-picker, modal, geocoding, plan-create]
dependency_graph:
  requires: [20-01, 20-02]
  provides: [LocationPicker component, PlanCreateModal location integration]
  affects: [src/components/maps, src/screens/plans/PlanCreateModal.tsx]
tech_stack:
  added: []
  patterns: [full-screen modal with fixed pin, map-drag-not-pin-drag, reverse geocoding on confirm]
key_files:
  created:
    - src/components/maps/LocationPicker.tsx
  modified:
    - src/screens/plans/PlanCreateModal.tsx
decisions:
  - "LocationPicker uses initialRegion (not controlled region prop) to prevent infinite update loop anti-pattern"
  - "Permission re-checked in handleConfirm before reverseGeocodeAsync per T-20-10 (Android hang prevention)"
  - "StyleSheet.create inside useMemo([colors]) in LocationPicker per Phase 19 pattern"
  - "PlanCreateModal reuses locationTrigger style (height 48, card background) aligned with timeRow pattern"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-30"
  tasks_completed: 2
  files_changed: 2
---

# Phase 20 Plan 03: LocationPicker + PlanCreateModal Integration Summary

Full-screen map modal with fixed center pin and GPS centering; integrated into PlanCreateModal replacing the freetext location TextInput with a tap-to-pick trigger.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create src/components/maps/LocationPicker.tsx | 9778b66 | src/components/maps/LocationPicker.tsx |
| 2 | Update PlanCreateModal — replace location TextInput with picker trigger | 05fc064 | src/screens/plans/PlanCreateModal.tsx |

## What Was Built

### LocationPicker.tsx

Full-screen `<Modal presentationStyle="fullScreen">` component with:

- **Map-drag UX:** MapView uses `initialRegion` (not controlled `region` prop) — the anti-pattern `region={region}` is absent. Only `onRegionChangeComplete` with `isGesture` guard updates the `region` state.
- **Fixed center pin:** `<View pointerEvents="none">` positioned at exactly `top: 50%, left: 50%, marginLeft: -18, marginTop: -36`. Map drag moves the basemap beneath it.
- **GPS centering:** On modal open, `requestForegroundPermissionsAsync` → `getCurrentPositionAsync(Balanced)`. Falls back to Toronto `(43.6532, -79.3832)` if denied.
- **Confirm geocoding (T-20-10 guarded):** `handleConfirm` re-checks permission before `reverseGeocodeAsync`. Falls back to raw coords if denied (prevents Android indefinite hang).
- **Reverse geocoding:** Uses `formatAddress` from `src/lib/maps.ts` to produce "123 Main St, Toronto" format. Falls back to `lat.toFixed(5), lng.toFixed(5)`.
- **Confirm bar:** Absolute bottom overlay with `useSafeAreaInsets()`. Shows `ActivityIndicator` during geocoding; disables confirm button (opacity 0.5, `accessibilityState`).
- **Header bar:** 52pt + top safe inset. Title "Choose location", close `Ionicons "close"` with `accessibilityLabel`.
- **Theme:** `useTheme()` with `isDark` for confirm button text color (`#0E0F11` dark / `#FFFFFF` light). `StyleSheet.create` inside `useMemo([colors])`.

### PlanCreateModal.tsx (4 edits)

1. **Import added:** `import { LocationPicker } from '@/components/maps/LocationPicker'`
2. **State replaced:** `const [location, setLocation] = useState('')` → four vars: `locationLabel`, `latitude`, `longitude`, `showLocationPicker`
3. **Location field replaced:** Freetext `TextInput` → `TouchableOpacity` trigger with location-outline icon, address label (or "Add location" placeholder), clear `[×]` button when set, chevron-forward when empty. `LocationPicker` modal rendered inline.
4. **handleCreate updated:** `createPlan({ ..., location: locationLabel, latitude, longitude, ... })` — passes coordinates to Supabase via the write path from Plan 20-02.
5. **New styles:** `locationTrigger` (height 48, card background, border, RADII.lg) and `locationTriggerText` (flex 1, FONT_SIZE.md) added to `useMemo` styles block.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

## Known Stubs

None — all location fields are wired to real state and flow through to `createPlan` which writes to the DB columns from migration 0020.

## Threat Surface

Threat model mitigations implemented as designed:
- **T-20-07 (Information Disclosure — GPS):** `requestForegroundPermissionsAsync` called before any GPS read on modal open.
- **T-20-10 (Information Disclosure — reverseGeocodeAsync before permission):** `handleConfirm` explicitly re-checks permission status before calling `reverseGeocodeAsync`; falls back to raw coords if denied.
- **T-20-08** (accepted), **T-20-09** (accepted) — no changes required.

## Self-Check: PASSED

- `src/components/maps/LocationPicker.tsx` — EXISTS
- `grep "onRegionChangeComplete\|isGesture"` — PRESENT in LocationPicker.tsx
- `grep "reverseGeocodeAsync"` — PRESENT in LocationPicker.tsx
- `grep "region={region}"` — NOT FOUND (forbidden anti-pattern absent)
- `grep "StyleSheet.create"` inside `useMemo` — PRESENT
- `grep "useSafeAreaInsets"` — PRESENT (import + usage)
- `grep "showLocationPicker\|latitude\|longitude"` in PlanCreateModal.tsx — ALL PRESENT
- `import { LocationPicker }` — PRESENT in PlanCreateModal.tsx
- Old `const [location, setLocation]` — ABSENT
- Old TextInput with location placeholder — ABSENT
- `npx tsc --noEmit` — 27 errors (one fewer than the 28 pre-existing; no new errors introduced)
- Commits 9778b66, 05fc064 — both present in git log
