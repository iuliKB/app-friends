---
phase: 21-gallery-foundation
fixed_at: 2026-04-30T00:00:00Z
review_path: .planning/phases/21-gallery-foundation/21-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 21: Code Review Fix Report

**Fixed at:** 2026-04-30T00:00:00Z
**Source review:** .planning/phases/21-gallery-foundation/21-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (CR-01, CR-02, WR-01, WR-02, WR-03)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Storage INSERT policy does not enforce path ownership

**Files modified:** `supabase/migrations/0021_gallery_foundation.sql`
**Commit:** 4050434
**Applied fix:** Added `AND (storage.foldername(name))[2] = auth.uid()::text` to the `plan_gallery_insert_member` policy WITH CHECK clause. This prevents a plan member from uploading to a path where the userId segment names another user, closing the path-spoofing vulnerability.

---

### CR-02: `add_plan_photo` return type in `database.ts` is `undefined` instead of `uuid`

**Files modified:** `src/types/database.ts`
**Commit:** b244f07
**Applied fix:** Changed `Returns: undefined` to `Returns: string` (with a comment noting it is the uuid of the inserted plan_photos row) at line 819 in the `add_plan_photo` function type declaration. The TypeScript type now matches the SQL function's `RETURNS uuid`.

---

### WR-01: Delete ordering creates unrecoverable orphaned storage objects

**Files modified:** `src/hooks/usePlanPhotos.ts`
**Commit:** 36d8cc7
**Applied fix:** Reversed the delete order in `deletePhoto`. The DB row is now deleted first; if that fails, the function returns the error without touching storage (the object remains visible and retryable). Storage removal happens only after the DB delete succeeds. A storage failure at that point is logged but does not block the caller — the row is gone and cleanup can be handled separately.

---

### WR-02: Storage cleanup error after RPC failure is silently swallowed

**Files modified:** `src/hooks/usePlanPhotos.ts`
**Commit:** 0d0b34b
**Applied fix:** Captured the result of `supabase.storage.from('plan-gallery').remove([storagePath])` into `{ error: cleanupError }` and added a `console.error` log when `cleanupError` is set. Orphaned storage objects that fail cleanup are now surfaced in the console rather than silently dropped.

---

### WR-03: Empty string fallback for missing signed URL causes silent broken images

**Files modified:** `src/hooks/usePlanPhotos.ts`, `src/types/database.ts`
**Commit:** 1a73f05
**Applied fix:** Changed the fallback from `?? ''` to `?? null` in the `signedUrl` assembly in `usePlanPhotos.ts`, and updated `PlanPhotoWithUploader.signedUrl` type from `string` to `string | null` in `database.ts`. UI components can now explicitly handle the null case (placeholder, skip render) rather than silently receiving an empty string that produces a broken image.

---

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-04-30T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
