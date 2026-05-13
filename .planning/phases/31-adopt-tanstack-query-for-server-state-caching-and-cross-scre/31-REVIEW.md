---
phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 71
files_reviewed_list:
  - package.json
  - src/__mocks__/createTestQueryClient.tsx
  - src/app/_layout.tsx
  - src/app/squad/birthday/[id].tsx
  - src/components/squad/bento/__tests__/BentoGrid.test.tsx
  - src/hooks/__tests__/mutationShape.test.ts
  - src/hooks/__tests__/useChatList.test.ts
  - src/hooks/__tests__/useChatRoom.test.ts
  - src/hooks/__tests__/useChatTodos.test.ts
  - src/hooks/__tests__/useExpenseCreate.test.ts
  - src/hooks/__tests__/useExpenseDetail.test.ts
  - src/hooks/__tests__/useExpensesWithFriend.test.ts
  - src/hooks/__tests__/useFriends.test.ts
  - src/hooks/__tests__/useHabits.crossScreen.test.tsx
  - src/hooks/__tests__/useHabits.test.ts
  - src/hooks/__tests__/useHomeScreen.test.ts
  - src/hooks/__tests__/useInvitations.test.ts
  - src/hooks/__tests__/useIOUSummary.test.ts
  - src/hooks/__tests__/useMyWishList.test.ts
  - src/hooks/__tests__/usePlanDetail.test.ts
  - src/hooks/__tests__/usePlanPhotos.test.ts
  - src/hooks/__tests__/usePlans.test.ts
  - src/hooks/__tests__/usePoll.test.ts
  - src/hooks/__tests__/useSpotlight.test.ts
  - src/hooks/__tests__/useStatus.test.ts
  - src/hooks/__tests__/useStreakData.test.ts
  - src/hooks/__tests__/useTodos.test.ts
  - src/hooks/__tests__/useWishListVotes.test.ts
  - src/hooks/README.md
  - src/hooks/useAllPlanPhotos.ts
  - src/hooks/useChatList.ts
  - src/hooks/useChatMembers.ts
  - src/hooks/useChatRoom.ts
  - src/hooks/useChatTodos.ts
  - src/hooks/useExpenseCreate.ts
  - src/hooks/useExpenseDetail.ts
  - src/hooks/useExpensesWithFriend.ts
  - src/hooks/useFriends.ts
  - src/hooks/useFriendsOfFriend.ts
  - src/hooks/useFriendWishList.ts
  - src/hooks/useHabitDetail.ts
  - src/hooks/useHabits.ts
  - src/hooks/useHomeScreen.ts
  - src/hooks/useInvitationCount.ts
  - src/hooks/useInvitations.ts
  - src/hooks/useIOUSummary.ts
  - src/hooks/useMyWishList.ts
  - src/hooks/usePendingRequestsCount.ts
  - src/hooks/usePlanDetail.ts
  - src/hooks/usePlanPhotos.ts
  - src/hooks/usePlans.ts
  - src/hooks/usePoll.ts
  - src/hooks/useRefreshOnFocus.ts
  - src/hooks/useSpotlight.ts
  - src/hooks/useStatus.ts
  - src/hooks/useStreakData.ts
  - src/hooks/useTodos.ts
  - src/hooks/useUpcomingBirthdays.ts
  - src/hooks/useUpcomingEvents.ts
  - src/hooks/useWishListVotes.ts
  - src/lib/__tests__/authBridge.test.ts
  - src/lib/__tests__/persistQueryClient.test.ts
  - src/lib/__tests__/queryClient.test.ts
  - src/lib/__tests__/realtimeBridge.test.ts
  - src/lib/authBridge.ts
  - src/lib/queryClient.ts
  - src/lib/queryKeys.ts
  - src/lib/realtimeBridge.ts
  - src/screens/chat/ChatListScreen.tsx
  - src/screens/plans/PlanCreateModal.tsx
  - src/screens/plans/PlanDashboardScreen.tsx
  - src/stores/useChatStore.ts
  - src/stores/useHomeStore.ts
  - src/stores/usePlansStore.ts
