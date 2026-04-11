---
phase: 05-database-migrations
plan: "03"
subsystem: database
tags: [migration, supabase, seed, iou, birthdays, push]
dependency_graph:
  requires:
    - 05-01 (migration 0015 IOU tables + general_notes rename)
    - 05-02 (migration 0016 birthday columns + get_upcoming_birthdays RPC)
  provides:
    - Migrations 0015 and 0016 applied to remote Supabase project
    - seed.sql with general_notes (no iou_notes), IOU expense rows, birthday UPDATE statements
  affects:
    - supabase/seed.sql
tech_stack:
  added: []
  patterns:
    - npx supabase db push for remote migration application
    - Integer cents for all IOU seed amounts (D-08 compliance)
    - Birthday data spread across calendar year for varied get_upcoming_birthdays() output
key_files:
  created: []
  modified:
    - supabase/seed.sql
decisions:
  - "iou_notes in migration history files (0001_init.sql, 0015 comment/RENAME statement) are immutable historical records — only seed.sql was actionable"
  - "IOU group IDs use stable literal UUIDs (00000000-0000-0000-0000-000000000010/11) matching seed.sql UUID convention"
  - "Payer row in iou_members marked settled at insert time — realistic: payer already paid, so their own share is settled"
  - "Birthday data covers 5 of 6 test users (drew excluded — drew is not friends with alex, so would not appear in get_upcoming_birthdays() for alex)"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 0
  files_created: 0
---

# Phase 05 Plan 03: Migration Push and Seed Data Summary

**One-liner:** Both migrations (0015 IOU tables, 0016 birthday columns) pushed to remote Supabase project; seed.sql updated with general_notes rename, two IOU expense groups with iou_members settlement rows, and birthday UPDATE statements for five test users.

## What Was Built

### Task 1: Migration Push

Applied both pending migrations to the remote Supabase project (`zqmaauaopyolutfoizgq`):

- `0015_iou_v1_4.sql` — iou_groups table, iou_members table, SECURITY DEFINER helpers, RLS policies, create_expense() RPC, get_iou_summary() RPC, plans.iou_notes → general_notes rename
- `0016_birthdays_v1_4.sql` — birthday_month and birthday_day nullable smallint columns on profiles, get_upcoming_birthdays() RPC with Feb 29 leap-year guard

Command: `npx supabase db push` (interactive confirmation, exited 0)

### Task 2: seed.sql Updates

Three changes made to `supabase/seed.sql`:

**CHANGE 1 — iou_notes → general_notes (Pitfall 5):**
Both `INSERT INTO plans` statements updated — Plan A (Friday night out) and Plan B (Casey's birthday). Zero `iou_notes` occurrences remain in seed.sql.

**CHANGE 2 — IOU expense seed data:**
Two `iou_groups` rows using stable literal UUIDs (`...000010`, `...000011`):
- "Dinner at Noma" — 12000 cents total, even split, created_by alex
- "Camping supplies" — 7500 cents total, custom split, created_by jamie

Six `iou_members` rows across two INSERT statements:
- Dinner: alex (4000, settled), jamie (4000, unsettled), morgan (4000, unsettled)
- Camping: jamie (3000, settled), alex (2500, unsettled), riley (2000, unsettled)

**CHANGE 3 — Birthday seed data:**
Five `UPDATE public.profiles` statements spread across the calendar year:
- alex: March 15 (month=3, day=15)
- jamie: July 4 (month=7, day=4)
- morgan: November 28 (month=11, day=28)
- riley: January 20 (month=1, day=20)
- casey: September 5 (month=9, day=5)

## Verification Results

- `npx supabase migration list` shows 0015 and 0016 applied
- `grep -c "iou_notes" supabase/seed.sql` → 0 (PASS)
- `grep -c "general_notes" supabase/seed.sql` → 2 (PASS)
- `grep -c "iou_groups" supabase/seed.sql` → 1 (at least 1 match, PASS)
- `grep -c "iou_members" supabase/seed.sql` → 3 (at least 2 matches, PASS)
- `grep -c "birthday_month" supabase/seed.sql` → 5 (at least 3 matches, PASS)
- `grep -c "birthday_day" supabase/seed.sql` → 5 (at least 3 matches, PASS)
- No decimal cents: `grep "share_amount_cents.*\." supabase/seed.sql` → 0 results (PASS)
- Combined new sections: `grep -c "iou_groups\|iou_members\|birthday_month" supabase/seed.sql` → 9 (at least 8, PASS)
- `npx tsc --noEmit` exits 0 (no TypeScript regressions)

## Task Commits

1. **Task 1: Push migrations** — Remote-only operation, no local file changes to commit
2. **Task 2: Fix seed.sql** — `f3627c5`

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

- `grep -r "iou_notes" supabase/` returns matches in migration history files (`0001_init.sql` column definition, `0015_iou_v1_4.sql` comment and RENAME COLUMN statement). These are immutable historical records — the column name at creation and the rename operation itself. seed.sql was the only actionable file, and it contains zero `iou_notes` occurrences.
- Task 1 had no file changes (migration push is a remote operation); no commit was created for it.

## Known Stubs

None — this plan updates seed data only. No UI components were modified.

## Threat Surface Scan

No new network endpoints or trust boundaries introduced. All threat mitigations from the plan's threat register:

| Threat ID | Status |
|-----------|--------|
| T-05-11 | Accepted — RENAME COLUMN is non-destructive; no DROP statements in either migration |
| T-05-12 | Accepted — seed.sql is dev/test data only; test UUIDs from prior phases |
| T-05-13 | Accepted — payer's settled_at set at seed time is realistic, not a security concern |

## Self-Check

- [x] `supabase/seed.sql` modified with all three changes
- [x] `grep "iou_notes" supabase/seed.sql` returns 0 results
- [x] `grep "general_notes" supabase/seed.sql` returns 2 results
- [x] `grep "iou_groups" supabase/seed.sql` returns at least 1 result
- [x] `grep "iou_members" supabase/seed.sql` returns at least 2 results
- [x] `grep "birthday_month" supabase/seed.sql` returns at least 3 results
- [x] Migrations 0015 and 0016 applied to remote Supabase project
- [x] `npx tsc --noEmit` exits 0
