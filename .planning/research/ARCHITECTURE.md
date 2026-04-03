# Architecture Research

**Domain:** Squad tab integration and navigation restructuring — Expo Router file-based navigation
**Researched:** 2026-04-04
**Confidence:** HIGH — based on direct codebase inspection

> This file covers v1.2 Squad & Navigation milestone only. It supersedes the v1.1 design system architecture file.

---

## Current State

```
src/app/
├── _layout.tsx               ← Root Stack (session guard + notification routing)
├── (auth)/                   ← Auth screens
├── (tabs)/                   ← Bottom tab navigator (5 tabs)
│   ├── _layout.tsx           ← Tabs order: Home | Plans | Chat | Squad | Profile
│   ├── index.tsx             ← Home
│   ├── plans.tsx             ← Plans (single file, no nested Stack)
│   ├── chat/                 ← Chat (nested Stack with room.tsx)
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── room.tsx
│   ├── squad.tsx             ← Squad (coming-soon stub, single flat file)
│   └── profile.tsx           ← Profile (status + friend entry points + settings)
├── friends/                  ← Friends section (root-level Stack, pushed from profile)
│   ├── _layout.tsx
│   ├── index.tsx             ← FriendsList screen
│   ├── add.tsx               ← AddFriend screen
│   ├── requests.tsx          ← FriendRequests screen
│   └── [id].tsx              ← Friend profile detail
├── plans/                    ← Plan detail (root-level Stack, push target)
├── profile/                  ← Profile edit (root-level Stack)
├── plan-create.tsx           ← Modal
└── qr-code.tsx               ← QR modal
```

### Key observations from inspection

- `src/app/friends/` is a **root-level Stack**, not nested inside `(tabs)/`. It is pushed via `router.push('/friends')` from `profile.tsx`. Screens within it (`/friends/add`, `/friends/requests`, `/friends/[id]`) hide the bottom tab bar during navigation, which is correct behavior.
- `squad.tsx` is a **single flat file** with a coming-soon stub. It needs to become a directory to support top-tab children.
- `profile.tsx` owns: status editing, "My Friends" row (→ `/friends`), "Friend Requests" row (→ `/friends/requests`), "My QR Code" row, notifications toggle, logout. It imports `useFriends` and `usePendingRequestsCount`.
- `usePendingRequestsCount` is consumed in **two places**: `(tabs)/_layout.tsx` (drives Profile `tabBarBadge`) and `friends/index.tsx` (drives the requests header button). After restructure, the layout-level consumption moves to the Squad tab badge.
- `@react-navigation/material-top-tabs` is **NOT installed**. Only `bottom-tabs`, `native`, `elements`, `native-stack` are present in `node_modules/@react-navigation/`.
- `expo-router` v55's `withLayoutContext` explicitly supports `createMaterialTopTabNavigator` — documented in its `withLayoutContext.js` build file. The package must be installed separately.
- `react-native-pager-view` (required peer dependency of `react-native-tab-view`) is included in the Expo Go SDK 55 binary — safe in managed workflow without a custom dev build.

---

## Target State

```
src/app/(tabs)/
├── _layout.tsx               ← MODIFIED: reorder + rename tabs, move badge
├── index.tsx                 ← unchanged (Home)
├── explore.tsx               ← NEW: Plans tab renamed (identical content)
├── chat/                     ← MODIFIED: title label only ("Chats")
│   └── ...                   ← unchanged internally
├── squad/                    ← CONVERTED: squad.tsx → squad/ directory
│   ├── _layout.tsx           ← NEW: top-tab layout (Friends | Goals)
│   ├── friends.tsx           ← NEW: Friends tab (renders <FriendsList />)
│   └── goals.tsx             ← NEW: Goals tab (coming-soon stub)
└── profile.tsx               ← MODIFIED: Friends section removed
```

The `src/app/friends/` root-level Stack is **unchanged**. Friend sub-screens (add, requests, [id]) remain at root level and are still pushed from the new `squad/friends.tsx` via the same URL paths.

---

## Component Boundaries

