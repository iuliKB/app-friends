# Phase 31: Adopt TanStack Query — Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** ~45 (NEW + MODIFIED across 8 waves)
**Analogs found:** 38 / 45 (the 7 without analogs are new infrastructure — they reference the canonical shapes in 31-RESEARCH.md instead)

This is a "swap-the-internals" phase: every modified file already exists and follows a recognizable in-repo shape. The closest analogs to lean on are usually **a sibling hook in the same vertical** (for the migration delta) plus **`useHabits.ts` / `useHabitDetail.ts`** (which will be the first to land on the new pattern in Wave 2 and then becomes the canonical analog for Waves 3-7).

---

## File Classification

### Wave 1 — Foundation (NEW + MODIFIED root wiring)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `package.json` | dependency manifest | config | `/Users/iulian/Develop/campfire/package.json` (existing) | self — additive edit only |
| `src/lib/queryClient.ts` | cache singleton factory | config / boot | `/Users/iulian/Develop/campfire/src/lib/supabase.ts` (lib-level singleton factory) | role-match (singleton client w/ defaults) |
| `src/lib/queryKeys.ts` | query-key factory taxonomy | pure module / constants | none in codebase — first central-key module | NO ANALOG — see 31-RESEARCH.md §Pattern 4 |
| `src/lib/realtimeBridge.ts` | event bridge (Realtime → cache) | event-driven, pub-sub | `/Users/iulian/Develop/campfire/src/hooks/useHomeScreen.ts:22-48` (channelRef + subscribeRealtime), `useChatRoom.ts:200-399` (postgres_changes handlers w/ INSERT/UPDATE branching) | role-match (subscription owner) |
| `src/lib/authBridge.ts` | auth-state listener / cache lifecycle | event-driven | `/Users/iulian/Develop/campfire/src/app/_layout.tsx:281-303` (existing `supabase.auth.onAuthStateChange`), `useStatus.ts:25-38` (module-scope auth subscriber that clears a store) | exact (auth listener bridge pattern) |
| `src/app/_layout.tsx` | mount point | composition / boot | self | self-edit |
| `src/__mocks__/createTestQueryClient.tsx` | test scaffold / provider wrapper | utility | `/Users/iulian/Develop/campfire/src/__mocks__/jest-setup.js` (test-env globals), `src/__mocks__/theme.js` (theme provider stub) | role-match (test-only React wrapper) |
| `src/hooks/useRefreshOnFocus.ts` | hook utility / focus-driven refetch | event-driven | `useChatList.ts:309-313` + `usePlans.ts:196-200` (current `useFocusEffect(useCallback(fetch, []))` pattern) | role-match (focus → action) |
| `src/lib/__tests__/queryClient.test.ts` | test | unit / cache assertion | `/Users/iulian/Develop/campfire/src/lib/__tests__/openChat.test.ts` (lib-level Jest suite with `jest.mock('@/lib/supabase')`) | role-match |
| `src/lib/__tests__/realtimeBridge.test.ts` | test | unit / pub-sub assertion | `src/hooks/__tests__/useHabits.test.ts:14-27` (supabase.channel mock that returns a chainable builder) | role-match |
| `src/lib/__tests__/authBridge.test.ts` | test | unit / event-driven | `src/lib/__tests__/openChat.test.ts` (lib test with router & supabase mocks) | role-match |

