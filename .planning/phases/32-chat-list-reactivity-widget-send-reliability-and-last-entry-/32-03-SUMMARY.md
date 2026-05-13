---
phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-
plan: 03
subsystem: realtime
tags: [chat, supabase, realtime, tanstack-query, reactivity, pub-sub]

requires:
  - phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre
    provides: realtimeBridge refcount registry; queryKeys.chat.list(userId) cache key
  - phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-
    plan: 01
    provides: useChatList on TanStack Query; queryKeys.chat.list(userId) consumer

provides:
  - "subscribeChatList(queryClient, userId): Unsubscribe — global postgres_changes listener on messages table, no scope filter, invalidates queryKeys.chat.list(userId) on every INSERT/UPDATE/DELETE"
  - "Refcounted channel chat-list-${userId}: two consumers of useChatList for the same userId share ONE Supabase channel"
  - "useChatList useEffect mount of subscribeChatList keyed on [queryClient, userId] with cleanup on unmount/userId change"
  - "Incoming-message reactivity: chat list updates within ~Realtime latency without pull-to-refresh (CONTEXT.md Success Criterion 2)"

affects: [32-04-send-reliability]

tech-stack:
  added: []
  patterns:
    - "Global over-permissive subscription (no filter) + membership-filtered SELECT: one channel invalidates; RLS-filtered refetch produces correct result"
    - "useEffect mount of realtimeBridge helper keyed on userId: same pattern as useChatRoom.ts:222-225 for subscribeChatRoom"

key-files:
  created: []
  modified:
    - src/lib/realtimeBridge.ts
    - src/lib/__tests__/realtimeBridge.test.ts
    - src/hooks/useChatList.ts
    - src/hooks/__tests__/useChatList.test.ts

key-decisions:
  - "Global listener (no filter) chosen over per-room subscriptions: Supabase Realtime postgres_changes supports only single eq filter; chat list spans 3 scope columns x N memberships — Cartesian product is inexpressible as one filter"
  - "Channel name chat-list-${userId} follows dash convention matching subscribeHabitCheckins / subscribePollVotes / subscribeHomeStatuses"
  - "Payload intentionally unused in handler: chat-list query is membership-filtered, re-running the canonical SELECT is cheaper and safer than attempting to splice a row whose scope is unknown to the handler"
  - "subscribeChatList placed between subscribePollVotes and subscribeChatRoom to keep simple-invalidate helpers grouped separately from the elaborate subscribeChatRoom/subscribeChatAux block"

patterns-established:
  - "subscribeChatList is the Realtime-echo backstop for Plan 32-04's explicit onSettled invalidates: both paths compose independently, providing belt-and-braces for own-sends AND incoming-message reactivity for other users' sends"

requirements-completed: []

duration: ~3min
completed: 2026-05-13
---

# Phase 32 Plan 03: Chat list reactivity (incoming message subscription) Summary

**Added `subscribeChatList` to realtimeBridge (global messages-table listener, no filter, refcounted) and mounted it from `useChatList` via `useEffect` keyed on `[queryClient, userId]`.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-13T14:16:04Z
- **Completed:** 2026-05-13T14:19:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `subscribeChatList(queryClient, userId)` exported from `realtimeBridge.ts`: opens one Supabase channel named `chat-list-${userId}` with a single `postgres_changes` listener (`event: '*'`, `table: 'messages'`, no filter); every INSERT/UPDATE/DELETE invalidates `queryKeys.chat.list(userId)`
- Refcounted: two consumers of `useChatList` for the same userId share ONE Supabase channel; the channel tears down only when all subscribers have unsubscribed
- `useChatList` mounts the subscription via `useEffect([queryClient, userId])` with the returned unsubscribe as the cleanup function; signed-out users are gated by `if (!userId) return`
- 5 new describe tests (7 including `.each` parameterization) in `realtimeBridge.test.ts` cover: channel name, no-filter assertion, refcount dedup, INSERT/UPDATE/DELETE each invalidate the correct key, teardown order, new channel on userId change
- `useChatList.test.ts` extended with `jest.mock('@/lib/realtimeBridge', ...)` so `subscribeChatList` resolves to a no-op in existing tests (Rule 2 — required for existing 10 tests to pass)

## subscribeChatList contract summary

| Property | Value |
|---|---|
| Channel name | `` `chat-list-${userId}` `` |
| Scope filter | NONE — global listener on `messages` table |
| Events | `*` (INSERT, UPDATE, DELETE) |
| Handler action | `void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) })` |
| Payload usage | Payload intentionally ignored — canonical SELECT is membership-filtered |
| Refcounting | Yes — same `registry` Map pattern as every other subscribe helper |
| Teardown | `supabase.removeChannel(channel)` when refCount reaches 0 |

