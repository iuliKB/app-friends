---
phase: 11-birthday-feature
plan: 05
subsystem: ui
tags: [typescript, react-native, wish-list, hooks, supabase, birthday]

# Dependency graph
requires:
  - phase: 11-02
    provides: Migration 0017 live (wish_list_items, wish_list_claims, get_friends_of RPC)
provides:
  - src/hooks/useFriendWishList.ts — friend wish list fetch + claim toggle (useFriendWishList, WishListItemWithClaim)
  - src/hooks/useMyWishList.ts — own wish list CRUD (useMyWishList, WishListItem)
  - src/hooks/useFriendsOfFriend.ts — friend-of-friend list via get_friends_of RPC (useFriendsOfFriend, FriendOfFriend)
  - src/components/squad/WishListItem.tsx — reusable wish list row with Claim/Unclaim/Claimed states
affects:
  - 11-06 (FriendBirthdayPage uses useFriendWishList, useFriendsOfFriend, WishListItem)
  - 11-07 (Profile wish list management uses useMyWishList and WishListItem with readOnly)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useCallback + useEffect fetch with early-exit guard (!userId || !param)
    - Two-query claim fetch: items then claims with .in(itemIds) conditional guard
    - Belt-and-suspenders .eq('claimer_id', userId) on DELETE (RLS is authoritative)
    - readOnly prop on display component to share single component across owner and friend views

key-files:
  created:
    - src/hooks/useFriendWishList.ts
    - src/hooks/useMyWishList.ts
    - src/hooks/useFriendsOfFriend.ts
    - src/components/squad/WishListItem.tsx
  modified: []

key-decisions:
  - "Empty itemIds guard: conditional Supabase query (.in() with empty array returns error) wrapped in ternary returning { data: [] } — avoids spurious DB error when friend has no wish list items"
  - "WishListItem Claimed state is non-interactive for items claimed by others (isClaimed && !isClaimedByMe) — button renders with dimmed text but onToggleClaim is still available if caller wires it; plan note acknowledges this UX choice"

patterns-established:
  - "Two-query wish list pattern: fetch items then fetch claims conditionally on non-empty itemIds — use for any join pattern where the second query depends on a Set from the first"
  - "WishListItem readOnly prop: single component covers both owner (readOnly=true, no button) and friend (readOnly=false, claim button shown) views"

requirements-completed:
  - D-04
  - D-06
  - D-08
  - D-09
  - D-10

# Metrics
duration: 5min
completed: 2026-04-17
---

# Phase 11 Plan 05: Wish List Hooks and WishListItem Component Summary

**Three data hooks (useFriendWishList, useMyWishList, useFriendsOfFriend) and WishListItem component — Wave 4 screens unblocked for wish list and friend-of-friend UI**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-16T22:56:55Z
- **Completed:** 2026-04-17T00:00:00Z
- **Tasks:** 2
- **Files modified:** 0 modified, 4 created

## Accomplishments

- Created `useFriendWishList` hook: fetches friend's wish_list_items + wish_list_claims via two sequential queries; `isClaimed`/`isClaimedByMe` Sets built from claim rows; `toggleClaim` action inserts or deletes from wish_list_claims and refetches (analog of `settle()` in useExpenseDetail)
- Created `useMyWishList` hook: own wish list CRUD with `addItem(title, url?, notes?)` and `deleteItem(itemId)` — both refetch after mutation; owner sees no claim data (D-10 enforced at RLS)
- Created `useFriendsOfFriend` hook: calls `get_friends_of` SECURITY DEFINER RPC with `p_target_user`; belt-and-suspenders filter removes current user from results (Pitfall 3)
- Created `WishListItem` component: `title` + optional `url` chip + optional `notes` text + `Claim/Unclaim/Claimed` button; `readOnly` prop suppresses button for own-profile view; all styling via design tokens

## Task Commits

1. **Task 1: Create useFriendWishList, useMyWishList, useFriendsOfFriend hooks** - `d3fb7e1` (feat)
2. **Task 2: Create WishListItem component** - `6fc2bc3` (feat)

## Files Created/Modified

- `src/hooks/useFriendWishList.ts` — friend wish list fetch + toggleClaim (95 lines)
- `src/hooks/useMyWishList.ts` — own wish list CRUD with addItem/deleteItem (73 lines)
- `src/hooks/useFriendsOfFriend.ts` — get_friends_of RPC with self-filter (50 lines)
- `src/components/squad/WishListItem.tsx` — claim-state row component with readOnly mode (122 lines)

## Decisions Made

- **Empty itemIds guard:** `.in('item_id', itemIds)` with an empty array causes a Supabase error. The plan's code handles this with a ternary: `itemIds.length > 0 ? await supabase.from(...).in(...) : { data: [] }`. This prevents spurious errors for friends with no wish list items.

- **WishListItem Claimed button for others:** When `isClaimed && !isClaimedByMe`, the button renders as "Claimed" with dimmed text (`claimTextClaimed` style). The button is not disabled — the caller can wire `onToggleClaim` to do nothing or show feedback. The plan note acknowledges this choice and suggests `disabled={isClaimed && !isClaimedByMe}` as an option. Kept as-is (non-destructive UX default).

## Deviations from Plan

None - plan executed exactly as written. All code matched the PATTERNS.md templates.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The `get_friends_of` RPC and all wish list tables were deployed in migration 0017 (Plan 02).

## Next Phase Readiness

- All three hooks are ready for use in the FriendBirthdayPage (Plan 06) and Profile wish list management (Plan 07)
- `WishListItem` component ready for both use cases (readOnly=true for profile, readOnly=false for friend's page)
- No blockers — TypeScript clean, all exports confirmed

---
*Phase: 11-birthday-feature*
*Completed: 2026-04-17*

## Self-Check: PASSED

- `src/hooks/useFriendWishList.ts` exists: FOUND
- `src/hooks/useMyWishList.ts` exists: FOUND
- `src/hooks/useFriendsOfFriend.ts` exists: FOUND
- `src/components/squad/WishListItem.tsx` exists: FOUND
- `export function useFriendWishList` in file: FOUND
- `export function useFriendsOfFriend` in file: FOUND
- `export function WishListItem` in file: FOUND
- Commit `d3fb7e1` exists: FOUND
- Commit `6fc2bc3` exists: FOUND
- `npx tsc --noEmit` exits 0: PASSED
