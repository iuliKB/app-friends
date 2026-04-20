# Phase 12: Schema Foundation - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Migration 0018 delivers all database objects, RLS helpers, storage bucket, and TypeScript types required by Phases 13–17. Existing chat (plan, DM, group) must continue to work without change after migration applies.

**In scope:** `messages` column additions, `message_reactions` table, `polls`/`poll_options`/`poll_votes` tables, `is_channel_member()` and `create_poll()` SECURITY DEFINER RPCs, `chat-media` storage bucket, updated `src/types/chat.ts`.

**Out of scope:** Any UI, chat hooks, Realtime subscription changes, or reactions delivery strategy (deferred to Phase 15 planning).

</domain>

<decisions>
## Implementation Decisions

### messages.body — non-text message handling
- **D-01:** Make `body` nullable. Drop `NOT NULL`, add CHECK constraint: `body IS NOT NULL` when `message_type = 'text'`.
- **D-02:** Image messages have `body = NULL` (no caption). Poll messages have `body = NULL` (question lives in `polls` table).

### message_type enum
- **D-03:** Three values only: `'text' | 'image' | 'poll'`. Reply is NOT a distinct message type — a reply is any message (text or image) where `reply_to_message_id IS NOT NULL`. No schema change required in Phase 14 to add reply support.
- **D-04:** Add `message_type` column with DEFAULT `'text'` so existing rows are unaffected. NOT NULL.

### is_channel_member() scope
- **D-05:** The helper covers all 3 channel types (`'plan' | 'dm' | 'group'`). Signature: `is_channel_member(p_channel_type text, p_channel_id uuid) RETURNS boolean`. Single reusable helper for Phases 14–17 RLS policies.
- **D-06:** SECURITY DEFINER, `SET search_path = ''`, STABLE. Follows `is_not_wish_list_owner` pattern from 0017.

### reply_to_message_id FK delete behavior
- **D-07:** `ON DELETE SET NULL`. When the original message is deleted, replies remain in chat with `reply_to_message_id = NULL`. Quoted preview shows "Original message deleted". Telegram/WhatsApp pattern — deletions are not blocked by existing replies.

### Storage bucket
- **D-08:** `chat-media` bucket. Public read access. UUID-namespaced paths (mirrors `plan-covers` pattern from 0014). Bucket creation in migration matches pattern from `0014_plan_covers_bucket.sql`.

### Reactions Realtime strategy
- **D-09:** Deferred to Phase 15 planning start. `message_reactions` table is required per success criteria. Delivery strategy (Postgres Changes vs Broadcast) is a free-tier budget decision made when Phase 15 is implemented. (STATE.md flag preserved.)

### Claude's Discretion
- Exact column ordering and index choices in migration.
- Whether `message_type` is a Postgres `text CHECK` column or a custom enum type (either works; prefer `text CHECK` to avoid `ALTER TYPE` complexity during dev).
- `create_poll()` RPC signature details (column names, return type) — follow existing `create_expense()` pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing migrations (schema history)
- `supabase/migrations/0001_init.sql` — messages table original definition, base RLS policies
- `supabase/migrations/0017_birthday_social_v1_4.sql` — last migration; messages constraint update, group_channel_id addition, is_not_wish_list_owner SECURITY DEFINER pattern to follow

### Storage bucket pattern
- `supabase/migrations/0014_plan_covers_bucket.sql` — bucket creation pattern for chat-media

### TypeScript types to extend
- `src/types/chat.ts` — Message and MessageWithProfile interfaces; must be updated with new fields

### Project constraints
- `.planning/PROJECT.md` §Constraints — Expo Go managed workflow, no raw hex, TypeScript strict, RLS is security, UUIDs everywhere, FlatList for all lists

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/migrations/0017_birthday_social_v1_4.sql`: `is_not_wish_list_owner` — SECURITY DEFINER helper pattern to copy for `is_channel_member()`
- `supabase/migrations/0014_plan_covers_bucket.sql`: storage bucket creation — copy for `chat-media`
- `supabase/migrations/0015_iou_v1_4.sql`: `create_expense()` RPC — atomic RPC pattern to copy for `create_poll()`
- `src/types/chat.ts`: `Message` interface — extend directly

### Established Patterns
- Schema: `text CHECK (value IN (...))` over Postgres enum types — avoids `ALTER TYPE` friction
- FK helpers: SECURITY DEFINER + `SET search_path = ''` + STABLE on all cross-table auth helpers
- Constraint naming: `{table}_{description}` (e.g., `messages_exactly_one_channel`, `messages_body_required`)
- Bucket paths: `{user_uuid}/{resource_uuid}.{ext}` (plan-covers precedent)

### Integration Points
- `messages` table: 3 new columns (`image_url`, `reply_to_message_id`, `message_type`, `poll_id`) + body constraint change
- `messages_exactly_one_channel` constraint: no change needed — image/poll/reply messages still go to exactly one channel
- Existing messages SELECT RLS policy: `is_channel_member()` should be written so existing policy can optionally adopt it in a future migration

</code_context>

<specifics>
## Specific Ideas

- `is_channel_member()` signature: `(p_channel_type text, p_channel_id uuid)` — single function, channel type as discriminant
- reply_to_message_id FK: `ON DELETE SET NULL` — WhatsApp/Telegram pattern, original message deletions are unblocked
- message_type DEFAULT 'text' so existing rows are unaffected by the column addition

</specifics>

<deferred>
## Deferred Ideas

- Reactions Realtime delivery strategy (Postgres Changes vs Broadcast) — decided at Phase 15 planning start per STATE.md flag
- Poll votes Realtime strategy — decided at Phase 17 planning start per STATE.md flag
- Message deletion feature — V2; reply_to FK SET NULL ensures the schema supports it without blocking

</deferred>

---

*Phase: 12-schema-foundation*
*Context gathered: 2026-04-20*