findings:
  critical: 0
  warning: 5
  info: 9
  total: 14
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-05-13
**Depth:** standard
**Files Reviewed:** 71
**Status:** issues_found

## Summary

Phase 31 is a deep, well-engineered TanStack Query adoption across 35+ hooks. The architecture (single source of truth in queryKeys, ref-counted realtime bridge, hybrid status store, canonical Pattern 5 mutation shape enforced by a regression gate) is solid. The migration successfully strips server-data mirrors from `useHomeStore`, `useChatStore`, and `usePlansStore` and preserves the public hook shapes verbatim so consumers don't need to change.

The issues below are mostly correctness concerns at the edges of well-tested happy paths: a few cache-key reuse traps, a sign-out race in the realtime bridge, a missing `void` discard on a fire-and-forget `markPushPromptEligible` call, several uses of `(supabase as any)` that hide real type bugs, and a handful of legacy `console.warn`/`console.error` calls that should at least be wrapped in `__DEV__` for production builds. No critical security or data-loss bugs found.

## Warnings

### WR-01: Same `queryKeys.friends.wishList(id)` key family used for two different value shapes

**Files:**
- `src/hooks/useMyWishList.ts:56` — stores `WishListItem[]` keyed by `queryKeys.friends.wishList(userId)`
- `src/hooks/useFriendWishList.ts:36` — stores `WishListItemWithClaim[]` keyed by `queryKeys.friends.wishList(friendId)`
- `src/hooks/useWishListVotes.ts:142` — invalidates `queryKeys.friends.wishList(birthdayPersonId)`

**Issue:** Two hooks share the `friends.wishList` key family but store structurally different data (one with `isClaimed`/`isClaimedByMe`/`claimerName`, one without). They don't collide today because `userId !== friendId` for any sane navigation flow, but:

1. Anything that broad-invalidates by the prefix `queryKeys.friends.all()` (e.g. `useWishListVotes` onSettled fallback line 145) will invalidate both shapes — fine, but `useWishListVotes` also targets a specific `friends.wishList(birthdayPersonId)` slot whose stored shape (`WishListItemWithClaim[]`) is the one expected by `useFriendWishList`. If a developer ever passes `userId` as `birthdayPersonId` (e.g. testing your own birthday), the invalidation would correctly mark `useMyWishList`'s cache stale, but a `setQueryData<WishListItemWithClaim[]>` call would corrupt the `useMyWishList` shape because of the type mismatch.
2. The TypeScript generics on `setQueryData` won't catch this — `queryKeys` returns the same `readonly string[]` shape, so both hooks compile.

**Fix:** Split the key into two namespaces to make the shapes explicit:
```ts
// In src/lib/queryKeys.ts
friends: {
  // ...
  myWishList: (userId: string) => [...queryKeys.friends.all(), 'myWishList', userId] as const,
  friendWishList: (friendId: string) => [...queryKeys.friends.all(), 'friendWishList', friendId] as const,
},
```
Update `useMyWishList` to use `friends.myWishList(userId)` and `useFriendWishList`/`useWishListVotes` to use `friends.friendWishList(friendId)`. The `friends.all()` prefix invalidation still hits both.

---

### WR-02: `realtimeBridge` registry survives auth bridge `removeQueries()` — leaks subscriptions across sign-in/sign-out

**File:** `src/lib/realtimeBridge.ts:28` and `src/lib/authBridge.ts:31-32`

**Issue:** The realtimeBridge maintains a module-scope `registry: Map<string, RegistryEntry>` keyed by channel name. On `SIGNED_OUT`, `authBridge.attachAuthBridge` calls `queryClient.removeQueries()` and `useStatusStore.getState().clear()`, but the realtime registry is NEVER cleaned up. The hooks that own the unsubscribe handles do clean up when their components unmount — but signing out without unmounting the host screen (typical in a tab navigator) leaves `subscribeHabitCheckins`/`subscribeHomeStatuses`/`subscribeChatRoom` channels open in the registry. On sign-in as a different user the new useQuery runs with a new user_id, but if the prior user's channel filter (`user_id=eq.<old-user-id>`) is still alive, payloads for the OLD user can mutate the NEW user's cache (because the cache key in `setQueryData` is just `queryKeys.chat.messages(channelId)` — `channelId` could legitimately collide if two users are in the same plan/group).

