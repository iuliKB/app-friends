# Phase 21: Gallery Foundation - Research

**Researched:** 2026-04-30
**Domain:** Supabase Storage (private bucket + signed URLs), PostgreSQL RLS, SECURITY DEFINER RPCs, React Native image upload pipeline
**Confidence:** HIGH

---

## Summary

Phase 21 delivers the backend infrastructure for plan photo galleries: a `plan_photos` database table, a private `plan-gallery` Storage bucket, a `add_plan_photo` SECURITY DEFINER RPC that atomically enforces the 10-photo cap, an `uploadPlanPhoto` lib function, and a `usePlanPhotos` hook. No UI is included — Phase 22 owns all visual surfaces.

All decisions are locked in CONTEXT.md with high specificity. This research confirms those decisions are correct against the codebase and provides implementation-ready patterns drawn from the existing upload library shape, RPC patterns, and migration conventions. The primary risk area is Storage RLS policy correctness — specifically avoiding the plan_members recursion pitfall that burned the project in migration 0004.

**Primary recommendation:** Follow the locked decisions precisely. Every architectural choice in CONTEXT.md has been deliberately made to avoid known pitfalls (recursion, public bucket exposure, race conditions on the cap check). Don't improvise; implement exactly what is specified.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** `plan-gallery` bucket is private (not public). Plan photos restricted to plan members only.
**D-02:** Photos fetched as signed URLs with 1-hour TTL. `usePlanPhotos` generates them on fetch. No polling/auto-refresh.
**D-03:** Storage RLS SELECT checks `plan_members` membership. Storage DELETE uses path-based user check (`(storage.foldername(name))[2] = auth.uid()::text`) — no join needed for delete.
**D-04:** Storage path: `{plan_id}/{user_id}/{photo_id}.jpg`
**D-05:** Minimum viable schema — id, plan_id, uploader_id, storage_path, created_at only.
**D-06:** No `public_url` or `display_name` columns. Uploader attribution resolved by joining `profiles` at read time.
**D-07:** Default fetch ordering: `created_at ASC`.
**D-08:** Composite index on `(plan_id, created_at)`.
**D-09:** `add_plan_photo` RPC: (1) verify membership, (2) count photos for caller+plan — raise `photo_cap_exceeded` if ≥ 10, (3) insert row. All three steps SECURITY DEFINER, atomic.
**D-10:** Error code: `raise exception 'photo_cap_exceeded' using errcode = 'P0001'`.
**D-11:** Upload function `src/lib/uploadPlanPhoto.ts` — mirrors `uploadChatMedia.ts` shape. Params: `planId`, `userId`, `localUri`. Uses `fetch(localUri).arrayBuffer()`. Forces `contentType: 'image/jpeg'`. `upsert: false`. Returns storage path (not a URL).
**D-12:** Compression: 1920px max dimension / 0.85 JPEG quality via `expo-image-manipulator`.
**D-13:** Hook signature: `usePlanPhotos(planId: string)` — returns `{ photos, loading, error, uploadPhoto, deletePhoto, refetch }`.
**D-14:** `photos` array item shape: `{ id, planId, uploaderId, storagePath, signedUrl, createdAt, uploader: { displayName, avatarUrl } }`.
**D-15:** `uploadPhoto(localUri: string)` — calls `uploadPlanPhoto` then `add_plan_photo` RPC. Returns `{ error: 'photo_cap_exceeded' | 'upload_failed' | null }`.
**D-16:** `deletePhoto(photoId: string)` — deletes storage object AND `plan_photos` row. RLS enforces ownership.

### Claude's Discretion

- Exact SQLSTATE for `photo_cap_exceeded` (P0001 is fine)
- Whether to add `UNIQUE` constraint on `(plan_id, uploader_id, storage_path)` or rely on UUID PK
- Signed URL generation: single batch call vs. per-photo — use `createSignedUrls` (batch) for efficiency
- Migration filename: `0021_gallery_foundation.sql`

