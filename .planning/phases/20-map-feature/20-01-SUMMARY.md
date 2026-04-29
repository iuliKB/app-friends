---
phase: 20-map-feature
plan: "01"
subsystem: maps
tags: [maps, location, database, types, utilities]
dependency_graph:
  requires: []
  provides: [react-native-maps, expo-location, lat/lng DB columns, Plan types, maps utility]
  affects: [plans table, Plan interface, database.ts, usePlans, usePlanDetail]
tech_stack:
  added: [react-native-maps@1.27.2, expo-location@~55.1.8, react-native-map-link@^3.11.0]
  patterns: [Haversine formula, native deep links, Google Maps JSON style]
key_files:
  created:
    - supabase/migrations/0020_map_feature.sql
    - src/lib/maps.ts
  modified:
    - app.config.ts
    - package.json
    - src/types/plans.ts
    - src/types/database.ts
    - src/hooks/usePlanDetail.ts
    - src/hooks/usePlans.ts
decisions:
  - "androidGoogleMapsApiKey uses process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '' (placeholder — API key deferred)"
  - "No iosGoogleMapsApiKey — iOS uses Apple Maps (PROVIDER_DEFAULT); adding it breaks SDK 55 EAS builds"
  - "lat/lng columns are FLOAT8 NULL — no default, no backfill; existing rows unaffected"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-30"
  tasks_completed: 3
  files_changed: 8
---

# Phase 20 Plan 01: Map Foundation Summary

Map/location library install, Supabase migration, TypeScript types, and pure utility module — all foundation work with no UI.

## Tasks Completed

| Task | Name | Commit |
|------|------|--------|
| 1 | Install packages and update app.config.ts | 39a75f4 |
| 2 | Create migration 0020 and update TypeScript types | 937d193 |
| 3 | Create src/lib/maps.ts utility module | 6a0b45b |

## What Was Built

### Packages Installed
- `react-native-maps@1.27.2` — SDK 55 compatible
- `expo-location@~55.1.8` — SDK 55 compatible
- `react-native-map-link@^3.11.0` — native map deep links

### app.config.ts
Two new plugin entries added:
- `react-native-maps` with `androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || ''`
- `expo-location` with `locationWhenInUsePermission` string

No `iosGoogleMapsApiKey` — iOS uses Apple Maps via PROVIDER_DEFAULT.

### Migration 0020
Adds `latitude FLOAT8 NULL` and `longitude FLOAT8 NULL` to `public.plans`. Applied to remote Supabase via `db push`. Existing rows get NULL values — no crash, no map tile shown.

### TypeScript Types
- `src/types/plans.ts` — Plan interface now has `latitude: number | null` and `longitude: number | null`
- `src/types/database.ts` — plans Row/Insert/Update all updated with correct optionality
- `src/hooks/usePlanDetail.ts` — mapping updated to pass lat/lng through
- `src/hooks/usePlans.ts` — mapping updated to pass lat/lng through

### src/lib/maps.ts
Pure utility module (no React, no hooks):
- `haversineKm(lat1, lng1, lat2, lng2)` — Haversine distance in km for the 25 km Explore filter
- `openInMapsApp(lat, lng, label)` — native deep link: iOS `maps://`, Android `geo:` with canOpenURL guard
- `formatAddress(r, lat, lng)` — formats reverseGeocodeAsync result to "123 Main St, Toronto"
- `DARK_MAP_STYLE` — Google Maps JSON dark theme array for Android MapView

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing lat/lng in hook data mappers**
- **Found during:** Task 2 TypeScript verification
- **Issue:** usePlanDetail.ts and usePlans.ts explicitly mapped DB rows to PlanWithMembers objects but didn't include the new latitude/longitude fields, causing TS2739/TS2322 errors
- **Fix:** Added `latitude` and `longitude` field mappings in both hooks
- **Files modified:** src/hooks/usePlanDetail.ts, src/hooks/usePlans.ts
- **Commit:** 937d193

**2. [User Decision] API key placeholder instead of blocking checkpoint**
- **Found during:** Task 0 (checkpoint:human-action)
- **Issue:** Plan required Google Maps API key in .env before proceeding
- **User decision:** Skip key setup; use `process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || ''` as placeholder
- **Effect:** Android Google Maps tiles will not render in EAS builds until the key is added; iOS uses Apple Maps and is unaffected

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY \|\| ''` | app.config.ts | 38 | Google Maps API key deferred; Android maps tiles won't load until key is set in .env and EAS secrets |

## Threat Surface

No new threat surface beyond what was modeled in plan threat_model:
- T-20-02 mitigated: lat/lng columns inherit existing Supabase RLS on plans table — no additional migration needed
- T-20-03 mitigated: openInMapsApp uses canOpenURL guard; coordinates come from DB not user input

## Self-Check: PASSED

- supabase/migrations/0020_map_feature.sql — EXISTS
- src/lib/maps.ts — EXISTS
- app.config.ts — MODIFIED, EXPO_PUBLIC_GOOGLE_MAPS_KEY present
- src/types/plans.ts — latitude/longitude fields present
- src/types/database.ts — Row/Insert/Update updated
- Commits 39a75f4, 937d193, 6a0b45b — all present in git log
- npx tsc --noEmit — no new errors beyond 5+3 pre-existing ones
