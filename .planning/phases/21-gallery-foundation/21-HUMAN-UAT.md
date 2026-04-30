---
status: partial
phase: 21-gallery-foundation
source: [21-VERIFICATION.md]
started: 2026-04-30T00:00:00Z
updated: 2026-04-30T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Full photo library upload flow (GALL-01)
expected: A real photo library upload (via `usePlanPhotos.uploadPhoto`) reaches the `plan_photos` table with correct `plan_id`, `uploader_id`, and `storage_path`; the hook returns the photo with a valid `signedUrl` (non-empty, starts with `https://`)
result: [pending]

### 2. 10-photo cap enforcement (GALL-03)
expected: After 10 photos uploaded by the same user for the same plan, the 11th `uploadPhoto` call returns `{ error: 'photo_cap_exceeded' }`; no additional row appears in `plan_photos`; orphaned storage object (if any) is removed by the cleanup path
result: [pending]

### 3. Non-member RLS enforcement (SC-4 / GALL-01)
expected: A session authenticated as a user who is NOT a member of the plan cannot: (a) read any `plan_photos` rows for that plan, (b) generate a signed URL for any object in the `plan-gallery` bucket under that plan's path; Supabase returns a permission error for both attempts
result: [pending]

### 4. Camera capture upload (GALL-02)
expected: Once Phase 22 camera UI exists, a photo captured via `expo-camera` passes the same `localUri` → `uploadPlanPhoto` → `add_plan_photo` pipeline and appears in `plan_photos` correctly — same as library upload. Infrastructure is in place; UI trigger deferred to Phase 22.
result: [pending — blocked on Phase 22 UI]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
