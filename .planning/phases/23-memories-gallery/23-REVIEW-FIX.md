---
phase: 23-memories-gallery
fixed_at: 2026-04-30T10:23:24Z
review_path: .planning/phases/23-memories-gallery/23-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 23: Code Review Fix Report

**Fixed at:** 2026-04-30T10:23:24Z
**Source review:** .planning/phases/23-memories-gallery/23-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (1 major + 3 minor; fix_scope: critical_warning)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### MJ-01: `planTitle` caption is always empty in `RecentMemoriesSection`

**Files modified:** `src/hooks/useAllPlanPhotos.ts`, `src/components/home/RecentMemoriesSection.tsx`
**Commit:** 528b469
**Applied fix:** Added `PlanPhotoWithTitle` export type (`PlanPhotoWithUploader & { planTitle: string }`) to the hook. Updated `recentPhotos` state and `UseAllPlanPhotosResult` type to use `PlanPhotoWithTitle[]`. In the slice step, each photo is now enriched with `planTitle` from `planTitleMap` before being set as `recentPhotos`. In `RecentMemoriesSection`, replaced the type-lie cast `PlanPhotoWithUploader & { planTitle?: string }` with the proper `PlanPhotoWithTitle` import, removed the `?? ''` fallbacks since `planTitle` is now always a string.

---

### MN-01: Silent swallowing of plan-title and profile query errors

**Files modified:** `src/hooks/useAllPlanPhotos.ts`
**Commit:** b281b01
**Applied fix:** Destructured `error` from the Step 3 (plan titles), Step 4 (uploader profiles), and Step 5 (createSignedUrls) queries. Added `if (error) { setError(...); setIsLoading(false); return; }` guard after each, mirroring the pattern already used for Steps 1 and 2.

---

### MN-02: `activePlanId` capture risk — gallery viewer passed photos from multiple plans

**Files modified:** `src/app/memories.tsx`
**Commit:** e7d8e86
**Applied fix:** Changed the `deletePhoto` prop on `GalleryViewerModal` to look up the photo's own `planId` from `viewerPhotos` first, falling back to `activePlanId` only if not found. This makes the delete correct even if `viewerPhotos` ever spans multiple plans.

---

### MN-03: `section.allPhotos.indexOf(photo)` linear scan may return wrong index

**Files modified:** `src/app/memories.tsx`
**Commit:** cbf77f6
**Applied fix:** Replaced `section.allPhotos.indexOf(photo)` with position arithmetic: `rowIdx = section.data.indexOf(row)` (row-level reference equality, stable within a render), then `globalIdx = rowIdx * 3 + cellIdx`. Since `chunkPhotos` always uses chunk size 3, this correctly computes the flat index without relying on photo object identity across refetches.

---

_Fixed: 2026-04-30T10:23:24Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
