---
phase: 20-map-feature
reviewed: 2026-04-29T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - app.config.ts
  - package.json
  - src/components/maps/ExploreMapView.tsx
  - src/components/maps/LocationPicker.tsx
  - src/hooks/usePlanDetail.ts
  - src/hooks/usePlans.ts
  - src/lib/maps.ts
  - src/screens/plans/PlanCreateModal.tsx
  - src/screens/plans/PlanDashboardScreen.tsx
  - src/screens/plans/PlansListScreen.tsx
  - src/types/database.ts
  - src/types/plans.ts
  - supabase/migrations/0020_map_feature.sql
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-04-29
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 20 adds lat/lng coordinates to plans, a `LocationPicker` modal backed by `expo-location` reverse geocoding, a static map tile on `PlanDashboardScreen`, and a full-screen `ExploreMapView` on `PlansListScreen`. The migration is minimal and correct. The overall approach is sound and the new map tile / explore view are well-structured. There are no critical security or data-loss issues.

Five warnings were found, all around behavioral edge cases: a UI state desync when the location picker modal reopens without a GPS fix; the `updatePlanDetails` row-count guard being dead code; the `openInMapsApp` function silently doing nothing when the OS cannot open the URL; an unthrown error object being returned from `updateRsvp`; and a possible infinite update loop in `usePlanDetail`. Three informational items cover dead code, a duplicate platform branch, and a missing `NOT NULL` constraint on coordinates.

---

## Warnings

### WR-01: LocationPicker map does not re-center when modal reopens after permission denial

**File:** `src/components/maps/LocationPicker.tsx:40-55`

**Issue:** The `useEffect` fires on every `visible` change and tries to get the GPS position, but if the user previously denied permission and later grants it in system settings, the map silently stays on `DEFAULT_REGION` (Toronto) with no indication. More practically: after a successful first open, the `region` state retains the previous session's pin position, which is correct. However, when the modal is re-opened after being dismissed, `region` is not reset to `DEFAULT_REGION`, so the map shows the last confirmed or moved region — which is intentional — but `initialRegion` on the `MapView` is always `DEFAULT_REGION` (line 194). The `MapView` re-mounts when the parent mounts/unmounts, so `initialRegion` is used on each fresh open. The disconnect is that `setRegion` is called with the GPS fix (line 48) but the `MapView` uses `initialRegion={DEFAULT_REGION}` unconditionally, meaning the user's GPS position is never reflected in the visible map center unless the user has already dragged. The GPS fix updates `region` in React state, but because `initialRegion` is static and `region` prop is not passed to `MapView`, the GPS centering has no visual effect.

**Fix:** Pass `region` (or at least `initialRegion={region}`) reactively so the map centers when GPS resolves. One approach: use `MapView`'s `region` prop instead of `initialRegion`, controlled by `onRegionChangeComplete`. Alternatively, keep a separate `initialCenterRegion` ref that is only set once per modal open:

```tsx
// Replace line 194:
initialRegion={region}  // instead of DEFAULT_REGION
```

Note: once `initialRegion` is used, changing it after mount has no effect in react-native-maps. The fix is to use the controlled `region` prop or call `mapRef.current?.animateToRegion(...)` after the GPS position resolves.

---

### WR-02: `updatePlanDetails` row-count guard is dead code (count always null without `.count()`)

**File:** `src/hooks/usePlanDetail.ts:134-137`

**Issue:** The `.select()` call without arguments returns the updated rows but does not populate `count` unless `.count()` is chained. In Supabase JS v2 the `count` field on an update response is always `null` unless explicitly requested via `.select('*', { count: 'exact' })`. The guard `if (count === 0)` therefore never fires, and the "Update blocked — check RLS policies" error is never surfaced to the caller. A silent RLS block will look like a successful save to the user.

```ts
// Line 130-138 in usePlanDetail.ts
const { error, count } = await supabase
  .from('plans')
  .update(updates)
  .eq('id', planId)
  .select();          // count is always null here
```

**Fix:** Either drop the count check (accept that RLS errors are surfaced via `error` only), or request the count explicitly:

```ts
const { error, count } = await supabase
  .from('plans')
  .update(updates)
  .eq('id', planId)
  .select('id', { count: 'exact' });

if (error) return { error };
if (count === 0) return { error: new Error('Update blocked — check RLS policies') };
```

---

### WR-03: `openInMapsApp` silently no-ops when `canOpenURL` returns false

**File:** `src/lib/maps.ts:41-44`

**Issue:** When neither Apple Maps nor the geo scheme can be opened (e.g., emulator with no maps app, or a future platform), the function returns without any feedback to the user. The caller in `PlanDashboardScreen` (line 674) does not check the return value and shows no error.

```ts
const canOpen = await Linking.canOpenURL(url);
if (canOpen) {
  await Linking.openURL(url);
}
// Silent return if canOpen === false
```

