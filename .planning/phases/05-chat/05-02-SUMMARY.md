---
phase: 05-chat
plan: "02"
subsystem: chat
tags: [chat, zustand, supabase, navigation, friends]
dependency_graph:
  requires: ["05-01"]
  provides: ["chat-list-screen", "dm-creation-flow"]
  affects: ["chat-tab", "friends-tab"]
tech_stack:
  added: []
  patterns: [zustand-cache, useFocusEffect-refresh, rpc-navigation]
key_files:
  created:
    - src/stores/useChatStore.ts
    - src/hooks/useChatList.ts
    - src/components/chat/ChatListRow.tsx
    - src/screens/chat/ChatListScreen.tsx
  modified:
    - src/app/(tabs)/chat/index.tsx
    - src/screens/friends/FriendsList.tsx
    - src/components/friends/FriendActionSheet.tsx
decisions:
  - "formatRelativeTime duplicated inline in ChatListRow — avoids coupling to MessageBubble internals"
  - "useChatList cache check uses 30s TTL matching plan spec; manual refresh always bypasses cache"
  - "FriendActionSheet disabledRow opacity 0.5 on loadingDM — visual feedback without layout shift"
metrics:
  duration_min: 3
  completed_date: "2026-03-19"
---

# Phase 5 Plan 02: Chat List Screen and DM Navigation Summary

Chat list tab built with Zustand cache, multi-query hook, and row component; DM creation wired from friend card via `get_or_create_dm_channel` RPC with loading indicator.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Chat store, useChatList hook, ChatListRow | 6502160 | useChatStore.ts, useChatList.ts, ChatListRow.tsx |
| 2 | ChatListScreen, chat tab wiring, DM navigation | 7be6783 | ChatListScreen.tsx, index.tsx, FriendsList.tsx, FriendActionSheet.tsx |

## What Was Built

**useChatStore** — Zustand store matching usePlansStore pattern: `chatList: ChatListItem[]`, `lastFetchedAt`, `setChatList`.

**useChatList** — Multi-step Supabase query hook:
1. Fetches user's plan memberships from `plan_members`
2. Fetches user's DM channels from `dm_channels` (user_a OR user_b)
3. Fetches latest message per plan chat (deduped, most-recent-first ordering)
4. Fetches latest message per DM channel (deduped)
5. Fetches plan titles and friend profiles for display
6. Checks `AsyncStorage` `chat:last_read:{id}` keys for unread status
7. Sorts merged list by `lastMessageAt` descending
8. Refreshes on tab focus via `useFocusEffect`; 30s cache prevents redundant fetches

**ChatListRow** — Single row: campfire emoji (plan) or AvatarCircle (DM), title, last message preview, relative time, blue unread dot (`#3b82f6`). Fixed height 72px.

**ChatListScreen** — FlatList of ChatListRow with pull-to-refresh, indented separator (marginLeft: 68), loading spinner, empty state ("No chats yet" + descriptive text + chatbubble-outline icon).

**chat/index.tsx** — Replaced "Coming soon" placeholder with `ChatListScreen`.

**FriendsList.tsx** — `handleStartDM` now calls `supabase.rpc('get_or_create_dm_channel', { other_user_id })`, shows error on failure, closes sheet, pushes to `/chat/room?dm_channel_id=X&friend_name=Y`.

**FriendActionSheet.tsx** — Added `loadingDM?: boolean` prop; "Start DM" row shows `ActivityIndicator` instead of chatbubble icon during RPC, row disabled with opacity 0.5.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- src/stores/useChatStore.ts — exists, exports `useChatStore`
- src/hooks/useChatList.ts — exists, exports `useChatList`
- src/components/chat/ChatListRow.tsx — exists, exports `ChatListRow`
- src/screens/chat/ChatListScreen.tsx — exists, exports `ChatListScreen`
- Commits 6502160 and 7be6783 confirmed in git log
