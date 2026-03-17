---
phase: 01-foundation-auth
plan: 02
subsystem: database
tags: [supabase, postgres, rls, sql, typescript, migrations, seed-data]

# Dependency graph
requires: []
provides:
  - "Complete V1 database schema in supabase/migrations/0001_init.sql"
  - "RLS enabled on all 7 public tables with 23 policies"
  - "SECURITY DEFINER is_friend_of() helper preventing RLS recursion"
  - "handle_new_user trigger auto-creating profile + status on signup"
  - "Three RPC functions: get_friends, get_free_friends, get_or_create_dm_channel"
  - "Seed data at supabase/seed.sql with 6 test users and sample data"
  - "TypeScript Database type at src/types/database.ts with all 7 tables, 3 enums, 4 functions"
  - "Supabase client singleton at src/lib/supabase.ts using real Database generic"
affects:
  - 01-03-auth-flows
  - 02-home-screen
  - 03-friends-system
  - 04-plans
  - 05-chat
  - 06-polish

# Tech tracking
tech-stack:
  added:
    - "Supabase Postgres schema (SQL migrations)"
    - "Supabase RLS policies"
    - "Supabase Storage (avatars bucket)"
  patterns:
    - "Convention: every CREATE TABLE immediately followed by ALTER TABLE ENABLE ROW LEVEL SECURITY"
    - "All RLS policies use (SELECT auth.uid()) wrapper for query plan caching performance"
    - "All INSERT/UPDATE policies include WITH CHECK for ownership verification"
    - "SECURITY DEFINER function bypasses RLS for friendship checks, preventing infinite recursion"
    - "Canonical pair pattern: least()/greatest() on friendship and dm_channel user columns"
    - "Database TypeScript types provide compile-time safety for all Supabase queries"

key-files:
  created:
    - "supabase/migrations/0001_init.sql"
    - "supabase/seed.sql"
    - "src/types/database.ts"
    - "src/lib/supabase.ts"
  modified: []

key-decisions:
  - "profiles SELECT policy allows all authenticated users to read all profiles — safe because profiles only contain public info (username, display_name, avatar_url), required for friend search"
  - "plans UPDATE policy allows any plan member to update (not just creator) — enables collaborative link_dump and iou_notes editing"
  - "TypeScript types written manually from migration SQL since Supabase project has placeholder env vars and migration not yet applied"
  - "Friendship canonical pair stored as UNIQUE constraint on (least(requester_id, addressee_id), greatest(requester_id, addressee_id)) — prevents duplicates regardless of request direction"
  - "Row type aliases (Profile, Status, etc.) and enum aliases exported from database.ts for convenient app-wide use"

patterns-established:
  - "Pattern 1 (RLS Convention): Every CREATE TABLE is immediately followed by ALTER TABLE ENABLE ROW LEVEL SECURITY plus at least one policy — never leave a table without RLS"
  - "Pattern 2 (auth.uid() wrapping): Always use (SELECT auth.uid()) not bare auth.uid() in policies for query plan caching — applies to all future tables"
  - "Pattern 3 (SECURITY DEFINER): Use SECURITY DEFINER SET search_path = '' for all cross-table RLS helper functions and RPC functions"
  - "Pattern 4 (Canonical pairs): Use least()/greatest() for symmetric relationships (friendships, dm_channels) — index and query must both use same form"

requirements-completed: [INFR-01, INFR-02, INFR-03, INFR-04, INFR-06]

# Metrics
duration: 6min
completed: 2026-03-17
---

# Phase 1 Plan 02: Database Schema Summary

**Complete V1 Postgres schema with 7 tables, 23 RLS policies, SECURITY DEFINER friendship helper, handle_new_user trigger, 3 RPC functions, and full TypeScript Database type generated from migration SQL**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-17T14:41:54Z
- **Completed:** 2026-03-17T14:48:04Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Complete Supabase V1 migration (0001_init.sql): 7 tables, 3 enums, 8 indexes, 23 RLS policies, 6 triggers, 3 RPC functions, 1 storage bucket
- Seed data with 6 test users, 7 friendships (6 accepted + 1 pending), 2 plans with members and messages, 1 DM channel
- Full TypeScript Database type covering all tables with Row/Insert/Update shapes, enums, and RPC functions — npx tsc --noEmit passes with 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create complete V1 migration with all tables, RLS, triggers, and RPC functions** - `15075f2` (feat)
2. **Task 2: Move seed data to supabase directory** - `58ac331` (chore)
3. **Task 3: Generate TypeScript types from Supabase schema** - `1d07de1` (feat)

## Files Created/Modified

- `supabase/migrations/0001_init.sql` - Complete V1 schema: 7 tables, 3 enums, 8 indexes, 23 RLS policies, 4 trigger functions, 3 RPC functions, avatars storage bucket
- `supabase/seed.sql` - Development seed data with 6 test users, friendships, 2 plans, 1 DM channel, 15 messages
- `src/types/database.ts` - Full TypeScript Database type with all tables/enums/functions, plus convenience aliases
- `src/lib/supabase.ts` - Supabase client singleton using real Database generic, AsyncStorage adapter, AppState listener

## Decisions Made

- **profiles SELECT open to all authenticated users:** Profiles contain only public info (username, display_name, avatar_url). Required for friend search. Sensitive data lives in other tables with stricter policies.
- **plans UPDATE open to any plan member:** Enables collaborative editing of link_dump and iou_notes without requiring creator-only access.
- **Manual TypeScript types:** Supabase env vars are placeholders; automated `npx supabase gen types` cannot run until migration is applied to real project. Types manually derived from migration SQL, which is equivalent and will be overwritten by generated types once applied.
- **Canonical pair via UNIQUE constraint:** The UNIQUE constraint on (least(a), greatest(b)) enforces deduplication at the DB level, not just application level.

## Deviations from Plan

None - plan executed exactly as written. Fell back to manual TypeScript types as specified in Task 3 step 3 (automated gen not possible with placeholder env vars).

## Issues Encountered

None. The plan correctly anticipated the fallback path for TypeScript type generation when the Supabase project hasn't yet had the migration applied.

## User Setup Required

To apply the migration to your Supabase project:
1. Set real values in `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
2. Apply migration: either via Supabase dashboard SQL editor or `npx supabase db push --project-ref $PROJECT_REF`
3. Regenerate types: `npx supabase gen types typescript --project-id $PROJECT_REF > src/types/database.ts`

## Next Phase Readiness

- Database schema is the foundation for all application logic — Plan 01-03 (auth flows) can now query profiles, statuses, and use the handle_new_user trigger
- RLS policies protect all tables; queries from the app client via anon key will be properly scoped
- TypeScript types provide compile-time safety for all Supabase queries across the entire app
- Seed data ready for local dev testing once migration is applied

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-17*
