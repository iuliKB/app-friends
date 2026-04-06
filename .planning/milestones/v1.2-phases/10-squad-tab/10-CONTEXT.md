# Phase 10: Squad Tab - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the Squad screen from a "Coming soon" stub into a tabbed layout with Friends and Goals sub-tabs using a custom segmented control. Relocate friend list, add friend FAB, and friend requests row from Profile into the Squad Friends tab. Move the pending request badge from Profile to Squad tab icon. Goals tab shows the existing placeholder content.

</domain>

<decisions>
## Implementation Decisions

### Segmented control style
- Underline style (NOT pill/AddFriend style) — text tabs with underline indicator under active tab
- Active underline uses accent orange (COLORS.interactive.accent)
- Full width layout — each tab takes 50% of screen width
- Light haptic feedback on tab tap (matches existing SegmentedControl pattern using expo-haptics)

### Screen header
- No ScreenHeader title — the segmented control (Friends / Goals) is the top element
- Safe area inset handled by the Squad screen container (paddingTop: insets.top)

### Friends tab layout
- FriendsList component reused as-is with FAB and pull-to-refresh
- "Friend Requests (N)" row placement: Claude's discretion (above list or as FlatList ListHeaderComponent)
- Friend Requests row only visible when pendingCount > 0 — hidden when no requests
- Row navigates to existing `/friends/requests` screen
- FAB visible only on Friends tab, hidden on Goals tab

### Goals tab
- Reuse current squad.tsx content: lock icon + "Group challenges and streaks — coming soon."
- Same design token styling as current stub
- No FAB on Goals tab

### Badge migration
- Move `tabBarBadge` from Profile Tabs.Screen to Squad Tabs.Screen in _layout.tsx
- Single `usePendingRequestsCount` call in _layout.tsx (already exists) — do NOT duplicate

### Claude's Discretion
- Friend Requests row exact placement (above list vs FlatList header)
- Exact spacing between segmented control and tab content
- Whether to extract a reusable TabSwitcher component or inline the implementation
- useFocusEffect vs useEffect for friend data refresh in Squad context

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing tab switcher pattern
- `src/screens/friends/AddFriend.tsx` lines 139-156, 277-303 — Existing tab switcher UI + styles (reference for layout, NOT for visual style — Squad uses underline, not pill)

### Friend management screens (reuse targets)
- `src/screens/friends/FriendsList.tsx` — Complete friend list with FAB, pull-to-refresh, empty state, action sheet
- `src/screens/friends/FriendRequests.tsx` — Friend requests screen (navigated to from row)
- `src/screens/friends/AddFriend.tsx` — Add friend screen (navigated to from FAB)

### Current Squad stub (to be replaced)
- `src/app/(tabs)/squad.tsx` — Current "Coming soon" stub; Goals tab content extracted from here

### Tab layout and badge
- `src/app/(tabs)/_layout.tsx` — Bottom tab configuration, badge assignment, usePendingRequestsCount usage

### Profile friend section (source of relocation)
- `src/app/(tabs)/profile.tsx` lines 141-204 — Friend rows to be relocated (My Friends, Friend Requests, My QR Code)

### Design system
- `src/theme/` — All tokens (colors, spacing, typography, radii, shadows)
- `src/components/common/FAB.tsx` — FAB component with spring animation
- `src/components/common/ScreenHeader.tsx` — NOT used in Squad (decision: no header)
- `src/components/status/SegmentedControl.tsx` — Reference for haptic feedback pattern (NOT visual style)

### Friend hooks
- `src/hooks/useFriends.ts` — Friend data fetching, search, add, remove
- `src/hooks/usePendingRequestsCount.ts` — Realtime pending request count + badge

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FriendsList` component: Self-contained with FlatList, FAB, pull-to-refresh, empty state, action sheet — can be embedded directly in Friends tab
- `FAB` component: Fixed bottom-right positioning with spring animation — conditionally render based on active tab
- `EmptyState` component: Already wired in FriendsList for zero-friends state
- `usePendingRequestsCount` hook: Returns `{ count }` with Realtime subscription — already called in _layout.tsx
- `useFriends` hook: `{ friends, loadingFriends, fetchFriends, removeFriend, searchUsers, sendRequest }`
- `expo-haptics`: Already installed and used in SegmentedControl — import `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`

### Established Patterns
- Design tokens: All styling via `@/theme` imports (COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII)
- Safe area: `useSafeAreaInsets()` for top padding in screen containers
- Navigation: `useRouter()` from expo-router for `router.push()` navigation
- Data refresh: `useFocusEffect` pattern used in profile.tsx for refetch on tab focus
- FlatList: Required for all list views (no ScrollView + map)

### Integration Points
- `src/app/(tabs)/squad.tsx` → deleted, replaced by `src/app/(tabs)/squad/` directory (or kept as single file with conditional rendering)
- `src/app/(tabs)/_layout.tsx` → badge moved from Profile to Squad Tabs.Screen
- Friend sub-screens (`/friends/add`, `/friends/requests`, `/friends/[id]`) stay at root level — navigating to them exits the tab context

</code_context>

<specifics>
## Specific Ideas

- User chose underline tab style specifically to differentiate from the pill-style tab switcher in AddFriend
- Accent orange underline ties the tab control to the Campfire brand
- No screen title means the segmented control is the primary wayfinding element — it should be prominent

</specifics>

<deferred>
## Deferred Ideas

- Moving "My QR Code" from Profile to Squad tab — keep on Profile for now per milestone spec
- Squad Goals real content (group challenges, streaks) — future milestone
- Friends list search/filter — explicitly out of scope for groups of 3-15

</deferred>

---

*Phase: 10-squad-tab*
*Context gathered: 2026-04-04*
