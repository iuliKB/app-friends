---
phase: 33-friend-profile-redesign
plan: "06"
subsystem: screens, hooks, integration
tags: [screen, integration, glue, friend-profile, pattern-5, tanstack-query, reanimated, phase-33]

# Dependency graph
requires:
  - plan: 33-01
    provides: queryKeys.chat.preferences, queryKeys.friends.list, queryKeys.home.*
  - plan: 33-02
    provides: useFriendProfile, useFriendMutuals
  - plan: 33-03
    provides: FriendProfileHeader (collapsing header with scrollY prop)
  - plan: 33-04
    provides: GroupedInsetSection, ProfileInfoRow, BioRow
  - plan: 33-05
    provides: QuickActionsRow, ActionIconButton

provides:
  - src/app/friends/[id].tsx — redesigned friend profile screen (D-13 + all phase deliverables)
  - src/app/friends/[id]/photos.tsx — shared-photos grid route (D-09 Photos quick-action target)
  - src/hooks/useChatDmPreferences.ts — Mute state read for the DM channel
  - 9 screen tests covering REQ-FP-06/07/09/11/12

affects:
  - All screens that navigate to /friends/[id] (friends list, home card, message-author chip, member list)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern 5 Remove Friend mutation: mutationFn + onMutate (optimistic splice) + onError (rollback) + onSettled (invalidate 3 keys)"
    - "Lazy DM channel resolution for Mute: get_or_create_dm_channel RPC on first Mute press; channelId held in useState"
    - "Parent-owned scrollY SharedValue: created at screen level, passed to FriendProfileHeader AND AnimatedStackTitle"
    - "AnimatedStackTitle: file-private top-level component (not inline arrow) per UI-SPEC §Reanimated Implementation Notes #2"
    - "friend-not-found detection: data.friendsSince === null (NOT profile === null) per Plan 02 SUMMARY locked correction"
    - "Cache-warming: useFriends() + useFriendsOfFriend(friendId) mounted on screen tree so mutualFriendsCount hydrates"

key-files:
  created:
    - src/hooks/useChatDmPreferences.ts
    - src/hooks/__tests__/useChatDmPreferences.test.ts
    - src/app/friends/[id]/photos.tsx
    - src/app/friends/__tests__/[id].test.tsx
  modified:
    - src/app/friends/[id].tsx (full rewrite — git diff for full context)
    - src/__mocks__/reanimated.js (added useAnimatedScrollHandler, interpolate, Extrapolation, useDerivedValue, __esModule: true)

key-decisions:
  - "friend-not-found keyed on data.friendsSince === null — RLS USING(true) always returns profiles row; NotFriendsView is a ~15-LOC inline component (NOT ErrorDisplay) per RESEARCH §Recommendations"
  - "Remove Friend mutation lives inline in the screen file (not a hook); mutationShape gate scan scope is src/hooks/ only so it does NOT auto-catch this; the 4 literal strings (mutationFn/onMutate/onError/onSettled) are present as defensive compliance per T-33-27"
  - "Mute mutation is plain async (not useMutation) — inline upsert avoids Pattern 5 boilerplate for a low-frequency toggle; optimistic flip via queryClient.setQueryData before network call"
  - "WishListItem rendered without isLast auto-suppression (it doesn't accept the prop); GroupedInsetSection's React.Children injection is harmless — extra prop is silently ignored"
  - "GalleryViewerModal in photos route: deletePhoto wired as no-op Promise since the photos viewer in this context is read-only (shared photos are not deletable from the friend profile)"
  - "reanimated.js mock extended with useAnimatedScrollHandler, interpolate, Extrapolation, useDerivedValue, __esModule: true — required for screen tests; non-breaking for all 54 existing test suites"

# Metrics
duration: ~35min
completed: 2026-05-13
tasks_completed: 2 of 3 (Task 3 is hardware checkpoint — awaiting human verification)
files_created: 4
files_modified: 2
---

# Phase 33 Plan 06: Friend Profile Screen Integration Summary

**All Wave 1 (UI primitives) + Wave 2 (data hooks) components composed into the rewritten friend profile screen; shared-photos route and Mute-state read hook added; 9 screen tests green; mutationShape gate green; full suite 297/297 green.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-13T20:08:24Z
- **Completed (code tasks):** 2026-05-13T20:55:00Z (approx)
- **Tasks completed:** 2 / 3 (Task 3 is hardware verification checkpoint)
- **Files created:** 4 (useChatDmPreferences.ts, useChatDmPreferences.test.ts, photos.tsx, [id].test.tsx)
- **Files modified:** 2 ([id].tsx full rewrite, reanimated.js mock extension)

## Accomplishments

### Task 1: useChatDmPreferences hook

`src/hooks/useChatDmPreferences(channelId: string | null)`:
- Returns `{ data: { isMuted: boolean } | null, isLoading, error, refetch }`
- `enabled: !!userId && !!channelId` — query fires only when both non-null
- `queryKey: queryKeys.chat.preferences(channelId)` — Plan 01 factory
- `staleTime: 60_000` — Phase 31 standard
- 3 tests: null channelId (disabled), row present (isMuted true), no row (isMuted false default)

