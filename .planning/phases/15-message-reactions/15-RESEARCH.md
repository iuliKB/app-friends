# Phase 15: Message Reactions - Research

**Researched:** 2026-04-21
**Domain:** React Native chat reactions — Supabase Realtime, optimistic UI, PostgREST nested queries
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The emoji tapback strip renders as a separate floating row above the existing Reply/Copy/Delete pill — two distinct visual elements within the same Modal. The pill from Phase 14 is not modified structurally; the emoji row is a new sibling positioned above it.
- **D-02:** When the context menu opens, already-reacted emojis in the strip appear highlighted (filled/tinted background) so the user can see which one they've reacted with at a glance. Tapping the highlighted emoji removes the reaction (toggle off). Tapping a different emoji removes the old reaction and adds the new one.
- **D-03:** One emoji per message per user — iMessage tapback model. Tapping a new emoji removes the previous reaction and adds the new one atomically. The schema allows multiple rows per user per message (composite PK includes emoji), but the UI enforces the single-reaction rule: before inserting a new reaction, delete any existing reaction for that user on that message.
- **D-04:** Each reacted emoji gets its own rounded pill showing emoji + count (e.g. ❤️ 2). The user's own reaction pill gets a filled/tinted background (accent tint) to match the highlighted strip state. Badges render as a horizontal row.
- **D-05:** The badge row appears below the bubble body as an inline sibling row, slightly offset to the bubble's side (right-aligned for own messages, left-aligned for others). No negative-margin overlap. Only rendered when at least one reaction exists on the message.
- **D-06:** Extend the existing Supabase realtime channel in `useChatRoom` to also listen for `message_reactions` INSERT and DELETE events. No separate subscription. On a reaction event, update the affected message's `reactions` array in local state.
- **D-07:** Reaction add/remove uses optimistic updates — the badge count updates immediately on tap, with a silent revert if the DB write fails. Matches the existing optimistic send pattern for messages.

### Claude's Discretion

