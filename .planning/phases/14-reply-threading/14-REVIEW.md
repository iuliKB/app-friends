---
phase: 14-reply-threading
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - package.json
  - src/components/chat/MessageBubble.tsx
  - src/components/chat/SendBar.tsx
  - src/hooks/useChatRoom.ts
  - src/screens/chat/ChatRoomScreen.tsx
  - src/types/chat.ts
  - supabase/migrations/0019_reply_threading.sql
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This phase adds reply threading to the Campfire chat: a `reply_to_message_id` column (already present in `src/types/chat.ts` from Phase 12's migration 0018), a soft-delete `message_type='deleted'` variant, an RLS UPDATE policy in migration 0019, a `QuotedBlock` inline preview in `MessageBubble`, a reply bar in `SendBar`, and scroll-to-original + flash-highlight in `ChatRoomScreen`.

Overall the implementation is coherent and well-structured. No critical security or data-loss issues were found. Four warnings relate to a timer-leak risk, a stale closure, a missed highlight-clear-on-unmount, and an unsafe `scrollToIndex` fallback. Three info-level items cover dead code, an inconsistency in the optimistic dedup match, and a minor UX gap.

---

## Warnings

### WR-01: Timer leak — `highlightedId` `setTimeout` is not cleared on unmount

**File:** `src/screens/chat/ChatRoomScreen.tsx:97`
**Issue:** `scrollToMessage` calls `setTimeout(() => setHighlightedId(null), 1200)` but the timeout handle is never stored or cancelled. If the component unmounts (user navigates away) while the 1.2-second timer is still running, React will attempt a `setState` on an unmounted component. In React 19 strict mode this is a no-op warning, but in release builds on older Expo/RN versions it can silently leak.
**Fix:**
```tsx
// At the top of ChatRoomScreen, alongside the other refs:
const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function scrollToMessage(messageId: string) {
  const index = messages.findIndex((m) => m.id === messageId);
  if (index === -1) {
    showToast();
    return;
  }
  flatListRef.current?.scrollToIndex({ index, animated: true });
  setHighlightedId(messageId);
  if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 1200);
}

// In the cleanup useEffect (or add one):
useEffect(() => {
  return () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  };
}, []);
```

---

### WR-02: Stale closure — `enrichMessage` captures `currentUserId` / `currentUserDisplayName` at mount time inside `subscribeRealtime`

**File:** `src/hooks/useChatRoom.ts:182-281`
**Issue:** `subscribeRealtime` is called once per `useEffect` run and closes over the `enrichMessage` function defined in the same render. `enrichMessage` itself closes over `currentUserId`, `currentUserDisplayName`, and `currentUserAvatarUrl`. The `useEffect` dependency array at line 294 lists `session?.user?.id`, so a session change triggers a re-subscribe. However, if `display_name` or `avatar_url` changes within the same session (profile edit), a real-time INSERT will be enriched with the stale name/avatar because the subscription callback captured the older `enrichMessage`. The same stale capture affects the dedup branch at line 239.

This is a latent bug — it will not manifest unless a user edits their profile mid-session — but it is worth noting as it will silently show the wrong display name for new messages until the component remounts.
**Fix:** Add `currentUserDisplayName` and `currentUserAvatarUrl` to the `useEffect` dependency array, or alternatively store them in a ref so the subscription callback always reads the latest value:
```ts
const currentUserRef = useRef({ currentUserId, currentUserDisplayName, currentUserAvatarUrl });
useEffect(() => {
  currentUserRef.current = { currentUserId, currentUserDisplayName, currentUserAvatarUrl };
});
// Then use currentUserRef.current inside enrichMessage
```

---

### WR-03: `onScrollToIndexFailed` silently swallows the index — should also attempt a scroll after layout

**File:** `src/screens/chat/ChatRoomScreen.tsx:186-189`
**Issue:** The `onScrollToIndexFailed` callback only calls `showToast()`. The FlatList docs recommend using the `averageItemLength` hint or scheduling a `scrollToIndex` after a layout pass. The current behaviour means that if the target message is outside the rendered window but *is* in the `messages` array (just not yet laid out), the user gets a "scroll up" toast even though the message is technically in view range. This is especially likely for the first render of a chat with 50 messages.
**Fix:**
```tsx
onScrollToIndexFailed={(info) => {
  // Schedule a retry after layout to cover the "not-yet-measured" case
  const wait = new Promise((resolve) => setTimeout(resolve, 300));
  wait.then(() => {
    flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
  });
  // Only show toast if the item is genuinely not in the messages array
  // (already handled by the index === -1 guard in scrollToMessage)
}}
```
At minimum, remove the toast from `onScrollToIndexFailed` since the `scrollToMessage` guard already calls `showToast()` for the truly-missing case, meaning a real layout-delay will show a misleading toast.

---

### WR-04: Optimistic dedup match does not include `reply_to_message_id` — replies can collide with unrelated messages

**File:** `src/hooks/useChatRoom.ts:229-235`
**Issue:** The optimistic dedup check matches on `sender_id + body + 5-second window`. If the same user sends the same message text twice in quick succession — once as a plain message and once as a reply — the first arriving real-time event will replace the wrong optimistic entry. The reply's `reply_to_message_id` is included in the optimistic object (line 310) but is not part of the dedup condition.
**Fix:**
```ts
const optimisticIdx = prev.findIndex(
  (m) =>
    m.pending === true &&
    m.sender_id === incoming.sender_id &&
    m.body === incoming.body &&
    m.reply_to_message_id === incoming.reply_to_message_id &&
    Math.abs(new Date(m.created_at).getTime() - now) < 5000
);
```

---

## Info

### IN-01: `package.json` — no changes detected; included in review scope but contains no Phase 14 additions

**File:** `package.json`
**Issue:** No new dependencies were added for Phase 14 (reply threading is implemented entirely with existing packages). The file is clean. No action needed — flagged only to confirm the scope was reviewed.
**Fix:** No action required.

---

### IN-02: `QuotedBlock` renders for `deleted` own messages — delete button missing from context menu for that state but quoted blocks can still reference a deleted message

**File:** `src/components/chat/MessageBubble.tsx:76-104`
**Issue:** `QuotedBlock` gracefully handles a missing/deleted original by showing `'Original message deleted'` or `'Message deleted.'`. This is correct. However, the context menu (`handleLongPress`, line 158-161) bails out on `message.message_type === 'deleted'`, which prevents the delete action from appearing on already-deleted messages — that is intentional. But it also prevents the **Reply** action from appearing on a deleted message, which is correct behaviour; no issue here. This is documented for clarity only.
**Fix:** No change needed. The guard logic is intentional and correct.

---

### IN-03: `SendBar` — `panResponder` `onClearReply` closure is captured at construction time and never updates

**File:** `src/components/chat/SendBar.tsx:42-52`
**Issue:** `PanResponder.create(...)` is called once inside `useRef` and the `onClearReply` prop at that moment is captured forever. If `onClearReply` changes identity between renders (e.g. because the parent passes an inline arrow function), the swipe-to-dismiss handler will call the stale version. In `ChatRoomScreen.tsx:201` the prop is `() => setReplyContext(null)` — a new function on every render — but since `setReplyContext` is stable (Zustand/useState setter), the actual effect is the same. This is safe as written but could become a bug if `onClearReply` ever gains dependencies.

The tap-based `×` button at line 104 uses `onClearReply` directly from props and is always fresh, which is the more reliable path.
**Fix:** For robustness, store `onClearReply` in a ref so the PanResponder always calls the latest version:
```tsx
const onClearReplyRef = useRef(onClearReply);
useEffect(() => { onClearReplyRef.current = onClearReply; }, [onClearReply]);
// In PanResponder: onClearReplyRef.current?.()
```

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
