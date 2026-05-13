# Phase 30 — Context for Planning

This document captures the research findings and scope decisions made before planning, so they survive context clears. Read this before running `/gsd-plan-phase 30`.

## Trigger / Symptom

Navigating **Squad → Memories → pick a memory section → PlanDashboard → "Open Chat" pill** lands on `ChatRoomScreen`, but the bottom navigation bar stays visible — it should be hidden, as it is when entering the same chat via the Chat tab.

## Root cause (from two parallel Opus 4.7 research agents)

The custom tab bar at `src/components/common/CustomTabBar.tsx:123-129` decides visibility by inspecting the focused tab's nested navigator state shape:

```ts
if (nestedRoute?.name === 'room') return null;
```

This keys on **navigator topology**, not on **what is on screen**. When `/chat/room` is pushed from a root-Stack sibling of `(tabs)` (e.g., from `/plans/[id]` via PlanDashboard's "Open Chat" pill at `src/screens/plans/PlanDashboardScreen.tsx:1015-1029`), the focused tab is wrong (still Squad/Plans) or the chat tab's nested state is undefined (user never visited that tab). The guard short-circuits and the bar renders over the chat.

Same destination, different bar visibility depending on entry path.

There is a secondary concern flagged by Agent 2: with expo-router 55, pushing `/chat/room` from a root-Stack sibling may mount `ChatRoomScreen` at the **root stack level** rather than inside the chat tab's nested stack — meaning the screen could exist at two navigator levels simultaneously. This needs verification during planning.

## What is NOT the cause (assumption #1 mostly disconfirmed)

The user's initial hypothesis was that some views might be separate `.tsx` files instead of reusing existing views. Verdict: NOT CONFIRMED for chat specifically.

- `ChatRoomScreen` exists in exactly one file: `src/screens/chat/ChatRoomScreen.tsx`
- One route file: `src/app/(tabs)/chat/room.tsx`
- All 12 "Open chat" call sites push the same `/chat/room?...` URL

However, related duplication DOES exist and is in scope for this phase:

- `src/screens/friends/FriendsList.tsx` (legacy `/friends` route) duplicates the Friends sub-tab logic inside Squad
- `src/components/home/RecentMemoriesSection.tsx` is dead-code older sibling of `MemoriesSection.tsx` (defined but never imported)
- Four near-identical `get_or_create_dm_channel` + `router.push('/chat/room?dm_channel_id=...')` blocks in `OverflowChip.tsx:64`, `FriendSwipeCard.tsx:347`, `HomeFriendCard.tsx:123`, `RadarBubble.tsx:301`

## Inventory: all 12 `/chat/room` callers

Each pushes `/chat/room?...` with different params (`plan_id`, `dm_channel_id`, `group_channel_id`, `friend_name`, `birthday_person_id`):

1. `src/app/_layout.tsx:66` — push notification handler
2. `src/app/(tabs)/squad.tsx:203` — Friends sub-tab action sheet
3. `src/app/squad/birthday/[id].tsx:84`
4. `src/app/friends/[id].tsx:98`
5. `src/screens/chat/ChatListScreen.tsx:34`
6. `src/screens/chat/ChatListScreen.tsx:41`
7. `src/screens/chat/ChatListScreen.tsx:44`
8. `src/screens/plans/PlanDashboardScreen.tsx:1022` — the "Open Chat" pill that triggered this investigation
9. `src/screens/friends/FriendsList.tsx:68` — legacy route, may be deleted entirely
10. `src/components/home/OverflowChip.tsx:64` — duplicate DM logic
11. `src/components/home/FriendSwipeCard.tsx:347` — duplicate DM logic
12. `src/components/home/HomeFriendCard.tsx:123` — duplicate DM logic
13. `src/components/home/RadarBubble.tsx:301` — duplicate DM logic

(13 total once `ChatListScreen` is counted as 3 distinct call sites; "12" is the rough headline number.)

## Existing state management

Zustand is already installed (`zustand@^5.0.12`) with 5 small stores in `src/stores/`:

- `useAuthStore.ts` — session identity
- `useChatStore.ts` — chat UI coordination
- `useHomeStore.ts` — home UI state
- `usePlansStore.ts` — plans UI state
- `useStatusStore.ts` — status/presence (largest at 1.4 KB)

All stores are small (<1.5 KB), holding identity and UI flags. **No server data caching.** Data fetching lives in ~35 custom hooks (`useChatList`, `useChatRoom`, `usePlans`, `useHabits`, `useFriends`, etc.) that fetch from Supabase and hold results in local `useState`, refetching via `useFocusEffect`.

This phase **expands zustand** with a new `useNavigationStore`. It does **NOT** introduce server-state caching — that is Phase 31.

## Scope

### 1. Add `src/stores/useNavigationStore.ts`

A zustand slice holding the canonical "current surface" identity that the bottom bar reads from. Sketch:

```ts
type Surface = 'tabs' | 'chat' | 'plan' | 'modal' | 'auth' | ...
type NavigationState = {
  currentSurface: Surface;
  setSurface: (s: Surface) => void;
  // additional visibility flags as needed
};
```

Screens declare into this store on focus/mount (typically via `useFocusEffect`).

### 2. Refactor `CustomTabBar.tsx` to consume the nav store

Replace the nested-state inspection at `src/components/common/CustomTabBar.tsx:123-129` with a read from `useNavigationStore`. Visibility becomes a function of **what is on screen**, not of the navigation topology.

### 3. Decide and execute: where does `chat/room` live in the route tree?

Two options:

- **Keep at `src/app/(tabs)/chat/room.tsx`** (current) — and rely on the nav store to drive bar visibility correctly even when entered from outside `(tabs)`.
- **Hoist to root `src/app/chat/room.tsx`** — so the chat screen always presents over the tab bar regardless of entry path.

Verify with expo-router 55 behavior that `ChatRoomScreen` cannot end up mounted at two navigator levels simultaneously. Make the call during planning, execute it, and update all relevant deep links.

### 4. Single chat-entry helper

Create `src/lib/openChat.ts` (or a hook `useOpenChat`) that consolidates the chat-entry param matrix:

- DM by `dm_channel_id` (existing channel)
- DM by friend id (create-or-get, then push) — collapses the 4 duplicate blocks
- Plan chat by `plan_id`
- Group chat by `group_channel_id`
- Birthday chat by `birthday_person_id`

Migrate all 12+ call sites to use it.

### 5. Resolve `FriendsList.tsx` fork

Audit whether the legacy `/friends` route (`src/app/friends/index.tsx` → `src/screens/friends/FriendsList.tsx`) is still reachable. If not, delete entirely. If so, merge any unique capability into the Squad Friends sub-tab and then delete. Confirm no remaining deep links target `/friends`.

### 6. Delete dead code

Delete `src/components/home/RecentMemoriesSection.tsx` (dead-code older sibling of `MemoriesSection.tsx`, defined but never imported).

## Verification anchor

A smoke-test checklist of entry points where `ChatRoomScreen` must be reached and the bottom bar must hide on entry / restore on exit:

- [ ] Chat tab → chat row → chat → back
- [ ] Squad Friends sub-tab → friend → DM → back
- [ ] Plans tab → plan → "Open Chat" pill → back
- [ ] Squad Memories → plan section → PlanDashboard → "Open Chat" pill → back **(this is the originating bug)**
- [ ] Home screen friend chip (OverflowChip / FriendSwipeCard / HomeFriendCard / RadarBubble) → DM → back
- [ ] Birthday page → wish chat → back
- [ ] Friend detail page → DM → back
- [ ] Push notification deep link → chat → back

The `useNavigationStore` boundary must be documented (what belongs here vs. screen-local state vs. future server-state cache).

## Out of scope (deferred to Phase 31)

- Server-state caching
- TanStack Query adoption
- Cross-screen data reactivity
- Refetch-on-focus elimination
- Migrating the 35+ `useX` Supabase-fetching hooks
