---
phase: 14-reply-threading
plan: 04
subsystem: components/screens/chat
tags: [react-native, reply-threading, flatlist, animation, toast, pan-responder]
dependency_graph:
  requires: [14-02, 14-03]
  provides: [reply-bar-UI, scroll-to-original, highlight-flash, toast, full-reply-flow]
  affects: [src/components/chat/SendBar.tsx, src/screens/chat/ChatRoomScreen.tsx]
tech_stack:
  added: []
  patterns: [PanResponder swipe-down dismiss, Animated.sequence toast, FlatList.scrollToIndex, highlight flash via state]
key_files:
  created: []
  modified:
    - src/components/chat/SendBar.tsx
    - src/screens/chat/ChatRoomScreen.tsx
decisions:
  - "ReplyContext exported from SendBar.tsx (not a separate types file) — keeps interface co-located with the component that owns it"
  - "Toast positioned absolute with bottom: SPACING.xxl; pointerEvents='none' prevents interaction interference"
  - "scrollToMessage sets highlightedId then clears after 1200ms via setTimeout — matches MessageBubble highlight flash duration"
  - "onScrollToIndexFailed calls showToast() directly — treats any FlatList scroll failure as out-of-window (D-11)"
metrics:
  duration: ~10 minutes
  completed: 2026-04-21
  tasks_completed: 2
  files_changed: 2
---

# Phase 14 Plan 04: Integration Wiring Summary

**One-liner:** SendBar extended with 48px reply preview bar (PanResponder swipe-down + × dismiss), ChatRoomScreen wired with FlatList ref, reply state, scrollToMessage with highlight flash, toast, and all MessageBubble callbacks — completing the full reply threading flow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add ReplyContext export and reply preview bar to SendBar.tsx | f0265cd | src/components/chat/SendBar.tsx |
| 2 | Wire ChatRoomScreen — FlatList ref, reply state, scroll-to-original, toast, all callbacks | 6887e7f | src/screens/chat/ChatRoomScreen.tsx |

## Verification Results

1. `npx tsc --noEmit` — zero new errors; only 3 pre-existing out-of-scope errors in `src/app/friends/[id].tsx` — PASS
2. `grep "flatListRef" ChatRoomScreen.tsx` — ref declaration (line 54) and FlatList usage (line 150) — PASS
3. `grep "scrollToMessage" ChatRoomScreen.tsx` — function definition (line 89) and onScrollToMessage prop (line 180) — PASS
4. `grep "replyContext" ChatRoomScreen.tsx` — state declaration (line 57), handleSend usage (line 112), SendBar prop (line 200) — PASS
5. `grep "Scroll up to see the original message" ChatRoomScreen.tsx` — exact match line 194 — PASS
6. `grep "deleteMessage" ChatRoomScreen.tsx` — destructure (line 51) and onDelete prop (line 179) — PASS
7. `grep "ReplyContext" SendBar.tsx` — exported interface present — PASS
8. `grep "PanResponder.create" SendBar.tsx` — present with onMoveShouldSetPanResponder and onPanResponderRelease — PASS
9. `grep "accessibilityLabel=\"Cancel reply\"" SendBar.tsx` — present — PASS
10. `grep "height: 48" SendBar.tsx` — replyBar style present — PASS

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All capabilities are fully implemented and wired end-to-end:
- Long-press → context menu → Reply → reply bar appears (MessageBubble + ChatRoomScreen + SendBar)
- Typing and sending with replyContext passes reply_to_message_id to useChatRoom.sendMessage → DB
- QuotedBlock tap → scrollToMessage → FlatList.scrollToIndex or toast
- Highlight flash plays on the target bubble after successful scroll
- Reply bar dismisses via × button, swipe-down gesture, or after send

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries beyond the plan's threat model. T-14-04-01 through T-14-04-04 all implemented or accepted as designed.

## Self-Check: PASSED

- [x] `src/components/chat/SendBar.tsx` contains `export interface ReplyContext`
- [x] `src/components/chat/SendBar.tsx` contains `PanResponder.create` with swipe-down dismiss
- [x] `src/components/chat/SendBar.tsx` contains `accessibilityLabel="Cancel reply"`
- [x] `src/components/chat/SendBar.tsx` contains `height: 48` in replyBar style
- [x] `src/screens/chat/ChatRoomScreen.tsx` contains `flatListRef = useRef<FlatList<MessageWithProfile>>(null)`
- [x] `src/screens/chat/ChatRoomScreen.tsx` contains `scrollToMessage` with `findIndex`
- [x] `src/screens/chat/ChatRoomScreen.tsx` contains toast with exact copy text
- [x] `src/screens/chat/ChatRoomScreen.tsx` FlatList has `ref={flatListRef}` and `onScrollToIndexFailed`
- [x] Commit `f0265cd` exists in git log
- [x] Commit `6887e7f` exists in git log