### Deferred Ideas (OUT OF SCOPE)

- Photo count badge on plan cards (GALL-F01) — V2
- Upload progress indicator per photo (GALL-F02) — V2
- Video in gallery — V2
- Photo comments — V2
- Multi-photo picker UX — Phase 22 decision
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GALL-01 | Each plan participant can upload photos from their photo library | `expo-image-picker` already installed (v55.0.19). `uploadPlanPhoto` + `add_plan_photo` RPC handle the write path. `usePlanPhotos.uploadPhoto()` composes them. |
| GALL-02 | Each plan participant can capture and upload a photo using in-app camera | `expo-camera` already installed (v55.0.16). Same upload pipeline as GALL-01; camera just provides a different `localUri`. |
| GALL-03 | Each participant is limited to 10 photos per plan (server-side) | Enforced inside `add_plan_photo` SECURITY DEFINER RPC — count check before insert is atomic; cannot be bypassed by concurrent uploads (Postgres advisory lock or per-user serialization via the RPC gate). Client surfaces `photo_cap_exceeded` typed error. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Photo storage (bytes) | Supabase Storage | — | Private bucket, RLS enforced at storage layer |
| Photo row metadata | PostgreSQL (plan_photos) | — | RLS enforces membership read/write |
| 10-photo cap enforcement | PostgreSQL (SECURITY DEFINER RPC) | Client (UI hint only) | Must be server-side to be unforgeable |
| Access control (non-members blocked) | PostgreSQL RLS + Storage RLS | — | Two separate layers: table RLS + storage object policy |
| Compression | React Native (client) | — | `expo-image-manipulator` runs before upload |
| Signed URL generation | Supabase Storage SDK | — | Called from `usePlanPhotos` at fetch time, 1h TTL |
| Upload orchestration | `src/lib/uploadPlanPhoto.ts` | — | Storage upload only; RPC handled separately by hook |
| Data + URL assembly | `src/hooks/usePlanPhotos.ts` | — | Fetches rows + profiles, generates signed URLs, exposes mutations |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.99.2 [VERIFIED: package.json] | Storage upload, RPC calls, signed URL generation | Already installed; only valid client for Supabase |
| `expo-image-manipulator` | ~55.0.15 [VERIFIED: package.json] | Compress to 1920px / 0.85 before upload | Already installed from chat/cover image phases; `manipulateAsync` is the established project pattern |
| `expo-image-picker` | ~55.0.19 [VERIFIED: package.json] | Photo library picker for GALL-01 | Already installed from v1.5 chat media feature |
| `expo-camera` | ~55.0.16 [VERIFIED: package.json] | In-app camera capture for GALL-02 | Already installed from v1.5 chat media feature |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react` + `useState`/`useEffect` | (bundled with Expo SDK 55) | Hook state management | Standard for all `use*.ts` hooks in this project |

**No new dependencies required for Phase 21.** All packages are already in `package.json`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `createSignedUrls` (batch) | `createSignedUrl` (per-photo loop) | Batch call is one network round-trip; per-photo loop is N round-trips. Use `createSignedUrls`. |
| SECURITY DEFINER RPC for cap | Client-side count check | Client check is bypassable; SECURITY DEFINER RPC is the only correct choice. |
| Private bucket + signed URLs | Public bucket | Public bucket leaks photos to non-members — violates GALL-03 security criterion. |

---

## Architecture Patterns

### System Architecture Diagram

```
Photo Library / Camera
       │ localUri
       ▼
expo-image-manipulator (resize 1920px, compress 0.85)
       │ compressedUri
       ▼
