---
phase: 11-birthday-feature
plan: 03
subsystem: types-and-components
tags: [typescript, birthday, wish-list, group-channels, birthday-picker, tdd]

# Dependency graph
requires:
  - phase: 11-02
    provides: Migration 0017 live in Supabase (birthday_year, wish_list_items, group_channels, etc.)
provides:
  - src/types/database.ts — all Phase 11 TypeScript types (birthday_year, new tables, new RPCs)
  - src/utils/birthdayFormatters.ts — formatTurningAge exported
  - src/components/common/BirthdayPicker.tsx — three-column picker (Month | Day | Year)
  - src/hooks/useUpcomingBirthdays.ts — BirthdayEntry with birthday_year field
affects:
  - 11-04 (wish list UI can use typed Tables<'wish_list_items'> and Tables<'wish_list_claims'>)
  - 11-05 (FriendBirthdayPage can use get_friends_of and create_birthday_group types)
  - 11-06 (group chat can use group_channels types and group_channel_id on messages)
  - 11-07 (birthday list screen uses formatTurningAge and BirthdayEntry.birthday_year)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle for pure utility function (formatTurningAge)
    - BirthdayPicker three-way ternary for month/day/year option rendering
    - birthday_year = referenceDate.getFullYear() - birthYear (ref-year-anchored age, not next-upcoming)

key-files:
  created:
    - tests/unit/birthdayFormatters.test.ts
  modified:
    - src/types/database.ts
    - src/utils/birthdayFormatters.ts
    - src/components/common/BirthdayPicker.tsx
    - src/hooks/useUpcomingBirthdays.ts
    - src/app/profile/edit.tsx

key-decisions:
  - "formatTurningAge returns refYear - birthYear (age in the reference year), not next-upcoming-birthday age — behavior spec takes precedence over code snippet in plan which had inverted ternary"
  - "edit.tsx updated atomically with BirthdayPicker signature change — compiler-enforced caller update per Rule 1 auto-fix"
  - "birthday year required guard added to handleSave in edit.tsx per D-01 (Alert if month+day set but year null)"

patterns-established:
  - "Three-branch ternary in ScrollView: month options / day options / year options — extend to any future multi-column picker"
  - "YEARS constant: CURRENT_YEAR-1 down to CURRENT_YEAR-100 (100 entries, excludes current year)"

requirements-completed:
  - D-01
  - D-02
  - D-03

# Metrics
duration: 6min
completed: 2026-04-17
---

# Phase 11 Plan 03: TypeScript Foundations Summary

**Phase 11 TypeScript types, formatTurningAge utility, three-column BirthdayPicker, and BirthdayEntry.birthday_year — all Wave 4 UI plans unblocked**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-17T00:06:00Z
- **Completed:** 2026-04-17T00:12:00Z
- **Tasks:** 2
- **Files modified:** 5 modified, 1 created

## Accomplishments

- Added all Phase 11 TypeScript types to `database.ts`: `birthday_year` on profiles, `group_channel_id` on messages, `wish_list_items`, `wish_list_claims`, `group_channels`, `group_channel_members` tables, and `get_friends_of` / `create_birthday_group` function types; updated `get_upcoming_birthdays` Returns to include `birthday_year`
- Implemented `formatTurningAge` via TDD (RED → GREEN): 3 failing tests written first, then function implemented — all passing
- Extended `BirthdayPicker` with Year column: new `YEARS` constant, updated props interface, `handleSelectYear`, year trigger in three-column row, year option rendering in Modal ScrollView; Clear link now requires all three fields
- Added `birthday_year: number | null` to `BirthdayEntry` interface
- Updated `edit.tsx` caller: birthday_year state, profile fetch, save with year-required guard (D-01), isDirty, and BirthdayPicker wiring

## Task Commits

1. **Task 1: Extend database.ts** - `c066328` (feat)
2. **Task 2 RED: failing tests** - `f9ba4f2` (test)
3. **Task 2 GREEN: implementation** - `b23473e` (feat)