### Task 2: Screen rewrite + photos route + screen tests

**`src/app/friends/[id].tsx` rewrite:**
- Inline `useState + useEffect + supabase.from('profiles').select(...)` block eliminated
- 7 hooks composed: `useFriendProfile`, `useFriendMutuals`, `useFriendWishList`, `useExpensesWithFriend`, `useChatDmPreferences`, `useFriends`, `useFriendsOfFriend`
- Parent-owned `scrollY = useSharedValue(0)` passed to `FriendProfileHeader` AND `AnimatedStackTitle`
- `Stack.Screen` with `headerTransparent: true` + animated `headerTitle`
- All 4 quick-action handlers wired with correct copy and route targets
- Pattern 5 Remove Friend mutation with all 4 literals

**`src/app/friends/[id]/photos.tsx` new route:**
- `useAllPlanPhotos()` filtered to `sharedPlanIds` from `useFriendMutuals(friendId)`
- Grid layout using `SectionList` grouped by plan, matching MemoriesTabContent analog
- `GalleryViewerModal` for full-screen photo viewing (read-only, no-op deletePhoto)
- Loading / error / empty states per plan spec

**`src/app/friends/__tests__/[id].test.tsx` — 9 tests:**
- REQ-FP-07 (happy path): bio + friends since + birthday + timezone + all mutual rows + section titles
- REQ-FP-07 (sparse): only friends since in INFO; all MUTUAL rows show "None yet"
- REQ-FP-06 (Message): `openChat(router, { kind: 'dmFriend', friendId, friendName })` called
- REQ-FP-06 (More): `showActionSheet` called with exactly 1 item (Remove Friend destructive)
- REQ-FP-09 (avatar with url): avatar button present; tap → ImageViewerModal visible
- REQ-FP-09 (avatar null): no avatar button rendered
- REQ-FP-12 (not found): "No longer friends" text; tap "Back to friends" → `router.back()`
- Loading state: skeleton renders, no display name
- Error state: ErrorDisplay with correct message

## Quick Action Wiring

| Button | Handler | Data Dependencies | Cache Invalidations |
|--------|---------|------------------|---------------------|
| Message | `openChat(router, { kind: 'dmFriend', friendId, friendName })` | `data.profile.display_name` | None (handled by openChat) |
| Mute | Lazy `get_or_create_dm_channel` RPC → upsert `chat_preferences` | `useChatDmPreferences(dmChannelId)` | `queryKeys.chat.preferences(channelId)` + `queryKeys.chat.list(myId)` |
| Photos | `localRouter.push('/friends/[id]/photos')` | None | None |
| More → Remove Friend | Pattern 5 mutation → `router.back()` on success | `queryKeys.friends.list(myId)` snapshot | `friends.list(myId)` + `home.friends(myId)` + `home.pendingRequestCount(myId)` |

## Remove Friend Mutation Shape (verbatim — for future plans)

```typescript
useMutation({
  mutationFn: async () => {
    const { error } = await supabase.from('friendships').delete()
      .or(`and(requester_id.eq.${myId},...)`);
    if (error) throw error;
  },
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: queryKeys.friends.list(myId) });
    const previousList = queryClient.getQueryData(queryKeys.friends.list(myId));
    queryClient.setQueryData(queryKeys.friends.list(myId), (old) =>
      (old ?? []).filter((f) => f.friend_id !== friendId));
    return { previousList };
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.previousList !== undefined) {
      queryClient.setQueryData(queryKeys.friends.list(myId), ctx.previousList);
    }
    Alert.alert('Error', "Couldn't remove friend. Try again.");
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.friends.list(myId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home.friends(myId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home.pendingRequestCount(myId) });
  },
});
```

## Friend-Not-Found Detection Key

**`data?.friendsSince === null`** — NOT `profile === null`

`profiles_select_authenticated` RLS is `USING(true)` — the profile row always returns for any authenticated user. The "removed friend" or "stranger" state is signalled exclusively by the absence of a `friendships` row, which surfaces as `friendsSince: null` from `useFriendProfile`. Plan 02 SUMMARY locked this correction (PATTERNS §Corrections row 8).

## Requirements Closed by This Plan

| ID | Requirement | Status |
|----|-------------|--------|
| D-06 | INFO + MUTUAL section rows | Closed |
| D-08 | IOU balance row in MUTUAL | Closed |
| D-09 | Quick actions row (Message/Mute/Photos/More) | Closed |
| D-11 | Remove Friend in More overflow only | Closed |
| D-12 | Full-screen avatar viewer | Closed |
| D-15 | Status-only realtime (no new subscription) | Confirmed |
| D-16 | Loading / error states | Closed |
| REQ-FP-06 | Quick action handlers | Closed |
| REQ-FP-07 | Row data rendering | Closed |
| REQ-FP-09 | Avatar viewer | Closed |
| REQ-FP-11 | Remove Friend flow | Closed |
| REQ-FP-12 | Friend-not-found inline view | Closed |
| GATE-mutationShape | Mutation gate green | Closed |