`_resetRealtimeBridgeForTests` exists for the test path, but no production analogue is wired into `attachAuthBridge`.

**Fix:** Export a `resetRealtimeBridge()` (non-test name) and call it from `attachAuthBridge` on `SIGNED_OUT`:
```ts
// realtimeBridge.ts
export function resetRealtimeBridge() {
  registry.forEach((entry) => entry.teardown());
  registry.clear();
}

// authBridge.ts
import { resetRealtimeBridge } from '@/lib/realtimeBridge';
// ...
if (event === 'SIGNED_OUT') {
  queryClient.removeQueries();
  useStatusStore.getState().clear();
  resetRealtimeBridge();
}
```

---

### WR-03: `useFriends.sendRequest` re-uses rejected-friendship id immediately after `.delete()` — race window

**File:** `src/hooks/useFriends.ts:216-225`

**Issue:** In the `'rejected'` branch:
```ts
if (existing.status === 'rejected') {
  await supabase.from('friendships').delete().eq('id', existing.id);
}
const { data, error } = await supabase.from('friendships').insert(...);
```

The delete + insert is two separate round-trips with no transaction. If the delete succeeds and the user backgrounds the app (or the network drops) before the insert lands, the `'rejected'` row is gone but no new pending row exists — the user appears to have no friendship history with the addressee, which is consistent with the intent. However, if a `friendships_unique_pair` UNIQUE constraint exists on the table (typical for this schema), the insert can still fail with a transient race if a concurrent client also writes a row in the gap. There's no rollback path for the orphaned delete.

**Fix:** Either (a) wrap in a Supabase RPC that handles delete-then-insert atomically, or (b) UPDATE the existing row's status from `'rejected'` to `'pending'` instead of delete+insert. Option (b) is the minimal change:
```ts
if (existing.status === 'rejected') {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'pending', requester_id: myId, addressee_id: targetUserId })
    .eq('id', existing.id);
  if (error) throw error;
  markPushPromptEligible().catch(() => {});
  return data;
}
```

---

### WR-04: `useChatList.fetchChatList` produces unsorted "no messages" group entries that defeat the `lastMessageAt > b.lastMessageAt` sort

**File:** `src/hooks/useChatList.ts:226-227, 236`

**Issue:** Group chats without any messages still appear in the list with:
```ts
lastMessage: latest?.body ?? 'No messages yet',
lastMessageAt: latest?.created_at ?? new Date(0).toISOString(),
```

The sort:
```ts
items.sort((a, b) => (a.lastMessageAt > b.lastMessageAt ? -1 : 1));
```

returns `-1` if `a > b` else `1` — i.e., it returns `1` even when the timestamps are EQUAL, which is unstable. For two empty group chats both with `new Date(0).toISOString()`, sort order depends on the V8/JSC implementation. Worse, this sort is non-deterministic for ties (sometimes returning the equality-collapsed `1` swaps adjacent equal items), which can cause UI thrashing across refetches as the chats appear to reorder.

**Fix:** Use a 3-way comparator and a stable tie-breaker (e.g., id):
```ts
items.sort((a, b) => {
  if (a.lastMessageAt > b.lastMessageAt) return -1;
  if (a.lastMessageAt < b.lastMessageAt) return 1;
  return a.id.localeCompare(b.id);
});
```

---

### WR-05: `useExpenseCreate.submit` doesn't surface the `partial` planId on `plan_members` insert failure (createPlan analog exists in `usePlans.createPlan`)

**File:** `src/hooks/useExpenseCreate.ts:242-255` and **comparison:** `src/hooks/usePlans.ts:262-268, 290-300`

