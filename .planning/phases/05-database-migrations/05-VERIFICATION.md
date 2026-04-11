---
phase: 05-database-migrations
verified: 2026-04-12T00:00:00Z
status: human_needed
score: 3/4 must-haves verified
human_verification:
  - test: "Run RLS smoke-test queries against live Supabase project"
    expected: "Expense creator can SELECT and UPDATE their own iou_members rows; non-members get zero rows from iou_groups SELECT; get_upcoming_birthdays() returns zero rows for a user with no accepted friends"
    why_human: "RLS policy correctness requires live SQL execution against the remote DB — cannot verify policy evaluation logic (is_iou_member, is_iou_group_creator) from file content alone"
---

# Phase 5: Database Migrations Verification Report

**Phase Goal:** All new schema objects exist in Supabase so client code can be written against correct column types, RLS policies, and RPCs — no destructive re-migrations needed later
**Verified:** 2026-04-12
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Migration 0015 applies cleanly: iou_groups, iou_members tables exist with INTEGER cents amounts, correct RLS, create_expense() atomic RPC, get_iou_summary() RPC | ✓ VERIFIED | File exists at supabase/migrations/0015_iou_v1_4.sql with all 10 sections; grep confirms all required CREATE TABLE, SECURITY DEFINER RPCs, RLS policies, and RENAME COLUMN iou_notes TO general_notes |
| SC2 | Migration 0016 applies cleanly: birthday_month and birthday_day smallint columns exist on profiles, get_upcoming_birthdays() RPC returns friends sorted by next occurrence with year-wrap arithmetic | ✓ VERIFIED | File exists at supabase/migrations/0016_birthdays_v1_4.sql; nullable smallint columns with compound CHECK; RPC uses SECURITY DEFINER, status='accepted' friend-scope, Feb 29 guard in both branches, ORDER BY days_until ASC |
| SC3 | All RLS policies on new tables pass smoke-test queries (owner reads own data, friends read friend data, non-friends get no rows) | ? NEEDS HUMAN | Cannot verify live policy evaluation without executing SQL against remote Supabase DB |
| SC4 | supabase db push completes without errors and migration history shows 0015 and 0016 applied | ✓ VERIFIED | npx supabase migration list shows both 0015 and 0016 in applied column |