| Component | Status | Change Summary |
|-----------|--------|----------------|
| `src/app/(tabs)/_layout.tsx` | MODIFIED | Reorder tabs, rename titles, move pending badge to Squad |
| `src/app/(tabs)/plans.tsx` | DELETED | Replaced by `explore.tsx` (same content, file rename only) |
| `src/app/(tabs)/explore.tsx` | NEW | Identical to current `plans.tsx` |
| `src/app/(tabs)/squad.tsx` | DELETED | Replaced by `squad/` directory |
| `src/app/(tabs)/squad/_layout.tsx` | NEW | Top-tab navigator using `withLayoutContext` |
| `src/app/(tabs)/squad/friends.tsx` | NEW | Renders `<FriendsList />`, hosts header FAB for requests |
| `src/app/(tabs)/squad/goals.tsx` | NEW | Coming-soon placeholder (ported from `squad.tsx`) |
| `src/app/(tabs)/profile.tsx` | MODIFIED | Remove FRIENDS section (3 rows + 2 hook calls) |
| `src/app/friends/` (all files) | UNCHANGED | Root Stack stays at root level |
| `src/screens/friends/FriendsList.tsx` | RECOMMENDED CHANGE | Add `useFocusEffect` for stale data prevention |
| `src/hooks/usePendingRequestsCount.ts` | UNCHANGED | Hook already uses `useFocusEffect` internally |

---

## Top-Tab Navigator: Implementation Pattern

`@react-navigation/material-top-tabs` + `withLayoutContext` is the idiomatic Expo Router approach. The project does not have material-top-tabs installed yet.

**Install:**
```bash
npx expo install @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view
```

`react-native-pager-view` is a native module, but it is pre-bundled in Expo Go SDK 55 — no dev build required. `react-native-tab-view` and `@react-navigation/material-top-tabs` are pure JS.

**Pattern for `src/app/(tabs)/squad/_layout.tsx`:**

```typescript
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

export default function SquadLayout() {
  const insets = useSafeAreaInsets();
  return (
    <TopTabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.interactive.accent,
        tabBarInactiveTintColor: COLORS.text.secondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface.base,
          paddingTop: insets.top,
        },
        tabBarIndicatorStyle: { backgroundColor: COLORS.interactive.accent },
        tabBarLabelStyle: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.semibold,
          textTransform: 'none',
        },
        tabBarPressColor: 'transparent',
      }}
    >
      <TopTabs.Screen name="friends" options={{ title: 'Friends' }} />
      <TopTabs.Screen name="goals" options={{ title: 'Goals' }} />
    </TopTabs>
  );
}
```

Note: `paddingTop: insets.top` on `tabBarStyle` handles safe area at the Squad screen level. The tab bar is the topmost element on this screen — it must consume the top inset here rather than in each child screen.

**Alternative considered — Custom tab switcher (no new dependency):** `AddFriend.tsx` uses a hand-rolled `activeTab` state + conditional render pattern. This works for a two-option UI within a form but is wrong for screen-level navigation: it would not fire `useFocusEffect` per tab, would not preserve scroll position per tab, and has no swipe. Reject this approach for the Squad layout.

---

## Data Flow Changes

### Pending requests badge: Profile → Squad

**Current:** `usePendingRequestsCount()` is called in `(tabs)/_layout.tsx` and assigned to the Profile `tabBarBadge`.

**After:** Same hook call in `(tabs)/_layout.tsx`, reassigned to the Squad `tabBarBadge`. No changes to the hook.

```
usePendingRequestsCount() in _layout.tsx
    ↓ (refires on every focus via hook's internal useFocusEffect)
Squad tabBarBadge  (was: Profile tabBarBadge)
```

### FriendsList mount lifecycle change

**Current:** `FriendsList` is a pushed screen — it always mounts fresh from a `router.push('/friends')` call. Its `useEffect([], fetchFriends)` fires on every navigation to the screen.

**After:** `squad/friends.tsx` renders `<FriendsList />` as a persistent top-tab child. The component mounts once and stays mounted. `useEffect([])` fires once on first tab visit, but after returning from Add Friend or navigating to another tab and back, data may be stale.

**Recommended fix:** Add `useFocusEffect` to `FriendsList.tsx`:

```typescript
useFocusEffect(
  useCallback(() => {
    fetchFriends();
  }, [fetchFriends])
);
```

The `useFocusEffect` hook fires whenever the enclosing screen (or tab) receives focus. This is the established pattern in `profile.tsx` and `home/HomeScreen.tsx` for the same reason.

### Navigation paths that change

