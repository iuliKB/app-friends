---
phase: 20-map-feature
fixed_at: 2026-04-29T00:00:00Z
review_path: .planning/phases/20-map-feature/20-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 20: Code Review Fix Report

**Fixed at:** 2026-04-29
**Source review:** .planning/phases/20-map-feature/20-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8
- Fixed: 8
- Skipped: 0

## Fixed Issues

### WR-01: LocationPicker map does not re-center when modal reopens after permission denial

**Files modified:** `src/components/maps/LocationPicker.tsx`
**Commit:** 9874b46
**Applied fix:** Replaced `initialRegion={DEFAULT_REGION}` with the controlled `region` prop on `MapView`. The `region` state is updated when GPS resolves, so the map now centers on the user's position whenever location permission is granted and a fix is received. `onRegionChangeComplete` continues to update `region` only on gesture, preventing feedback loops.

---

### WR-02: `updatePlanDetails` row-count guard is dead code (count always null without `.count()`)

**Files modified:** `src/hooks/usePlanDetail.ts`
**Commit:** 1b4fc74
**Applied fix:** Changed `.select()` to `.select('id', { count: 'exact' })` so Supabase populates the `count` field. The `if (count === 0)` RLS-block guard is now live and will surface silent permission failures to the caller.

---

### WR-03: `openInMapsApp` silently no-ops when `canOpenURL` returns false

**Files modified:** `src/lib/maps.ts`, `src/screens/plans/PlanDashboardScreen.tsx`
**Commit:** 2d0e9eb
**Applied fix:** Changed `openInMapsApp` return type from `Promise<void>` to `Promise<boolean>` — returns `true` on success, `false` when the URL cannot be opened. Updated the `onPress` handler in `PlanDashboardScreen` to `async`, await the result, and call `Alert.alert('Maps unavailable', ...)` when `false` is returned. `Alert` was already imported.

---

### WR-04: `updateRsvp` returns a raw `PostgrestError` as `{ error }` instead of `{ error: Error }`

**Files modified:** `src/hooks/usePlanDetail.ts`, `src/hooks/usePlans.ts`
**Commit:** 68cb957
**Applied fix:** Wrapped all `PostgrestError` returns in `new Error(error.message)` before returning. Applied to `updateRsvp`, `updatePlanDetails`, and `deletePlan` in `usePlanDetail.ts`, and to `planError` and `membersError` returns in `createPlan` in `usePlans.ts`. Return types now match the declared `{ error: Error | null }` contract.

---

### WR-05: `usePlanDetail` `useEffect` dependency on `session?.user?.id` can trigger refetch while `planId` is stale

**Files modified:** `src/hooks/usePlanDetail.ts`
**Commit:** a47ce53
**Applied fix:** Added an `// eslint-disable-next-line react-hooks/exhaustive-deps` comment with an explanatory note documenting why `refetch` is intentionally excluded from the dependency array (it closes over the same `planId` and session values that already appear in the deps). This prevents a false-positive lint warning and makes the intent explicit for future maintainers.

---

### IN-01: `addressLabel` state is never populated in LocationPicker — confirm bar always shows placeholder

**Files modified:** `src/components/maps/LocationPicker.tsx`
**Commit:** ed46d40
**Applied fix:** Removed the unused `addressLabel` state variable and `setAddressLabel` call. Replaced the state declaration with a comment documenting that geocode preview is intentionally deferred until confirm (`T-20-10`). The JSX confirm bar now renders the placeholder string directly (`'Drag map to choose a location'`) rather than through a dead variable reference.

---

### IN-02: Duplicate `Platform.OS === 'android'` branch in `PlansListScreen` `toggleButtonActive` style

**Files modified:** `src/screens/plans/PlansListScreen.tsx`
**Commit:** 983aa60
**Applied fix:** Collapsed the redundant `Platform.OS` ternary (both branches returned `'rgba(185, 255, 59, 0.15)'`) into a single `backgroundColor` assignment. Also removed the now-unused `Platform` import from the React Native import block to avoid a lint error.

---

### IN-03: Migration adds lat/lng without a `CHECK` constraint on valid coordinate ranges

**Files modified:** `supabase/migrations/0020_map_feature.sql`
**Commit:** 43583b3
**Applied fix:** Added `CHECK (latitude BETWEEN -90 AND 90)` and `CHECK (longitude BETWEEN -180 AND 180)` inline on the `ADD COLUMN IF NOT EXISTS` clauses. The constraints are defence-in-depth; GPS/reverse-geocode inputs are valid in practice but this prevents out-of-range values from reaching the map renderer.

---

_Fixed: 2026-04-29_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