## Task Commits

Each task was committed atomically following TDD RED/GREEN protocol:

1. **Task 2 RED: Write failing subscribeChatList tests** — `7816f17` (test)
2. **Task 1 GREEN: Add subscribeChatList to realtimeBridge** — `b5e6ebc` (feat)
3. **Task 3: Mount subscribeChatList from useChatList + fix test mock** — `d8b1882` (feat)

Note: Tasks 1 and 2 are the TDD pair (tests first, then implementation). Task 3 mounts the helper in the consuming hook.

## Files Created/Modified

- `src/lib/realtimeBridge.ts` — new `subscribeChatList` export (54 lines including JSDoc comment) inserted between `subscribePollVotes` and `ChatRoomFilter` type / `subscribeChatRoom` block
- `src/lib/__tests__/realtimeBridge.test.ts` — `subscribeChatList` added to imports; new `describe('realtimeBridge.subscribeChatList', ...)` block (74 lines) inserted after `subscribePollVotes` describe block
- `src/hooks/useChatList.ts` — added `useEffect` import (react), `useQueryClient` (tanstack), `subscribeChatList` (@/lib/realtimeBridge); added `const queryClient = useQueryClient()` and `useEffect` inside `useChatList()` body
- `src/hooks/__tests__/useChatList.test.ts` — added `jest.mock('@/lib/realtimeBridge', ...)` block with `subscribeChatList: jest.fn(() => jest.fn())`

## Test count delta

- `src/lib/__tests__/realtimeBridge.test.ts`: 25 → 32 (+7 new — 5 test cases, 2 from `.each` expansion)
- `src/hooks/__tests__/useChatList.test.ts`: 10 → 10 (0 net — mock added, all 10 existing tests pass)

Combined: +7

## Test verification (final)

```
$ npx jest src/lib/__tests__/realtimeBridge.test.ts src/hooks/__tests__/useChatList.test.ts --runInBand --no-coverage
Test Suites: 2 passed, 2 total
Tests:       42 passed, 42 total
```

## TypeScript verification

```
$ npx tsc --noEmit -p . 2>&1 | grep "src/lib/realtimeBridge.ts:\|src/hooks/useChatList.ts:"
# (no output — zero new errors in source files modified by this plan)
# Pre-existing 'Cannot use namespace jest as a value' errors in test files are
# unrelated to this plan and carry over from Phase 31 baseline.
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `useChatList.test.ts` needed `@/lib/realtimeBridge` mock**
- **Found during:** Task 3 (running `npx jest useChatList.test.ts` after adding the `useEffect` mount)
- **Issue:** `useChatList` now imports and calls `subscribeChatList` from `realtimeBridge`, which calls `supabase.channel(...)`. The test file only mocked `supabase.from`, not `supabase.channel`. All 10 existing tests failed with `TypeError: _supabase.supabase.channel is not a function`.
- **Fix:** Added `jest.mock('@/lib/realtimeBridge', ...)` with `subscribeChatList: jest.fn(() => jest.fn())` — same pattern as `useChatRoom.test.ts:80-86` (PATTERNS.md §8b explicitly describes this mock). The plan's own acceptance criteria mentioned this contingency: "if not [already mocked], the executor must add `subscribeChatList: jest.fn(() => jest.fn())` to the mock factory in the test file — see PATTERNS.md §8b."
- **Files modified:** `src/hooks/__tests__/useChatList.test.ts`
- **Committed in:** `d8b1882` (Task 3 commit)
- **Classification:** Rule 2 (missing critical test infrastructure required for correctness) — explicitly anticipated in the plan's AC; no architectural change.

**Total deviations:** 1 auto-fixed (1 test mock addition, anticipated by the plan's own AC)
**Impact on plan:** Additive only — existing 10 tests continue to pass; no behavior change to production code.

## Threat surface scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced beyond what the plan's `<threat_model>` already documented (T-32-06, T-32-07, T-32-08 — all `accept` dispositions). No additional threat flags.

## Self-Check: PASSED

- `src/lib/realtimeBridge.ts` exists with `export function subscribeChatList` at line 142
- `src/lib/__tests__/realtimeBridge.test.ts` exists with `describe('realtimeBridge.subscribeChatList'` at line 225
- `src/hooks/useChatList.ts` exists with `subscribeChatList(queryClient, userId)` at line 409
- `src/hooks/__tests__/useChatList.test.ts` exists with `subscribeChatList` mock
- Commit `7816f17` (RED) present in `git log`
- Commit `b5e6ebc` (GREEN) present in `git log`
- Commit `d8b1882` (Task 3) present in `git log`

---
*Phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-*
*Plan: 03 — Chat list reactivity (incoming message subscription)*
*Completed: 2026-05-13*