| Action | Old path | Old caller | New caller | Change? |
|--------|----------|------------|------------|---------|
| View friends list | push `/friends` | `profile.tsx` | not needed — tab is the list | path removed |
| View friend requests | push `/friends/requests` | `profile.tsx`, `friends/index.tsx` | `squad/friends.tsx` header | path unchanged |
| Add friend | push `/friends/add` | `FriendsList` FAB | same | unchanged |
| View friend profile | push `/friends/${id}` | `FriendsList` action sheet | same | unchanged |
| View QR code | push `/qr-code` | `profile.tsx` | stays in `profile.tsx` | unchanged |

---

## File-by-File Change List

### New files

```
src/app/(tabs)/squad/_layout.tsx    ← Top-tab navigator (Friends / Goals)
src/app/(tabs)/squad/friends.tsx    ← Friends tab (renders <FriendsList />)
src/app/(tabs)/squad/goals.tsx      ← Goals tab (coming-soon stub)
src/app/(tabs)/explore.tsx          ← Plans tab content, renamed
```

### Modified files

```
src/app/(tabs)/_layout.tsx
  - Change Tabs.Screen order: index → squad → explore → chat → profile
  - Remove: name="plans", add: name="explore", title "Explore"
  - Chat title: "Chat" → "Chats"
  - Move tabBarBadge from "profile" to "squad" (pendingCount)
  - Remove tabBarBadge from "profile"

src/app/(tabs)/profile.tsx
  - Remove: import useFriends
  - Remove: import usePendingRequestsCount
  - Remove: const { friends } call
  - Remove: const { count: pendingCount } call
  - Remove: useFocusEffect(fetchFriends) dependency
  - Remove: FRIENDS sectionHeader View/Text
  - Remove: "My Friends" TouchableOpacity row
  - Remove: "Friend Requests" TouchableOpacity row
  - Keep: YOUR STATUS section (SegmentedControl + EmojiTagPicker)
  - Keep: "My QR Code" row
  - Keep: NOTIFICATIONS section
  - Keep: Logout row
  - Keep: Avatar header + profile fetch

src/screens/friends/FriendsList.tsx  (recommended)
  - Add: useFocusEffect wrapper around fetchFriends call
  - Remove: useEffect([], fetchFriends) (replace, don't add both)
```

### Deleted files

```
src/app/(tabs)/squad.tsx            ← Replaced by squad/ directory
src/app/(tabs)/plans.tsx            ← Replaced by explore.tsx
```

### Unchanged files

```
src/app/friends/_layout.tsx         ← Root Stack unchanged
src/app/friends/index.tsx           ← Unchanged (header button pattern preserved)
src/app/friends/add.tsx             ← Unchanged
src/app/friends/requests.tsx        ← Unchanged
src/app/friends/[id].tsx            ← Unchanged
src/screens/friends/AddFriend.tsx   ← Unchanged
src/screens/friends/FriendRequests.tsx ← Unchanged
src/hooks/usePendingRequestsCount.ts ← Unchanged
src/hooks/useFriends.ts             ← Unchanged
src/app/_layout.tsx                 ← Unchanged (no new protected routes needed)
```

---

## Suggested Build Order

The order is dictated by two dependency constraints: (1) the file Expo Router resolves must exist before the tab layout references it, and (2) profile cleanup should happen after the Squad tab is verified working to avoid temporarily removing friend entry points.

**Step 1 — Install dependency**

```bash
npx expo install @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view
```

Verify `react-native-pager-view` is not already in `node_modules` before running (it may be a transitive dep of `react-native-screens` or `reanimated`).

**Step 2 — Create Squad directory and top-tab layout**

Create `squad/_layout.tsx`, `squad/goals.tsx` (port coming-soon content from `squad.tsx`), and `squad/friends.tsx` (render `<FriendsList />`).

Delete `squad.tsx`. Expo Router will now resolve the `squad` segment to the `squad/` directory.

**Step 3 — Verify Squad tab before touching anything else**

Run the app. Confirm Friends and Goals tabs render, swipe works, FriendsList loads, FAB pushes to `/friends/add`, requests button pushes to `/friends/requests`.

**Step 4 — Rename Plans → Explore**

Create `explore.tsx` with identical content to `plans.tsx`. Delete `plans.tsx`.

**Step 5 — Update tab layout**

Modify `(tabs)/_layout.tsx`: reorder screens, update titles, move badge from profile to squad.

**Step 6 — Simplify Profile tab**

