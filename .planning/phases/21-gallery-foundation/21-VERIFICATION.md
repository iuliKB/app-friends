---
phase: 21-gallery-foundation
verified: 2026-04-30T12:00:00Z
status: human_needed
score: 10/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Upload a photo from device photo library via the app to an existing plan and confirm the row appears in plan_photos with the correct plan_id and uploader_id"
    expected: "Row inserted in plan_photos table; upload returns a storage path under plan-gallery/{planId}/{userId}/; usePlanPhotos refetch returns the photo in the photos array with a valid signedUrl"
    why_human: "Requires a running Supabase project, a live Expo app, and actual storage upload — cannot be verified by static analysis or unit tests"
  - test: "Attempt to upload an 11th photo after 10 are already stored for the same user+plan; verify the client receives { error: 'photo_cap_exceeded' } and no 11th row is inserted in plan_photos"
    expected: "add_plan_photo RPC raises P0001; usePlanPhotos.uploadPhoto returns { error: 'photo_cap_exceeded' }; plan_photos row count remains 10"
    why_human: "Requires live database state with 10 pre-existing rows and an actual RPC call through Supabase"
  - test: "As a user who is NOT a member of a plan, attempt to query plan_photos for that plan and attempt to read a storage object from plan-gallery for that plan"
    expected: "RLS denies both — SELECT on plan_photos returns empty or permission error; createSignedUrls call for non-member paths returns error or unusable URL"
    why_human: "Requires two distinct authenticated Supabase sessions — cannot be verified with static code inspection"
  - test: "Capture a photo using the in-app camera (once Phase 22 adds the camera picker UI) and confirm it uploads via uploadPlanPhoto and appears in the gallery"
    expected: "Camera localUri is accepted by uploadPlanPhoto; compressed JPEG lands in plan-gallery; row appears in plan_photos; signedUrl is readable by plan members"
    why_human: "Camera capture UI is Phase 22 responsibility — the Phase 21 infrastructure (uploadPlanPhoto accepts any localUri) is wired but the user-facing trigger does not exist yet"
---

# Phase 21: Gallery Foundation Verification Report

**Phase Goal:** The database schema, storage bucket, and upload pipeline for plan photos are in place and security-hardened — a developer can upload a photo to a plan and have it stored correctly, capped at 10 per participant, and readable only by plan members
**Verified:** 2026-04-30T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Migration file 0021_gallery_foundation.sql exists with all 7 sections (table, index, is_plan_member, table RLS, bucket, storage RLS, add_plan_photo RPC) | VERIFIED | File at supabase/migrations/0021_gallery_foundation.sql, 139 lines, all 7 sections confirmed via grep |
| 2 | database.ts contains plan_photos table block with Row/Insert/Update/Relationships and PlanPhoto/PlanPhotoWithUploader exports | VERIFIED | Lines 641–682 (plan_photos block), line 865 (PlanPhoto), lines 868–880 (PlanPhotoWithUploader with signedUrl field) |
| 3 | Test scaffolds exist for upload path logic and photo cap boundary logic, and both run green | VERIFIED | 6 passed (uploadPlanPhoto.test.ts) + 13 passed (usePlanPhotos.photoCap.test.ts) = 19 total, 0 failed |
| 4 | uploadPlanPhoto.ts compresses to 1920px/0.85, uploads via arrayBuffer to plan-gallery, returns storage path (not URL) | VERIFIED | manipulateAsync at width:1920 / compress:0.85 on line 23–27; upload to plan-gallery line 42; returns path line 55; no getPublicUrl call |
| 5 | uploadPlanPhoto.ts uses fetch(localUri).arrayBuffer() pattern, upsert:false, contentType:image/jpeg | VERIFIED | Lines 34–46 confirmed all three options present |
| 6 | usePlanPhotos(planId) returns the D-13 signature: { photos, loading, error, uploadPhoto, deletePhoto, refetch } | VERIFIED | Function signature on lines 9–16 matches exactly |
| 7 | photos array items include signedUrl (1-hour TTL) via batch createSignedUrls and uploader joined from profiles | VERIFIED | createSignedUrls(paths, 3600) on line 65; profiles join on lines 51–54; PlanPhotoWithUploader assembly on lines 73–87 |
| 8 | uploadPhoto returns { error: 'photo_cap_exceeded' } when RPC returns P0001; orphaned storage object removed on RPC failure | VERIFIED | rpcError.code === 'P0001' on line 116; storage.remove([storagePath]) on line 115 |
| 9 | deletePhoto removes storage object first then deletes plan_photos row | VERIFIED | storage.from('plan-gallery').remove on line 138–139; DB delete on lines 150–153; continues DB delete even on storage failure |
| 10 | Signed URLs generated via createSignedUrls batch (not per-photo loop) | VERIFIED | Single createSignedUrls call line 65; no per-photo createSignedUrl loop found |
| 11 | Non-member RLS enforcement: users not in plan_members cannot read/write plan_photos or plan-gallery storage | HUMAN NEEDED | Policies exist in migration (plan_photos_select_member, plan_gallery_select_member); enforcement requires live database test with two auth sessions |

