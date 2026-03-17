---
phase: 02-friends-status
plan: 01
subsystem: ui
tags: [react-native, supabase, friends, social, hooks, flatlist, modal, bottomsheet]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: Supabase client, useAuthStore session, AvatarCircle, PrimaryButton, COLORS, types/app.ts, database types with friendships + statuses + profiles

provides:
  - useFriends hook with get_friends RPC, pending requests, send/accept/reject/remove, searchUsers
  - usePendingRequestsCount hook for badge display
  - StatusPill component for coloured Free/Busy/Maybe badge
  - FriendCard component with AvatarCircle + display name + status pill
  - FriendActionSheet bottom sheet with 3 actions + inline remove confirmation
  - RequestCard for pending friend requests with accept/decline buttons
  - SearchResultCard for username search results with Add Friend/Pending states
  - FriendsList screen with FlatList, FAB, empty state
  - FriendRequests screen with accept/reject flow
  - AddFriend screen with search tab + QR placeholder
  - friends/ route group with _layout, index, requests, add
  - Profile tab rows: My Friends (N), Friend Requests (N), My QR Code
  - Tab bar badge showing pending request count

affects:
  - 02-02: QR code plan replaces QR placeholder tab in AddFriend
  - 02-03: Status hooks used in Profile tab (already integrated)
  - 03-squad: friends list used for Squad/Home feeds
  - 05-chat: onStartDM stub in FriendActionSheet is wired up

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useFriends hook pattern: all friend DB operations in a single hook with per-operation loading state
    - usePendingRequestsCount pattern: lightweight count-only query for badge display
    - Thin route shell pattern: app/friends/*.tsx re-export screen components
    - Mount-only useEffect with eslint-disable comment for one-time data fetching

key-files:
  created:
    - src/hooks/useFriends.ts
    - src/hooks/usePendingRequestsCount.ts
    - src/components/friends/StatusPill.tsx
    - src/components/friends/FriendCard.tsx
    - src/components/friends/FriendActionSheet.tsx
    - src/components/friends/RequestCard.tsx
    - src/components/friends/SearchResultCard.tsx
    - src/screens/friends/FriendsList.tsx
    - src/screens/friends/FriendRequests.tsx
    - src/screens/friends/AddFriend.tsx
    - src/app/friends/_layout.tsx
    - src/app/friends/index.tsx
    - src/app/friends/requests.tsx
    - src/app/friends/add.tsx
  modified:
    - src/app/(tabs)/profile.tsx
    - src/app/(tabs)/_layout.tsx

key-decisions:
  - "FriendWithStatus type exported from useFriends.ts hook — screens and components use this shared type"
  - "FriendsList screen does not import usePendingRequestsCount — badge lives in the route file (index.tsx) instead"
  - "router.push('/qr-code' as never) used for forward-reference route — Plan 02 will create the actual screen"
  - "eslint-disable-next-line react-hooks/exhaustive-deps for mount-only fetch effects — adding function deps would cause infinite loops"

patterns-established:
  - "Route shell pattern: app/friends/*.tsx is a thin shell that renders a Stack.Screen + the screen component"
  - "Hook operations return { data, error } tuples for uniform error handling at call site"

requirements-completed: [FRND-01, FRND-02, FRND-03, FRND-04, FRND-05]

# Metrics
duration: 8min
completed: 2026-03-18
---

# Phase 02 Plan 01: Friends System Summary

**Complete friend social graph with search-by-username, send/accept/reject/remove, friends list sorted by status, action bottom sheet, and Profile tab integration rows using Supabase friendships table and get_friends RPC**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-18T14:31:07Z
- **Completed:** 2026-03-18T14:39:31Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- Built 5 friend components (StatusPill, FriendCard, FriendActionSheet, RequestCard, SearchResultCard) and 2 hooks (useFriends, usePendingRequestsCount) all TypeScript-clean
- Built 3 friend screens and 4 route files covering list, requests, and add flows with correct Expo Router stack navigation
- Updated Profile tab with My Friends, Friend Requests, My QR Code rows with count badges, and wired tab bar badge to pending request count

## Task Commits

Each task was committed atomically:

1. **Task 1: Create hooks and friend components** - `85d8fe0` (feat)
2. **Task 2: Create friend screens, routes, and update Profile tab** - `55ab483` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/hooks/useFriends.ts` - All friend operations: get_friends RPC, status merge, send/accept/reject/remove, search
- `src/hooks/usePendingRequestsCount.ts` - Lightweight count query for badge display
- `src/components/friends/StatusPill.tsx` - Coloured status badge (Free/Busy/Maybe)
- `src/components/friends/FriendCard.tsx` - Friend row: avatar + name + username + status pill
- `src/components/friends/FriendActionSheet.tsx` - Animated bottom sheet: View profile, Start DM, Remove friend with inline confirmation
- `src/components/friends/RequestCard.tsx` - Pending request row with accept/decline buttons and relative time
- `src/components/friends/SearchResultCard.tsx` - Search result with Add Friend/Pending/loading button states
- `src/screens/friends/FriendsList.tsx` - Friends list with FlatList, FAB, empty state, action sheet integration
- `src/screens/friends/FriendRequests.tsx` - Pending requests with per-card accept/reject loading state
- `src/screens/friends/AddFriend.tsx` - Debounced username search with QR placeholder tab
- `src/app/friends/_layout.tsx` - Stack layout with dark header
- `src/app/friends/index.tsx` - Friends list route with pending badge in header
- `src/app/friends/requests.tsx` - Friend requests route shell
- `src/app/friends/add.tsx` - Add friend route shell
- `src/app/(tabs)/profile.tsx` - Added My Friends, Friend Requests, My QR Code rows with badges
- `src/app/(tabs)/_layout.tsx` - Added tabBarBadge to profile tab

## Decisions Made

- FriendWithStatus type exported from useFriends.ts so screens and components share it
- Badge in FriendsList header lives in the route file (index.tsx), not in the screen component, so the screen stays header-agnostic
- `router.push('/qr-code' as never)` used for the QR Code row as a forward-reference — Plan 02 creates the actual screen
- Mount-only useEffect with eslint-disable for fetch-on-mount pattern since adding functions to deps would cause infinite loops

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Profile tab already had SegmentedControl and EmojiTagPicker from a prior plan (02-03 ran before 02-01). The file was updated to add the friends rows while preserving all existing status functionality. TypeScript compilation confirmed zero conflicts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Friends system fully wired to Supabase friendships table — ready for Plan 02 (QR code) to replace the placeholder tab
- useFriends and usePendingRequestsCount ready for use in Squad/Home feeds (Phase 3)
- FriendActionSheet's onStartDM stub wired to Phase 5 DM infrastructure

## Self-Check: PASSED

All 16 files verified present. Both task commits (85d8fe0, 55ab483) confirmed in git history.

---
*Phase: 02-friends-status*
*Completed: 2026-03-18*
