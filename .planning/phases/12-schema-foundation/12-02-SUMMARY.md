---
phase: 12-schema-foundation
plan: 02
subsystem: types
tags: [typescript, types, chat, nullability]
dependency_graph:
  requires:
    - 12-01 (migration 0018 — adds image_url, reply_to_message_id, message_type, poll_id columns)
  provides:
    - MessageType union type ('text' | 'image' | 'poll')
    - MessageReaction interface (emoji, count, reacted_by_me)
    - Message.body as string | null
    - Message.image_url, reply_to_message_id, message_type, poll_id fields
    - Message.reactions Phase 15 placeholder
    - Clean TypeScript compile (SC-3 met)
  affects:
    - src/types/chat.ts (Message interface extended)
    - src/hooks/useChatRoom.ts (row mapping + optimistic message updated)
tech_stack:
  added: []
  patterns:
    - Optional chaining / null coalescing for nullable DB columns at call sites
    - eslint-disable any cast for stale DB-generated types after migration
key_files:
  created: []
  modified:
    - src/types/chat.ts
    - src/hooks/useChatRoom.ts
decisions:
  - "D-01 reflected: body: string | null — image/poll messages have no body"
  - "database.ts not regenerated — row cast to any at mapping site; stale generated types lag behind 0018"
  - "MessageType imported at call site instead of inline import expression"
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_created: 0
  files_modified: 2
  completed_date: "2026-04-20"
---

# Phase 12 Plan 02: TypeScript Types — Chat Interface Extension Summary

**One-liner:** Extended Message interface with MessageType union, MessageReaction interface, nullable body, and four new 0018 columns; fixed useChatRoom.ts call sites so npx tsc --noEmit exits 0.

## What Was Built

### src/types/chat.ts — extended (38 lines)

**Added before Message interface:**
- `export type MessageType = 'text' | 'image' | 'poll'` — union type for message_type column (D-03)
- `export interface MessageReaction { emoji: string; count: number; reacted_by_me: boolean }` — Phase 15 client-computed reactions placeholder (D-09)

**Message interface changes:**
- `body: string` → `body: string | null` (D-01 — image/poll messages have no body)
- Added `image_url: string | null` — Phase 16 media field
- Added `reply_to_message_id: string | null` — Phase 14 threading field (FK ON DELETE SET NULL per D-07)
- Added `message_type: MessageType` — NOT NULL column with DEFAULT 'text' (D-04)
- Added `poll_id: string | null` — Phase 17 poll link field
- Added `reactions?: MessageReaction[]` — Phase 15 placeholder, optional (not returned by existing queries)

**MessageWithProfile and ChatListItem:** unchanged.

### src/hooks/useChatRoom.ts — two fixes

**Fix 1 — row mapping (line 149-163):**
The `.select('*')` query produces a type from `src/types/database.ts` which predates migration 0018 and does not include the four new columns. Row was cast to `any` (with eslint-disable comment) to allow accessing new columns. All four new fields mapped with `?? null` fallback for safe handling. `body` changed from `as string` to `as string | null`.

**Fix 2 — optimistic message literal (line 264-276):**
The `MessageWithProfile` literal for optimistic sends was missing the four required new fields. Added: `image_url: null`, `reply_to_message_id: null`, `message_type: 'text'`, `poll_id: null` — appropriate defaults for a text message sent via `sendMessage(body: string)`.

**Import update:** Added `MessageType` to the type import from `@/types/chat`.

## TypeScript Compile Result

`npx tsc --noEmit` exits 0 with no output. **SC-3 met.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale database.ts type does not include migration 0018 columns**
- **Found during:** Task 2 (tsc run)
- **Issue:** `src/types/database.ts` is the Supabase-generated types file and was not regenerated after migration 0018. The `select('*')` query in `useChatRoom.ts` produced a row type that had no `image_url`, `reply_to_message_id`, `message_type`, or `poll_id` properties, causing TS2339 errors.
- **Fix:** Cast `row` to `any` at the `.map()` call site with an eslint-disable comment. This is the standard pattern when generated DB types lag behind a migration — regenerating `database.ts` is a separate task (would require `supabase gen types`) and is out of scope for this plan.
- **Files modified:** `src/hooks/useChatRoom.ts`
- **Commit:** e7134a0

## Known Stubs

- `reactions?: MessageReaction[]` in Message interface — always undefined in existing queries; Phase 15 will wire the hook to populate this field from the `message_reactions` table.

## Threat Flags

No new network endpoints, auth paths, or file access patterns introduced. Type-layer change only.

## Self-Check: PASSED

- File modified: `/Users/iulian/Develop/campfire/src/types/chat.ts` — contains `image_url: string | null` ✓
- File modified: `/Users/iulian/Develop/campfire/src/hooks/useChatRoom.ts` — contains `message_type: 'text'` in optimistic literal ✓
- Commit 52a66d3 exists (Task 1) ✓
- Commit e7134a0 exists (Task 2) ✓
- `npx tsc --noEmit` exits 0 ✓