## Task Commits

1. **Task 1: useChatDmPreferences hook + 3 tests** — `f9759de` (feat)
2. **Task 2: Screen rewrite + photos route + screen tests** — `cf23283` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] reanimated.js mock missing useAnimatedScrollHandler, interpolate, Extrapolation**
- **Found during:** Task 2 (screen test run)
- **Issue:** The existing `src/__mocks__/reanimated.js` lacked `useAnimatedScrollHandler`, `interpolate`, `Extrapolation`, `useDerivedValue`, and `__esModule: true` — causing infinite recursion in jest module resolution and "is not a function" errors in screen tests
- **Fix:** Extended the reanimated mock with all missing symbols; added `__esModule: true` so babel interop correctly passes the `default` export (not the full `module.exports` object) when screen uses `import Animated from 'react-native-reanimated'`
- **Files modified:** `src/__mocks__/reanimated.js`
- **Impact:** Non-breaking — all 54 existing test suites still pass (297/297)
- **Commit:** `cf23283`

**2. [Rule 3 - Blocking] GalleryViewerModal requires currentUserId + deletePhoto props (not planId)**
- **Found during:** Task 2 TSC check on photos.tsx
- **Issue:** Plan spec said `GalleryViewerModal` with `planId` prop but the actual component signature requires `currentUserId: string` and `deletePhoto: (photoId) => Promise<{error}>` (no `planId`)
- **Fix:** Added `currentUserId` from auth store; wired `deletePhoto` as a no-op (`() => Promise.resolve({ error: null })`) since the shared-photos viewer is read-only
- **Files modified:** `src/app/friends/[id]/photos.tsx`
- **Commit:** `cf23283`

**3. [Rule 2 - Missing] WishListItem does not accept isLast prop**
- **Found during:** Task 2 implementation
- **Issue:** `WishListItem` has no `isLast` prop, so `GroupedInsetSection`'s React.Children injection will pass `isLast` to it silently (React ignores unknown props on function components)
- **Fix:** Rendered `WishListItem` instances directly as children of `GroupedInsetSection` — the separator suppression for the last item won't fire but this is a visual-only trade-off. The WISH LIST section doesn't have hairlines between items (WishListItem has its own separator pattern), so the isLast injection is harmless
- **Impact:** Minor visual: last WishListItem may show a bottom hairline from GroupedInsetSection injection. Documented here for future fix if needed

### Out-of-scope discoveries (deferred)

- Mutual plans and Mutual friends navigation destination routes don't exist yet — both rows use `() => {}` no-op `onPress` with a TODO comment in the code. These will be wired when the respective list screens are built
- `queryKeys.home.pendingRequestCount` invalidation on Remove Friend settle — added defensively (not in plan spec) to keep the pending count badge accurate after removal

## Known Stubs

- **Mutual plans onPress** (`src/app/friends/[id].tsx`) — `() => {}` no-op with TODO comment. Route TBD when mutual plans list screen is built
- **Mutual friends onPress** (`src/app/friends/[id].tsx`) — same as above

## Manual Verification (Task 3 — Hardware Smoke)

**Status: AWAITING** — Hardware checkpoint not yet run.

The following behaviors require real iPhone hardware (Expo dev client or TestFlight):

1. Header collapse animation — avatar 140pt → 32pt as scrollY 0→160
2. Blurred-avatar wash cross-fade on image load
3. Quick actions haptic feedback (light/selection per button)
4. ImageViewerModal swipe-down dismiss + pinch-to-zoom
5. Remove Friend optimistic removal + rollback on airplane mode
6. Friend-not-found inline view (deep-link or removed-while-viewing)
7. Reduced Motion path — static collapsed header, no haptics

Record result below once verified on hardware:

```
Hardware smoke: [APPROVED/REJECTED] [DATE] by [OPERATOR]
```

## Threat Surface Scan

No new network endpoints or auth paths beyond what the plan's threat model covered. All threats T-33-21 through T-33-27 addressed:

- T-33-21 (XSS/Bio): React Native `<Text>` auto-escapes
- T-33-22 (Remove race): second DELETE matches zero rows (no-op)
- T-33-24 (Double-tap Remove): `removeMutation.isPending` disables More button while in-flight
- T-33-27 (mutationShape gate skip): 4 literal strings present in screen file

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `src/app/friends/[id].tsx` exists | FOUND |
| `src/app/friends/[id]/photos.tsx` exists | FOUND |
| `src/hooks/useChatDmPreferences.ts` exists | FOUND |
| `src/app/friends/__tests__/[id].test.tsx` exists | FOUND |
| Commit f9759de (Task 1) | FOUND |
| Commit cf23283 (Task 2) | FOUND |
| Full test suite 297/297 green | PASSED |
| mutationShape gate 42/42 green | PASSED |
| TSC: zero new errors in 3 new files | PASSED |
