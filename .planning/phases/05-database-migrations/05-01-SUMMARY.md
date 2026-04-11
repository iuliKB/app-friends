---
phase: 05-database-migrations
plan: "01"
subsystem: database
tags: [migration, iou, rls, rpc, schema, rename]
dependency_graph:
  requires: []
  provides:
    - iou_groups table with RLS and updated_at trigger
    - iou_members table with composite PK and settlement audit columns
    - create_expense() atomic RPC with largest-remainder even split
    - get_iou_summary() per-friend net balance RPC
    - plans.general_notes column (renamed from iou_notes)
    - TypeScript types for iou_groups, iou_members, plans.general_notes
  affects:
    - src/types/database.ts
    - src/types/plans.ts
    - src/hooks/usePlanDetail.ts
    - src/hooks/usePlans.ts
    - src/components/plans/IOUNotesField.tsx
    - src/screens/plans/PlanDashboardScreen.tsx
tech_stack:
  added: []
  patterns:
    - SECURITY DEFINER helpers to prevent iou_members RLS self-recursion
    - Largest-remainder integer division for even cent splits
    - Atomic RPC for multi-table insert (iou_groups + iou_members)
key_files:
  created:
    - supabase/migrations/0015_iou_v1_4.sql
  modified:
    - src/types/database.ts
    - src/types/plans.ts
    - src/hooks/usePlanDetail.ts
    - src/hooks/usePlans.ts
    - src/components/plans/IOUNotesField.tsx
    - src/screens/plans/PlanDashboardScreen.tsx
decisions:
  - "iou_groups and iou_members tables use SECURITY DEFINER helpers (is_iou_group_creator, is_iou_member) to prevent RLS recursion — iou_members SELECT policy cannot self-reference without infinite recursion"
  - "Relationships: [] added to iou_groups and iou_members TypeScript types — supabase-js generic constraint requires this field; omitting it collapses all Tables types to never"
  - "plans.iou_notes renamed to general_notes atomically with client code update — avoids silent data loss on plan notes"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
  files_created: 1
---

# Phase 05 Plan 01: IOU Schema Foundation — Migration 0015 Summary

**One-liner:** Migration 0015 with iou_groups/iou_members tables, SECURITY DEFINER RLS helpers, create_expense() atomic RPC (largest-remainder split), get_iou_summary() net balance RPC, and plans.iou_notes renamed to general_notes across all 6 client files.

## What Was Built

### Migration 0015 (`supabase/migrations/0015_iou_v1_4.sql`)

Ten-section migration implementing the full IOU schema foundation:

1. **iou_groups table** — UUID PK, created_by FK, total_amount_cents INTEGER with CHECK > 0, split_mode text with CHECK IN ('even','custom'), audit timestamps
2. **iou_members table** — Composite PK (iou_group_id, user_id), share_amount_cents INTEGER with CHECK >= 0, settled_at timestamptz (NULL = unsettled), settled_by uuid FK for non-repudiation
3. **Indexes** — idx_iou_groups_created_by, idx_iou_members_user_id, idx_iou_members_group_id
4. **updated_at trigger** — Reuses existing public.update_updated_at() function
5. **SECURITY DEFINER helpers** — is_iou_group_creator() and is_iou_member() with SET search_path = '' to prevent RLS recursion
6. **RLS policies** — iou_groups: member-only SELECT, creator-only INSERT; iou_members: member SELECT via helper, creator UPDATE via helper (D-07 debtor cannot self-certify)
7. **create_expense() RPC** — Atomic transaction creating iou_groups + iou_members rows, largest-remainder even split, custom split mode, SECURITY DEFINER
8. **get_iou_summary() RPC** — Per-friend net balance across unsettled expenses, pairwise positive/negative, SECURITY DEFINER
9. **Column rename** — ALTER TABLE public.plans RENAME COLUMN iou_notes TO general_notes

### Client Updates (Task 2)

- `src/types/database.ts` — Renamed iou_notes → general_notes in plans Row/Insert/Update; added iou_groups and iou_members full type shapes with Relationships: []
- `src/types/plans.ts` — Renamed iou_notes → general_notes in Plan interface
- `src/hooks/usePlanDetail.ts` — Updated planRow mapping
- `src/hooks/usePlans.ts` — Updated p mapping
- `src/components/plans/IOUNotesField.tsx` — Updated .update() call, label "IOU Notes" → "Notes", placeholder "Who owes who?" → "Add notes for this plan..."
- `src/screens/plans/PlanDashboardScreen.tsx` — Updated initialValue prop

## Verification Results

- `npx tsc --noEmit` exits 0 (no TypeScript errors)
- `grep -r "iou_notes" src/` returns no results
- Migration contains all 10 sections
- iou_members SELECT policy uses public.is_iou_member() SECURITY DEFINER helper (no self-referencing subquery)
- seed.sql retains 2 iou_notes references (expected — to be updated in Plan 03 post-push)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added `Relationships: []` to iou_groups and iou_members TypeScript types**
- **Found during:** Task 2 TypeScript verification
- **Issue:** supabase-js `PostgrestFilterBuilder` generic constraint requires all table types to include a `Relationships` field. When omitted, the TypeScript intersection type collapses every table's Insert/Update type to `never`, causing ~50 errors across unrelated files (profiles, statuses, etc.)
- **Fix:** Added `Relationships: [];` to both `iou_groups` and `iou_members` type definitions in database.ts
- **Files modified:** src/types/database.ts
- **Commit:** a845f66

## Threat Surface Scan

No new network endpoints or trust boundaries introduced. All security mitigations from the plan's threat register were implemented:

| Threat ID | Mitigation Status |
|-----------|------------------|
| T-05-01 | is_iou_group_creator() UPDATE policy — debtor cannot self-certify |
| T-05-02 | CHECK (total_amount_cents > 0) + auth.uid() IS NULL guard in create_expense() |
| T-05-03 | iou_groups SELECT requires caller in iou_members |
| T-05-04 | is_iou_member() SECURITY DEFINER helper — no self-referencing RLS recursion |
| T-05-05 | Accepted — existing plans UPDATE RLS covers general_notes writes |
| T-05-06 | settled_by + settled_at audit columns present in iou_members |
| T-05-07 | SET search_path = '' on all helpers and RPCs |

## Known Stubs

None — this plan creates schema and updates client types only. No UI components with data sources were modified beyond the column rename.

## Self-Check

- [ ] `supabase/migrations/0015_iou_v1_4.sql` exists
- [ ] `src/types/database.ts` contains general_notes (3 matches)
- [ ] `src/types/plans.ts` contains general_notes
- [ ] Zero iou_notes in src/
- [ ] `npx tsc --noEmit` exits 0
