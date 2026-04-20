---
phase: 14-reply-threading
verified: 2026-04-21T12:00:00Z
status: human_needed
score: 9/9
overrides_applied: 0
human_verification:
  - test: "Long-press a message bubble and confirm context menu pill appears above the touch point"
    expected: "Modal pill overlay renders with Reply, Copy, and (for own messages only) Delete actions visible"
    why_human: "Touch gesture + modal positioning requires a physical or simulator device; cannot verify pageY math programmatically"
  - test: "Tap Reply in context menu, confirm 48px reply bar appears above the send input showing the sender name and a preview of the message"
    expected: "Reply bar renders with '↩ Replying to [Name]' label, preview text, and × button"
    why_human: "UI layout and visual appearance require device/simulator rendering"
  - test: "Swipe down on the reply bar and confirm it dismisses"
    expected: "onClearReply fires when gesture dy > 60 or vy > 0.5"
    why_human: "PanResponder gesture interaction requires physical swipe on device/simulator"
  - test: "Send a reply message and verify it appears with a quoted block above the body text"
    expected: "New bubble shows accent bar + sender name + preview text above the reply body"
    why_human: "End-to-end database write + Realtime INSERT + QuotedBlock render requires live Supabase session"
  - test: "Tap a quoted block in a reply bubble; confirm FlatList scrolls to the original message and it flashes highlight"
    expected: "FlatList scrolls to the original message index; target bubble animates from transparent to orange-tinted and back"
    why_human: "FlatList.scrollToIndex + Animated color interpolation requires simulator/device rendering"
  - test: "Tap a quoted block whose original is outside the 50-message window; confirm toast appears"
    expected: "Toast 'Scroll up to see the original message' fades in, holds 2 seconds, fades out"
    why_human: "Requires a chat with > 50 messages and a reply to a message beyond the loaded window"
  - test: "Long-press own message, tap Delete; confirm 'Message deleted.' tombstone appears in italic secondary text"
    expected: "Bubble body replaced with 'Message deleted.' in italic; context menu no longer appears on that bubble"
    why_human: "Requires live Supabase UPDATE (RLS gate) and Realtime propagation to verify full soft-delete round-trip"
---

# Phase 14: Reply Threading — Verification Report

**Phase Goal:** Users can reply to any specific message with inline quoted context visible to all participants
**Verified:** 2026-04-21T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Long-pressing any message bubble opens a context menu with at least a "Reply" action | VERIFIED | `MessageBubble.tsx`: `handleLongPress` opens `menuVisible` Modal pill with Reply, Copy, Delete actions; guards on `message.pending` and `message_type === 'deleted'` |
| 2 | Selecting Reply attaches a quoted preview bar above the composer showing the original sender and first line | VERIFIED | `ChatRoomScreen.tsx` `onReply` callback sets `replyContext` state; `SendBar.tsx` renders `replyBar` when `replyContext` is non-null showing `↩ Replying to {senderName}` and `previewText` |
| 3 | The sent reply appears in the chat as a bubble with a compact quoted block above the reply text, attributed to the original sender | VERIFIED | `useChatRoom.ts` `sendMessage` inserts `reply_to_message_id: replyToId ?? null` into DB; `MessageBubble.tsx` renders `QuotedBlock` when `message.reply_to_message_id !== null` with accent bar + `sender_display_name` + preview text |
| 4 | Tapping the quoted block in a reply bubble scrolls the chat to the original message when it is within the loaded 50-message window | VERIFIED | `ChatRoomScreen.tsx` `scrollToMessage` calls `flatListRef.current?.scrollToIndex`; `onScrollToIndexFailed` and `index === -1` both show toast "Scroll up to see the original message" |

**Score: 4/4 roadmap success criteria verified**