Remove the FRIENDS section from `profile.tsx`. This is the last step because it is the most destructive — removing the existing friend entry points is only safe after Step 3 confirms the Squad tab serves them.

**Step 7 — Add useFocusEffect to FriendsList (recommended)**

Swap `useEffect([], fetchFriends)` for `useFocusEffect(fetchFriends)` in `FriendsList.tsx`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Moving friends/ screens inside squad/

**What people do:** Relocate `friends/add.tsx`, `friends/requests.tsx`, `friends/[id].tsx` into `squad/friends/` sub-directory.

**Why it's wrong:** Friends sub-screens are full-screen Stack pushes. If they live inside the Squad tab's top-tab Stack, the bottom tab bar remains visible during sub-screen navigation (wrong). The existing pattern — root-level Stack with `router.push('/friends/add')` — correctly hides the tab bar and provides a native back button.

**Do this instead:** Keep `src/app/friends/` at the root level. The Squad Friends tab only embeds `<FriendsList />` inline. Sub-screens are still pushed as root Stack routes.

### Anti-Pattern 2: Moving the pending badge hook call out of _layout.tsx

**What people do:** Move `usePendingRequestsCount` into `squad/friends.tsx` or `squad/_layout.tsx`, then pass the count up via a Zustand store or context to drive the tab bar badge.

**Why it's wrong:** `tabBarBadge` is a prop on `<Tabs.Screen>` in `(tabs)/_layout.tsx`. The value must be available in that component. The existing pattern — call the hook in `_layout.tsx` — is the direct, zero-abstraction solution.

**Do this instead:** Keep `usePendingRequestsCount()` in `(tabs)/_layout.tsx`. Change only which tab's `tabBarBadge` it drives.

### Anti-Pattern 3: Custom tab switcher component instead of withLayoutContext

**What people do:** Build `squad.tsx` as a single screen with a stateful `View + TouchableOpacity` tab bar, conditional rendering, and manual scroll reset — matching the pattern in `AddFriend.tsx`.

**Why it's wrong:** `useFocusEffect` will not fire per logical tab (it fires for the whole Squad screen). Scroll position is not preserved per tab. Swipe gesture between tabs is absent. This is appropriate for sub-form navigation (AddFriend's Search/QR), not for a screen-level navigation structure.

**Do this instead:** Use `withLayoutContext(createMaterialTopTabNavigator())` with file-based screens, which integrates correctly with Expo Router's focus/blur lifecycle.

### Anti-Pattern 4: Applying safe-area insets in both _layout and child screens

**What people do:** Apply `paddingTop: insets.top` in both `squad/_layout.tsx` (on `tabBarStyle`) and again in `squad/friends.tsx` (on the container View).

**Why it's wrong:** Double inset. The tab bar in `_layout.tsx` already accounts for the top safe area. Child screens start below the tab bar — they should not add additional top inset.

**Do this instead:** Apply `insets.top` once, on the `tabBarStyle` in `squad/_layout.tsx`. Child screens use only their content-level padding (equivalent to other tab screens that start below the bottom tab bar).

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `squad/friends.tsx` → `<FriendsList />` | Direct component render (no props needed) | FriendsList is self-contained; manages its own state via useFriends hook |
| `squad/friends.tsx` → `friends/` root Stack | `router.push('/friends/add')`, `router.push('/friends/requests')` | Identical URL paths as before |
| `(tabs)/_layout.tsx` → `usePendingRequestsCount` | Hook call at layout level | Move badge assignment only; hook unchanged |
| `profile.tsx` → `useStatus` | Unchanged | Status editing stays on Profile tab |

### External Services

No changes to Supabase queries, RPC calls, or Realtime subscriptions. The data layer for friends is entirely in `useFriends.ts` and `usePendingRequestsCount.ts`, neither of which requires modification.

---

## Sources

- Direct codebase inspection: all files in `src/app/`, `src/screens/`, `src/hooks/` — HIGH confidence
- `expo-router/build/layouts/withLayoutContext.js` — confirms `createMaterialTopTabNavigator` integration pattern — HIGH confidence
- `package.json` — confirms SDK 55 (expo ~55.0.6), installed navigation packages — HIGH confidence
- Expo SDK 55 managed workflow modules list — `react-native-pager-view` included in Expo Go binary — HIGH confidence

---

*Architecture research for: Campfire v1.2 Squad tab integration and navigation restructuring*
*Researched: 2026-04-04*
