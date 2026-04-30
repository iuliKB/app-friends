---
phase: 23-memories-gallery
plan: 01
subsystem: ui
tags: [react-native, supabase, hooks, storage, signed-urls]

requires:
  - phase: 22-gallery-ui
    provides: usePlanPhotos.ts query patterns, PlanPhotoWithUploader type, GalleryViewerModal component
  - phase: 21-gallery-foundation
    provides: plan_photos table, plan-gallery storage bucket, add_plan_photo RPC

provides:
  - useAllPlanPhotos hook — cross-plan photo aggregation with groups + recentPhotos + deletePhoto + refetch
  - PlanPhotoGroup type — planId, planTitle, photos[] sorted created_at DESC
  - UseAllPlanPhotosResult type — full public API surface for hook consumers

affects:
  - 23-02 (RecentMemoriesSection widget consumes recentPhotos from this hook)
  - 23-03 (MemoriesScreen consumes groups + deletePhoto from this hook)

tech-stack:
  added: []
  patterns:
    - Multi-step Supabase aggregation (plan_members → plan_photos → plans → profiles → signed URLs)
    - Batch createSignedUrls (single call for all paths — never per-photo loop)
    - Group + slice derivation from single sorted query result
    - session?.user?.id as dep for useCallback to avoid object identity re-renders

key-files:
  created:
    - src/hooks/useAllPlanPhotos.ts
  modified: []

key-decisions:
  - "recentPhotos derived as assembled.slice(0, 6) — assembled already sorted DESC from query, no re-sort needed"
  - "deletePhoto uses eslint-disable on exhaustive-deps for session?.user?.id pattern — consistent with usePlanPhotos"
  - "plan titles fetched via separate plans table query (not PostgREST join) — consistent with usePlanPhotos pattern"

patterns-established:
  - "Multi-plan photo aggregation: step-by-step Supabase queries with Map lookups for assembly"

requirements-completed:
  - MEMO-01
  - MEMO-02
  - MEMO-03

duration: 8min
completed: 2026-04-30
---

# Phase 23 Plan 01: Memories Gallery - useAllPlanPhotos Hook Summary

**Cross-plan photo aggregation hook with 7-step Supabase pipeline, batch signed URLs, group-by-plan sorting, and recentPhotos widget slice**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-30T10:48:00Z
- **Completed:** 2026-04-30T10:56:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `useAllPlanPhotos.ts` implementing full 7-step data pipeline
- Exports `PlanPhotoGroup` and `UseAllPlanPhotosResult` types for typed consumers
- Batch `createSignedUrls` call (single API call for all paths across all plans)
- `groups` array sorted newest-plan-first; `recentPhotos` flat slice of most recent 6

## Task Commits

1. **Task 1: Create useAllPlanPhotos hook** - `5b3b799` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/hooks/useAllPlanPhotos.ts` - Cross-plan photo aggregation hook; exports useAllPlanPhotos, PlanPhotoGroup, UseAllPlanPhotosResult

## Decisions Made

- `recentPhotos` derived as `assembled.slice(0, 6)` — photos are already sorted DESC from the Step 2 query, no additional sort needed
- `eslint-disable` added on `refetch` useCallback deps (line 148) to suppress warning about `session.user` vs `session?.user?.id` dep — same pattern as usePlanPhotos.ts
- Plan titles fetched in a separate `plans` table query (Step 3) rather than PostgREST join — consistent with existing hook patterns and avoids join issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `prettier/prettier` auto-fixable formatting errors in initial file write (line wrapping in Map constructors and chained calls) — fixed via `npx expo lint --fix`. No logic changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useAllPlanPhotos` is ready for Plan 02 (RecentMemoriesSection component) and Plan 03 (MemoriesScreen)
- Hook exports `recentPhotos` (flat, 6 items) for widget and `groups` (sectioned, newest-first) for full screen
- `deletePhoto(photoId, planId)` signature ready for GalleryViewerModal integration in Plan 03

## Self-Check

- [x] `src/hooks/useAllPlanPhotos.ts` exists
- [x] Contains `export type PlanPhotoGroup`
- [x] Contains `export type UseAllPlanPhotosResult`
- [x] Contains `export function useAllPlanPhotos`
- [x] Contains `createSignedUrls` (batch call)
- [x] Contains `.from('plan_members')` (step 1)
- [x] Contains `.from('plan_photos')` (step 2)
- [x] Contains `.from('plans')` (step 3)
- [x] Contains `.from('profiles')` (step 4)
- [x] Contains `from('plan-gallery')` (storage)
- [x] Contains `recentPhotos` state and returns it
- [x] Contains `deletePhoto` with `planId` parameter
- [x] Contains `useEffect` with `session?.user?.id` dependency
- [x] Does NOT import `useFocusEffect` from `@react-navigation/native`
- [x] `npx expo lint` exits 0 (no errors)

---
*Phase: 23-memories-gallery*
*Completed: 2026-04-30*
