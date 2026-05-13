# State Boundaries — Campfire (Phase 31)

This doc captures where each kind of state lives after the Phase 31 TanStack Query migration. Read this BEFORE adding any new hook or store. The rules below are non-negotiable; deviations introduce drift bugs and undo the migration.

The three buckets are: TanStack Query (server state), Zustand (cross-tree app state), and local `useState` (component-internal UI state). Every piece of state in the app lives in exactly ONE of these — drift between them was the bug class that motivated Phase 31.

## The Three Buckets

### 1. TanStack Query — anything fetched from Supabase

- **What:** server-state read or written via `supabase.rpc(...)`, `supabase.from(...).select/insert/update/delete`, or `supabase.functions.invoke(...)`.
- **Where:** `src/hooks/use<X>.ts` using `useQuery` + `useMutation` from `@tanstack/react-query`.
- **Keys:** ALWAYS through `src/lib/queryKeys.ts`. Inline arrays like `queryKey: ['habits', ...]` are forbidden — TSQ-07 grep gate catches them in CI.
- **Mutations:** ALWAYS follow the canonical Pattern 5 shape (`mutationFn` + `onMutate` snapshot + `onError` rollback + `onSettled` invalidate). The `mutationShape.test.ts` regression gate enforces this. Exempt only with `// @mutationShape: no-optimistic` directly above the `useMutation({` block (use for create/destroy with server side effects — e.g., `usePlans.createPlan`, `usePlanPhotos.uploadPhoto`, `useChatRoom.sendPoll`, `useChatTodos.*`).

### Tiered onSettled policy (Phase 32)

The Pattern 5 default is "invalidate everything that may have changed" in `onSettled`. For chat send mutations, Phase 31 amended this to "do nothing — Realtime INSERT reconciles." Phase 32 amends that contract once more by splitting send mutations into two tiers based on whether Realtime alone is enough.

**Pithy rule:**

> Use Realtime-only reconciliation only when the optimistic shape is identical to the canonical shape AND the failure mode is invisible. Otherwise, invalidate in `onSettled`.

**Per-mutation policy table:**

| Mutation | `chat.messages(channelId)` | `chat.list(userId)` | Rationale |
|---|---|---|---|
| `useChatRoom.sendMessage` (text) | NO | YES | Optimistic text shape = canonical text shape; Realtime INSERT reconciles the messages cache. But chat.list has a separate cache key + 30s staleTime, so invalidate it. (Tier A) |
| `useChatRoom.sendImage` | YES | YES | Optimistic carries local URI in `image_url`; canonical carries CDN URL. If Realtime INSERT echo is missed, the 70% opacity bubble sticks forever. Belt-and-braces. (Tier B) |
| `useChatRoom.sendPoll` | YES | YES | 2-step insert+RPC; optimistic row has `poll_id: null` until Realtime UPDATE fires. Missed UPDATE → PollCard spinner stickiness. Wired via `onSuccess` because the mutation keeps its `@mutationShape: no-optimistic` exemption. (Tier B) |
| `useChatTodos.sendChatTodo` | YES | YES | RPC creates the message row with server-generated UUID; client has nothing to optimistically splice. Bubble appears only via Realtime INSERT or via explicit refetch — invalidate covers the missed-Realtime case. (Tier B) |
| `useChatTodos.completeChatTodo` | YES (if caller supplies `chatScope`) | YES | Complete RPC emits a 'system' message via DB trigger. Same Tier B reasoning as sendChatTodo. |

**Tier A example (`sendMessage`):**

```typescript
onSettled: () => {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.chat.list(currentUserId),
  });
},
```

**Tier B example (`sendImage`):**

```typescript
onSettled: () => {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.chat.messages(channelId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.chat.list(currentUserId),
  });
},
```

Counterpart Realtime layer: `realtimeBridge.subscribeChatList(queryClient, userId)` (Phase 32 Plan 03) is the global Realtime echo path for incoming messages from other users. The `onSettled` invalidates above are the deterministic local path for own-sends; the global subscription is the backstop for both.