- Exact tint color for highlighted emoji in strip and own-reaction badge (e.g., `COLORS.interactive.accent` with low opacity background, or `COLORS.surface.elevated` with accent border).
- Pill padding, font size, and spacing for the reaction badge row.
- Whether `addReaction`/`removeReaction` use direct `supabase.from('message_reactions')` calls or an RPC — prefer direct calls (no new SQL function needed).
- Exact realtime filter for `message_reactions` events (filter on channel via JOIN or store `dm_channel_id`/`group_channel_id` on the reactions table — prefer querying via the message's channel membership in the existing subscription filter).
- How to load initial reactions with messages: a separate aggregated query on mount, or include in the existing messages select (e.g., `reactions:message_reactions(emoji, user_id, count)` via PostgREST). Prefer whatever avoids N+1.

### Deferred Ideas (OUT OF SCOPE)

- Custom emoji / extended picker — not in scope; 6 preset emojis only
- Reaction details sheet (tap badge to see who reacted) — future phase
- Multiple emojis per user (WhatsApp-style) — deliberately excluded
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | User can react to any message with one of 6 preset emojis (tapback style) | EmojiStripRow in context Modal + `addReaction` in `useChatRoom` |
| CHAT-02 | User can remove their own reaction by tapping it again (toggle off) | `removeReaction` logic + badge pill onPress + optimistic update |
| CHAT-03 | Reaction counts display inline below the message bubble, grouped by emoji | ReactionBadgeRow below bubble body, populated from `message.reactions` |
</phase_requirements>

---

## Summary

Phase 15 adds emoji tapback reactions to the existing Campfire chat system. The schema (`message_reactions` table, composite PK, RLS policies) and the TypeScript type (`MessageReaction`, `Message.reactions?`) are both already in place from Phase 12 and the `chat.ts` types file. No DB migration is needed. The work is entirely in the application layer: loading initial reactions, exposing `addReaction`/`removeReaction` from `useChatRoom`, extending the existing Realtime subscription, and rendering two new UI sub-components inside `MessageBubble`.

The critical design question deferred from the v1.5 milestone planning — whether to use Postgres Changes on `message_reactions` or a different Realtime strategy — is answered by CONTEXT.md D-06: extend the existing Postgres Changes channel with a second `.on(...)` call for `message_reactions` INSERT and DELETE. The free-tier budget risk (STATE.md note "[v1.5]: Reactions Realtime strategy") is mitigated by scoping the listener to the existing per-room channel (no additional connection overhead) and filtering by `message_id` belonging to the room via PostgREST or by listening broadly and filtering client-side.

The initial reactions load question (also deferred) is answerable now: PostgREST supports nested selects (`reactions:message_reactions(emoji, user_id)`) on the existing `messages` query, avoiding an N+1 fetch. The result must be aggregated client-side into `MessageReaction[]` (group by emoji, count rows, set `reacted_by_me` where `user_id === currentUserId`).

**Primary recommendation:** Load initial reactions via PostgREST nested select on the existing messages query; extend the existing realtime channel with a second `.on()` for `message_reactions`; use direct `supabase.from()` calls (no RPC) for add/remove; implement optimistic updates matching the existing `pending` flag pattern.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Emoji strip UI (context menu) | Client (React Native) | — | Rendered inside existing Modal in `MessageBubble` |
| Reaction badge row UI | Client (React Native) | — | Inline below bubble body in `MessageBubble` |
| `addReaction` / `removeReaction` | Client hook (`useChatRoom`) | Database (RLS) | Direct Supabase calls; RLS enforces ownership and channel membership |
| Initial reactions loading | Client hook (`useChatRoom`) | Database | PostgREST nested select on mount |
| Realtime reaction sync | Client hook (`useChatRoom`) | Supabase Realtime | Extend existing channel with second `.on()` listener |
| One-emoji-per-user enforcement | Client hook (`useChatRoom`) | Database (composite PK) | Delete+insert pattern in hook; DB composite PK as safety net |
| Optimistic state management | Client hook (`useChatRoom`) | — | Matches existing `pending` flag pattern for messages |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | already installed | DB reads/writes, Realtime subscription | Project standard; existing `useChatRoom` already uses it |
| React Native core primitives | SDK 55 | `TouchableOpacity`, `View`, `Text`, `Modal`, `StyleSheet` | No third-party UI libs (project constraint) |

No new packages required for this phase. [VERIFIED: grep of package.json and CONTEXT.md canonical_refs]

### Supporting

None beyond what is already installed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `supabase.from()` insert/delete | Supabase RPC | No benefit for simple single-table writes; RPC adds SQL overhead with no atomicity gain here |
| PostgREST nested select for initial load | Separate `supabase.from('message_reactions').select(*)` per room | Separate query works but requires manual grouping; nested select collocates with the messages fetch already in flight |
| Client-side filtering of realtime events | Server-side filter on `message_id` | Server-side filter on a JOIN column is not directly supported by Postgres Changes filter syntax — client-side filtering of events by checking if the affected message belongs to the current room is the practical approach |

---

## Architecture Patterns

### System Architecture Diagram

```
Long-press gesture (MessageBubble)
         |
         v
  Modal opens (existing Phase 14 structure)
  ┌─────────────────────────────────────────┐
  │  EmojiStripRow (NEW — sibling above)    │
  │  [❤️][😂][😮][😢][👍][🔥]              │
  │  highlighted emoji = user's current     │
  ├─────────────────────────────────────────┤
  │  contextPill (Phase 14 — unchanged)     │
  │  [Reply] | [Copy] | [Delete?]           │
  └─────────────────────────────────────────┘
         |
    User taps emoji
         |
         v
  onReact(messageId, emoji) called
         |
    ┌────┴────────────────────┐
    │  Optimistic update      │
    │  setMessages(...) →     │
    │  reactions array mutated│
    └────┬────────────────────┘
         |
         v
  useChatRoom.addReaction(messageId, emoji)
  1. If user has existing reaction: DELETE from message_reactions
     WHERE message_id=? AND user_id=currentUser
  2. INSERT INTO message_reactions (message_id, user_id, emoji)
         |
    ┌────┴────────────────────┐
    │ DB write fails          │
    │ Silent revert: restore  │
    │ pre-tap reactions state │
    └─────────────────────────┘

Realtime path (parallel):
  Supabase Postgres Changes (existing channel)
    .on('postgres_changes', { table: 'message_reactions', event: 'INSERT' })
    .on('postgres_changes', { table: 'message_reactions', event: 'DELETE' })
         |
         v
  Handler: find message by message_id in local state
  → update reactions array (increment/decrement count)
  → own writes are deduped by optimistic update already in place

Initial load path:
  fetchMessages() → supabase.from('messages').select(`*, reactions:message_reactions(emoji, user_id)`)
         |
         v
  Client-side aggregation: group by emoji, count rows, set reacted_by_me
         |
         v
  MessageWithProfile.reactions = MessageReaction[]

Render path:
  ChatRoomScreen → FlatList → MessageBubble
    ├── ReactionBadgeRow (below bubble body, visible when reactions.length > 0)
    │     badge pill: emoji + count, own-reaction tint
    └── (long-press) → contextMenu Modal with EmojiStripRow above contextPill
```

### Recommended Project Structure

No new files needed. Changes are contained to:

```
src/
├── components/chat/
│   └── MessageBubble.tsx     # Add EmojiStripRow JSX var + ReactionBadgeRow JSX var; add onReact prop
├── hooks/
│   └── useChatRoom.ts        # Add addReaction/removeReaction; extend realtime; hydrate reactions on load
├── types/
│   └── chat.ts               # MessageReaction type + Message.reactions — already present, verify shape
└── screens/chat/
    └── ChatRoomScreen.tsx    # Pass onReact callback down to MessageBubble
```

### Pattern 1: PostgREST Nested Select for Initial Reactions

**What:** Include `message_reactions` rows as a nested array on each message in the initial fetch, then aggregate client-side.

**When to use:** When reactions are needed at the same time as messages and N+1 fetch is unacceptable.

**How the query changes in `fetchMessages()`:**

```typescript
// Source: VERIFIED via codebase inspection of useChatRoom.ts + Supabase PostgREST docs [CITED: supabase.com/docs/guides/database/joins-and-nesting]
const { data: rows, error: fetchError } = await supabase
  .from('messages')
  .select('*, reactions:message_reactions(emoji, user_id)')
  .eq(column, value!)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Client-side aggregation (in `enrichMessage` or after the map):**

```typescript
// Source: ASSUMED — standard groupBy pattern
function aggregateReactions(
  rawReactions: { emoji: string; user_id: string }[],
  currentUserId: string,
): MessageReaction[] {
  const map = new Map<string, { count: number; reacted_by_me: boolean }>();
  for (const r of rawReactions) {
    const entry = map.get(r.emoji) ?? { count: 0, reacted_by_me: false };
    entry.count += 1;
    if (r.user_id === currentUserId) entry.reacted_by_me = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.entries()).map(([emoji, { count, reacted_by_me }]) => ({
    emoji,
    count,
    reacted_by_me,
  }));
}
```

**TypeScript note:** `rows` from `supabase.from('messages').select('*, reactions:message_reactions(emoji, user_id)')` will have a `reactions` array on each row. The generated types in `database.ts` may not reflect the nested select shape — use the same `row as any` cast pattern that is already present in `useChatRoom.ts` (line 151: `eslint-disable @typescript-eslint/no-explicit-any`). This is an established project precedent. [VERIFIED: useChatRoom.ts line 151]

### Pattern 2: Realtime Extension — Second `.on()` on Existing Channel

**What:** Add a second `postgres_changes` listener to the existing channel object (before `.subscribe()`).

**When to use:** When the same room already has a channel — avoids a second connection.

**How it looks in `subscribeRealtime()`:**

```typescript
// Source: VERIFIED via useChatRoom.ts existing pattern (lines 199–281)
channelRef.current = supabase
  .channel(channelName)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, handleMessageInsert)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter }, handleMessageUpdate)
  // NEW: reaction listeners (no server-side filter — message_reactions has no plan_id/dm_channel_id column)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, handleReactionInsert)
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, handleReactionDelete)
  .subscribe();
