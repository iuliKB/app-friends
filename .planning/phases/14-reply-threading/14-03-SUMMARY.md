---
phase: 14-reply-threading
plan: 03
subsystem: hooks/chat
tags: [hook, realtime, soft-delete, optimistic-update, typescript]
dependency_graph:
  requires: [14-01, 14-02]
  provides: [sendMessage-with-replyToId, deleteMessage, realtime-UPDATE-listener]
  affects: [src/hooks/useChatRoom.ts]
tech_stack:
  added: []
  patterns: [optimistic-update-rollback, Supabase Realtime chained .on(), Supabase UPDATE with sender_id guard]
key_files:
  created: []
  modified:
    - src/hooks/useChatRoom.ts
decisions:
  - "body: null cast to any in Supabase .update() call — generated types mark body as non-nullable but DB column is nullable since migration 0018; cast is the established project pattern (same as row cast to any at mapping site, per Phase 12 decision)"
  - "deleteMessage stashes both originalBody and originalMessageType (not just body) — ensures full rollback fidelity if message_type was not 'text' (e.g. image message)"
  - "Realtime UPDATE handler updates body and message_type only — sufficient for soft-delete propagation; other fields (sender_id, created_at) are immutable"
metrics:
  duration: ~5 minutes
  completed: 2026-04-21
  tasks_completed: 2
  files_changed: 1
---

# Phase 14 Plan 03: useChatRoom Hook Extension Summary

**One-liner:** useChatRoom extended with replyToId param in sendMessage (inserts reply_to_message_id into DB), new deleteMessage with optimistic update + rollback, and a chained Realtime UPDATE listener for soft-delete propagation to all open sessions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend sendMessage with replyToId and add deleteMessage | f2069cd | src/hooks/useChatRoom.ts |
| 2 | Add Realtime UPDATE listener for soft-delete propagation | 1ceafee | src/hooks/useChatRoom.ts |

## Verification Results

1. `npx tsc --noEmit 2>&1 | grep "useChatRoom.ts"` — empty (no errors in this file) — PASS
2. `grep "replyToId" src/hooks/useChatRoom.ts` — shows param in interface, signature, optimistic field, and insert field — PASS
3. `grep "deleteMessage" src/hooks/useChatRoom.ts` — shows interface declaration, function declaration, and return object inclusion — PASS
4. `grep "event.*UPDATE" src/hooks/useChatRoom.ts` — shows chained UPDATE listener in subscribeRealtime — PASS
5. `grep "originalBody" src/hooks/useChatRoom.ts` — shows stash-before-optimistic-update pattern and rollback use — PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cast body: null to any in Supabase .update() call**
- **Found during:** Task 1 verification (`npx tsc --noEmit`)
- **Issue:** TS2322 — Supabase generated types mark `messages.body` as `string` (non-nullable), but the DB column is nullable since migration 0018. Passing `body: null` directly caused a type error.
- **Fix:** Added `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + `body: null as any` in the `.update()` call. This is the established project pattern (same any-cast used at the fetch mapping site per Phase 12 decision D-01).
- **Files modified:** src/hooks/useChatRoom.ts
- **Commit:** f2069cd

## Known Stubs

None. Both functions are fully implemented. ChatRoomScreen (Plan 04) will wire `deleteMessage` and pass `replyToId` — the pre-existing TS2739 error on ChatRoomScreen is tracked and expected (per 14-02 SUMMARY).

## Threat Flags

None — no new network endpoints or trust boundaries introduced. T-14-03-01 implemented (`.eq('sender_id', currentUserId)` client-side guard). T-14-03-02 accepted (FK violation returned as error). T-14-03-03 accepted (channel scoped to authenticated user). T-14-03-04 accepted (originalBody is function-scoped, discarded after call).

## Self-Check: PASSED

- [x] `src/hooks/useChatRoom.ts` contains `sendMessage(body: string, replyToId?: string)`
- [x] `src/hooks/useChatRoom.ts` contains `deleteMessage` function with optimistic update and rollback
- [x] `src/hooks/useChatRoom.ts` return object includes `deleteMessage`
- [x] `src/hooks/useChatRoom.ts` insert includes `reply_to_message_id: replyToId ?? null`
- [x] `src/hooks/useChatRoom.ts` contains `.on('postgres_changes', { event: 'UPDATE'...)`
- [x] Commit `f2069cd` exists in git log
- [x] Commit `1ceafee` exists in git log
