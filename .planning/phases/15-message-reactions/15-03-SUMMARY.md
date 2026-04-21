---
phase: 15-message-reactions
plan: "03"
subsystem: chat-hook
tags: [reactions, optimistic-update, realtime, useChatRoom, tdd]
dependency_graph:
  requires: [aggregateReactions utility (15-01), message_reactions DB table (migration 0018)]
  provides: [addReaction, removeReaction, hydrated reactions on messages, realtime reaction sync]
  affects: [src/screens/chat/ChatRoomScreen.tsx (Plan 04 will wire onReact prop)]
tech_stack:
  added: []
  patterns: [optimistic-update-with-snapshot-rollback, realtime-dedup-guard, PostgREST-nested-select]
key_files:
  created:
    - tests/unit/useChatRoom.reactions.test.ts
  modified:
    - src/hooks/useChatRoom.ts
    - src/types/database.ts
decisions:
  - "message_reactions added to database.ts manually — Supabase CLI not run, missing type caused TS2769 errors (Rule 1 fix)"
  - "Unit tests placed in tests/unit/ using npx tsx runner, not __tests__/jest — consistent with existing project pattern (no Jest installed)"
  - "Realtime listeners use no server-side filter (message_reactions has no room column); client-side msgIdx guard scopes to current room"
  - "Own-reaction dedup guard (if userId === currentUserId return) prevents double-count from Realtime echo of own optimistic updates"
metrics:
  duration: "4 minutes"
  completed: "2026-04-21T10:37:12Z"
  tasks_completed: 3
  files_modified: 2
  files_created: 1
---

# Phase 15 Plan 03: useChatRoom Reaction Data Layer Summary

Full reaction data layer in `useChatRoom.ts`: PostgREST nested select for initial load, `addReaction`/`removeReaction` with optimistic updates and silent rollback, and Realtime `message_reactions` INSERT/DELETE listeners with own-user dedup guards.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend fetchMessages with nested reactions select + aggregation | 0718ad0 | src/hooks/useChatRoom.ts |
| 2 | Implement addReaction and removeReaction with optimistic updates | 16731cd | src/hooks/useChatRoom.ts, src/types/database.ts, tests/unit/useChatRoom.reactions.test.ts |
| 3 | Extend Realtime subscription with message_reactions INSERT/DELETE listeners | f154616 | src/hooks/useChatRoom.ts |

## What Was Built

### Task 1: fetchMessages nested select

- Added `import { aggregateReactions } from '@/utils/aggregateReactions'`
- Changed `.select('*')` to `.select('*, reactions:message_reactions(emoji, user_id)')` in the fetchMessages query
- Added `reactions: aggregateReactions((row.reactions as ...) ?? [], currentUserId)` to the enrichMessage call
- Every `MessageWithProfile` returned from `fetchMessages` now has a populated `reactions: MessageReaction[]` field

### Task 2: addReaction / removeReaction

- Updated `UseChatRoomResult` interface to include both functions
- `addReaction(messageId, emoji)`: auth guard → snapshot pre-tap state → optimistic update (remove old `reacted_by_me` reaction, add/increment new emoji) → DB delete-old + insert-new → silent rollback on error
- `removeReaction(messageId, emoji)`: auth guard → snapshot → optimistic decrement (filter pills at count=0) → DB DELETE → silent rollback on error
- Return statement updated: `{ messages, loading, error, sendMessage, deleteMessage, addReaction, removeReaction }`
- 12 unit tests added in `tests/unit/useChatRoom.reactions.test.ts` — all passing

### Task 3: Realtime listeners

- `handleReactionInsert` defined inside `subscribeRealtime()`: own-user dedup guard (`if incomingUserId === currentUserId return`), client-side scope guard (`if msgIdx === -1 return prev`), increments existing pill or adds new one
- `handleReactionDelete` defined inside `subscribeRealtime()`: own-user dedup guard, scope guard, decrements and filters at count=0
- Two `.on()` calls added to channel chain before `.subscribe()` for `message_reactions` INSERT and DELETE

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] message_reactions missing from database.ts generated types**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `supabase.from('message_reactions')` caused TS2769 — table not in generated Supabase type union. The `message_reactions` table was added in migration 0018 but the `database.ts` file was never regenerated.
- **Fix:** Manually added `message_reactions` entry to `database.ts` Tables section with correct Row/Insert/Update shapes matching the migration 0018 schema (message_id, user_id, emoji, created_at)
- **Files modified:** src/types/database.ts
- **Commit:** 16731cd

**2. [Rule 3 - Blocking] Jest not installed; tests placed in tests/unit/ instead of __tests__/hooks/**
- **Found during:** Task 2 test setup (consistent with Plan 01 deviation)
- **Issue:** Plan specified `__tests__/hooks/useChatRoom.reactions.test.ts` with `npx jest`, but no Jest is installed in the project. The established pattern uses `tests/unit/` with `npx tsx` and `node:assert`.
- **Fix:** Created test at `tests/unit/useChatRoom.reactions.test.ts` using the node:assert/npx tsx pattern. 12 tests covering all required behaviors.
- **Files modified:** tests/unit/useChatRoom.reactions.test.ts (created at adapted path)
- **Commit:** 16731cd

## Test Results

```
tests/unit/useChatRoom.reactions.test.ts — 12 passed, 0 failed
tests/unit/aggregateReactions.test.ts — 6 passed, 0 failed (pre-existing, still green)
```

## TypeScript Status

`npx tsc --noEmit` — 0 new errors. Pre-existing errors:
- `src/app/friends/[id].tsx` — 3 errors (pre-existing, unrelated to this plan)
- `src/screens/chat/ChatRoomScreen.tsx` — 1 error: missing `onReact` prop (expected; will be resolved in Plan 04)

## Known Stubs

None. `addReaction` and `removeReaction` are fully implemented. ChatRoomScreen prop wiring is deferred to Plan 04 by design — the interface enforces the missing prop at compile time, which is the intended contract.

## Threat Surface

All mitigations from the plan threat register are implemented:
- T-15-03-01/02: RLS INSERT policy enforces `user_id = auth.uid()` + `is_channel_member()` server-side — no client-side spoofing possible
- T-15-03-03: RLS DELETE policy `user_id = auth.uid()` + client `.eq('user_id', currentUserId)` defense-in-depth
- T-15-03-04: PRESET_EMOJIS constraint enforced at UI layer (Plan 02); parameterized Supabase SDK prevents SQL injection
- T-15-03-05: Client-side `if (msgIdx === -1) return prev` guard drops events for messages not in current room state

No new threat surface beyond what the plan's threat model covers.

## Self-Check: PASSED

- src/hooks/useChatRoom.ts: EXISTS, modified
- src/types/database.ts: EXISTS, modified (message_reactions added)
- tests/unit/useChatRoom.reactions.test.ts: EXISTS, 12 tests passing
- Commit 0718ad0: EXISTS (Task 1)
- Commit 16731cd: EXISTS (Task 2)
- Commit f154616: EXISTS (Task 3)
- `grep "reactions:message_reactions" src/hooks/useChatRoom.ts`: FOUND (line 141)
- `grep "addReaction\|removeReaction" return statement`: FOUND (line 526)
- `grep "handleReactionInsert\|handleReactionDelete" channel chain`: FOUND (lines 342-343)
- `npx tsc --noEmit`: 0 new errors
- All tests: PASS
