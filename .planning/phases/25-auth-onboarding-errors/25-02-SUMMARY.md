---
phase: 25-auth-onboarding-errors
plan: "02"
subsystem: hooks
tags: [auth, hooks, error-handling, refetch, AUTH-03]
dependency_graph:
  requires: []
  provides: [useHomeScreen.refetch, useFriends.error, useFriends.refetch, useChatRoom.refetch]
  affects: [src/hooks/useHomeScreen.ts, src/hooks/useFriends.ts, src/hooks/useChatRoom.ts]
tech_stack:
  added: []
  patterns: [AUTH-03 standard hook shape {data, loading, error, refetch}]
key_files:
  modified:
    - src/hooks/useHomeScreen.ts
    - src/hooks/useFriends.ts
    - src/hooks/useChatRoom.ts
decisions:
  - "Additive-only changes — no existing callers required modification"
  - "useFriends error state scoped to fetchFriends only (not fetchPendingRequests) per plan spec"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-05-05"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Phase 25 Plan 02: Hook Standardisation (AUTH-03) Summary

**One-liner:** Added `refetch` aliases to useHomeScreen and useChatRoom, and top-level `error: string | null` state with `refetch` alias to useFriends — all additive, no callers broken.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add refetch alias to useHomeScreen | 30b576c | src/hooks/useHomeScreen.ts |
| 2 | Add error state and refetch alias to useFriends | a0d8c39 | src/hooks/useFriends.ts |
| 3 | Add refetch alias to useChatRoom | 413ad23 | src/hooks/useChatRoom.ts |

## Changes Made

### useHomeScreen.ts
- Added `refetch: fetchAllFriends` to return object
- `fetchAllFriends` original field preserved — existing callers unchanged

### useFriends.ts
- Added `const [error, setError] = useState<string | null>(null)` to state block
- Added `setError(null)` at top of `fetchFriends` (clears on each call)
- Added `setError(rpcError.message)` on RPC error path
- Added `setError(message)` in catch block
- Added `error` and `refetch: fetchFriends` to return object
- All 11 original return fields preserved

### useChatRoom.ts
- Added `refetch: fetchMessages` to return object
- `fetchMessages` is an existing internal async function at line 69 — now exposed for ErrorDisplay onRetry wiring in Plan 03/04

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — error state is local React state only; no new network endpoints or auth paths introduced.

## Self-Check: PASSED

- src/hooks/useHomeScreen.ts: FOUND, contains `refetch: fetchAllFriends`
- src/hooks/useFriends.ts: FOUND, contains `const [error, setError]`, `setError(null)`, `setError(rpcError.message)`, `refetch: fetchFriends`
- src/hooks/useChatRoom.ts: FOUND, contains `refetch: fetchMessages`
- Commits: 30b576c, a0d8c39, 413ad23 — all present in git log
