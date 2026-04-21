# Phase 17: Polls - Research

**Researched:** 2026-04-21
**Domain:** React Native chat polls — creation sheet, voting UI, Supabase Realtime, optimistic updates
**Confidence:** HIGH

## Summary

Phase 17 adds polls to all chat channel types. The schema, RPC, TypeScript types, and most integration points are already in place from Phase 12. This phase is almost entirely UI and hook work: two new components (`PollCreationSheet`, `PollCard`), one new hook (`usePoll`), one extension to `useChatRoom` (add `sendPoll()` and `poll_votes` Realtime listeners), and wire-up in `ChatRoomScreen` and `MessageBubble`.

The Realtime strategy for poll votes is the one open decision inherited from STATE.md. Phase 15 resolved the analogous reactions decision by using `postgres_changes` on `message_reactions` directly — the same approach applies here for `poll_votes`. The free-tier risk is managed by client-side filtering (no server-side filter on the poll_votes listener, same as reactions) and the fact that optimistic updates for the voting user are already applied before the server event arrives.

The `create_poll()` SECURITY DEFINER RPC already exists and enforces 2–4 options, option count validation, and sender ownership. Votes are managed via direct Supabase `from('poll_votes').insert/delete` (with RLS enforcement), not via another RPC.

**Primary recommendation:** Wire `handleAttachmentAction('poll')` → modal state in `ChatRoomScreen`, build `PollCreationSheet` and `PollCard` following the exact patterns in `SendBar.tsx` (bottom sheet modal) and `MessageBubble.tsx` (message type branching), and extend `useChatRoom` with `sendPoll()` + `poll_votes` listeners mirroring the existing `sendImage()` and reaction listener patterns.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Poll creation flow:**
- D-01: Tapping "Poll" opens a bottom sheet modal over the chat — same presentation layer as the attachment action sheet. No separate screen navigation.
- D-02: Sheet contains: question text input ("Ask the group…" placeholder), option input rows ("Option 1"/"Option 2" etc.), "+ Add option" row, and Cancel / Send Poll buttons.
- D-03: Start with 2 pre-filled empty fields. "+ Add option" appears while fewer than 4 options. Each option row 3+ shows × remove button. Options 1 and 2 cannot be removed.
- D-04: Validation: question non-empty AND all visible option fields non-empty before Send Poll is enabled. Button is greyed until valid.

**Poll card visual design:**
- D-05: Full-width card, NOT a bubble. Spans full usable chat width with consistent horizontal padding.
- D-06: Card header: 📊 emoji + bold question text. Thin divider below header.
- D-07: Before voting: tappable option rows with unfilled radio circles (○) and label text only. No bars, no counts.
- D-08: After voting: each option shows radio circle (● filled accent for selected, ○ for others), label text, progress bar, vote count integer. Selected bar uses COLORS.interactive.accent; unselected use muted grey. Transition is optimistic.
- D-09: Card footer: "N votes" total. No "sent by X" needed.
- D-10: Reactions and long-press context menu apply. "Copy" hidden. "Reply" hidden. "Delete" visible only to poll creator (soft-delete to "Message deleted" placeholder).

