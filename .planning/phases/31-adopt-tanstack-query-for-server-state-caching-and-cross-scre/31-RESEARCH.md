# Phase 31: Adopt TanStack Query — Research

**Researched:** 2026-05-13
**Domain:** React-Native server-state caching, optimistic mutations, Supabase Realtime integration
**Confidence:** HIGH (Context7 + npm registry + codebase audit)

---

## Summary

Campfire currently has ~35 hand-rolled Supabase data hooks following an identical shape: `useState` for data/loading/error, `useFocusEffect` (or `useEffect`) for refetch, occasional `supabase.channel(...)` for Realtime, and per-hook optimistic-update logic with snapshot-via-ref. Three hooks (`useChatList`, `useChatList`'s zustand mirror in `useChatStore`, and `useChatRoom` via AsyncStorage `chat:last_read:*`) hand-roll caching with stale-time TTL. **The pattern is already half-way to TanStack Query.** Replacing it with `useQuery` + `useMutation` + `persistQueryClient` is a substitution that strictly reduces code volume — no architectural cost.

The big substantive decisions are: (1) how to integrate Supabase Realtime with the query cache (Hybrid pattern recommended below — `setQueryData` for INSERT/DELETE, `invalidateQueries` for UPDATE), (2) whether to persist the cache to AsyncStorage (yes — opt in only for cache-able lists, exclude chat which already has hand-rolled persistence with semantics we want to keep), and (3) the migration unit of work (a "vertical" = the hook + every screen that consumes it + its Realtime subscription + any optimistic mutators, migrated in one atomic plan).

**Primary recommendation:** Install `@tanstack/react-query@5.100.10` + `@dev-plugins/react-query@0.4.0` (Expo's first-party devtools plugin). Mount `QueryClientProvider` inside `RootLayoutStack` at `src/app/_layout.tsx`. Define a `src/lib/queryKeys.ts` factory module. Wire `focusManager` + `onlineManager` to RN's `AppState` + `NetInfo` (NetInfo install required — currently absent). Pilot with **habits** (`useHabits` + `useHabitDetail`) — confirmed pilot-suitable below. Defer persistence (`PersistQueryClientProvider`) until after the pilot ships, then enable selectively. **Do NOT migrate `useChatList` and `useChatRoom` in the pilot or even the first wave** — both have stable hand-rolled caching/Realtime logic and live in the highest-traffic surface. Migrate them last, after the conventions are battle-tested on calmer verticals.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

From `.planning/phases/31-adopt-tanstack-query-for-server-state-caching-and-cross-scre/CONTEXT.md` "Scope" + "Why" sections:

- **Library:** TanStack Query (not zustand expansion, not SWR). Decided in "Why TanStack Query (not expand zustand)".
- **State boundary:**
  - Zustand → auth, navigation surface, UI flags, ephemeral cross-screen UI state.
  - TanStack Query → anything fetched from Supabase.
  - Local `useState` → screen-local UI state.
- **Migration shape:** Incremental, by vertical. Pilot first, then batches by surface (chat / plans / friends / expenses / home aggregates / misc). Old and new hooks coexist mid-migration.
- **Conventions decided up front (before any migration):**
  1. Query-key taxonomy (CONTEXT §2 lists 12 example keys — research validates the shape below)
  2. Optimistic-mutation shape: `mutationFn` + `onMutate` (snapshot+optimistic write) + `onError` (rollback) + `onSettled` (invalidate). One shape used everywhere.
  3. Realtime → query-cache integration pattern (CONTEXT §4 offers A/B/Hybrid — research recommends Hybrid below)
- **Pilot:** Habits is the named candidate. Research confirms suitability (see §Pilot Vertical Deep-Dive).
- **Phase ordering:** Runs AFTER Phase 30 ships, not in parallel. Phase 30 is "Phase complete — ready for verification" per STATE.md.
- **Out of scope:** Server-side changes, Edge Function refactors, UI redesigns, migrating `useAuthStore`/`useNavigationStore`/`useStatusStore` (they stay), local `useState` that isn't fetching server data, Suspense for data fetching.

### Claude's Discretion

- **Realtime A/B/Hybrid pick** (CONTEXT §4) — research recommends Hybrid, planner finalizes.
- **Persistence library/strategy** — `@tanstack/query-async-storage-persister` vs. keep hand-rolled. Research recommends a split strategy (see §Persistence Recommendation).
- **Exact pilot scope** — which hooks ship in the pilot batch. Research recommends `useHabits` + `useHabitDetail` together (NOT `useStreakData` — see deep-dive).
- **DevTools choice** — research recommends `@dev-plugins/react-query` (Expo first-party plugin).
- **Query-key factory file location** — research recommends `src/lib/queryKeys.ts`.

### Deferred Ideas (OUT OF SCOPE for Phase 31)

- Server-side schema changes / RPC refactors
- Edge Function refactors
- UI redesigns (handled per their own phases)
- Migrating `useAuthStore`, `useNavigationStore`, `useStatusStore`, `useHomeStore`, `useChatStore`, `usePlansStore` to be backed by the query cache — they stay zustand
- Migrating local `useState` that isn't fetching server data
- Adopting Suspense for data fetching
- Migrating `useChatList` and `useChatRoom` in the pilot (research recommends deferring these to the final batch)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

The phase description lists "Requirements: TBD (no formal REQ IDs assigned)". The functional must-haves derived from CONTEXT.md "Verification anchor":

| ID (derived) | Description | Research Support |
|----|-------------|------------------|
| TSQ-01 | Editing a habit in detail screen instantly updates home tile and squad tile without manual refetch | §Pilot Vertical Deep-Dive demonstrates cross-screen reactivity via shared query key `habitKeys.overview(todayLocal)` |
| TSQ-02 | Network audit: fetches per typical session drops vs. pre-migration | §Standard Stack `staleTime: 60_000` default means tab-switches inside the window are cache hits |
| TSQ-03 | Optimistic mutations (habit toggle, RSVP, chat send, etc.) show instant UI, roll back on error, settle correctly | §Mutation Pattern (one shape everywhere) |
| TSQ-04 | Cold start UX: persisted cache (if adopted) shows last-known data before network resolves | §Persistence Recommendation |
| TSQ-05 | No duplicate Supabase Realtime subscriptions for the same channel | §Realtime Integration: subscription registry pattern |
| TSQ-06 | Zustand boundary documented (auth / navigation / UI flags only) | §Architectural Responsibility Map + boundary doc deliverable |
| TSQ-07 | Query-key taxonomy lives in one file so future hooks don't drift | §Query-Key Taxonomy: `src/lib/queryKeys.ts` |
| TSQ-08 | Optimistic-mutation shape is the same everywhere — no per-hook variation | §Mutation Pattern: one canonical shape with examples per mutation class |
| TSQ-09 | Devtools work in dev, don't ship in production | §DevTools: `@dev-plugins/react-query` is `__DEV__`-gated by design |
| TSQ-10 | Auth state changes (sign-in/sign-out) properly invalidate the user-scoped cache | §Pitfalls: hook into `supabase.auth.onAuthStateChange` in `_layout.tsx` |
</phase_requirements>

---

## Architectural Responsibility Map

Multi-tier responsibility map for each capability this phase introduces. Campfire is a single-tier mobile app (React Native + Expo) plus Supabase (backend-as-a-service). "Tier" here distinguishes client/cache layer / native bridge / backend.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Server-state caching & deduplication | Client / TanStack Query | — | Tanstack Query owns the cache. Supabase has no client-cache layer. |
| Optimistic UI updates | Client / TanStack Query mutations | — | `onMutate` writes the cache, `onError` rolls back. |
| Cache invalidation on mutation | Client / TanStack Query (`onSettled`) | — | Mutation handlers `invalidateQueries`. |
| Cache invalidation on Realtime events | Client / TanStack Query event bridge | Supabase Realtime (event source) | A small subscription module listens to `postgres_changes`, calls `queryClient.invalidateQueries` or `setQueryData`. |
| Cache persistence | Client / `@tanstack/query-async-storage-persister` | Native bridge / AsyncStorage | Persister writes via AsyncStorage. AsyncStorage is the native storage primitive on RN. |
| Focus/online refetch triggers | Client / TanStack Query `focusManager` + `onlineManager` | Native bridge / `AppState`, `NetInfo` | TanStack Query exposes focus/online manager APIs; RN provides the native signals. |
| Auth identity (session) | Client / Zustand (`useAuthStore`) | — | Out of scope for this phase. Auth listener also drives `queryClient.removeQueries` on sign-out. |
| Navigation surface state | Client / Zustand (`useNavigationStore`) | — | Phase 30 — stays. |
| UI coordination flags | Client / Zustand (`useChatStore`, `useHomeStore`, etc.) | — | Boundary doc clarifies these stop mirroring server data. |
| Per-screen UI state | Component-local `useState` | — | Unchanged. |
| Devtools | Dev tooling (`@dev-plugins/react-query` + Expo CLI) | — | Dev-only by package design. |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | `5.100.10` [VERIFIED: `npm view`, 2026-05-13] | Server-state cache, hooks (`useQuery`, `useMutation`), client-side dedupe, refetch, retry | The canonical React server-state library. Peer deps: `react: ^18 \|\| ^19` — Campfire's React 19.2.0 is officially supported. ~13 KB gzipped minified (CONTEXT §Risk Notes). |
| `@dev-plugins/react-query` | `0.4.0` [VERIFIED: `npm view`, 2026-05-13] | Expo dev-tools plugin for TanStack Query — inspector UI, refetch/remove from cache, dev-only | Maintained by Expo team (`brentvatne` is a maintainer). Peer deps: `@tanstack/react-query: *`, `expo: >=53.0.5`. Plugin pattern auto-gates on `__DEV__` so production bundles are unaffected. [CITED: [Expo Dev Tools Plugins docs](https://docs.expo.dev/debugging/devtools-plugins/)] |
| `@react-native-community/netinfo` | `^12.0.1` [VERIFIED: `npm view`, 2026-05-13] | Network connectivity events for `onlineManager` integration | TanStack Query's official RN guidance uses this exact library. NOT currently installed in Campfire — install required. [CITED: [TanStack Query RN docs](https://tanstack.com/query/v5/docs/framework/react/react-native)] |

### Supporting (Opt-in After Pilot)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/query-async-storage-persister` | `5.100.10` [VERIFIED] | Wraps AsyncStorage into a TanStack persister | Phase 31 Wave 3+: after the pilot validates the cache shape, enable persistence on stable lists (habits overview, friends, plans, IOU summary) for cold-start UX. **Skip on chat surfaces** — hand-rolled `chat:last_read:*` semantics stay. |
| `@tanstack/react-query-persist-client` | `5.100.10` [VERIFIED] | `PersistQueryClientProvider` + dehydrate/hydrate plumbing | Same wave as the persister. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dev-plugins/react-query` | `@tanstack/react-query-devtools` (web devtools) | Web devtools doesn't render in RN — would need a web debugger overlay. Expo plugin is RN-native. |
| `@dev-plugins/react-query` | `tanstack-query-dev-tools-expo-plugin` (LovesWorking) | **Discontinued** by maintainer as of recent commits — they migrated to standalone `rn-better-dev-tools` desktop app. [CITED: [LovesWorking/tanstack-query-dev-tools-expo-plugin README](https://github.com/LovesWorking/tanstack-query-dev-tools-expo-plugin)] |
| `@dev-plugins/react-query` | `rn-better-dev-tools` (standalone desktop) | Standalone macOS app. Useful additional option but requires extra install for each dev. Use `@dev-plugins/react-query` as the in-repo default; rn-better-dev-tools is optional per-dev. |
| `@tanstack/query-async-storage-persister` | MMKV-backed persister | MMKV is 30x faster and lifts the 6 MB Android AsyncStorage limit, but Campfire already uses AsyncStorage everywhere (auth, chat-last-read, view-preference). Introducing MMKV in this phase would expand scope. **Defer to a follow-up if cache size becomes an issue.** [CITED: [oneuptime: AsyncStorage vs MMKV](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view)] |
| Supabase Cache Helpers | — | Mostly Next.js/SSR-oriented (`@supabase-cache-helpers/postgrest-react-query`). Adds a layer over our existing supabase-js calls without enough benefit for an RN client. [ASSUMED — based on package readme survey] |

**Installation:**

```bash
npx expo install @tanstack/react-query @dev-plugins/react-query @react-native-community/netinfo
# Later, when persistence is enabled (separate wave):
npx expo install @tanstack/query-async-storage-persister @tanstack/react-query-persist-client
```

**Version verification:**
- `@tanstack/react-query@5.100.10` — published 2 days before research date (very current).
- `@dev-plugins/react-query@0.4.0` — last published 7 months ago. Stable.
- `@react-native-community/netinfo@12.0.1` — current major. Compatible with Expo SDK 55 [ASSUMED — Expo SDK doctor will confirm exact range].

---

## Architecture Patterns

### System Architecture Diagram

```
                            +------------------------------+
                            |   src/app/_layout.tsx        |
                            |   RootLayout (existing)      |
                            +---------------+--------------+
                                            |
                            +---------------v--------------+
                            |  QueryClientProvider          |
                            |  + AppState focusManager hook |
                            |  + NetInfo onlineManager hook |
                            |  + auth listener bridge       |
                            |    (signOut -> removeQueries) |
                            |  + useReactQueryDevTools()    |
                            +---------------+--------------+
                                            |
                            +---------------v--------------+
                            |  ThemeProvider                |
                            |  RootLayoutStack (existing)   |
                            +---------------+--------------+
                                            |
                +---------------------------+---------------------------+
                |                                                       |
        +-------v-------+                                       +-------v-------+
        | Screen        |                                       | Screen        |
        | HomeScreen    |                                       | HabitDetail   |
        +-------+-------+                                       +-------+-------+
                |                                                       |
        +-------v-------+ useQuery(habitKeys.overview(today))    +-------v-------+
        | useHabits()   | -----------+    +----------------------| useHabit-     |
        +---------------+            |    |                      | Detail(id)    |
                                     |    |                      +---------------+
                                     v    v
                            +------------------------------+
                            |  TanStack Query QueryClient  |
                            |  (in-memory cache, by key)   |
                            +------+------------+----------+
                                   |            |
                  fetch (cache miss)|            | invalidate / setQueryData
                                   |            |
                            +------v---+   +----v---------------------+
                            | supabase |   | Realtime bridge module   |
                            | (RPC /   |   | (src/lib/realtimeBridge) |
                            | from)    |   | subscribes once per      |
                            +----------+   | channel, fans out to     |
                                           | queryClient              |
                                           +-------+------------------+
                                                   |
                                       +-----------v--------------+
                                       | supabase.channel(...)    |
                                       | postgres_changes events  |
                                       +--------------------------+
```

Data flow:
1. Screen mounts → calls `useHabits()` → `useQuery({ queryKey: habitKeys.overview(today), queryFn })`.
2. Cache miss → query runs `queryFn` → returns `supabase.rpc('get_habits_overview')` result → stored under key.
3. Cache hit within `staleTime` → returns cached data, no network.
4. Cache hit past `staleTime` → returns cached data immediately, refetches in background.
5. Realtime event arrives → bridge module calls `setQueryData` (INSERT/DELETE) or `invalidateQueries` (UPDATE) → all subscribed screens re-render with updated data.
6. Mutation runs → `onMutate` snapshots + writes optimistically → server roundtrip → `onSettled` invalidates → cache refetches → server-canonical data replaces optimistic write.
7. App backgrounds → `focusManager.setFocused(false)` → ongoing refetches pause.
8. App foregrounds with stale data → refetch fires.

### Recommended File Layout

```
src/
├── lib/
│   ├── queryClient.ts        # NEW — QueryClient factory + defaults
│   ├── queryKeys.ts          # NEW — central key factory ({habits, chat, plans, friends, expenses, home})
│   ├── realtimeBridge.ts     # NEW — single subscription registry, fans Realtime to query cache
│   └── supabase.ts           # EXISTING — unchanged
├── app/
│   └── _layout.tsx           # EDIT — wrap RootLayoutStack in QueryClientProvider + devtools hook + auth bridge
├── hooks/
│   ├── useHabits.ts          # MIGRATE — Wave 2 (pilot)
│   ├── useHabitDetail.ts     # MIGRATE — Wave 2 (pilot)
│   ├── ...                   # remainder migrated in subsequent waves
│   └── README.md             # NEW — boundary doc (zustand vs. TanStack Query vs. useState)
└── stores/
    └── README.md             # NEW (or edit) — boundary doc lives here OR in hooks/README.md, planner picks one
```

### Pattern 1: QueryClient Setup (Wave 1)

```ts
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // RN typically wants quiet defaults — refetch policies are explicit
        staleTime: 60_000,                  // 1 min — tab-switches inside window are cache hits
        gcTime: 5 * 60_000,                 // 5 min default; bumped to 24h when persistence is enabled
        refetchOnWindowFocus: false,        // NO — RN does not fire 'focus' on window; we use focusManager + AppState instead
        refetchOnReconnect: true,           // YES — wire via onlineManager + NetInfo
        retry: (failureCount, error: any) => {
          // Don't hammer on PostgREST 401/403/404 — those are not transient
          const code = error?.code ?? error?.status;
          if (code === '401' || code === '403' || code === '404' || code === 401 || code === 403 || code === 404) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: 0, // optimistic mutations should not auto-retry — they're typically idempotent OR they rollback
      },
    },
  });
}
```

Rationale for `staleTime: 60_000`:
- Matches [Makerkit's Supabase + TanStack Query guide](https://makerkit.dev/blog/saas/supabase-react-query) ("Start with 60 seconds; adjust based on how frequently your data changes")
- Eliminates wasteful refetch-on-focus inside the window (CONTEXT pain point #2)
- Realtime events will keep the cache fresh anyway for tables with subscriptions

Rationale for `refetchOnWindowFocus: false`:
- TanStack Query docs explicitly say: "Window focus refetching does not work out of the box in React Native, but you can integrate it via the AppState module and focusManager." [CITED: [TanStack Query RN docs](https://tanstack.com/query/v5/docs/framework/react/react-native)]
- Setting it `false` is the recommended default; we then wire `focusManager` separately for app-level (not screen-level) focus.

### Pattern 2: focusManager + onlineManager Integration (Wave 1)

```ts
// Inside src/app/_layout.tsx, alongside the existing AppState listener for supabase.auth.

import { focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform, type AppStateStatus } from 'react-native';

useEffect(() => {
  // Focus manager — pause/resume queries based on whether the OS surfaces the app.
  function onAppStateChange(status: AppStateStatus) {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  }
  const sub = AppState.addEventListener('change', onAppStateChange);
  return () => sub.remove();
}, []);

useEffect(() => {
  // Online manager — refetch on reconnect.
  const unsubscribe = onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(!!state.isConnected))
  );
  return unsubscribe;
}, []);
```

Both wired ONCE at the root. Screens don't need to think about either.

### Pattern 3: Per-screen Refetch on Focus (Wave 2 — replaces useFocusEffect everywhere)

CONTEXT.md asks: "How to integrate `useFocusEffect` (expo-router) with query refetch — or replace it entirely". The official TanStack Query RN guide provides this hook verbatim:

```ts
// src/hooks/useRefreshOnFocus.ts — NEW
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';   // expo-router re-exports the @react-navigation hook
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

export function useRefreshOnFocus(queryKey?: QueryKey) {
  const queryClient = useQueryClient();
  const firstTime = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstTime.current) {
        firstTime.current = false;
        return;
      }
      // If queryKey omitted, refetch all active stale queries on this screen
      queryClient.refetchQueries(
        queryKey
          ? { queryKey, stale: true, type: 'active' }
          : { stale: true, type: 'active' }
      );
    }, [queryClient, queryKey])
  );
}
```

**Important:** in most cases screens won't need this hook at all. `staleTime: 60_000` covers tab-bouncing. Use it only when a screen MUST see fresh data on every entry (e.g., chat unread counts, IOU summary right after a settle).

### Pattern 4: Query-Key Factory (Wave 1, single source of truth)

```ts
// src/lib/queryKeys.ts — NEW, single source of truth.
// Hierarchical factory pattern recommended by TanStack docs and used in tanstack/query's
// own `examples/react/offline/src/movies.ts`. Enables prefix-based invalidation:
// invalidating ['habits'] invalidates every key starting with 'habits'.

