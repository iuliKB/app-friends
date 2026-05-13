# Phase 31 — Context for Planning

This document captures the architectural reasoning and scope decisions made before planning, so they survive context clears. Read this before running `/gsd-plan-phase 31`.

## Why this phase exists

Phase 30 fixes the navigation source-of-truth (zustand `useNavigationStore`). It does NOT address a separate, larger architectural concern: **server-state caching and cross-screen data reactivity.**

Current pattern (as of Phase 29 end):

- ~35 custom hooks in `src/hooks/` (`useChatList`, `useChatRoom`, `usePlans`, `useHabits`, `useFriends`, `useTodos`, `useExpenseDetail`, etc.) each:
  - Call Supabase directly
  - Hold results in local `useState`
  - Refetch on focus via `useFocusEffect`
  - Hand-roll optimistic updates per hook
- A few hooks (`useChatList`, `useChatRoom`) hand-roll AsyncStorage caching
- Some hooks subscribe to Supabase Realtime channels (chat, status)
- Zustand stores hold only identity / UI flags, no server data

Pain points this causes:

1. **Cross-screen reactivity is manual.** Editing a habit doesn't trigger an update on the home tile showing it — each screen waits for its own `useFocusEffect` refetch.
2. **Refetch-on-focus is wasteful** for data that hasn't changed.
3. **Optimistic updates reimplemented per hook.** Inconsistent patterns, more bugs.
4. **No standard cache invalidation.** Mutations don't have a contract for what to invalidate elsewhere.
5. **Hand-rolled persistence in 2 hooks** competes with what a cache library does generically.

## Why TanStack Query (not "expand zustand")

Zustand is for **client/UI state**. TanStack Query is for **server state**. They solve different problems. Putting Supabase data into raw zustand stores is a known anti-pattern: you re-implement cache invalidation, stale-time, optimistic updates, retry, and refetch policies — which TanStack Query/SWR provide out of the box.

The current 35-hook fetch pattern already does half of what TanStack Query does (loading state, refetch on focus, AsyncStorage caching). Replacing that pattern with `useQuery`/`useMutation` is a substitution, not an addition of complexity.

The decision: **use TanStack Query for all server state. Keep zustand for client/UI state only** (auth identity, navigation surface from Phase 30, UI coordination flags).

## Scope

### 1. Foundation

- Install `@tanstack/react-query` (and React-Native-compatible peer deps)
- Set up `QueryClientProvider` at app root (`src/app/_layout.tsx`)
- Configure default `staleTime`, `gcTime`, `retry`, `refetchOnWindowFocus` (likely false on RN), `refetchOnReconnect`
- Add devtools in dev builds
- Set up persistence layer: evaluate `@tanstack/query-async-storage-persister` vs. keeping the current hand-rolled AsyncStorage caching, decide based on cache size + cold-start UX

### 2. Query-key conventions (decided up front)

Establish a key taxonomy before migrating. Example shape:

- `['chat', 'list', userId]`
- `['chat', 'room', channelId]`
- `['chat', 'room', channelId, 'messages', { before }]`
- `['plans', 'list', userId]`
- `['plans', 'detail', planId]`
- `['plans', 'photos', planId]`
- `['habits', 'overview', dateLocal]`
- `['friends', 'list', userId]`
- `['friends', 'detail', friendId]`
- `['expenses', 'list', userId]`
- `['expenses', 'detail', expenseId]`
- `['expenses', 'iou-summary', userId]`

Document the taxonomy in a single place so future hooks don't drift.

### 3. Mutation/optimistic-update convention

Establish one shape used everywhere:

```ts
useMutation({
  mutationFn,
  onMutate: async (input) => { /* snapshot + optimistic write */ },
  onError: (err, input, ctx) => { /* rollback from snapshot */ },
  onSettled: () => { /* queryClient.invalidateQueries(...) */ },
});
```

Document acceptable patterns. Avoid one-off variations.

### 4. Realtime + TanStack Query integration pattern

Several hooks subscribe to Supabase Realtime channels (chat messages, status updates, possibly others). Decide and document the integration pattern:

