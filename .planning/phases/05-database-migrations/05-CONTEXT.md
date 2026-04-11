# Phase 5: Database Migrations - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

All new schema objects exist in Supabase so client code can be written against correct column types, RLS policies, and RPCs — no destructive re-migrations needed later. Covers IOU tables, birthday columns, RPCs, RLS policies, seed data, and the iou_notes rename. No client UI work except updating references to the renamed column.

</domain>

<decisions>
## Implementation Decisions

### iou_notes Field Disposition
- **D-01:** Rename `plans.iou_notes` to `general_notes` in migration 0015. Update all client code references (~10 files: IOUNotesField.tsx, usePlanDetail.ts, usePlans.ts, database.ts, plans.ts, PlanDashboardScreen.tsx, seed.sql, etc.) in this phase to avoid broken references.
- **D-02:** The free-text field and structured IOU feature coexist — they serve different purposes (plan-scoped notes vs. squad-level expense tracking). The rename eliminates naming confusion.

### IOU Table Naming
- **D-03:** Tables named `iou_groups` and `iou_members` per roadmap convention. IOU prefix groups all related objects and matches feature naming (IOU card, IOU screen).
- **D-04:** `create_expense()` atomic RPC creates both the iou_groups row and all iou_members rows in a single transaction — no orphan records on network failure.
- **D-05:** `get_iou_summary()` RPC returns per-friend net balances across all unsettled expenses.

### Settlement Tracking
- **D-06:** `iou_members` includes both `settled_at` (timestamptz, NULL = unsettled) and `settled_by` (uuid, FK to auth.users) columns. Provides full audit trail of when and who marked settlement.
- **D-07:** RLS UPDATE policy on `iou_members` restricts settlement to the expense creator only (`settled_by` must equal `iou_groups.created_by`). A debtor cannot self-certify payment.

### Amount Storage
- **D-08:** All monetary amounts stored as INTEGER cents. No float arithmetic — prevents phantom debts from floating-point drift.
- **D-09:** Even split uses largest-remainder method in `create_expense()` RPC to distribute cents without rounding loss.

### Birthday Columns
- **D-10:** `profiles.birthday_month` (smallint, 1-12) and `profiles.birthday_day` (smallint, 1-31) columns. Both nullable — birthday is optional.
- **D-11:** `get_upcoming_birthdays()` RPC returns friends sorted by next occurrence with year-wrap arithmetic (handles Dec->Jan boundary).
- **D-12:** CHECK constraints enforce valid month (1-12) and day (1-31) ranges at the database level.

### Seed Data
- **D-13:** Extend existing `seed.sql` with IOU expenses and birthday values for existing test users (Alice, Bob, Charlie, etc.). Developers get realistic test data immediately after migration.

### Migration Structure
- **D-14:** Migration 0015: IOU tables (`iou_groups`, `iou_members`), RLS policies, `create_expense()` RPC, `get_iou_summary()` RPC, and `plans.iou_notes` rename to `general_notes`.
- **D-15:** Migration 0016: Birthday columns on `profiles`, CHECK constraints, `get_upcoming_birthdays()` RPC.

### Claude's Discretion
- Exact index strategy on iou_groups/iou_members (beyond what RLS queries require)
- RPC parameter naming and return type shapes
- Specific RLS policy naming conventions (follow existing patterns)
- CHECK constraint for valid day-in-month combinations (e.g., Feb 30)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing schema
- `supabase/migrations/0001_init.sql` — Base schema: profiles, plans (with iou_notes column), plan_members, friendships, RLS patterns
- `supabase/migrations/0010_friend_went_free_v1_3.sql` — Recent migration pattern: ALTER TABLE ADD COLUMN, SECURITY DEFINER RPCs, index creation
- `supabase/migrations/0011_squad_streak_v1_3.sql` — Complex RPC pattern: SECURITY DEFINER, search_path hardening, auth.uid() guard

### Client references (for iou_notes rename)
- `src/components/plans/IOUNotesField.tsx` — Component that writes to plans.iou_notes
- `src/hooks/usePlanDetail.ts` — Reads iou_notes from plan rows
- `src/hooks/usePlans.ts` — Reads iou_notes in plan list query
- `src/types/database.ts` — TypeScript types for plans table (iou_notes field)
- `src/types/plans.ts` — Plan type definition with iou_notes
- `src/screens/plans/PlanDashboardScreen.tsx` — Passes iou_notes to IOUNotesField

### Requirements
- `.planning/REQUIREMENTS.md` — IOU-01 through IOU-05, BDAY-01 through BDAY-03 requirement definitions
- `.planning/ROADMAP.md` §Phase 5 — Success criteria, depends-on chain

### Research
- `.planning/research/PITFALLS.md` §Pitfall 11 — iou_notes naming collision analysis and rename recommendation
- `.planning/research/ARCHITECTURE.md` §IOU and existing iou_notes field — Coexistence rationale
- `.planning/research/FEATURES.md` — IOU feature scope and data model overview

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Migration convention: header comment with phase/decision refs, `ENABLE ROW LEVEL SECURITY` immediately after CREATE TABLE
- `SECURITY DEFINER` with `SET search_path = ''` and explicit `auth.uid()` guard for all RPCs
- `gen_random_uuid()` for all UUID primary keys
- `least()/greatest()` pattern for symmetric relationship deduplication (friendships, DM channels)

### Established Patterns
- All tables use `created_at timestamptz NOT NULL DEFAULT now()` and `updated_at timestamptz NOT NULL DEFAULT now()`
- RLS enabled on every table — no exceptions
- Foreign keys reference `auth.users(id) ON DELETE CASCADE` for user-owned data
- Indexes named `idx_{table}_{purpose}` (e.g., `idx_free_transitions_unsent`)
- RPCs grant execute to `authenticated` role

### Integration Points
- `profiles` table: birthday columns added here (ALTER TABLE, same pattern as 0010 adding timezone + notify_friend_free)
- `plans` table: iou_notes column renamed here
- `seed.sql`: extended with IOU + birthday test data
- `src/types/database.ts`: will need iou_groups/iou_members type additions (downstream phases, but rename happens here)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing migration conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-database-migrations*
*Context gathered: 2026-04-12*