### Wave 2 — Pilot: Habits

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/hooks/useHabits.ts` | hook migration | CRUD + event-driven (Realtime) + optimistic | self (current shape) → 31-RESEARCH.md §Code Examples (target shape) | self-rewrite (pilot reference) |
| `src/hooks/useHabitDetail.ts` | hook migration | request-response (parallel reads) | self → `useExpenseDetail.ts` (parallel reads, similar fan-out) | self-rewrite |
| `src/hooks/__tests__/useHabits.test.ts` | test rewrite | unit | self → adapt to `createTestQueryClient` wrapper | self-rewrite |
| `src/hooks/__tests__/useHabits.crossScreen.test.tsx` | NEW integration test | integration / cross-component | none (pattern is novel) | NO ANALOG — first cross-screen test; see 31-RESEARCH.md §Validation Architecture |
| `src/hooks/__tests__/mutationShape.test.ts` | NEW regression test | unit / static gate | none — first mutation-shape-conformance test | NO ANALOG — see 31-RESEARCH.md §Pattern 5 |

### Wave 3 — Home aggregates + Todos

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/hooks/useHomeScreen.ts` | hook migration | event-driven + composition | self → pattern from migrated `useHabits.ts` (Wave 2) | self-rewrite |
| `src/hooks/useTodos.ts` | hook migration | CRUD + optimistic | self → migrated `useHabits.ts` (same snapshot+revert shape — see file header comment lines 1-13) | role-match (same snapshot pattern) |
| `src/hooks/useUpcomingBirthdays.ts` | hook migration | request-response (read-only) | self → `useIOUSummary.ts` (RPC + refetch + tri-state — research's "clone shape of useIOUSummary" anchor) | role-match |
| `src/hooks/useUpcomingEvents.ts` | hook migration | request-response | self → `useIOUSummary.ts` | role-match |
| `src/hooks/useInvitationCount.ts` | hook migration | request-response (count) | self → `useIOUSummary.ts` (collapses to a single number, like `netCents`) | role-match |
| `src/hooks/usePendingRequestsCount.ts` | hook migration | request-response | self → `useIOUSummary.ts` | role-match |
| `src/hooks/useSpotlight.ts` | hook migration | request-response (aggregate) | self → `useHomeScreen.ts` (multi-query aggregate composition) | role-match |
| `src/hooks/useChatTodos.ts` | hook migration | request-response (mutator-only — no autoload) | self → no autoload state; reframes purely as `useMutation` × 2 | self-rewrite (simplest case) |

### Wave 4 — Plans

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/hooks/usePlans.ts` | hook migration | CRUD + composition (3-step join) | self → migrated `useHabits.ts` (mutation pattern) | self-rewrite |
| `src/hooks/usePlanDetail.ts` | hook migration | request-response | self → migrated `useHabitDetail.ts` (parallel reads from Wave 2) | exact |
| `src/hooks/usePlanPhotos.ts` | hook migration | CRUD | self → migrated `useTodos.ts` (mutation patterns on simple lists) | role-match |
| `src/hooks/useAllPlanPhotos.ts` | hook migration | aggregate read | self → migrated `useHomeScreen.ts` (Wave 3 composition) | role-match |

### Wave 5 — Friends + Expenses

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/hooks/useFriends.ts` | hook migration | CRUD + composition (RPC + statuses join) | self → migrated `useHomeScreen.ts` (Wave 3 — same `get_friends` + `effective_status` join) | exact — these two share the join shape |
| `src/hooks/useFriendsOfFriend.ts` | hook migration | request-response | self → `useIOUSummary.ts` | role-match |
| `src/hooks/useFriendWishList.ts` | hook migration | request-response | self → migrated `useHabitDetail.ts` (parallel reads) | role-match |
| `src/hooks/useMyWishList.ts` | hook migration | CRUD + optimistic | self → migrated `useHabits.ts` (toggle / mutate pattern) | role-match |
| `src/hooks/useWishListVotes.ts` | hook migration | CRUD + optimistic (count flip) | self → migrated `useHabits.ts` (counter-flip mutation) | exact (same shape: flip flag + bump counter) |
| `src/hooks/useExpensesWithFriend.ts` | hook migration | request-response | self → `useIOUSummary.ts` | exact (sibling in same vertical) |
| `src/hooks/useExpenseDetail.ts` | hook migration | request-response (parallel reads) | self → migrated `useHabitDetail.ts` | role-match |
| `src/hooks/useIOUSummary.ts` | hook migration | request-response (read-only) | self — already the cleanest tri-state shape; minimal delta | self-rewrite |
| `src/hooks/useExpenseCreate.ts` | hook migration | CRUD (mutation-heavy, form state) | self → migrated `useChatTodos.ts` (Wave 3 — mutator-only) for the mutation half; form state stays as `useState` | role-match for the mutation half |

### Wave 6 — Status + Polls + Misc

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/hooks/useStatus.ts` | hook migration (special case) | request-response + zustand mirror (kept) | self — keep zustand for currentStatus (notification dispatcher reads outside React tree), move *fetching* into `useQuery` | self-rewrite (hybrid) |
| `src/hooks/usePoll.ts` | hook migration | CRUD + optimistic + event-driven | self → migrated `useHabits.ts` + `useChatRoom.ts:271-305` (poll vote event dedup) | role-match |
| `src/hooks/useInvitations.ts` | hook migration | CRUD | self → migrated `useTodos.ts` | role-match |
| `src/hooks/useNetworkStatus.ts` | NOT migrated (deferred) | n/a | self — stays as-is; possibly replaced by NetInfo + onlineManager bridge (see 31-RESEARCH.md Open Q #1) | no-op |
| `src/hooks/useViewPreference.ts` | NOT migrated (deferred) | local UI prefs | self — stays as-is (AsyncStorage-only UI prefs, not server state; see 31-RESEARCH.md Open Q #2) | no-op |

### Wave 7 — Chat (last)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/hooks/useChatList.ts` | hook migration | CRUD + composition (multi-table join) | self → migrated `usePlans.ts` (Wave 4 multi-step join) | role-match |
| `src/hooks/useChatRoom.ts` | hook migration | event-driven + optimistic + media upload | self → migrated `useHabits.ts` (mutation pattern) + `useChatRoom.ts:200-399` self (existing Realtime branches stay, but move into `realtimeBridge.ts` and call `setQueryData`/`invalidateQueries`) | self-rewrite |
| `src/hooks/useChatMembers.ts` | hook migration | request-response | self → migrated `useHabitDetail.ts` (member fetch + profile join) | role-match |
| `src/stores/useChatStore.ts` | store cleanup | state — strip server-data mirror | self — keep UI flags only; remove `chatList` + `lastFetchedAt` | self-edit |

### Wave 8 — Persistence + cleanup

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/app/_layout.tsx` | mount point — swap `QueryClientProvider` for `PersistQueryClientProvider` | composition | self (Wave 1 state) | self-edit |
| `src/lib/__tests__/persistQueryClient.test.ts` | test | unit / hydration | `src/lib/__tests__/openChat.test.ts` (lib test pattern with mocked AsyncStorage from `src/__mocks__/async-storage.js`) | role-match |
| `src/hooks/README.md` | doc — state-boundary | documentation | none yet (Phase 30 was first to mention a boundary doc but didn't ship one) | NO ANALOG — author from scratch from 31-RESEARCH.md §Architectural Responsibility Map |
| `src/stores/README.md` (optional) | doc | documentation | none | NO ANALOG |

---

## Pattern Assignments

### `src/lib/queryClient.ts` (NEW — cache singleton factory)

**Reference:** 31-RESEARCH.md §Pattern 1 (lines 233-258)

**Closest in-repo analog for "module-scope singleton factory":** `src/lib/supabase.ts`

**Pattern to copy from supabase.ts (lines 17-34):**

```typescript
// Module-scope singleton, configured once, side-effects on import (AppState).
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

**Migration delta:** `queryClient.ts` exports a **factory function** (`createQueryClient()`), not the singleton itself — research recommends instantiating inside `RootLayout` via `useState(() => createQueryClient())` so HMR-driven double-mounts don't share an accidentally-shared cache. Side-effect wiring (`focusManager`, `onlineManager`, auth bridge) lives in `_layout.tsx`, not in this file (separation of concerns).

---

### `src/lib/queryKeys.ts` (NEW — key factory)

**Reference:** 31-RESEARCH.md §Pattern 4 (lines 333-426)

**No in-repo analog.** This is the first time Campfire centralizes a domain taxonomy.

**Migration delta:** Pure module of `as const` factory functions. No imports beyond TypeScript types. Tests are not needed for this file alone — its correctness is asserted by `mutationShape.test.ts` (Wave 2) and the grep gate in TSQ-07 (no inline `queryKey: ['…']` arrays under `src/hooks/`).

---

### `src/lib/realtimeBridge.ts` (NEW — event bridge w/ ref-counted dedup)

**Reference:** 31-RESEARCH.md §Pattern 6 (lines 506-614)

**Analog 1 — channel ownership / teardown:** `src/hooks/useHomeScreen.ts` lines 22-48:

```typescript
const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

function subscribeRealtime(friendIds: string[]) {
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }
  if (friendIds.length === 0) return;

  const filter = `user_id=in.(${friendIds.join(',')})`;
  channelRef.current = supabase
    .channel('home-statuses')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'statuses', filter },
      (_payload) => { fetchAllFriends(); }
    )
    .subscribe();
}
```

**Analog 2 — postgres_changes INSERT/UPDATE/DELETE handler branching:** `src/hooks/useChatRoom.ts` lines 215-399 (own-user dedup, INSERT prepend, UPDATE field merge, DELETE filter). This is the most-developed example in the codebase of Hybrid event handling — the bridge will encapsulate the *channel lifecycle*, but the per-event field-merge logic inside the bridge handlers closely resembles `useChatRoom.ts:333-380`.

**Migration delta:**
- Move **channel lifecycle ownership** from `useHomeScreen.ts:22-48`, `useHabits.ts:78-101`, `useChatRoom.ts:200-399` → into bridge functions (`subscribeHabitCheckins`, `subscribeHomeStatuses`, `subscribeChatRoom`, …).
- Replace `setMessages((prev) => …)` with `queryClient.setQueryData<…>(queryKeys.chat.messages(channelId), (old) => …)` (same shape, different storage).
- Add a **registry Map** keyed by channel name with `refCount` so two callers don't open two channels (TSQ-05).

---

### `src/lib/authBridge.ts` (NEW — auth-state listener)

**Reference:** 31-RESEARCH.md §Pattern 7 (lines 616-642)

**Analog 1 — existing onAuthStateChange wiring:** `src/app/_layout.tsx` lines 281-303:

```typescript
const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((event, s) => {
  setSession(s);

  if (event === 'SIGNED_IN' && s) {
    supabase
      .from('profiles')
      .select('username')
      .eq('id', s.user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        setNeedsProfileSetup(!profile?.username);
      });
  }

  if (event === 'SIGNED_OUT') {
    setNeedsProfileSetup(false);
  }
});
```

**Analog 2 — module-scope auth subscriber that clears a store:** `src/hooks/useStatus.ts` lines 24-38:

```typescript
let authListenerInstalled = false;
function installAuthListenerOnce() {
  if (authListenerInstalled) return;
  authListenerInstalled = true;
  useAuthStore.subscribe((state, prev) => {
    if (prev?.session && !state.session) {
      useStatusStore.getState().clear();
      cancelExpiryNotification().catch(() => {});
      cancelMorningPrompt().catch(() => {});
    }
  });
}
```

**Migration delta:** New module exports `attachAuthBridge(queryClient)` which calls `supabase.auth.onAuthStateChange` once and on `SIGNED_OUT` runs `queryClient.removeQueries()` (NOT `invalidateQueries` — see 31-RESEARCH.md §Pitfall 4). Either replaces the inline listener in `_layout.tsx:281-303` or runs alongside it; the planner chooses but the simpler shape is to factor `_layout.tsx`'s listener into `authBridge.ts` and have both responsibilities live there (auth-store updates + cache clear).

---

### `src/app/_layout.tsx` (MODIFIED — mount QueryClientProvider)

**Reference:** 31-RESEARCH.md §QueryClientProvider mount (lines 1060-1088), §Pattern 2 (lines 270-297)

**Current shape (lines 355-363):**

```tsx
return (
  <GestureHandlerRootView style={{ flex: 1, backgroundColor: DARK.surface.base }}>
    <ThemeProvider>
      <OfflineBanner />
      <RootLayoutStack session={session} needsProfileSetup={needsProfileSetup} />
    </ThemeProvider>
  </GestureHandlerRootView>
);
```

**Migration delta (Wave 1):**

```tsx
const [queryClient] = useState(() => createQueryClient());
useReactQueryDevTools(queryClient);   // __DEV__-gated by the plugin itself

// + the focusManager + onlineManager useEffects (Pattern 2)
// + authBridge attachment (replace or wrap lines 281-303)

return (
  <GestureHandlerRootView style={…}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <OfflineBanner />
        <RootLayoutStack session={session} needsProfileSetup={needsProfileSetup} />
      </ThemeProvider>
    </QueryClientProvider>
  </GestureHandlerRootView>
);
```

**Wave 8 delta:** Swap `QueryClientProvider` → `PersistQueryClientProvider` (31-RESEARCH.md §How to do selective persistence, lines 745-774).

---

### `src/hooks/useHabits.ts` (MODIFIED — Wave 2 PILOT)

**Current shape:** `useState` + `useFocusEffect` is absent (uses `useEffect`); refetch on Realtime; `habitsRef` mirror for Pitfall 3 snapshot+revert; single `channelRef`. Lines 1-152 in current file.

**Target shape:** 31-RESEARCH.md §Code Examples lines 962-1055 (full target source).

**Closest analogs to copy from for the migration:**
- For the `useQuery` skeleton — `useIOUSummary.ts:28-62` (already the cleanest tri-state shape; `query.data ?? []` + `query.isLoading` + `query.error?.message` map 1-to-1 to the current return contract).
- For the `useMutation` shape — 31-RESEARCH.md §Pattern 5 (lines 432-486) **is** the canonical reference, with one notable contrast against the current `toggleToday` (lines 103-149): the new shape replaces `habitsRef.current.find(…) ?? null` with `ctx.previous` (the snapshot is carried *by* TanStack Query rather than mirrored in a ref).
- For the Realtime subscription — `useHomeScreen.ts:22-48` is the closest in-repo channel-lifecycle pattern, but the migrated code uses `subscribeHabitCheckins(queryClient, userId, today)` from `realtimeBridge.ts` instead, so the `useEffect` shrinks to 3 lines.

**Migration delta:**
- DELETE `useState<HabitOverviewRow[]>`, `useState<boolean>(loading)`, `useState<string|null>(error)`, `habitsRef`, `channelRef`.
- REPLACE `refetch` (lines 44-66) with `useQuery({ queryKey: queryKeys.habits.overview(today), queryFn, enabled: !!userId })`.
- REPLACE Realtime block (lines 68-101) with `useEffect(() => subscribeHabitCheckins(queryClient, userId, today), [queryClient, userId, today])`.
- REPLACE `toggleToday` (lines 103-149) with `useMutation` (Pattern 5 shape); the public return signature `(habitId: string) => Promise<{error: string|null}>` is preserved by wrapping `mutateAsync` in a try/catch.
- Net LOC: 152 → ~75 (per research §Code Examples).

---

### `src/hooks/useHabitDetail.ts` (MODIFIED — Wave 2 PILOT)

**Current shape:** Parallel reads (habit row + members + 30-day checkins + profile join), 128 LOC.

**Closest analog after pilot:** itself, plus the parallel-fetch pattern in `useChatRoom.ts:70-180` (`Promise.all` of independent reads).

**Migration delta:** Single `useQuery({ queryKey: queryKeys.habits.detail(habitId), queryFn: async () => { /* the existing Promise.all body */ } })`. The five `useState` slots collapse into `query.data` (a single object). LOC: 128 → ~40.

---

### `src/hooks/__tests__/useHabits.test.ts` (MODIFIED — Wave 2 PILOT)

**Current shape:** Mocks `@/lib/supabase` (`rpc`, `channel`, `removeChannel` — file header lines 14-27) + `@/stores/useAuthStore` (selector mock lines 29-32). Uses `renderHook` directly.

**Migration delta:** Wrap `renderHook` calls in the new `createTestQueryClient` helper. Test assertions stay the same — *behavioral* tests survive the internals swap. The only structural change is the `wrapper` argument to `renderHook`. The Realtime channel-mock block (lines 16-27) can move to a shared helper since `realtimeBridge.test.ts` also needs it.

**Analog for the new wrapper:** none yet — see Pitfall 9 in research.

---

### `src/__mocks__/createTestQueryClient.tsx` (NEW — test helper)

**Reference:** 31-RESEARCH.md §Validation Architecture Wave 0 Gaps (line 1196), §Pitfall 9 (lines 943-947)

**Analog for the file location/shape:** `/Users/iulian/Develop/campfire/src/__mocks__/theme.js`, `src/__mocks__/jest-setup.js` — test-time providers/wrappers live under `src/__mocks__/`.

**Pattern:** export both a `createTestQueryClient()` returning a `new QueryClient({ defaultOptions: { queries: { retry: false }}})` AND a `wrapper` helper `({children}) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>`. `retry: false` is critical in tests (otherwise mutation failures retry, ballooning test runtime).

---

### Wave 3-7 Hook Migrations (per-vertical pattern)

Every hook in these waves follows the same delta. The canonical analog after Wave 2 ships is **the migrated `useHabits.ts`** (queryKey factory + `useQuery` + optional Realtime subscribe + `useMutation` w/ snapshot/rollback/invalidate). Per-wave specifics:

#### Read-only hooks (`useFriends`, `useUpcomingBirthdays`, `useUpcomingEvents`, `useInvitationCount`, `usePendingRequestsCount`, `useSpotlight`, `useFriendsOfFriend`, `useFriendWishList`, `useExpensesWithFriend`, `useIOUSummary`)

**Closest analog (already in-repo, will be the post-Wave-2 reference):** the migrated `useHabits.ts` minus the mutation block. Or, for a pure read-only pre-Wave-2 reference, `useIOUSummary.ts:28-62` — already returns `{rows, loading, error, refetch}` which is a 1-to-1 to `{data, isLoading, error, refetch}`.

**Pattern excerpt (`useIOUSummary.ts` current):**

```typescript
export function useIOUSummary(): IOUSummaryData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [rows, setRows] = useState<IOUSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) { setLoading(false); setRows([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_iou_summary');
    if (rpcErr) { setError(rpcErr.message); setRows([]); }
    else { setRows((data ?? []) as IOUSummaryRow[]); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);
  // ...
}
```

**Migration delta to `useQuery`:**

```typescript
const query = useQuery({
  queryKey: queryKeys.expenses.iouSummary(userId ?? ''),
  queryFn: async (): Promise<IOUSummaryRow[]> => {
    const { data, error } = await supabase.rpc('get_iou_summary');
    if (error) throw error;
    return (data ?? []) as IOUSummaryRow[];
  },
  enabled: !!userId,
});

return {
  rows: query.data ?? [],
  netCents: (query.data ?? []).reduce(…),
  unsettledCount: (query.data ?? []).reduce(…),
  loading: query.isLoading,
  error: query.error ? (query.error as Error).message : null,
  refetch: query.refetch,
};
```

#### Composition hooks (`useHomeScreen`, `useAllPlanPhotos`)

**Closest analog post-Wave-2:** migrated `useHabits.ts` PLUS the multi-query orchestration is best done by composing two `useQuery` calls — `useHomeScreen` currently runs `get_friends` + `effective_status.in.(friendIds)` sequentially (lines 50-104). The migrated shape uses TWO `useQuery` calls with the second `enabled` only when the first has data.

**Migration delta:**
- Split `useHomeScreen.fetchAllFriends` into two query hooks (or call `useQueries`).
- Move `home-statuses` Realtime channel ownership into `realtimeBridge.ts` (`subscribeHomeStatuses`).
- The `useHomeStore.friends` mirror gets REMOVED in the same commit (Wave 3 — 31-RESEARCH.md §Anti-Patterns lines 647-650).

#### Optimistic-mutation hooks (`useTodos`, `usePlans`, `usePoll`, `useMyWishList`, `useWishListVotes`, `useExpenseCreate`, `useStatus`)

**Closest analog post-Wave-2:** migrated `useHabits.toggleToday` mutation.

**Pattern to copy:** 31-RESEARCH.md §Pattern 5 (`mutationFn` + `onMutate` + `onError` + `onSettled`). Each hook's existing snapshot+revert (e.g. `useTodos.ts:39-44`, `useHabits.ts:42-43`) maps to `ctx.previous` returned from `onMutate`.

**Invalidation map (which keys to invalidate on settle):** see 31-RESEARCH.md §Pattern 5 table (lines 488-502) — the planner copies the row matching each migrated mutator.

#### Aggregate composition (`useHomeScreen`)

Special case: home tile cross-screen reactivity (TSQ-01 verification anchor) is the canonical demo. Use `useQueries` to mount Habits + Todos + Streak + IOU summary in one place; each tile screen separately mounts its `useQuery` with the same key (auto-deduplication).

#### `useChatList.ts`, `useChatRoom.ts`, `useChatMembers.ts` (Wave 7 — highest complexity)

**Closest analogs after Waves 2-6:**
- For `useChatRoom`'s Realtime branching — *itself*, current lines 200-399, but the handlers move into `realtimeBridge.ts`'s `subscribeChatRoom(channelId)` and call `queryClient.setQueryData(queryKeys.chat.messages(channelId), …)` instead of `setMessages(…)`.
- For optimistic message send / dedup-by-id — current `useChatRoom.ts:333-380` (id-based + body-time fallback). Reuse the dedup logic inside `setQueryData` callback.
- For `useChatList`'s TTL caching — DROP IT entirely; `staleTime: 60_000` replaces it. Remove `useChatStore.chatList`, `lastFetchedAt` in the same plan (the store's `setChatList` callsite is the bridge for retirement audit).

