---
phase: 21-gallery-foundation
plan: "03"
subsystem: gallery
tags: [hooks, supabase, storage, signed-urls, rpc, react-native, typescript]
dependency_graph:
  requires:
    - phase: 21-01
      provides: [plan_photos-table, plan-gallery-bucket, add_plan_photo-rpc, PlanPhotoWithUploader-type, usePlanPhotos.photoCap.test.ts-scaffold]
    - phase: 21-02
      provides: [uploadPlanPhoto-utility]
  provides: [usePlanPhotos-hook]
  affects: [src/screens/plan-detail, Phase 22 gallery UI]
tech-stack:
  added: []
  patterns: [createSignedUrls-batch-not-loop, upload-then-rpc-with-orphan-cleanup, separate-profile-join]
key-files:
  created:
    - src/hooks/usePlanPhotos.ts
  modified:
    - tests/unit/usePlanPhotos.photoCap.test.ts
    - src/types/database.ts
key-decisions:
  - "add_plan_photo added to database.ts Functions type — RPC existed in migration but was missing from TS types, causing tsc error"
  - "createSignedUrls batch call (not per-photo loop) — single API call for all paths, index-aligned result map"
  - "deletePhoto continues to DB delete even if storage remove fails — storage errors do not prevent row cleanup"
  - "useEffect deps are [planId, session?.user?.id] (not [refetch]) — avoids infinite re-render from useCallback dependency chain"

patterns-established:
  - "Private bucket photo fetch: query rows → join profiles → createSignedUrls batch → assemble PlanPhotoWithUploader[]"
  - "Upload-then-RPC with orphan cleanup: upload storage → call RPC → on RPC error remove([storagePath]) → return typed error"

requirements-completed: [GALL-01, GALL-02, GALL-03]

duration: ~15min
completed: 2026-04-30
---

# Phase 21 Plan 03: Gallery Foundation — usePlanPhotos Hook

**usePlanPhotos hook wiring plan_photos DB rows + profiles join + createSignedUrls batch + uploadPlanPhoto integration, with typed photo_cap_exceeded / upload_failed error surface matching D-13 through D-16 spec.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-30T00:20:00Z
- **Completed:** 2026-04-30T00:35:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- `src/hooks/usePlanPhotos.ts` — complete hook with D-13 return signature: `{ photos, loading, error, uploadPhoto, deletePhoto, refetch }`
- `uploadPhoto` calls `uploadPlanPhoto` (compression handled inside), then `add_plan_photo` RPC; returns `{ error: 'photo_cap_exceeded' }` on P0001, `{ error: 'upload_failed' }` on other errors; cleans up orphaned storage object on any RPC failure
- `refetch` fetches plan_photos ORDER BY created_at ASC, joins profiles in a single query, calls `createSignedUrls(paths, 3600)` batch (not per-photo loop), assembles `PlanPhotoWithUploader[]`
- `deletePhoto` removes storage object first, then deletes DB row; continues to DB delete even if storage removal fails
- 13 unit tests passing (8 original photoCap + 5 new assembly/precondition tests)

## Task Commits

1. **Task 1: Create src/hooks/usePlanPhotos.ts** — `20e713e` (feat)
2. **Task 2: Extend usePlanPhotos cap tests** — `432b65a` (test)

## Files Created/Modified

- `src/hooks/usePlanPhotos.ts` — Full gallery data hook per D-13 through D-16; single integration point for Phase 22 UI
- `tests/unit/usePlanPhotos.photoCap.test.ts` — Extended with 5 tests: assemblePhotoWithUploader (profile join, Unknown fallback, storagePath-not-URL) and findPhotoInState (found, undefined cases)
- `src/types/database.ts` — Added `add_plan_photo` to Functions type block (Rule 1 fix: RPC was live but missing from TS types)

## Decisions Made

- `add_plan_photo` added to database.ts Functions type: the RPC was created in migration 0021 but never added to the TypeScript type definition, causing a TS2345 error when calling `supabase.rpc('add_plan_photo', ...)`. Added the type entry with `Args: { p_plan_id: string; p_storage_path: string }` and `Returns: undefined`.
- `deletePhoto` continues to DB delete even if `storage.remove()` fails: storage errors are logged but not fatal — the DB row should still be cleaned up. This matches the principle that rows and storage objects can get out of sync and DB cleanup is the authoritative state.
- `useEffect` deps `[planId, session?.user?.id]` not `[refetch]`: using the stable primitive values avoids the infinite re-render that would occur if `refetch` (useCallback) were in the dep array — its own deps include `planId` and `session?.user?.id`, causing a cycle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] add_plan_photo missing from database.ts Functions type**
- **Found during:** Task 1 (usePlanPhotos.ts TypeScript check)
- **Issue:** `supabase.rpc('add_plan_photo', ...)` caused TS2345 — 'add_plan_photo' not assignable to the known RPC name union type in database.ts Functions
- **Fix:** Added `add_plan_photo: { Args: { p_plan_id: string; p_storage_path: string }; Returns: undefined }` to the Functions block in database.ts
- **Files modified:** src/types/database.ts
- **Verification:** `npx tsc --noEmit` — usePlanPhotos.ts errors resolved; total error count remains 29 (all pre-existing)
- **Committed in:** 20e713e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug: missing TS type for existing RPC)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep.

## Known Stubs

None — this plan delivers a data hook with full Supabase integration. No UI components or hardcoded data.

## Threat Surface Scan

All threat mitigations from the plan's threat model are present in the hook implementation:

| T-ID | Mitigation | Verified |
|------|-----------|---------|
| T-21-12 | Concurrent upload race: add_plan_photo RPC is single plpgsql transaction | Server-side — no client locking needed |
| T-21-13 | deletePhoto on another user's photo: Storage RLS + DB RLS enforce ownership server-side | Both enforced by policies from migration 0021 |
| T-21-14 | Signed URL forwarding: 1-hour TTL accepted risk | createSignedUrls(paths, 3600) — TTL enforced |
| T-21-15 | Orphaned storage on RPC failure: storage.remove([storagePath]) on any RPC error | usePlanPhotos.ts line 113 |
| T-21-16 | createSignedUrls without membership check: plan_photos SELECT RLS verifies membership before rows returned | RLS policy from migration 0021 |

## Self-Check: PASSED

Files:
- FOUND: src/hooks/usePlanPhotos.ts
- FOUND: tests/unit/usePlanPhotos.photoCap.test.ts (extended)

Commits:
- FOUND: 20e713e feat(21-03): create usePlanPhotos hook with signed URL batch + RPC integration
- FOUND: 432b65a test(21-03): extend photoCap tests with assembly shape and deletePhoto precondition

Test results: 6 passed (uploadPlanPhoto) + 13 passed (usePlanPhotos.photoCap) = 19 total, 0 failed

TypeScript: 29 errors (all pre-existing), 0 new errors from Phase 21 deliverables

## Next Phase Readiness

- `usePlanPhotos(planId)` is ready for Phase 22 to consume from PlanDashboardScreen
- Hook returns the complete D-13 signature: `{ photos: PlanPhotoWithUploader[], loading, error, uploadPhoto, deletePhoto, refetch }`
- No blockers

---
*Phase: 21-gallery-foundation*
*Completed: 2026-04-30*
