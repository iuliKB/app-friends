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

- **Duration:** ~30 min (including user manual DB push)
- **Started:** 2026-04-11T18:55:40Z
- **Completed:** 2026-04-11
- **Tasks:** 3 of 3 complete
- **Files modified:** 2

## Accomplishments

- Imported `UpcomingEventsSection` and inserted it into HomeScreen's ScrollView after the viewSwitcher View (D-09)
- Added `usePlans()` call in HomeScreen body to populate `usePlansStore` before UpcomingEventsSection mounts
- Added `NSPhotoLibraryUsageDescription` to `app.config.ts` ios.infoPlist block, unblocking Plan 04 image picker on iOS devices
- TypeScript compiles clean (tsc --noEmit exits 0)
- cover_image_url column applied to live Supabase plans table via `supabase db push` (migration 0013)
- Human visual verification approved: section header, empty state, and navigation confirmed working in Expo Go

## Task Commits

1. **Task 1: Wire UpcomingEventsSection into HomeScreen + add iOS permission** — `dbdab66` (feat)
2. **Task 2: Apply Supabase schema migration** — completed by user (`supabase db push` applied 0013_cover_image_url.sql)
3. **Task 3: Human verification checkpoint** — approved by user

**Plan metadata:** `56fa30f` (docs: complete plan — HomeScreen integration + checkpoint pending db push)

## Files Created/Modified

- `src/screens/home/HomeScreen.tsx` — Added usePlans import + call, UpcomingEventsSection import + JSX insertion below viewSwitcher
- `app.config.ts` — Added ios.infoPlist.NSPhotoLibraryUsageDescription

## Decisions Made

- `usePlans()` added directly in HomeScreen component body (not inside useHomeScreen hook) — keeps store population co-located with the section that consumes it, avoids coupling useHomeScreen to plans concerns
- `NSPhotoLibraryUsageDescription` string matches RESEARCH.md Pitfall 2 recommendation

## Deviations from Plan

None — Task 1 executed exactly as specified. Task 2 blocked on auth gate (not a code deviation).

## Issues Encountered

**Task 2 — Auth gate:** `supabase db push` required authenticated session. The agent could not run `supabase login` interactively, so the user ran `supabase db push` manually. This was anticipated in the plan and resolved immediately.

## Known Stubs

None — UpcomingEventsSection is fully wired. The section renders real data from usePlansStore (populated via usePlans).

## User Setup Required

None - all tasks complete. DB migration applied by user; no additional configuration required.

## Next Phase Readiness

- HomeScreen renders UpcomingEventsSection below the Radar/Cards area — visually verified
- cover_image_url column live in Supabase plans table — Plan 04 uploads will persist
- iOS photo library permission declared — Plan 04 (expo-image-picker) is fully unblocked
- All EVT-01 through EVT-06 requirements completed

---
*Phase: 04-upcoming-events-section*
*Completed: 2026-04-11*
