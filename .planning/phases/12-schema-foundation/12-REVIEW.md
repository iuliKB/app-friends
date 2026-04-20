---
phase: 12-schema-foundation
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - supabase/migrations/0018_chat_v1_5.sql
  - src/types/chat.ts
  - src/hooks/useChatRoom.ts
findings:
  critical: 0
  warning: 6
  info: 2
  total: 8
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-04-20
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files reviewed: the 0018 migration (schema DDL + RLS + RPCs + storage), the TypeScript
chat types, and the `useChatRoom` hook. The migration structure is sound — section ordering,
pitfall avoidances, and the `is_channel_member` SECURITY DEFINER pattern are all correct.

Six warnings and two informational items were found. The most significant are: the `create_poll()`
RPC does not assert caller ownership of the target message; the `poll_votes` INSERT/UPDATE policies
allow cross-poll `option_id` injection; and the `AsyncStorage` last-read key silently produces
`"chat:last_read:undefined"` for group-channel rooms. None are data-loss risks in isolation, but
the poll-vote issue is an integrity hole that should be fixed before polling goes live.

---

## Warnings

### WR-01: `create_poll()` does not verify caller owns the target message

**File:** `supabase/migrations/0018_chat_v1_5.sql:249`
**Issue:** The function inserts a poll for any `p_message_id` supplied by the caller without
checking that `auth.uid()` equals the message's `sender_id`. Any authenticated channel member can
attach a poll to a message they did not write, and then overwrite `messages.poll_id` for that row.

**Fix:**
```sql
-- After the auth.uid() NULL check, add:
DECLARE
  v_sender uuid;
BEGIN
  SELECT sender_id INTO v_sender
  FROM public.messages
  WHERE id = p_message_id;

  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'message not found';
  END IF;
  IF v_sender <> v_caller THEN
    RAISE EXCEPTION 'not the message owner';
  END IF;
```

---

### WR-02: `poll_votes_insert_own` does not verify `option_id` belongs to the voted-on poll

**File:** `supabase/migrations/0018_chat_v1_5.sql:176`
**Issue:** The INSERT policy only enforces `user_id = auth.uid()`. Nothing prevents a user from
supplying an `option_id` from a different poll while setting `poll_id` to a poll they are entitled
to vote in. The composite PK `(poll_id, user_id)` prevents a second row but does not validate the
`option_id` FK relationship at the policy level.

**Fix:**
```sql
CREATE POLICY "poll_votes_insert_own"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.poll_options po
      WHERE po.id   = poll_votes.option_id
        AND po.poll_id = poll_votes.poll_id
    )
  );
```

---

### WR-03: `poll_votes_update_own` allows swapping `option_id` to one from a different poll

**File:** `supabase/migrations/0018_chat_v1_5.sql:180`
**Issue:** The UPDATE policy checks only `user_id = auth.uid()` in both `USING` and `WITH CHECK`.
A user changing their vote can supply an `option_id` belonging to a completely unrelated poll,
corrupting vote counts.

**Fix:** Apply the same `poll_options` cross-check in `WITH CHECK` as shown in WR-02:
```sql
CREATE POLICY "poll_votes_update_own"
  ON public.poll_votes FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.poll_options po
      WHERE po.id    = poll_votes.option_id
        AND po.poll_id = poll_votes.poll_id
    )
  );
```

---

### WR-04: Storage policies allow any authenticated user to overwrite any other user's upload

**File:** `supabase/migrations/0018_chat_v1_5.sql:277`
**Issue:** The INSERT policy only checks `bucket_id = 'chat-media'`; the UPDATE policy only checks
`bucket_id = 'chat-media'`. No path-ownership check is applied. Any authenticated user can
overwrite a file uploaded by another user by targeting the same path.

**Fix:** Namespace uploads by user ID and restrict operations to that folder:
```sql
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Authenticated users can update chat media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
```
Upload paths on the client side should be prefixed with the user's UUID (e.g.
`chat-media/<user_id>/<filename>`).

---

### WR-05: `AsyncStorage` last-read key degrades to `"chat:last_read:undefined"` for group rooms

**File:** `src/hooks/useChatRoom.ts:171` (also line 243)
**Issue:** The key is built as `'chat:last_read:' + (planId ?? dmChannelId)`. When only
`groupChannelId` is set, both `planId` and `dmChannelId` are `undefined`, so the expression
evaluates to `undefined` and the key becomes the literal string `"chat:last_read:undefined"`. All
group-channel rooms collide on the same key. This silently means group rooms never correctly track
unread state.

**Fix:**
```ts
const channelKey = planId ?? dmChannelId ?? groupChannelId;
await AsyncStorage.setItem(
  'chat:last_read:' + channelKey,
  new Date().toISOString()
);
```
Apply the same three-way coalesce at both line 171 and line 243.

---

### WR-06: Realtime payload cast does not guard `message_type` fallback

**File:** `src/hooks/useChatRoom.ts:209`
**Issue:** Realtime INSERT payloads are cast directly as `const incoming = payload.new as Message`.
Unlike the `fetchMessages` path (line 161) which explicitly falls back with
`((row.message_type as string) ?? 'text') as MessageType`, the realtime path applies no fallback.
If a realtime payload arrives without `message_type` (e.g. from an older row or a schema lag),
`incoming.message_type` will be `undefined` at runtime despite the TypeScript type saying
`MessageType`.

**Fix:**
```ts
const raw = payload.new as Record<string, unknown>;
const incoming: Message = {
  id: raw.id as string,
  plan_id: raw.plan_id as string | null,
  dm_channel_id: raw.dm_channel_id as string | null,
  group_channel_id: raw.group_channel_id as string | null,
  sender_id: raw.sender_id as string,
  body: raw.body as string | null,
  created_at: raw.created_at as string,
  image_url: (raw.image_url as string | null) ?? null,
  reply_to_message_id: (raw.reply_to_message_id as string | null) ?? null,
  message_type: ((raw.message_type as string) ?? 'text') as MessageType,
  poll_id: (raw.poll_id as string | null) ?? null,
};
```
This mirrors the safe mapping already used in `fetchMessages`.

---

## Info

### IN-01: `polls` table has no `UNIQUE` constraint on `message_id`

**File:** `supabase/migrations/0018_chat_v1_5.sql:41`
**Issue:** Multiple poll rows can exist for the same message. `create_poll()` does not guard against
being called twice on the same `p_message_id`; a second call creates a second poll and silently
overwrites `messages.poll_id`, orphaning the first poll (its votes and options remain but become
unreachable via the message).

**Fix:**
```sql
CREATE TABLE public.polls (
  ...
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE UNIQUE,
  ...
);
-- or as a separate statement:
ALTER TABLE public.polls ADD CONSTRAINT polls_message_id_unique UNIQUE (message_id);
```

---

### IN-02: `ChatListItem.lastMessage` typed as `string` silently passes empty value for image/poll messages

**File:** `src/types/chat.ts:37`
**Issue:** `lastMessage: string` — with image and poll messages now possible, `body` is `null` for
those types. Any code that populates `lastMessage` from `message.body` will pass an empty or null
value to display components without a compile-time warning.

**Fix:** Either widen the type to signal the need for a fallback, or document the expected fallback
convention:
```ts
lastMessage: string; // callers must substitute e.g. "📷 Photo" / "📊 Poll" when body is null
```
Alternatively define a helper:
```ts
function previewText(msg: Message): string {
  if (msg.message_type === 'image') return 'Photo';
  if (msg.message_type === 'poll') return 'Poll';
  return msg.body ?? '';
}
```

---

_Reviewed: 2026-04-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