**Issue:** `usePlans.createPlan` correctly attaches a `partial` planId to the error for the caller to surface when `plan_members` insert fails after `plans` insert succeeded (see usePlans.ts line 266 `(err as Error & { planId?: string }).planId = planId`). `useExpenseCreate.submit` does no analogous thing — if `create_expense` RPC partially succeeds (e.g. group row written, member rows fail server-side), the user sees the generic "Couldn't create expense" alert (line 254) and no way to navigate to the half-created group. This is a UX miss, not a correctness bug, because `create_expense` is supposedly atomic at the RPC level. But the comment on line 178 calls out that "iou_groups + iou_members" are written server-side — confirm that the RPC is wrapped in a transaction so the partial-success state is impossible. If not, mirror the `usePlans` pattern.

**Fix:** Verify `create_expense` is atomic (single transaction in the migration's SQL function). If yes, no code change needed; consider adding a comment to that effect. If no, capture the partial groupId and pass it through:
```ts
} catch (err) {
  const partial = (err as Error & { groupId?: string }).groupId;
  setSubmitError(
    partial
      ? "Couldn't finalize expense. Open it manually to retry."
      : "Couldn't create expense. Check your connection and try again."
  );
  if (partial) router.push(`/squad/expenses/${partial}` as never);
}
```

## Info

### IN-01: `(supabase as any)` casts proliferate — TypeScript safety regressions hidden behind a "Phase 29.1 deferred" comment

**Files:**
- `src/hooks/useHabits.ts:33,49`
- `src/hooks/useHabitDetail.ts:57,58,59`
- `src/hooks/useTodos.ts:47,57,68,100`
- `src/hooks/useChatTodos.ts:50,88`
- `src/hooks/usePlanDetail.ts:146`

**Issue:** Every `(supabase as any).rpc(...)` and `(supabase as any).from(...)` cast erases the database type safety. The justification (`database.ts not regenerated since 0024 — Phase 29.1 decision in STATE.md`) is reasonable for v1 velocity, but the casts mean that a column rename in the migration won't fail the type-check — it'll surface as a runtime null. A follow-up task to regenerate `database.ts` and strip the `as any` casts would catch a real bug class.

**Fix:** Add a tracking issue (or STATE.md entry) for the database.ts regeneration. Strip the casts incrementally as types come back. Until then, at least narrow the cast site to the rpc/from name only:
```ts
const { data, error } = await (supabase.rpc as any)('get_habits_overview', { p_date_local: today });
```
instead of casting the whole client, so other call sites on `supabase.auth` etc. keep their types.

---

### IN-02: `useChatRoom.genMessageId` uses `Math.random` for UUIDs — collision risk at scale

**File:** `src/hooks/useChatRoom.ts:51-59`

**Issue:** The template-string `Math.random()` UUID generator is roughly 122 bits of entropy from `Math.random()`, but V8/Hermes `Math.random()` is not cryptographically secure. The collision birthday-bound for `2^61` random IDs is roughly `2^30.5` (~1.4 billion) generated IDs before a 50% chance of any collision. For a chat app the practical risk is near zero. However, the same generator is used for `useMyWishList.tempId` and could be used for IDs that round-trip through optimistic write + server confirmation paths where the server might receive an ID that conflicts with another concurrent user's optimistic ID. The constraint is the comment ("Hermes-safe — crypto.randomUUID() unavailable") is technically slightly stale: Hermes does ship `globalThis.crypto.getRandomValues` in newer RN versions (RN 0.74+ ships it for both engines per facebook/react-native#41600), and `react-native-get-random-values` polyfill exists. The current code is fine for v1 but worth a follow-up.

**Fix:** Add a polyfill in `src/lib/uuid.ts` that uses `crypto.getRandomValues` when available and falls back to `Math.random`:
```ts
import 'react-native-get-random-values'; // polyfills crypto.getRandomValues
export function genUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0]! % 16;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
```

---

### IN-03: Inline `any[]` cast on `setQueryData` in realtimeBridge.subscribeChatRoom — loses type safety on the messages cache shape

**File:** `src/lib/realtimeBridge.ts:172, 201`

**Issue:**
```ts
queryClient.setQueryData<any[]>(queryKeys.chat.messages(channelId), (old) => {
  // ...
  if (optimisticIdx >= 0) {
    const next = [...old];
    next[optimisticIdx] = { ...(incoming as any), pending: false, failed: false };
    // ...
});
```

The `any[]` generic means the bridge can shape-drift away from `MessageWithProfile[]` (the type useChatRoom seeds). If a new field is added to `MessageWithProfile`, the bridge silently passes the partial server row through, missing display_name/avatar_url enrichment. The optimistic message kept its sender info but the server INSERT payload doesn't carry it — so post-bridge, the message renders with `display_name: undefined`. The current useChatRoom dedup by id-with-pending-flag avoids the worst case (incoming server row replaces optimistic row that had display_name set), but only because the optimistic row's fields are preserved via spread. If a `chat-aux` Realtime path or future code path bypasses the dedup, the bridge would write a row missing display fields.

**Fix:** Type the `setQueryData` calls in realtimeBridge against the real type by re-exporting it from a shared module that doesn't import the bridge (to avoid circular imports). At minimum, document the assumption explicitly:
```ts
// CONTRACT: payload.new is a raw `messages` row from Postgres — NOT a MessageWithProfile.
// The dedup path below relies on the existing optimistic row preserving sender_display_name
// and sender_avatar_url via spread. If you change useChatRoom.onMutate's optimistic shape,
// the spread on line 178 will need to merge those fields explicitly.
```

---

### IN-04: `useStatus.ts` installs a module-scope `useAuthStore.subscribe` listener via `installNotificationCleanupOnce()` — leaks across HMR

**File:** `src/hooks/useStatus.ts:40-51`

**Issue:**
```ts
let notificationListenerInstalled = false;
function installNotificationCleanupOnce() {
  if (notificationListenerInstalled) return;
  notificationListenerInstalled = true;
  useAuthStore.subscribe((state, prev) => { ... });
}
installNotificationCleanupOnce();
```

The `notificationListenerInstalled` flag is module-scope. On a Hot Module Reload that re-executes the module, the flag is reset to `false` but the previous listener is still alive — so a second listener is installed. After N HMRs, `cancelExpiryNotification` and `cancelMorningPrompt` run N times per sign-out. The cancel functions are idempotent (they no-op if no notification is scheduled), so this is benign in practice but adds dev-loop noise and could surface as flaky test interactions.

**Fix:** Either (a) attach the listener inside `_layout.tsx` alongside `attachAuthBridge` where it's already torn down on unmount, or (b) keep the listener but track its unsubscribe handle so a future HMR can clear it:
```ts
let unsubscribe: (() => void) | null = null;
function installNotificationCleanupOnce() {
  if (unsubscribe) unsubscribe();
  unsubscribe = useAuthStore.subscribe(...);
}
```

---

### IN-05: `chat.messages(channelId, opts)` accepts an `opts` arg but the call sites only ever pass `()` — dead parameter

**File:** `src/lib/queryKeys.ts:35-36`

**Issue:**
```ts
messages: (channelId: string, opts: { before?: string } = {}) =>
  [...queryKeys.chat.room(channelId), 'messages', opts] as const,
```

Every call site (in useChatRoom and realtimeBridge) uses `queryKeys.chat.messages(channelId)` with no second argument, so `opts` is always `{}`. The serialized key ends with `{}`, which is a harmless object that compares deep-equal. If pagination is ever added, the key will need to be updated to incorporate `before` — leaving `opts` in the signature suggests pagination is "almost there", but it's actually dead code.

**Fix:** Either implement the pagination it hints at (would also benefit chat-load performance) or strip the unused parameter for now:
```ts
messages: (channelId: string) =>
  [...queryKeys.chat.room(channelId), 'messages'] as const,
```

---

### IN-06: `markPushPromptEligible().catch(() => {})` silently swallows errors — useful pattern but the silent catch is fire-and-forget without telemetry

**Files:**
- `src/hooks/useFriends.ts:229, 259`
- `src/hooks/useStatus.ts:181`

**Issue:** The pattern `markPushPromptEligible().catch(() => {})` correctly does fire-and-forget, but the empty catch means that AsyncStorage failures (low-disk, sandbox glitch on iOS) are completely silent. The "push prompt eligible" gate is load-bearing for user growth metrics. A consistent failure here would silently disable the push prompt for affected users.

**Fix:** At least log to `console.warn` in `__DEV__`:
```ts
markPushPromptEligible().catch((err) => {
  if (__DEV__) console.warn('[markPushPromptEligible] failed:', err);
});
```

---

### IN-07: Several `console.warn` / `console.error` calls ship to production builds

**Files:**
- `src/hooks/useChatMembers.ts:53, 62, 73, 89`
- `src/hooks/useFriendWishList.ts:130`
- `src/hooks/useStreakData.ts:66`
- `src/hooks/usePlanPhotos.ts:132, 170-173`
- `src/hooks/useAllPlanPhotos.ts:176-180`

**Issue:** All of these `console.warn`/`console.error` calls are unconditional — they fire in production builds too. RN does suppress console output in release builds for performance, but the messages still allocate strings on the hot path. For chat-members fetch failures, the warning can run on every focus event.

**Fix:** Wrap in `__DEV__` guards:
```ts
if (__DEV__) console.warn('useChatMembers: group fetch failed', err);
```
Or replace with a centralized `logWarn` utility that no-ops in production.

---

### IN-08: `useStatus.ts` heartbeat memo dependency list omits the underlying `query.dataUpdatedAt` — heartbeat state can lag behind the cache on no-data-change refetches

**File:** `src/hooks/useStatus.ts:276-283`

**Issue:**
```ts
const heartbeatState = useMemo<HeartbeatState>(
  () => computeHeartbeatState(
    currentStatus?.status_expires_at ?? null,
    currentStatus?.last_active_at ?? null,
  ),
  [currentStatus?.status_expires_at, currentStatus?.last_active_at],
);
```

Heartbeat state transitions ('fresh' → 'fading' → 'dead') as the wall clock advances, even when `last_active_at` doesn't change. The memo only re-runs when the timestamps change, so a status that's been "fresh" for 19 minutes won't transition to "fading" at the 20-minute boundary unless the user does something that triggers a re-render of the hook host.

This isn't strictly a bug — the existing UI (MoodPicker, ReEngagementBanner) likely have their own ticking intervals (Phase 4 heartbeat ticker) that force re-renders. But the memo's dependency list reads like a complete answer when it's actually relying on external clock-driven re-renders. A subtle trap if a future consumer mounts useStatus without that ticker.

**Fix:** Document the implicit dependency:
```ts
// NOTE: heartbeatState is computed from the wall clock — callers MUST host this hook
// alongside a ticking re-render source (Phase 4 heartbeat ticker in YourZoneSection /
// MoodPicker / OwnStatusPill). The memo only re-keys on timestamp changes, NOT on
// the clock advancing past the fresh→fading→dead thresholds.
```

---

### IN-09: `useExpenseCreate` and `usePlans` rely on `useEffect` to seed selectedFriendIds — initial seed runs on every query refetch

**File:** `src/hooks/useExpenseCreate.ts:151-158`

**Issue:**
```ts
useEffect(() => {
  if (!friendsQuery.data) return;
  if (friendsQuery.data.defaultSelected.size === 0) return;
  setSelectedFriendIds((prev) => {
    if (prev.size > 0) return prev;
    return new Set(friendsQuery.data.defaultSelected);
  });
}, [friendsQuery.data]);
```

The guard `if (prev.size > 0) return prev` correctly prevents clobbering user-driven toggles after the initial seed. BUT if the user deselects ALL friends (legitimate UI action — "I want to add nobody yet" before adding new ones), the next refetch (e.g. focus refetch, or onSettled invalidation from a parallel mutation) will re-seed defaultSelected because `prev.size === 0`. The user's intentional empty state gets clobbered.

This matters for group-scoped expense creation (`groupChannelId !== null` path). For unscoped (line 144), `defaultSelected` is always an empty Set so the seed is a no-op.

**Fix:** Track a `hasSeeded` ref to seed only once:
```ts
const seededRef = useRef(false);
useEffect(() => {
  if (seededRef.current) return;
  if (!friendsQuery.data) return;
  if (friendsQuery.data.defaultSelected.size === 0) return;
  seededRef.current = true;
  setSelectedFriendIds(new Set(friendsQuery.data.defaultSelected));
}, [friendsQuery.data]);
```

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
