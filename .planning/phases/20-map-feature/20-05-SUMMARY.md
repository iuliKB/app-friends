---
phase: 20-map-feature
plan: "05"
subsystem: maps/ui
tags: [maps, explore, location, friend-plans, view-toggle]
dependency_graph:
  requires: [20-01, 20-02]
  provides: [ExploreMapView component, PlansListScreen list/map toggle]
  affects: [src/components/maps, src/screens/plans/PlansListScreen.tsx]
tech_stack:
  added: []
  patterns: [Haversine 25km GPS filter, foreground location permission, direct Marker navigation, list/map toggle header, StyleSheet.create inside useMemo([colors])]
key_files:
  created:
    - src/components/maps/ExploreMapView.tsx
  modified:
    - src/screens/plans/PlansListScreen.tsx
decisions:
  - "EmptyState requires icon/heading/body props — used ionicons map-outline icon with proper heading and body strings (plan spec had simplified message= prop which does not exist)"
  - "ExploreMapView wraps MapView in a root View with flex:1 — required for proper layout"
  - "Platform import added to PlansListScreen for toggleButtonActive background color logic"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-30"
  tasks_completed: 2
  files_changed: 2
---

# Phase 20 Plan 05: ExploreMapView + PlansListScreen Toggle Summary

ExploreMapView component with 25km GPS-filtered friend plan pins and direct navigation; integrated into PlansListScreen via list/map toggle in ScreenHeader with map as default.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create src/components/maps/ExploreMapView.tsx | c59496e | src/components/maps/ExploreMapView.tsx |
| 2 | Add list/map toggle to PlansListScreen | 39cb972 | src/screens/plans/PlansListScreen.tsx |

## What Was Built

### ExploreMapView.tsx

New component at `src/components/maps/ExploreMapView.tsx`:

- **Props:** `plans: PlanWithMembers[]` — receives plans array from PlansListScreen
- **Permission flow:** On mount, calls `Location.requestForegroundPermissionsAsync()`. If granted, calls `getCurrentPositionAsync(Balanced)` and sets `userLocation`.
- **25km filter (D-17):** `visiblePlans` memoized: filters to plans with lat/lng; if GPS granted and user location known, further filters by `haversineKm(...) <= 25`. If GPS denied, shows all plans with coordinates (no filter).
- **Loading state:** `ActivityIndicator` centered in `loadingContainer` while `isLoadingLocation` is true.
- **Empty state:** When `visiblePlans.length === 0` and not loading, renders `EmptyState` with `icon="map-outline"`, `heading="No nearby plans yet"`, `body` describing when pins appear.
- **MapView:** `flex: 1`, `showsUserLocation={permissionGranted}`, `showsMyLocationButton={false}`, `userInterfaceStyle="dark"`. Android: `PROVIDER_GOOGLE + customMapStyle: DARK_MAP_STYLE`.
- **Markers:** `tracksViewChanges={false}` for performance. No `<Callout>` — `onPress` navigates directly via `router.push('/plans/${plan.id}' as never)` per D-18.
- **Theme:** `useTheme()` + `StyleSheet.create` inside `useMemo([colors])`. No raw COLORS import.

### PlansListScreen.tsx (3 edits)

1. **Import block:** Added `Platform` to react-native imports; added `import { ExploreMapView } from '@/components/maps/ExploreMapView'`.
2. **State:** Added `const [viewMode, setViewMode] = useState<'map' | 'list'>('map')` — map is default per D-15.
3. **Header + conditional render:**
   - `ScreenHeader` now receives `rightAction` prop with two `TouchableOpacity` buttons: `"list"` icon and `"map-outline"` icon. Container has `accessibilityRole="radiogroup"`. Each button has `accessibilityLabel` and `accessibilityState={{ selected }}`.
   - Active button gets `toggleButtonActive` style (15% opacity accent background).
   - Content area: `{viewMode === 'map' ? <ExploreMapView plans={plans} /> : <FlatList ... />}`
4. **Styles:** Added `viewToggle`, `toggleButton`, `toggleButtonActive` to the `useMemo` styles block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EmptyState props mismatch — used correct component interface**
- **Found during:** Task 1 — reading EmptyState.tsx props interface
- **Issue:** Plan spec stated `<EmptyState message="No nearby plans yet" />` but `EmptyState` requires `icon`, `heading`, and `body` props (no `message` prop exists). Using the plan's spec verbatim would cause a TypeScript error.
- **Fix:** Used `icon="map-outline"`, `iconType="ionicons"`, `heading="No nearby plans yet"`, `body="When friends create plans with a location, they'll appear here."`
- **Files modified:** src/components/maps/ExploreMapView.tsx
- **Commit:** c59496e

## Known Stubs

None — ExploreMapView receives real `plans` array from `usePlans` hook in PlansListScreen. Permission flow uses real `expo-location` APIs. Haversine filter uses real user coordinates. Navigation uses real plan IDs.

## Threat Surface

Mitigations implemented as designed:
- **T-20-14 (GPS on-device):** User location computed client-side for haversine filter; never sent to Supabase or any third party. `requestForegroundPermissionsAsync` called before any GPS read.
- **T-20-15 (Friend plan pins):** Plans fetched under existing RLS; showing coordinates on map does not expand data access.
- **T-20-16 (Plan ID in router.push):** Plan ID comes from server-fetched `PlanWithMembers` array, not from user input.

## Self-Check: PASSED

- `src/components/maps/ExploreMapView.tsx` — EXISTS
- `grep "haversineKm"` in ExploreMapView.tsx — PRESENT (import + usage)
- `grep "<= 25"` in ExploreMapView.tsx — PRESENT
- `grep "tracksViewChanges={false}"` in ExploreMapView.tsx — PRESENT
- `grep "Callout"` in ExploreMapView.tsx — NOT FOUND (correct)
- `grep "showsMyLocationButton={false}"` in ExploreMapView.tsx — PRESENT
- `grep "viewMode\|ExploreMapView"` in PlansListScreen.tsx — PRESENT
- `grep "viewMode.*'map'"` in PlansListScreen.tsx — PRESENT (map default)
- `grep "accessibilityRole=\"radiogroup\""` in PlansListScreen.tsx — PRESENT
- Commits c59496e, 39cb972 — both present in git log
- `tsc --noEmit` — 27 errors (same pre-existing count; zero new errors)