export const queryKeys = {
  // --- Habits (Pilot vertical, Wave 2) ---
  habits: {
    all: () => ['habits'] as const,
    overview: (dateLocal: string) => [...queryKeys.habits.all(), 'overview', dateLocal] as const,
    detail: (habitId: string) => [...queryKeys.habits.all(), 'detail', habitId] as const,
    streak: (userId: string) => [...queryKeys.habits.all(), 'streak', userId] as const,
  },

  // --- Todos ---
  todos: {
    all: () => ['todos'] as const,
    mine: (today: string) => [...queryKeys.todos.all(), 'mine', today] as const,
    fromChats: (today: string) => [...queryKeys.todos.all(), 'fromChats', today] as const,
    chatList: (groupChannelId: string) => [...queryKeys.todos.all(), 'chatList', groupChannelId] as const,
  },

  // --- Chat ---
  chat: {
    all: () => ['chat'] as const,
    list: (userId: string) => [...queryKeys.chat.all(), 'list', userId] as const,
    room: (channelId: string) => [...queryKeys.chat.all(), 'room', channelId] as const,
    messages: (channelId: string, opts: { before?: string } = {}) =>
      [...queryKeys.chat.room(channelId), 'messages', opts] as const,
    members: (channelId: string) => [...queryKeys.chat.room(channelId), 'members'] as const,
  },

  // --- Plans ---
  plans: {
    all: () => ['plans'] as const,
    list: (userId: string) => [...queryKeys.plans.all(), 'list', userId] as const,
    detail: (planId: string) => [...queryKeys.plans.all(), 'detail', planId] as const,
    photos: (planId: string) => [...queryKeys.plans.all(), 'photos', planId] as const,
    allPhotos: (userId: string) => [...queryKeys.plans.all(), 'allPhotos', userId] as const,
  },

  // --- Friends ---
  friends: {
    all: () => ['friends'] as const,
    list: (userId: string) => [...queryKeys.friends.all(), 'list', userId] as const,
    detail: (friendId: string) => [...queryKeys.friends.all(), 'detail', friendId] as const,
    ofFriend: (friendId: string) => [...queryKeys.friends.all(), 'ofFriend', friendId] as const,
    pendingRequests: (userId: string) => [...queryKeys.friends.all(), 'pendingRequests', userId] as const,
    wishList: (userId: string) => [...queryKeys.friends.all(), 'wishList', userId] as const,
  },

  // --- Expenses (IOU) ---
  expenses: {
    all: () => ['expenses'] as const,
    list: (userId: string) => [...queryKeys.expenses.all(), 'list', userId] as const,
    detail: (expenseId: string) => [...queryKeys.expenses.all(), 'detail', expenseId] as const,
    withFriend: (friendId: string) => [...queryKeys.expenses.all(), 'withFriend', friendId] as const,
    iouSummary: (userId: string) => [...queryKeys.expenses.all(), 'iouSummary', userId] as const,
  },

  // --- Home aggregates ---
  home: {
    all: () => ['home'] as const,
    friends: (userId: string) => [...queryKeys.home.all(), 'friends', userId] as const,
    upcomingEvents: (userId: string) => [...queryKeys.home.all(), 'upcomingEvents', userId] as const,
    upcomingBirthdays: (userId: string) => [...queryKeys.home.all(), 'upcomingBirthdays', userId] as const,
    invitationCount: (userId: string) => [...queryKeys.home.all(), 'invitationCount', userId] as const,
    pendingRequestCount: (userId: string) => [...queryKeys.home.all(), 'pendingRequestCount', userId] as const,
    spotlight: (userId: string) => [...queryKeys.home.all(), 'spotlight', userId] as const,
  },

  // --- Polls / votes ---
  polls: {
    all: () => ['polls'] as const,
    poll: (pollId: string) => [...queryKeys.polls.all(), 'poll', pollId] as const,
    wishListVotes: (wishItemId: string) => [...queryKeys.polls.all(), 'wishListVotes', wishItemId] as const,
  },

  // --- Status (read side) ---
  status: {
    all: () => ['status'] as const,
    invitations: (userId: string) => [...queryKeys.status.all(), 'invitations', userId] as const,
  },
} as const;
```

Why this exact pattern:
- Hierarchical keys enable `invalidateQueries({ queryKey: queryKeys.habits.all() })` to invalidate ALL habit queries at once. [CITED: [TanStack Query Invalidation docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)]
- Factory functions guarantee key shape and TypeScript types. [CITED: [tanstack/query examples/react/offline/src/movies.ts](https://github.com/TanStack/query/blob/main/examples/react/offline/src/movies.ts) uses identical pattern.]
- `as const` typing means callers get literal types — invalidating with a typo at the call site is a TS error, not a runtime no-op.
- Per-user keys (`list(userId)`) make sign-out invalidation safe: `removeQueries({ queryKey: queryKeys.chat.list(oldUserId) })`.

### Pattern 5: Optimistic-Mutation Shape (one canonical form, used everywhere)

```ts
// Canonical mutation shape. Used identically for habit toggle, RSVP, expense create,
// chat send (with media-upload variant), wish-list vote, IOU settle, etc.

const mutation = useMutation({
  mutationFn: async (input: ToggleHabitInput) => {
    const { error } = await supabase.rpc('toggle_habit_today_checkin', {
      p_habit_id: input.habitId,
      p_date_local: input.dateLocal,
    });
    if (error) throw error;
    return input;
  },

  onMutate: async (input) => {
    // 1. Cancel in-flight refetches so they don't clobber our optimistic write
    await queryClient.cancelQueries({ queryKey: queryKeys.habits.overview(input.dateLocal) });

    // 2. Snapshot
    const previous = queryClient.getQueryData<HabitOverviewRow[]>(
      queryKeys.habits.overview(input.dateLocal)
    );

    // 3. Optimistic write
    queryClient.setQueryData<HabitOverviewRow[]>(
      queryKeys.habits.overview(input.dateLocal),
      (old) => old?.map((h) =>
        h.habit_id === input.habitId
          ? {
              ...h,
              did_me_check_in_today: !h.did_me_check_in_today,
              completed_today: !h.did_me_check_in_today
                ? h.completed_today + 1
                : Math.max(0, h.completed_today - 1),
            }
          : h
      ) ?? []
    );

    return { previous };   // becomes ctx in onError / onSettled
  },

  onError: (_err, input, ctx) => {
    if (ctx?.previous) {
      queryClient.setQueryData(queryKeys.habits.overview(input.dateLocal), ctx.previous);
    }
  },

  onSettled: (_data, _err, input) => {
    // Refetch from server to settle on canonical state (handles race conditions
    // where another client modified the row in between)
    void queryClient.invalidateQueries({ queryKey: queryKeys.habits.overview(input.dateLocal) });
    // Also invalidate detail screen if user is on it
    void queryClient.invalidateQueries({ queryKey: queryKeys.habits.detail(input.habitId) });
  },
});
```

Concrete mappings to Campfire's mutation classes:

| Mutation | Optimistic strategy | Invalidate keys on settle |
|----------|--------------------|---------------------------|
| Toggle habit check-in | `setQueryData` flip flag + adjust counter (same as today's `useHabits.toggleToday`) | `habits.overview(today)`, `habits.detail(habitId)`, `home.all()` |
| Chat message send (text) | Prepend optimistic row with `pending: true` | NONE — Realtime INSERT will reconcile (Pattern 6 below); on error mark `failed: true` like today |
| Chat message send (image) | Same shape; `image_url = localUri` | NONE — same as text |
| Plan RSVP | `setQueryData` update member row | `plans.list(userId)`, `plans.detail(planId)`, `home.upcomingEvents(userId)` |
| Expense create | Prepend optimistic group to `expenses.list(userId)` and `expenses.withFriend(friendId)` | `expenses.*` (broad, run once on settle) |
| Expense settle | `setQueryData` flip `settled_at` for current user's member row | `expenses.iouSummary(userId)`, `expenses.detail(expenseId)`, `expenses.withFriend(friendId)`, `home.all()` |
| Wish-list vote | `setQueryData` increment local count + flip `voted_by_me` | `polls.wishListVotes(wishItemId)` |
| Poll vote | `setQueryData` increment count | `polls.poll(pollId)` |
| Status set (own status) | `setStatusStore` + `setQueryData` if a query holds my status | `status.*`, `home.friends(userId)` (so my own card refreshes on home for other users via Realtime) |
| Plan create | NO optimistic — show pending UI in the form, navigate to detail on success | `plans.list(userId)`, `home.upcomingEvents(userId)` |

**Decision rule: optimistic vs. just-invalidate.** Use `onMutate` snapshot+rollback when the operation has clear local invariants (toggle, vote, RSVP). Use plain `onSuccess: invalidateQueries` for create/delete with side effects (plan create runs an RPC that creates `plan_members` rows — too much to optimistic-write).

### Pattern 6: Realtime Bridge — Hybrid Strategy

The chosen strategy is **Hybrid (CONTEXT §4)**, defined precisely:

- **INSERT** → `setQueryData` to prepend the new row when payload contains the full row. Falls back to `invalidateQueries` if the payload is incomplete.
- **DELETE** → `setQueryData` to filter out the row by id.
- **UPDATE** → `invalidateQueries` to force a refetch. Avoids the "missed-field" bug where partial UPDATE payloads can drift the cache. [CITED: [Supabase Realtime postgres_changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) — UPDATE payloads contain `new` (full new row) and `old` (only `replica identity` columns, typically just PK).]

The bridge module deduplicates channels so two screens consuming the same data don't open two subscriptions:

```ts
// src/lib/realtimeBridge.ts — NEW
import { supabase } from '@/lib/supabase';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