**Fix:** Return a boolean indicating success, or throw/surface an error the caller can display:

```ts
export async function openInMapsApp(lat: number, lng: number, label: string): Promise<boolean> {
  const encodedLabel = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `maps://?ll=${lat},${lng}&q=${encodedLabel}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
    return true;
  }
  return false;
}
```

Then in the caller:

```tsx
onPress={async () => {
  const opened = await openInMapsApp(plan.latitude!, plan.longitude!, plan.location ?? '');
  if (!opened) Alert.alert('Maps unavailable', "Couldn't open the maps app.");
}}
```

---

### WR-04: `updateRsvp` returns a raw `PostgrestError` as `{ error }` instead of `{ error: Error }`

**File:** `src/hooks/usePlanDetail.ts:110-118`

**Issue:** The return type declares `{ error: Error | null }` but when Supabase returns an error, the raw `PostgrestError` object (which is not an `Error` instance) is passed through directly on line 116:

```ts
if (error) return { error };  // error is PostgrestError, not Error
return { error: null };
```

`PostgrestError` has a `message` property so it works at runtime, but it fails the declared TypeScript contract. Callers checking `error instanceof Error` or using error-only APIs (e.g., Sentry) would silently misclassify it. The same pattern exists in `createPlan` in `usePlans.ts` at line 175.

**Fix:** Wrap the Supabase error before returning:

```ts
if (error) return { error: new Error(error.message) };
```

---

### WR-05: `usePlanDetail` `useEffect` dependency on `session?.user?.id` can trigger refetch while `planId` is stale

**File:** `src/hooks/usePlanDetail.ts:154-156`

**Issue:** The `useEffect` lists `[planId, session?.user?.id]` as dependencies. When navigating between plan screens, if the hook re-runs with the new `planId` before `session` settles, `refetch` exits early (`if (!session?.user || !planId) return`) and `loading` is never set to `true`, leaving the UI potentially stuck on the old plan data with no loading indicator. Additionally, `refetch` closes over the outer `session` and `planId` via the function defined above, but it is not in the dependency array of the `useEffect` — React's exhaustive-deps rule would flag this. While not a crash, it creates a subtle stale-closure risk.

**Fix:** Include `refetch` in the dependency array (or use `useCallback` with the appropriate deps):

```ts
useEffect(() => {
  refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [planId, session?.user?.id]);
```

The `eslint-disable` is already present, so at minimum document the intentional choice. More robustly, wrap `refetch` in `useCallback([planId, session?.user?.id])` so the effect naturally tracks the actual data dependencies.

---

## Info

### IN-01: `addressLabel` state is never populated in LocationPicker — confirm bar always shows placeholder

**File:** `src/components/maps/LocationPicker.tsx:37`

**Issue:** `addressLabel` is initialized to `''` and `setAddressLabel` is never called. The confirm bar (line 219) shows "Drag map to choose a location" permanently. The reverse geocode result is computed in `handleConfirm` and passed to `onConfirm`, but it is not stored back into `addressLabel` for live preview as the user drags. This is likely intentional (preview would require a debounced geocode on every drag-end), but the state variable is dead code as written.

**Fix:** Either remove `addressLabel` state and the `setAddressLabel` import, or implement the debounced preview. If intentionally deferred, replace the state with a comment:

```tsx
// addressLabel preview deferred — geocode only on confirm (T-20-10)
```

---

### IN-02: Duplicate `Platform.OS === 'android'` branch in `PlansListScreen` `toggleButtonActive` style

**File:** `src/screens/plans/PlansListScreen.tsx:243-246`

**Issue:** The `toggleButtonActive` style uses an identical value for both iOS and Android inside a `Platform.OS` ternary:

```ts
backgroundColor: Platform.OS === 'android'
  ? 'rgba(185, 255, 59, 0.15)'
  : 'rgba(185, 255, 59, 0.15)',
```

Both branches are identical. The conditional is dead and adds noise.

**Fix:** Replace with a single value:

```ts
backgroundColor: 'rgba(185, 255, 59, 0.15)',
```

---

### IN-03: Migration adds lat/lng without a `CHECK` constraint on valid coordinate ranges

**File:** `supabase/migrations/0020_map_feature.sql:5-7`

**Issue:** The migration accepts any `FLOAT8` value. Out-of-range inputs (e.g., `latitude = 999`) would pass the database layer and reach the map component, where react-native-maps would render a marker at an invalid coordinate (potentially crashing or producing invisible markers).

**Fix:** Add check constraints if strict validation is desired:

```sql
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS latitude  FLOAT8 NULL CHECK (latitude  BETWEEN -90  AND  90),
  ADD COLUMN IF NOT EXISTS longitude FLOAT8 NULL CHECK (longitude BETWEEN -180 AND 180);
```

Input is already set by the device's GPS or reverse geocode result, so invalid values are unlikely in practice. This is a defence-in-depth measure only.

---

_Reviewed: 2026-04-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
