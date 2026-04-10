---
phase: 01-push-infrastructure-dm-entry-point
plan: 09
subsystem: plans
tags: [plan-create, query-params, dm-entry, expo-router]
requires:
  - expo-router useLocalSearchParams
  - PlanCreateModal mounted at /plan-create
provides:
  - PlanCreateModal honors ?preselect_friend_id query param
  - long-press "Plan with..." entry point lands with target friend pre-selected
affects:
  - HomeFriendCard long-press action sheet (Plan 08) — now lands correctly
tech-stack:
  added: []
  patterns:
    - useLocalSearchParams for typed route params
    - useEffect dependency on route param so re-mount with new id reseeds picker
key-files:
  created: []
  modified:
    - src/screens/plans/PlanCreateModal.tsx
decisions:
  - D-06 — preselect_friend_id wins over the default all-Free-friends seeding when present
metrics:
  duration: ~3 minutes
  tasks-completed: 1
  files-modified: 1
  completed: 2026-04-06
requirements: [DM-01]
---

# Phase 01 Plan 09: PlanCreateModal preselect_friend_id Summary

PlanCreateModal now reads `preselect_friend_id` from `useLocalSearchParams` and seeds the friend picker with exactly that one friend when the param is present, otherwise preserves the existing all-Free-friends default.

## What Was Built

- Imported `useLocalSearchParams` alongside the existing `useRouter` from `expo-router`.
- Added a typed param read at the top of `PlanCreateModal()`:
  ```ts
  const { preselect_friend_id } = useLocalSearchParams<{ preselect_friend_id?: string }>();
  ```
- Extended the existing friends-loading `useEffect` with a conditional: if `preselect_friend_id` is set, seed `selectedFriendIds` with `new Set([preselect_friend_id])`; otherwise fall back to the all-Free-friends seeding that already existed.
- Added `preselect_friend_id` to the effect dependency array so route-param changes re-seed correctly.
- Suppressed `react-hooks/exhaustive-deps` for the unchanged `fetchFriends` reference (matches existing codebase pattern).

## Files Modified

- `src/screens/plans/PlanCreateModal.tsx` — 12 insertions, 4 deletions (3-line shape per D-06).

## Verification

- `npx tsc --noEmit` — passes (clean exit).
- `npx eslint src/screens/plans/PlanCreateModal.tsx --max-warnings 0` — passes (zero warnings).
- String requirement check (`useLocalSearchParams`, `preselect_friend_id`, `new Set([preselect_friend_id])`) — all present.
- Backwards compatibility: when the route is opened without the param, `preselect_friend_id` is `undefined`, the `else` branch runs, and the existing all-Free-friends seeding is byte-for-byte preserved.

## Decisions Made

- **D-06 (honored):** When `preselect_friend_id` is present, it wins over the default all-Free-friends seeding. The picker shows exactly one friend selected on mount; users can still toggle additional friends manually.
- Used `// eslint-disable-next-line react-hooks/exhaustive-deps` to keep `fetchFriends` out of the dependency array — matches the pre-existing pattern in this file (where the original effect had `[]`) and avoids re-fetch loops on hook return identity changes.

## Deviations from Plan

None — plan executed exactly as written. The 3-line additive shape was preserved (1 import addition, 1 const, 1 if/else inside the existing effect, plus the dep-array update).

## Commits

- `3a8ce14` — feat(01-09): support preselect_friend_id in PlanCreateModal

## Self-Check: PASSED

- `src/screens/plans/PlanCreateModal.tsx` — FOUND, contains `useLocalSearchParams`, `preselect_friend_id`, `new Set([preselect_friend_id])`.
- Commit `3a8ce14` — FOUND in `git log`.
- TypeScript and ESLint — both pass with zero errors / zero warnings.
