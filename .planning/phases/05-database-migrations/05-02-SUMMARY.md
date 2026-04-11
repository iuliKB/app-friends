---
phase: 05-database-migrations
plan: "02"
subsystem: database
tags: [postgres, supabase, migrations, rls, security-definer, birthdays]

# Dependency graph
requires:
  - phase: 05-database-migrations plan 01
    provides: Migration 0015 IOU tables and general_notes rename
provides:
  - Migration 0016 with birthday_month and birthday_day nullable smallint columns on profiles
  - Compound CHECK constraint enforcing valid day-in-month combinations (no Feb 30, Feb max=29)
  - get_upcoming_birthdays() SECURITY DEFINER RPC with year-wrap arithmetic and Feb 29 leap-year guard
affects:
  - phase: 06-birthday-profile-field (reads/writes birthday_month, birthday_day columns)
  - phase: 07-birthday-calendar (calls get_upcoming_birthdays() RPC)
  - phase: 10-squad-dashboard (calls get_upcoming_birthdays() for birthday card)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Compound CHECK constraint across two columns in a single ALTER TABLE ADD COLUMN
    - CTE-based SECURITY DEFINER RPC with friend-scope via friendships join
    - Feb 29 leap-year guard using EXTRACT(year FROM now())::int % 4 check before make_date()

key-files:
  created:
    - supabase/migrations/0016_birthdays_v1_4.sql
  modified: []

key-decisions:
  - "Birthday columns nullable (no NOT NULL, no DEFAULT) — birthday is optional per D-10"
  - "Compound CHECK allows birthday_day up to 29 for February (leap-year birthdays stored as Feb 29; RPC handles non-leap years)"
  - "get_upcoming_birthdays() uses LANGUAGE sql (not plpgsql) STABLE SECURITY DEFINER per plan interface contract"
  - "Feb 29 guard applied in both this-year and next-year branches of days_until CASE expression"

patterns-established:
  - "Year-wrap birthday arithmetic: compare this_year_bday >= CURRENT_DATE; if past, calculate next-year date"
  - "Leap-year guard pattern: check % 4 before make_date(); substitute Feb 28 for Feb 29 in non-leap years"

requirements-completed:
  - BDAY-01
  - BDAY-02
  - BDAY-03

# Metrics
duration: 1min
completed: "2026-04-12"
---

# Phase 05 Plan 02: Birthday Columns and get_upcoming_birthdays() RPC Summary

**Nullable birthday_month and birthday_day smallint columns on profiles with compound day-in-month CHECK constraint and SECURITY DEFINER RPC that returns accepted friends sorted by days until next birthday with full Feb 29 leap-year handling**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-11T22:31:35Z
- **Completed:** 2026-04-11T22:32:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created migration 0016 adding birthday_month and birthday_day as nullable smallint columns to profiles with compound CHECK constraints (no Feb 30, no invalid month-day combos)
- Implemented get_upcoming_birthdays() SECURITY DEFINER RPC scoped to accepted friends only, returning zero rows for callers with no accepted friends (T-05-08 mitigated)
- Feb 29 leap-year guard applied in both this-year and next-year branches to prevent make_date() errors in non-leap years (T-05-10 mitigated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 0016 — birthday columns on profiles, get_upcoming_birthdays() RPC** - `2992c31` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `supabase/migrations/0016_birthdays_v1_4.sql` - Migration 0016: birthday columns with compound CHECK, get_upcoming_birthdays() RPC, GRANT EXECUTE to authenticated

## Decisions Made

- Birthday columns are nullable with no DEFAULT — birthday is optional, existing profile rows require no backfill
- Feb 29 is valid at the DB level (CHECK allows up to 29 for month=2 to support leap-year birthdays); the RPC handles the edge case at query time
- Used LANGUAGE sql STABLE (not plpgsql) per plan interface contract — no procedural logic required, SQL-only CTE approach is simpler

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The acceptance-criteria grep `grep "birthday_month.*NOT NULL\|birthday_day.*NOT NULL"` matched the WHERE clause `WHERE p.birthday_month IS NOT NULL` in the RPC body. This is correct behavior — the WHERE clause filters out friends without birthdays; the column definitions themselves have no NOT NULL constraint. Verified by inspecting column definition lines directly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Migration 0016 provides the birthday schema foundation for Phases 6, 7, and 10
- Phase 6 (Birthday Profile Field): can read/write birthday_month and birthday_day on the authenticated user's profile row via existing UPDATE RLS policy (WITH CHECK id = auth.uid())
- Phase 7 (Birthday Calendar): can call get_upcoming_birthdays() RPC directly — returns friends sorted by days_until ASC
- Phase 10 (Squad Dashboard): same RPC provides data for the upcoming birthdays dashboard card

---
*Phase: 05-database-migrations*
*Completed: 2026-04-12*
