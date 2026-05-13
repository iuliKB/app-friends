# Phase 30: Unify Navigation Source-of-Truth and Chat-Entry Handlers — Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 18 (2 new, 13 modified, 3 candidate deletions)
**Analogs found:** 17 / 18 (the only "no-analog" is the `currentSurface` reducer pattern itself — but the store factory has 5 strong analogs)

---

## File Classification

| New / Modified / Deleted | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| **NEW** `src/stores/useNavigationStore.ts` | store (zustand slice) | event-driven (set on focus) | `src/stores/useStatusStore.ts` | exact (role + flow + middleware shape) |
| **NEW** `src/lib/openChat.ts` | helper (pure async fn) | request-response (RPC + push) | `src/lib/heartbeat.ts` (pure fn) + the 8 inline `handleStartDM` blocks | exact (lib helper convention) |
| **MODIFIED** `src/components/common/CustomTabBar.tsx` | component (UI consumer) | pub-sub (subscribes to store) | none (it currently reads navigator state; the *replacement* will mirror `MoodPicker` reading `useStatusStore`) | role-match |
| **MODIFIED** `src/app/(tabs)/chat/room.tsx` (possibly moved to `src/app/chat/room.tsx`) | route (expo-router) | request-response | itself (re-keyed) + `src/app/squad/birthday/[id].tsx` for root-level dynamic route shape | exact |
| **MODIFIED** `src/app/_layout.tsx:66` | call site (notification dispatcher) | event-driven | self — pattern preserved | (call-site migration) |
| **MODIFIED** `src/app/(tabs)/squad.tsx:193,203` | call site (action sheet handler) | request-response | self | (call-site migration) |
| **MODIFIED** `src/app/squad/birthday/[id].tsx:84` | call site (group create) | request-response | self | (call-site migration) — note: this is `create_birthday_group`, not `get_or_create_dm_channel` |
| **MODIFIED** `src/app/friends/[id].tsx:88-100` | call site (profile handler) | request-response | self | (call-site migration) |
| **MODIFIED** `src/screens/chat/ChatListScreen.tsx:32-50` | call site (row tap) | request-response | self — 3 branches (plan/group/dm) | (call-site migration) |
| **MODIFIED** `src/screens/plans/PlanDashboardScreen.tsx:1022` | call site ("Open Chat" pill) | request-response | self (synchronous push) | (call-site migration — originating bug site) |
| **MODIFIED** `src/components/home/OverflowChip.tsx:55-66` | call site (DM duplicate #1) | request-response | self | (consolidate into helper) |
| **MODIFIED** `src/components/home/FriendSwipeCard.tsx:337-349` | call site (DM duplicate #2) | request-response | self | (consolidate into helper) |
| **MODIFIED** `src/components/home/HomeFriendCard.tsx:114-125` | call site (DM duplicate #3) | request-response | self | (consolidate into helper) |
| **MODIFIED** `src/components/home/RadarBubble.tsx:292-303` | call site (DM duplicate #4) | request-response | self | (consolidate into helper) |
| **MODIFIED** `src/app/(tabs)/_layout.tsx` (only if route is hoisted) | layout (route declarer) | n/a | self | (only required if `chat/room` moves to root) |
| **DELETED** `src/components/home/RecentMemoriesSection.tsx` | dead-code | n/a | n/a — confirmed zero imports | dead-code (see Verification below) |
| **DELETED** `src/screens/friends/FriendsList.tsx` | dead-code (or merged) | n/a | content lives in `src/app/(tabs)/squad.tsx:180-205` already | duplicate |
| **DELETED** `src/app/friends/index.tsx` | dead-code route | n/a | n/a — confirmed no deep links push `/friends` (the index path) | dead-code (see Verification below) |

---

## Pattern Assignments

### NEW: `src/stores/useNavigationStore.ts` (store, event-driven)

**Analog:** `src/stores/useStatusStore.ts` (chosen because it has the richest action shape — header doc, multiple setters, `clear()` for logout)

**Factory call shape** — all 5 existing stores agree: `create<T>((set) => ({ ... }))`, no middleware (no `persist`, no `subscribeWithSelector`, no `immer`). Copy verbatim from `useStatusStore.ts:9-33`:

```ts
import { create } from 'zustand';
import type { CurrentStatus } from '@/types/app';

interface StatusState {
  /** Authenticated user's own current status row, or null when not loaded / not set. */
  currentStatus: CurrentStatus | null;
  /** Replace the cached status (called by useStatus.setStatus + useStatus refetch). */
  setCurrentStatus: (next: CurrentStatus | null) => void;
  /** Update last_active_at only — used by useStatus.touch (HEART-02). */
  updateLastActive: (lastActiveAt: string) => void;
  /** Wipe on logout (T-02-11 mitigation; wired by Plan 04 in the auth listener). */
  clear: () => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  currentStatus: null,
  setCurrentStatus: (next) => set({ currentStatus: next }),
  updateLastActive: (lastActiveAt) =>
    set((state) =>
      state.currentStatus
        ? { currentStatus: { ...state.currentStatus, last_active_at: lastActiveAt } }
        : state
    ),
  clear: () => set({ currentStatus: null }),
}));
```

**Smaller-store shape** — when state is just a flag plus a setter, copy `useAuthStore.ts:1-20`:

```ts
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  loading: boolean;
  needsProfileSetup: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setNeedsProfileSetup: (needs: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  needsProfileSetup: false,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setNeedsProfileSetup: (needs) => set({ needsProfileSetup: needs }),
}));
```

**Hard-locked conventions extracted from the 5 stores:**
- Filename pattern: `use<Domain>Store.ts` — singular noun + `Store` suffix.
- Exported hook name: `use<Domain>Store` matching filename.
- Internal `interface <Domain>State` (not `Type`, not `_State`, no `I` prefix).
- `create<T>((set) => ({ ... }))` — **no curried `create<T>()(...)` form, no middleware.**
- Setters use `set({ key: value })` shape; only one store (`useStatusStore`) uses functional `set((state) => ...)` for partial mutation, and only when needed.
- Selectors are *not* defined in the file — consumers use `useFooStore((s) => s.bar)` inline (see `useAuthStore.ts:47` in `friends/[id].tsx:47` and `ChatListScreen.tsx:26`).
- Header comment with phase/decision references is optional but used in `useStatusStore.ts:1-7` (the most recent store). For the new nav store, include a similar 3-4 line header that names the decision (P30-D-XX) and lists writers/readers.

**No store uses `persist`** — confirmed by reading all 5. Navigation surface is **not** persisted across cold launches; `currentSurface` defaults to `'tabs'` on every fresh mount.

**Selector usage pattern (for the CustomTabBar refactor)** — copy from `ChatListScreen.tsx:26`:

```ts
const session = useAuthStore((s) => s.session);
```

And `birthday/[id].tsx:36`:

```ts
const invalidateChatList = useChatStore((s) => s.invalidateChatList);
```

---

### NEW: `src/lib/openChat.ts` (helper, request-response)

**Analog (file structure):** `src/lib/heartbeat.ts` — pure function module, header doc, multiple named exports, type imports from `@/types/app`. Copy that file's header-doc + named-export shape:

```ts
// Phase 2 v1.3 — Heartbeat client utility (D-15, D-29, OVR-01, OVR-10).
// Mirrors the SQL logic in supabase/migrations/0009_status_liveness_v1_3.sql:
//   ALIVE  = status_expires_at > now AND last_active_at > now - 4h
//   FADING = status_expires_at > now AND last_active_at ∈ [now-8h, now-4h]
//   DEAD   = status_expires_at < now OR  last_active_at < now - 8h
// FADING is client-only — the server view encodes only ALIVE vs DEAD (D-16).

import type { HeartbeatState } from '@/types/app';

export const HEARTBEAT_FADING_MS = 4 * 60 * 60 * 1000; // 4 hours
export const HEARTBEAT_DEAD_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Pure function: ... (JSDoc)
 */
export function computeHeartbeatState(...) { ... }
```

**Prevailing decision: function (`src/lib/openChat.ts`) vs. hook (`src/hooks/useOpenChat.ts`)?**

The codebase splits cleanly:
- `src/lib/*` — **35 files**, all are pure-ish functions that take args and return values or perform I/O directly (`uploadChatMedia.ts`, `action-sheet.ts`, `notifications-init.ts`, `heartbeat.ts`, `dateLocal.ts`). They access `supabase` directly (`uploadChatMedia.ts` imports `supabase` from `@/lib/supabase`).
- `src/hooks/use*` — **~35 hooks**, all return either state (`useFriends`, `useChatList`) or memoized handlers that depend on render-time hook output (e.g., `useStatus.touch` depends on session from `useAuthStore`).

`openChat` needs: `supabase.rpc(...)` + `router.push(...)`. Of those, **`router` is the only thing that depends on render context** — and `useRouter()` is already called at every call site. Therefore the prevailing convention is:

**`src/lib/openChat.ts`** exports a pure async function `openChat(router, params)` that receives the `router` from the caller. This matches `showActionSheet(title, items)` in `src/lib/action-sheet.ts:11` — a top-level function that callers invoke from within components and pass their own arguments. No hook indirection needed.

**Params matrix (extracted from every call site):**

| Variant | Inputs | Pre-push action | URL pushed |
|---|---|---|---|
| DM by existing channel | `dmChannelId`, `friendName` | none | `/chat/room?dm_channel_id=${id}&friend_name=${enc(name)}` |
| DM by friend id (create-or-get) | `friendId`, `friendName` | `supabase.rpc('get_or_create_dm_channel', { other_user_id: friendId })` → returns `dm_channel_id` string | `/chat/room?dm_channel_id=${id}&friend_name=${enc(name)}` |
| Plan chat | `planId` | none | `/chat/room?plan_id=${planId}` |
| Group chat | `groupChannelId`, `friendName`, optional `birthdayPersonId` | none (group is created by a separate RPC at the *callsite*, never inside `openChat`) | `/chat/room?group_channel_id=${id}&friend_name=${enc(name)}[&birthday_person_id=${pid}]` |
| Birthday chat (legacy alias) | same as Group + `birthdayPersonId` | same | same |

**Exact RPC signature** (from `src/types/database.ts:757` and 8 call sites): `supabase.rpc('get_or_create_dm_channel', { other_user_id: <uuid string> })` returns `{ data: string | null, error: PostgrestError | null }` where `data` is the `dm_channel_id` UUID.

**Canonical inline pattern** (this is what gets consolidated — copy from `HomeFriendCard.tsx:114-125`):

```ts
async function handlePress() {
  const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
    other_user_id: friend.friend_id,
  });
  if (error || !data) {
    Alert.alert('Error', "Couldn't open chat. Try again.");
    return;
  }
  router.push(
    `/chat/room?dm_channel_id=${data}&friend_name=${encodeURIComponent(friend.display_name)}` as never
  );
}
```

All 8 inline DM blocks (`OverflowChip:56`, `FriendSwipeCard:339`, `HomeFriendCard:115`, `RadarBubble:293`, `friends/[id].tsx:90`, `squad.tsx:193`, `FriendsList.tsx:58`, `_layout.tsx:61`) are byte-for-byte equivalent **except**:
- `squad.tsx:191-197` and `FriendsList.tsx:57-61` also set/clear a `loadingDM` local state around the RPC call.
- `_layout.tsx:64-67` is in a notification handler outside React render and uses `senderName ?? 'Friend'` fallback + early `return` (no `Alert`).

The helper must accept an optional `onLoadingChange?: (loading: boolean) => void` to preserve the loading flag, and the `Alert` is the helper's default error path — callers that want silent failure (the push handler) pass `silentError: true`.

**Group chat callsite (the only non-DM variant with pre-push logic):** `src/app/squad/birthday/[id].tsx:62-85`:

```ts
const { data: groupChannelId, error: rpcErr } = await supabase.rpc(
  'create_birthday_group',
  {
    p_name: groupName,
    p_member_ids: memberIds,
    p_birthday_person_id: friendId,
  }
);

setCreating(false);

if (rpcErr || !groupChannelId) {
  console.warn('create_birthday_group failed', rpcErr);
  return;
}

invalidateChatList();

router.push(
  `/chat/room?group_channel_id=${groupChannelId}&friend_name=${encodeURIComponent(groupName)}&birthday_person_id=${friendId}` as never
);
```

**Important:** `create_birthday_group` is a *different* RPC with side effects (membership write) and an explicit `invalidateChatList()` call afterward. **Do NOT pull `create_birthday_group` into `openChat`** — keep the group-creation flow at the callsite and call `openChat({ kind: 'group', groupChannelId, ... })` only after the RPC succeeds. `openChat` only owns the push, not the creation.

**Plan chat callsite — special handling** (from `PlanDashboardScreen.tsx:1022` and `ChatListScreen.tsx:34`): synchronous, no RPC:

```ts
onPress={() => router.push(`/chat/room?plan_id=${planId}` as never)}
```

The helper must handle this zero-await path without flickering loading state.

**Error/UX pattern (locked):**
- Alert title: `'Error'`
- Alert body: `"Couldn't open chat. Try again."` (exact copy used in 7 of 8 sites)
- The push notification site (`_layout.tsx:64`) uses silent fail — preserve via `silentError` flag.

**The `as never` cast** is used at every push site to satisfy `expo-router`'s typed routes. Preserve it inside the helper.

---

### MODIFIED: `src/components/common/CustomTabBar.tsx` (component, pub-sub consumer)

**Current logic (lines 123-129 — verbatim, quote in full so planner can write the replacement):**

```ts
const focusedRoute = state.routes[state.index];
const nestedState = focusedRoute?.state;
if (nestedState) {
  const nestedIndex = nestedState.index ?? 0;
  const nestedRoute = nestedState.routes[nestedIndex];
  if (nestedRoute?.name === 'room') return null;
}
```

**Why it fails:** this only checks the nested state of the **focused** tab. When `/chat/room` is pushed from a root-Stack sibling (e.g., PlanDashboard's "Open Chat" pill at `PlanDashboardScreen.tsx:1022`), the focused tab is Squad/Plans, so `nestedRoute.name !== 'room'` and the guard returns `null` falsy → bar stays visible over the chat.

**Replacement pattern (consumer of the new store):** copy the selector-subscribe pattern from `ChatListScreen.tsx:26`:

```ts
const session = useAuthStore((s) => s.session);
```

Applied to the navigation store, the replacement of lines 123-129 becomes:

```ts
const surface = useNavigationStore((s) => s.currentSurface);
if (surface === 'chat') return null;
```

The exact set of hidden surfaces is a P30 decision; the **mechanism** is what's locked here.

**Reading via selector (not destructure) is enforced** — the existing tab bar already destructures `colors`/`isDark` from `useTheme()` (line 34) but every store consumer uses the selector form. Match the store consumer convention.

**Subscriber-write pattern (what screens do to push their surface in):** copy `useFocusEffect` usage from `src/screens/friends/FriendRequests.tsx:25` (the only `useFocusEffect` consumer in screens today):

```ts
useFocusEffect(
  React.useCallback(() => {
    // setSurface('chat') on focus, setSurface('tabs') on blur
    // ...
  }, [])
);
```

The actual write site for `ChatRoomScreen` is `src/screens/chat/ChatRoomScreen.tsx` — the screen file, not the route file — because the screen is rendered identically regardless of where in the route tree the route file lives.

---

### MODIFIED: `src/app/(tabs)/chat/room.tsx` → possibly `src/app/chat/room.tsx`

**Current file (full content):**

```ts
import { useEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ChatRoomScreen } from '@/screens/chat/ChatRoomScreen';

export default function ChatRoomRoute() {
  const { plan_id, dm_channel_id, group_channel_id, friend_name, birthday_person_id } = useLocalSearchParams<{
    plan_id?: string;
    dm_channel_id?: string;
    group_channel_id?: string;
    friend_name?: string;
    birthday_person_id?: string;
  }>();
  const navigation = useNavigation();

  useEffect(() => {
    if (friend_name) {
      navigation.setOptions({ title: friend_name });
    }
  }, [friend_name, navigation]);

  return <ChatRoomScreen planId={plan_id} dmChannelId={dm_channel_id} groupChannelId={group_channel_id} friendName={friend_name} birthdayPersonId={birthday_person_id} />;
}
```

**Analog for root-level dynamic route (if hoisted):** `src/app/squad/birthday/[id].tsx:19-32` shows a sibling-to-`(tabs)` route that uses `useLocalSearchParams` + `useRouter`:

```ts
import { useLocalSearchParams, useRouter } from 'expo-router';
// ...
export default function FriendBirthdayPage() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
```

If the route is hoisted to `src/app/chat/room.tsx`, the file content stays the same. Only the URL string in callsites changes from `/chat/room?...` to `/chat/room?...` — these are identical, because expo-router file-based routing resolves `app/chat/room.tsx` and `app/(tabs)/chat/room.tsx` to the same `/chat/room` URL. **The decision is therefore about navigator topology (where in the Stack hierarchy `ChatRoomScreen` mounts), not about URLs.** No callsite URL changes are needed — only `_layout.tsx` configurations.

**Expo-router 55 verification check** (from CONTEXT.md secondary concern): after the move, the chat screen must NOT exist at two navigator levels simultaneously. The planner must add a verification step that pushes the same URL from inside-tabs and outside-tabs paths and confirms a single mount via dev-mode `console.log` in `ChatRoomRoute`.

---

### MODIFIED: 13 call sites — exact pre/post-push behaviors

| Site | Pre-push | Push params | Post-push | Migration note |
|---|---|---|---|---|
| `src/app/_layout.tsx:61-67` | RPC `get_or_create_dm_channel` (silent on error) | `dm_channel_id`, `friend_name` (fallback `'Friend'`) | none | Pass `silentError: true` to helper |
| `src/app/(tabs)/squad.tsx:190-205` | `setLoadingDM(true)`; RPC; `setLoadingDM(false)`; `handleCloseSheet()` | `dm_channel_id`, `friend_name` | sheet closes before push | Pass `onLoadingChange: setLoadingDM`; call `handleCloseSheet` after helper resolves |
| `src/app/squad/birthday/[id].tsx:56-86` | `setCreating(true)`; RPC `create_birthday_group` (NOT `get_or_create_dm_channel`); `setCreating(false)`; on success `invalidateChatList()` | `group_channel_id`, `friend_name`, `birthday_person_id` | n/a | **Keep RPC at callsite.** Only the final push goes through helper: `openChat(router, { kind: 'group', groupChannelId, friendName, birthdayPersonId })` |
| `src/app/friends/[id].tsx:88-100` | guard `if (!profile) return`; RPC | `dm_channel_id`, `friend_name` | none | Straight migration. **Locked field mapping:** `openChat(router, { kind: 'dmFriend', friendId: id, friendName: profile.display_name })` — `friendId` is the URL search param `id` from `useLocalSearchParams<{ id: string \| string[] }>()`, **NOT** `profile.friend_id` (that field does not exist on the FriendProfile interface). See the Canonical Call-Site Field Mappings section above for verified evidence. |
| `src/screens/chat/ChatListScreen.tsx:32-50` | **3 branches by `item.type`**: plan / group / dm | varies | none | 3 helper calls, one per branch. Group branch uses `URLSearchParams` already — helper must produce identical query string |
| `src/screens/plans/PlanDashboardScreen.tsx:1022` | **none — synchronous** | `plan_id` only | none | `openChat(router, { kind: 'plan', planId })` — the originating bug site |
| `src/screens/friends/FriendsList.tsx:55-70` | identical to `squad.tsx:190-205` | `dm_channel_id`, `friend_name` | sheet closes before push | If the file is deleted (scope item 5), this site disappears |
| `src/components/home/OverflowChip.tsx:55-66` | RPC | `dm_channel_id`, `friend_name` | none | Straight migration |
| `src/components/home/FriendSwipeCard.tsx:337-349` | `Haptics.impactAsync(Light)`; RPC | `dm_channel_id`, `friend_name` | none | Haptics stays at callsite; helper handles only RPC + push |
| `src/components/home/HomeFriendCard.tsx:114-125` | RPC | `dm_channel_id`, `friend_name` | none | Straight migration |
| `src/components/home/RadarBubble.tsx:292-303` | RPC | `dm_channel_id`, `friend_name` | none | Straight migration |

---

## Shared Patterns

### Zustand store selector access
**Source:** `src/screens/chat/ChatListScreen.tsx:26`, `src/app/squad/birthday/[id].tsx:36`, `src/app/friends/[id].tsx:47`
**Apply to:** every reader of `useNavigationStore` (the new `CustomTabBar` consumer + any screen subscribers)

```ts
const surface = useNavigationStore((s) => s.currentSurface);
const setSurface = useNavigationStore((s) => s.setSurface);
```

Never destructure: `const { currentSurface, setSurface } = useNavigationStore()` causes the component to re-render on every store change. The selector form (single field at a time) is consistent across all 5 existing stores.

### useFocusEffect for screen-on-focus side effects
**Source:** `src/screens/friends/FriendRequests.tsx:25`
**Apply to:** any screen that needs to declare its `currentSurface` on focus/blur (e.g., `ChatRoomScreen`, `PlanDashboardScreen` if it changes the surface to `'plan'`)

```ts
useFocusEffect(
  React.useCallback(() => {
    setSurface('chat');
    return () => setSurface('tabs');
  }, [setSurface])
);
```

`expo-router` re-exports `useFocusEffect` from `@react-navigation/native` — the import is `import { useFocusEffect } from 'expo-router';` (verified in `FriendRequests.tsx:3`).

### Cross-platform error alert for chat-entry failures
**Source:** `src/components/home/HomeFriendCard.tsx:118-119` (and 7 other sites — exact same copy)
**Apply to:** every error branch inside `openChat`

```ts
Alert.alert('Error', "Couldn't open chat. Try again.");
return;
```

Use `react-native`'s `Alert` (not the custom toast — the codebase has no toast primitive). Exact string literal. The push-notification call site (`_layout.tsx:64`) returns silently and is the **only** exception; expose via a `silentError?: boolean` flag.

### Router push as the universal navigation primitive
**Source:** every callsite uses `router.push(<urlString> as never)` from `useRouter()` (or top-level `import { router } from 'expo-router'` for non-render contexts like `_layout.tsx:54`).

```ts
const router = useRouter();
router.push(`/chat/room?dm_channel_id=${id}&friend_name=${encodeURIComponent(name)}` as never);
```

The `as never` cast satisfies expo-router 55's typed-routes static check. The helper must accept `router` as its first argument from callers so it works in both render and non-render contexts (compare `_layout.tsx:54` non-hook `router` vs. component-level `useRouter()`).

### Import grouping convention
**Source:** every modified file uses the order: (1) react, (2) react-native, (3) third-party (`expo-router`, `expo-image`, `@expo/...`), (4) `@/theme`, (5) `@/lib`, (6) `@/hooks`, (7) `@/stores`, (8) `@/components`, (9) `@/types`. No barrel imports. Example from `useStatusStore.ts:9-10`:

```ts
import { create } from 'zustand';
import type { CurrentStatus } from '@/types/app';
```

Apply to the new `useNavigationStore.ts` and `openChat.ts`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| (none) | — | — | All target patterns have at least one strong existing analog. |

The closest "novel" element is the *semantics* of `currentSurface` (a UI-state machine for which screen is on top), but the **mechanics** (zustand slice + selector consumer + `useFocusEffect` writer) all have direct precedent.

---

## Canonical Call-Site Field Mappings (Locked for Plan 30-05)

The field mappings below are LOCKED — Plan 30-05 executors MUST use exactly these
source fields when calling `openChat()`. The mappings were verified against the
actual codebase shapes (interface definitions + URL-param shapes) on 2026-05-13.

### `src/app/friends/[id].tsx` — Friend profile "Open chat" action

| Argument to `openChat()` | Source                                       | Why                                                              |
|--------------------------|----------------------------------------------|------------------------------------------------------------------|
| `kind`                   | literal `'dmFriend'`                         | This is a 1:1 DM with a known friend.                            |
| `friendId`               | `id` (from `useLocalSearchParams`)           | The URL path param IS the friend's user id. **NOT** `profile.friend_id` — that field DOES NOT exist on the `FriendProfile` interface at lines 16-22 of friends/[id].tsx. |
| `friendName`             | `profile.display_name`                       | `display_name` is the only canonical name field on `FriendProfile` (verified). |

Reference `FriendProfile` shape (from `src/app/friends/[id].tsx:16-22`):
```ts
interface FriendProfile {
  display_name: string;
  username: string;
  avatar_url: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  // No friend_id, no user_id — the id comes from the URL path.
}
```

Reference URL-param shape (from `src/app/friends/[id].tsx:43-46`):
```ts
const params = useLocalSearchParams<{ id: string | string[] }>();
const id = Array.isArray(params.id) ? params.id[0] : params.id;
// `id` (resolved to single string) is the friend's user id at the URL path.
```

Canonical call:
```ts
if (!profile) return;
await openChat(router, {
  kind: 'dmFriend',
  friendId: id,
  friendName: profile.display_name,
});
```

### `src/app/(tabs)/squad.tsx` — Squad-member DM action

| Argument to `openChat()` | Source                                       | Why                                                              |
|--------------------------|----------------------------------------------|------------------------------------------------------------------|
| `kind`                   | literal `'dmFriend'`                         | Squad members are friends; DM channel applies.                   |
| `friendId`               | `selectedFriend.friend_id`                   | Squad rows expose `friend_id` directly (this IS a real field on the squad-row type, unlike on FriendProfile). |
| `friendName`             | `selectedFriend.display_name`                | Squad rows expose `display_name`.                                |
| `onLoadingChange`        | `setLoadingDM` (existing local state setter) | Preserves the in-sheet loading-spinner UX while the RPC runs.    |

**Locked ordering:** `handleCloseSheet()` is called **AFTER** `await openChat(...)` returns, inside a `try { ... } finally { ... }` block. Reason: if the sheet closes before the await, the user briefly sees a blank state where the spinner used to be — a regression versus the original (which closed the sheet on the success path AFTER the RPC at line 201). The `finally` block guarantees the sheet still closes if `openChat` throws.

### `src/screens/chat/ChatListScreen.tsx` — Chat-list row tap

Field shape depends on row kind (`plan` / `group` / `dmChannel`); derive `planId` / `groupChannelId` / `dmChannelId` from `item.id` directly. URL param ORDER between the `group` branch's old `URLSearchParams` builder and `openChat`'s internal builder may differ — this is functionally equivalent because `chat/room.tsx` consumes params via key-based `useLocalSearchParams()`, not positional parsing. No code change required for this equivalence; document it inline next to the group-branch `openChat` call.

---

## Dead-Code Verification (Confirmation of Scope Items 5 & 6)

| File | Verified? | Evidence |
|---|---|---|
| `src/components/home/RecentMemoriesSection.tsx` | **Dead** | `grep -rn "RecentMemoriesSection" src/` returns exactly one hit — the file's own `export function` declaration at line 19. Zero imports. Safe to delete. |
| `src/app/friends/index.tsx` | **Dead route** | `grep -rn "router.push.*'/friends'" src/` returns zero matches for the exact `/friends` index path. All `/friends/<id>` and `/friends/add` / `/friends/requests` references are sub-routes that resolve independently — they do NOT require `app/friends/index.tsx`. Safe to delete after also deleting `FriendsList.tsx`. |
| `src/screens/friends/FriendsList.tsx` | **Imported only by `app/friends/index.tsx`** | `grep -rn "FriendsList" src/` returns exactly two hits: the import in `app/friends/index.tsx:6` and the export at `FriendsList.tsx:16`. When `app/friends/index.tsx` is deleted, this file becomes safe to delete too. Verified: the Squad Friends sub-tab at `src/app/(tabs)/squad.tsx:180-205` already duplicates the DM action sheet logic — no unique behavior to merge before deletion. |

The legacy `/friends` page is reachable only by manual URL entry (no in-app deep link). With `expo-router` 55, removing `app/friends/index.tsx` makes the URL 404 in dev — acceptable per scope item 5 ("If not, delete entirely").

The `/friends/<id>`, `/friends/add`, `/friends/requests` sub-routes remain — they have active deep links (10+ call sites) and must NOT be deleted.

---

## Metadata

**Analog search scope:** `src/stores/`, `src/lib/`, `src/hooks/`, `src/components/`, `src/screens/`, `src/app/`
**Files scanned:** ~80 across `grep` + 18 fully read
**Pattern extraction date:** 2026-05-13
**Phase:** 30 — Unify navigation source-of-truth and chat-entry handlers
