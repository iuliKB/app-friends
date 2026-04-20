# Architecture Patterns — v1.5 Chat & Profile Integration

**Domain:** Chat feature enrichment + Profile rework on existing Campfire architecture
**Researched:** 2026-04-20
**Confidence:** HIGH (based on direct codebase inspection)

---

## Current Architecture Baseline (Verified)

### messages table (as of migration 0017)

```
messages
  id               uuid PK
  plan_id          uuid FK → plans (nullable)
  dm_channel_id    uuid FK → dm_channels (nullable)
  group_channel_id uuid FK → group_channels (nullable)  -- added 0017
  sender_id        uuid FK → auth.users
  body             text NOT NULL
  created_at       timestamptz
  CONSTRAINT: exactly one of the three channel FKs is non-null (integer sum = 1)
```

The `body NOT NULL` constraint is the critical gate. Every new column must be nullable or have a default; the constraint must not be tightened.

### Realtime subscription pattern

`useChatRoom` opens one `supabase.channel(channelName)` with a `postgres_changes` filter on `messages` for the specific channel column/value. The subscription listens for `INSERT` only. Any new column data (image_url, reply_to_message_id) that arrives via INSERT will flow through automatically — no subscription change needed for those columns.

Reactions are a separate table (not on `messages`), so they need their own Realtime subscription.

### FlatList contract

`ChatRoomScreen` renders an **inverted** FlatList. Index 0 = newest message at the bottom. `renderItem` receives `{ item, index }` — index arithmetic is already documented in the screen (`index + 1` is the visually older/above message). Any reply preview or reaction row must be rendered **inside** `renderItem` (i.e., within `MessageBubble` or a wrapper around it), not in a separate `FlatList`. ScrollView-inside-FlatList is never acceptable per project constraints.

---

## Feature 1: Message Reactions

### Schema decision: separate `message_reactions` table (not JSONB)

Rationale:
- JSONB reactions column on `messages` cannot be efficiently subscribed via Supabase Realtime (Realtime fires on row change but diff is the full JSONB blob, not individual reactions). A separate table lets each reaction INSERT/DELETE fire its own Realtime event.
- JSONB makes per-user uniqueness enforcement (one reaction type per user per message) complex and requires a trigger. A table with a composite PK handles it natively.
- Easier RLS: reactions inherit the same channel membership check as messages.

```sql
-- Migration 0018
CREATE TABLE public.message_reactions (
  message_id  uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       text NOT NULL,                          -- single emoji character
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)            -- one emoji type per user per message
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
```

### RLS design

```sql
-- SELECT: same channel member as the parent message
-- Use a SECURITY DEFINER helper to avoid correlated subquery on the RLS policy
CREATE OR REPLACE FUNCTION public.is_message_channel_member(p_message_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = p_message_id
    AND (
      (m.plan_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.plan_members WHERE plan_id = m.plan_id AND user_id = (SELECT auth.uid())
      ))
      OR (m.dm_channel_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.dm_channels WHERE id = m.dm_channel_id
          AND (user_a = (SELECT auth.uid()) OR user_b = (SELECT auth.uid()))
      ))
      OR (m.group_channel_id IS NOT NULL AND public.is_group_channel_member(m.group_channel_id))
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_message_channel_member(uuid) TO authenticated;

CREATE POLICY "reactions_select_channel_member"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (public.is_message_channel_member(message_id));

-- INSERT: sender must be own user AND must be channel member
CREATE POLICY "reactions_insert_own"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_message_channel_member(message_id)
  );

-- DELETE: own reactions only
CREATE POLICY "reactions_delete_own"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
```

### Realtime subscription

Add a second `.on('postgres_changes', { table: 'message_reactions', ... })` inside `useChatRoom`. The filter must target the channel indirectly — Supabase Realtime column filters only work on the subscribed table's own columns. Since `message_reactions` does not have a channel_id, filter on the client side:

```typescript
// In useChatRoom, second subscription on same channel object:
.on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload) => {
  // Filter client-side: only process reactions for messages in current messages[] array
  const reactionPayload = payload.new as { message_id: string; user_id: string; emoji: string };
  setMessages(prev => prev.map(m =>
    m.id === reactionPayload.message_id
      ? { ...m, reactions: updatedReactions(m.reactions, payload) }
      : m
  ));
})
```

`REPLICA IDENTITY FULL` must be set on `message_reactions` for DELETE events to carry the old row data.

