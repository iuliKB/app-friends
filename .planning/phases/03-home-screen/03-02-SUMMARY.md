---
phase: 03-home-screen
plan: 02
subsystem: ui
tags: [supabase, realtime, websocket, react-native, expo, zustand]

# Dependency graph
requires:
  - phase: 03-home-screen plan 01
    provides: useHomeScreen hook with fetchAllFriends, Zustand store, friend grid UI
provides:
  - Supabase Realtime subscription on statuses table filtered to friend user_ids
  - Automatic re-fetch on any friend status change event
  - Channel cleanup on component unmount (no WebSocket leak)
affects: [home-screen, realtime, status-updates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single named channel ('home-statuses') for all friends — budget-conscious for Supabase free-tier 200 concurrent connection limit"
    - "subscribeRealtime called inside fetchAllFriends so filter stays current with latest friend list"
    - "channelRef pattern for tracking and tearing down RealtimeChannel across renders"

key-files:
  created: []
  modified:
    - src/hooks/useHomeScreen.ts

key-decisions:
  - "Single channel named 'home-statuses' with user_id=in.(...) filter — not one channel per friend"
  - "Re-subscribe on every fetchAllFriends call so filter reflects current friend list after any friend add/remove"
  - "On any realtime event call fetchAllFriends() (full re-fetch, not surgical patch) — simpler, avoids complex state diffing"

patterns-established:
  - "RealtimeChannel stored in useRef to persist across renders without triggering re-renders"
  - "Always removeChannel before creating new one to prevent connection leak on re-subscribe"

requirements-completed: [HOME-04]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 3 Plan 02: Realtime Subscription Summary

**Single filtered Supabase Realtime channel on statuses table triggers full re-fetch on any friend status change, with cleanup on unmount**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-18T00:00:00Z
- **Completed:** 2026-03-18T00:03:00Z
- **Tasks:** 1 of 2 (Task 2 is human-verify checkpoint)
- **Files modified:** 1

## Accomplishments
- Added `channelRef` to track active RealtimeChannel without causing re-renders
- Implemented `subscribeRealtime(friendIds)` that creates a single filtered channel on `statuses` table
- Wired `subscribeRealtime` inside `fetchAllFriends` so the filter is always current with the latest friend list
- Updated `useEffect` cleanup to call `supabase.removeChannel` on unmount (prevents WebSocket leak)
- TypeScript compiles with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Realtime subscription to useHomeScreen hook** - `6059da7` (feat)

## Files Created/Modified
- `src/hooks/useHomeScreen.ts` - Added channelRef, subscribeRealtime function, cleanup in useEffect

## Decisions Made
- Single channel `'home-statuses'` with `user_id=in.(...)` filter — one channel for all friends, not one per friend, to stay within Supabase free-tier 200 concurrent connection limit
- Full re-fetch on any event via `fetchAllFriends()` — simpler than surgical state patching, avoids stale data edge cases
- `subscribeRealtime` called inside `fetchAllFriends` after `setFriends` so re-subscription always uses the latest friend IDs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete Phase 3 home screen ready: Zustand cache, friend grid, two-section layout, pull-to-refresh, FAB, and Realtime updates
- Awaiting human verification (Task 2 checkpoint) to confirm end-to-end flow on device
- Phase 4 (Plans feature) can proceed after checkpoint approval

## Self-Check: PASSED
- `src/hooks/useHomeScreen.ts` exists
- `03-02-SUMMARY.md` exists
- Commit `6059da7` exists

---
*Phase: 03-home-screen*
*Completed: 2026-03-18*