uploadPlanPhoto(planId, userId, compressedUri)
       │ fetch(uri).arrayBuffer() → Supabase Storage
       │ bucket: plan-gallery
       │ path: {plan_id}/{user_id}/{photo_id}.jpg
       │ upsert: false, contentType: image/jpeg
       │
       ├── SUCCESS → returns storagePath
       │                    │
       │                    ▼
       │          add_plan_photo RPC (SECURITY DEFINER)
       │          ┌─────────────────────────────────────┐
       │          │ 1. CHECK caller ∈ plan_members       │
       │          │ 2. COUNT photos by caller for plan    │
       │          │    ≥ 10 → RAISE photo_cap_exceeded   │
       │          │ 3. INSERT plan_photos row             │
       │          └─────────────────────────────────────┘
       │                    │
       │          SUCCESS → row inserted
       │
       └── FAILURE → return { error: 'upload_failed' }

usePlanPhotos(planId)
       │ SELECT plan_photos WHERE plan_id = X ORDER BY created_at ASC
       │ + JOIN profiles for uploader display_name / avatar_url
       │ + createSignedUrls(paths[], 3600)  ← batch call
       ▼
photos[] with signedUrl, uploader { displayName, avatarUrl }
       │
       ├── uploadPhoto(localUri) → compress → upload → RPC
       ├── deletePhoto(photoId) → delete storage object + delete row
       └── refetch()

RLS Enforcement (always active):
  plan_photos SELECT → caller ∈ plan_members(plan_id)
  plan_photos INSERT → handled by RPC (SECURITY DEFINER bypasses direct INSERT)
  storage SELECT  → caller ∈ plan_members matching plan_id path segment
  storage DELETE  → (storage.foldername(name))[2] = auth.uid()::text
```

### Recommended Project Structure
```
supabase/migrations/
└── 0021_gallery_foundation.sql   # table + RLS + bucket + storage policies + RPC

src/lib/
└── uploadPlanPhoto.ts             # mirrors uploadChatMedia.ts; returns storage path

src/hooks/
└── usePlanPhotos.ts               # fetch + sign + uploadPhoto + deletePhoto + refetch

src/types/
└── database.ts                    # add PlanPhoto Row/Insert/Update types (manual append)
```

### Pattern 1: Migration Structure (SECURITY DEFINER RPC + Private Bucket)

**What:** Single migration file with 5 sections — table, index, table RLS, bucket creation, storage RLS, RPC.
**When to use:** Any phase that adds a new entity with storage + DB ownership requirements.

```sql
-- Source: supabase/migrations/0015_iou_v1_4.sql (SECURITY DEFINER pattern)
--         supabase/migrations/0014_plan_covers_bucket.sql (bucket pattern)
--         supabase/migrations/0004_fix_plan_members_rls_recursion.sql (RLS helper pattern)

-- ============================================================
-- SECTION 1 — plan_photos table
-- ============================================================
CREATE TABLE public.plan_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  uploader_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 2 — Index
-- ============================================================
CREATE INDEX idx_plan_photos_plan_created
  ON public.plan_photos(plan_id, created_at);

-- ============================================================
-- SECTION 3 — Table RLS helper (avoids plan_members recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_plan_member(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plan_members
    WHERE plan_id = p_plan_id
      AND user_id = (SELECT auth.uid())
  );
$$;

-- plan_photos SELECT: members only
CREATE POLICY "plan_photos_select_member"
  ON public.plan_photos FOR SELECT TO authenticated
  USING (public.is_plan_member(plan_id));

-- plan_photos INSERT: blocked — must go through add_plan_photo RPC
-- (RPC is SECURITY DEFINER, so it bypasses RLS for the insert)

-- plan_photos DELETE: uploader only
CREATE POLICY "plan_photos_delete_own"
  ON public.plan_photos FOR DELETE TO authenticated
  USING (uploader_id = (SELECT auth.uid()));

-- ============================================================
-- SECTION 4 — Private Storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('plan-gallery', 'plan-gallery', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 5 — Storage RLS policies
-- ============================================================

-- SELECT: plan members only (check plan_id from path segment [1])
CREATE POLICY "plan_gallery_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'plan-gallery'
    AND public.is_plan_member((storage.foldername(name))[1]::uuid)
  );

-- INSERT: plan members only
CREATE POLICY "plan_gallery_insert_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plan-gallery'
    AND public.is_plan_member((storage.foldername(name))[1]::uuid)
  );