type Unsubscribe = () => void;

// Registry: channelName -> { refCount, channel, teardown }
const registry = new Map<string, {
  refCount: number;
  teardown: () => void;
}>();

export function subscribeHabitCheckins(
  queryClient: QueryClient,
  userId: string,
  today: string
): Unsubscribe {
  const channelName = `habit-checkins-${userId}`;
  const existing = registry.get(channelName);
  if (existing) {
    existing.refCount++;
    return () => releaseSubscription(channelName);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'habit_checkins', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          // Cheap: re-derive the overview from the cache + payload would be brittle here
          // because get_habits_overview is an aggregation RPC. Use invalidate.
          void queryClient.invalidateQueries({ queryKey: queryKeys.habits.overview(today) });
        } else if (payload.eventType === 'UPDATE') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.habits.overview(today) });
        }
      }
    )
    .subscribe();

  registry.set(channelName, {
    refCount: 1,
    teardown: () => {
      void supabase.removeChannel(channel);
    },
  });

  return () => releaseSubscription(channelName);
}

function releaseSubscription(channelName: string) {
  const entry = registry.get(channelName);
  if (!entry) return;
  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.teardown();
    registry.delete(channelName);
  }
}

// Repeat the pattern for: chat messages (channelName: `chat-${roomId}`),
// statuses (`home-statuses-${userId}` with filter `user_id=in.(${friendIds})`),
// reactions (`reactions-${roomId}`), poll_votes (`poll-votes-${roomId}`)
```

Per-hook usage:

```ts
// Inside useHabits — replaces the channelRef + useEffect dance
const queryClient = useQueryClient();
useEffect(() => {
  if (!userId) return;
  return subscribeHabitCheckins(queryClient, userId, todayLocal());
}, [queryClient, userId]);
```

When `setQueryData` IS safe and preferred (for `messages` table — chat surface, deferred to last batch):

```ts
// INSERT handler — prepend canonical row, dedupe optimistic by id
// (same id semantics as today's useChatRoom dedup at lines 333-379)
queryClient.setQueryData<MessageWithProfile[]>(
  queryKeys.chat.messages(channelId),
  (old) => {
    if (!old) return old;
    const incoming = enrichMessage(payload.new as Message);
    const optimisticIdx = old.findIndex((m) => m.pending && m.id === incoming.id);
    if (optimisticIdx >= 0) {
      const next = [...old];
      next[optimisticIdx] = incoming;
      return next;
    }
    if (old.some((m) => m.id === incoming.id)) return old; // dedup
    return [incoming, ...old];
  }
);
```

### Pattern 7: Auth Bridge (sign-in / sign-out invalidation)

Hook into the existing `supabase.auth.onAuthStateChange` block in `_layout.tsx`:

```ts
// Inside the existing useEffect that subscribes to onAuthStateChange:

const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((event, s) => {
  setSession(s);

  if (event === 'SIGNED_OUT') {
    // tkdodo's recommendation: removeQueries, NOT invalidateQueries.
    // Invalidate would refetch with no auth — every refetch returns 401.
    queryClient.removeQueries();
    setNeedsProfileSetup(false);
  }

  if (event === 'SIGNED_IN' && s) {
    // No need to invalidate — there's no stale data from a different user yet
    // (removeQueries on sign-out cleared everything). Profile lookup stays.
    supabase.from('profiles').select('username').eq('id', s.user.id).maybeSingle()
      .then(({ data: profile }) => setNeedsProfileSetup(!profile?.username));
  }
});
```

Rationale: [CITED: [TkDodo recommendation in TanStack/query discussion #1886](https://github.com/TanStack/query/discussions/1886) — "use `removeQueries` for logout, not `invalidateQueries`, because invalidating queries with expired credentials triggers refetches that fail immediately."]

### Anti-Patterns to Avoid

- **Mixing zustand server-state mirrors with TanStack Query.** Today's `useChatStore.chatList`, `useHomeStore.friends`, `usePlansStore.plans` are zustand mirrors of server data. As each hook migrates, the mirror MUST be removed in the same plan — keeping both is the worst of both worlds (drift bugs + cognitive load).
- **Per-component Realtime subscriptions.** If `HabitsTile` (home) and `HabitsListScreen` both subscribe to `habit_checkins`, we get duplicate channels (violates CONTEXT §6). The bridge registry pattern dedupes.
- **Invalidating on every Realtime UPDATE without batching.** A flood of UPDATEs (e.g., many statuses changing at once) will trigger redundant refetches. TanStack Query coalesces invalidations within the same tick, but consider `refetchType: 'none'` if you can also call `setQueryData` directly.
- **Optimistic writes without `cancelQueries`.** Without it, an in-flight refetch can land AFTER the optimistic write and overwrite it. The canonical mutation shape includes `cancelQueries` for exactly this reason.
- **Reading `queryClient.getQueryData` from inside the queryFn.** The queryFn must be pure with respect to the cache — it owns the network fetch, not the cache.
- **Forgetting to type the queryFn's return shape.** TS will infer `unknown` in some chains; explicit typing on `useQuery<HabitOverviewRow[]>` is required for `setQueryData`/`getQueryData` callers to type-check.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache-with-TTL for Supabase reads | The 30s TTL in `useChatList.ts:9, 286-297` and `useChatStore.lastFetchedAt` | `useQuery({ staleTime })` | TanStack Query handles freshness, refetch-on-stale, and concurrent-fetch dedupe. The current code is correct but rebuilds part of the library. |
| Snapshot+revert for optimistic mutations | The `habitsRef.current` mirror in `useHabits.ts:42-43, 108-149` | `useMutation({ onMutate, onError })` with `getQueryData`/`setQueryData` | The ref trick exists ONLY to dodge React 18's deferred-setState quirk (Phase 29.1 Decision). TanStack Query's `onMutate` already returns the snapshot synchronously via context, so the workaround vanishes. |
| Realtime + setState dedup for the user's own action | The `incomingUserId === currentUserId` early-returns in `useChatRoom.ts:222, 255, 277, 295` | Pattern 6 (dedup by id within `setQueryData` callback) | Realtime echoes the user's own writes back; optimistic write already updated the cache. id-based dedup is cleaner than user-id checks. |
| Hand-rolled "refetch on focus" | The `useFocusEffect(useCallback(() => { fetch(); }, []))` in 13 hooks (verified via grep) | `staleTime` + `useRefreshOnFocus` (Pattern 3) where needed | Most focus refetches are wasteful (data unchanged). `staleTime` covers it; targeted `useRefreshOnFocus` for screens that actually need it. |
| Cross-screen mirror via zustand store | `useChatStore.chatList`, `useHomeStore.friends`, `usePlansStore.plans` | The query cache itself | Multiple `useQuery` callers with the same key share data automatically. No mirror needed. |
| Subscription lifecycle book-keeping per hook | Each hook's `channelRef.current` + cleanup useEffect | `src/lib/realtimeBridge.ts` registry with ref counting | One subscription per channel regardless of how many components mount the corresponding queries. |
| Manual retry/backoff for failed reads | None currently in Campfire — fetches fail silently | TanStack Query's `retry: (count, err) => ...` | Built-in exponential backoff; configurable per-query. |
| Per-screen network cancellation on unmount | None — fetches continue after navigation | TanStack Query auto-cancellation via `AbortController` (when queryFn accepts a signal) | Future-proof signal-aware queryFns; not critical for Phase 31 but worth a note. |

**Key insight:** Every hook in `src/hooks/use*.ts` (~5200 LOC total) implements partial server-state-manager logic. The migration deletes more code than it adds. Hooks shrink from ~150 LOC to ~30 LOC each.

---

## Pilot Vertical Deep-Dive: Habits

CONTEXT.md proposes habits as the pilot. **Confirmed by codebase audit.** Reasons:

1. **Isolated.** Habits has its own routes (`src/app/squad/habits/*`), its own table (`habits`, `habit_members`, `habit_checkins` from migration 0024), and its own RPCs (`get_habits_overview`, `toggle_habit_today_checkin`, etc.). No shared writes with other features.
2. **Clearest cross-screen reactivity payoff.** Today three surfaces mount their own copy of the data:
   - `src/components/home/HabitsTile.tsx` (Bento tile on home)
   - `src/components/squad/HabitsListScreen` / Activity tab (or wherever the squad list lives)
   - `src/app/squad/habits/[id].tsx` (detail screen)
   
   Today, toggling a habit in detail does NOT update the home tile until home re-focuses (Phase 29.1 Decision: "useHabits Realtime filter is user_id=eq.${userId} (caller only) — co-member updates surface via manual refetch on screen focus"). With TanStack Query, all three mount `useQuery({ queryKey: habitKeys.overview(today) })`; one toggle's `setQueryData` updates all three instantly.
3. **Existing test infrastructure.** `src/hooks/__tests__/useHabits.test.ts` already mocks supabase and covers the optimistic-toggle + revert path — the test contract translates directly to the new `useMutation` shape.
4. **Low-stakes failure mode.** Habits is not in the critical path (chat is). If a regression slips through pilot review, it's recoverable. Validates the conventions on a survivable surface.
5. **Already has Realtime.** `useHabits.ts:78-101` runs a single per-user channel. Migrating it into the bridge module exercises the registry pattern.

### Hooks in the Pilot

| Hook | Status | New Shape |
|------|--------|-----------|
| `useHabits` | Migrated | `useQuery(habits.overview(today))` + `useMutation` for `toggleToday` |
| `useHabitDetail` | Migrated | `useQuery(habits.detail(habitId))` |
| `useStreakData` | **DO NOT migrate in pilot** | Streak is a Bento home tile separate from habit check-ins (it pulls from `useStreakData.ts` — different RPC, different table). Touch in the home-aggregates wave, not pilot. |

Files that change in the pilot:

- `src/hooks/useHabits.ts` — full rewrite (152 → ~50 LOC)
- `src/hooks/useHabitDetail.ts` — full rewrite (128 → ~40 LOC)
- `src/hooks/__tests__/useHabits.test.ts` — test rewrite for new shape
- `src/lib/queryKeys.ts` — add `habits` namespace (also done in Wave 1)
- `src/lib/realtimeBridge.ts` — add `subscribeHabitCheckins` (also done in Wave 1)
- All callers: every `import { useHabits }` and `import { useHabitDetail }` site (grep returns ~6 callers — to be confirmed in plan)

### Cross-Screen Reactivity Test (acceptance criterion)

> Open habit detail screen. Toggle today's check-in. Without backing out, open a second device / a simulator background-foreground. On both surfaces, navigate to home — the Habits tile completed_today counter reflects the new value WITHOUT a focus-driven refetch.

This is the canonical demo that proves Phase 31's value proposition.

### Pilot Exit Criteria (before Wave 3 begins)

- All habit-related screens render correctly across Expo Go AND a dev client.
- Realtime invalidation produces a measurable cache-hit ratio improvement (devtools shows queries marked stale → refetch on Realtime vs. mounted-as-fresh).
- Test suite green; the optimistic-toggle test from `useHabits.test.ts` continues to assert behavior, not implementation.
- No duplicate channels in `supabase.removeChannel` audit (Realtime registry pattern verified).

---

## Persistence Recommendation

CONTEXT.md asks: persist via `@tanstack/query-async-storage-persister` vs. keep hand-rolled. Recommendation:

**Split strategy.** Adopt `PersistQueryClientProvider` IN A LATER WAVE (after pilot ships), and ONLY for cache-able lists that benefit from cold-start UX. Configure with:

- `gcTime: 24 * 60 * 60 * 1000` (24 h) for queries that should survive across app launches
- `maxAge: 24 * 60 * 60 * 1000` — default; restored cache older than this is discarded
- `throttleTime: 1000` — built-in; persister writes at most once per second
- `dehydrateOptions.shouldDehydrateQuery` — selectively persist (see below)

### What to persist

| Surface | Persist? | Reason |
|---------|----------|--------|
| Habits overview | YES | Cold-start home shows yesterday's habits before today's RPC resolves. UX win. |
| Friends list, home aggregates | YES | High-value cold-start info. Small payload (~20 friends per user typical). |
| Plans list | YES | Shows recent plans on cold start. |
| IOU summary, expenses lists | YES | Same UX win as habits. |
| Chat list (`useChatList`) | **NO** | Already hand-rolls AsyncStorage caching via `useChatStore.lastFetchedAt` + per-chat `chat:last_read:*` semantics that the persister doesn't model. Migrate chat list LAST, and revisit persistence then. |
| Chat room messages (`useChatRoom`) | **NO** | High-volume; AsyncStorage 6 MB Android cap is a real risk. Messages stay in-memory only. |
| Photo galleries | **NO** | Asset URLs are signed and time-limited (Phase 22 — 1 h TTL on plan-gallery signed URLs). Persisting them would serve expired URLs on cold start. |

### How to do selective persistence

```ts
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'campfire-query-cache-v1',  // bump on shape-breaking changes
  throttleTime: 1000,
});

<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    maxAge: 24 * 60 * 60 * 1000,
    buster: APP_VERSION,             // wipe cache on app version change
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        const root = query.queryKey[0];
        // Persist most domains; explicitly exclude high-churn / sensitive surfaces.
        return root !== 'chat' && root !== 'plans-photos';
      },
    },
  }}
>
  {children}
</PersistQueryClientProvider>
```

### Comparison with hand-rolled caching

| Concern | Hand-rolled (`useChatList`) | `PersistQueryClientProvider` | Verdict |
|---------|----------------------------|------------------------------|---------|
| Cold-start UX | Shows stored chatList (zustand mirrored back from AsyncStorage in `useChatStore`) | Same — restores cache before queries run | Tie |
| TTL semantics | 30s in-memory, infinite on disk | `staleTime` + `maxAge` | Persister cleaner |
| GC of inactive entries | None (memory leak via zustand list) | `gcTime` removes inactive | Persister wins |
| Multi-key consistency | Each hook has its own scheme | One serialized blob | Persister wins |
| Schema versioning | None | `buster` key | Persister wins |
| Selective control | Hand-coded per key | `shouldDehydrateQuery` predicate | Tie |
| Chat-list "last read" semantics | Custom keys: `chat:last_read:*`, `chat:hidden:*`, `chat:muted:*` | Not modeled | **Hand-rolled wins for chat** |

Conclusion: persister for most domains; keep chat's hand-rolled keys (which represent per-chat preferences, not the cache itself) untouched.

### Bundle / storage impact

- `@tanstack/query-async-storage-persister` adds ~2 KB gzipped [ASSUMED — pkg size estimate from changelogs]
- AsyncStorage on Android caps at 6 MB by default [CITED: [react-native-async-storage issue #83](https://github.com/react-native-async-storage/async-storage/issues/83)] — persister with maxAge: 24h and our typical payload (habits + friends + plans + expenses summary ~ tens of KB) is well below this limit.
- iOS has no equivalent cap (uses dictionaries / native storage).
- If we ever bump into the cap, migrate to MMKV via a custom persister (~30x faster) [CITED: [oneuptime AsyncStorage vs MMKV](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view)] — deferred to a follow-up phase.

---

## Migration Mechanics

### Coexistence Strategy

Old hooks (`useState` + `supabase`) and new hooks (`useQuery`) coexist mid-migration:

```ts
// During Wave 2 (pilot), HomeScreen still uses old useFriends, but HabitsTile
// uses the new useHabits. Both render fine because:
// - QueryClientProvider is mounted (Wave 1)
// - Old useState-based hooks don't depend on it
// - New hooks pick it up via context
```

**Cardinal rule:** Don't half-migrate a hook. If `useHabits` becomes `useQuery`-based, every caller in this commit/PR moves with it. No "some callers use the new API, others use the old one" — that creates two parallel caches and defeats the cross-screen-reactivity goal.

### Naming Convention

**Recommendation: keep the same hook name; internal swap.**

Rationale:
- Callers don't change their import sites for cosmetic reasons.
- The return shape stays compatible (`{ habits, loading, error, refetch, toggleToday }`) — we just remap to `useQuery`'s shape internally.
- New conventions (`useHabitsQuery`) would force 30+ callsite edits per hook for no reader benefit.
- If a hook MUST break its public shape (e.g., the `refetch` signature changes), do that in a follow-up commit AFTER the internal swap is verified.

Exception: aggregate hooks whose old shape was hostile to the new pattern (e.g., the home aggregates that hand-roll loading-when-any-loads) may justify a renamed hook with a deprecated alias.

### Caller Audit (detecting last user before retiring an old hook)

```bash
# Generic pattern
grep -rln "from '@/hooks/useFoo'" src/ src/app/ src/components/ src/screens/
grep -rln "import.*useFoo" src/

# Confirm tests
grep -rln "useFoo" src/**/__tests__/
```

When count hits zero, the legacy code path is unreferenced and safe to delete in a cleanup plan.

### Per-vertical plan template (the planner should produce one of these per batch)

```
Wave N — <Vertical> migration