```

**Client-side guard** (in both handlers): check that the incoming `message_id` exists in the current `messages` state array before mutating. This naturally scopes updates to the current room without a server-side filter.

```typescript
// Source: ASSUMED — standard guard pattern
function handleReactionInsert(payload: RealtimePostgresInsertPayload<...>) {
  const raw = payload.new;
  setMessages(prev => {
    const msgIdx = prev.findIndex(m => m.id === raw.message_id);
    if (msgIdx === -1) return prev; // not in this room
    // ... update reactions array
  });
}
```

**Free-tier budget note (from STATE.md):** The concern is 2M Realtime messages/month. Adding reaction listeners to an existing channel does not add a new connection — it adds event traffic. For groups of 3–15 people reacting to messages, this is negligible vs. the message insert traffic already flowing. No separate subscription means no extra connection counted against the 200 concurrent limit. [VERIFIED: STATE.md accumulated context note, ASSUMED: traffic estimate]

### Pattern 3: Optimistic Update for Reactions

**What:** Update `message.reactions` array in local state immediately on tap, revert silently on DB failure.

**Matches:** Existing `pending: true` optimistic send pattern in `useChatRoom`.

```typescript
// Source: VERIFIED — deleteMessage optimistic pattern in useChatRoom.ts lines 339–376 [VERIFIED: useChatRoom.ts]
async function addReaction(messageId: string, emoji: string): Promise<{ error: Error | null }> {
  // 1. Snapshot pre-tap state for rollback
  const preSnapshot = messages.find(m => m.id === messageId)?.reactions ?? [];

  // 2. Optimistic update — apply net result immediately
  setMessages(prev => prev.map(m => {
    if (m.id !== messageId) return m;
    const existing = m.reactions ?? [];
    // Remove any previous reaction by this user (one-emoji-per-user enforcement)
    const withoutOld = existing.map(r =>
      r.reacted_by_me ? { ...r, count: r.count - 1, reacted_by_me: false } : r
    ).filter(r => r.count > 0);
    // Add or increment new emoji
    const idx = withoutOld.findIndex(r => r.emoji === emoji);
    if (idx >= 0) {
      const updated = [...withoutOld];
      updated[idx] = { ...updated[idx]!, count: updated[idx]!.count + 1, reacted_by_me: true };
      return { ...m, reactions: updated };
    }
    return { ...m, reactions: [...withoutOld, { emoji, count: 1, reacted_by_me: true }] };
  }));

  // 3. DB write: delete old reaction (if any), insert new
  // Find the old emoji from pre-snapshot
  const oldReaction = preSnapshot.find(r => r.reacted_by_me);
  if (oldReaction) {
    await supabase.from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', currentUserId);
  }
  const { error } = await supabase.from('message_reactions')
    .insert({ message_id: messageId, user_id: currentUserId, emoji });

  if (error) {
    // 4. Silent rollback
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, reactions: preSnapshot } : m
    ));
    return { error };
  }
  return { error: null };
}
```

**Note on `currentUserId` access:** `useChatRoom` already has `currentUserId` in scope (line 25). The `messages` state is accessed via closure in `deleteMessage` (line 343) — same pattern is safe for reactions. [VERIFIED: useChatRoom.ts]

### Anti-Patterns to Avoid

- **Separate Realtime subscription for reactions:** Creates a second connection per room. Use `.on()` chaining on the existing channel. (STATE.md risk note)
- **N+1 reactions fetch:** Do not call `supabase.from('message_reactions').select(*)` separately per message. Use PostgREST nested select on the messages query.
- **RPC for add/remove:** No new SQL function needed. Direct `supabase.from('message_reactions').insert()` and `.delete()` are safe because RLS enforces `user_id = auth.uid()` on INSERT and DELETE. [VERIFIED: migration 0018 lines 215–232]
- **Server-side filter on `message_reactions` by room:** The `message_reactions` table has no `plan_id`/`dm_channel_id`/`group_channel_id` column — there is no direct column to filter on. Use client-side guard (check if `message_id` is in current messages array) instead of trying to construct a cross-table server filter. [VERIFIED: migration 0018 schema lines 77–83]
- **Raw hex values or raw pixel values:** ESLint `campfire/no-hardcoded-styles` is enforced at error severity. The `rgba(249, 115, 22, 0.20)` accent tint is the one accepted exception for derived alpha values (matching the QuotedBlock pattern in `MessageBubble.tsx` line 81). [VERIFIED: MessageBubble.tsx + PROJECT.md]
- **Passing `messages` array ref into `addReaction`:** Capture pre-tap state as a local variable at the moment of the call, not via a stale closure. The `deleteMessage` function in `useChatRoom` already does this correctly (line 343 `const original = messages.find(...)`). [VERIFIED: useChatRoom.ts]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Emoji rendering | Custom SVG/icon emoji | Plain Unicode `<Text>` | System emoji renders natively on iOS/Android; no library needed |
| Reaction ownership check | Client-side user_id comparison only | Supabase RLS INSERT policy (`user_id = auth.uid()`) | RLS is the security layer — client check is UI convenience only |
| Room-scoping for realtime events | Complex filter expression on `message_reactions` table | Client-side guard: check if `message_id` in current `messages` state | No suitable column exists for server-side filter; client guard is the correct pattern |
| Atomic swap (old reaction → new reaction) | Two separate async calls with gap | DELETE then INSERT in sequence within the same function | Composite PK `(message_id, user_id, emoji)` prevents duplicate inserts; DELETE + INSERT is safe and simple |

---

## Common Pitfalls

### Pitfall 1: Realtime dedup for own reactions

**What goes wrong:** When the current user taps a reaction, the optimistic update fires immediately. The Realtime INSERT event arrives ~100ms later and fires the `handleReactionInsert` handler — which increments the count a second time, creating a phantom double-count.

**Why it happens:** The same dedup problem exists for message sends but is solved by the `pending: true` / `tempId` pattern. Reactions don't have a `tempId` equivalent.

**How to avoid:** In `handleReactionInsert`, check `if (raw.user_id === currentUserId) return prev` (skip own inserts). The optimistic update already applied the correct state. Same guard in `handleReactionDelete` for own deletes.

**Warning signs:** Badge count shows "2" after a single tap on an empty reaction.

### Pitfall 2: Stale reactions after realtime DELETE event when user removes via badge tap

**What goes wrong:** User taps own badge pill → optimistic remove fires → DB DELETE fires → Realtime DELETE event arrives → `handleReactionDelete` tries to decrement again → count goes to -1 or the pill disappears then reappears as 0.

**How to avoid:** Same guard as Pitfall 1: in `handleReactionDelete`, skip if `raw.user_id === currentUserId`.

### Pitfall 3: TypeScript `any` cast for nested PostgREST select

**What goes wrong:** The Supabase generated types in `database.ts` do not include the `reactions` relationship. Accessing `row.reactions` will cause a TypeScript strict error.

**How to avoid:** Apply the same `row as any` cast pattern already established in `useChatRoom.ts` line 151. This is an accepted project precedent. [VERIFIED: useChatRoom.ts line 150–151]

### Pitfall 4: `contextPill` positioning clash with `emojiStripRow`

**What goes wrong:** The existing `pillY` calculation sets `top: pillY` on the `contextPill`. Adding the emoji strip above it without adjusting `pillY` causes overlap or the strip to render off-screen at the top.

**Root cause:** `pillY = Math.max(60, event.nativeEvent.pageY - 80)` (line 164 of `MessageBubble.tsx`) was computed for the pill alone. The emoji strip (~52pt) + gap (8pt) adds 60pt above it.

**How to avoid:** Compute `emojiStripTop = pillY - stripHeight - gap` where `stripHeight ≈ 52` and `gap = SPACING.sm (8)`. Ensure `emojiStripTop` is clamped to a safe minimum (e.g., `Math.max(SPACING.lg, ...)`) to prevent it rendering under the status bar.

**Warning signs:** Emoji strip visually overlaps the pill, or is cropped at the top of the screen.

### Pitfall 5: Badge row affects bubble layout in `ownContainer`

**What goes wrong:** The `ownContainer` uses `alignSelf: 'flex-end'` and `maxWidth: '75%'`. Adding a `ReactionBadgeRow` outside the `ownBubble` but inside `ownContainer` may exceed the 75% constraint or mis-align.

**How to avoid:** Render `ReactionBadgeRow` as a sibling to `ownBubble` within `ownContainer`, not inside it. Apply `alignSelf: 'flex-end'` on the badge row container for own messages (matching bubble alignment). Same sibling pattern for `othersContent` → sibling to `othersBubble`. [VERIFIED: MessageBubble.tsx structure lines 255–318]

### Pitfall 6: Missing `onReact` callback threading

**What goes wrong:** `ChatRoomScreen` calls `useChatRoom` but doesn't currently pass `addReaction`/`removeReaction` down. The `MessageBubble` props interface will need `onReact` added.

**How to avoid:** Plan must include: (1) `useChatRoom` returns `addReaction`, `removeReaction`; (2) `ChatRoomScreen` destructures them and passes `onReact` to `MessageBubble`; (3) `MessageBubbleProps` interface gains `onReact: (messageId: string, emoji: string) => void`. [VERIFIED: ChatRoomScreen.tsx line 51, MessageBubble.tsx interface lines 17–27]

---

## Code Examples

Verified patterns from codebase inspection:

### Existing optimistic rollback pattern (established precedent)

```typescript
// Source: useChatRoom.ts lines 339–376 [VERIFIED]
// Stash original before optimistic update, rollback on error
const original = messages.find((m) => m.id === messageId);
// ... optimistic setMessages ...
const { error: updateError } = await supabase.from(...).update(...);
if (updateError) {
  setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...original } : m));
}
```

### Existing realtime multi-listener pattern (established precedent)

```typescript
// Source: useChatRoom.ts lines 199–281 [VERIFIED]
// Multiple .on() calls on the same channel object, chained before .subscribe()
channelRef.current = supabase
  .channel(channelName)
  .on('postgres_changes', { event: 'INSERT', ... }, handler1)
  .on('postgres_changes', { event: 'UPDATE', ... }, handler2)
  .subscribe();