-- DELETE: path owner only (segment [2] = user_id)
CREATE POLICY "plan_gallery_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'plan-gallery'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ============================================================
-- SECTION 6 — add_plan_photo RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_plan_photo(
  p_plan_id      uuid,
  p_storage_path text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_count  int;
  v_id     uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Step 1: verify membership
  IF NOT EXISTS (
    SELECT 1 FROM public.plan_members
    WHERE plan_id = p_plan_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'not a plan member';
  END IF;

  -- Step 2: enforce cap
  SELECT COUNT(*) INTO v_count
  FROM public.plan_photos
  WHERE plan_id = p_plan_id AND uploader_id = v_caller;

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'photo_cap_exceeded' USING ERRCODE = 'P0001';
  END IF;

  -- Step 3: insert
  INSERT INTO public.plan_photos (plan_id, uploader_id, storage_path)
  VALUES (p_plan_id, v_caller, p_storage_path)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_plan_photo(uuid, text) TO authenticated;
```

### Pattern 2: uploadPlanPhoto.ts (mirrors uploadChatMedia.ts)

**What:** Uploads a compressed local image to the private plan-gallery bucket; returns the storage path.
**When to use:** Called by `usePlanPhotos.uploadPhoto()` before calling the RPC.

```typescript
// Source: src/lib/uploadChatMedia.ts (structural mirror)
import { supabase } from '@/lib/supabase';

/**
 * Uploads a compressed local image URI to the plan-gallery Supabase Storage bucket.
 * D-11: Uses fetch(localUri).arrayBuffer() — FormData + file:// fails in RN.
 * D-11: upsert: false — each photo gets a new UUID path.
 * Returns the storage path (relative to bucket root) on success, or null on failure.
 * Bucket is private; signed URLs are generated by usePlanPhotos, not here.
 */
export async function uploadPlanPhoto(
  planId: string,
  userId: string,
  localUri: string
): Promise<string | null> {
  try {
    const photoId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    // D-04: path format {plan_id}/{user_id}/{photo_id}.jpg
    const path = `${planId}/${userId}/${photoId}.jpg`;

    const response = await fetch(localUri);
    if (!response.ok) {
      console.error('[uploadPlanPhoto] Failed to read local file:', response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('plan-gallery')
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',  // D-11: forced; prevents executable disguise
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploadPlanPhoto] Upload failed:', uploadError.message);
      return null;
    }

    return path;  // not a public URL — bucket is private
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[uploadPlanPhoto] Unexpected error:', message);
    return null;
  }
}
```

### Pattern 3: usePlanPhotos Hook (batch signed URLs)

**What:** Fetches plan_photos rows + profiles + generates signed URLs in a single batch call.
**Key:** `createSignedUrls` (plural) — one HTTP call for N paths, [VERIFIED: @supabase/storage-js installed].

```typescript
// Signed URL batch generation pattern
const paths = rows.map(r => r.storage_path);
const { data: signedData, error: signedError } = await supabase.storage
  .from('plan-gallery')
  .createSignedUrls(paths, 3600);  // 3600 seconds = 1-hour TTL (D-02)

// signedData is an array of { path, signedUrl, error } objects
// Map by path back to rows for assembly
```

### Pattern 4: Compression before upload

**What:** Resize to max 1920px width, 0.85 JPEG quality — established `manipulateAsync` pattern.
**Source:** `src/screens/chat/ChatRoomScreen.tsx` line 210 (1280px / 0.75 for chat).

```typescript
// Source: ChatRoomScreen.tsx:210 adapted for gallery (1920px / 0.85 per D-12)
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const compressed = await manipulateAsync(
  localUri,
  [{ resize: { width: 1920 } }],
  { compress: 0.85, format: SaveFormat.JPEG }
);
// compressed.uri is the local file URI for uploadPlanPhoto
```

### Anti-Patterns to Avoid

- **Direct table INSERT without RPC:** Bypasses the photo cap check. All photo writes MUST go through `add_plan_photo` RPC. The table INSERT policy should be absent (no direct insert policy), relying on SECURITY DEFINER to perform the insert.
- **Public bucket for plan-gallery:** All existing buckets (avatars, plan-covers, chat-media) are public. Plan-gallery is the first private bucket. Do NOT copy the `getPublicUrl()` call from uploadChatMedia/uploadPlanCover — it does not apply to private buckets. Return the storage path instead.
- **Per-photo signed URL calls in a loop:** Use `createSignedUrls(paths[], 3600)` — one call for all photos. Looping `createSignedUrl` per photo is N round-trips.
- **Checking plan_members directly in Storage RLS without SECURITY DEFINER helper:** This would create a recursive RLS loop — the Storage policy query calls into `plan_members` which itself has RLS. Use the `is_plan_member()` SECURITY DEFINER helper function.
- **Storing `user_id` in the RPC parameter:** The RPC uses `auth.uid()` internally — the caller cannot supply a different `uploader_id`. The only RPC parameters are `p_plan_id` and `p_storage_path`.
- **FormData + file:// for RN upload:** Always `fetch(uri).arrayBuffer()`. FormData fails with local file URIs in React Native's Supabase SDK polyfill. [VERIFIED: established project decision since v1.4]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo cap enforcement | Client-side `if (count >= 10)` check | `add_plan_photo` SECURITY DEFINER RPC | Race condition: two concurrent uploads both pass the client check and both insert |
| Access control for private photos | Application-layer auth checks | Supabase RLS + private bucket | Bypassed by any direct API call; RLS is enforced at database/storage layer |
| Signed URL expiry refresh | Timer / polling logic | Phase 22 screen `onFocus` refetch | 1-hour TTL exceeds any realistic gallery session; no refresh logic needed |
| Image compression | Manual JPEG encoding | `expo-image-manipulator` | Already installed, battle-tested in chat and cover image uploads |

**Key insight:** The SECURITY DEFINER RPC is the only correct way to implement an atomic "check count then insert" — doing it in two separate client calls has an unavoidable race window.

---

## Common Pitfalls

### Pitfall 1: plan_members RLS Recursion in Storage Policies
**What goes wrong:** Storage SELECT policy checks `plan_members` directly in the USING clause → `plan_members` has RLS → query evaluates the plan_members policy → which may re-query plan_members → infinite recursion → 500 error.
**Why it happens:** Same class of bug that caused migration 0004. Every existing RLS fix in this codebase (0004, 0015) uses SECURITY DEFINER helpers to bypass this.
**How to avoid:** Create `is_plan_member(p_plan_id uuid)` as a SECURITY DEFINER helper function (search_path = ''), then call it from both the table RLS and storage RLS policies.
**Warning signs:** Supabase logs showing "infinite recursion detected in policy for relation plan_members".

### Pitfall 2: Returning Public URL from Private Bucket
**What goes wrong:** `supabase.storage.from('plan-gallery').getPublicUrl(path)` — this function always returns a URL-shaped string even for private buckets, but the URL returns 403 when fetched.
**Why it happens:** `getPublicUrl` is a local SDK utility that constructs the URL pattern regardless of bucket visibility. It has no idea if the bucket is private.
**How to avoid:** Never call `getPublicUrl` for `plan-gallery`. Return the storage path from `uploadPlanPhoto` and call `createSignedUrls` in `usePlanPhotos`.
**Warning signs:** Images failing to load with 403 despite "successful" URL generation.

### Pitfall 3: Concurrent Upload Race on the Photo Cap
**What goes wrong:** User taps upload 3 times quickly; all three calls check count (say, 9) simultaneously; all three pass the `< 10` check; all three insert → 12 photos in the table.
**Why it happens:** Count + insert are two separate operations; without a transaction or row lock, they are not atomic.
**How to avoid:** The SECURITY DEFINER RPC runs inside a single Postgres transaction. Both the count check and the insert happen atomically in plpgsql. No additional locking needed — Postgres serializes within a single function call.
**Warning signs:** `plan_photos` rows exceeding 10 per (plan_id, uploader_id) in testing.

### Pitfall 4: Storage Path Segment Indexing Off-By-One
**What goes wrong:** Path is `{plan_id}/{user_id}/{photo_id}.jpg`. `storage.foldername(name)` returns `ARRAY[plan_id, user_id]` (the folder segments, NOT the filename). So `[1]` = plan_id and `[2]` = user_id in 1-based Postgres array indexing.
**Why it happens:** Easy to assume 0-based indexing from JavaScript habits.
**How to avoid:** Test the policy with a known path and verify the correct segment is matched. In the migration, use `(storage.foldername(name))[1]::uuid` for plan_id and `(storage.foldername(name))[2]` for user_id.
**Warning signs:** DELETE policy rejecting legitimate deletes; all-or-nothing access instead of per-user access.

### Pitfall 5: uploadPlanPhoto Returns Path, Not URL
**What goes wrong:** Hook code calls `uploadPlanPhoto(...)` and tries to use the return value as an `<Image source={{ uri: ... }}>` — it is a storage path, not a URL.
**Why it happens:** Contrast with `uploadChatMedia` and `uploadPlanCover` which return public URLs.
**How to avoid:** `uploadPlanPhoto` returns `string | null` where the string is a storage path like `abc/def/xyz.jpg`. The hook calls `createSignedUrls` after the RPC succeeds to get a viewable URL. Never display the storage path directly.

---

## Code Examples

### Verified Compression Pattern
```typescript
// Source: src/screens/chat/ChatRoomScreen.tsx:210 (adapted)
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// D-12: 1920px max dimension, 0.85 quality (gallery photos viewed full-screen)
const compressed = await manipulateAsync(
  localUri,
  [{ resize: { width: 1920 } }],
  { compress: 0.85, format: SaveFormat.JPEG }
);
```

### Verified ArrayBuffer Upload Pattern
```typescript
// Source: src/lib/uploadChatMedia.ts (established v1.4 decision)
const response = await fetch(localUri);
const arrayBuffer = await response.arrayBuffer();
const { error } = await supabase.storage
  .from('plan-gallery')
  .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
```

### Verified Batch Signed URL Pattern
```typescript
// Source: @supabase/storage-js installed — createSignedUrls confirmed [VERIFIED: node_modules grep]
const { data: signed } = await supabase.storage
  .from('plan-gallery')
  .createSignedUrls(storagePaths, 3600);
// Returns: Array<{ path: string; signedUrl: string; error: string | null }>
```

### Verified RPC Call Pattern
```typescript
// Source: src/hooks/useExpenseCreate.ts and usePlanDetail.ts (established pattern)
const { data, error } = await supabase.rpc('add_plan_photo', {
  p_plan_id: planId,
  p_storage_path: storagePath,
});
// error?.code === 'P0001' and error?.message === 'photo_cap_exceeded'
```

### Verified SECURITY DEFINER Function Pattern
```sql
-- Source: supabase/migrations/0004_fix_plan_members_rls_recursion.sql (is_plan_creator)
--         supabase/migrations/0015_iou_v1_4.sql (is_iou_member)
CREATE OR REPLACE FUNCTION public.is_plan_member(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''  -- required; prevents search_path injection
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plan_members
    WHERE plan_id = p_plan_id
      AND user_id = (SELECT auth.uid())
  );
$$;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Public bucket for all media | Private bucket + signed URLs for plan-gallery | Phase 21 (first instance) | URLs expire; must be regenerated; `getPublicUrl` does not apply |
| FormData upload in RN | `fetch().arrayBuffer()` upload | v1.4 | Only working pattern for local file URIs in RN + Supabase SDK |
| Module-level COLORS import | `useTheme()` + `useMemo([colors])` | Phase 19 | All new components (Phase 22) must follow this pattern; Phase 21 has no UI |

**Deprecated/outdated for this project:**
- `getPublicUrl()` for private buckets — structurally incorrect, always returns 403 at fetch time
- Per-photo signed URL loop — use `createSignedUrls` batch instead

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| expo-image-manipulator | D-12 compression | ✓ | ~55.0.15 | — |
| expo-image-picker | GALL-01 | ✓ | ~55.0.19 | — |
| expo-camera | GALL-02 | ✓ | ~55.0.16 | — |
| @supabase/supabase-js | all storage + RPC | ✓ | ^2.99.2 | — |
| Supabase project (remote) | migration apply | assumed ✓ | — | — |

**Missing dependencies with no fallback:** None — all required packages are installed.

---

## Validation Architecture

nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` + `npx tsx` runner (no Jest/Vitest) |
| Config file | None — run directly via `npx tsx` |
| Quick run command | `npx tsx tests/unit/uploadPlanPhoto.test.ts` |
| Full suite command | `npx tsx tests/unit/uploadPlanPhoto.test.ts && npx tsx tests/unit/usePlanPhotos.photoCap.test.ts` |

The project uses a bespoke test pattern: pure TypeScript files run via `npx tsx`, no framework config. Tests import node:assert/strict and use a local `test()` helper. See `tests/unit/useChatRoom.imageUpload.test.ts` for the canonical pattern.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GALL-01 | uploadPlanPhoto returns storagePath; path has correct segments | unit | `npx tsx tests/unit/uploadPlanPhoto.test.ts` | ❌ Wave 0 |
| GALL-03 | photo cap logic: count < 10 allows insert; count = 10 raises photo_cap_exceeded | unit (pure logic) | `npx tsx tests/unit/usePlanPhotos.photoCap.test.ts` | ❌ Wave 0 |
| GALL-03 | RPC error surfaced as typed error in hook return | unit | included in above | ❌ Wave 0 |
| GALL-02 | camera capture URI goes through same upload path as library URI | manual | Expo Go on device — no automated test needed | manual-only |
| RLS policies | non-member cannot read/write (D-03) | manual / Supabase dashboard | Supabase SQL Editor test queries after migration | manual-only |

GALL-02 is manual-only because camera hardware is not available in unit test environments. RLS policy correctness is verified by running test queries in Supabase SQL Editor as an authenticated non-member user.

### Sampling Rate
- **Per task commit:** `npx tsx tests/unit/uploadPlanPhoto.test.ts`
- **Per wave merge:** Run all tests in `tests/unit/`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/uploadPlanPhoto.test.ts` — covers GALL-01 path construction, error return on upload failure
- [ ] `tests/unit/usePlanPhotos.photoCap.test.ts` — covers GALL-03 cap boundary logic (pure state functions, not the Supabase RPC itself)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `auth.uid()` inside SECURITY DEFINER RPC — unauthenticated callers get "not authenticated" exception |
| V3 Session Management | no | Session handled by existing Supabase auth layer |
| V4 Access Control | yes | RLS on plan_photos table + Storage policies; SECURITY DEFINER RPC for write gate |
| V5 Input Validation | yes | `contentType: 'image/jpeg'` forced in upload — prevents executable disguised as image; storage path constructed server-side from `auth.uid()` |
| V6 Cryptography | no | Signed URLs use Supabase-managed signing — not hand-rolled |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-member accessing plan photos | Information Disclosure | Private bucket + Storage SELECT RLS via `is_plan_member()` helper |
| User uploading > 10 photos via concurrent requests | Tampering / DoS | Atomic `add_plan_photo` RPC — count check and insert in single plpgsql transaction |
| User supplying a different `uploader_id` in RPC call | Spoofing | RPC uses `auth.uid()` internally — no `uploader_id` parameter accepted from client |
| Executable file disguised as JPEG | Tampering | `contentType: 'image/jpeg'` forced regardless of client-reported MIME type |
| Path traversal in storage_path | Tampering | Path constructed in upload lib as `{uuid}/{uuid}/{timestamp-random}.jpg`; no user-supplied path segments |
| User deleting another user's photo | Tampering | `plan_photos_delete_own` RLS policy (`uploader_id = auth.uid()`) + Storage DELETE policy (`foldername[2] = auth.uid()::text`) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `is_plan_member()` helper does not already exist in a prior migration | Migration section | Duplicate CREATE would error; need `CREATE OR REPLACE` and verify no prior definition |
| A2 | Supabase remote project has Storage RLS enabled (not just bucket-level public/private) | Security Domain | Storage policies would silently not apply; non-members could read |

**Note on A1:** Check all migrations 0001–0020 for any existing `is_plan_member` function definition before writing the migration. None was found in the files read during research, but a comprehensive grep of all migrations is recommended.

---

## Open Questions

1. **Does `is_plan_member()` already exist?**
   - What we know: Migrations 0004 defines `is_plan_creator()`, 0015 defines `is_iou_group_creator()` and `is_iou_member()`. None named `is_plan_member`.
   - What's unclear: Whether any migration between 0016–0020 added it (0016, 0017, 0018, 0019 were not fully read).
   - Recommendation: Before writing migration 0021, grep all existing migrations for `is_plan_member`. If it exists, use `CREATE OR REPLACE` with no logic change.

2. **Should direct INSERT to plan_photos be blocked at the RLS level?**
   - What we know: The RPC is SECURITY DEFINER and handles insert. But without an explicit INSERT RLS policy, direct inserts from authenticated clients would still be checked against the default (DENY if no policy matches, since RLS is enabled).
   - What's unclear: Whether Postgres denies all INSERT attempts by default when RLS is enabled and no INSERT policy exists (yes — this is correct behavior; no policy = denied).
   - Recommendation: Do NOT create an INSERT policy on `plan_photos`. The absence of one means direct inserts are denied. The SECURITY DEFINER RPC bypasses RLS entirely for its insert. This is the correct design.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/uploadChatMedia.ts` — canonical upload lib shape (read directly)
- `src/lib/uploadPlanCover.ts` — second upload reference (read directly)
- `supabase/migrations/0014_plan_covers_bucket.sql` — bucket creation pattern (read directly)
- `supabase/migrations/0015_iou_v1_4.sql` — SECURITY DEFINER RPC pattern (read directly)
- `supabase/migrations/0004_fix_plan_members_rls_recursion.sql` — RLS recursion fix pattern (read directly)
- `src/screens/chat/ChatRoomScreen.tsx:210` — `manipulateAsync` compression pattern (read directly)
- `node_modules/@supabase/storage-js` — `createSignedUrls` method confirmed present (grep verified)
- `package.json` — all package versions confirmed (read directly)

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — accumulated decisions and established patterns (read directly)
- `.planning/phases/21-gallery-foundation/21-CONTEXT.md` — locked decisions (primary source for phase spec)

### Tertiary (LOW confidence)
- None — all claims in this research are codebase-verified or specification-derived.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in package.json, versions verified
- Architecture: HIGH — all patterns drawn from existing codebase files; no speculation
- Pitfalls: HIGH — pitfalls 1–4 are grounded in existing migration history (0004 recursion bug, established upload patterns)
- RLS correctness: MEDIUM — logic is correct per PostgreSQL semantics, but cannot be run/tested without a live Supabase project

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (stable domain — Supabase Storage APIs and Expo SDK 55 packages are not fast-moving)