### Plan-Level Must-Have Truths (Consolidated)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 01.1 | Migration 0019 applies cleanly to Supabase with zero errors | VERIFIED | `0019_reply_threading.sql` exists; SUMMARY confirms `supabase db push --dry-run` returned "Remote database is up to date" |
| 01.2 | `messages` table accepts `message_type = 'deleted'` without constraint violation | VERIFIED | Migration widens `messages_message_type_check` to `IN ('text', 'image', 'poll', 'deleted')` |
| 01.3 | UPDATE on messages is permitted for the row owner (`sender_id = auth.uid()`) | VERIFIED | Migration creates `CREATE POLICY "messages_soft_delete_own" ON public.messages FOR UPDATE ... USING (sender_id = (SELECT auth.uid())) WITH CHECK (sender_id = (SELECT auth.uid()))` |
| 01.4 | `MessageType` TypeScript type includes `'deleted'` | VERIFIED | `src/types/chat.ts` line 1: `export type MessageType = 'text' | 'image' | 'poll' | 'deleted';` |
| 02.1 | Long-pressing any message bubble opens a floating context menu with Reply, Copy, and (own only) Delete actions | VERIFIED | `MessageBubble.tsx`: Modal pill with `menuVisible` state, `handleLongPress`, `isOwn && Delete` conditional |
| 02.2 | Deleted messages show 'Message deleted.' placeholder in secondary italic text; context menu is suppressed | VERIFIED | `isDeleted` check + `deletedBody` style (`fontStyle: 'italic'`, `color: COLORS.text.secondary`); `handleLongPress` returns early when `message_type === 'deleted'` |
| 02.3 | Reply bubbles show a quoted block (left accent bar + sender name + preview text) above the body text | VERIFIED | `QuotedBlock` function renders `accentBar`, `quotedSender`, `quotedPreview`; rendered inside both own and others' bubbles when `reply_to_message_id !== null` |
| 02.4 | Tapping the quoted block emits `onScrollToMessage`; highlight flash plays on the target bubble after scroll | VERIFIED | `QuotedBlock` `onPress` calls `onScrollToMessage(message.reply_to_message_id!)`; `Animated.View` wraps bubble with `highlightBg` interpolation triggered by `highlighted` prop |
| 03.1 | `sendMessage` accepts an optional `replyToId` param and inserts `reply_to_message_id` into the database | VERIFIED | `useChatRoom.ts` line 296: `sendMessage(body: string, replyToId?: string)` inserts `reply_to_message_id: replyToId ?? null` (both in optimistic message and Supabase insert) |
| 03.2 | `deleteMessage` sets `body=NULL + message_type='deleted'` with optimistic update and rollback on failure | VERIFIED | `deleteMessage` stashes `originalBody`/`originalMessageType`, calls `.update({ body: null as any, message_type: 'deleted' })`, rolls back `setMessages` on `updateError` |
| 03.3 | Realtime UPDATE events from soft-delete propagate to other participants in the same chat session | VERIFIED | `useChatRoom.ts` lines 263–280: chained `.on('postgres_changes', { event: 'UPDATE', ... })` updates `body` and `message_type` in local state |
| 04.1 | Tapping Reply opens a 48px reply preview bar above the send input | VERIFIED | `SendBar.tsx` `replyBar` style has `height: 48` (with eslint-disable comment); renders when `replyContext` is non-null |
| 04.2 | The reply bar dismisses via × button or swipe-down gesture; sending a message also clears it | VERIFIED | `PanResponder.create` with `onPanResponderRelease` calling `onClearReply?.()` when `dy > 60 || vy > 0.5`; × button calls `onClearReply`; `handleSend` calls `onClearReply?.()` |
| 04.3 | Sent reply messages include `reply_to_message_id` wired from `replyContext.messageId` | VERIFIED | `ChatRoomScreen.tsx` `handleSend`: `const replyToId = replyContext?.messageId; sendMessage(body, replyToId)` |
| 04.4 | Tapping a quoted block in a reply bubble scrolls the FlatList to the original message | VERIFIED | `scrollToMessage` calls `flatListRef.current?.scrollToIndex({ index, animated: true })`; `flatListRef` assigned to FlatList `ref` prop |
| 04.5 | A toast appears when the original is not in the loaded window or `scrollToIndex` fails | VERIFIED | `scrollToMessage` calls `showToast()` when `index === -1`; `onScrollToIndexFailed` calls `showToast()`; toast text: "Scroll up to see the original message" |
| 04.6 | The target bubble flashes a highlight after successful scroll | VERIFIED | `scrollToMessage` calls `setHighlightedId(messageId)`; `setTimeout(() => setHighlightedId(null), 1200)`; MessageBubble `highlighted={highlightedId === item.id}` |