// Pattern: add .on() calls for message_reactions INSERT and DELETE here
```

### Existing `any` cast for DB row type mismatch

```typescript
// Source: useChatRoom.ts line 151 [VERIFIED]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enriched = (rows ?? []).map((row: any) => enrichMessage({ ... }));
// Same pattern required for nested reactions field on row
```

### Existing context menu Modal structure (integration point)

```typescript
// Source: MessageBubble.tsx lines 199–244 [VERIFIED]
const contextMenu = (
  <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
    <TouchableWithoutFeedback onPress={closeMenu}>
      <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
    </TouchableWithoutFeedback>
    {/* NEW: EmojiStripRow renders here, above contextPill */}
    <View style={[styles.emojiStrip, { top: pillY - STRIP_HEIGHT - SPACING.sm }]}>
      {/* 6 emoji buttons */}
    </View>
    <View style={[styles.contextPill, { top: pillY }]}>
      {/* existing pill actions */}
    </View>
  </Modal>
);
```

### Schema shape (verified)

```sql
-- Source: migration 0018_chat_v1_5.sql lines 77–83 [VERIFIED]
CREATE TABLE public.message_reactions (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);
-- RLS: SELECT requires channel membership (via messages join)
-- INSERT requires user_id = auth.uid() + channel membership
-- DELETE requires user_id = auth.uid() only
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate Supabase channel per subscription type | Chain multiple `.on()` listeners on same channel | Always supported | No extra connection cost for reaction events |
| N+1 fetch for related data | PostgREST nested select (`relations:table(cols)`) | Always supported | Single round trip for messages + reactions |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Client-side guard (check `message_id` in `messages` array) is sufficient to scope reaction realtime events to the current room | Architecture Patterns / Pattern 2 | Could receive spurious updates from other rooms if messages are shared (they are not — each message belongs to one room). Risk: negligible. |
| A2 | Traffic from reaction INSERT/DELETE Realtime events is negligible vs. 2M/month free-tier limit for groups of 3–15 | Architecture Patterns / Pattern 2 | If groups are larger or more active than expected, could hit limit sooner. Irrelevant for current 3–15 person scope. |
| A3 | `aggregateReactions()` client-side groupBy logic is correct — no server-side aggregation function exists or is needed | Architecture Patterns / Pattern 1 | If migration 0018 added an aggregation view or function, we should use it. Grep found no such view/function in the migrations. [VERIFIED: grep of 0018 found no aggregate view] |