- **Option A:** Realtime events call `queryClient.setQueryData(...)` directly with the incoming row — fastest UI update, but requires correct payload shape from Postgres replication.
- **Option B:** Realtime events call `queryClient.invalidateQueries(...)` — simpler, triggers a refetch, slightly slower UI but more robust.
- **Hybrid:** Use `setQueryData` for insert/delete (cheap), `invalidate` for updates (avoids missed-field bugs).

Pick a default, document exceptions.

### 5. Incremental migration

Do NOT migrate all 35 hooks at once. Pick a pilot vertical:

- **Pilot candidate: Habits** (`useHabits`, `useHabitDetail`, `useStreakData`) — well-isolated, has the clearest cross-screen reactivity pain (home tile + squad tile + detail screen should all stay in sync).
- After pilot validates the pattern + conventions, migrate remaining hooks in batches grouped by surface:
  - Chat (`useChatList`, `useChatRoom`, `useChatMembers`, `useChatTodos`)
  - Plans (`usePlans`, `usePlanDetail`, `usePlanPhotos`, `useAllPlanPhotos`)
  - Friends (`useFriends`, `useFriendsOfFriend`, `useFriendWishList`, `useMyWishList`, `useWishListVotes`)
  - Expenses (`useExpensesWithFriend`, `useExpenseDetail`, `useIOUSummary`, `useExpenseCreate`)
  - Home aggregates (`useHomeScreen`, `useUpcomingBirthdays`, `useUpcomingEvents`, `useInvitationCount`, `usePendingRequestsCount`)
  - Misc (`usePoll`, `useTodos`, `useStatus`, `useInvitations`, `useSpotlight`, `useViewPreference`, `useNetworkStatus`)

Each batch is independently shippable; a half-migrated app still works (old hooks coexist with new ones until their last caller moves over).

### 6. Realtime subscription consolidation

Audit existing Realtime subscriptions across hooks. After migrating, they should integrate with the chosen Realtime+Query pattern (§4). Avoid duplicate subscriptions to the same channel from multiple hooks.

### 7. Zustand boundary documentation

After migration, write down the rule:

- **Zustand:** auth identity, navigation surface (Phase 30's `useNavigationStore`), UI coordination flags, ephemeral form state if shared across screens
- **TanStack Query:** anything fetched from Supabase
- **Local `useState`:** screen-local UI state that doesn't cross component boundaries

This boundary lives in a doc file (or `src/stores/README.md`) so future hooks land on the right side.

## Verification anchor

- Pilot vertical (habits): editing a habit in detail screen instantly updates home tile and squad tile without manual refetch
- Network audit: count fetches per typical session — should drop meaningfully vs. pre-migration (cache hits replacing refetches)
- Optimistic mutations: toggling a habit, RSVPing to a plan, sending a message — all show instant UI, roll back on error, settle correctly
- Cold start UX: persisted cache (if adopted) shows last-known data before network resolves
- No duplicate Supabase Realtime subscriptions for the same channel

## Out of scope

- Server-side schema changes
- Refactoring Supabase Edge Functions
- UI redesigns (handled per their own phases)
- Migrating `useAuthStore`, `useNavigationStore` (Phase 30), or other zustand stores — they stay
- Migrating local `useState` that isn't fetching server data
- Adopting Suspense for data fetching (could be a follow-up; not required for this phase)

## Risk notes

- Mid-migration the app has two paradigms (old hooks + new queries). Mitigation: migrate by complete vertical, never half-migrate a hook's callers.
- Recent UI work (squad rework, IOU heros, birthdays calendar, habits) is high-touch — regression risk is real. The pilot vertical should be one of the more isolated areas, and smoke tests are required at each batch boundary.
- Bundle size impact is small (~13 KB for TanStack Query) but worth noting.
- Devtools should be dev-only — make sure they don't ship.

## Decision: WHEN to start

This phase should run **after** Phase 30 is complete and shipped, not in parallel. Reasons:
- Phase 30 changes routing/layout — concurrent server-state churn would confound regression debugging
- The pilot vertical's "cross-screen reactivity" verification needs a stable navigation layer to test against
- Mental focus: routing/layout work and data-layer work are different cognitive modes