**Score:** 3/4 roadmap success criteria verified (SC3 needs human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0015_iou_v1_4.sql` | IOU schema foundation — tables, RLS, RPCs, column rename | ✓ VERIFIED | 244 lines; all 10 sections present |
| `supabase/migrations/0016_birthdays_v1_4.sql` | Birthday schema — columns, CHECK constraints, RPC | ✓ VERIFIED | 91 lines; 3 sections present |
| `src/types/database.ts` | TypeScript types for new tables and renamed column | ✓ VERIFIED | general_notes present in Row/Insert/Update (lines 140, 152, 164); iou_groups and iou_members type shapes with Relationships: [] at lines 415, 445 |
| `src/types/plans.ts` | Plan interface with renamed field | ✓ VERIFIED | general_notes at line 8; zero occurrences of iou_notes |
| `src/components/plans/IOUNotesField.tsx` | Updated component using renamed column | ✓ VERIFIED | .update({ general_notes: ... }) at line 34; label 'Notes' at line 57; placeholder 'Add notes for this plan...' at line 70 |
| `supabase/seed.sql` | Test data for IOU and birthday features | ✓ VERIFIED | zero iou_notes; general_notes in 2 INSERT statements; iou_groups + iou_members INSERT rows; 5 birthday UPDATE statements |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| supabase/migrations/0015_iou_v1_4.sql | src/types/database.ts | Column rename must match type definition | ✓ WIRED | RENAME COLUMN iou_notes TO general_notes in SQL; general_notes in all 3 database.ts plan shapes |
| src/components/plans/IOUNotesField.tsx | plans.general_notes | .update({ general_notes: ... }) | ✓ WIRED | Line 34 confirmed |
| supabase/migrations/0016_birthdays_v1_4.sql | public.profiles | ALTER TABLE public.profiles ADD COLUMN | ✓ WIRED | birthday_month pattern present in ADD COLUMN statement |
| get_upcoming_birthdays() RPC | public.friendships | JOIN friends CTE filters to accepted friendships only | ✓ WIRED | status = 'accepted' present at line 50 of 0016 migration |
| supabase/seed.sql | iou_groups / iou_members tables | INSERT INTO public.iou_groups / iou_members | ✓ WIRED | Lines 261, 268, 276 confirmed |

### Data-Flow Trace (Level 4)

Not applicable — this phase creates schema and seed data only. No UI components with live data fetching were introduced. Client-side changes (IOUNotesField, usePlanDetail, usePlans) are column-rename updates to existing data flows, not new dynamic data sources.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Both migrations applied to remote | npx supabase migration list | 0015 and 0016 appear in applied column | ✓ PASS |
| Zero iou_notes in src/ | grep -r "iou_notes" src/ | No output | ✓ PASS |
| Zero iou_notes in seed.sql | grep -c "iou_notes" supabase/seed.sql | 0 | ✓ PASS |
| TypeScript compiles cleanly | npx tsc --noEmit | Exits 0, no output | ✓ PASS |
| iou_groups + iou_members types in database.ts | grep -n "iou_groups\|iou_members" src/types/database.ts | Lines 415 and 445 | ✓ PASS |

### Requirements Coverage

Per REQUIREMENTS.md note: "Phase 5 (Database Migrations) creates the schema required by IOU-01 through IOU-05 and BDAY-01 through BDAY-03. Those requirements are assigned to the phases that deliver their client-facing behavior, not to the migration phase itself."

The requirement IDs appear in all three plan frontmatter `requirements` fields as a traceability marker indicating which client-facing requirements depend on this schema foundation. Phase 5 does not deliver user-facing behavior — it delivers the schema contract those phases build against.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| IOU-01 | 05-01, 05-03 | User can create an expense | Schema foundation DELIVERED | iou_groups + create_expense() RPC exist |
| IOU-02 | 05-01, 05-03 | User can split evenly or custom amounts | Schema foundation DELIVERED | split_mode column + create_expense() even/custom modes in 0015 |
| IOU-03 | 05-01, 05-03 | User can view net balance per friend | Schema foundation DELIVERED | get_iou_summary() RPC defined in 0015 |
| IOU-04 | 05-01, 05-03 | User can mark a debt as settled | Schema foundation DELIVERED | settled_at + settled_by columns in iou_members; UPDATE RLS gates on creator |
| IOU-05 | 05-01, 05-03 | User can view expense history | Schema foundation DELIVERED | iou_groups + iou_members queryable via RLS |
| BDAY-01 | 05-02, 05-03 | User can add birthday to profile | Schema foundation DELIVERED | birthday_month + birthday_day nullable smallint columns on profiles in 0016 |
| BDAY-02 | 05-02, 05-03 | User can view friends' birthdays sorted by next occurrence | Schema foundation DELIVERED | get_upcoming_birthdays() RPC with ORDER BY days_until ASC |
| BDAY-03 | 05-02, 05-03 | Squad dashboard shows upcoming birthdays card | Schema foundation DELIVERED | get_upcoming_birthdays() RPC available for Phase 10 dashboard card |

All 8 requirement IDs from plan frontmatter are accounted for. Client-facing behavior delivery is tracked in Phases 6-9.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| supabase/migrations/0015_iou_v1_4.sql | 96 | iou_groups_select_member uses direct subquery on iou_members (not the is_iou_member helper) | ℹ️ Info | This is correct behavior — iou_groups SELECT policy cannot use is_iou_member() for its own recursion check; the helper is only needed on iou_members SELECT. The iou_groups policy uses a direct EXISTS subquery which does not cause recursion. |
| supabase/migrations/0015_iou_v1_4.sql | 105-107 | iou_members_select_participant uses public.is_iou_member() | ✓ Correct | SECURITY DEFINER helper correctly prevents self-referencing RLS recursion on iou_members |

No blockers, stubs, or TODO/FIXME patterns found in any of the 8 modified/created files.

### Human Verification Required

#### 1. RLS Smoke-Test Against Live Database

**Test:** Connect to Supabase project `zqmaauaopyolutfoizgq` using a test user session and execute:
1. As `alex` (who created "Dinner at Noma"): `SELECT * FROM iou_groups` — should return the expense alex created
2. As `jamie` (member, not creator): `SELECT * FROM iou_groups` — should return expenses jamie is a member of, not expenses created by others where jamie is not a member
3. As a user with no expenses: `SELECT * FROM iou_groups` — should return zero rows
4. As `jamie` (non-creator): `UPDATE iou_members SET settled_at = now() WHERE user_id = 'jamie-id'` — should be rejected (only creator can mark settled)
5. As a user with no accepted friends: `SELECT * FROM get_upcoming_birthdays()` — should return zero rows

**Expected:** Policies enforce member-only read and creator-only settlement. get_upcoming_birthdays() is correctly scoped to accepted friends.

**Why human:** RLS policy evaluation involves runtime JWT context (auth.uid()), SECURITY DEFINER helper invocations, and cross-table EXISTS checks — none of which can be simulated by static file analysis. The SQL logic is correct per code review, but live execution is the only way to confirm there is no RLS recursion or policy bypass in practice.

### Gaps Summary

No gaps. All file-level truths (SC1, SC2, SC4) are fully verified. The only pending item is SC3 (RLS smoke-test), which requires live DB execution and cannot be automated.

---

_Verified: 2026-04-12_
_Verifier: Claude (gsd-verifier)_
