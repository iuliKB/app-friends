---
phase: 12-schema-foundation
fixed_at: 2026-04-20T00:00:00Z
review_path: .planning/phases/12-schema-foundation/12-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-04-20
**Source review:** .planning/phases/12-schema-foundation/12-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: `create_poll()` does not verify caller owns the target message

**Files modified:** `supabase/migrations/0018_chat_v1_5.sql`
**Commit:** 3c5b467
**Applied fix:** Added `v_sender uuid` to the DECLARE block. After the option-count guard, a SELECT fetches the message's `sender_id`; raises `'message not found'` if NULL and `'not the message owner'` if `v_sender <> v_caller`.

### WR-02: `poll_votes_insert_own` does not verify `option_id` belongs to the voted-on poll

**Files modified:** `supabase/migrations/0018_chat_v1_5.sql`
**Commit:** 3c5b467
**Applied fix:** Extended the INSERT policy `WITH CHECK` to include an `EXISTS` subquery confirming `po.id = poll_votes.option_id AND po.poll_id = poll_votes.poll_id` via `public.poll_options`.

### WR-03: `poll_votes_update_own` allows swapping `option_id` to one from a different poll

**Files modified:** `supabase/migrations/0018_chat_v1_5.sql`
**Commit:** 3c5b467
**Applied fix:** Extended the UPDATE policy `WITH CHECK` with the same `poll_options` cross-check as WR-02, while keeping the `USING` clause unchanged.

### WR-04: Storage policies allow any authenticated user to overwrite any other user's upload

**Files modified:** `supabase/migrations/0018_chat_v1_5.sql`
**Commit:** 3c5b467
**Applied fix:** Added `(storage.foldername(name))[1] = (SELECT auth.uid()::text)` to both the INSERT `WITH CHECK` and the UPDATE `USING` clause, restricting each user to their own UUID-prefixed folder.

### WR-05: `AsyncStorage` last-read key degrades to `"chat:last_read:undefined"` for group rooms

**Files modified:** `src/hooks/useChatRoom.ts`
**Commit:** 2110b63
**Applied fix:** Changed both occurrences of `(planId ?? dmChannelId)` to `(planId ?? dmChannelId ?? groupChannelId)` — once in `fetchMessages` (line 171) and once inside the realtime `setMessages` callback (line 254).

### WR-06: Realtime payload cast does not guard `message_type` fallback

**Files modified:** `src/hooks/useChatRoom.ts`
**Commit:** 2110b63
**Applied fix:** Replaced the direct `payload.new as Message` cast with an explicit field-by-field mapping from `payload.new as Record<string, unknown>`, mirroring the safe mapping already used in `fetchMessages`. `message_type` now falls back to `'text'` when absent in the payload.

---

_Fixed: 2026-04-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
