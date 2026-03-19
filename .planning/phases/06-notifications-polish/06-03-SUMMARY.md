---
phase: 06-notifications-polish
plan: "03"
subsystem: ui-polish
tags: [profile, empty-states, loading-indicators, status-colors, navigation]
dependency_graph:
  requires: [06-01, 06-02]
  provides: [profile-avatar-header, notification-toggle, ui-consistency]
  affects: [profile-tab, home-screen, plans-list, chat-list, friends-list, friend-requests, plan-dashboard, rsvp-buttons]
tech_stack:
  added: []
  patterns:
    - EmptyState shared component used across all 5 list screens
    - LoadingIndicator shared component replacing inline ActivityIndicators
    - COLORS.status token used for all RSVP status colors
    - MemberList extended with onMemberPress callback for navigation
key_files:
  created: []
  modified:
    - src/app/(tabs)/profile.tsx
    - src/screens/home/HomeScreen.tsx
    - src/screens/plans/PlansListScreen.tsx
    - src/screens/chat/ChatListScreen.tsx
    - src/screens/friends/FriendsList.tsx
    - src/screens/friends/FriendRequests.tsx
    - src/screens/plans/PlanDashboardScreen.tsx
    - src/screens/friends/AddFriend.tsx
    - src/components/plans/RSVPButtons.tsx
    - src/components/plans/MemberList.tsx
decisions:
  - Profile tab fetches display_name+avatar_url on useFocusEffect to reflect edits from Edit Profile screen
  - MemberList extended with onMemberPress prop instead of adding router in component — keeps component pure
  - FriendsList handleViewProfile navigates to /friends/[friend_id] replacing Alert.alert placeholder
metrics:
  duration: 6
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_modified: 10
---

# Phase 6 Plan 3: Profile Redesign + UI Consistency Audit Summary

Profile tab redesigned with 80px AvatarCircle header, pencil overlay, display name, and AsyncStorage-backed notification toggle. All 5 list screens now use shared EmptyState with spec-compliant copy. Full-screen loaders replaced with LoadingIndicator. RSVPButtons uses COLORS.status tokens. View Profile in FriendActionSheet and member taps in PlanDashboard navigate to /friends/[id].

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Profile tab redesign — avatar header, edit link, notification toggle | 1545ec4 | src/app/(tabs)/profile.tsx |
| 2 | UI audit — empty states, loading indicators, status colours, view profile wiring | 955eeb9 | 9 files |

## Decisions Made

- Profile tab fetches `display_name` and `avatar_url` inside `useFocusEffect` so edits made on Edit Profile screen are reflected immediately on return.
- `MemberList` extended with optional `onMemberPress` callback prop (passes `userId`) rather than importing `router` into the component directly — keeps MemberList a pure display component.
- `FriendsList.handleViewProfile` wired to `router.push(/friends/${selectedFriend.friend_id})` replacing the Phase 6 placeholder `Alert.alert('Coming soon', ...)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] RSVPButtons hardcoded style colors also replaced**
- **Found during:** Task 2
- **Issue:** `buttonInactive` style had hardcoded `#2a2a2a` and `#3f3f46` instead of `COLORS.secondary` and `COLORS.border`
- **Fix:** Replaced with COLORS tokens for full consistency
- **Files modified:** src/components/plans/RSVPButtons.tsx
- **Commit:** 955eeb9

None of the other changes deviated from the plan. All 10 files audited as specified.

## Verification Results

- `npx expo lint`: 0 errors, 9 pre-existing warnings (all in unrelated files)
- All acceptance criteria verified via grep checks
- EmptyState instances: HomeScreen, PlansListScreen, ChatListScreen, FriendsList, FriendRequests
- LoadingIndicator instances: ChatListScreen, PlanDashboardScreen, AddFriend
- COLORS.status usage confirmed in RSVPButtons, no hardcoded hex remaining
- FriendsList navigates to /friends/[id] on View Profile
- PlanDashboardScreen navigates to /friends/[id] on member tap (skips current user)

## Self-Check: PASSED

- src/app/(tabs)/profile.tsx: FOUND
- src/components/plans/MemberList.tsx: FOUND
- Commit 1545ec4: FOUND
- Commit 955eeb9: FOUND
