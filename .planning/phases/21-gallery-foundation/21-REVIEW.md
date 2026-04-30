---
phase: 21-gallery-foundation
reviewed: 2026-04-30T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - tests/unit/uploadPlanPhoto.test.ts
  - tests/unit/usePlanPhotos.photoCap.test.ts
  - supabase/migrations/0021_gallery_foundation.sql
  - src/types/database.ts
  - src/lib/uploadPlanPhoto.ts
  - src/hooks/usePlanPhotos.ts
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-04-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 21 introduces the plan photo gallery: a `plan_photos` table, a private `plan-gallery` storage bucket, RLS policies, an `add_plan_photo` SECURITY DEFINER RPC, and the `usePlanPhotos` hook with upload/delete/refetch logic. The overall architecture is sound — the use of a SECURITY DEFINER RPC for the cap check, batch signed-URL generation, and storage path ownership encoding are all correct patterns.

Two critical issues were found: a storage INSERT policy that allows path spoofing (a plan member can craft a path claiming to be another user, breaking downstream delete authorization), and a type mismatch in `database.ts` where the RPC return type is declared `undefined` instead of `uuid`. Three warnings cover an orphan-creating delete ordering bug, an unhandled cleanup error that produces silent orphans, and a silent empty-string fallback for signed URL failures.

---

## Critical Issues

### CR-01: Storage INSERT policy does not enforce path ownership — userId segment can be spoofed

**File:** `supabase/migrations/0021_gallery_foundation.sql:79-83`

**Issue:** The `plan_gallery_insert_member` policy permits any plan member to upload to any path within the plan's folder, including paths where segment `[2]` (the userId) names a different user:

```sql
CREATE POLICY "plan_gallery_insert_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plan-gallery'
    AND public.is_plan_member((storage.foldername(name))[1]::uuid)
    -- Missing: (storage.foldername(name))[2] = auth.uid()::text
  );
```

A member could upload to `{planId}/{victimUserId}/{photoId}.jpg`. The DB row will correctly record the real `uploader_id` (via `auth.uid()` in the RPC), but the storage object's path segment lies about ownership. The `plan_gallery_delete_own` storage policy then trusts segment `[2]` for DELETE authorization — meaning the victim user gains unauthorized delete access to that storage object, and the actual uploader loses it.

**Fix:** Add a path-segment ownership check to the INSERT policy:

```sql
CREATE POLICY "plan_gallery_insert_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plan-gallery'
    AND public.is_plan_member((storage.foldername(name))[1]::uuid)
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
```

---

### CR-02: `add_plan_photo` return type in `database.ts` is `undefined` instead of `uuid`

**File:** `src/types/database.ts:819`

**Issue:** The TypeScript type declaration for `add_plan_photo` specifies `Returns: undefined`, but the SQL function is `RETURNS uuid` and returns the newly inserted `plan_photos.id`. This is a type contract lie — any caller doing `const { data } = await supabase.rpc('add_plan_photo', ...)` will have `data` typed as `never`/`undefined`, hiding the returned photo ID from callers who might need it (e.g., for optimistic UI or deduplication).

```typescript
// Current (wrong):
add_plan_photo: {
  Args: { p_plan_id: string; p_storage_path: string };
  Returns: undefined;
};

// Should be:
add_plan_photo: {
  Args: { p_plan_id: string; p_storage_path: string };
  Returns: string;  // uuid of the inserted plan_photos row
};
```

**Fix:** Change `Returns: undefined` to `Returns: string` at `src/types/database.ts:819`.

---

## Warnings

### WR-01: Delete ordering creates unrecoverable orphaned storage objects

**File:** `src/hooks/usePlanPhotos.ts:141-153`

**Issue:** `deletePhoto` removes the storage object first, then deletes the DB row. If the storage delete fails for a transient reason (network timeout, etc.), the function logs the error and continues to delete the DB row anyway. This produces a storage orphan — a storage object with no referencing DB row and no cleanup path, since the row is gone and `refetch` will no longer surface the photo.