**Score: 9/9 plan must-haves verified**

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0019_reply_threading.sql` | CHECK constraint fix + RLS UPDATE policy | VERIFIED | Contains `messages_soft_delete_own`, `messages_message_type_check` with `'deleted'`, `USING`+`WITH CHECK` RLS |
| `src/types/chat.ts` | Updated `MessageType` with `'deleted'` | VERIFIED | Line 1: `export type MessageType = 'text' \| 'image' \| 'poll' \| 'deleted';` |
| `src/components/chat/MessageBubble.tsx` | Context menu, quoted block, highlight flash, deleted placeholder | VERIFIED | All four capabilities implemented; `QuotedBlock`, `highlightAnim`, `isDeleted`, `menuVisible` all present |
| `src/hooks/useChatRoom.ts` | Extended `sendMessage` + new `deleteMessage` + UPDATE Realtime listener | VERIFIED | `sendMessage(body, replyToId?)`, `deleteMessage` with optimistic+rollback, chained `.on('UPDATE', ...)` |
| `src/components/chat/SendBar.tsx` | Reply bar UI with PanResponder swipe dismiss and × button | VERIFIED | `ReplyContext` exported, `replyBar` style with `height: 48`, `PanResponder.create` with swipe-down dismiss |
| `src/screens/chat/ChatRoomScreen.tsx` | FlatList ref, reply state, `scrollToMessage`, toast, MessageBubble callback wiring | VERIFIED | `flatListRef`, `replyContext`, `highlightedId`, `scrollToMessage`, toast, all MessageBubble props wired |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `0019_reply_threading.sql` | `public.messages` | `ALTER TABLE + CREATE POLICY` | VERIFIED | Pattern `messages_soft_delete_own` found in migration |
| `src/types/chat.ts` | `useChatRoom.ts` | `MessageType` import | VERIFIED | `useChatRoom.ts` imports `MessageType` from `@/types/chat`; uses `'deleted' as MessageType` in `deleteMessage` |
| `MessageBubble.tsx` | `ChatRoomScreen.tsx` | `onReply, onDelete, onScrollToMessage` props | VERIFIED | `ChatRoomScreen.tsx` passes all three callbacks to `MessageBubble`; `onScrollToMessage={scrollToMessage}` confirmed |
| `MessageBubble.tsx` | `expo-clipboard` | `Clipboard.setStringAsync` | VERIFIED | `import * as Clipboard from 'expo-clipboard'`; `handleCopy` calls `Clipboard.setStringAsync(message.body)` |
| `ChatRoomScreen.tsx` | `SendBar.tsx` | `replyContext + onClearReply` props | VERIFIED | `<SendBar replyContext={replyContext} onClearReply={() => setReplyContext(null)} />` |
| `ChatRoomScreen.tsx` | `MessageBubble.tsx` | `allMessages, highlighted, onReply, onDelete, onScrollToMessage` | VERIFIED | All five new props passed at the `MessageBubble` call site in the FlatList `renderItem` |
| `ChatRoomScreen.tsx` | `useChatRoom` | `sendMessage(body, replyContext?.messageId)` | VERIFIED | `handleSend` extracts `replyToId = replyContext?.messageId` and passes to `sendMessage(body, replyToId)` |
| `useChatRoom.ts` | `messages` table (Supabase UPDATE) | `.update({ body: null, message_type: 'deleted' })` | VERIFIED | `deleteMessage` calls `.update({ body: null as any, message_type: 'deleted' }).eq('id', messageId).eq('sender_id', currentUserId)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `MessageBubble.tsx` QuotedBlock | `original` (from `allMessages`) | In-memory `messages` array loaded via `useChatRoom` → Supabase SELECT with `reply_to_message_id` column | Yes — `reply_to_message_id` fetched from DB and propagated through `allMessages` prop | FLOWING |
| `ChatRoomScreen.tsx` toast | `toastVisible` + `toastAnim` | `showToast()` triggered by `scrollToMessage` (index -1) or `onScrollToIndexFailed` | Yes — state-driven, no hardcoded values | FLOWING |
| `ChatRoomScreen.tsx` `highlightedId` | `highlightedId === item.id` | `setHighlightedId(messageId)` in `scrollToMessage` | Yes — populated by actual message ID from messages array | FLOWING |
| `useChatRoom.ts` `deleteMessage` | `messages` state | Supabase UPDATE → optimistic state + Realtime UPDATE propagation | Yes — real DB write, optimistic + rollback path | FLOWING |

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `MessageType` includes `'deleted'` | `grep "deleted" src/types/chat.ts` | `export type MessageType = 'text' \| 'image' \| 'poll' \| 'deleted';` | PASS |
| Migration contains RLS policy | `grep "messages_soft_delete_own" supabase/migrations/0019_reply_threading.sql` | Match found | PASS |
| `deleteMessage` exists in hook return | `grep "deleteMessage" src/hooks/useChatRoom.ts` | Interface declaration, function, and return object all present | PASS |
| Realtime UPDATE listener wired | `grep "event.*UPDATE" src/hooks/useChatRoom.ts` | `.on('postgres_changes', { event: 'UPDATE'...})` found | PASS |
| TypeScript build (phase-14 files only) | `npx tsc --noEmit` | Only 3 pre-existing errors in `src/app/friends/[id].tsx` (out-of-scope, logged in 14-01 SUMMARY); zero errors in any Phase 14 file | PASS |
| All commits exist in git log | `git log` check | All 8 commits verified: `300bbe8`, `510cb54`, `ae70625`, `430c96b`, `f2069cd`, `1ceafee`, `f0265cd`, `6887e7f` | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAT-07 | 14-01, 14-02, 14-03, 14-04 | User can reply to a specific message; the reply shows a quoted preview of the original | SATISFIED | Full reply threading flow implemented: DB schema + RLS (Plan 01), MessageBubble QuotedBlock + context menu (Plan 02), sendMessage with `replyToId` (Plan 03), SendBar reply bar + ChatRoomScreen wiring (Plan 04) |
| CHAT-08 | 14-02, 14-04 | Tapping the quoted preview scrolls to the original message (within loaded window only) | SATISFIED | `scrollToMessage` in `ChatRoomScreen.tsx` uses `FlatList.scrollToIndex`; toast fallback when message is out-of-window; `onScrollToIndexFailed` also shows toast |

