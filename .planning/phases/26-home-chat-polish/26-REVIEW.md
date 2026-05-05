---
phase: 26-home-chat-polish
reviewed: 2026-05-05T11:33:47Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - .npmrc
  - src/components/chat/MessageBubble.tsx
  - src/components/chat/SendBar.tsx
  - src/components/home/CardStackView.tsx
  - src/components/home/EventCard.tsx
  - src/components/home/HomeFriendCard.tsx
  - src/components/home/HomeWidgetRow.tsx
  - src/components/home/RadarBubble.tsx
  - src/components/home/RadarView.tsx
  - src/components/status/OwnStatusCard.tsx
  - src/hooks/useChatRoom.ts
  - src/screens/chat/ChatListScreen.tsx
  - src/screens/chat/ChatRoomScreen.tsx
  - src/screens/home/HomeScreen.tsx
  - src/types/chat.ts
  - tests/unit/.rn-stub-module.js
  - tests/unit/fadingPulse.test.ts
  - tests/unit/rn-mock-preload.js
  - tests/unit/useChatRoom.send.test.ts
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-05-05T11:33:47Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

This phase adds home-screen polish (RadarBubble FADING state, HomeWidgetRow, OwnStatusCard, CrossFade view-switcher) and chat polish (CHAT-03 optimistic send failure/retry, SendBar photo button, MessageBubble retry UI). The implementation is well-structured overall. No critical security or data-loss issues were found. Five warnings cover edge-case logic bugs that could produce subtle misbehaviour at runtime, and six info items highlight dead code, type mismatches, and minor quality issues.

---

## Warnings

### WR-01: `useChatRoom` exposes `refetch` but `UseChatRoomResult` interface omits it

**File:** `src/hooks/useChatRoom.ts:789`
**Issue:** The return object at line 789 includes `refetch: fetchMessages`, but the `UseChatRoomResult` interface (lines 15–27) has no `refetch` field. TypeScript therefore types the property as `unknown` at the call site. `ChatRoomScreen.tsx` destructures `refetch` from `useChatRoom` (line 63) and passes it to `ErrorDisplay`. If TypeScript strict mode is in effect the call site compiles only because the destructure is untyped beyond the interface — any renaming or removal of `refetch` will silently break the retry path without a type error at the hook definition.
**Fix:** Add `refetch` to the interface:
```typescript
interface UseChatRoomResult {
  // ... existing fields ...
  refetch: () => Promise<void>;
}
```

### WR-02: `retryMessage` swallows reply-to context on retry

**File:** `src/hooks/useChatRoom.ts:494-498`
**Issue:** `retryMessage` calls `sendMessage(body)` with no `replyToId` argument. If the original failed message had a `reply_to_message_id`, the retried message will be sent without that reply link, silently dropping the thread context. The `MessageWithProfile` object still holds `reply_to_message_id` at retry time — it is simply not forwarded.
**Fix:**
```typescript
async function retryMessage(tempId: string, body: string): Promise<{ error: unknown }> {
  // Retrieve reply_to_message_id before removing the failed entry
  const failedMsg = messages.find((m) => m.tempId === tempId);
  const replyToId = failedMsg?.reply_to_message_id ?? undefined;
  setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
  return sendMessage(body, replyToId);
}
```
Note: `messages` is captured from closure — this is safe as long as the state setter is called after the read, which it is.

### WR-03: `handleSend` in `ChatRoomScreen` shows an error alert even when optimistic failure state already renders retry UI

**File:** `src/screens/chat/ChatRoomScreen.tsx:149-155`
**Issue:** When `sendMessage` fails, `useChatRoom` marks the message as `failed: true` (which renders the "Tap to retry" label in `MessageBubble`) AND the `handleSend` caller independently shows `Alert.alert('Error', 'Message failed to send.')`. The user therefore sees a disruptive alert modal _and_ the inline retry affordance simultaneously. This is inconsistent UX and the alert is redundant given that CHAT-03's design intent is the inline retry.
**Fix:** Remove the alert from `handleSend` and rely solely on the inline `failed` state:
```typescript
async function handleSend(body: string) {
  const replyToId = replyContext?.messageId;
  await sendMessage(body, replyToId);
  // No alert — failed state renders inline "Tap to retry" per CHAT-03
}
```

### WR-04: `scrollToMessage` uses a bare `setTimeout` without cleanup, risking a state update on unmounted component

**File:** `src/screens/chat/ChatRoomScreen.tsx:133`
**Issue:** `setTimeout(() => setHighlightedId(null), 1200)` has no cleanup. If the user navigates away from the chat room within 1.2 seconds of tapping a quoted message, the callback fires and calls `setHighlightedId` on an unmounted component, triggering a React warning and a potential no-op state update. The `toastAnim` animation in the same file has the same absence of cleanup.
**Fix:**
```typescript
const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function scrollToMessage(messageId: string) {
  const index = messages.findIndex((m) => m.id === messageId);
  if (index === -1) { showToast(); return; }
  flatListRef.current?.scrollToIndex({ index, animated: true });
  setHighlightedId(messageId);
  if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 1200);
}

// In cleanup useEffect:
useEffect(() => {
  return () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  };
}, []);
```

### WR-05: `handlePollVoteInsert` / `handlePollVoteDelete` use a `setMessages` side-effect read pattern that is not safe in concurrent React

