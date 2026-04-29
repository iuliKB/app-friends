# Phase 21: Gallery Foundation - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema (`plan_photos` table + RLS), `plan-gallery` Supabase Storage bucket (private), server-enforced 10-photo cap via `add_plan_photo` RPC, upload pipeline (`uploadPlanPhoto` lib function), and `usePlanPhotos` hook — foundation infrastructure only. No UI is delivered in this phase (Phase 22 owns all UI).

Video in gallery, photo comments, and photo count badges on plan cards are out of scope per REQUIREMENTS.md (V2 / future).

</domain>

<decisions>
## Implementation Decisions

### Bucket Access Model
- **D-01:** `plan-gallery` bucket is **private** (not public). Unlike existing buckets (`avatars`, `plan-covers`, `chat-media` which are all public CDN), plan photos must be restricted to plan members only — matching GALL success criterion 4 ("non-members cannot read or write storage objects for that plan").
- **D-02:** Photos are fetched as **signed URLs with a 1-hour TTL**. `usePlanPhotos` generates signed URLs when it fetches the photo list. Phase 22 gallery screen refreshes on focus — users will never encounter expired URLs in normal usage. No polling or auto-refresh timer needed.
- **D-03:** Storage RLS policy for SELECT checks `plan_members` membership. Storage RLS policy for DELETE uses the path-based user check (see Storage Path below) so no extra join is needed.

### Storage Path Structure
- **D-04:** Storage path format: `{plan_id}/{user_id}/{photo_id}.jpg`
  - Example: `550e8400-e29b-41d4-a716-446655440000/abc123/7f3d9e1a-...jpg`
  - The `user_id` segment in position [2] enables a path-only RLS delete policy: `(storage.foldername(name))[2] = auth.uid()::text` — no join to `plan_photos` required for delete authorization.
  - Makes per-user cleanup (if a user leaves a plan) simpler.

### plan_photos Table Schema
- **D-05:** Minimum viable schema — no denormalized uploader fields:
  ```
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  storage_path TEXT NOT NULL  -- relative path inside plan-gallery bucket
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  ```
- **D-06:** No `public_url` or `display_name` columns. Uploader attribution (GALL-06) is resolved by joining `profiles` at read time — consistent with how every other uploader field works in the app.
- **D-07:** Default fetch ordering: `created_at ASC` (oldest first). Gallery reads like a shared memory album, not a feed.
- **D-08:** Composite index on `(plan_id, created_at)` for efficient ordered fetches per plan.

### add_plan_photo RPC
- **D-09:** The RPC is the single write gate. It must:
  1. Verify the caller is a member of the plan (`plan_members` check).
  2. Count existing photos by the caller for this plan — if count ≥ 10, raise exception with code `photo_cap_exceeded`.
  3. Insert the `plan_photos` row.
  - All three steps in a single `SECURITY DEFINER` function so the cap check and insert are atomic.
- **D-10:** Error code to raise: `raise exception 'photo_cap_exceeded' using errcode = 'P0001'` (or a custom SQLSTATE). The client hook surfaces this as a typed error for Phase 22 UI to display.