## Files Created/Modified

- `src/types/database.ts` — 106 lines added: birthday_year, group_channel_id, 4 new tables, 2 new RPCs, updated get_upcoming_birthdays
- `tests/unit/birthdayFormatters.test.ts` — 49-line unit test using tsx + node:assert/strict (RED then GREEN)
- `src/utils/birthdayFormatters.ts` — formatTurningAge exported (20 lines added)
- `src/components/common/BirthdayPicker.tsx` — YEARS constant, year prop, handleSelectYear, year trigger, year option rendering, Clear condition updated
- `src/hooks/useUpcomingBirthdays.ts` — birthday_year added to BirthdayEntry
- `src/app/profile/edit.tsx` — birthdayYear state, fetch, year-required guard, save update, isDirty, BirthdayPicker call

## Decisions Made

- **formatTurningAge logic:** The plan's `<behavior>` spec and the inline code snippet were contradictory. The behavior spec (`formatTurningAge(2000, 1, 15, new Date('2028-01-16'))` → `'turning 28'`) was authoritative (TDD rule). The correct formula is `turningYear = referenceDate.getFullYear()`, giving `age = refYear - birthYear`. This means the function returns the age the person is associated with during the reference calendar year, regardless of whether their birthday has passed in that year.

- **edit.tsx updated as part of Task 2:** The BirthdayPicker signature change caused a TypeScript error in edit.tsx (missing `year` prop). This is a Rule 1 auto-fix (caller must match new signature). The edit.tsx update also incorporates the D-01 year-required guard per PATTERNS.md — birthday year is required when month+day are set.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated edit.tsx caller for new BirthdayPicker signature**
- **Found during:** Task 2 TypeScript check
- **Issue:** `edit.tsx` used old 2-arg `onChange(m, d)` signature; TypeScript error TS2741 (missing `year` prop)
- **Fix:** Added `birthdayYear` state, updated profile fetch to include `birthday_year`, added year-required Alert guard (D-01), updated save to write `birthday_year`, extended `isDirty`, updated `BirthdayPicker` JSX to pass `year` and 3-arg `onChange`
- **Files modified:** `src/app/profile/edit.tsx`
- **Commit:** `b23473e`

**2. [Rule 2 - Missing functionality] birthday_year required guard in edit.tsx handleSave**
- **Found during:** Task 2 implementation review against PATTERNS.md and D-01
- **Issue:** Plan's PATTERNS.md Pattern 5 specifies a save guard: Alert if month+day set but year null
- **Fix:** Added guard before the Supabase update call in `handleSave`
- **Files modified:** `src/app/profile/edit.tsx`
- **Commit:** `b23473e`

## Known Stubs

None — all plan outputs are fully wired. The `formatTurningAge` function is exported and the BirthdayPicker renders real year options from the `YEARS` constant.

## Threat Flags

No new security surface introduced. `formatTurningAge` is a pure client-side utility. `YEARS` array covers only `CURRENT_YEAR-1` down to `CURRENT_YEAR-100` per T-11-P03-01 mitigation — users cannot enter arbitrary year via the picker; DB `CHECK(birthday_year BETWEEN 1900 AND 2100)` is the final gate.

## Self-Check

- `src/types/database.ts` contains `birthday_year`: FOUND
- `src/types/database.ts` contains `wish_list_items`: FOUND
- `src/utils/birthdayFormatters.ts` exports `formatTurningAge`: FOUND
- `src/components/common/BirthdayPicker.tsx` contains `year: number | null`: FOUND
- `src/hooks/useUpcomingBirthdays.ts` contains `birthday_year: number | null`: FOUND
- `tests/unit/birthdayFormatters.test.ts` exists: FOUND
- Commit `c066328` exists: FOUND
- Commit `f9ba4f2` exists: FOUND
- Commit `b23473e` exists: FOUND
- `npx tsc --noEmit` exits 0: PASSED
- Unit tests pass (3/3): PASSED

## Self-Check: PASSED
