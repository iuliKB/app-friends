---
phase: 33-friend-profile-redesign
plan: 02
subsystem: hooks, data-layer
tags: [hooks, tanstack-query, friend-profile, cache-sharing, phase-33]

# Dependency graph
requires:
  - phase: 33-friend-profile-redesign
    plan: 01
    provides: queryKeys.friends.mutuals, queryKeys.friends.detail, queryKeys.friends.list, queryKeys.friends.ofFriend

provides:
  - useFriendProfile(friendId) — single-entity read: profile + friendsSince + status (opportunistic cache read)
  - useFriendMutuals(friendId) — aggregate read: mutualPlansCount, mutualFriendsCount, sharedPhotosCount, sharedPlanIds
  - Unit tests: 7 passing (4 for useFriendProfile + 3 for useFriendMutuals)

affects:
  - 33-06 (friend profile screen rewrite consumes both hooks)
  - 33-05 (Photos quick-action uses sharedPlanIds from useFriendMutuals)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "opportunistic cache-slice read: queryClient.getQueryData(queryKeys.home.friends(userId)) before direct effective_status SELECT"
    - "multi-step queryFn intersection: caller plan_ids → .in() filter friend plan_ids → plan_photos head count"
    - "warm-only mutual-friends count: derived from cache, renders 0 on cold (no fallback fetch)"
    - "early-exit zero state: callerPlanIds.length === 0 skips steps 2+3"

key-files:
  created:
    - src/hooks/useFriendProfile.ts
    - src/hooks/__tests__/useFriendProfile.test.ts
    - src/hooks/useFriendMutuals.ts
    - src/hooks/__tests__/useFriendMutuals.test.ts
  modified: []

key-decisions:
  - "queryKeys.friends.detail(friendId) reused as cache key (not a new friends.profile key) — PATTERNS §Corrections row 3; locked for taxonomy consistency"
  - "No new realtime subscription in useFriendProfile (D-15) — opportunistic home.friends slice read covers warm path; deep-link cold path uses direct effective_status SELECT"
  - "useFriendMutuals mutualFriendsCount renders 0 on cold caches — acceptable per RESEARCH §3; useFriends/useFriendsOfFriend mounted on screen tree warm the caches"
  - "friend-not-found signalled by friendsSince === null, NOT profile === null — RLS USING(true) always returns profiles row for any auth'd user"

# Metrics
duration: ~12min
completed: 2026-05-13
---

# Phase 33 Plan 02: Data-Layer Hooks (useFriendProfile + useFriendMutuals) Summary

**Two TanStack Query hooks providing the full data contract for the friend profile screen redesign: profile + friendship + status in one query, plus mutual plans / photos / friends in a second query**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-05-13
- **Tasks:** 3 (Task 1: useFriendProfile implementation, Task 2: useFriendProfile tests, Task 3: useFriendMutuals + tests)
- **Files created:** 4

## Accomplishments

- `useFriendProfile(friendId)` ships with 3-step queryFn (profiles → friendships → status) and opportunistic home-status-cache read
- `useFriendMutuals(friendId)` ships with plan-intersection, photo-count HEAD request, and warm-cache mutual-friends derivation
- 7 unit tests green: 4 covering useFriendProfile (warm cache, cold fallback, friend-not-found, auth gate) + 3 covering useFriendMutuals (happy path, early exit, cold caches)
- Full suite (284 tests, 52 suites) remains green

## Hook Contracts (Plan 06 consumes these verbatim)

### `useFriendProfile(friendId: string): UseFriendProfileResult`

```typescript
interface FriendProfileData {
  profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
    birthday_month: number | null;
    birthday_day: number | null;
    birthday_year: number | null;
    timezone: string | null;
    bio: string | null;          // (supabase as any) cast — database.ts regen deferred
  } | null;
  friendsSince: string | null;   // null = friend-not-found (no friendships row)
  status: 'free' | 'busy' | 'maybe' | null;
  contextTag: string | null;
  statusExpiresAt: string | null;
  lastActiveAt: string | null;
}

interface UseFriendProfileResult {
  data: FriendProfileData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}
```

Cache key: `queryKeys.friends.detail(friendId)` — reuses Plan 01 key, no new key.
staleTime: `60_000` ms.
enabled: `!!userId && !!friendId`.

**friend-not-found detection:** `data.friendsSince === null` (not `data.profile === null`). The profiles_select_authenticated RLS policy is `USING(true)` — the profile row always returns for any authenticated user. Plan 06 screen must key the "no longer friends" UI on `friendsSince === null`.

