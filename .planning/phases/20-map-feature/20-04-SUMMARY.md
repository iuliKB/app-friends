---
phase: 20-map-feature
plan: "04"
subsystem: maps/ui
tags: [maps, plan-dashboard, location-picker, directions, map-tile]
dependency_graph:
  requires: [20-01, 20-02, 20-03]
  provides: [PlanDashboardScreen map tile, plan directions button, edit mode LocationPicker]
  affects: [src/screens/plans/PlanDashboardScreen.tsx, src/hooks/usePlanDetail.ts]
tech_stack:
  added: []
  patterns: [static MapView tile, pointerEvents=none scroll guard, platform-conditional provider, LocationPicker trigger in edit mode]
key_files:
  created: []
  modified:
    - src/screens/plans/PlanDashboardScreen.tsx
    - src/hooks/usePlanDetail.ts
decisions:
  - "Map tile placed outside the Details <View style={styles.section}> block — uses own marginHorizontal: SPACING.lg to match section padding"
  - "cardElevation spread as object (not array) per theme type: style={[styles.mapTileContainer, colors.cardElevation]}"
  - "FONT_WEIGHT.medium does not exist in token set — used FONT_WEIGHT.semibold for directionsText"
  - "usePlanDetail type signature lacked latitude/longitude — added to exported interface (implementation already supported them)"
  - "editLocation changed from string to string | null to match LocationPicker onConfirm signature"
metrics:
  duration_minutes: 3
  completed_date: "2026-04-30"
  tasks_completed: 2
  files_changed: 2
---

# Phase 20 Plan 04: PlanDashboardScreen Map Tile + Edit Mode LocationPicker Summary

Static map tile with Directions deep-link and LocationPicker integration into PlanDashboardScreen edit mode — delivering MAP-02, MAP-03, and MAP-05.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add map tile + directions to PlanDashboardScreen | a13a560 | src/screens/plans/PlanDashboardScreen.tsx, src/hooks/usePlanDetail.ts |
| 2 | Update PlanDashboardScreen edit mode — replace location TextInput with LocationPicker trigger | a13a560 | src/screens/plans/PlanDashboardScreen.tsx |

## What Was Built

### PlanDashboardScreen map tile section

When `plan.latitude != null && plan.longitude != null`:

- **MapView tile:** 160pt height, non-interactive (`scrollEnabled=false`, `zoomEnabled=false`, `rotateEnabled=false`, `pitchEnabled=false`). Uses `initialRegion` (not controlled `region` prop) to avoid update loops.
- **Scroll guard:** `<View pointerEvents="none">` wraps MapView so the parent `ScrollView` receives all touch events uninterrupted.
- **Marker:** Pin at plan coordinates with `pinColor={colors.interactive.accent}` and `tracksViewChanges={false}` for performance.
- **Platform conditional:** Android uses `PROVIDER_GOOGLE + customMapStyle: DARK_MAP_STYLE`; iOS uses Apple Maps (no provider prop, no API key).
- **Container:** `styles.mapTileContainer` with `borderRadius: RADII.lg`, `borderColor: colors.border`, and `colors.cardElevation` spread for light mode depth.
- **Address row:** location-outline icon + `plan.location` text + Directions `TouchableOpacity`.
- **Directions button:** Calls `openInMapsApp(lat, lng, label)` which constructs a platform URL scheme and calls `Linking.openURL`.
- **Null guard:** Entire block absent when either lat or lng is null — no placeholder, no empty container.

### PlanDashboardScreen edit mode

- **State vars added:** `editLatitude`, `editLongitude`, `showEditLocationPicker` alongside existing `editLocation` (changed from `string` to `string | null`).
- **enterEditMode:** Now initializes `editLatitude` and `editLongitude` from `plan.latitude`/`plan.longitude`.
- **Location TextInput removed:** Replaced with a `TouchableOpacity` trigger showing the current location label (or "Add location" placeholder) with clear button and chevron.
- **LocationPicker:** Rendered inline with `visible={showEditLocationPicker}`; `onConfirm` updates all three state vars; `onCancel` closes without change.
- **handleSaveChanges:** Now passes `latitude: editLatitude, longitude: editLongitude` to `updatePlanDetails`.

### usePlanDetail.ts fix

The hook's exported type interface (lines 12–17) was missing `latitude` and `longitude` from the `updatePlanDetails` parameter type — the implementation function at line 118 already accepted them. Fixed the interface to match the implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing lat/lng in usePlanDetail exported type signature**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `updatePlanDetails` type interface exported from the hook lacked `latitude?: number | null` and `longitude?: number | null`, causing TS2353 when the call site passed those fields
- **Fix:** Added both fields to the exported type on lines 12–18 of usePlanDetail.ts
- **Files modified:** src/hooks/usePlanDetail.ts
- **Commit:** a13a560

**2. [Rule 2 - Missing token] FONT_WEIGHT.medium replaced with FONT_WEIGHT.semibold**
- **Found during:** Task 1 TypeScript verification
- **Issue:** Plan spec used `FONT_WEIGHT.medium` which does not exist in the FONT_WEIGHT token set (only `regular`, `semibold`, `bold`)
- **Fix:** Used `FONT_WEIGHT.semibold` for `directionsText` — visually closest intent
- **Files modified:** src/screens/plans/PlanDashboardScreen.tsx
- **Commit:** a13a560

## Known Stubs

None — all location fields flow through real state to `updatePlanDetails` which writes to the DB columns from migration 0020. Map tile reads from `plan.latitude`/`plan.longitude` which come from the real Supabase row.

## Threat Surface

Mitigations implemented as designed:
- **T-20-11 (Elevation of Privilege — Linking.openURL):** URL constructed only from `plan.latitude`/`plan.longitude` (DB values, not user-input strings); `canOpenURL` guard inside `openInMapsApp` prevents arbitrary URL injection.
- **T-20-12 (Information Disclosure — map tile):** Accepted — plan coordinates intentionally visible to plan members; RLS restricts who can fetch the plan row.
- **T-20-13 (Tampering — user edits lat/lng):** Accepted — coordinates come from LocationPicker (device GPS + OS reverse geocoding); user can only edit their own plans (RLS created_by enforcement).

## Self-Check: PASSED

- `grep "plan.latitude != null && plan.longitude != null"` — PRESENT
- `grep "scrollEnabled={false}"` — PRESENT
- `grep 'pointerEvents="none"'` — PRESENT
- `grep "tracksViewChanges={false}"` — PRESENT
- `grep "openInMapsApp"` — PRESENT (import + usage)
- `grep "DARK_MAP_STYLE\|PROVIDER_GOOGLE"` — PRESENT (Android dark map)
- `grep "showEditLocationPicker\|editLatitude"` — PRESENT
- `grep "region={"` — NOT FOUND (forbidden anti-pattern absent)
- Commit a13a560 — PRESENT in git log
- npx tsc --noEmit — 27 errors (same count as pre-existing; zero new errors from this plan)
