---
phase: 26-home-chat-polish
plan: "05"
subsystem: chat
tags: [chat, optimistic-ui, haptics, retry, failed-state]
dependency_graph:
  requires: [26-01]
  provides: [CHAT-02-haptic-reaction, CHAT-03-optimistic-send-failure]
  affects: [src/types/chat.ts, src/hooks/useChatRoom.ts, src/components/chat/MessageBubble.tsx, src/screens/chat/ChatRoomScreen.tsx]
tech_stack:
  added: []
  patterns: [optimistic-ui-failure-state, haptic-feedback, retry-pattern]
key_files:
  created: []
  modified:
    - src/types/chat.ts
    - src/hooks/useChatRoom.ts
    - src/components/chat/MessageBubble.tsx
    - src/screens/chat/ChatRoomScreen.tsx
decisions:
  - "failed: true mutation on sendMessage error replaces prev.filter remove — user sees content and can retry"
  - "retryMessage filters failed entry then calls sendMessage — clean re-send via same path"
  - "onRetry wrapped in void cast in ChatRoomScreen — retryMessage returns Promise but onRetry prop is void"
  - "clock icon uses rgba(245,245,245,0.5) hardcoded with eslint-disable-next-line — transparency overlay not in token set"
metrics:
  duration_minutes: 25
  completed_date: "2026-05-05"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
---

# Phase 26 Plan 05: Optimistic Send UI + Retry Summary

**One-liner:** Optimistic send failure with visible failed state (red border, retry tap) and pending state (0.7 opacity, clock icon) plus reaction haptic, all wired through hook → screen → bubble.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend Message type + useChatRoom failure path + retryMessage | 4fbe1af | src/types/chat.ts, src/hooks/useChatRoom.ts |
| 2 | MessageBubble pending/failed visual states + reaction haptic | 3970b1a | src/components/chat/MessageBubble.tsx |
| 3 | Wire retryMessage through ChatRoomScreen to MessageBubble | 536074b | src/screens/chat/ChatRoomScreen.tsx |

## What Was Built

**CHAT-03 — Optimistic send failure UI:**
- `Message.failed?: boolean` added to the type (`src/types/chat.ts`)
- `sendMessage` failure path changed from `prev.filter(remove)` to `prev.map(mark failed: true, pending: false)` — user sees their content and can retry
- `retryMessage(tempId, body)` added: filters the failed entry then calls `sendMessage` with the original body
- `MessageBubble` renders pending text bubbles at 0.7 opacity with a clock icon (`Ionicons time-outline`) and "Sending…" label
- `MessageBubble` renders failed text bubbles with a 2px red border (`colors.interactive.destructive`) and a "Tap to retry" touchable
- `ChatRoomScreen` destructures `retryMessage` and passes `onRetry={(tempId, body) => void retryMessage(tempId, body)}` to MessageBubble

**CHAT-02 — Reaction haptic (second trigger):**
- `void Haptics.selectionAsync()` fires in the emoji strip `onPress` handler when a user taps a reaction emoji in the context menu

## Verification

```
npx tsx tests/unit/useChatRoom.send.test.ts
Results: 6 passed, 0 failed
```

All three files show expected patterns in grep:
- `failed.*true` in useChatRoom.ts sendMessage failure path
- `retryMessage` in useChatRoom.ts (interface, function body, return object)
- `onRetry` in MessageBubble.tsx (props interface, destructure, onPress handler)
- `retryMessage` and `onRetry` in ChatRoomScreen.tsx

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality is fully wired.

## Threat Flags

No new security surface introduced. All threats accepted per plan threat model:
- T-26-09: retryMessage body from `message.body` (own content, no external input)
- T-26-10: `failed: true` is local-only state, never persisted to Supabase
- T-26-11: `selectionAsync()` vibration only, no permission required

## Self-Check: PASSED

- src/types/chat.ts — modified, contains `failed?: boolean` ✓
- src/hooks/useChatRoom.ts — modified, contains `failed: true` mutation + `retryMessage` ✓
- src/components/chat/MessageBubble.tsx — modified, contains pending/failed styles + haptic ✓
- src/screens/chat/ChatRoomScreen.tsx — modified, contains `retryMessage` destructure + `onRetry` prop ✓
- Commits 4fbe1af, 3970b1a, 536074b exist in git log ✓
- Unit tests: 6/6 passed ✓
