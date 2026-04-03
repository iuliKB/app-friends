# Feature Research

**Domain:** Tab-based social screen with top tabs (Friends / Goals), bottom nav restructure
**Researched:** 2026-04-04
**Confidence:** HIGH (codebase directly audited; patterns from Expo Router official docs + established mobile UX conventions)

---

## Context

This is a SUBSEQUENT MILESTONE (v1.2). All social features already exist and work — friend list, add friend, friend requests, QR code add. The existing implementation is scattered: friend management lives under Profile tab; the Squad tab is a "coming soon" stub; bottom nav order does not reflect how users navigate to social content.

**What's changing:**
- Squad tab gains top tabs (Friends / Goals)
- Friend management screens move from Profile → Squad
- Bottom nav reordered: Home | Squad | Explore | Chats | Profile
- Plans tab renamed → Explore
- Chat tab renamed → Chats
- Profile tab simplified (friend rows removed)

**What already exists (do not rebuild):**
- `FriendsList` screen component (`src/screens/friends/FriendsList.tsx`)
- `AddFriend` screen component with Search / QR tab switcher (`src/screens/friends/AddFriend.tsx`)
- `FriendRequests` screen component (`src/screens/friends/FriendRequests.tsx`)
- All friend-related hooks, components, and Supabase RPCs
- `usePendingRequestsCount` hook (drives badge count)
- `ScreenHeader`, `FAB`, `EmptyState`, full design token system