**Voting behavior:**
- D-11: Tapping an option casts vote. Optimistic update — local state updates immediately, DB write async, silent revert on failure.
- D-12: Changing vote: tapping a different option swaps immediately. One DB operation: delete old poll_votes row, insert new one (or upsert — planner's discretion).
- D-13: Un-voting: tapping currently selected option removes vote. Card returns to unvoted display state for that user.
- D-14: Live vote count updates use the existing Supabase Realtime channel in `useChatRoom`, extended to listen for `poll_votes` INSERT and DELETE events. No separate subscription.

**Poll lifecycle:**
- D-15: Polls are always open — no expiry.
- D-16: Deletion: soft-delete only (message_type → 'deleted', body → NULL). polls/poll_options/poll_votes rows are NOT deleted.

### Claude's Discretion
- Exact progress bar height (4px per UI-SPEC), corner radius, and animation duration when switching unvoted → voted state.
- Whether `sendPoll()` calls `create_poll()` RPC directly or uses a thin wrapper in `useChatRoom`.
- Whether vote count shows before or after the bar.
- Keyboard avoidance behavior in the poll creation sheet.
- Whether to use `upsert` or delete+insert for changing a vote.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-09 | User can create a poll (2–4 options, single-choice) via the chat attachment menu | `PollCreationSheet` component + `sendPoll()` in `useChatRoom` calls existing `create_poll()` RPC; wire-up at `ChatRoomScreen.tsx:112` |
| CHAT-10 | User can vote on a poll; selection is shown; can change their vote | `usePoll` hook with optimistic update pattern (mirrors Phase 15 reactions); `PollCard` renders voted/unvoted state |
| CHAT-11 | Poll shows live vote counts visible to all participants | `poll_votes` INSERT/DELETE Postgres Changes listeners on the existing Supabase Realtime channel in `useChatRoom` |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Poll creation UI (sheet, validation) | Client (React Native) | — | Pure UI layer; all validation is client-side pre-submit |
| Create poll + insert message | API/DB (Supabase RPC) | Client (useChatRoom) | `create_poll()` SECURITY DEFINER enforces atomicity and auth |
| Vote / change vote / un-vote | Client (usePoll hook) | API/DB (poll_votes table) | Optimistic local update + async DB write; RLS enforces ownership |
| Live vote count distribution | API/DB (Supabase Realtime) | Client (useChatRoom) | Postgres Changes on poll_votes table; client-side counting |
| Poll card rendering | Client (PollCard component) | — | Stateless display driven by poll data from parent |
| Soft-delete | Client (useChatRoom.deleteMessage) | API/DB | Existing deleteMessage() already handles this; no new code needed |
| Message type branching | Client (MessageBubble) | — | Existing `message_type === 'poll'` branch needed |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native | 0.83.2 | All UI primitives (View, Modal, Animated, TextInput) | Already in project |
| @supabase/supabase-js | ^2.99.2 | DB reads (polls, poll_options, poll_votes), Realtime, RPC call | Already in project |
| @expo/vector-icons (Ionicons) | SDK 55 | Radio circles, add/remove icons, close icon | Already in project |

[VERIFIED: package.json]

### No New Dependencies

The UI-SPEC explicitly confirms: "No new dependencies introduced by this phase's UI. All components use existing React Native primitives and project theme tokens." [VERIFIED: 17-UI-SPEC.md]

The STATE.md note "[v1.3.5]: Bottom sheet must be custom implementation — @gorhom/bottom-sheet broken on Reanimated v4" means the poll creation sheet MUST use the same custom Modal+Animated.Value pattern from `SendBar.tsx`. [VERIFIED: STATE.md, SendBar.tsx]

**Installation:** None required.

---

## Architecture Patterns

### System Architecture Diagram

```
User taps "Poll" in attachment menu
           |
           v
ChatRoomScreen.handleAttachmentAction('poll')
           |
           v (sets showPollCreationSheet=true)
PollCreationSheet (Modal + Animated translateY)
    |-- question: TextInput
    |-- options[]: TextInput[]  (2–4 rows)
    |-- + Add option / × remove
    |-- Discard / Send Poll buttons
           |
           v (on Send Poll tap)
useChatRoom.sendPoll(question, options[])
    |-- Step 1: insert message row (message_type='poll', body=null, client UUID)
    |    optimistic MessageWithProfile prepended to messages state
    |
    |-- Step 2: supabase.rpc('create_poll', { p_message_id, p_question, p_options })
    |    creates polls + poll_options rows, sets messages.poll_id
    |
    |-- On success: Realtime INSERT fires for other participants
    |-- On failure: remove optimistic entry from messages state
           |
           v
MessageBubble (message_type === 'poll')
    |-- renders PollCard instead of text/image bubble
           |
           v
PollCard
    |-- fetches poll + options + current user's vote on mount
    |   (or receives as props — see Pattern 2)
    |
    |-- Unvoted state: option rows with ○ radio, label only
    |-- Voted state: ● radio, label, progress bar, vote count
    |
    |-- User taps option → usePoll.vote(optionId)
           |
           v
usePoll hook
    |-- Optimistic update (local state)
    |-- supabase.from('poll_votes').delete (if changing/removing)
    |-- supabase.from('poll_votes').insert (if voting/changing)
    |-- Silent revert on failure

Supabase Realtime (existing channel in useChatRoom)
    |-- .on('postgres_changes', INSERT, table: 'poll_votes') → increment count
    |-- .on('postgres_changes', DELETE, table: 'poll_votes') → decrement count
    |-- client-side guard: only apply if poll_id belongs to a message in current room
```

### Recommended Project Structure

```
src/
├── components/chat/
│   ├── PollCard.tsx          # (new) full-width poll card — voted/unvoted states
│   └── PollCreationSheet.tsx # (new) bottom sheet modal for poll creation
├── hooks/
│   └── usePoll.ts            # (new) vote / change / un-vote + local state
└── hooks/useChatRoom.ts      # (extend) sendPoll() + poll_votes Realtime listeners
```

No new screens, no new routes.

### Pattern 1: sendPoll() in useChatRoom — mirrors sendImage()

**What:** Two-step async function: insert `message` row with `message_type='poll'` and `body=null`, then call the `create_poll()` RPC with the message's UUID to atomically create poll/options rows and link `poll_id`.

**When to use:** When the user submits the creation sheet.

```typescript
// Source: based on sendImage() pattern in useChatRoom.ts (lines 424–489)
async function sendPoll(
  question: string,
  options: string[],
): Promise<{ error: Error | null }> {
  if (!currentUserId) return { error: new Error('Not authenticated') };

  const messageId = crypto.randomUUID(); // same UUID reuse pattern as sendImage
  const tempId = messageId;

  const optimistic: MessageWithProfile = {
    id: tempId,
    plan_id: planId ?? null,
    dm_channel_id: dmChannelId ?? null,
    group_channel_id: groupChannelId ?? null,
    sender_id: currentUserId,
    body: null,               // polls have no body
    created_at: new Date().toISOString(),
    image_url: null,
    reply_to_message_id: null,
    message_type: 'poll',
    poll_id: null,            // not yet known — RPC will set it
    reactions: [],
    pending: true,
    tempId,
    sender_display_name: currentUserDisplayName,
    sender_avatar_url: currentUserAvatarUrl,
  };

  setMessages((prev) => [optimistic, ...prev]);

  // Step 1: insert the message row — RPC validates sender ownership (line 264 in migration)
  const { error: msgError } = await supabase.from('messages').insert({
    id: messageId,
    plan_id: planId ?? null,
    dm_channel_id: dmChannelId ?? null,
    group_channel_id: groupChannelId ?? null,
    sender_id: currentUserId,
    body: null as any,        // same cast as deleteMessage / sendImage
    message_type: 'poll',
  });

  if (msgError) {
    setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    return { error: msgError };
  }

  // Step 2: atomically create poll + options + link poll_id via SECURITY DEFINER RPC
  const { error: rpcError } = await supabase.rpc('create_poll', {
    p_message_id: messageId,
    p_question: question,
    p_options: options,
  });

  if (rpcError) {
    setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    return { error: rpcError };
  }

  return { error: null };
}
```

**Critical note:** The `create_poll()` RPC verifies that `messages.sender_id = auth.uid()` (migration 0018 line 262–267). This means Step 1 (insert message) MUST happen before Step 2 (call RPC), otherwise the ownership check fails. [VERIFIED: 0018_chat_v1_5.sql]

### Pattern 2: usePoll Hook — local vote state with optimistic updates

**What:** A hook that manages per-poll state: the poll data (question, options with counts), the current user's vote, and vote mutation functions.

**When to use:** Mounted inside `PollCard` for every poll message visible in the list.

```typescript
// Source: mirrors addReaction/removeReaction pattern in useChatRoom.ts (lines 534–650)
interface PollOption {
  id: string;
  label: string;
  position: number;
  votes: number;
}

interface PollState {
  question: string;
  options: PollOption[];
  myVotedOptionId: string | null;
  totalVotes: number;
}

export function usePoll(pollId: string | null, currentUserId: string) {
  const [pollState, setPollState] = useState<PollState | null>(null);

  // fetch on mount: poll + poll_options + poll_votes
  // vote / un-vote / change vote:
  //   1. Capture preSnapshot inside setMessages updater (stale closure prevention — WR-03)
  //   2. Apply optimistic update to pollState
  //   3. DB write (delete old + insert new, or just delete)
  //   4. On error: silent revert to preSnapshot
}
```

**Key data shape:** Poll data is fetched independently of the `messages` query. The `messages` query does not join polls — only `poll_id` is present on the message. `PollCard` uses `pollId` from `message.poll_id` to fetch its own data.

### Pattern 3: poll_votes Realtime Extension — mirrors reaction listeners

**What:** Extend the existing channel in `useChatRoom.subscribeRealtime()` with two more `.on()` calls for `poll_votes` INSERT and DELETE.

**When to use:** Called from `subscribeRealtime()` — no separate subscription.

```typescript
// Source: based on handleReactionInsert/Delete pattern, useChatRoom.ts lines 208–259
// Added to the existing channel chain in subscribeRealtime():
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, handlePollVoteInsert)
.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'poll_votes' }, handlePollVoteDelete)
```

**Client-side guard (identical to reactions):** No server-side filter exists on `poll_votes` (no room column). The handler must verify that the incoming `poll_id` belongs to a message currently in the `messages` state before applying the update.

**Dedup guard (identical to reactions):** Skip events where `user_id === currentUserId` — own changes are already applied via optimistic update.

**Who receives updates:** The Realtime events update `useChatRoom.messages` state, but `PollCard` gets its vote counts from `usePoll` (independent fetch). To bridge them, `usePoll` needs to respond to the Realtime events — options:
1. Pass a `refreshCounts()` callback down to `PollCard` triggered by the `useChatRoom` listener.
2. Have `usePoll` maintain its own subscription (violates D-14).
3. Have `useChatRoom` Realtime handlers notify `PollCard` via a shared state atom or context.

**Recommended approach (planner's discretion):** Simplest is option 1 — `useChatRoom` tracks a `lastPollVoteEvent` state atom; `PollCard`/`usePoll` subscribes to it via a prop and re-fetches counts when the poll_id matches. This avoids duplicate subscriptions and keeps D-14 satisfied.

### Pattern 4: MessageBubble Branching for 'poll'

**What:** Add `message_type === 'poll'` branch alongside the existing `isImage` branch.

```typescript
// Source: MessageBubble.tsx lines 227–228, 309–341 — existing isImage pattern
const isPoll = message.message_type === 'poll';
// In JSX: replace bubble body with <PollCard message={message} currentUserId={currentUserId} />
```

**Full-width layout constraint:** The existing `ownContainer` style has `maxWidth: '75%'` and `alignSelf: 'flex-end'`. Poll messages must escape this constraint. The recommended pattern is to render `PollCard` as a sibling outside the bubble containers — or conditionally apply full-width styles when `isPoll`. The `isOwn` alignment must not apply to poll cards (D-05: full-width, not left/right aligned). [VERIFIED: CONTEXT.md D-05, UI-SPEC.md PollCard section]

**Context menu for polls:** The `handleLongPress` behavior stays the same. The `contextMenu` JSX variable must hide "Reply" and "Copy" for polls (D-10). Current code already hides "Copy" for image messages (`!isImage` gate at line 268). The same gate becomes `!isImage && !isPoll`. "Reply" must also be gated out for polls. "Delete" remains visible only to `isOwn` (poll creator).

### Pattern 5: PollCreationSheet — mirrors SendBar attachment sheet

**What:** Bottom sheet modal using the exact same `Modal + Animated.Value(300 → 0)` pattern from `SendBar.tsx`. The STATE.md decision "[v1.3.5]: Bottom sheet must be custom implementation — @gorhom/bottom-sheet broken on Reanimated v4" means no third-party bottom sheet library. [VERIFIED: STATE.md, SendBar.tsx lines 40–80]

```typescript
// Source: SendBar.tsx openMenu/closeMenu pattern (lines 65–83)
const translateY = useRef(new Animated.Value(300)).current;

function open() {
  Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }).start();
}
function close() {
  Animated.timing(translateY, { toValue: 300, duration: 200, useNativeDriver: true }).start(onDismiss);
}
```

**Validation logic:** `canSendPoll = question.trim().length > 0 && options.every(o => o.trim().length > 0)`. The Send Poll button is `disabled={!canSendPoll}`.

### Anti-Patterns to Avoid

- **Separate navigation screen for poll creation:** D-01 explicitly prohibits this. The sheet is a modal overlay, not a new route.
- **Replies to polls:** `reply_to_message_id` must remain `null` for all poll messages. The "Reply" context menu item is hidden (D-10). QuotedBlock in the bubble must not reference polls.
- **Deleting polls/poll_options/poll_votes rows on soft-delete:** D-16 is explicit — only the `messages` row changes. Polls data is preserved.
- **Postgres Changes filter on poll_votes:** The `poll_votes` table has no room-scoped column. A server-side filter like `plan_id=eq.X` cannot be applied. Use client-side guard (same as message_reactions). [VERIFIED: 0018_chat_v1_5.sql SECTION 3]
- **Creating a separate Supabase channel for poll_votes:** D-14 mandates the existing channel is extended. A second channel doubles Realtime connection overhead.
- **Using @gorhom/bottom-sheet:** STATE.md records it is broken on Reanimated v4. Use custom Modal. [VERIFIED: STATE.md]
- **Direct INSERT into polls/poll_options tables:** RLS on these tables prohibits direct INSERT. Only `create_poll()` RPC can create poll rows (migration 0018 line 129: "no direct INSERT"). [VERIFIED: 0018_chat_v1_5.sql]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic poll + options creation | Custom multi-table insert | `create_poll()` RPC | Already exists; enforces auth, option count, sender ownership at DB level |
| Soft-delete of poll messages | New delete logic | `deleteMessage()` in `useChatRoom` | Existing function handles all message types; poll message is just another message |
| Bottom sheet animation | Re-invent translateY animation | Copy SendBar.tsx pattern verbatim | Identical pattern already proven; STATE.md forbids @gorhom/bottom-sheet |
| Progress bar width calculation | Custom layout | `Animated.Value` width = `(optionVotes / totalVotes) * screenWidth` | Simple arithmetic; `useNativeDriver: false` required for width animation |

**Key insight:** 80% of the infrastructure (schema, RPC, types, Realtime channel, optimistic update pattern, context menu, soft-delete) is already built. This phase is assembly work, not invention.

---

## Common Pitfalls

### Pitfall 1: sendPoll() Step Order

**What goes wrong:** Calling `create_poll()` RPC before the message row exists. The RPC queries `SELECT sender_id FROM messages WHERE id = p_message_id` to verify ownership. If the row doesn't exist yet, the RPC raises "message not found".

**Why it happens:** Developer assumes RPC creates both message and poll rows. It doesn't — it requires the message to pre-exist.

**How to avoid:** Always insert the `messages` row first, then call `rpc('create_poll', ...)`. This is the documented pattern from migration 0018 lines 253–267.

**Warning signs:** RPC returns "message not found" error immediately on send.

### Pitfall 2: Poll Messages Breaking the Bubble Layout

**What goes wrong:** Rendering `PollCard` inside the existing `ownBubble` / `othersBubble` container which has `maxWidth: '75%'` and alignment constraints. The card appears narrow and misaligned.

**Why it happens:** `isPoll` branch is added inside the existing bubble path instead of as an early-return alternative layout.

**How to avoid:** When `isPoll`, return a separate full-width layout path from `MessageBubble` that bypasses `ownContainer`/`othersContainer` styles entirely. The card should be rendered in a container with `width: '100%'` and `paddingHorizontal: SPACING.lg`.

**Warning signs:** Poll card appears narrow or offset to the left/right instead of full-width.

### Pitfall 3: Stale Closure in usePoll Optimistic Update

**What goes wrong:** Vote state captured before the optimistic update is stale by the time the DB write completes and reverts are needed.

**Why it happens:** Pre-snapshot captured outside the `setState` updater rather than inside it.

**How to avoid:** Follow the WR-03 fix pattern from `useChatRoom` (Phase 16 note in STATE.md): capture pre-snapshot inside the `setPollState` updater function, not in the closure body. See `addReaction` lines 539–545 for the exact pattern.

**Warning signs:** Reverting a failed vote restores wrong state (e.g., restores a different option's selection).

### Pitfall 4: Realtime poll_votes Events Updating the Wrong Poll

**What goes wrong:** A poll vote event from a different chat room (a different user's poll in another channel) updates the vote count on a poll in the current room.

**Why it happens:** `poll_votes` has no room-scoped column. Realtime fires for all `poll_votes` changes globally.

**How to avoid:** Client-side guard: before applying a Realtime vote event, verify that the `poll_id` in the event corresponds to a message currently in `messages` state. Same pattern as `handleReactionInsert` which checks `prev.findIndex((m) => m.id === incomingMessageId)`. [VERIFIED: useChatRoom.ts lines 219–220]

**Warning signs:** Vote counts increment on polls that no one in the room voted on.

### Pitfall 5: poll_id null on Optimistic PollCard Render

**What goes wrong:** The optimistic `MessageWithProfile` has `poll_id: null` (the RPC hasn't run yet). When `PollCard` mounts and tries to fetch poll data using `poll_id`, it gets null and fails silently or throws.

**Why it happens:** The two-step `sendPoll` flow means `poll_id` is not known until the RPC completes.

**How to avoid:** `PollCard` must handle `poll_id: null` gracefully — show a loading/pending skeleton state when `message.pending === true` or `message.poll_id === null`. Only fetch poll data when `pollId` is a valid UUID.

**Warning signs:** Crash or blank card immediately after sending a poll.

### Pitfall 6: 'deleted' message_type Check Already Widened

**What goes wrong:** Adding another migration to widen `message_type` CHECK to include 'poll' when it was already included in 0018.

**Why it happens:** Developer confuses Phase 14's migration 0019 (which added 'deleted') with thinking 'poll' also needs adding.

**How to avoid:** Check migration 0018 line 24: `CHECK (message_type IN ('text', 'image', 'poll'))`. And migration 0019 widened to include 'deleted'. No new migration is needed for this phase — the schema is complete. [VERIFIED: 0018_chat_v1_5.sql, 0019_reply_threading.sql]

### Pitfall 7: body=null TypeScript Cast for Poll Insert

**What goes wrong:** TypeScript error `Type 'null' is not assignable to type 'string'` on the poll message insert.

**Why it happens:** The Supabase generated types in `database.ts` mark `body` as non-nullable, but the DB column is nullable since migration 0018.

**How to avoid:** Use `body: null as any` — the exact same cast established in Phase 14 (`deleteMessage`) and Phase 16 (`sendImage`). This is documented in STATE.md: "[Phase 14-reply-threading]: body: null cast to any in deleteMessage". [VERIFIED: useChatRoom.ts line 477, STATE.md]

---

## Code Examples

### Fetching poll data in usePoll

```typescript
// Pattern: independent fetch of poll + options + votes for a single poll
// Source: Supabase JS SDK, consistent with existing fetch patterns in useChatRoom.ts

async function fetchPollData(pollId: string) {
  const { data: pollData } = await supabase
    .from('polls')
    .select('id, question')
    .eq('id', pollId)
    .single();

  const { data: options } = await supabase
    .from('poll_options')
    .select('id, label, position')
    .eq('poll_id', pollId)
    .order('position', { ascending: true });

  const { data: votes } = await supabase
    .from('poll_votes')
    .select('option_id, user_id')
    .eq('poll_id', pollId);

  // Aggregate vote counts per option
  // Find current user's vote
}
```

### Voting (insert) and un-voting (delete)

```typescript
// Cast vote
await supabase.from('poll_votes').insert({
  poll_id: pollId,
  option_id: optionId,
  user_id: currentUserId,
});

// Remove vote
await supabase.from('poll_votes')
  .delete()
  .eq('poll_id', pollId)
  .eq('user_id', currentUserId);

// Change vote = delete old + insert new (two sequential calls)
// poll_votes composite PK (poll_id, user_id) enforces one vote per user per poll
```

### Progress bar width animation (unvoted → voted transition)

```typescript
// Source: React Native Animated docs — width animation requires useNativeDriver: false
const widthAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (myVotedOptionId !== null) {
    Animated.timing(widthAnim, {
      toValue: optionVotes / totalVotes,  // 0..1 fraction
      duration: 300,
      useNativeDriver: false,             // width is not natively animatable
    }).start();
  } else {
    widthAnim.setValue(0);  // instant reset when un-voting
  }
}, [myVotedOptionId, optionVotes, totalVotes]);

// In JSX:
<Animated.View
  style={{
    width: widthAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
    height: 4,
    backgroundColor: isSelected ? COLORS.interactive.accent : COLORS.surface.overlay,
    borderRadius: RADII.xs,
  }}
/>
```

---

## Realtime Strategy Decision

**Context:** STATE.md records "[v1.5]: Poll votes Realtime — same constraint [as reactions]; decide at Phase 17 planning start."

**Phase 15 resolution (already in production code):** `useChatRoom.ts` uses `postgres_changes` on `message_reactions` directly — not JSONB on messages, not Broadcast. This is confirmed in `useChatRoom.ts` lines 355–358.

**Phase 17 recommendation:** Use the same `postgres_changes` on `poll_votes` (INSERT + DELETE events), extended onto the existing channel. Rationale:
- Consistent with Phase 15 decision already shipped
- `poll_votes` has lower event frequency than `message_reactions` (voting happens once per user per poll; reactions can be toggled repeatedly)
- Client-side guard handles cross-room filtering (no room column on `poll_votes` — same constraint as reactions)
- Free-tier budget risk was accepted for reactions; poll votes have equal or lower volume

[ASSUMED: The Supabase free-tier Realtime event budget is sufficient given poll vote frequency is low relative to reactions. If project ever approaches Realtime limits, a JSONB `vote_counts` column on `polls` updated by a DB trigger would be the migration path — but this is not needed now.]

---

## Environment Availability

Step 2.6: SKIPPED (no new external tools, services, CLIs, or runtimes introduced by this phase — existing Supabase project and React Native / Expo SDK are already operational).

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (devDependency: `@playwright/test ^1.58.2`) |
| Unit test framework | None detected — no jest.config.*, no vitest.config.*, no pytest.ini, no `__tests__/` directory |
| Config file | None found |
| Quick run command | `npx expo lint` (only automated check available) |
| Full suite command | Manual — no automated test suite in this project |

**Note:** The project has no unit or integration test infrastructure. Only Playwright e2e is installed as a devDependency, but no test files were found. Testing for this phase is manual / visual verification against the CONTEXT.md and UI-SPEC decisions.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-09 | Create poll via attachment menu, 2–4 options, validation | Manual / E2E | — | No test file |
| CHAT-10 | Vote, see selection, change vote, un-vote | Manual / E2E | — | No test file |
| CHAT-11 | Live vote counts update for all participants | Manual (multi-device) | — | No test file |

### Sampling Rate
- **Per task commit:** `npx expo lint` (TypeScript + ESLint)
- **Per wave merge:** `npx expo lint` + manual visual check on simulator
- **Phase gate:** All CONTEXT.md decisions verified visually before `/gsd-verify-work`

### Wave 0 Gaps
None for automated tests — the project does not use a unit test framework. All verification is manual against the UI-SPEC and CONTEXT.md decisions.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth session; `auth.uid()` checked in `create_poll()` RPC and `poll_votes` RLS policies |
| V3 Session Management | no | Handled by Supabase Auth (existing) |
| V4 Access Control | yes | RLS on `polls`, `poll_options`, `poll_votes` — channel membership required for SELECT; own user_id required for INSERT/DELETE on poll_votes |
| V5 Input Validation | yes | Client-side: question non-empty, 2–4 options non-empty. Server-side: `create_poll()` validates `array_length(p_options, 1) BETWEEN 2 AND 4` |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Vote on behalf of another user | Spoofing | `poll_votes` RLS `poll_votes_insert_own` requires `user_id = auth.uid()` [VERIFIED: 0018_chat_v1_5.sql] |
| Cast multiple votes per poll | Tampering | Composite PK `(poll_id, user_id)` on `poll_votes` enforces uniqueness [VERIFIED: 0018_chat_v1_5.sql] |
| Create poll in channel user is not member of | Elevation | `create_poll()` validates sender via `messages.sender_id = auth.uid()`; message INSERT blocked by existing messages RLS for non-members |
| Vote on poll in foreign channel | Elevation | `poll_votes_insert_own` RLS checks `option_id` belongs to `poll_id` — but cross-channel vote is still possible if user knows poll_id. Mitigation: `is_channel_member()` check is NOT present on poll_votes INSERT. [ASSUMED: This is an acceptable risk for a friends-only app; the only exposure is a user knowing a UUID poll_id from another channel] |
| Invalid option count in RPC | Tampering | `create_poll()` validates `array_length(p_options, 1) BETWEEN 2 AND 4` and raises EXCEPTION [VERIFIED: 0018_chat_v1_5.sql line 260] |
| Direct INSERT to polls/poll_options | Elevation | No INSERT RLS policy on `polls` or `poll_options` — direct insert is blocked [VERIFIED: 0018_chat_v1_5.sql SECTION 4b] |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase free-tier Realtime budget is sufficient for poll_votes postgres_changes events given low voting frequency | Realtime Strategy Decision | If budget is exceeded, live counts would stop working; mitigation: JSONB cached counts on polls row |
| A2 | Cross-channel poll vote is an acceptable risk for a friends-only app (poll_votes INSERT RLS does not verify channel membership) | Security Domain | A user with a foreign poll_id UUID could vote; impact is low given UUID entropy and closed-invite-only user base |

---

## Open Questions (RESOLVED)

1. **How does usePoll receive Realtime vote updates from useChatRoom?** (RESOLVED)
   - Resolution: `lastPollVoteEvent: { pollId, timestamp }` state atom in `useChatRoom`; `PollCard` receives it as a prop and `usePoll` re-fetches counts when `pollId` matches. Avoids duplicate subscriptions, satisfies D-14.

2. **Upsert vs delete+insert for changing vote?** (RESOLVED)
   - Resolution: delete+insert (two sequential calls) — mirrors `addReaction`/`removeReaction` pattern for consistency. Chosen in Plan 17-01 Task 1.

---

## Sources

### Primary (HIGH confidence)
- VERIFIED: `/Users/iulian/Develop/campfire/supabase/migrations/0018_chat_v1_5.sql` — polls schema, RLS policies, create_poll() RPC
- VERIFIED: `/Users/iulian/Develop/campfire/supabase/migrations/0019_reply_threading.sql` — message_type CHECK widening, no further migration needed
- VERIFIED: `/Users/iulian/Develop/campfire/src/hooks/useChatRoom.ts` — sendImage() pattern, reaction listener pattern, WR-03 stale closure fix, channel extension pattern
- VERIFIED: `/Users/iulian/Develop/campfire/src/components/chat/MessageBubble.tsx` — message_type branching, context menu structure, isImage gate pattern
- VERIFIED: `/Users/iulian/Develop/campfire/src/components/chat/SendBar.tsx` — bottom sheet Modal+Animated pattern, AttachmentAction type
- VERIFIED: `/Users/iulian/Develop/campfire/src/screens/chat/ChatRoomScreen.tsx` — handleAttachmentAction wire-in point at line 112
- VERIFIED: `/Users/iulian/Develop/campfire/src/types/chat.ts` — MessageType includes 'poll', Message.poll_id field
- VERIFIED: `/Users/iulian/Develop/campfire/.planning/phases/17-polls/17-CONTEXT.md` — all locked decisions D-01 through D-16
- VERIFIED: `/Users/iulian/Develop/campfire/.planning/phases/17-polls/17-UI-SPEC.md` — component layouts, spacing, color, copy
- VERIFIED: `/Users/iulian/Develop/campfire/.planning/STATE.md` — @gorhom/bottom-sheet broken on Reanimated v4, Realtime deferred decision
- VERIFIED: `/Users/iulian/Develop/campfire/package.json` — no @gorhom/bottom-sheet, no new dependencies needed

### Secondary (MEDIUM confidence)
- None — all key decisions verified directly from codebase.

### Tertiary (LOW confidence / ASSUMED)
- A1: Free-tier Realtime budget adequate for poll vote frequency (low-volume, friends-only app)
- A2: Cross-channel vote acceptable risk (UUID entropy + invite-only user base)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json, no new dependencies
- Architecture: HIGH — all patterns extracted directly from existing production code
- Pitfalls: HIGH — derived from existing STATE.md decisions and codebase inspection
- Realtime strategy: MEDIUM — Phase 15 precedent verified; Supabase budget assumption is ASSUMED

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (Supabase JS SDK and RN 0.83 are stable; schema is frozen)