---

## Open Questions

1. **Modal positioning with emoji strip: safe area on notched devices**
   - What we know: `pillY = Math.max(60, event.nativeEvent.pageY - 80)` gives pixels from top of screen. The strip renders at `pillY - stripHeight - SPACING.sm`.
   - What's unclear: On devices with dynamic islands or notches, `pillY - 60` could be negative if the user long-presses near the very top. The `Math.max(60, ...)` floor on `pillY` reduces but may not eliminate this.
   - Recommendation: Add a `Math.max(SPACING.xl + stripHeight + SPACING.sm, ...)` clamp on `emojiStripTop` to guarantee it never renders above the safe area. The planner should include this in the implementation note.

2. **`useChatRoom` `messages` state in `addReaction` closure**
   - What we know: `addReaction` needs to read `messages` to find the pre-tap snapshot. The `messages` state variable is in scope in the hook closure.
   - What's unclear: React state reads inside async functions can be stale in some patterns. The `deleteMessage` function already does `messages.find(...)` synchronously before any await (line 343) — same pattern is safe here.
   - Recommendation: Capture snapshot synchronously before first `await`, matching the established precedent. No issue.

---

## Environment Availability

Step 2.6: SKIPPED — no new external dependencies. This phase uses only packages already installed in the project.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (Expo managed, via `jest-expo`) |
| Config file | `jest.config.js` (if present) or `package.json` jest field |
| Quick run command | `npx jest --testPathPattern=reactions --passWithNoTests` |
| Full suite command | `npx jest --passWithNoTests` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | `addReaction` inserts correct row; optimistic update fires | unit | `npx jest --testPathPattern=useChatRoom --passWithNoTests` | Wave 0 |
| CHAT-02 | `removeReaction` / toggle-off path; badge disappears at count=0 | unit | `npx jest --testPathPattern=useChatRoom --passWithNoTests` | Wave 0 |
| CHAT-03 | `aggregateReactions` groups correctly; `reacted_by_me` flag set | unit | `npx jest --testPathPattern=reactions --passWithNoTests` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=reactions --passWithNoTests`
- **Per wave merge:** `npx jest --passWithNoTests`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `__tests__/hooks/useChatRoom.reactions.test.ts` — unit tests for `addReaction`, `removeReaction`, optimistic update, realtime handler dedup guards (Pitfall 1 & 2)
- [ ] `__tests__/utils/aggregateReactions.test.ts` — unit tests for the `aggregateReactions()` groupBy function (CHAT-03)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth is session-based; already enforced via Supabase Auth |
| V3 Session Management | no | No new session surfaces |
| V4 Access Control | yes | RLS: `message_reactions_insert_channel_member` enforces channel membership + `user_id = auth.uid()`; `message_reactions_delete_own` enforces ownership |
| V5 Input Validation | yes | Emoji is one of 6 known Unicode strings — validate client-side; no SQL injection risk via parameterized PostgREST SDK |
| V6 Cryptography | no | No new secrets or encryption |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reacting as another user | Spoofing | RLS INSERT policy: `user_id = auth.uid()` — cannot insert with a different user_id [VERIFIED: migration 0018 line 218] |
| Reacting to messages in channels the user is not a member of | Elevation of privilege | RLS INSERT policy checks `is_channel_member()` [VERIFIED: migration 0018 lines 215–228] |
| Deleting another user's reaction | Tampering | RLS DELETE policy: `user_id = auth.uid()` only [VERIFIED: migration 0018 lines 230–232] |
| Injecting arbitrary emoji strings | Tampering | Client enforces 6-emoji allowlist before insert; no SQL injection risk via Supabase SDK parameterized queries |

**Security note:** The RLS policies are already deployed in migration 0018. No new migration is required. The client-side 6-emoji validation is a UX guard only — security is fully covered by RLS. [VERIFIED: migration 0018]

---

## Sources

### Primary (HIGH confidence)

- `useChatRoom.ts` (verified in session) — existing realtime subscription pattern, optimistic update pattern, `messages` state access
- `MessageBubble.tsx` (verified in session) — existing Modal structure, `pillY` positioning, `contextPill` styles
- `src/types/chat.ts` (verified in session) — `MessageReaction` type, `Message.reactions?` placeholder
- `supabase/migrations/0018_chat_v1_5.sql` (verified in session) — `message_reactions` schema, composite PK, RLS policies
- `src/theme/spacing.ts`, `src/theme/radii.ts` (verified in session) — token values
- `15-CONTEXT.md` (verified in session) — all locked decisions D-01 through D-07
- `15-UI-SPEC.md` (verified in session) — full component spec, exact token usage, interaction contracts
- `ChatRoomScreen.tsx` (verified in session) — prop threading path, `useChatRoom` destructuring

### Secondary (MEDIUM confidence)

- `STATE.md` accumulated context — realtime budget concern, established project decisions
- `PROJECT.md` constraints section — no UI libraries, ESLint enforcement, FlatList requirement

### Tertiary (LOW confidence)

- None — all claims verified against codebase or official project docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing stack verified
- Architecture: HIGH — all patterns traced to verified codebase
- Pitfalls: HIGH — derived from direct code inspection of the files being modified
- Security: HIGH — RLS policies verified in migration 0018

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable codebase, no fast-moving external deps)
