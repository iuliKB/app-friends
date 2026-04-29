---
phase: 20-map-feature
plan: "02"
subsystem: hooks/data-layer
tags: [map, lat-lng, data-plumbing, hooks]
completed: "2026-04-29"
duration_minutes: 1

dependency_graph:
  requires: [20-01]
  provides: [lat-lng-write-path, lat-lng-read-path]
  affects: [usePlans, usePlanDetail, createPlan, updatePlanDetails]

tech_stack:
  added: []
  patterns: [supabase-insert-with-optional-coords, typed-updates-object]

key_files:
  modified:
    - src/hooks/usePlans.ts
    - src/hooks/usePlanDetail.ts

decisions:
  - "location: string | null in CreatePlanInput — aligns with D-07 (location always comes with coords)"
  - "lat/lng passed as ?? null in insert — matches nullable column definition from migration 0018"

metrics:
  completed: "2026-04-29"
  tasks_completed: 2
  files_modified: 2
---

# Phase 20 Plan 02: Hook Data Plumbing (lat/lng) Summary

Wire latitude and longitude through the usePlans and usePlanDetail hooks — from input types to Supabase writes, and from Supabase rows to assembled PlanWithMembers objects.

## What Was Done

The 20-01 executor had already added lat/lng to the **assembly maps** (the read path) in both hooks as part of fixing a TypeScript deviation. This plan completed the remaining **write path** changes:

### Task 1: usePlans.ts

- `CreatePlanInput` interface: added `latitude: number | null` and `longitude: number | null`; changed `location: string` to `location: string | null` (D-07 alignment)
- `createPlan()` insert call: added `latitude: input.latitude ?? null` and `longitude: input.longitude ?? null`
- Assembly map already had lat/lng (done by 20-01 executor — documented as pre-completed)

### Task 2: usePlanDetail.ts

- `updatePlanDetails()` updates parameter type: added `latitude?: number | null` and `longitude?: number | null`
- Refetch assembly already had lat/lng (done by 20-01 executor — documented as pre-completed)

## Verification

```
grep -n "latitude|longitude" src/hooks/usePlans.ts
```
Output: 6 matches — interface (2), assembly (2), insert (2). All criteria met.

```
grep -n "latitude|longitude" src/hooks/usePlanDetail.ts
```
Output: 4 matches — updatePlanDetails signature (2), assembly (2). All criteria met.

TypeScript: no new errors introduced. Pre-existing errors in friends/[id].tsx, SendBar.tsx, useChatRoom.ts, usePoll.ts, profile.tsx remain unchanged.

## Deviations from Plan

**Partial pre-completion by 20-01 executor:**
- Assembly map lat/lng in usePlans.ts (lines 141-142) was already present — added by 20-01 when fixing TypeScript errors from the Plan type changes
- Refetch assembly lat/lng in usePlanDetail.ts (lines 91-92) was already present — same cause
- This plan completed only the write path: CreatePlanInput interface, insert call, and updatePlanDetails signature

No other deviations.

## Known Stubs

None — all lat/lng fields are wired to real DB columns from migration 0018.

## Threat Flags

None — no new network endpoints or auth paths introduced. Existing RLS on the plans table (T-20-06) covers lat/lng exposure.

## Self-Check: PASSED

- `src/hooks/usePlans.ts` modified and committed at f6dc97e
- `src/hooks/usePlanDetail.ts` modified and committed at 14219ee
- grep confirms 6+ matches in usePlans.ts, 4+ matches in usePlanDetail.ts
- TypeScript: no new errors
