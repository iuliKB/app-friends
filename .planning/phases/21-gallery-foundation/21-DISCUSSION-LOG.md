# Phase 21: Gallery Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 21-gallery-foundation
**Areas discussed:** Bucket access model, Storage path structure, plan_photos schema, Upload compression

---

## Bucket Access Model

| Option | Description | Selected |
|--------|-------------|----------|
| Private + signed URLs | Private bucket; Storage RLS checks plan_members; signed URLs with 1-hour TTL | ✓ |
| Public bucket + plan_photos RLS only | CDN URLs like existing buckets; non-members could read objects if they guess path | |

**User's choice:** Private + signed URLs
**Notes:** Explicitly satisfies GALL success criterion 4 (non-members cannot read storage objects). Signed URL TTL: 1-hour, regenerated on screen open / usePlanPhotos fetch.

---

## Storage Path Structure

| Option | Description | Selected |
|--------|-------------|----------|
| {plan_id}/{user_id}/{photo_id}.jpg | User-scoped; enables path-only RLS for delete without join | ✓ |
| {plan_id}/{photo_id}.jpg | Flat per-plan; delete RLS requires join to plan_photos to verify uploader | |

**User's choice:** `{plan_id}/{user_id}/{photo_id}.jpg`
**Notes:** Position [2] in the path = user_id, enabling `(storage.foldername(name))[2] = auth.uid()::text` in the delete policy.

---

## plan_photos Schema

### Stored fields vs. denormalization

| Option | Description | Selected |
|--------|-------------|----------|
| storage_path only + join profiles at read time | id, plan_id, uploader_id, storage_path, created_at. Join profiles in hook. | ✓ |
| Denormalized uploader fields | Also store display_name + avatar_url at insert; avoids join but stale on profile changes | |

**User's choice:** Join profiles at read time
**Notes:** Consistent with all other uploader attribution patterns in the app.

### Default ordering

| Option | Description | Selected |
|--------|-------------|----------|
| created_at ASC (oldest first) | Chronological; reads like a shared memory album | ✓ |
| created_at DESC (newest first) | Feed-style; most recent first | |

**User's choice:** `created_at ASC`

---

## Upload Compression

| Option | Description | Selected |
|--------|-------------|----------|
| 1920px max / 0.85 JPEG | Higher quality for full-screen viewing (GALL-05); ~200–400KB per photo | ✓ |
| Same as chat-media (1280px / 0.75) | Simpler (identical compression call); may look soft on high-res displays at full screen | |
| No compression | Maximum quality; would burn through 1GB free-tier storage rapidly | |

**User's choice:** 1920px max / 0.85 JPEG
**Notes:** Gallery photos are viewed full-screen; warrants higher quality than chat thumbnails.

---

## Claude's Discretion

- Exact SQLSTATE code for `photo_cap_exceeded`
- `UNIQUE` constraint design on plan_photos
- Signed URL batch vs. per-photo generation strategy
- Migration filename

## Deferred Ideas

- Photo count badge on plan cards (GALL-F01) — V2
- Upload progress indicator per photo (GALL-F02) — V2
- Multi-photo picker — Phase 22 UX discussion
- Video in gallery — V2
