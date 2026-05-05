---
phase: 25-auth-onboarding-errors
plan: "03"
subsystem: ui
tags: [error-handling, ErrorDisplay, screens, AUTH-03]
dependency_graph:
  requires:
    - phase: 25-02
      provides: [useHomeScreen.refetch, useFriends.error, useFriends.refetch, useChatRoom.refetch]
  provides:
    - HomeScreen ErrorDisplay screen mode on hook error
    - FriendsList ErrorDisplay screen mode on hook error
    - FriendRequests ErrorDisplay screen mode on hook error
    - AddFriend ErrorDisplay screen mode on hook error
    - ChatListScreen ErrorDisplay screen mode on hook error
    - ChatRoomScreen ErrorDisplay screen mode on hook error
  affects: [src/screens/home, src/screens/friends, src/screens/chat]
tech-stack:
  added: []
  patterns: [ErrorDisplay early-return pattern — if (error) return <View flex:1><ErrorDisplay mode="screen" onRetry={refetch}/></View>]
key-files:
  created: []
  modified:
    - src/screens/home/HomeScreen.tsx
    - src/screens/friends/FriendsList.tsx
    - src/screens/friends/FriendRequests.tsx
    - src/screens/friends/AddFriend.tsx
    - src/screens/chat/ChatListScreen.tsx
    - src/screens/chat/ChatRoomScreen.tsx
key-decisions:
  - "FriendRequests onRetry wired to fetchPendingRequests (not refetch alias) — it loads pendingRequests, not friends list"
  - "ChatListScreen uses handleRefresh as refetch — already the correct refresh function for that hook"
  - "Error guard placed after all hook calls and after loading guard, before main content return — satisfies hooks-must-run-unconditionally rule"
patterns-established:
  - "AUTH-03 screen error guard: if (error) early-return with <View flex:1 bg:surface.base><ErrorDisplay mode=screen onRetry={refetch}/></View>"
requirements-completed: [AUTH-03]
duration: ~10 minutes
completed: "2026-05-05"
---

# Phase 25 Plan 03: Screen Error States Batch 1 (AUTH-03) Summary

**Six screens wired with ErrorDisplay mode='screen' early-return guards — blank screens on network errors replaced with actionable retry UI across HomeScreen, FriendsList, FriendRequests, AddFriend, ChatListScreen, and ChatRoomScreen.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-05T00:00:00Z
- **Completed:** 2026-05-05
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- HomeScreen replaces inline error Text with ErrorDisplay mode='screen' early-return, wired to useHomeScreen.refetch
- All five remaining screens (FriendsList, FriendRequests, AddFriend, ChatListScreen, ChatRoomScreen) receive identical ErrorDisplay screen-mode error guards
- Every retry button wired to the appropriate refetch/refresh function from the hook
- All ErrorDisplay wrappers use `{ flex: 1, backgroundColor: colors.surface.base }` inline style as specified

## Task Commits

1. **Task 1: Add ErrorDisplay to HomeScreen** - `a2c36b8` (feat)
2. **Task 2: Add ErrorDisplay to friends and chat screens** - `7ceff8b` (feat)

## Files Created/Modified

- `src/screens/home/HomeScreen.tsx` - Added ErrorDisplay import, refetch destructure, error early-return; removed old inline error Text and unused errorText style
- `src/screens/friends/FriendsList.tsx` - Added ErrorDisplay import, error/refetch destructure, error early-return before main FlatList render
- `src/screens/friends/FriendRequests.tsx` - Added ErrorDisplay import, error destructure, error early-return with onRetry={fetchPendingRequests}
- `src/screens/friends/AddFriend.tsx` - Added ErrorDisplay import, error/refetch destructure, error early-return before search/QR UI
- `src/screens/chat/ChatListScreen.tsx` - Added ErrorDisplay import, error destructure, error early-return after loading guard with onRetry={handleRefresh}
- `src/screens/chat/ChatRoomScreen.tsx` - Added ErrorDisplay import, error/refetch destructure, error early-return before message list render

## Decisions Made

- FriendRequests wires `onRetry={fetchPendingRequests}` directly — this screen shows `pendingRequests`, not `friends`, so the `refetch` alias (which calls `fetchFriends`) would fetch the wrong data
- ChatListScreen uses `handleRefresh` as the refetch — it is the existing designated refresh function for that hook and already exposed
- AddFriend error guard placed after all hooks and the styles useMemo — correctly handles React hooks ordering without conditional hook calls

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — all error messages are hardcoded copy strings; no Supabase error details forwarded to UI.

## Self-Check: PASSED

- src/screens/home/HomeScreen.tsx: FOUND, contains `ErrorDisplay`, `mode="screen"`, `onRetry={refetch}`, `"Couldn't load your feed. Check your connection."`
- src/screens/friends/FriendsList.tsx: FOUND, contains `ErrorDisplay`, `mode="screen"`, `"Couldn't load your friends."`
- src/screens/friends/FriendRequests.tsx: FOUND, contains `ErrorDisplay`, `mode="screen"`, `"Couldn't load friend requests."`
- src/screens/friends/AddFriend.tsx: FOUND, contains `ErrorDisplay`, `mode="screen"`, `"Couldn't load results."`
- src/screens/chat/ChatListScreen.tsx: FOUND, contains `ErrorDisplay`, `mode="screen"`, `"Couldn't load your chats."`
- src/screens/chat/ChatRoomScreen.tsx: FOUND, contains `ErrorDisplay`, `mode="screen"`, `"Couldn't load messages."`
- Commits: a2c36b8, 7ceff8b — both present in git log

---
*Phase: 25-auth-onboarding-errors*
*Completed: 2026-05-05*
