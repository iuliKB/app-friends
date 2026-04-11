---
phase: 04-upcoming-events-section
plan: 01
subsystem: database, ui
tags: [supabase, typescript, zustand, hooks]

# Dependency graph
requires:
  - phase: 03-card-stack-view
    provides: PlanWithMembers type, usePlansStore, plan data layer
provides:
  - DB migration adding cover_image_url column to plans table
  - TypeScript types updated in database.ts (Row/Insert/Update) and plans.ts
  - usePlans assembly step forwards cover_image_url
  - formatEventCardDate utility producing "Mon 15, Aug · in 2 days" strings
  - useUpcomingEvents hook filtering future plans (creator OR going), sorted asc, capped at 5
affects: [04-02, 04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client-side filter hook over Zustand store (no extra network round-trip)
    - Middle dot separator (U+00B7) for composite date strings per design spec

key-files:
  created:
    - supabase/migrations/0013_cover_image_url.sql
    - src/lib/formatEventCardDate.ts
    - src/hooks/useUpcomingEvents.ts
  modified:
    - src/types/database.ts
    - src/types/plans.ts
    - src/hooks/usePlans.ts

key-decisions:
  - "cover_image_url nullable text column — nullable so existing plans are unaffected until images are uploaded"
  - "useUpcomingEvents filters client-side from Zustand store — avoids extra Supabase query, acceptable given store already populated by usePlans"

patterns-established:
  - "Client-side derived state hook: import from usePlansStore + useAuthStore, filter/sort/slice, return typed array — no useEffect or fetch"
  - "formatEventCardDate relative-time ladder: now / in Xmin / in Xh / tomorrow / in X days — matches PlanCard.tsx formatPlanTime pattern"

requirements-completed: [EVT-01, EVT-02, EVT-03, EVT-04, EVT-05, EVT-06]

# Metrics
duration: 12min
completed: 2026-04-11
---

# Phase 04 Plan 01: Data Foundation Summary

**DB migration + TypeScript types for cover_image_url, formatEventCardDate utility, and useUpcomingEvents client-side filter hook over Zustand store**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-11T18:49:18Z
- **Completed:** 2026-04-11T19:01:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created migration 0013_cover_image_url.sql adding nullable cover_image_url column to plans table
- Extended database.ts (Row/Insert/Update) and plans.ts (Plan interface) with cover_image_url; forwarded in usePlans assembly step
- Created formatEventCardDate utility producing composite "Mon 15, Aug · in 2 days" strings with middle dot separator (D-18)
- Created useUpcomingEvents hook filtering store plans by creator-or-going (D-06), future-only (D-07), sorted ascending, capped at 5 (D-08)

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration + TypeScript type updates** - `10b7024` (feat)
2. **Task 2: formatEventCardDate utility + useUpcomingEvents hook** - `cccf39d` (feat)

## Files Created/Modified

- `supabase/migrations/0013_cover_image_url.sql` - ALTER TABLE plans ADD COLUMN IF NOT EXISTS cover_image_url text
- `src/types/database.ts` - cover_image_url added to plans Row/Insert/Update blocks
- `src/types/plans.ts` - cover_image_url?: string | null added to Plan interface
- `src/hooks/usePlans.ts` - cover_image_url forwarded in map assembly step
- `src/lib/formatEventCardDate.ts` - Date format utility for EventCard display
- `src/hooks/useUpcomingEvents.ts` - Client-side filter hook for upcoming events

## Decisions Made

- cover_image_url is nullable text — existing plans retain null until images are uploaded in a future plan
- useUpcomingEvents is a pure derived-state hook (no useEffect, no fetch) — reads from the already-populated Zustand store, no extra network round-trip needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration must be applied to Supabase when next running `supabase db push` or `supabase migration up`.

## Known Stubs

None - no stubs introduced. useUpcomingEvents returns real filtered data from the store; formatEventCardDate produces real output strings.

## Next Phase Readiness

- All type contracts are in place: Plans 02-04 can import useUpcomingEvents and formatEventCardDate without scavenger hunts
- cover_image_url flows end-to-end from DB through types to hook; EventCard in Plan 02 can render it
- TypeScript is clean (npx tsc --noEmit exits 0)

---
*Phase: 04-upcoming-events-section*
*Completed: 2026-04-11*