Inputs: queryKeys.<vertical> exists; realtimeBridge.subscribe<Vertical> exists.
Touches:
  - Hook file(s): src/hooks/use<X>.ts — rewrite to useQuery + useMutation
  - Test files: src/hooks/__tests__/use<X>.test.ts — rewrite assertions
  - Store: if a zustand store mirrors this server data, remove the server-data fields in the same commit
  - Realtime: any per-hook channel code moves to realtimeBridge (or use existing entry there)
  - Callers: no changes required (hook public shape preserved)
Acceptance:
  - All callers compile + render
  - Old hook's tests pass under new internals (or are explicitly rewritten with rationale)
  - Cross-screen reactivity sample test: editing X in screen A reflects in screen B without focus refetch
  - No duplicate Realtime subscriptions to the same table for the same scope
```

### Recommended Wave Order

CONTEXT.md proposes the batch order. Confirmed with one swap:

1. **Wave 1 — Foundation.** Install packages; create `queryClient.ts`, `queryKeys.ts`, `realtimeBridge.ts` (stub), `useRefreshOnFocus.ts`; mount `QueryClientProvider` in `_layout.tsx`; wire `focusManager`, `onlineManager`, auth bridge; add `@dev-plugins/react-query` hook. No hook migrations yet.
2. **Wave 2 — Pilot: Habits.** `useHabits` + `useHabitDetail`. Validate conventions, devtools, cross-screen reactivity.
3. **Wave 3 — Home aggregates + Todos.** `useHomeScreen`, `useUpcomingBirthdays`, `useUpcomingEvents`, `useInvitationCount`, `usePendingRequestsCount`, `useSpotlight`, `useTodos`, `useChatTodos`. Mostly read-only; low-risk warmup before the heavier surfaces.
4. **Wave 4 — Plans.** `usePlans`, `usePlanDetail`, `usePlanPhotos`, `useAllPlanPhotos`. Has Realtime (none currently), has mutations (create, RSVP, photo upload).
5. **Wave 5 — Friends + Expenses.** `useFriends`, `useFriendsOfFriend`, `useFriendWishList`, `useMyWishList`, `useWishListVotes`, `useExpensesWithFriend`, `useExpenseDetail`, `useIOUSummary`, `useExpenseCreate`. Mutations include the optimistic flip (wish vote, IOU settle).
6. **Wave 6 — Status + Polls + misc.** `useStatus` (interacts with `useStatusStore`, careful), `usePoll`, `useViewPreference` (this one might NOT migrate — it's truly local UI prefs in AsyncStorage), `useInvitations`, `useNetworkStatus` (does NOT migrate — already uses NetInfo and is a non-Supabase hook).
7. **Wave 7 — Chat (last).** `useChatList`, `useChatRoom`, `useChatMembers`. Highest-traffic + most-complex caching/Realtime/deduplication logic. Migrate LAST after every convention is battle-tested. Re-evaluate persistence and `chat:last_read:*` semantics in this wave.
8. **Wave 8 — Persistence + cleanup.** Enable `PersistQueryClientProvider` with the selective `shouldDehydrateQuery`. Remove dead zustand mirrors (`useChatStore.chatList`, `useHomeStore.friends`, etc.). Write the boundary doc. Run the verification anchor.

The swap from CONTEXT.md's order: I move **Home aggregates + Todos** BEFORE Plans/Friends/Expenses because the home aggregates are mostly read-only and exercise the cross-screen reactivity pattern (HabitsTile + TodosTile + StreakTile on the home Bento grid) immediately after the pilot. CONTEXT.md groups them as "home aggregates (misc)" near the end; running them right after pilot extends the pattern faster and avoids re-touching home in every subsequent wave.

---

## Runtime State Inventory

This is not a rename phase, but the inventory is partially relevant — Phase 31 changes how server state is *stored at runtime in the client process*, and a few pieces of cached state move from zustand → query cache, while a few stay.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `useChatStore.chatList` + `lastFetchedAt`, `useHomeStore.friends` + `lastActiveAt` + `lastFetchedAt`, `usePlansStore.plans` + `lastFetchedAt` — currently zustand "stale-time" caches | Code edit per migration wave: remove `chatList`/`friends`/`plans` fields after their hook migrates. KEEP `useChatStore.invalidateChatList` (or its successor) until chat wave. KEEP `lastActiveAt` (UI overlay timing — NOT server data). |
| Stored data (chat) | AsyncStorage keys `chat:last_read:*`, `chat:hidden:*`, `chat:muted:*`, `chat:rooms:cache` | **Keep all.** These are per-chat user preferences, not the query cache. They survive migration unchanged. |
| Live service config | Supabase Realtime channels — currently subscribed per-hook (`useHabits`, `useHomeScreen`, `useChatRoom`). Channel names: `user-${userId}-checkins`, `home-statuses`, `chat-${roomId}` | Move subscription owners from hooks → `src/lib/realtimeBridge.ts`. Channel NAMES stay the same (no Supabase-side reconfiguration). Confirms CONTEXT §6 dedupe goal. |
| OS-registered state | None | None |
| Secrets / env vars | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Unchanged — TanStack Query is fully client-side, no new secrets. |
| Build artifacts | None | None — `npx expo install` updates `package.json` + `package-lock.json` only |

**Nothing found in 3 of 5 categories** — verified by inspection of `src/lib/supabase.ts`, `src/stores/*`, the absence of any non-AsyncStorage native storage usage, and the env-var grep.

---

## Common Pitfalls

### Pitfall 1: Hydration race — restored cache reads before queries mount
**What goes wrong:** With `PersistQueryClientProvider`, the cache restore is async. If a `useQuery` mounts during restoration, you may get a transient `undefined` data state followed by the restored value.
**Why it happens:** Async storage IO has unavoidable latency.
**How to avoid:** `PersistQueryClientProvider` handles this by gating the children render until restore completes. Don't roll your own hydration. [CITED: [TanStack Query persistQueryClient docs](https://tanstack.com/query/v5/docs/framework/react/plugins/persistQueryClient)]
**Warning signs:** Flicker on cold start; data appears, vanishes, reappears.

### Pitfall 2: Devtools accidentally shipping to production
**What goes wrong:** Devtools UI ships in production builds, exposing internal app state.
**Why it happens:** Forgetting to gate the import behind `__DEV__`.
**How to avoid:** Use `@dev-plugins/react-query` — Expo's dev-tools plugin pattern auto-gates on `__DEV__`, so the production bundle does NOT include the UI. [CITED: [Expo Dev Tools Plugins docs](https://docs.expo.dev/debugging/devtools-plugins/)] If using `@tanstack/react-query-devtools` (web), use the `React.lazy` + production-import pattern from [TanStack devtools docs](https://tanstack.com/query/v5/docs/framework/react/devtools).
**Warning signs:** Bundle size jump in prod build; devtools overlay visible in TestFlight build.

### Pitfall 3: Duplicate Realtime subscriptions after migration
**What goes wrong:** Two screens both call `useFoo()`, and `useFoo` opens a Supabase channel internally. The same channel name gets two `.subscribe()` calls — Supabase silently allows this; you pay per-connection.
**Why it happens:** Migrating a hook without removing its own `channelRef` while also having the realtimeBridge open a sibling subscription for the same data.
**How to avoid:** Per-vertical migration plan template MUST require: "subscription book-keeping moves OUT of the hook and INTO `realtimeBridge.ts`." Plan reviewer's grep gate: `grep -n "supabase.channel" src/hooks/use<X>.ts` returns zero after the wave.
**Warning signs:** Supabase dashboard shows higher concurrent-connection count than user count; `subscribe()` calls in dev tools doubled.

### Pitfall 4: Cached data from a previous user surfacing after sign-out + sign-in
**What goes wrong:** User A's habits visible briefly after User B signs in.
**Why it happens:** Forgetting to call `queryClient.removeQueries()` on `SIGNED_OUT` in the auth listener. Or using `invalidateQueries` instead — which refetches with new auth, briefly showing stale data.
**How to avoid:** Pattern 7 above — `removeQueries` (not invalidate) on `SIGNED_OUT`. Per-user keys in the factory (most read keys include `userId`) provide a defense in depth: even if a query slips through, the new user's `useQuery` runs with a different key.
**Warning signs:** "I see someone else's data for a second" reports during multi-account testing.

### Pitfall 5: `setQueryData` overwritten by stale in-flight fetch
**What goes wrong:** Optimistic write disappears after a fraction of a second.
**Why it happens:** `useQuery` had a refetch in-flight when the user toggled. The refetch lands after the optimistic write and overwrites it with the pre-toggle server state. The real change arrives via Realtime later, so it looks like a flicker.
**How to avoid:** Always `await queryClient.cancelQueries({ queryKey })` at the START of `onMutate`. The canonical Pattern 5 shape includes this.
**Warning signs:** Toggle flips, flips back, then flips again as Realtime arrives.

### Pitfall 6: Supabase UPDATE payload missing the column you want to write
**What goes wrong:** `setQueryData` on UPDATE uses `payload.new`, but `payload.new` for UPDATE contains only the columns affected by REPLICA IDENTITY (usually PK only, unless table is `ALTER TABLE ... REPLICA IDENTITY FULL`).
**Why it happens:** Default Postgres replication identity is the PK only; full-row UPDATE payloads require explicit `REPLICA IDENTITY FULL`.
**How to avoid:** Use `invalidateQueries` on UPDATE (the Hybrid strategy) instead of `setQueryData`. Reserve `setQueryData` for INSERT/DELETE where payload.new / payload.old contain the full / minimum-key row.
**Warning signs:** UPDATEs partially update the UI; some fields stale.

### Pitfall 7: Memory pressure on lower-end Android
**What goes wrong:** Cache grows unbounded; older devices OOM.
**Why it happens:** Default `gcTime: 5min` is fine; `gcTime: 24h` for persistence is fine; but if you load 10,000 messages into a single query, the cache holds them all.
**How to avoid:** Use infinite-query pattern for chat messages (paginate in `useInfiniteQuery`). Set sane `staleTime` so old pages drop. Don't persist message lists (already excluded above).
**Warning signs:** Random crashes after long chat sessions on Android.

### Pitfall 8: Expo Go vs. dev client differences
**What goes wrong:** `@react-native-community/netinfo` may behave differently in Expo Go (limited native modules) vs. dev client.
**Why it happens:** Expo Go bundles a fixed set of native modules; NetInfo is included but behavior may differ.
**How to avoid:** Test BOTH on Expo Go AND on a dev client at each wave boundary. Document any environment-specific findings in plan SUMMARY notes.
**Warning signs:** Tests pass locally but fail on TestFlight.

### Pitfall 9: Test-mock drift after migration
**What goes wrong:** `src/hooks/__tests__/useHabits.test.ts` mocks `supabase` directly. After migration, hooks call `useQueryClient()` — tests must now wrap renderHook in a `QueryClientProvider`.
**Why it happens:** Forgetting to update the test wrapper.
**How to avoid:** Add a test util (e.g. `src/__mocks__/createTestQueryClient.tsx`) that wraps `renderHook` calls with a fresh `QueryClientProvider`. Every migrated hook's test imports it.
**Warning signs:** `useQueryClient must be used within QueryClientProvider` test errors.

### Pitfall 10: Forgetting to invalidate cross-vertical queries
**What goes wrong:** Settling an IOU updates `expenses.iouSummary` but the home tile (which reads from `home.all()`) doesn't refresh.
**Why it happens:** Mutation only invalidates its "own" namespace.
**How to avoid:** When a mutation touches data that home-aggregates also display, invalidate both: `queryKeys.expenses.iouSummary(userId)` AND `queryKeys.home.all()`. The migration template's "Acceptance" section forces this audit per wave.
**Warning signs:** Home tile shows wrong number until next focus.

---

## Code Examples

### Migrated `useHabits` (Wave 2 — pilot)

```ts
// src/hooks/useHabits.ts — after Wave 2 migration
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { todayLocal } from '@/lib/dateLocal';
import { queryKeys } from '@/lib/queryKeys';
import { subscribeHabitCheckins } from '@/lib/realtimeBridge';
import type { HabitOverviewRow } from '@/types/habits';

export interface UseHabitsResult {
  habits: HabitOverviewRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  toggleToday: (habitId: string) => Promise<{ error: string | null }>;
}

export function useHabits(): UseHabitsResult {
  const userId = useAuthStore((s) => s.session?.user?.id) ?? null;
  const today = todayLocal();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.habits.overview(today),
    queryFn: async (): Promise<HabitOverviewRow[]> => {
      const { data, error } = await supabase.rpc('get_habits_overview', {
        p_date_local: today,
      });
      if (error) throw error;
      return ((data ?? []) as unknown) as HabitOverviewRow[];
    },
    enabled: !!userId,
  });

  // Realtime — bridge handles ref-counted dedup
  useEffect(() => {
    if (!userId) return;
    return subscribeHabitCheckins(queryClient, userId, today);
  }, [queryClient, userId, today]);

  const toggleMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase.rpc('toggle_habit_today_checkin', {
        p_habit_id: habitId,
        p_date_local: today,
      });
      if (error) throw error;
    },
    onMutate: async (habitId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.habits.overview(today) });
      const previous = queryClient.getQueryData<HabitOverviewRow[]>(
        queryKeys.habits.overview(today)
      );
      queryClient.setQueryData<HabitOverviewRow[]>(
        queryKeys.habits.overview(today),
        (old) => old?.map((h) => h.habit_id === habitId
          ? {
              ...h,
              did_me_check_in_today: !h.did_me_check_in_today,
              completed_today: !h.did_me_check_in_today
                ? h.completed_today + 1
                : Math.max(0, h.completed_today - 1),
            }
          : h
        ) ?? []
      );
      return { previous };
    },
    onError: (_err, _habitId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKeys.habits.overview(today), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.habits.overview(today) });
    },
  });

  return {
    habits: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    toggleToday: async (habitId: string) => {
      try {
        await toggleMutation.mutateAsync(habitId);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'toggle failed' };
      }
    },
  };
}
```

Net delta: **152 LOC → ~75 LOC**, including the `useMutation` block. Public API unchanged. The `habitsRef` workaround for React 18 stale-closure is gone — the mutation's `ctx` parameter is the canonical snapshot.

### QueryClientProvider mount in _layout.tsx

```tsx
// Inside src/app/_layout.tsx, replacing the current RootLayout return.

import { QueryClientProvider } from '@tanstack/react-query';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { createQueryClient } from '@/lib/queryClient';

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient());

  // Dev-only — auto-gated on __DEV__ by the plugin
  useReactQueryDevTools(queryClient);

  // ... existing session/auth setup ...

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: DARK.surface.base }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <OfflineBanner />
          <RootLayoutStack session={session} needsProfileSetup={needsProfileSetup} />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|------------------------|--------------|--------|
| `react-query@3` with `useQuery` taking positional args | `@tanstack/react-query@5` with single options object | v4 (2022), v5 (2023) | All snippets above use v5 syntax — `useQuery({ queryKey, queryFn })`. v5 removed callbacks (`onSuccess`/`onError` on `useQuery`); use `useEffect` on the data or a Suspense-style pattern instead. [CITED: [v5 migration guide](https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5)] |
| `cacheTime` | `gcTime` (garbage collection time) | v5 rename | All snippets use `gcTime`. |
| `keepPreviousData` flag | `placeholderData: keepPreviousData` import | v5 rename | Not used in Phase 31 patterns yet but worth knowing. |
| `react-query-native-devtools` | `@dev-plugins/react-query` (Expo) or `rn-better-dev-tools` (standalone) | 2024-2025 | First-party Expo plugin is now the default RN devtools path. |
| Per-hook hand-rolled "stale-time" caching | TanStack Query `staleTime` | Always — Campfire just hasn't adopted yet | Phase 31 deliverable. |

**Deprecated / outdated:**
- `tanstack-query-dev-tools-expo-plugin` (LovesWorking) — author migrated users to `rn-better-dev-tools`. Avoid for new installs. [CITED: [LovesWorking/tanstack-query-dev-tools-expo-plugin README](https://github.com/LovesWorking/tanstack-query-dev-tools-expo-plugin)]
- `flipper`-based React Query devtools — Flipper itself is in maintenance mode for RN. Use `@dev-plugins/react-query` instead.
- `react-query-native-persist` and similar community persisters — superseded by official `@tanstack/query-async-storage-persister`.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md does not exist at the project root (`/Users/iulian/Develop/campfire/CLAUDE.md` — verified absent). No project-level coding directives apply beyond CONTEXT.md.

**Project skills:** `.claude/skills/ui-ux-pro-max` exists but is UI/UX-design specific (per Phase 24+ history) and does not constrain server-state work.

**Implicit project conventions from STATE.md "Accumulated Context":**

- Math.random UUID template is used for client-generated optimistic IDs (Hermes lacks `crypto.randomUUID()`). The chat optimistic-write path uses this. Migrated hooks must keep using the same template — do NOT swap to `crypto.randomUUID()`.
- `(supabase as any)` casts at habit RPC sites (habit_members, habit_checkins, habits table direct queries) — `database.ts` not regenerated since migration 0024. Migrated hooks keep the `as any` casts.
- Phase 29.1 Decision: "useHabits Realtime filter is `user_id=eq.${userId}` (caller only)" because `HabitOverviewRow` does not expose member_ids; co-member updates surface via manual refetch on screen focus. **In the migrated version, this changes** — Realtime-driven invalidation makes the manual focus refetch obsolete for the caller, but co-member updates still require focus refetch (same Postgres replication constraint). Note this in the pilot plan.
- All hooks use `useAuthStore((s) => s.session)` selector pattern — preserved.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tanstack/react-query` | All Phase 31 hooks | ✗ — not installed | — | None — must install |
| `@dev-plugins/react-query` | DevTools (Wave 1) | ✗ — not installed | — | Skip devtools (acceptable but undesirable) |
| `@react-native-community/netinfo` | `onlineManager` (Wave 1) | ✗ — not installed | — | None — must install for refetchOnReconnect |
| `@react-native-async-storage/async-storage` | Persister + chat caching | ✓ | `2.2.0` (per package.json) | — |
| `@supabase/supabase-js` | Network layer | ✓ | `^2.99.2` | — |
| `expo` | All native modules | ✓ | `~55.0.17` | — (peer dep for `@dev-plugins/react-query` requires `>=53.0.5` ✓) |
| `react` | All hooks | ✓ | `19.2.0` | — (TanStack Query peer dep: `^18 \|\| ^19` ✓) |
| `react-native` | All hooks | ✓ | `0.83.6` | — |
| Jest test runner | Pilot test rewrite | ✓ | `^30.3.0` | — |
| `@testing-library/react-native` | Hook tests | ✓ | `^13.3.3` | — |
| Expo CLI (devtools UI) | DevTools display | ✓ — runs from `expo start` | — | — |
| Network access (Wave 1 install) | `npx expo install` | Assumed ✓ for dev machine | — | — |

**Missing dependencies with no fallback:**
- `@tanstack/react-query` — must install
- `@react-native-community/netinfo` — must install

**Missing dependencies with fallback:**
- `@dev-plugins/react-query` — fallback is no devtools (skip the devtools hook). Strongly recommended NOT to skip; devtools are critical for verifying cross-screen reactivity and cache hit ratios in the pilot.

**Install commands the planner will issue (Wave 1):**

```bash
npx expo install @tanstack/react-query @react-native-community/netinfo @dev-plugins/react-query
# Wave 8 (persistence):
npx expo install @tanstack/query-async-storage-persister @tanstack/react-query-persist-client
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 + `@testing-library/react-native` 13 + `jest-expo` 55 |
| Config file | `/Users/iulian/Develop/campfire/jest.config.js` |
| Quick run command | `npx jest --testPathPatterns="useHabits" --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TSQ-01 | Cross-screen reactivity: editing in detail updates home tile | integration | `npx jest --testPathPatterns="useHabits.crossScreen" -x` | ❌ Wave 0 — new file `src/hooks/__tests__/useHabits.crossScreen.test.tsx` (mounts both `HabitsTile` and a stub-DetailScreen sharing a QueryClient; asserts that `setQueryData` from one mounts updates the other's render output) |
| TSQ-02 | Cache-hit on tab-switch within staleTime | unit | `npx jest --testPathPatterns="queryClient.staleTime" -x` | ❌ Wave 0 — `src/lib/__tests__/queryClient.test.ts` (asserts `fetchSpy` is NOT called within 60_000 ms of initial fetch on a remount) |
| TSQ-03 | Optimistic toggle + rollback on RPC error | unit | `npx jest --testPathPatterns="useHabits.optimistic" -x` | ✅ Existing file `src/hooks/__tests__/useHabits.test.ts` already covers the test — rewrite assertions to target the new `useMutation` shape (snapshot via ctx, rollback in `onError`) |
| TSQ-04 | Persisted cache restores on cold start | integration | `npx jest --testPathPatterns="persistQueryClient" -x` | ❌ Wave 8 — `src/lib/__tests__/persistQueryClient.test.ts` (mocks AsyncStorage, dehydrates, recreates QueryClient, hydrates, asserts `getQueryData` returns the dehydrated value) |
| TSQ-05 | No duplicate Realtime subscriptions | unit | `npx jest --testPathPatterns="realtimeBridge.dedupe" -x` | ❌ Wave 1 — `src/lib/__tests__/realtimeBridge.test.ts` (asserts that two consecutive `subscribeHabitCheckins` calls produce one `supabase.channel(...)` call, and the channel is torn down only when both unsubscribers run) |
| TSQ-06 | Zustand boundary doc exists | manual | grep — `test -f src/hooks/README.md && grep -q "TanStack Query" src/hooks/README.md` | ❌ Wave 8 — new doc file |
| TSQ-07 | Query-key taxonomy lives in one file | manual | grep — `! grep -rln "queryKey: \\['" src/hooks/ src/screens/` (assertion: no inline arrays — all go through queryKeys factory) | ❌ Wave 1 |
| TSQ-08 | Optimistic-mutation shape consistent | unit | `npx jest --testPathPatterns="mutationShape" --no-coverage` | ❌ Wave 2 — `src/hooks/__tests__/mutationShape.test.ts` (regression test: every migrated mutation in a test fixture asserts presence of `onMutate`, `onError`, `onSettled` with the snapshot+rollback+invalidate triple) — OR run as a static-analysis grep gate in CI |
| TSQ-09 | Devtools dev-only | manual | Build a production bundle with `npx expo export --platform ios`; grep output for `dev-plugins/react-query`. Should not appear. | ❌ Wave 1 — manual smoke test, documented in Wave 1 SUMMARY |
| TSQ-10 | Sign-out clears query cache | unit | `npx jest --testPathPatterns="authBridge" -x` | ❌ Wave 1 — `src/lib/__tests__/authBridge.test.ts` (simulates `onAuthStateChange('SIGNED_OUT')`; asserts `queryClient.removeQueries` called) |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPatterns="<the file you touched>" -x --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green + manual cross-screen reactivity check (the canonical demo in §Pilot Vertical Deep-Dive) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/queryClient.test.ts` — covers TSQ-02 (cache hit within staleTime)
- [ ] `src/lib/__tests__/realtimeBridge.test.ts` — covers TSQ-05 (subscription dedup)
- [ ] `src/lib/__tests__/authBridge.test.ts` — covers TSQ-10 (sign-out clears)
- [ ] `src/hooks/__tests__/useHabits.crossScreen.test.tsx` — covers TSQ-01 (cross-screen reactivity)
- [ ] `src/__mocks__/createTestQueryClient.tsx` — shared test helper wrapping `renderHook` with a fresh `QueryClientProvider` (Pitfall 9 — every migrated hook test needs it)
- [ ] Framework install: `npx expo install @tanstack/react-query @react-native-community/netinfo @dev-plugins/react-query` — required before any hook test under the new pattern can run

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@react-native-community/netinfo@12.0.1` is compatible with Expo SDK 55 (peer-dep range not explicitly verified) | Standard Stack | Low — `npx expo install` selects the SDK-compatible version, may pin to a different patch. Planner should run `npx expo install` to pin authoritative version. |
| A2 | `@dev-plugins/react-query@0.4.0` (last published 7 months ago) is still compatible with `@tanstack/react-query@5.100.10` | Standard Stack | Medium — peer dep is `*` so npm won't block install, but new TanStack Query internals could theoretically break the plugin. Verify in Wave 1 by running devtools against a sample query. |
| A3 | `@tanstack/query-async-storage-persister` adds ~2 KB gzipped | Persistence Recommendation | Low — actual size will be visible in the bundle analyzer in Wave 8 |
| A4 | The migrated `useHabits` reduces from 152 → ~75 LOC | Code Examples | Trivial — confirmation is reading the produced file in Wave 2 |
| A5 | Migrating `useChatList`/`useChatRoom` LAST is correct (vs. CONTEXT.md's ordering which lists chat second) | Migration Mechanics | Medium — CONTEXT.md doesn't prescribe within-batch order. If the user prefers chat sooner, they should override at the plan-discuss step. |
| A6 | `staleTime: 60_000` is the right default (not 30_000 or 5 min) | QueryClient Setup | Low — the Makerkit reference says "start with 60s and adjust"; the planner is free to tune per-query. |
| A7 | Supabase Realtime UPDATE payloads don't include full new rows by default (Pitfall 6) | Pitfalls | Medium — true for tables without `REPLICA IDENTITY FULL`. Worth verifying against the actual Campfire migrations before relying on it; if some tables are FULL, `setQueryData` on UPDATE is also safe for them. |
| A8 | Removing `useChatStore.chatList` (a server-data mirror) in the chat wave does not break unrelated consumers | Don't Hand-Roll | Low — grep before deletion; if any non-chat code reads it, defer the removal to a follow-up cleanup plan |
| A9 | Bundle size for `@tanstack/react-query` is ~13 KB gzipped (from CONTEXT §Risk Notes — not independently verified in this research session) | CONTEXT validation | Trivial — bundle analyzer will reveal actual size |

**Confirmation strategy:** A1, A2, A3, A4, A9 are best confirmed by running `npx expo install` and a bundle analyzer in Wave 1; A5, A6, A7 are decisions the discuss-phase or planner should explicitly lock. A8 is a per-deletion grep.

---

## Open Questions

1. **Should `useNetworkStatus.ts` (and the existing OfflineBanner) be replaced by the TanStack Query `onlineManager` listener?**
   - What we know: `useNetworkStatus.ts` is a 6-line hook (verified — `wc -l` returned 6). It already uses NetInfo or a polyfill.
   - What's unclear: Whether the OfflineBanner depends on this hook directly, and whether wiring both NetInfo+onlineManager and useNetworkStatus to the same NetInfo source causes double-render.
   - Recommendation: Out of scope for Phase 31's pilot. In Wave 1, the planner reads `useNetworkStatus.ts` + `OfflineBanner.tsx`, confirms they coexist, and adds a note. Consolidate in a later cleanup if desired.

2. **Should `useViewPreference` (UI preference, AsyncStorage-backed) migrate to TanStack Query?**
   - What we know: It's a 34-LOC hook, AsyncStorage-only, not Supabase.
   - What's unclear: Whether TanStack Query is even the right home for non-Supabase state.
   - Recommendation: **No, leave it.** It's local UI state. Phase 31's zustand boundary doc should call out: AsyncStorage-only preferences belong in their own hook, not the query cache.

3. **`useStatus` interacts with `useStatusStore` — both writer (the hook) and many readers (MoodPicker, OwnStatusCard, etc.) — and there's also a Realtime `home-statuses` channel in `useHomeScreen`. Does `useStatusStore` get retired in the status wave?**
   - What we know: STATE.md Phase 2 v1.3 decision explicitly chose zustand over React Query for status sync ("Replaces the original React Query plan from D-25 because the project has zero @tanstack/react-query"). With React Query now adopted, that rationale is gone.
   - What's unclear: Whether the status flow has unique optimistic-write semantics (expiry timer ticks via `useStatus.touch` updating `last_active_at`) that don't map cleanly to mutations.
   - Recommendation: Read `useStatus.ts` carefully in the Wave 6 planning session. Likely outcome: keep `useStatusStore.currentStatus` as a tiny client state (used by notification dispatcher OUTSIDE the React tree — see `_layout.tsx:106-111`), but move the *fetching* into `useQuery(queryKeys.status.own(userId))`. Update Pattern 7 (auth bridge) to also clear `useStatusStore`.

4. **Are Edge Functions involved in any of the mutations?**
   - What we know: Out of scope per CONTEXT.md. No mention in the audit.
   - What's unclear: Whether any hook calls a Supabase Edge Function URL.
   - Recommendation: A grep for `supabase.functions.invoke` returns the actual count. Planner should run it once in Wave 1; if non-zero, those mutations follow the same `useMutation` shape — the URL/fn-call is just a different mutationFn.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/tanstack/query` — fetched topics: `react native focus refetch defaults`, `react native AppState online focusManager NetInfo`, `persistQueryClient AsyncStorage createAsyncStoragePersister`, `optimistic update mutation onMutate rollback invalidateQueries`, `query key factory hierarchical invalidation`, `devtools react native production hide`, `staleTime gcTime default React Native recommendation`, `supabase realtime invalidate setQueryData postgres_changes`
- [TanStack Query — React Native docs](https://tanstack.com/query/v5/docs/framework/react/react-native) — official RN guide (focusManager + AppState + NetInfo)
- [TanStack Query — DevTools docs](https://tanstack.com/query/v5/docs/framework/react/devtools)
- [TanStack Query — createAsyncStoragePersister](https://tanstack.com/query/v5/docs/framework/react/plugins/createAsyncStoragePersister)
- [TanStack Query — Query Invalidation guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [TanStack Query — Optimistic Updates guide](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [TanStack Query — Migrating to v5](https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5)
- [Expo Dev Tools Plugins docs](https://docs.expo.dev/debugging/devtools-plugins/)
- npm registry — version verification (`npm view @tanstack/react-query@5.100.10`, peer deps, publish date 2026-05-11)
- Campfire codebase audit — all hook files in `src/hooks/`, `src/stores/`, `src/lib/supabase.ts`, `src/app/_layout.tsx`, `jest.config.js`, `package.json`, `.planning/STATE.md`, `.planning/ROADMAP.md`

### Secondary (MEDIUM confidence)
- [Makerkit — How to Use Supabase with TanStack Query v5](https://makerkit.dev/blog/saas/supabase-react-query) — staleTime: 60s recommendation
- [Nextbase — Handling Realtime Data with Supabase](https://www.usenextbase.com/docs/v2/guides/handling-realtime-data-with-supabase) — refetch-on-postgres_changes pattern
- [tkdodo — Reset User Data on Logout (TanStack/query discussion #1886)](https://github.com/TanStack/query/discussions/1886) — `removeQueries` not `invalidateQueries` on signout

### Tertiary (LOW confidence)
- [LovesWorking/tanstack-query-dev-tools-expo-plugin README](https://github.com/LovesWorking/tanstack-query-dev-tools-expo-plugin) — used to confirm the discontinued status; the deprecation note is the load-bearing claim, not the install snippet
- [oneuptime — AsyncStorage vs MMKV](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view) — MMKV claims (30x faster, JSI-based)
- [react-native-async-storage issue #83](https://github.com/react-native-async-storage/async-storage/issues/83) — 6 MB Android cap

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via `npm view` against the live registry on research date; peer deps explicitly inspected (`react: ^18 \|\| ^19`, `expo: >=53.0.5`) and confirmed compatible with Campfire's environment.
- Architecture (focusManager + onlineManager + auth bridge + Hybrid Realtime): HIGH — patterns drawn directly from official TanStack RN docs and a TkDodo discussion; the bridge dedup pattern is novel to Campfire but uses ref-counting, a standard idiom.
- Pilot vertical: HIGH — based on direct inspection of `useHabits.ts`, `useHabitDetail.ts`, `useHabits.test.ts`, and Phase 29.1 decisions in STATE.md.
- Persistence recommendation: MEDIUM — the split strategy is research-supported but not battle-tested in Campfire; AsyncStorage size assumptions are conservative.
- Pitfalls: HIGH for pitfalls 1, 2, 4, 5, 9 (well-documented in TanStack docs / discussions); MEDIUM for pitfall 6 (REPLICA IDENTITY assumption — Supabase docs confirm but Campfire-specific migrations not audited); MEDIUM for pitfall 7 (memory pressure — qualitative, depends on user behavior); MEDIUM for pitfall 8 (Expo Go vs. dev client — flagged but not specifically tested against `@react-native-community/netinfo` on Expo Go).
- Validation Architecture: HIGH — Jest infrastructure verified by reading `jest.config.js` and the existing test directory.

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (30 days — TanStack Query v5 is on a stable rolling-patch cadence; minor versions land every few days but the v5 architecture is locked. Re-check `npm view @tanstack/react-query version` before the planner commits if more than 30 days elapse.)