No orphaned requirements — both CHAT-07 and CHAT-08 are accounted for across the four plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/chat/SendBar.tsx` | 128–129 | `placeholder="Message..."` | Info | TextInput placeholder text — not a stub, standard UI pattern |

No blocker anti-patterns. The only `placeholder` hit is a legitimate `TextInput` placeholder string. No `TODO`, `FIXME`, `return null`, or empty implementation stubs found in any Phase 14 file.

### Human Verification Required

Seven behavioral items require device or simulator testing — all automated artifact checks pass.

#### 1. Long-press context menu render and positioning

**Test:** On a device or simulator, long-press any non-deleted, non-pending message bubble.
**Expected:** Modal pill overlay appears above the touch point with Reply, Copy actions. For own messages, a Delete action (in red) also appears. Tapping the backdrop dismisses the menu.
**Why human:** Touch gesture and `nativeEvent.pageY` positioning math cannot be verified without rendering.

#### 2. Reply bar appearance

**Test:** Tap Reply in the context menu on any message.
**Expected:** A 48px bar slides in above the send input showing "↩ Replying to [SenderName]" (orange, semibold) and preview text (secondary color, regular).
**Why human:** UI layout and visual correctness require rendered output.

#### 3. Reply bar swipe-down dismiss

**Test:** With the reply bar visible, swipe down on it.
**Expected:** Reply bar disappears when the gesture travels more than 60dp down or releases with velocity > 0.5.
**Why human:** PanResponder gesture thresholds require physical swipe interaction.

#### 4. Reply bubble appearance after send

**Test:** With a reply selected, type and send a message. Observe the new bubble.
**Expected:** The sent bubble shows a quoted block (colored accent bar | sender name | first line of original) above the reply body text. The reply bar clears after send.
**Why human:** End-to-end flow requires live Supabase write and Realtime INSERT round-trip.

#### 5. Scroll-to-original and highlight flash

**Test:** Tap the quoted block in a reply bubble where the original is visible in the current 50-message window.
**Expected:** FlatList scrolls to the original message; the target bubble briefly flashes an orange tint (~200ms fade in, ~800ms fade out).
**Why human:** FlatList.scrollToIndex + Animated.interpolate color animation requires rendered device.

#### 6. Out-of-window toast

**Test:** Tap the quoted block in a reply bubble where the original is not in the current loaded window (requires a chat with > 50 messages).
**Expected:** Toast "Scroll up to see the original message" fades in at the bottom of the screen, holds for ~2 seconds, fades out.
**Why human:** Requires a populated chat session exceeding the 50-message fetch limit.

#### 7. Soft-delete round-trip

**Test:** Long-press own message → Delete. Verify on both the deleting device and a second device/session in the same chat.
**Expected:** On deleting device: bubble immediately shows "Message deleted." (italic, secondary color); context menu suppressed on that bubble. On second device: same tombstone appears via Realtime UPDATE within a few seconds.
**Why human:** Requires live Supabase UPDATE (RLS gate enforced) and Realtime propagation across two sessions.

### Gaps Summary

No gaps. All 9 plan-level must-haves verified and all 4 ROADMAP success criteria verified in the codebase. The phase goal is structurally achieved: the schema, types, hook, component, and screen are all correctly implemented and wired end-to-end.

Seven items in Human Verification above require device/simulator testing to confirm behavioral correctness at runtime. These are visual, gesture, and network-dependent behaviors that cannot be verified statically.

---

_Verified: 2026-04-21T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
