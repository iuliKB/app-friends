---
phase: 05
slug: database-migrations
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-12
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Client → Supabase RPC (create_expense) | Authenticated client creates IOU expense; atomic insert into iou_groups + iou_members | expense title, amount cents, participant UUIDs |
| Client → Supabase RPC (get_iou_summary) | Authenticated client reads per-friend net balances | net_amount_cents, unsettled_count per friend |
| Client → Supabase RPC (get_upcoming_birthdays) | Authenticated client reads accepted-friend birthday data | friend UUID, display_name, birthday month/day, days_until |
| iou_groups ↔ iou_members RLS evaluation | Cross-table RLS; SELECT on iou_members cannot self-reference without infinite recursion | internal PG evaluation — no user data crosses but execution path must not loop |
| plans.general_notes column | Authenticated user writes plan notes via IOUNotesField | free-text string, user-authored |
| CLI → Supabase remote (db push) | npx supabase db push applies migrations with service-role equivalent access | DDL statements — schema changes only, no row data |
| seed.sql INSERT statements | Seed data bypasses RLS; runs with service-role privileges during supabase db seed | hardcoded test UUIDs and fixture values — dev/test only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-05-01 | Elevation of Privilege | iou_members UPDATE RLS | mitigate | `is_iou_group_creator()` SECURITY DEFINER helper; UPDATE policy USING + WITH CHECK both call helper — debtor cannot self-certify | closed |
| T-05-02 | Denial of Service | create_expense() RPC | mitigate | `CHECK (total_amount_cents > 0)` on iou_groups table; `IF v_caller IS NULL THEN RAISE EXCEPTION` guard in RPC body | closed |
| T-05-03 | Information Disclosure | iou_groups SELECT policy | mitigate | Policy `iou_groups_select_member` USING subquery requires caller in iou_members; non-participants receive zero rows | closed |
| T-05-04 | Information Disclosure | iou_members SELECT policy | mitigate | `is_iou_member()` SECURITY DEFINER helper reads iou_members.user_id bypassing RLS; no self-referencing recursion; only participants see rows | closed |
| T-05-05 | Tampering | plans.general_notes via IOUNotesField | accept | Existing plans UPDATE RLS `WITH CHECK (id = auth.uid())` covers renamed column; no new attack surface | closed |
| T-05-06 | Repudiation | Settlement audit trail | mitigate | `settled_by uuid` column records who marked payment; `settled_at timestamptz` column provides timestamp — both present in iou_members schema | closed |
| T-05-07 | Spoofing | is_iou_group_creator / is_iou_member helpers | mitigate | `SET search_path = ''` on all four SECURITY DEFINER functions; `(SELECT auth.uid())` pattern isolates JWT identity evaluation | closed |
| T-05-08 | Information Disclosure | get_upcoming_birthdays() | mitigate | RPC CTE joins through `friendships WHERE status = 'accepted'`; callers with no accepted friends receive zero rows | closed |
| T-05-09 | Tampering | profiles birthday columns via direct UPDATE | accept | Existing profiles UPDATE RLS `WITH CHECK (id = auth.uid())` restricts writes to the authenticated user's own row; birthday columns inherit this policy | closed |
| T-05-10 | Denial of Service | make_date() in non-leap year with Feb 29 birthday | mitigate | CASE guard substitutes Feb 28 before `make_date()` when `birthday_day = 29 AND birthday_month = 2 AND year % 4 <> 0`; guard applied in both this-year and next-year branches | closed |
| T-05-11 | Tampering | supabase db push (destructive migration) | mitigate | `RENAME COLUMN` is non-destructive; `CREATE TABLE` and `ALTER TABLE ADD COLUMN` do not touch existing rows; no DROP statements in either migration file | closed |
| T-05-12 | Information Disclosure | seed.sql hardcoded test UUIDs | accept | seed.sql is dev/test data only; test UUIDs carried over from prior phases; never applied to production | closed |
| T-05-13 | Denial of Service | iou_members settled_at set on creator row at seed time | accept | Seed payer row is marked settled at insert (payer already paid — realistic fixture); seed-only data, not present in production | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-05-01 | T-05-05 | `plans.general_notes` is a rename of `plans.iou_notes`. The existing UPDATE RLS policy (`WITH CHECK id = auth.uid()`) already restricts writes to the plan creator. No new code path was introduced; the column rename carries no additional attack surface. | gsd-security-auditor | 2026-04-12 |
| AR-05-02 | T-05-09 | `profiles.birthday_month` and `profiles.birthday_day` are nullable columns added via `ALTER TABLE ADD COLUMN`. The existing profiles UPDATE RLS policy (`WITH CHECK id = auth.uid()`) restricts writes to the authenticated user's own row. No new bypass vector exists — same policy that protects `display_name` also protects birthday columns. | gsd-security-auditor | 2026-04-12 |
| AR-05-03 | T-05-12 | `supabase/seed.sql` contains hardcoded UUIDs for test users (alex, jamie, morgan, riley, casey, drew). These UUIDs have been present since prior phases and are established dev-fixture convention. seed.sql is applied only during local development or CI; it is never applied to the production Supabase project. | gsd-security-auditor | 2026-04-12 |
| AR-05-04 | T-05-13 | The IOU seed data marks the payer's own `iou_members` row as `settled_at = now()` at insert time. This is realistic (the payer has already paid) and simplifies fixture setup. Seed data is dev/test only and is never present in the production database. | gsd-security-auditor | 2026-04-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Threat Flags

None. The `## Threat Surface Scan` sections in 05-01-SUMMARY.md, 05-02-SUMMARY.md, and 05-03-SUMMARY.md all map to registered threat IDs (T-05-01 through T-05-13). No new attack surface was flagged without a corresponding register entry.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-12 | 13 | 13 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-12