### Data flow

1. Initial fetch: join `message_reactions` into the messages query using `.select('*, message_reactions(*)')` (Supabase PostgREST nested select).
2. Realtime: INSERT/DELETE events patch `messages` state in-place.
3. `MessageWithProfile` type gains `reactions: { emoji: string; user_id: string }[]`.

### New component: `ReactionBar`

Rendered below the bubble in `MessageBubble`. Shows grouped emoji counts (e.g., "👍 3"). Long-press on bubble opens `ReactionPicker` (a horizontal row of 6 preset emoji in a small popover, not a bottom sheet — bottom sheet is overkill for tapbacks).

```
MessageBubble
  bubble content (existing)
  ReactionBar          <- new, renders grouped reactions
ReactionPicker         <- new, absolute positioned popover shown on long-press
```

### Free-tier impact

`message_reactions` rows are tiny (~60 bytes each). For 50 active users each reacting to 20 messages/day = 1000 rows/day = ~365K rows/year ~22MB. Well within 500MB. Realtime events: reactions add ~2x message events in the worst case — stay within 2M/month.

---

## Feature 2: Media Sharing

### Schema decision: `image_url` nullable column on `messages`

Rationale:
- A separate media table adds a JOIN for every message fetch and a second RLS surface. The messages table already supports nullable channel FKs — a nullable `image_url` column follows the same pattern.
- The existing `body NOT NULL` constraint is the only concern. A message can have text, image, or both. For image-only messages, `body` should be set to `''` (empty string) rather than NULL, which satisfies NOT NULL without semantic change.
- Supabase Storage public URL is stored, not the raw file path, keeping the client simple.

```sql
-- Part of migration 0018
ALTER TABLE public.messages
  ADD COLUMN image_url text;                          -- nullable; NULL = text-only message
```

No constraint change needed — `body` stays NOT NULL; image-only messages send `body = ''`.

### Storage bucket

Name it `chat-media` (separate from `plan-covers` and `avatars` for access control clarity).

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Path convention: chat-media/{channel_type}/{channel_id}/{sender_id}/{uuid}.jpg
-- Upload policy: authenticated, path must start with sender's user_id segment
CREATE POLICY "chat_media_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[3] = (SELECT auth.uid())::text
  );

CREATE POLICY "chat_media_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[3] = (SELECT auth.uid())::text);

CREATE POLICY "chat_media_read_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'chat-media');
```

The `foldername` array is 1-indexed: index [1]=channel_type, [2]=channel_id, [3]=sender_id.

### Upload pattern

Follow the established `fetch().arrayBuffer()` pattern from plan covers (decision recorded in PROJECT.md). Do NOT use FormData + file:// URI.

```typescript
// In sendMessage extended to accept optional imageUri
const response = await fetch(imageUri);
const arrayBuffer = await response.arrayBuffer();
const { data: uploadData } = await supabase.storage
  .from('chat-media')
  .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
const publicUrl = supabase.storage.from('chat-media').getPublicUrl(uploadData.path).data.publicUrl;
// Then insert message with image_url = publicUrl
```

### Sending flow in SendBar

Add a camera/photo icon to `SendBar`. `AttachmentAction` union gains `'photo'`. `ChatRoomScreen.handleAttachmentAction` calls `ImagePicker.launchImageLibraryAsync` (already available via `expo-image-picker` used for plan covers and avatars) then passes the URI to an extended `sendMessage(body, imageUri?)`.

### Type updates

```typescript
// types/chat.ts
export interface Message {
  // ... existing fields
  image_url: string | null;        // new
}
```

### New component: `ChatImage`

Rendered inside `MessageBubble` when `message.image_url` is non-null. Uses `expo-image` (already in the project via plan covers) for caching. Tapping opens a full-screen modal (simple `Modal` with the image and a close button). No third-party lightbox — stay no-UI-library.

### Free-tier impact

Storage: 1GB limit. A 500KB compressed image per message x 500 messages/month = 250MB/month. Add client-side resize to max 1280px before upload using `expo-image-manipulator` (bundled in Expo managed workflow).

---

## Feature 3: Reply Threading

### Schema decision: `reply_to_message_id` FK + denormalized `reply_preview` on `messages`

Rationale:
- Query-on-demand (joining replied-to message at fetch time) means N+1 fetches if the last 50 messages include 50 replies, or requires a self-join that bloats every message row. Denormalizing a short preview string avoids this entirely.
- The preview is cosmetic (truncated sender + body, ~80 chars). If the original is deleted, the preview becomes a tombstone — that is acceptable.
- No full threading tree (no `parent_id` recursion). This is linear reply context (iMessage/Telegram pattern), not a Reddit-style thread.

```sql
-- Part of migration 0018
ALTER TABLE public.messages
  ADD COLUMN reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN reply_preview        text;               -- "Name: message text..." truncated at 80 chars