### Upload Pipeline
- **D-11:** Upload function: `src/lib/uploadPlanPhoto.ts` — mirrors the shape of `uploadChatMedia.ts` and `uploadPlanCover.ts`.
  - Parameters: `planId`, `userId`, `localUri`
  - Uses `fetch(localUri).arrayBuffer()` pattern (established v1.4 decision — FormData + file:// fails in RN).
  - Forces `contentType: 'image/jpeg'` (established v1.5 security decision).
  - `upsert: false` — each photo gets a new UUID path; re-upload is not meaningful.
  - Returns the storage path (not a public URL — bucket is private; Phase 22 will generate signed URLs via `usePlanPhotos`).
- **D-12:** Image compression before upload: **1920px max dimension / 0.85 JPEG quality**.
  - Higher than chat-media (1280px / 0.75) because gallery photos are viewed full-screen (GALL-05).
  - Still compressed to manage free-tier Storage budget (1GB).
  - Use `expo-image-manipulator` — already available from v1.3.5 cover image phase.

### usePlanPhotos Hook
- **D-13:** Hook signature: `usePlanPhotos(planId: string)` — returns `{ photos, loading, error, uploadPhoto, deletePhoto, refetch }`.
- **D-14:** `photos` array items shape:
  ```ts
  {
    id: string
    planId: string
    uploaderId: string
    storagePath: string
    signedUrl: string       // 1-hour TTL, generated on fetch
    createdAt: string
    uploader: {             // joined from profiles
      displayName: string
      avatarUrl: string | null
    }
  }
  ```
- **D-15:** `uploadPhoto(localUri: string)` — calls `uploadPlanPhoto` to store the object, then calls `add_plan_photo` RPC to insert the row. Returns `{ error: 'photo_cap_exceeded' | 'upload_failed' | null }`.
- **D-16:** `deletePhoto(photoId: string)` — deletes the storage object and the `plan_photos` row. RLS enforces ownership on both sides.

### Claude's Discretion
- Exact SQLSTATE code for `photo_cap_exceeded` (P0001 is fine; specific subcode is implementation detail)
- Whether to use a `UNIQUE` constraint on `(plan_id, uploader_id, storage_path)` or just rely on UUID PKs
- Signed URL generation: single batch call vs. per-photo — use whatever Supabase SDK supports most efficiently
- Migration filename: `0021_gallery_foundation.sql`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Gallery — GALL-01, GALL-02, GALL-03 (Phase 21 scope); GALL-04 through GALL-08 (Phase 22, out of scope here)

### Existing Upload Patterns
- `src/lib/uploadChatMedia.ts` — canonical upload lib shape to mirror for `uploadPlanPhoto`
- `src/lib/uploadPlanCover.ts` — second reference for the arrayBuffer pattern; note `upsert: true` there vs. `upsert: false` for gallery photos
- `supabase/migrations/0014_plan_covers_bucket.sql` — bucket creation + Storage RLS policy pattern (plan-gallery will be private; use as a structural reference, not a copy)

### Existing Schema Patterns
- `supabase/migrations/0001_init.sql` — `plan_members(plan_id, user_id)` table used in RLS membership checks
- `supabase/migrations/0004_fix_plan_members_rls_recursion.sql` — the plan_members recursion fix; new RLS policies must not re-introduce circular references
- `supabase/migrations/0015_iou_v1_4.sql` — SECURITY DEFINER RPC pattern with atomic check + insert (model for `add_plan_photo`)

### Existing Type Files
- `src/types/database.ts` — Supabase DB types; new migration adds `plan_photos` table type
- `src/types/plans.ts` — Plan type; no changes needed in Phase 21 (columns added to `plan_photos`, not `plans`)

### No external ADRs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/uploadChatMedia.ts` — copy this structure for `uploadPlanPhoto.ts`; change bucket name, path format, compression params, and `upsert` flag
- `expo-image-manipulator` — already in use from cover image upload (v1.3.5); available for gallery compression without a new dependency
- `supabase` client at `src/lib/supabase.ts` — standard import for all storage and RPC calls

### Established Patterns
- `fetch(localUri).arrayBuffer()` → Supabase Storage upload — the only working RN upload pattern; never use FormData + file://
- `contentType: 'image/jpeg'` forced on all uploads (security: prevents executable-disguised-as-image)
- SECURITY DEFINER RPCs for atomic multi-step writes (see `create_expense`)
- `StyleSheet.create` inside `useMemo([colors])` + `useTheme()` for all colors — required for any new components in Phase 22, noted here for awareness
- Hooks return `{ data, loading, error }` shape — extend with `uploadPhoto`, `deletePhoto`, `refetch` mutations

### Integration Points
- `supabase/migrations/` — new migration `0021_gallery_foundation.sql`
- `src/hooks/` — new `usePlanPhotos.ts`
- `src/lib/` — new `uploadPlanPhoto.ts`
- `src/types/database.ts` — add `PlanPhoto` type after migration
- `src/screens/plans/PlanDashboardScreen.tsx` — Phase 22 will consume `usePlanPhotos` here; Phase 21 does not touch this file

</code_context>

<specifics>
## Specific Ideas

- Private bucket is the deliberate departure from the existing "all buckets public" pattern — this is intentional and required by GALL security criterion
- 1-hour signed URL TTL is the chosen balance: simple (no refresh logic), safe (URLs expire), practical (normal gallery session << 1 hour)
- `{plan_id}/{user_id}/{photo_id}.jpg` path enables a path-only storage DELETE policy — avoids the plan_members recursion pitfall from 0004

</specifics>

<deferred>
## Deferred Ideas

- Photo count badge on plan cards (GALL-F01) — V2 per REQUIREMENTS.md
- Upload progress indicator per photo (GALL-F02) — V2 per REQUIREMENTS.md
- Video in gallery — V2 (storage cost + Expo Go constraints)
- Photo comments — V2 (plan chat covers the use case in V1)
- Multi-photo picker (select multiple at once before uploading) — worth revisiting in Phase 22 UX discussion; not decided here

</deferred>

---

*Phase: 21-gallery-foundation*
*Context gathered: 2026-04-30*