- **Realtime:** channel ownership lives in `src/lib/realtimeBridge.ts` (ref-counted subscribe helpers). Hooks call `useEffect(() => subscribe<Vertical>(qc, ...args), [...])`. NEVER call `supabase.channel(...)` inside a hook. Available helpers as of Phase 32: `subscribeHabitCheckins`, `subscribePollVotes`, `subscribeHomeStatuses`, `subscribeChatRoom`, `subscribeChatAux`, `subscribeChatList`.
- **Persistence:** `PersistQueryClientProvider` in `src/app/_layout.tsx` persists most root keys. Exclude `chat` (high-volume + Android 6MB cap) and `plans/photos` + `plans/allPhotos` (signed-URL 1h TTL). Bump `key: 'campfire-query-cache-v1'` on shape-breaking changes; `buster: APP_VERSION` invalidates on app version change. `gcTime: 24h` aligns with `maxAge: 24h` so persisted queries are restored before garbage collection.

### 2. Zustand — auth, navigation surface, UI flags, ephemeral coordination

- **What:** identity, navigation surface state (Phase 30's `useNavigationStore`), UI flags that need to cross component boundaries WITHOUT being server-truthed.
- **Where:** `src/stores/use<Domain>Store.ts`.
- **What zustand does NOT hold:** server-state mirrors. If a store has a field like `chatList: Chat[]` or `friends: Friend[]` that mirrors what TanStack Query already caches, that field is wrong. The Phase 31 migration stripped these from `useHomeStore`, `useChatStore`, `usePlansStore`. Do not reintroduce them.
- **Special case (status):** `useStatusStore.currentStatus` STAYS even though TanStack Query also holds it. Reason: the notification dispatcher in `_layout.tsx:106-111` reads it synchronously OUTSIDE the React tree. The `useStatus` hook mirrors writes to both in `onMutate`. This is the only sanctioned hybrid case (Wave 6).
- **Auth listener:** `src/lib/authBridge.ts` calls `queryClient.removeQueries()` AND `useStatusStore.getState().clear()` on `SIGNED_OUT`. Add new stores to that bridge if they need a sign-out reset.

### 3. Local `useState` — screen-local UI state

- **What:** input fields, accordion open/closed, modal visibility, animation refs.
- **Where:** inside the component that owns it. Do NOT lift to zustand unless multiple components actually need it.
- **Form state for mutations:** stays in `useState` in the form screen. The mutator hook (e.g. `useExpenseCreate`, `useChatRoom.sendMessage`) is mutation-only and accepts a payload — it does not own form fields.

## AsyncStorage Direct Use (NOT TanStack Query)

Some hooks write to AsyncStorage directly because the data is UI preference, not server state:

- `useViewPreference` — radar vs card view mode (`@campfire/home_view_mode`)
- `useChatRoom` / `ChatListScreen` — `chat:last_read:${channelId}`, `chat:hidden:${channelId}`, `chat:muted:${channelId}`, `chat:rooms:cache` per-chat user preferences
- Auth session storage (the Supabase JS client owns this)
- The TanStack Query persister itself (`campfire-query-cache-v1`) — managed by `PersistQueryClientProvider`, not application code

These are intentionally NOT in the query cache. The persister excludes them. Do not migrate them.

## Hybrid Patterns (sanctioned exceptions)

- **`useStatus` (Wave 6):** TanStack Query owns the fetch, but `useStatusStore.currentStatus` mirrors the value for the out-of-React-tree notification dispatcher. The mutation's `onMutate` writes to BOTH `setQueryData` and `useStatusStore.setCurrentStatus`; `onError` restores from both. The auth bridge clears both on sign-out.
- **`useSpotlight` (Wave 7):** Pure synchronous derivation (`useMemo`) PLUS a cache anchor (`useQuery` with `initialData`). The derivation runs on every render of any of the 5 source caches; `setQueryData` mirrors into `queryKeys.home.spotlight(userId)` so future direct consumers can participate in the canonical taxonomy.
- **`useChatRoom` (Wave 8):** `subscribeChatRoom` owns the messages-table Realtime subscription. The reactions/poll-votes inline subscription is encapsulated by `subscribeChatAux` because those tables have no server-side scope column. `lastPollVoteEvent` stays in local `useState` — it's a fire-and-forget signal to `PollCard`, not server state.

## Quick Decision Tree

| I need to store                          | Use                                         |
| ---------------------------------------- | ------------------------------------------- |
| A value fetched from Supabase            | `useQuery`                                  |
| A mutation that writes to Supabase       | `useMutation` (canonical Pattern 5)         |
| An app-wide identity / nav / UI flag     | zustand store                               |
| An input field value                     | local `useState`                            |
| A UI preference (theme, view mode)       | direct AsyncStorage                         |
| A per-chat unread marker                 | direct AsyncStorage (`chat:last_read:*`)    |
| The user's current status (cross-tree read) | useStatusStore + cache mirror (hybrid)   |

## Out of Scope (Phase 31 deferrals)

- `useNetworkStatus` (6-LOC NetInfo wrapper — already uses primitive directly; coexists with onlineManager)
- `useViewPreference` (AsyncStorage UI preference — not server state)

## Migration Inventory (Waves 1-8 closing inventory)

- **Wave 1 — Foundation:** `queryClient` factory, `queryKeys` taxonomy, `realtimeBridge.subscribeHabitCheckins`, `authBridge.attachAuthBridge`, `useRefreshOnFocus`, `createTestQueryClient`.
- **Wave 2 — Habits pilot:** `useHabits`, `useHabitDetail`; `mutationShape.test.ts` regression gate locked in.
- **Wave 3 — Home aggregates + Todos:** `useHomeScreen`, `useUpcomingBirthdays`, `useTodos`, `useChatTodos`; `realtimeBridge.subscribeHomeStatuses`; `useHomeStore.friends` stripped.
- **Wave 4 — Plans:** `usePlans`, `usePlanDetail`, `usePlanPhotos`, `useAllPlanPhotos`; `usePlansStore.plans` stripped; `useUpcomingEvents` rewired to `usePlans()`.
- **Wave 5 — Friends + Expenses:** `useFriends`, `useFriendsOfFriend`, `useFriendRequests`, `useFriendWishList`, `useMyWishList`, `useWishListVotes`, `useExpensesWithFriend`, `useExpenseCreate`, `useExpenseDetail`, `useIOUSummary`.
- **Wave 6 — Status + Polls + Invitations:** `useStatus` (hybrid), `usePoll`, `useInvitations`; `realtimeBridge.subscribePollVotes`; `authBridge` extended for `useStatusStore.clear`.
- **Wave 7 — Spotlight + Streak:** `useStreakData`, `useSpotlight` (dual-export).
- **Wave 8 — Chat + persistence + boundary doc:** `useChatList`, `useChatRoom`, `useChatMembers`; `realtimeBridge.subscribeChatRoom` + `subscribeChatAux`; `useChatStore` stripped; `PersistQueryClientProvider` with selective dehydration.

Total: 35+ hooks migrated; 4 server-data store mirrors stripped (useHomeStore.friends, usePlansStore.plans, useChatStore.chatList; useStatusStore.currentStatus kept as hybrid); 5 realtimeBridge subscribe helpers.

## References

- `.planning/phases/31-adopt-tanstack-query-for-server-state-caching-and-cross-scre/31-RESEARCH.md` — full architectural responsibility map + every pattern + every pitfall
- `src/lib/queryKeys.ts` — canonical key factory taxonomy
- `src/lib/realtimeBridge.ts` — Realtime → cache bridge (5 helpers)
- `src/lib/authBridge.ts` — sign-out cache + status-store clear
- `src/hooks/__tests__/mutationShape.test.ts` — regression gate for the canonical mutation shape