**Status opportunistic read:** reads `queryKeys.home.friends(userId)` first; only fetches `effective_status` directly when the home-screen cache is cold (deep-link entry path). No new realtime subscription (D-15 enforced).

### `useFriendMutuals(friendId: string): UseFriendMutualsResult`

```typescript
interface FriendMutualsData {
  mutualPlansCount: number;
  mutualFriendsCount: number;   // 0 on cold caches (warm-only derivation)
  sharedPhotosCount: number;
  sharedPlanIds: string[];       // used by /friends/[id]/photos to filter useAllPlanPhotos
}

interface UseFriendMutualsResult {
  data: FriendMutualsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}
```

Cache key: `queryKeys.friends.mutuals(friendId)`.
staleTime: `60_000` ms.
enabled: `!!userId && !!friendId`.

**Mutual friends (warm-only):** `mutualFriendsCount` is derived by intersecting `queryKeys.friends.list(userId)` and `queryKeys.friends.ofFriend(friendId)` from the in-memory cache. When either cache slot is cold the count renders `0`. This is intentional — the screen mounts `useFriends` and `useFriendsOfFriend` hooks which populate those slots, so the count hydrates naturally during normal navigation. Deep-link entry shows `0` until those hooks fire.

**Early exit:** when `callerPlanIds.length === 0`, returns `{ mutualPlansCount: 0, sharedPhotosCount: 0, sharedPlanIds: [] }` immediately without fetching friend's `plan_members` or `plan_photos`. `mutualFriendsCount` is still computed from cache.

## Task Commits

1. **Task 1: useFriendProfile.ts** — `4498b14` (feat)
2. **Task 2: useFriendProfile.test.ts** — `89ba5d6` (test)
3. **Task 3: useFriendMutuals.ts + test** — `105bbfb` (feat)

## Files Created

- `src/hooks/useFriendProfile.ts` — 133 LOC, 3-step queryFn, opportunistic cache-slice read
- `src/hooks/__tests__/useFriendProfile.test.ts` — 4 tests, 242 LOC
- `src/hooks/useFriendMutuals.ts` — 115 LOC, 4-step queryFn, early-exit, warm-cache mutual friends
- `src/hooks/__tests__/useFriendMutuals.test.ts` — 3 tests, 195 LOC

## Decisions Made

- **queryKeys.friends.detail reuse locked** — PATTERNS §Corrections row 3 prohibits introducing a `friends.profile` key; `friends.detail` is the authoritative cache slot for per-friend profile data. Plan 06 and Plan 07 (bio edit) both read/write this key.
- **No realtime subscription (D-15)** — the home-screen bridge (`subscribeHomeStatuses`, called by `useHomeScreen`) already keeps `home.friends(userId)` fresh; `useFriendProfile` reads it opportunistically. A direct `effective_status` SELECT is the cold-path fallback.
- **mutualFriendsCount warm-only (RESEARCH §3)** — deriving from cache avoids two additional async fetches in the queryFn; the screen tree provides warm hydration via mounted `useFriends`/`useFriendsOfFriend` hooks.

## Deviations from Plan

None — plan executed exactly as written. All four hooks follow their specified analog patterns (useFriendWishList auth-gate, useExpensesWithFriend intersection, useStatus effective_status read).

## Threat Surface Scan

No new network endpoints or auth paths introduced. The hooks make SELECT-only calls on tables already accessed by the current `src/app/friends/[id].tsx` inline fetch. T-33-05 through T-33-09 in the plan threat register cover all surfaces introduced here — all previously assessed (accept/mitigate dispositions unchanged).

## Self-Check: PASSED

- `src/hooks/useFriendProfile.ts` exists ✓
- `src/hooks/__tests__/useFriendProfile.test.ts` exists ✓ (4 tests)
- `src/hooks/useFriendMutuals.ts` exists ✓
- `src/hooks/__tests__/useFriendMutuals.test.ts` exists ✓ (3 tests)
- Commits 4498b14, 89ba5d6, 105bbfb exist in git log ✓
- Full suite 284 tests / 52 suites green ✓
- No TSC errors in hook source files ✓
- subscribeHomeStatuses count in useFriendProfile.ts: 0 ✓
- useMutation count in both hooks: 0 ✓

---
*Phase: 33-friend-profile-redesign*
*Completed: 2026-05-13*
