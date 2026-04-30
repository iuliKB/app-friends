---
phase: 21-gallery-foundation
plan: "01"
subsystem: gallery
tags: [database, migration, types, test-scaffolds, rls, storage]
dependency_graph:
  requires: []
  provides: [plan_photos-table, plan-gallery-bucket, add_plan_photo-rpc, PlanPhoto-type, PlanPhotoWithUploader-type]
  affects: [src/types/database.ts, supabase/migrations]
tech_stack:
  added: []
  patterns: [SECURITY-DEFINER-RPC, foldername-storage-rls, nyquist-wave-0-test-scaffold]
key_files:
  created:
    - tests/unit/uploadPlanPhoto.test.ts
    - tests/unit/usePlanPhotos.photoCap.test.ts
    - supabase/migrations/0021_gallery_foundation.sql
  modified:
    - src/types/database.ts
decisions:
  - "parseGalleryPathSegments uses ?? '' fallback for array access to satisfy noUncheckedIndexedAccess"
  - "buildGalleryPath test uses photoId without extension so appended .jpg produces correct path"
  - "TS baseline had 30 pre-existing errors; our changes reduce to 29 (no new errors introduced)"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-30"
  tasks_completed: 3
  files_modified: 4
---

# Phase 21 Plan 01: Gallery Foundation — Schema, Migration, Types, and Test Scaffolds

One-liner: PostgreSQL gallery schema with SECURITY DEFINER RPC enforcing 10-photo cap, private plan-gallery storage bucket with membership-aware RLS, and TypeScript types with Wave 0 Nyquist test scaffolds.

## What Was Built

### Task 1: Wave 0 Test Scaffolds (commit 8486572)

Two test files created using the canonical `npx tsx` pattern (node:assert/strict, no framework):

- `tests/unit/uploadPlanPhoto.test.ts` — 6 tests for D-04 path construction (`buildGalleryPath`, `parseGalleryPathSegments`). Tests verify the `{plan_id}/{user_id}/{photo_id}.jpg` format, 3-segment structure, and storage-path-not-URL invariant.
- `tests/unit/usePlanPhotos.photoCap.test.ts` — 8 tests for cap boundary logic (`checkPhotoCap`) and RPC error classification (`classifyRpcError`). Tests verify the >= 10 cap boundary (9 allowed, 10 denied), P0001 → `photo_cap_exceeded` mapping, and generic error → `upload_failed` fallback.

Both files exit 0 with 0 failures.

### Task 2: Migration 0021 (commit 1104408)

`supabase/migrations/0021_gallery_foundation.sql` with 7 sections:

1. `plan_photos` table: id, plan_id, uploader_id, storage_path, created_at — RLS enabled
2. Composite index on `(plan_id, created_at)` for gallery listing performance
3. `CREATE OR REPLACE FUNCTION public.is_plan_member` — safe redefinition of existing 0005 helper
4. Table RLS: `plan_photos_select_member` (members read), `plan_photos_delete_own` (uploader deletes) — NO INSERT policy enforces deny-by-default
5. Private `plan-gallery` bucket (`public = false`) — signed URLs required to read
6. Storage RLS: `plan_gallery_select_member` / `plan_gallery_insert_member` (membership via `is_plan_member((foldername)[1]::uuid)`) and `plan_gallery_delete_own` (path ownership via `(foldername)[2] = auth.uid()::text`)
7. `add_plan_photo(p_plan_id, p_storage_path)` SECURITY DEFINER RPC: checks auth, verifies membership, enforces 10-photo cap (RAISE EXCEPTION 'photo_cap_exceeded' USING ERRCODE = 'P0001'), inserts row with `auth.uid()` as uploader

### Task 3: TypeScript Types (commit f0603e0)

Two additions to `src/types/database.ts`:

- `plan_photos` table block inside `Tables: {}` with Row/Insert/Update/Relationships (two FK relationships: plan_id→plans, uploader_id→users)
- `export type PlanPhoto = Tables<'plan_photos'>` — simple row alias
- `export type PlanPhotoWithUploader` — app-layer type with camelCase fields, `signedUrl: string` (1h TTL), and nested `uploader: { displayName, avatarUrl }` for the hook (D-14)

## Deviations from Plan

### Minor adjustments

**1. [Rule 2 - Missing Null Safety] parseGalleryPathSegments uses ?? '' fallback**
- **Found during:** Task 1
- **Issue:** `noUncheckedIndexedAccess` makes `parts[0]`, `parts[1]`, `parts[2]` type `string | undefined` — return type requires `string`
- **Fix:** Added `?? ''` fallback on each array access. Tests still pass with no behavior change.
- **Files modified:** tests/unit/uploadPlanPhoto.test.ts

**2. [Rule 1 - Test Logic] buildGalleryPath first test adjusted photoId**
- **Found during:** Task 1
- **Issue:** Plan spec's first test passed `'photo-123.jpg'` as photoId but expected `'plan-abc/user-xyz/photo-123.jpg'` — the function appends `.jpg` so input with `.jpg` would produce double suffix
- **Fix:** Changed test input to `'photo-123'` (no extension) so `buildGalleryPath` produces the expected `plan-abc/user-xyz/photo-123.jpg`. Comment clarified: "photoId without extension — helper appends .jpg"
- **Files modified:** tests/unit/uploadPlanPhoto.test.ts

## Known Stubs

None — this plan delivers schema, types, and test scaffolds only. No UI components or data-fetching hooks.

## Threat Surface Scan

All threat mitigations from the plan's threat model are present in the migration:

| T-ID | Mitigation | Verified in SQL |
|------|-----------|----------------|
| T-21-01 | plan_photos_select_member uses is_plan_member SECURITY DEFINER | Section 4 |
| T-21-02 | plan_gallery_select_member uses is_plan_member on foldername[1] | Section 6 |
| T-21-03 | add_plan_photo: count + insert in single plpgsql transaction | Section 7 |
| T-21-04 | RPC accepts only p_plan_id + p_storage_path; uploader = auth.uid() | Section 7 |
| T-21-05 | No INSERT policy on plan_photos — RLS deny-by-default | Section 4 comment |
| T-21-06 | CREATE OR REPLACE (not CREATE) for is_plan_member | Section 3 |
| T-21-07 | File content validation deferred to Plan 02 — accepted | N/A |

## Self-Check: PASSED

Files created:
- FOUND: tests/unit/uploadPlanPhoto.test.ts
- FOUND: tests/unit/usePlanPhotos.photoCap.test.ts
- FOUND: supabase/migrations/0021_gallery_foundation.sql

Types:
- FOUND: PlanPhoto export in src/types/database.ts
- FOUND: PlanPhotoWithUploader export in src/types/database.ts

Commits:
- FOUND: 8486572 test(21-01): add Wave 0 test scaffolds
- FOUND: 1104408 feat(21-01): add migration 0021
- FOUND: f0603e0 feat(21-01): add plan_photos types to database.ts

Test results: 6 passed + 8 passed = 14 total, 0 failed