**Expo/navigation version context:**
- Expo 55 / expo-router ~55.0.5
- `@react-navigation/bottom-tabs` ^7.7.3 (already installed)
- `react-native-reanimated` 4.2.1 (already installed)
- No `@react-navigation/material-top-tabs` installed yet

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a social app with a dedicated friends tab. Missing these = the Squad tab feels broken or half-done.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Top tab bar in Squad screen (Friends / Goals) | Any app with two sibling content areas in a tab uses top tabs. Instagram, Twitter, LinkedIn all use this pattern for profile sub-sections. Without it, Users can't switch between Friends and Goals. | MEDIUM | Two implementation paths: (A) custom segmented control + conditional rendering (same pattern as AddFriend's Search/QR switcher), (B) `@react-navigation/material-top-tabs` library. Path A avoids a new dependency. Path B gives swipe gesture support and standard animated indicator. Given Expo Go constraint, Path A is lower risk. |
| Friend list visible immediately when landing on Squad | Users tapping "Squad" expect to see their friends, not a loading spinner. The Friends tab should be the default active tab. | LOW | Set Friends as index/default tab. Friends data fetches on mount with existing `useFriends` hook. |
| Pending request count badge on Squad tab icon | Users expect a visual cue that someone sent them a request, regardless of which tab they're on. Current: badge is on Profile tab. New: badge moves to Squad tab. | LOW | `usePendingRequestsCount` hook already exists. Move the `tabBarBadge` prop from the Profile `Tabs.Screen` to the Squad `Tabs.Screen` in `_layout.tsx`. |
| Pending request indicator within Friends sub-tab | Users should see how many pending requests exist without tapping into them. Currently: row with count badge in Profile. New: row or button within Friends tab. | LOW | Re-expose `pendingCount` from `usePendingRequestsCount` inside the Friends tab header or as a tappable row. Pattern already exists in Profile screen — extract and relocate. |
| Add Friend accessible from Friends tab | Users add friends from the context of their friend list, not from Settings/Profile. | LOW | FAB (already exists in FriendsList component) navigates to `/friends/add`. No change to the FAB itself — just ensure the route still resolves from the new Squad context. |
| Friend Requests accessible from Friends tab | Users managing friend requests do so from the friends context. Currently: navigates from Profile. New: navigates from Squad → Friends. | LOW | Route `/friends/requests` already exists as a Stack screen. Add a tappable row or header button within Friends tab that navigates there. |
| Goals tab placeholder | Users landing on Goals tab should see a clear "coming soon" message, not a crash or blank screen. | LOW | Current squad.tsx has the coming-soon content. Extract it to the Goals sub-tab. Identical to the current stub. |
| Bottom nav in correct order: Home → Squad → Explore → Chats → Profile | Users navigate by mental model (who's free → my people → activities → messages → me). The current order buries Squad. | LOW | Reorder `Tabs.Screen` entries in `(tabs)/_layout.tsx`. Rename `plans` → `explore` (file rename required) and `chat` → `chats` (file rename required). |
| "Explore" tab keeps all existing Plans functionality | Renaming the tab must not affect functionality. Users expect the same plan creation, RSVP, dashboard flows. | LOW | File rename + tab title change. No logic changes. The Plans screens, hooks, and Supabase queries are all unaffected. |
| "Chats" tab keeps all existing Chat functionality | Same as Explore — pure rename, zero logic change. | LOW | File rename + tab title change only. |

### Differentiators (Competitive Advantage)

Features that make the Squad tab feel purposeful for a small friend-group app, not just a generic social screen.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Friend status visible in Friends list (Free/Busy/Maybe) | The app's core value is knowing who's free. The friends list already shows status (FriendCard component renders it). Having this immediately visible in Squad reinforces the daily habit. | LOW | FriendCard already displays status. No new work — the feature exists. Benefit comes from positioning: users who open Squad → Friends now see availability in a dedicated social context, not buried in Profile. |
| Pending requests indicator styled as actionable row | Showing a count badge + tappable row (not just a header notification icon) makes it clear what action is available. Apps like Snapchat and Instagram use inline "X pending requests" rows at the top of friends lists. | LOW | Existing pattern from Profile screen. Extract `TouchableOpacity` row + badge into the Friends tab. Add it above the friend list, conditionally render when `pendingCount > 0`. |
| "My QR Code" accessible from Friends tab | Users share their QR code in the social context (adding new friends). Having it in Squad is more discoverable than Settings/Profile. | LOW | Move the QR code row from Profile to a header button or row within the Friends tab. Route `/qr-code` already exists as a Stack screen. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Swipe gesture between Friends and Goals tabs | Material top tabs support swipe navigation, which feels native and polished. | Requires `@react-navigation/material-top-tabs` + `react-native-tab-view`. Adds a new dependency that must work in Expo Go managed workflow. Swipe also conflicts with pull-to-refresh gesture on the Friends list (horizontal vs vertical swipe ambiguity). | Custom segmented control (same as AddFriend's Search/QR tabs) renders identically, avoids the dependency, avoids the gesture conflict. No library needed. |
| Nested Stack navigator inside Squad top tabs | Some apps have full navigation stacks nested inside each top tab so forward/back stays within the tab. | Creates complex nested navigator hierarchy in Expo Router. Squad → Friends tab → Add Friend would require a nested stack. Expo Router's file-based routing and Stack navigators outside the tabs handle this more cleanly. | Keep `/friends/add` and `/friends/requests` as Stack screens outside the Squad tab. Navigating "into" them exits the tab context temporarily — standard mobile UX, no confusion. |
| Animated sliding indicator for top tabs | A sliding underline or pill indicator on the tab bar looks polished. | Requires Reanimated shared values and layout measurements. Adds non-trivial complexity for a 2-tab control used in one screen. Reanimated is installed but adding layout-measurement animation for a top tab bar is a meaningful scope increase. | Static active state styling (background color + font weight change) is visually clear and consistent with AddFriend's own tab switcher. Sufficient for two tabs. |
| Paginated/lazy-loaded friends list | For large friend lists, lazy loading improves performance. | App targets groups of 3–15 people. A 15-item FlatList does not need pagination. Adding pagination adds code complexity and loading states for no user benefit. | FlatList already handles all-at-once rendering efficiently for this scale. Pull-to-refresh covers the refresh case. |
| Friends list search/filter | Users want to find specific friends quickly. | For ≤15 friends, search adds UI complexity that exceeds the problem. Scrolling 15 rows is faster than typing a search query. | Alphabetical sort by display name in the list. FlatList `ListHeaderComponent` can add a search bar as a v2 feature if friend count grows. |

---

## Feature Dependencies

```
Squad tab top tabs (Friends / Goals)
  └──requires──> Squad screen converted from single view to tabbed layout
                     └──requires──> Tab switcher component (custom segmented) OR new library

Friends tab content
  └──reuses──> FriendsList screen component (no changes)
  └──reuses──> useFriends hook (no changes)
  └──reuses──> FriendCard component (no changes)
  └──requires──> Safe area + header wiring in new Squad tab layout

Pending requests indicator in Squad tab (bottom nav badge)
  └──requires──> Move tabBarBadge from Profile → Squad in _layout.tsx
  └──requires──> Remove pendingCount badge from Profile Tabs.Screen

Pending requests row in Friends sub-tab
  └──requires──> usePendingRequestsCount hook (already exists)
  └──enhances──> Friends tab discoverability

Bottom nav reorder
  └──requires──> Reorder Tabs.Screen entries in (tabs)/_layout.tsx
  └──requires──> Rename plans.tsx → explore.tsx (file rename)
  └──requires──> Rename chat/ directory → chats/ (file rename)
  └──conflicts──> Any hardcoded navigation pushes to '/plans' or '/chat'

Plans → Explore rename
  └──requires──> File rename src/app/(tabs)/plans.tsx → explore.tsx
  └──requires──> Update tab title string 'Plans' → 'Explore'
  └──requires──> Audit all router.push('/plans') references

Chat → Chats rename
  └──requires──> Rename src/app/(tabs)/chat/ directory → chats/
  └──requires──> Update tab title string 'Chat' → 'Chats'
  └──requires──> Audit all router.push('/chat/...') references

Profile tab simplification
  └──requires──> Remove Friends section rows from profile.tsx
  └──requires──> Remove useFriends import from profile.tsx (if no longer used there)
  └──requires──> Remove usePendingRequestsCount import from profile.tsx
  └──conflicts with──> Friends tab not yet working (remove from Profile only after Squad is wired)
```

### Dependency Notes

- **Bottom nav reorder is independent of Squad tab content.** Tab labels and order are purely `_layout.tsx` config. Can be done in isolation or in parallel with Squad content work.
- **Profile simplification should happen last.** Remove friend rows from Profile only after the Squad tab has the same functionality. Users should never lose access to friend management mid-migration.
- **Route path changes need an audit.** Plans tab renaming (file rename) will break any existing `router.push('/plans')` calls. Chat tab renaming will break `/chat/room` etc. Full audit of all push/navigate calls is mandatory before file rename.
- **Goals tab is a stub.** No new logic needed. Extract the existing "coming soon" content from squad.tsx into the Goals sub-tab.

---

## MVP Definition

### This Milestone (v1.2)

The goal is: Squad tab fully replaces friend management from Profile; navigation order and naming reflects the intended information architecture.

- [ ] Squad screen converted to top-tab layout (Friends / Goals) using custom segmented control
- [ ] Friends sub-tab renders FriendsList component with FAB for Add Friend
- [ ] Friends sub-tab shows pending request count row (navigates to /friends/requests)
- [ ] Goals sub-tab shows "coming soon" placeholder (extracted from current squad.tsx)
- [ ] Bottom nav badge (pending count) moved from Profile to Squad tab
- [ ] Bottom nav reordered: Home | Squad | Explore | Chats | Profile
- [ ] Plans tab renamed to Explore (file renamed, tab title updated, route audit done)
- [ ] Chat tab renamed to Chats (directory renamed, tab title updated, route audit done)
- [ ] Profile tab: Friends section rows removed (My Friends, Friend Requests, My QR Code rows)
- [ ] Profile tab: Friend-related imports removed (useFriends, usePendingRequestsCount)

### Confirmed Out of Scope for v1.2

- [ ] QR code moved to Squad — possible, but Profile QR code row still makes sense as personal identity. Defer unless design decision changes.
- [ ] Goals tab real content — deferred to future milestone
- [ ] Swipe gestures between top tabs — anti-feature (see above)
- [ ] Friends list search — anti-feature at this scale

### Future Consideration (v2+)

- [ ] Goals tab real content (group challenges, streaks)
- [ ] Friends list search/filter (if group size grows beyond 15)
- [ ] QR code accessible from Squad tab (if user research shows Profile is wrong home for it)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Squad top tabs (Friends/Goals) | HIGH — makes Squad tab usable | MEDIUM — custom segmented control wiring | P1 |
| Friends tab content (FriendsList + FAB) | HIGH — core relocation | LOW — reuse existing screen component | P1 |
| Pending request row in Friends tab | HIGH — discoverability of requests | LOW — extract existing pattern from Profile | P1 |
| Badge moved to Squad tab | HIGH — notification in right place | LOW — one line in _layout.tsx | P1 |
| Bottom nav reorder | HIGH — information architecture | LOW — reorder Tabs.Screen entries | P1 |
| Plans → Explore rename | MEDIUM — clearer label | LOW — file rename + title update + route audit | P1 |
| Chat → Chats rename | LOW — plural consistency | LOW — same as above | P1 |
| Profile simplification (remove friends) | MEDIUM — cleaner Profile screen | LOW — delete rows, remove imports | P1 (last step) |
| Goals stub content | LOW — placeholder only | LOW — copy existing squad.tsx content | P1 |

**Priority key:**
- P1: Required for the milestone to achieve its goal
- P2: Improves the system but milestone succeeds without it
- P3: Nice to have, future consideration

---

## Implementation Notes for Roadmap

### Top Tab Implementation Approach

Use a custom segmented control (same visual pattern as `AddFriend`'s Search/QR switcher) rather than `@react-navigation/material-top-tabs`. Reasons:

1. Zero new dependencies — stays within Expo Go managed workflow constraints
2. Identical visual style to the existing two-tab pattern already in the app
3. Avoids horizontal swipe conflict with vertical pull-to-refresh on the friends list
4. AddFriend already proves the pattern works for exactly 2 tabs
5. No layout measurement animation needed — static active state is sufficient

The implementation is: top-level `View` with `SegmentedControl`-style header + conditional rendering of `FriendsList` or `GoalsPlaceholder` based on `activeTab` state.

### Route Audit Requirement

Before renaming `plans.tsx` → `explore.tsx` and `chat/` → `chats/`, run a full audit of all `router.push`, `router.replace`, `router.navigate`, and `href` strings in the codebase. Expo Router resolves routes from file paths — any hardcoded `/plans` or `/chat/...` strings will become dead routes after the rename.

Grep targets:
- `router.push('/plans')`
- `router.push('/chat`
- `href="/plans"`
- `href="/chat`

### Profile Cleanup Order

Remove friend rows from Profile ONLY after Squad tab is fully wired and tested. The migration should never leave users without a path to friend management.

---

## Sources

- Direct codebase audit: `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/squad.tsx`, `src/app/(tabs)/profile.tsx`, `src/screens/friends/`, `src/app/friends/`
- [Expo Router tabs documentation](https://docs.expo.dev/router/advanced/tabs/)
- [React Navigation bottom tabs badge API](https://reactnavigation.org/docs/bottom-tab-navigator/#tabbarbage)
- Established mobile UX convention: Instagram, Snapchat, LinkedIn all use inline top tabs for social sub-sections with the default landing on the primary social content (friends/connections)

---
*Feature research for: Squad tab with top tabs + bottom nav restructure (Campfire v1.2)*
*Researched: 2026-04-04*