**Score:** 10/11 truths verified (1 requires human verification)

### Deferred Items

No items deferred to later phases. Phase 22 owns camera capture UI (GALL-02 user-facing trigger) but the infrastructure (uploadPlanPhoto accepting any localUri) is complete in Phase 21.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0021_gallery_foundation.sql` | Complete gallery schema: table + index + RLS + bucket + storage RLS + RPC | VERIFIED | 139 lines, all 7 sections present, no plain CREATE FUNCTION (uses CREATE OR REPLACE) |
| `src/types/database.ts` | plan_photos Row/Insert/Update types + PlanPhoto export + add_plan_photo Function type | VERIFIED | plan_photos block at line 641; PlanPhoto at 865; PlanPhotoWithUploader at 868; add_plan_photo Function at 814 |
| `tests/unit/uploadPlanPhoto.test.ts` | Wave 0 scaffold for upload path logic | VERIFIED | 6 tests, all passing; tests buildGalleryPath D-04 format and parseGalleryPathSegments |
| `tests/unit/usePlanPhotos.photoCap.test.ts` | Wave 0 scaffold for cap boundary logic, extended with assembly and deletePhoto tests | VERIFIED | 13 tests (8 original + 5 extended), all passing |
| `src/lib/uploadPlanPhoto.ts` | Compress + arrayBuffer upload + return storagePath | VERIFIED | Exports uploadPlanPhoto; manipulateAsync 1920px/0.85; plan-gallery upload; returns path not URL |
| `src/hooks/usePlanPhotos.ts` | Full hook with D-13 through D-16 spec | VERIFIED | Exports usePlanPhotos; complete fetch/upload/delete/refetch implementation |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `supabase/migrations/0021_gallery_foundation.sql` | `public.plan_members` | `CREATE OR REPLACE FUNCTION public.is_plan_member` | VERIFIED | Line 26 uses CREATE OR REPLACE, not CREATE — safe redefinition |
| `supabase/migrations/0021_gallery_foundation.sql` | `storage.objects` | `plan_gallery_select_member` using is_plan_member + foldername[1]::uuid | VERIFIED | Line 69–74 confirmed pattern exact |
| `src/types/database.ts` | `plan_photos` | `Tables<'plan_photos'>` generic + PlanPhoto named export | VERIFIED | Line 865: export type PlanPhoto = Tables<'plan_photos'> |
| `src/lib/uploadPlanPhoto.ts` | `plan-gallery` Storage bucket | `supabase.storage.from('plan-gallery').upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false })` | VERIFIED | Lines 41–46 |
| `src/lib/uploadPlanPhoto.ts` | `expo-image-manipulator` | `manipulateAsync(localUri, [{ resize: { width: 1920 } }], { compress: 0.85, format: SaveFormat.JPEG })` | VERIFIED | Lines 23–27 |
| `src/hooks/usePlanPhotos.ts` | `src/lib/uploadPlanPhoto.ts` | `import { uploadPlanPhoto } from '@/lib/uploadPlanPhoto'` | VERIFIED | Line 4; called at line 104 |
| `src/hooks/usePlanPhotos.ts` | `add_plan_photo` RPC | `supabase.rpc('add_plan_photo', { p_plan_id, p_storage_path })` | VERIFIED | Lines 108–111; P0001 detection on line 116 |
| `src/hooks/usePlanPhotos.ts` | `plan-gallery` Storage | `supabase.storage.from('plan-gallery').createSignedUrls(paths, 3600)` | VERIFIED | Lines 63–65 |
| `src/hooks/usePlanPhotos.ts` | `profiles` table | `supabase.from('profiles').select('id, display_name, avatar_url').in('id', uploaderIds)` | VERIFIED | Lines 51–54 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `src/hooks/usePlanPhotos.ts` | `photos: PlanPhotoWithUploader[]` | Supabase query on plan_photos + profiles join + createSignedUrls batch | Yes — queries plan_photos WHERE plan_id = planId, joins real profiles, generates real signed URLs | FLOWING |
| `src/hooks/usePlanPhotos.ts` | `uploadPhoto` return value | uploadPlanPhoto → add_plan_photo RPC → typed error surface | Yes — real Storage upload, real RPC call, typed P0001 detection | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| uploadPlanPhoto.test.ts: 6 path construction tests | `NODE_OPTIONS="" npx tsx tests/unit/uploadPlanPhoto.test.ts` | Results: 6 passed, 0 failed | PASS |
| usePlanPhotos.photoCap.test.ts: 13 cap/assembly tests | `NODE_OPTIONS="" npx tsx tests/unit/usePlanPhotos.photoCap.test.ts` | Results: 13 passed, 0 failed | PASS |
| TypeScript compile: no new errors from Phase 21 files | `NODE_OPTIONS="" npx tsc --noEmit` | 29 errors (all pre-existing baseline); zero errors attributable to Phase 21 files | PASS |
| Migration has no plain CREATE FUNCTION (only CREATE OR REPLACE) | `grep "CREATE FUNCTION public.is_plan_member" migration | grep -v "OR REPLACE"` | 0 matches | PASS |
| No INSERT RLS policy on plan_photos (deny by default) | `grep "POLICY.*INSERT.*plan_photos" migration` | 0 matches | PASS |
| No getPublicUrl in uploadPlanPhoto or usePlanPhotos | `grep "getPublicUrl" upload+hook files` | 0 actual calls (only JSDoc warning comment in uploadPlanPhoto.ts) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| GALL-01 | 21-01, 21-02, 21-03 | Each plan participant can upload photos to the plan gallery from their photo library | SATISFIED | uploadPlanPhoto + usePlanPhotos.uploadPhoto wired end-to-end; plan_photos table + RLS enforce membership; runtime verification needed for user-facing proof |
| GALL-02 | 21-01, 21-02, 21-03 | Each plan participant can capture and upload using the in-app camera | PARTIALLY SATISFIED | Infrastructure supports any localUri (camera or library); uploadPlanPhoto accepts camera-captured URIs; camera picker UI is Phase 22 responsibility — NEEDS HUMAN to confirm end-to-end flow once UI exists |
| GALL-03 | 21-01, 21-02, 21-03 | Each participant is limited to 10 photos per plan (enforced server-side) | SATISFIED | add_plan_photo RPC: `IF v_count >= 10 THEN RAISE EXCEPTION 'photo_cap_exceeded' USING ERRCODE = 'P0001'`; hook surfaces this as typed error; unit tests cover cap boundary logic |

### Anti-Patterns Found

No blocking anti-patterns found. Scan of all Phase 21 deliverables:

- No TODO/FIXME/HACK/placeholder comments
- No stub return values (return null, return [], return {}) used as final values in non-error paths
- No getPublicUrl calls on the private bucket
- No per-photo createSignedUrl loop (batch call used correctly)
- No hardcoded empty data passed to rendering paths

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/uploadPlanPhoto.ts` | 54 | JSDoc comment containing "getPublicUrl" as a warning | Info | Not a call — intentional documentation warning about what NOT to do |