**Pattern excerpt — current `useChatList.ts:286-307` (the TTL cache the migration deletes):**

```typescript
const fetch = useCallback(async () => {
  if (!session?.user) return;
  if (chatList.length > 0 && lastFetchedAt !== null && Date.now() - lastFetchedAt < CACHE_TTL_MS) {
    return;
  }
  setLoading(true);
  try { await fetchChatList(); } catch (err) { … }
  finally { setLoading(false); }
}, [session?.user?.id]);

useFocusEffect(useCallback(() => { fetch(); }, [fetch]));
```

**Migration delta:** entire block (lines 286-313) replaced by a single `useQuery({ queryKey: queryKeys.chat.list(userId), queryFn: fetchChatList, staleTime: 60_000 })`. The 30-second TTL becomes `staleTime: 30_000` (or just the global default of 60_000). The `useChatStore.chatList` mirror is deleted.

#### `useStatus.ts` (Wave 6 — special case)

**Current shape:** Reads `effective_status` view, writes `statuses` table, mirrors to `useStatusStore` for cross-screen sync AND for module-scope reads from `_layout.tsx:106-111` (notification dispatcher OUTSIDE React tree).

**Migration delta:** Keep `useStatusStore` (the notification dispatcher's read-outside-React is the load-bearing constraint — see 31-RESEARCH.md Open Q #3). Move *fetching* into `useQuery(queryKeys.status.own(userId))`. The `setStatus` mutator becomes `useMutation` with `onMutate` writing both `setQueryData` AND `useStatusStore.getState().setCurrentStatus` (the store stays as a side-effect mirror for the dispatcher). Auth bridge clears both: `queryClient.removeQueries()` AND `useStatusStore.getState().clear()` (the latter already runs in `useStatus.ts:25-38`).

---

## Shared Patterns

### Authentication / user-scoped fetches
**Source:** `src/stores/useAuthStore.ts` lines 1-20 + every hook's `useAuthStore((s) => s.session)` selector usage.
**Apply to:** Every migrated hook.

```typescript
const session = useAuthStore((s) => s.session);
const userId = session?.user?.id ?? null;
// then:
const query = useQuery({
  queryKey: queryKeys.<vertical>.<subkey>(userId ?? ''),
  queryFn: …,
  enabled: !!userId,
});
```

Note: keys include `userId` for sign-out safety (defense in depth on top of `removeQueries`). Empty string fallback is fine because `enabled: !!userId` prevents the query from running.

### Error handling
**Source:** Every current hook (`useHabits.ts:55-59`, `useIOUSummary.ts:44-49`, `useFriends.ts:44-49`):

```typescript
if (rpcErr) {
  console.warn('<rpc_name> failed', rpcErr);
  setError(rpcErr.message);
  setRows([]);
}
```

**Apply to:** Every migrated hook.

**Migration delta:**

```typescript
// In queryFn:
if (error) throw error;
return (data ?? []) as RowType[];

// In the hook return:
error: query.error ? (query.error as Error).message : null,
```

The `console.warn` is now centralized in `queryClient.ts`'s default `onError` (or simply dropped; TanStack Query devtools surfaces failed queries).

### Realtime subscription lifecycle
**Source:** `src/hooks/useHomeScreen.ts:22-48`, `useHabits.ts:78-101`, `useChatRoom.ts:200-399` (channelRef + cleanup).
**Apply to:** Any hook with a `supabase.channel` block.

**Migration delta:** Replace `channelRef` + `useEffect` cleanup with a single line:

```typescript
useEffect(() => {
  if (!userId) return;
  return subscribe<Vertical>(queryClient, userId, …extraArgs);
}, [queryClient, userId, …]);
```

The bridge function returns its own cleanup; the hook does not own the channel.

### Optimistic snapshot+revert
**Source:** `src/hooks/useHabits.ts:38-43, 105-149` (the `habitsRef` mirror); `src/hooks/useTodos.ts:39-44`.
**Apply to:** Every migrated mutation hook.

**Migration delta:** Delete the `*Ref` mirror. The snapshot is now `ctx.previous` returned by `onMutate`. The mutation shape (31-RESEARCH.md §Pattern 5) is mandatory; `mutationShape.test.ts` enforces it.

### Test wrapper
**Source:** `src/hooks/__tests__/useHabits.test.ts:14-32` (supabase + useAuthStore mocks), `src/lib/__tests__/openChat.test.ts:18-26`.
**Apply to:** Every migrated hook test.

**Migration delta:** Add `wrapper: createTestQueryClient().wrapper` to every `renderHook` call. The supabase / useAuthStore mocks stay identical.

### Mutation contract (regression-tested by `mutationShape.test.ts`)
**Source:** 31-RESEARCH.md §Pattern 5 (lines 432-486).
**Apply to:** Every `useMutation` call in `src/hooks/`.

**Required shape:**
```typescript
useMutation({
  mutationFn: …,
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old) => …);
    return { previous };
  },
  onError: (_err, _input, ctx) => {
    if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey });
  },
});
```

Plain `useMutation({ mutationFn, onSuccess: invalidate })` is acceptable for creates with side effects (e.g., `usePlans.createPlan`) — Pattern 5 calls this out (lines 488-503).

---

## No Analog Found

These files have no close in-repo match. The planner should reference 31-RESEARCH.md directly:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/queryKeys.ts` | key factory module | pure module | First centralized taxonomy in repo; reference 31-RESEARCH.md §Pattern 4 |
| `src/__mocks__/createTestQueryClient.tsx` | test wrapper | utility | First Provider-wrapping test helper; reference 31-RESEARCH.md Pitfall 9 |
| `src/hooks/__tests__/useHabits.crossScreen.test.tsx` | cross-screen integration test | integration | First test of this kind; reference 31-RESEARCH.md TSQ-01 |
| `src/hooks/__tests__/mutationShape.test.ts` | shape-conformance test | static gate | First regression gate of its kind; reference 31-RESEARCH.md §Pattern 5 + TSQ-08 |
| `src/lib/__tests__/persistQueryClient.test.ts` | hydration test | integration | Wave 8; reference 31-RESEARCH.md TSQ-04 + Pitfall 1 |
| `src/hooks/README.md` | boundary doc | documentation | First boundary doc; reference 31-RESEARCH.md §Architectural Responsibility Map |
| `src/stores/README.md` (optional sibling) | boundary doc | documentation | Same — pick one location, planner decides |

---

## Cross-Reference Summary

| Wave | Modified files | Mainly mirrors | New infrastructure |
|------|-----|----|---|
| 1 | `package.json`, `src/app/_layout.tsx` | (none) | `queryClient.ts`, `queryKeys.ts`, `realtimeBridge.ts`, `authBridge.ts`, `useRefreshOnFocus.ts`, 3 lib tests, `createTestQueryClient.tsx` |
| 2 | `useHabits.ts`, `useHabitDetail.ts`, `useHabits.test.ts` | (none — pilot) | `useHabits.crossScreen.test.tsx`, `mutationShape.test.ts` |
| 3 | `useHomeScreen.ts`, `useTodos.ts`, `useUpcomingBirthdays.ts`, `useUpcomingEvents.ts`, `useInvitationCount.ts`, `usePendingRequestsCount.ts`, `useSpotlight.ts`, `useChatTodos.ts` | `useHomeStore.friends` removal | — |
| 4 | `usePlans.ts`, `usePlanDetail.ts`, `usePlanPhotos.ts`, `useAllPlanPhotos.ts` | `usePlansStore.plans` removal | — |
| 5 | `useFriends.ts`, `useFriendsOfFriend.ts`, `useFriendWishList.ts`, `useMyWishList.ts`, `useWishListVotes.ts`, `useExpensesWithFriend.ts`, `useExpenseDetail.ts`, `useIOUSummary.ts`, `useExpenseCreate.ts` | (no zustand mirrors in this batch) | — |
| 6 | `useStatus.ts` (hybrid), `usePoll.ts`, `useInvitations.ts`. **Not migrated:** `useNetworkStatus.ts`, `useViewPreference.ts` | `useStatusStore` is KEPT (load-bearing for notification dispatcher) | — |
| 7 | `useChatList.ts`, `useChatRoom.ts`, `useChatMembers.ts`, `useChatStore.ts` (strip server-data mirror) | `useChatStore.chatList` + `lastFetchedAt` removal | — |
| 8 | `src/app/_layout.tsx` (swap to `PersistQueryClientProvider`) | — | `persistQueryClient.test.ts`, `src/hooks/README.md` (boundary doc) |

---

## Metadata

**Analog search scope:** `src/hooks/`, `src/lib/`, `src/stores/`, `src/app/`, `src/__mocks__/`.
**Files scanned:** 36 hooks + 6 stores + 16 lib files + `_layout.tsx` + jest config + 4 test files = ~63 files.
**Pattern extraction date:** 2026-05-13

**Cardinal observation:** Every hook in `src/hooks/use*.ts` follows the same shape: `useState` slots for data/loading/error → `useCallback` async fetcher → `useEffect` or `useFocusEffect` triggers → optional `supabase.channel(…)` block → optional `useCallback` mutator with snapshot+revert. The Wave 2 migration converts this shape into `useQuery` + `useMutation` once; Waves 3-7 are mechanical reapplications of that same delta. **The closest analog for any Wave 3+ file is the migrated `useHabits.ts` from Wave 2.**
