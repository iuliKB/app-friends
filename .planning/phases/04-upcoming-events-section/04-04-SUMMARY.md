---
phase: 04-upcoming-events-section
plan: "04"
subsystem: ui
tags: [react-native, supabase-storage, image-upload, expo-image-picker, plans, cover-image]

# Dependency graph
requires:
  - phase: 04-03
    provides: HomeScreen with UpcomingEventsSection and usePlans() integration
  - phase: 04-01
    provides: cover_image_url column in plans table and PlanWithMembers type

provides:
  - uploadPlanCover utility (fetch→blob→arrayBuffer Supabase Storage upload)
  - PlanCreateModal with optional cover image picker and upload-after-create flow
  - PlanDashboardScreen with creator cover image edit UI

affects:
  - src/hooks/usePlans.ts (CreatePlanInput extended with coverImageUrl)
  - src/hooks/usePlanDetail.ts (updatePlanDetails extended with cover_image_url; refetch now maps cover_image_url)

# Tech stack
added:
  - expo-image-picker (already installed v55.0.12) — used for camera roll access

patterns:
  - fetch(localUri) → blob() → arrayBuffer() upload (avoids base64-arraybuffer dependency)
  - upsert: true on Storage upload allows safe cover re-upload on plan edit
  - Upload-after-create flow: create plan to get planId, then upload, then update cover_image_url
  - noUncheckedIndexedAccess guard: result.assets?.[0] with null check before use
  - Creator-only cover edit UI: session.user.id === plan.created_by check in JSX

# Key files
created:
  - src/lib/uploadPlanCover.ts

modified:
  - src/hooks/usePlans.ts
  - src/hooks/usePlanDetail.ts
  - src/screens/plans/PlanCreateModal.tsx
  - src/screens/plans/PlanDashboardScreen.tsx

# Decisions
decisions:
  - Upload-after-create chosen over upload-first because planId is required for the Storage path (${planId}/cover.jpg); plan created with cover_image_url null, then upload, then update — acceptable UX
  - noUncheckedIndexedAccess guard via assets?.[0] optional chain + null check — strict TypeScript compliance
  - Creator-only edit enforced in JSX (session.user.id === plan.created_by); Supabase Storage RLS policy should also enforce this at the storage layer (note: configure in Supabase dashboard)

# Metrics
duration_minutes: 3
completed_date: "2026-04-11"
tasks_completed: 2
tasks_total: 2
files_created: 1
files_modified: 4
---

# Phase 04 Plan 04: Cover Image Upload Summary

**One-liner:** Supabase Storage cover image upload via fetch→blob→arrayBuffer with creator-only picker in PlanCreateModal and PlanDashboardScreen.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | uploadPlanCover utility + extend createPlan/updatePlanDetails | 608d24a | src/lib/uploadPlanCover.ts, src/hooks/usePlans.ts, src/hooks/usePlanDetail.ts |
| 2 | Cover image picker UI in PlanCreateModal and PlanDashboardScreen | 0a15716 | src/screens/plans/PlanCreateModal.tsx, src/screens/plans/PlanDashboardScreen.tsx |

## What Was Built

**uploadPlanCover utility** (`src/lib/uploadPlanCover.ts`): Uploads a local image URI to the `plan-covers` Supabase Storage bucket using the fetch→blob→arrayBuffer pattern (no external base64 dependency). Uses `upsert: true` for safe re-upload on edits. Returns public URL on success, null on failure.

**usePlans.ts**: `CreatePlanInput` extended with optional `coverImageUrl?: string`; plans insert now includes `cover_image_url: input.coverImageUrl ?? null`.

**usePlanDetail.ts**: `updatePlanDetails` updates type extended with `cover_image_url?: string | null`. Fixed `refetch()` to include `cover_image_url` in the assembled `PlanWithMembers` result (was missing, causing cover to disappear after refetch).

**PlanCreateModal.tsx**: Optional cover image picker added between the Title and When fields. Tap shows camera roll; selected image previewed as thumbnail. On create: plan created first (to get planId), then `uploadPlanCover(planId, uri)` called, then `supabase.update({ cover_image_url })`. Create button disabled while uploading.

**PlanDashboardScreen.tsx**: Cover image displayed above Details section (full-width, 160px height, rounded corners). Creator sees camera-outline overlay button for changing the cover. If no cover exists, creator sees "Add cover image" row with image-outline icon. Non-creators see cover image (if set) but no edit controls. `pickAndUploadCoverImage` calls `updatePlanDetails({ cover_image_url })` then `refetch()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed cover_image_url missing from usePlanDetail refetch result**
- **Found during:** Task 1 (reading usePlanDetail.ts)
- **Issue:** The `refetch()` function assembled `PlanWithMembers` without including `cover_image_url` from the planRow. After `refetch()` (e.g. after cover upload), `plan.cover_image_url` would be undefined.
- **Fix:** Added `cover_image_url: planRow.cover_image_url as string | null` to the assembled result object in `refetch()`
- **Files modified:** src/hooks/usePlanDetail.ts
- **Commit:** 608d24a

**2. [Rule 1 - Bug] Fixed TypeScript noUncheckedIndexedAccess errors on assets[0]**
- **Found during:** Task 2 TypeScript check
- **Issue:** `result.assets[0].uri` fails strict TypeScript — `assets[0]` is possibly undefined
- **Fix:** Replaced with `const asset = result.assets?.[0]; if (!result.canceled && asset)` pattern in both files
- **Files modified:** src/screens/plans/PlanCreateModal.tsx, src/screens/plans/PlanDashboardScreen.tsx
- **Commit:** 0a15716

## Known Stubs

None — cover_image_url is wired end-to-end: DB column (Plan 01) → type (Plan 01) → upload utility (this plan) → create flow (this plan) → edit flow (this plan) → EventCard display (Plan 02).

## Threat Flags

No new threat surface beyond what was documented in the plan's threat_model. The T-04-09 note about Supabase Storage RLS policy (`auth.uid() = created_by`) requires a dashboard configuration step — not enforced by client code alone. Tracked as implementation note in decisions.

## Self-Check: PASSED

- src/lib/uploadPlanCover.ts: FOUND
- src/hooks/usePlans.ts: coverImageUrl + cover_image_url insert: FOUND
- src/hooks/usePlanDetail.ts: cover_image_url in type + refetch: FOUND
- src/screens/plans/PlanCreateModal.tsx: ImagePicker + uploadPlanCover: FOUND
- src/screens/plans/PlanDashboardScreen.tsx: pickAndUploadCoverImage + creator guard: FOUND
- Commits 608d24a, 0a15716: FOUND
- TypeScript: CLEAN (0 errors)
