---
phase: 11-birthday-feature
plan: 01
subsystem: database
tags: [supabase, postgres, rls, security-definer, migrations, playwright]

# Dependency graph
requires:
  - phase: 05-database-migrations
    provides: IOU and birthday schema patterns (SECURITY DEFINER helpers, atomic RPCs, composite PKs)
  - phase: 07-birthday-calendar-feature
    provides: get_upcoming_birthdays RPC body that is extended in this plan
provides:
  - supabase/migrations/0017_birthday_social_v1_4.sql — all Phase 11 schema changes
  - birthday_year nullable smallint column on profiles with CHECK constraint
  - wish_list_items + wish_list_claims tables with RLS
  - group_channels + group_channel_members tables with RLS
  - is_not_wish_list_owner + is_group_channel_member SECURITY DEFINER helpers
  - get_upcoming_birthdays recreated with birthday_year in RETURNS TABLE
  - get_friends_of(uuid) SECURITY DEFINER RPC
  - create_birthday_group(text, uuid[]) atomic SECURITY DEFINER RPC
  - Playwright test stubs for wish list and group chat features
affects:
  - 11-02 (db push + TypeScript types update)
  - 11-03 (birthday_year wired into profile edit)
  - 11-04 (wish list UI)
  - 11-05 (FriendBirthdayPage + group creation flow)
  - 11-06 (group chat room)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SECURITY DEFINER helper before dependent table to avoid forward reference (is_not_wish_list_owner before wish_list_claims)
    - Three-way exclusive channel constraint on messages using integer cast sum = 1
    - FOREACH...LOOP in plpgsql RPC with caller-inclusion guard (create_birthday_group)
    - get_friends_of excludes auth.uid() from results to prevent self-inclusion in group picker

key-files:
  created:
    - supabase/migrations/0017_birthday_social_v1_4.sql
    - tests/visual/birthday-wishlist.spec.ts
    - tests/visual/birthday-group-chat.spec.ts
  modified: []

key-decisions:
  - "messages_exactly_one_channel constraint dropped and recreated using integer cast sum pattern to support three-way channel (plan/dm/group)"
  - "is_not_wish_list_owner created before wish_list_claims table to avoid forward reference — same order-dependency pattern as is_iou_member in Phase 05"
  - "get_friends_of excludes (SELECT auth.uid()) from results — caller should not appear in their own group member picker"
  - "wish_list_items ALL policy for owner (CRUD in one policy) + separate SELECT policy for friends — avoids policy name collision"

patterns-established:
  - "Wish list claim secrecy: SECURITY DEFINER helper reads cross-table to enforce owner exclusion without RLS recursion"
  - "Group channel RLS: is_group_channel_member helper OR-branched into existing messages policies rather than new policy"

requirements-completed:
  - D-01
  - D-03
  - D-04
  - D-07
  - D-08
  - D-09
  - D-10
  - D-11
  - D-14
  - D-15
  - D-16
  - D-17

# Metrics
duration: 15min
completed: 2026-04-17
---

# Phase 11 Plan 01: Birthday Social Schema Summary

**Migration 0017 with wish lists, secret claims, group channels, and updated messages RLS — all Phase 11 DB objects in a single file with Playwright test stubs**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-16T22:31:00Z
- **Completed:** 2026-04-16T22:33:51Z
- **Tasks:** 2
- **Files modified:** 3 created

## Accomplishments

- Wrote all 11 sections of migration 0017 covering birthday_year, wish lists, group channels, and updated RPCs
- Extended messages table constraint from two-way to three-way exclusive channel check
- Created two Playwright test stubs that compile immediately (RED state, will activate when screens are built)

## Task Commits

1. **Task 1: Write migration 0017 SQL** - `1744bae` (feat)
2. **Task 2: Create Playwright test stubs** - `8d9fb18` (test)

## Files Created/Modified

- `supabase/migrations/0017_birthday_social_v1_4.sql` - All Phase 11 schema: 11 sections, 5 new tables/columns, 4 new RPCs, 2 SECURITY DEFINER helpers
- `tests/visual/birthday-wishlist.spec.ts` - RED stub for wish list Playwright tests (3 skipped tests)
- `tests/visual/birthday-group-chat.spec.ts` - RED stub for group chat Playwright tests (2 skipped tests)

## Decisions Made

- The `messages_exactly_one_channel` CHECK constraint from `0001_init.sql` required dropping and recreating to accommodate `group_channel_id`. Used an integer-cast sum pattern: `((plan_id IS NOT NULL)::int + (dm_channel_id IS NOT NULL)::int + (group_channel_id IS NOT NULL)::int) = 1` which is cleaner than a three-way OR/AND expression.
- `wish_list_items` uses a single `ALL` policy for the owner (handles SELECT, INSERT, UPDATE, DELETE) plus a separate `SELECT` policy for friends — avoids policy name collision while keeping the security model clear.
- `is_not_wish_list_owner` placed before `wish_list_claims` CREATE TABLE to prevent forward reference, following the same ordering discipline established in Phase 05 with `is_iou_member`.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Migration will be pushed in Plan 11-02.

## Next Phase Readiness

- Migration 0017 file ready for `supabase db push` in Plan 11-02
- TypeScript types will be updated in Plan 11-02 after push confirms the schema
- Playwright stubs are compiled and in place for Plans 11-04 through 11-06 to activate

## Self-Check

- `supabase/migrations/0017_birthday_social_v1_4.sql` exists: FOUND
- `tests/visual/birthday-wishlist.spec.ts` exists: FOUND
- `tests/visual/birthday-group-chat.spec.ts` exists: FOUND
- Commit `1744bae` exists: FOUND
- Commit `8d9fb18` exists: FOUND
- `npx tsc --noEmit` exits 0: PASSED

## Self-Check: PASSED

---
*Phase: 11-birthday-feature*
*Completed: 2026-04-17*