```

`ON DELETE SET NULL` preserves the reply bubble shell even when the parent is deleted, showing "Original message deleted."

### Setting reply_preview

Done client-side when the user selects "reply" — grab `senderName + ': ' + body.slice(0, 72)` from local state and pass it to `sendMessage`. No trigger needed.

### Rendering in FlatList

The reply preview is a quoted block above the bubble content, rendered inside `MessageBubble`:

```
MessageBubble (wrapper TouchableOpacity)
  ReplyPreviewBar    <- new; renders when message.reply_preview is non-null
    vertical accent line + truncated preview text
  bubble content (existing text / ChatImage)
  ReactionBar
```

`ReplyPreviewBar` scrolls to the referenced message when tapped: find the index of `reply_to_message_id` in the `messages` array and call `flatListRef.current?.scrollToIndex()`. Expose the `FlatList` ref from `ChatRoomScreen` and pass a `onReplyTap(messageId)` callback down through `MessageBubble`.

### Interaction pattern

Long-press on a bubble reveals a context menu (not a bottom sheet). The menu has: Reply, React, (for own messages) Delete. Keep this as an `Animated.View` absolutely positioned near the bubble — avoids any ScrollView-inside-FlatList issues.

### Type updates

```typescript
export interface Message {
  // ... existing fields
  image_url: string | null;
  reply_to_message_id: string | null;
  reply_preview: string | null;
}
```

### Extended sendMessage signature

```typescript
sendMessage: (body: string, options?: {
  imageUri?: string;
  replyToId?: string;
  replyPreview?: string;
}) => Promise<{ error: Error | null }>
```

---

## Feature 4: Polls

### Schema decision: separate `polls` + `poll_options` + `poll_votes` tables linked to channel

Rationale:
- Embedding polls as JSONB in messages makes vote updates require updating the message row, which triggers Realtime for all subscribers on every vote. Separate tables keep vote updates isolated.
- Separate tables allow Realtime subscriptions on `poll_votes` filtered by `poll_id`, giving live vote count updates without re-fetching the entire message list.
- The poll is surfaced in the chat via a special message row (`message_type = 'poll'`) that contains the `poll_id`. The FlatList renders a `PollCard` component instead of a text bubble.

```sql
-- Part of migration 0018
CREATE TYPE public.message_type AS ENUM ('text', 'poll');

ALTER TABLE public.messages
  ADD COLUMN message_type public.message_type NOT NULL DEFAULT 'text',
  ADD COLUMN poll_id      uuid;               -- FK added after polls table created

CREATE TABLE public.polls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   uuid NOT NULL,                -- denormalized channel reference for easy RLS
  channel_type text NOT NULL
    CHECK (channel_type IN ('plan', 'dm', 'group')),
  question     text NOT NULL,
  created_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  closes_at    timestamptz,                  -- NULL = open indefinitely
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.poll_options (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text     text NOT NULL,
  position smallint NOT NULL                 -- display order
);
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.poll_votes (
  poll_id    uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id  uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)             -- one vote per user per poll
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Add FK from messages to polls (after polls table exists)
ALTER TABLE public.messages
  ADD CONSTRAINT messages_poll_fk FOREIGN KEY (poll_id)
    REFERENCES public.polls(id) ON DELETE SET NULL;
```

Note: `message_type DEFAULT 'text'` means no migration concern for existing rows.

### RLS design for polls

```sql
-- Reusable helper: is_channel_member(channel_id, channel_type)
CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id uuid, p_channel_type text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE p_channel_type
    WHEN 'plan' THEN EXISTS (
      SELECT 1 FROM public.plan_members WHERE plan_id = p_channel_id AND user_id = (SELECT auth.uid())
    )
    WHEN 'dm' THEN EXISTS (
      SELECT 1 FROM public.dm_channels WHERE id = p_channel_id
        AND (user_a = (SELECT auth.uid()) OR user_b = (SELECT auth.uid()))
    )
    WHEN 'group' THEN public.is_group_channel_member(p_channel_id)
    ELSE false
  END;
