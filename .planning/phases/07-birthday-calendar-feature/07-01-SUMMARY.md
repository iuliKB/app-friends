---
phase: 07-birthday-calendar-feature
plan: "01"
subsystem: data-layer
tags: [hook, rpc, formatters, playwright, birthday, bday-02, bday-03]
dependency_graph:
  requires: []
  provides:
    - src/hooks/useUpcomingBirthdays.ts
    - src/utils/birthdayFormatters.ts
    - tests/visual/birthday-calendar.spec.ts
  affects:
    - src/types/database.ts
tech_stack:
  added: []
  patterns:
    - RPC wrapper hook modelled on useStreakData.ts (useCallback + useEffect + userId guard)
    - Pure formatting utilities with no React dependency (Intl.DateTimeFormat built into Hermes)
    - Playwright test scaffold following birthday-profile.spec.ts login + navigate + screenshot pattern
key_files:
  created:
    - src/hooks/useUpcomingBirthdays.ts
    - src/utils/birthdayFormatters.ts
    - tests/visual/birthday-calendar.spec.ts
  modified:
    - src/types/database.ts
decisions:
  - get_upcoming_birthdays RPC type added manually to database.ts — auto-generated types not used in this project; migration 0016 already deployed
  - Intl.DateTimeFormat anchor year 2000 used for formatBirthdayDate — year is irrelevant for month/day display, avoids leap-year edge cases in display
metrics:
  duration: ~10 minutes
  completed: 2026-04-12
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 7 Plan 01: Birthday Calendar Data Layer Summary

**One-liner:** RPC wrapper hook `useUpcomingBirthdays` and pure `birthdayFormatters` utilities wired to the `get_upcoming_birthdays` Supabase RPC with a Playwright test scaffold covering BDAY-02 and BDAY-03.

## What Was Built

**Task 1: useUpcomingBirthdays hook + birthday formatter utilities**

- `src/utils/birthdayFormatters.ts` — two pure functions with no React dependency:
  - `formatDaysUntil(days)` → "Today" / "Tomorrow" / "In N days"
  - `formatBirthdayDate(month, day)` → "Jan 15" using `Intl.DateTimeFormat` with year-2000 anchor
- `src/hooks/useUpcomingBirthdays.ts` — RPC wrapper modelled exactly on `useStreakData.ts`:
  - Exports `useUpcomingBirthdays`, `BirthdayEntry`, `UpcomingBirthdaysData`
  - Guards against unauthenticated calls (`if (!userId)` → loading=false, entries=[], no RPC)
  - Silent error fallback: `console.warn` + `setError` + `setEntries([])`
  - Wraps `supabase.rpc('get_upcoming_birthdays')` (no parameters — auth.uid() implicit in SQL)
- `src/types/database.ts` — added `get_upcoming_birthdays` RPC type definition (migration 0016)

**Task 2: Playwright test scaffold**

- `tests/visual/birthday-calendar.spec.ts` — 5 tests covering BDAY-02 and BDAY-03:
  - BDAY-03: BirthdayCard visible on goals tab
  - BDAY-03: BirthdayCard empty state copy
  - BDAY-03: Tapping BirthdayCard navigates to birthday list screen
  - BDAY-02: Birthday list screen shows friends sorted by days_until
  - BDAY-02: Birthday list empty state / no crash
  - Tests intentionally fail until Plans 02-03 deliver the UI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added get_upcoming_birthdays RPC type to database.ts**
- **Found during:** Task 1 — TypeScript compilation
- **Issue:** `supabase.rpc('get_upcoming_birthdays')` failed type-check because the RPC name was not in the `Functions` union in `src/types/database.ts`; the type fell back to an unrelated RPC shape causing TS2345 and TS2352 errors
- **Fix:** Added `get_upcoming_birthdays` entry to `Database['public']['Functions']` matching the exact return shape from migration 0016 (`friend_id`, `display_name`, `avatar_url`, `birthday_month`, `birthday_day`, `days_until`)
- **Files modified:** `src/types/database.ts`
- **Commit:** dd5ae3d

## Commits

| Hash | Message |
|------|---------|
| dd5ae3d | feat(07-01): add useUpcomingBirthdays hook and birthday formatter utilities |
| f757f8c | test(07-01): add Playwright test scaffold for birthday calendar (BDAY-02, BDAY-03) |

## Known Stubs

None — this plan delivers data-layer infrastructure only. No UI components yet.

## Threat Flags

None — no new network endpoints or auth paths introduced. The `useUpcomingBirthdays` hook enforces the T-07-02 mitigation (`if (!userId)` guard) as required by the threat model.

## Self-Check: PASSED

- FOUND: src/hooks/useUpcomingBirthdays.ts
- FOUND: src/utils/birthdayFormatters.ts
- FOUND: tests/visual/birthday-calendar.spec.ts
- FOUND: commit dd5ae3d
- FOUND: commit f757f8c