### Human Verification Required

#### 1. Full Upload Flow (GALL-01)

**Test:** In a running Expo app with a linked Supabase project, select a photo from the device photo library and upload it to an existing plan using the gallery feature (once Phase 22 UI exists, or via a temporary test harness calling usePlanPhotos directly).
**Expected:** uploadPlanPhoto compresses the image, uploads to plan-gallery bucket with path format `{planId}/{userId}/{timestamp-random}.jpg`, add_plan_photo RPC inserts a row in plan_photos with correct plan_id and uploader_id, usePlanPhotos.refetch() returns the photo in the photos array with a valid signedUrl.
**Why human:** Requires a live Supabase project with migration 0021 applied, an authenticated session, and actual Storage I/O — cannot be verified with static analysis or unit tests.

#### 2. 10-Photo Cap Enforcement (GALL-03)

**Test:** Upload 10 photos as the same user for the same plan, then attempt to upload an 11th.
**Expected:** The 11th upload returns `{ error: 'photo_cap_exceeded' }` from usePlanPhotos.uploadPhoto; the plan_photos table has exactly 10 rows for that user+plan combination; the Storage object for the attempted 11th upload is cleaned up (remove called on RPC failure).
**Why human:** Requires a live database with 10 pre-existing rows and an actual Supabase RPC invocation — unit tests cover the logic but not the live integration.

#### 3. Non-Member RLS Enforcement (SC-4)

**Test:** As a user who is NOT in plan_members for a specific plan, attempt to (a) SELECT from plan_photos for that plan's plan_id, and (b) call createSignedUrls for a path inside that plan's folder in plan-gallery.
**Expected:** Both return permission errors or empty results — RLS policies plan_photos_select_member and plan_gallery_select_member prevent access.
**Why human:** Requires two distinct authenticated Supabase sessions — one member session to create photos, one non-member session to verify denial. Cannot be emulated with static analysis.

#### 4. Camera Capture Upload (GALL-02)

**Test:** Once Phase 22 adds the camera capture button, trigger it from PlanDashboardScreen, capture a photo, and confirm it uploads to plan-gallery and appears in the gallery grid.
**Expected:** The camera localUri passes through uploadPlanPhoto unchanged (compression + upload), the photo appears in usePlanPhotos.photos with a valid signedUrl, the plan_photos row shows the correct uploader_id.
**Why human:** Camera picker UI does not yet exist (Phase 22 work). The infrastructure supports any localUri from either camera or library — but the user-facing camera flow needs the Phase 22 UI to be verified end-to-end.

### Git Commits Verified

All 6 Phase 21 commits confirmed present in git history:

| Commit | Description |
|--------|-------------|
| `8486572` | test(21-01): add Wave 0 test scaffolds |
| `1104408` | feat(21-01): add migration 0021 |
| `f0603e0` | feat(21-01): add plan_photos types to database.ts |
| `eafd7ca` | feat(21-02): create uploadPlanPhoto upload utility |
| `20e713e` | feat(21-03): create usePlanPhotos hook with signed URL batch + RPC integration |
| `432b65a` | test(21-03): extend photoCap tests with assembly shape and deletePhoto precondition |

---

_Verified: 2026-04-30T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