$$;

CREATE POLICY "polls_select_member"
  ON public.polls FOR SELECT TO authenticated
  USING (public.is_channel_member(channel_id, channel_type));

CREATE POLICY "polls_insert_member"
  ON public.polls FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.is_channel_member(channel_id, channel_type)
  );

-- poll_options: readable by channel member; only creator inserts
CREATE POLICY "poll_options_select_member"
  ON public.poll_options FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.polls p WHERE p.id = poll_options.poll_id
      AND public.is_channel_member(p.channel_id, p.channel_type)
  ));

CREATE POLICY "poll_options_insert_creator"
  ON public.poll_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.polls p WHERE p.id = poll_options.poll_id
      AND p.created_by = (SELECT auth.uid())
  ));

-- poll_votes: channel members can see all votes; own vote only for insert/delete
CREATE POLICY "poll_votes_select_member"
  ON public.poll_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.polls p WHERE p.id = poll_votes.poll_id
      AND public.is_channel_member(p.channel_id, p.channel_type)
  ));

CREATE POLICY "poll_votes_insert_own"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "poll_votes_delete_own"
  ON public.poll_votes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
```

### Poll creation flow

`SendBar` already has 'poll' in `ACTIONS`. `ChatRoomScreen.handleAttachmentAction('poll')` currently shows "Coming Soon" — replace with a navigation push to `/chat/poll-create?channel_type=...&channel_id=...`. The create screen collects question + 2–4 options, calls the `create_poll` RPC, and navigates back.

```sql
CREATE OR REPLACE FUNCTION public.create_poll(
  p_channel_id   uuid,
  p_channel_type text,
  p_question     text,
  p_options      text[],
  p_closes_at    timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_poll_id  uuid;
  v_opt      text;
  v_pos      smallint := 1;
BEGIN
  INSERT INTO public.polls (channel_id, channel_type, question, created_by, closes_at)
  VALUES (p_channel_id, p_channel_type, p_question, auth.uid(), p_closes_at)
  RETURNING id INTO v_poll_id;

  FOREACH v_opt IN ARRAY p_options LOOP
    INSERT INTO public.poll_options (poll_id, text, position) VALUES (v_poll_id, v_opt, v_pos);
    v_pos := v_pos + 1;
  END LOOP;

  INSERT INTO public.messages (
    plan_id, dm_channel_id, group_channel_id,
    sender_id, body, message_type, poll_id
  ) VALUES (
    CASE WHEN p_channel_type = 'plan'  THEN p_channel_id ELSE NULL END,
    CASE WHEN p_channel_type = 'dm'    THEN p_channel_id ELSE NULL END,
    CASE WHEN p_channel_type = 'group' THEN p_channel_id ELSE NULL END,
    auth.uid(), '', 'poll', v_poll_id
  );

  RETURN v_poll_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_poll(uuid, text, text, text[], timestamptz) TO authenticated;
```

### Rendering in FlatList

`MessageBubble` renders a `PollCard` when `message.message_type === 'poll'`. `PollCard` fetches poll data from a `usePoll(pollId)` hook (initial fetch + `poll_votes` Realtime subscription). This avoids nesting FlatLists — `PollCard` renders options as a simple `View` containing `TouchableOpacity` rows (max 4 options, no virtualization needed).

---

## Feature 5: Profile Rework

### What to remove from ProfileScreen

The `YOUR STATUS` section contains `<MoodPicker />`. Per v1.5 goal, the status pill in the header is now the single source of truth (shipped in v1.3.5). Remove `YOUR STATUS` section header and `<MoodPicker />` from `profile.tsx`. The `MoodPicker` component itself stays — it is used by the status pill bottom sheet.

### What to add to ProfileScreen

Replace the removed status section with a consolidated `NOTIFICATIONS` section that surfaces the three existing toggles (plan invites, friend availability, morning prompt) under one header. This is a layout reorganization, not a data change.

Separate avatar/photo editing from the main edit screen. The pencil overlay currently navigates to `/profile/edit` which handles everything. For v1.5, the avatar tap opens a small action sheet (two options: Camera, Photo Library) without a full navigation push, using the existing `ImagePicker` flow already present in `EditProfileScreen`.

### Friend profile page: new modal route

Decision: **new modal route** at `/friends/[id]` (stack push from Squad → Friends tab, from HomeFriendCard, from birthday pages). A bottom sheet height would need ~80% screen to fit rich content (avatar, status, birthday, wish list, DM button), which is indistinguishable from a modal with worse gesture behavior.

```
src/app/friends/[id].tsx          <- new file
src/screens/friends/
  FriendProfileScreen.tsx         <- new screen component
```

### FriendProfileScreen content

```
AvatarCircle (large, 80px)
display_name + @username
EffectiveStatus badge (mood + context + liveness indicator)
Birthday row (if set): "April 20" with cake icon
"Send DM" button -> get_or_create_dm_channel + navigate to chat room
WishListSection (read-only; reuses useFriendWishList hook already present)
```

No schema changes needed. All data is available via existing RLS policies:
- `profiles`: `profiles_select_authenticated` allows any authenticated user to read
- `effective_status` view: already used by HomeFriendCard
- `wish_list_items`: `wish_list_items_select_friends` allows friends to read
- `get_or_create_dm_channel`: existing RPC

### Navigation entry points

1. Squad -> Friends tab: tap any `FriendRow` -> push `/friends/[id]`
2. Home Radar/Card view: long-press or secondary action on `HomeFriendCard`
3. Birthday group chat: tap participant name in `GroupParticipantsSheet`

---

## Component Inventory

### Modified components

| Component | Change |
|-----------|--------|
| `MessageBubble` | Add `ReplyPreviewBar`, `ReactionBar`, `PollCard` conditionals; add long-press `BubbleContextMenu` |
| `SendBar` | Add photo picker action; wire 'poll' action to navigation |
| `useChatRoom` | Extend `Message` type; extend `sendMessage` signature; add reactions Realtime subscription; join reactions in initial fetch |
| `types/chat.ts` | Add `image_url`, `reply_to_message_id`, `reply_preview`, `message_type`, `poll_id`, `reactions` to `Message` |
| `ChatRoomScreen` | Expose FlatList ref; add `onReplyTap` scroll handler; add poll creation navigation |
| `ProfileScreen` | Remove `MoodPicker` section; consolidate notification toggles under `NOTIFICATIONS` |

### New components

| Component | Purpose |
|-----------|---------|
| `ReactionBar` | Grouped emoji count display below bubble |
| `ReactionPicker` | Popover with 6 preset emoji on long-press |
| `ReplyPreviewBar` | Quoted context block inside bubble |
| `BubbleContextMenu` | Absolutely positioned long-press menu: Reply, React, (own) Delete |
| `ChatImage` | Inline image with full-screen tap-to-expand modal |
| `PollCard` | Renders inside MessageBubble for poll messages; uses `usePoll` |
| `PollCreateScreen` | `/chat/poll-create` — question + options form |
| `FriendProfileScreen` | `/friends/[id]` — rich friend profile modal |

### New hooks

| Hook | Purpose |
|------|---------|
| `usePoll(pollId)` | Fetch poll + options + votes; Realtime subscription on `poll_votes` |

---

## Migration Strategy (single migration 0018)

All schema changes ship in one migration. Order within the migration matters:

1. Add `is_message_channel_member(message_id)` SECURITY DEFINER helper
2. Add `is_channel_member(channel_id, channel_type)` SECURITY DEFINER helper
3. `ALTER TABLE messages ADD COLUMN image_url text`
4. `ALTER TABLE messages ADD COLUMN reply_to_message_id uuid REFERENCES messages(id) ON DELETE SET NULL`
5. `ALTER TABLE messages ADD COLUMN reply_preview text`
6. `CREATE TYPE message_type AS ENUM('text', 'poll')`
7. `ALTER TABLE messages ADD COLUMN message_type message_type NOT NULL DEFAULT 'text'`
8. `ALTER TABLE messages ADD COLUMN poll_id uuid` (FK added after polls table)
9. `CREATE TABLE polls` + RLS
10. `CREATE TABLE poll_options` + RLS
11. `CREATE TABLE poll_votes` + RLS
12. `ALTER TABLE messages ADD CONSTRAINT messages_poll_fk FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE SET NULL`
13. `CREATE TABLE message_reactions` + RLS
14. `ALTER TABLE message_reactions REPLICA IDENTITY FULL`
15. `CREATE FUNCTION create_poll(...)` RPC + GRANT
16. Storage: insert `chat-media` bucket + policies

---

## Build Order with Dependency Graph

```
Phase 1: Schema + Types (no UI, zero visual risk)
  - Migration 0018 (all columns + tables + helpers + RPC)
  - Update types/chat.ts (Message, MessageWithProfile)
  - Update useChatRoom initial fetch to join reactions + new columns
  - Extend sendMessage signature
  Safe to deploy independently. Additive only — existing messages unaffected.

Phase 2: Reply Threading
  Depends on: Phase 1 (reply_to_message_id, reply_preview in types)
  Delivers: ReplyPreviewBar, BubbleContextMenu (reply action), extended sendMessage
  Why first among UI features: purely additive inside MessageBubble; no new subscriptions

Phase 3: Reactions
  Depends on: Phase 1 (message_reactions table), Phase 2 (BubbleContextMenu exists)
  Delivers: ReactionBar, ReactionPicker, reactions Realtime subscription in useChatRoom
  Why after threading: BubbleContextMenu already built; React is another menu action

Phase 4: Media
  Depends on: Phase 1 (image_url column)
  Delivers: ChatImage, photo action in SendBar, upload path in sendMessage
  Why after reactions: independent; comes after UI patterns solidify

Phase 5: Polls
  Depends on: Phase 1 (polls tables, message_type enum, poll_id column), Phase 2-4 (patterns)
  Delivers: PollCreateScreen, PollCard, usePoll, create_poll RPC wired to SendBar
  Why last among chat features: new screen + new hook + RPC; most complex

Phase 6: Profile Rework
  Depends on: nothing (independent of all chat phases)
  Delivers: ProfileScreen layout cleanup, FriendProfileScreen route
  Can run in parallel with Phase 2-5 in a separate branch; serialized here for focus
```

**Ordering rationale:** Schema first prevents migration reruns mid-feature. Threading before reactions because `BubbleContextMenu` is needed by both — build it once, extend it. Media is independent but benefits from long-press pattern being settled. Polls last because `PollCreateScreen` is a full new navigation screen and `create_poll` is the most complex piece. Profile rework is orthogonal.

---

## Free-Tier Impact Summary

| Addition | Storage | DB rows/month | Realtime events/month |
|----------|---------|--------------|----------------------|
| message_reactions | ~22MB/year at heavy use | ~1K | ~2K |
| chat-media bucket | up to 250MB if unthrottled — enforce client resize | 0 extra | 0 |
| reply columns | 0 (part of messages rows) | 0 | 0 extra |
| polls tables | negligible | ~250 (polls + options + votes) | ~400 (votes Realtime) |
| FriendProfileScreen | 0 | 0 | 0 |

All within free tier (500MB DB, 1GB Storage, 2M Realtime/month) at 3–15 person group scale. Storage is the only meaningful risk if users share many large images — enforce client-side resize to max 1280px before upload.

---

## Critical Constraints Checklist

- No FlatList inside ScrollView: `PollCard` uses `View` + map for max 4 options; `ReactionBar` uses `View` + map for emoji groups
- No UI libraries: all new components use `StyleSheet` only
- No Redux/React Query: `usePoll` uses direct Supabase query + Realtime; state in local useState
- RLS on every new table: `message_reactions`, `polls`, `poll_options`, `poll_votes` all have RLS enabled + policies
- SECURITY DEFINER helpers prevent RLS recursion for cross-table membership checks
- UUIDs everywhere: all new tables use `gen_random_uuid()` PKs
- `body NOT NULL` respected: image-only messages send `body = ''`; poll messages send `body = ''`
- `fetch().arrayBuffer()` pattern for all Storage uploads (not FormData)
- Expo managed workflow: `expo-image-picker` and `expo-image-manipulator` are available without custom native modules

---

## Sources

- Direct codebase inspection: `src/hooks/useChatRoom.ts`, `src/types/chat.ts`, `src/components/chat/MessageBubble.tsx`, `src/components/chat/SendBar.tsx`, `src/screens/chat/ChatRoomScreen.tsx`, `src/app/(tabs)/profile.tsx`
- Direct codebase inspection: `supabase/migrations/0001_init.sql`, `0014_plan_covers_bucket.sql`, `0017_birthday_social_v1_4.sql`
- Project context: `.planning/PROJECT.md` (v1.5 goals, constraints, key decisions, free-tier budget)
