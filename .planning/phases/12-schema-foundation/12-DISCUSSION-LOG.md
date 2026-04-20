# Phase 12: Schema Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 12-schema-foundation
**Areas discussed:** body column for non-text msgs, message_type enum values, is_channel_member() scope, reply_to FK delete behavior

---

## body column for non-text msgs

| Option | Description | Selected |
|--------|-------------|----------|
| Nullable — NULL for non-text | Make body nullable. NULL means 'no text payload'. CHECK: body NOT NULL when message_type = 'text'. | ✓ |
| Empty string '' for non-text | Keep body NOT NULL, store '' for image/poll messages. | |
| Optional caption allowed | Nullable with optional caption for images; poll body always NULL. | |

**User's choice:** Nullable — NULL for non-text
**Notes:** Standard schema hygiene — '' is meaningless as a sentinel.

---

## message_type enum values

| Option | Description | Selected |
|--------|-------------|----------|
| 'text' \| 'image' \| 'poll' | 3 types. Reply is any message with reply_to_message_id set — not a distinct type. | ✓ |
| 'text' \| 'image' \| 'poll' \| 'reply' | 4 types. Explicit reply discriminant but redundant with reply_to_message_id. | |

**User's choice:** 'text' | 'image' | 'poll'
**Notes:** Phase 14 adds reply behavior without a new message_type — clean separation.

---

## is_channel_member() scope

| Option | Description | Selected |
|--------|-------------|----------|
| All 3 types — plan, dm, group | Single helper with channel_type discriminant. Reused across Phases 14–17. | ✓ |
| Group channels only | Narrowly scoped. Simpler but forces separate helpers per channel type later. | |

**User's choice:** All 3 types — plan, dm, group
**Notes:** Signature: `is_channel_member(p_channel_type text, p_channel_id uuid)`.

---

## reply_to FK delete behavior

| Option | Description | Selected |
|--------|-------------|----------|
| SET NULL — reply stays, preview gone | reply_to_message_id → NULL on delete. WhatsApp/Telegram pattern. | ✓ |
| RESTRICT — can't delete if replied to | Blocks deletions of messaged with replies. Blocks future delete feature. | |

**User's choice:** SET NULL — reply stays, preview gone
**Notes:** Enables future message deletion without breaking reply threads.

---

## Claude's Discretion

- Exact column ordering and index choices in migration
- Whether message_type is `text CHECK` or Postgres custom enum (prefer text CHECK)
- `create_poll()` RPC signature details — follow `create_expense()` pattern

## Deferred Ideas

- Reactions Realtime strategy (Postgres Changes vs Broadcast) — Phase 15
- Poll votes Realtime strategy — Phase 17
- Message deletion feature — V2