The comment says "Storage errors do not prevent row cleanup" but inverts the safer order. If the DB delete fails first, the storage object survives and can be retried. If the storage delete fails first and the DB row is deleted, the object is stranded forever.

```typescript
// Current order: storage first (dangerous on transient failure)
const { error: storageError } = await supabase.storage.from('plan-gallery').remove([photo.storagePath]);
if (storageError) {
  console.error(...)
  // falls through to DB delete — orphan risk
}
const { error: dbError } = await supabase.from('plan_photos').delete().eq('id', photoId);
```

**Fix:** Reverse the order — delete the DB row first. If the DB delete fails, return the error without touching storage. Only remove the storage object after the DB row is confirmed deleted. A dangling storage object with a live DB row is visible to the app and retryable; a dangling storage object with no DB row is invisible and permanent.

```typescript
// Safer order: DB first
const { error: dbError } = await supabase.from('plan_photos').delete().eq('id', photoId);
if (dbError) return { error: new Error(dbError.message) };

const { error: storageError } = await supabase.storage.from('plan-gallery').remove([photo.storagePath]);
if (storageError) {
  console.error('[usePlanPhotos] Storage delete failed (row already deleted):', storageError.message);
  // Acceptable — row is gone; storage cleanup can be handled separately
}
await refetch();
return { error: null };
```

---

### WR-02: Storage cleanup error after RPC failure is silently swallowed

**File:** `src/hooks/usePlanPhotos.ts:114-115`

**Issue:** When `add_plan_photo` RPC fails, the hook correctly attempts to remove the orphaned storage object. However, the result of `remove()` is discarded — if the cleanup itself fails, the storage object is permanently orphaned with no log entry and no retry mechanism.

```typescript
// Current:
await supabase.storage.from('plan-gallery').remove([storagePath]);
if (rpcError.code === 'P0001') return { error: 'photo_cap_exceeded' };
```

**Fix:** Capture and log the cleanup result:

```typescript
const { error: cleanupError } = await supabase.storage.from('plan-gallery').remove([storagePath]);
if (cleanupError) {
  console.error('[usePlanPhotos] Orphan cleanup failed for path:', storagePath, cleanupError.message);
}
if (rpcError.code === 'P0001') return { error: 'photo_cap_exceeded' };
```

---

### WR-03: Empty string fallback for missing signed URL causes silent broken images

**File:** `src/hooks/usePlanPhotos.ts:80`

**Issue:** When `createSignedUrls` does not return a signed URL for a given path (partial failure or missing object), `signedUrl` falls back to `''`. Image components receiving an empty string as source render broken images silently. The `PlanPhotoWithUploader` type declares `signedUrl: string` (non-nullable), so callers have no type-level signal to guard against this case.

```typescript
signedUrl: signedMap.get(r.storage_path as string) ?? '',
```

**Fix:** Change the fallback to `null` and update the type to `signedUrl: string | null` in both `src/types/database.ts:873` and the assembly in `usePlanPhotos.ts`. UI can then explicitly handle the null case (e.g., show a placeholder or skip rendering).

```typescript
// In usePlanPhotos.ts:
signedUrl: signedMap.get(r.storage_path as string) ?? null,

// In database.ts PlanPhotoWithUploader:
signedUrl: string | null;  // null when signed URL generation failed
```

---

## Info

### IN-01: Photo ID generation uses low-entropy randomness — collision produces silent upload error

**File:** `src/lib/uploadPlanPhoto.ts:31`

**Issue:** The photo ID is `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` — approximately 7 base-36 characters of randomness (~78 billion combinations). With `upsert: false`, a collision results in a storage upload error that `uploadPlanPhoto` returns as `null`, surfacing to the user as a generic upload failure with no message. This is extremely unlikely in practice for a mobile app but worth noting if the pattern is copied elsewhere.

```typescript
const photoId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
```

**Fix (optional):** Use more entropy if available, or simply extend the random segment:

```typescript
const photoId = `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2, 6)}`;
```

Or, since the project comment notes `crypto.randomUUID()` is unavailable in Hermes, use the `uuid` package which is likely already in the dependency tree for Expo projects.

---

_Reviewed: 2026-04-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
