---
phase: 04-upcoming-events-section
plan: "03"
subsystem: ui
tags: [react-native, homescreen, upcoming-events, supabase, expo, ios-permissions]

# Dependency graph
requires:
  - phase: 04-02
    provides: UpcomingEventsSection component, useUpcomingEvents hook, EventCard component
  - phase: 04-01
    provides: usePlansStore, cover_image_url migration file 0013
provides:
  - UpcomingEventsSection wired into HomeScreen ScrollView below Radar/Cards view
  - NSPhotoLibraryUsageDescription declared in app.config.ts (unblocks Plan 04 image picker)
  - usePlans() called in HomeScreen to populate store for UpcomingEventsSection
affects: [04-04, homescreen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "usePlans() called at HomeScreen level to pre-populate Zustand store for child sections"
    - "iOS infoPlist in app.config.ts for expo-image-picker permission"

key-files:
  created: []
  modified:
    - src/screens/home/HomeScreen.tsx
    - app.config.ts

key-decisions:
  - "usePlans() added to HomeScreen body (not useHomeScreen hook) — keeps store population close to the consumer section"
  - "NSPhotoLibraryUsageDescription added to ios.infoPlist in app.config.ts per RESEARCH.md Pitfall 2"

patterns-established:
  - "Section-level store hooks called at screen level to guarantee store hydration before child mounts"

requirements-completed: [EVT-01, EVT-02, EVT-03, EVT-04, EVT-05, EVT-06]

# Metrics
duration: 2min
completed: 2026-04-11
---

# Phase 04 Plan 03: HomeScreen Integration Summary

**UpcomingEventsSection wired into HomeScreen ScrollView below Radar/Cards switcher; iOS photo library permission declared in app.config.ts**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-11T18:55:40Z
- **Completed:** 2026-04-11T18:57:43Z
- **Tasks:** 1 of 3 complete (Task 2 blocked on auth gate; Task 3 is human checkpoint)
- **Files modified:** 2

## Accomplishments

- Imported `UpcomingEventsSection` and inserted it into HomeScreen's ScrollView after the viewSwitcher View (D-09)
- Added `usePlans()` call in HomeScreen body to populate `usePlansStore` before UpcomingEventsSection mounts
- Added `NSPhotoLibraryUsageDescription` to `app.config.ts` ios.infoPlist block, unblocking Plan 04 image picker on iOS devices
- TypeScript compiles clean (tsc --noEmit exits 0)

## Task Commits

1. **Task 1: Wire UpcomingEventsSection into HomeScreen + add iOS permission** — `dbdab66` (feat)
2. **Task 2: Apply Supabase schema migration** — BLOCKED (auth gate — requires `supabase login`)
3. **Task 3: Human verification checkpoint** — PENDING (awaiting Task 2 + human verify)

**Plan metadata:** see final commit hash after checkpoint approved

## Files Created/Modified

- `src/screens/home/HomeScreen.tsx` — Added usePlans import + call, UpcomingEventsSection import + JSX insertion below viewSwitcher
- `app.config.ts` — Added ios.infoPlist.NSPhotoLibraryUsageDescription

## Decisions Made

- `usePlans()` added directly in HomeScreen component body (not inside useHomeScreen hook) — keeps store population co-located with the section that consumes it, avoids coupling useHomeScreen to plans concerns
- `NSPhotoLibraryUsageDescription` string matches RESEARCH.md Pitfall 2 recommendation

## Deviations from Plan

None — Task 1 executed exactly as specified. Task 2 blocked on auth gate (not a code deviation).

## Issues Encountered

**Task 2 — Auth gate:** `supabase db push` requires authenticated session. The `supabase` CLI was not found on PATH; `npx supabase db push` found the CLI but requires `supabase login` or `SUPABASE_ACCESS_TOKEN`. Neither was available in `.env` or `.env.local`. Docker daemon also not running (rules out local Supabase). User must run `supabase login` and then `npx supabase db push` to apply migration 0013_cover_image_url.sql.

## Known Stubs

None — UpcomingEventsSection is fully wired. The section renders real data from usePlansStore (populated via usePlans).

## User Setup Required

**Task 2 requires manual action before the human-verify checkpoint can be tested:**

1. Run `supabase login` (opens browser for Supabase authentication)
2. Run `npx supabase db push` from the project root
3. Expected output: migration `0013_cover_image_url.sql` applied (or "No schema changes" if already applied)
4. Then proceed to the human-verify checkpoint steps

## Next Phase Readiness

- HomeScreen now renders UpcomingEventsSection below the Radar/Cards area
- iOS photo library permission declared — Plan 04 (image picker) is unblocked
- Pending: `supabase db push` to apply cover_image_url column to live DB (required for Plan 04 uploads to persist)
- Human verification checkpoint needed to confirm visual rendering in Expo Go

---
*Phase: 04-upcoming-events-section*
*Completed: 2026-04-11*