**File:** `src/hooks/useChatRoom.ts:281-305`
**Issue:** Both `handlePollVoteInsert` and `handlePollVoteDelete` read `isInRoom` via a `setMessages` no-op updater that only reads state without updating it (`return prev`). This pattern relies on the updater being called synchronously before the `if (isInRoom)` check on the next line. In React 18 concurrent mode (which Expo SDK 50+ enables) batched updates can defer the updater call, meaning `isInRoom` may still be `false` at the `if` check even when the message is present. This is the same anti-pattern warned about in React concurrent mode guides.
**Fix:** Use a React `useRef` to maintain a stable mirror of the messages array:
```typescript
const messagesRef = useRef<MessageWithProfile[]>([]);
// After every setMessages call: messagesRef.current = newMessages;
// Or use a useEffect that mirrors state to ref.

// Then in handlers:
const isInRoom = messagesRef.current.some((m) => m.poll_id === incomingPollId);
if (isInRoom) setLastPollVoteEvent({ pollId: incomingPollId, timestamp: Date.now() });
```

---

## Info

### IN-01: UUID generation uses `Math.random()` — not cryptographically secure

**File:** `src/hooks/useChatRoom.ts:445, 505, 567`
**Issue:** Three functions (`sendMessage`, `sendImage`, `sendPoll`) each copy-paste the same UUID v4 generator using `Math.random()`. While collision probability is negligible for message IDs, using `Math.random()` for identifiers that are inserted into the database as primary keys is a code smell and is duplicated three times.
**Fix:** Extract to a shared utility:
```typescript
// src/utils/generateUUID.ts
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
```
This removes 18 lines of duplication and makes any future switch to `crypto.randomUUID()` a single-line change.

### IN-02: `useChatRoom.send.test.ts` fixture uses shape incompatible with `MessageWithProfile`

**File:** `tests/unit/useChatRoom.send.test.ts:50-76`
**Issue:** The test fixtures use `channel_id`, `updated_at`, and a `sender` object — none of which exist on the `Message` / `MessageWithProfile` types defined in `src/types/chat.ts`. The tests cast with `as unknown as MessageWithProfile` to suppress the error. While the tests still exercise the pure mutation logic correctly, the fixtures are misleading about what shape the actual state contains. If a future engineer copies this fixture pattern into application code it will produce runtime bugs.
**Fix:** Update fixtures to match the real shape:
```typescript
const baseMessages: MessageWithProfile[] = [
  {
    id: 'tmp-1',
    plan_id: null,
    dm_channel_id: 'ch-1',
    group_channel_id: null,
    sender_id: 'user-1',
    body: 'Hello',
    created_at: new Date().toISOString(),
    image_url: null,
    reply_to_message_id: null,
    message_type: 'text',
    poll_id: null,
    pending: true,
    failed: false,
    tempId: 'tmp-1',
    sender_display_name: 'Alice',
    sender_avatar_url: null,
    reactions: [],
  },
  // ...
];
```

### IN-03: `RadarView` uses index as FlatList skeleton key

**File:** `src/components/home/RadarView.tsx:176`
**Issue:** The skeleton blobs are mapped with `key={i}` (array index). When the loading state resolves and blobs are removed, React may reuse the wrong DOM node. This is a minor risk during the brief loading transition but is a recognised React key anti-pattern.
**Fix:** Use a stable key derived from the blob's position:
```typescript
<View key={`skeleton-blob-${blob.size}-${blob.top}`} ...>
```

### IN-04: `SendBar` `PanResponder` swipe-dismiss only fires `onClearReply` but doesn't animate or dismiss the sheet

**File:** `src/components/chat/SendBar.tsx:161-170`
**Issue:** The `panResponder` in `SendBar` calls `onClearReply?.()` on a downward swipe of > 60px or velocity > 0.5, which clears the reply context. However, the `translateY` animation and `setMenuVisible(false)` are used only for the attachment sheet modal — there is no animation tied to the reply bar swipe dismiss. This is correct behaviour (the reply bar just disappears), but the `panResponder` is attached to the reply bar `View` while the `translateY` `Animated.Value` is initialised to 300 and used only for the sheet. The two animation concerns are coupled in state but not in actual behaviour — the `translateY` ref is unused during the swipe. This is harmless but confusing for maintainers.
**Fix (low priority):** Add a comment clarifying that `translateY` is for the modal sheet only and the reply-bar swipe dismiss is intentionally un-animated:
```typescript
// translateY animates the attachment sheet only (not the reply bar).
// Reply bar swipe dismissal calls onClearReply which removes it from the tree.
const translateY = useRef(new Animated.Value(300)).current;
```

### IN-05: `HomeScreen` `friends.filter(f => f.status === 'free').length` counts all friends regardless of heartbeat state

**File:** `src/screens/home/HomeScreen.tsx:210`
**Issue:** The subtitle `{friends.filter((f) => f.status === 'free').length} friends available` counts friends whose `status` field is `'free'` but does not filter by heartbeat state. A friend whose status has expired (DEAD) but whose `status` column is still `'free'` in the DB will be counted as "available" even though they will not appear on the radar.
**Fix:**
```typescript
import { computeHeartbeatState } from '@/lib/heartbeat';
// ...
const freeAndAliveCount = friends.filter(
  (f) =>
    f.status === 'free' &&
    computeHeartbeatState(f.status_expires_at, f.last_active_at) === 'alive'
).length;
// Use freeAndAliveCount in the subtitle
```

### IN-06: Empty JSX expression `{}` used as spacer in `MessageBubble`

**File:** `src/components/chat/MessageBubble.tsx:534, 691, 796`
**Issue:** Three instances of `{}` appear as children inside `TouchableOpacity` / `View` elements. These are no-op empty expressions that React ignores at runtime. They appear to be remnants of a code generation or editing step (possibly placeholder comment slots). They add noise and will confuse future readers.
**Fix:** Delete the three `{}` lines. The surrounding elements render correctly without them.

---

_Reviewed: 2026-05-05T11:33:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
