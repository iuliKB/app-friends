# Phase 3: Home Screen - Research

**Researched:** 2026-03-18
**Domain:** React Native FlatList grid layout, Supabase Realtime subscriptions, Zustand cache store, React Native Animated
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Friend Card Design**
- New `HomeFriendCard` component — separate from the friends list `FriendCard`
- Vertical stack layout: avatar centered on top, display name below
- 3-column grid using `FlatList` with `numColumns={3}`
- Avatar size: 56px (larger than the 40px friends list cards)
- Display name: single line, truncate with ellipsis if too long
- No status pill on free friends (everyone in "Free Now" section is free)
- Emoji context tag: small badge overlaid on bottom-right corner of avatar circle (shown only if friend has a tag set)
- Card background: subtle `#2a2a2a` card with rounded corners
- Tapping a card does nothing in Phase 3 — interaction comes in later phases

**Two-Section Layout**
- "Free Now" section: grid of free friends with the `HomeFriendCard` component
- "Everyone Else" section: same grid layout, same card component but with a `StatusPill` shown (so you can see Busy vs Maybe)
- Section headers: "X friends free now" (large bold heading) for the free section, "Everyone Else" (smaller section label) for the rest
- When no friends are free: header reads "No friends free right now", Everyone Else section still shows below
- Free friends sorted by most-recently-updated status
- Everyone Else sorted by status (Maybe → Busy), then alphabetical within each

**Empty State (No Friends)**
- When user has zero friends: friendly onboarding message with campfire emoji
- "Add your first friends to see who's free!" with button to Add Friend screen
- Warm, cozy tone matching brand

**Header & Count**
- "X friends free now" as large bold heading below the status toggle
- Subtle count transition animation when the number changes in realtime (brief scale pulse or fade)
- When zero free: "No friends free right now"

**Start Plan CTA**
- Floating action button (FAB) in bottom-right corner
- Campfire orange (`#f97316`) circle/pill with "+" icon and "Start Plan" text label
- Tapping navigates to Plans tab (stub) — functional Quick Plan flow comes in Phase 4
- Consistent with Add Friend FAB pattern on friends list

**Caching & Refresh**
- Zustand cache: render immediately from cache on app open, revalidate from Supabase in background
- Pull-to-refresh available via FlatList `refreshControl`
- Supabase Realtime subscription on `statuses` table filtered to friend IDs
- Subscription cleanup on unmount

### Claude's Discretion
- Exact card padding and spacing within the grid
- Pull-to-refresh indicator styling
- FAB elevation/shadow
- Count transition animation implementation (React Native Animated or LayoutAnimation)
- Section header typography sizing
- Realtime subscription filter strategy (channel per friend vs single filtered channel)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOME-01 | Home screen shows friends with status "free", sorted by most recently updated | `get_free_friends()` RPC returns free friends ordered by `s.updated_at DESC`. `get_friends()` + statuses query covers non-free friends for the "Everyone Else" section. Zustand cache store enables immediate render before revalidation. |
| HOME-02 | Header displays "X friends free now" count | Count derived from `freeFriends.length` in component state. Animated `Animated.Value` scale pulse on count change, driven by `useEffect` watching `freeFriends.length`. |
| HOME-03 | Each friend card shows avatar, display name, and context tag emoji | `AvatarCircle` at 56px reused. Emoji tag overlaid using absolute-positioned `View` at bottom-right. `display_name` in `Text` with `numberOfLines={1}`. |
| HOME-04 | Home screen updates in realtime via Supabase subscription on statuses table | `supabase.channel()` with `.on('postgres_changes', { event: '*', schema: 'public', table: 'statuses', filter: 'user_id=in.(...)' })`. `statuses` table already has `REPLICA IDENTITY FULL` set. Cleanup on unmount via `supabase.removeChannel()`. |
| HOME-05 | "Start Plan" CTA button is prominently placed | FAB in bottom-right corner using absolute positioning + `useSafeAreaInsets()`. Navigates to Plans tab via `router.push('/(tabs)/plans')`. Campfire orange `#f97316`. |
</phase_requirements>

---

## Summary

Phase 3 is a pure UI/hook phase. All backend infrastructure is already in place: `get_free_friends()` and `get_friends()` RPCs, `statuses` table with `REPLICA IDENTITY FULL` for Realtime, and RLS policies that correctly scope data to friends only. No database changes or new packages are required.

The primary implementation challenge is the two-section layout inside a single `FlatList`. React Native's `FlatList` supports `numColumns` for grids, but section headers and heterogeneous sections require using `SectionList` or using `ListHeaderComponent` / `ListFooterComponent` on a flat data array with the sections pre-composed. The cleanest approach for this layout is to use a single `FlatList` with a composite `data` array (type-tagged items for section headers vs cards) or use the screen's outer `ScrollView` + two inner `FlatList`s with `scrollEnabled={false}`. Given project constraint ("FlatList for all lists"), the recommended pattern is a single vertical `ScrollView` wrapper (not a FlatList) for the overall scroll, with two `FlatList`s set to `scrollEnabled={false}` inside it — this avoids nested scroll conflicts while respecting the spirit of the constraint.

The Realtime subscription is the most nuanced piece. Supabase Realtime filtering using `filter: 'user_id=in.(...)'` requires the `statuses` table to have `REPLICA IDENTITY FULL` — this is already set in the migration (`ALTER TABLE public.statuses REPLICA IDENTITY FULL`). The subscription must be set up after friend IDs are loaded, and torn down on unmount. A single channel per home screen (not per friend) is the budget-conscious approach for the Supabase free tier.

**Primary recommendation:** Implement as one plan: create the `useHomeScreen` hook (Zustand cache + Realtime), then the `HomeFriendCard` component, then wire the `HomeScreen` screen replacing the Phase 2 placeholder. No new package installs needed.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | `^2.99.2` | `get_free_friends()` RPC, `get_friends()` RPC, Realtime subscription | Already installed; project constraint |
| `zustand` | `^5.0.12` | Home screen cache store (`useHomeStore`) | Already installed; project constraint; established pattern from `useAuthStore` |
| `expo-router` | `~55.0.5` | FAB navigation to Plans tab via `router.push` | Already installed |
| `react-native-safe-area-context` | `~5.6.2` | `useSafeAreaInsets()` for FAB bottom offset | Already installed |
| `@expo/vector-icons` | (bundled with Expo) | Ionicons for FAB "+" icon | Already installed (used in FriendsList FAB) |

### No New Packages Required
Phase 3 needs zero new npm installs. All libraries are already present.

---

## Architecture Patterns

### Recommended New File Structure

```
src/
├── app/(tabs)/
│   └── index.tsx              # REPLACE: full HomeScreen wired to useHomeScreen hook
├── screens/home/
│   └── HomeScreen.tsx         # NEW: main screen component (layout + sections)
├── components/home/
│   └── HomeFriendCard.tsx     # NEW: 56px avatar + display_name + emoji badge
├── hooks/
│   └── useHomeScreen.ts       # NEW: friends data, Realtime subscription, cache
└── stores/
    └── useHomeStore.ts        # NEW: Zustand cache for friends list (instant render)
```

### Pattern 1: Zustand Cache Store

Follow the exact pattern from `useAuthStore.ts`. The home store caches the friends list so the screen renders immediately on app open without a loading flash.

```typescript
// src/stores/useHomeStore.ts
import { create } from 'zustand';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface HomeState {
  friends: FriendWithStatus[];
  lastFetchedAt: number | null;
  setFriends: (friends: FriendWithStatus[]) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  friends: [],
  lastFetchedAt: null,
  setFriends: (friends) => set({ friends, lastFetchedAt: Date.now() }),
}));
```

**Why Zustand here (not component state only):** Zustand persists across tab navigations within the same session. When the user switches to Plans tab and back, the home screen re-mounts but renders instantly from the store instead of showing a loading spinner. Component state is reset on unmount.

### Pattern 2: useHomeScreen Hook

```typescript
// src/hooks/useHomeScreen.ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useHomeStore } from '@/stores/useHomeStore';
import type { FriendWithStatus } from '@/hooks/useFriends';

export function useHomeScreen() {
  const session = useAuthStore((s) => s.session);
  const { friends, setFriends } = useHomeStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function fetchAllFriends(): Promise<void> {
    if (!session?.user) return;

    // Two parallel queries: free friends (sorted by updated_at) + all friends for merge
    const [freeFriendsResult, allFriendsResult] = await Promise.all([
      supabase.rpc('get_free_friends'),
      supabase.rpc('get_friends'),
    ]);

    // Build merged list: free first (from get_free_friends), then rest from get_friends
    // with statuses joined. See Pattern 3 for full merge logic.
    // ...
    setFriends(merged);
  }

  function subscribeRealtime(friendIds: string[]): void {
    if (friendIds.length === 0) return;
    const filter = `user_id=in.(${friendIds.join(',')})`;

    channelRef.current = supabase
      .channel('home-statuses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'statuses', filter },
        (_payload) => {
          // Re-fetch on any status change — simpler than surgical patch
          fetchAllFriends();
        }
      )
      .subscribe();
  }

  useEffect(() => {
    fetchAllFriends();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [session?.user?.id]);

  // Wire up subscription after friends load
  // (done inside fetchAllFriends after setFriends)

  const freeFriends = friends.filter((f) => f.status === 'free');
  const otherFriends = friends.filter((f) => f.status !== 'free');

  return { friends, freeFriends, otherFriends, refresh: fetchAllFriends };
}
```

### Pattern 3: Full Friends Data With Status for "Everyone Else" Section

`get_free_friends()` covers the free section. For "Everyone Else", we need all friends with their current status. The existing pattern in `useFriends.fetchFriends()` already does this: call `get_friends()` RPC for profile data, then `.in('user_id', friendIds)` on the `statuses` table, then merge client-side. Reuse this exact pattern — no new DB queries.

```typescript
// Merging get_friends() + statuses table query
const { data: friendRows } = await supabase.rpc('get_friends');
const friendIds = (friendRows ?? []).map((r) => r.friend_id);

const { data: statuses } = await supabase
  .from('statuses')
  .select('user_id, status, context_tag, updated_at')
  .in('user_id', friendIds);

const statusMap = new Map(
  (statuses ?? []).map((s) => [s.user_id, s])
);

const allFriends: FriendWithStatus[] = (friendRows ?? []).map((r) => ({
  friend_id: r.friend_id,
  username: r.username ?? '',
  display_name: r.display_name,
  avatar_url: r.avatar_url,
  status: (statusMap.get(r.friend_id)?.status as StatusValue) ?? 'maybe',
  context_tag: (statusMap.get(r.friend_id)?.context_tag as EmojiTag) ?? null,
}));
```

Note: `get_free_friends()` already returns `status_updated_at` for sorting. Use this for the free section sort order. For "Everyone Else": sort Maybe before Busy (intentional — Maybe friends are closer to becoming available), then alphabetical within each group.

```typescript
const EVERYONE_ELSE_ORDER: Record<StatusValue, number> = {
  free: 0,   // won't appear here, but safe to include
  maybe: 1,
  busy: 2,
};

const otherFriends = allFriends
  .filter((f) => f.status !== 'free')
  .sort((a, b) => {
    const orderDiff = EVERYONE_ELSE_ORDER[a.status] - EVERYONE_ELSE_ORDER[b.status];
    if (orderDiff !== 0) return orderDiff;
    return a.display_name.localeCompare(b.display_name);
  });
```

### Pattern 4: Two-Section Layout with FlatList Constraint

The project requires FlatList for all lists. The cleanest solution for two heterogeneous grid sections is: outer `ScrollView` (not FlatList) for the page scroll, with two inner FlatLists with `scrollEnabled={false}`. This avoids VirtualizedList nesting warnings and nested scroll conflicts.

```typescript
// HomeScreen.tsx
<ScrollView
  style={styles.container}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.textSecondary} />
  }
>
  {/* Status toggle (already exists) */}
  <SegmentedControl ... />

  {/* Free Now section header */}
  <Text style={styles.freeHeading}>
    {freeFriends.length > 0 ? `${freeFriends.length} friends free now` : 'No friends free right now'}
  </Text>

  {/* Free friends grid */}
  {freeFriends.length > 0 && (
    <FlatList
      data={freeFriends}
      keyExtractor={(item) => item.friend_id}
      numColumns={3}
      scrollEnabled={false}
      renderItem={({ item }) => <HomeFriendCard friend={item} />}
    />
  )}

  {/* Everyone Else section (only if there are other friends) */}
  {otherFriends.length > 0 && (
    <>
      <Text style={styles.everyoneElseHeading}>Everyone Else</Text>
      <FlatList
        data={otherFriends}
        keyExtractor={(item) => item.friend_id}
        numColumns={3}
        scrollEnabled={false}
        renderItem={({ item }) => <HomeFriendCard friend={item} showStatusPill />}
      />
    </>
  )}
</ScrollView>
```

**Key `FlatList` prop when `numColumns` is set:** `key` on the `FlatList` itself must change if `numColumns` changes (not applicable here, but important to know). Also, `columnWrapperStyle` prop controls spacing between columns in a row.

### Pattern 5: HomeFriendCard with Emoji Badge Overlay

```typescript
// src/components/home/HomeFriendCard.tsx
interface HomeFriendCardProps {
  friend: FriendWithStatus;
  showStatusPill?: boolean;
}

export function HomeFriendCard({ friend, showStatusPill = false }: HomeFriendCardProps) {
  return (
    <View style={styles.card}>
      {/* Avatar with emoji overlay */}
      <View style={styles.avatarWrapper}>
        <AvatarCircle size={56} imageUri={friend.avatar_url} displayName={friend.display_name} />
        {friend.context_tag !== null && (
          <View style={styles.emojiTag}>
            <Text style={styles.emojiText}>{friend.context_tag}</Text>
          </View>
        )}
      </View>

      <Text style={styles.displayName} numberOfLines={1}>{friend.display_name}</Text>

      {showStatusPill && <StatusPill status={friend.status} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.secondary,  // #2a2a2a
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    margin: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  emojiTag: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    backgroundColor: COLORS.dominant,
    borderRadius: 8,
    padding: 1,
  },
  emojiText: {
    fontSize: 12,
  },
  displayName: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});
```

### Pattern 6: Count Animation (React Native Animated)

The heading count animates with a brief scale pulse when `freeFriends.length` changes. Use `Animated.sequence` to scale up then back to 1.

```typescript
// In HomeScreen.tsx
const countScale = useRef(new Animated.Value(1)).current;
const prevCountRef = useRef(freeFriends.length);

useEffect(() => {
  if (prevCountRef.current !== freeFriends.length) {
    prevCountRef.current = freeFriends.length;
    Animated.sequence([
      Animated.timing(countScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.timing(countScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }
}, [freeFriends.length]);

// In render:
<Animated.Text style={[styles.freeHeading, { transform: [{ scale: countScale }] }]}>
  {freeFriends.length > 0 ? `${freeFriends.length} friends free now` : 'No friends free right now'}
</Animated.Text>
```

`useNativeDriver: true` is safe here because only `transform` is animated (no layout properties).

### Pattern 7: Supabase Realtime Subscription (Single Filtered Channel)

```typescript
// Single channel for all friend status changes — budget-conscious (1 channel vs N channels)
// Source: Supabase Realtime docs — postgres_changes with filter
const filter = `user_id=in.(${friendIds.join(',')})`;

const channel = supabase
  .channel('home-statuses')
  .on(
    'postgres_changes',
    {
      event: '*',           // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'statuses',
      filter,               // Only receive changes for friend user_ids
    },
    (_payload) => {
      // Re-fetch all friends on any change — safe because get_friends() is cheap
      // and avoids complex surgical state patching
      fetchAllFriends();
    }
  )
  .subscribe();

// Cleanup on unmount
return () => { supabase.removeChannel(channel); };
```

**Critical prerequisite:** The `statuses` table must have `REPLICA IDENTITY FULL` for filter-based Realtime subscriptions to work. This is already set in `0001_init.sql`:
```sql
ALTER TABLE public.statuses REPLICA IDENTITY FULL;
```

**Free-tier note:** One channel = one concurrent Realtime connection. The free tier allows 200 concurrent connections. With up to 15 users per group, and one home screen open per user, this is well within budget.

### Pattern 8: FAB Navigation to Plans Tab

```typescript
// FAB in HomeScreen.tsx — same pattern as Add Friend FAB in FriendsList.tsx
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const router = useRouter();
const insets = useSafeAreaInsets();

<TouchableOpacity
  style={[styles.fab, { bottom: 24 + insets.bottom }]}
  onPress={() => router.push('/(tabs)/plans')}
  activeOpacity={0.8}
  accessibilityLabel="Start Plan"
>
  <Ionicons name="add" size={20} color={COLORS.dominant} />
  <Text style={styles.fabLabel}>Start Plan</Text>
</TouchableOpacity>

// styles.fab:
fab: {
  position: 'absolute',
  right: 24,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderRadius: 28,
  backgroundColor: COLORS.accent,  // #f97316
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
},
fabLabel: {
  color: COLORS.dominant,
  fontWeight: '600',
  fontSize: 15,
  marginLeft: 6,
},
```

### Anti-Patterns to Avoid

- **Storing non-free friends in the cache only:** Store all friends in the Zustand store. The split into `freeFriends` / `otherFriends` is computed at render time, not stored separately. This makes Realtime updates simpler — one `setFriends(merged)` call.
- **Setting up Realtime before fetching friend IDs:** The `filter: 'user_id=in.(...)'` requires the friend ID list. Set up subscription inside `fetchAllFriends()` after data loads, not on mount.
- **Nested FlatList with `scrollEnabled={true}`:** React Native throws VirtualizedList nesting warnings and scroll conflicts. Always `scrollEnabled={false}` on inner FlatLists.
- **`SELECT *` on statuses table:** Always specify `'user_id, status, context_tag, updated_at'`.
- **Forgetting `columnWrapperStyle` on grid FlatList:** Without it, grid cards have no horizontal spacing. Use `columnWrapperStyle={{ paddingHorizontal: 8 }}` or handle via card margin.
- **Not cleaning up the Realtime channel:** Leaks a WebSocket connection. Always return a cleanup function from `useEffect` that calls `supabase.removeChannel(channel)`.
- **Re-subscribing on every render:** Use `useRef` to hold the channel reference. Only subscribe once per mount.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status-filtered friend list | Custom SQL in RPC | `get_free_friends()` + `get_friends()` RPCs already in migration | Already handles auth scoping, free status filter, updated_at ordering |
| Realtime WebSocket connection management | Custom WebSocket or polling | `supabase.channel().on('postgres_changes')` | Handles reconnection, auth, message buffering automatically |
| Grid layout math | Custom absolute-position grid | `FlatList` with `numColumns={3}` | Handles row wrapping, re-render optimization, consistent column widths |
| Emoji badge position | Complex layout math | `position: 'absolute'` View child inside avatar wrapper View | Simplest positioning approach in React Native |
| Scroll + grid combination | Single FlatList with section logic | `ScrollView` wrapping two `scrollEnabled={false}` FlatLists | Avoids VirtualizedList-in-ScrollView warnings while respecting the "FlatList for all lists" constraint |

**Key insight:** The entire data layer (RPCs, RLS, Realtime-ready schema) was built for Phase 3 in Phase 1. This phase is nearly pure React Native UI work.

---

## Common Pitfalls

### Pitfall 1: Realtime Filter Requires REPLICA IDENTITY FULL

**What goes wrong:** Using `filter: 'user_id=in.(...)'` with a table that has the default `REPLICA IDENTITY DEFAULT` causes the Supabase Realtime filter to silently fail — events still arrive but without the filtered columns, so Supabase cannot apply the filter and drops the event or broadcasts unfiltered.

**Why it happens:** PostgreSQL's default replica identity only includes the primary key in the WAL. `REPLICA IDENTITY FULL` includes all columns.

**How to avoid:** Verify `ALTER TABLE public.statuses REPLICA IDENTITY FULL;` is present in the migration — it IS in `0001_init.sql` (Section 7). No migration change needed.

**Warning signs:** Realtime events not firing for friend status changes, or firing for all users (not just friends).

### Pitfall 2: `numColumns` + `key` prop on FlatList

**What goes wrong:** If `numColumns` is set to `3` and the component re-renders with a different `numColumns` value (shouldn't happen here, but possible with orientation changes), React Native throws an error: "Changing numColumns on the fly is not supported."

**How to avoid:** This is not an issue in Phase 3 since `numColumns={3}` is fixed. But if orientation support is ever added, add `key={\`grid-${numColumns}\`}` to the FlatList to force re-mount on change.

### Pitfall 3: VirtualizedList Inside ScrollView Warning

**What goes wrong:** Wrapping `FlatList` inside a `ScrollView` without `scrollEnabled={false}` triggers the React Native warning: "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation." This warning appears in dev but does not crash — however it indicates scroll performance issues and can cause the inner FlatList to not render correctly.

**How to avoid:** Always set `scrollEnabled={false}` on all inner FlatLists when they are children of a ScrollView.

### Pitfall 4: Realtime Subscription Set Up Before Friend IDs Are Known

**What goes wrong:** If the subscription is set up on component mount (before `fetchAllFriends` completes), `friendIds` is an empty array, making the filter `user_id=in.()` — an invalid filter that Supabase may reject or silently ignore.

**How to avoid:** Call `subscribeRealtime(friendIds)` from inside `fetchAllFriends()`, after the friend IDs are known. Or call it in a `useEffect` that depends on `friends.length > 0`.

### Pitfall 5: Channel Not Removed on Unmount

**What goes wrong:** The home screen component unmounts when the user navigates away. If `supabase.removeChannel(channel)` is not called, the WebSocket connection stays open, consuming one of the 200 free-tier concurrent connections per user session indefinitely.

**How to avoid:** Always return a cleanup function from the `useEffect` that manages the subscription:
```typescript
useEffect(() => {
  // ... subscribe
  return () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  };
}, []);
```

### Pitfall 6: `useNativeDriver: true` With Layout Properties

**What goes wrong:** Animating `width`, `height`, `top`, `left` or any layout property with `useNativeDriver: true` throws an error: "Style property 'width' is not supported by native animated module."

**How to avoid:** For the count scale animation, only animate `transform: [{ scale }]`. This is driver-safe. Never animate layout properties with `useNativeDriver: true`.

### Pitfall 7: Zustand Store Not Hydrating Correctly After Re-mount

**What goes wrong:** After navigating away and back to the home tab, the Zustand store retains stale data. If a friend's status changed while the user was away, the screen shows outdated data until the background fetch completes.

**How to avoid:** On component mount (inside `useEffect`), always call `fetchAllFriends()` to revalidate. The Zustand cache gives instant render; the fetch gives freshness. This is the stale-while-revalidate pattern by design.

---

## Code Examples

### Supabase Realtime — postgres_changes with filter

```typescript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes
const channel = supabase
  .channel('home-statuses')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'statuses',
      filter: `user_id=in.(${friendIds.join(',')})`,
    },
    (payload) => {
      // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      // payload.new: new row values (available because REPLICA IDENTITY FULL)
      // payload.old: old row values (available because REPLICA IDENTITY FULL)
      fetchAllFriends(); // Re-fetch to update sorted lists
    }
  )
  .subscribe((status) => {
    // status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'
  });
```

### get_free_friends() RPC Call

```typescript
// Source: supabase/migrations/0001_init.sql (Section 8)
// Returns: friend_id, username, display_name, avatar_url, status, context_tag, status_updated_at
// Already sorted by status_updated_at DESC
const { data: freeFriends, error } = await supabase.rpc('get_free_friends');
```

### FlatList Grid with numColumns

```typescript
// Source: React Native docs — FlatList
<FlatList
  data={freeFriends}
  keyExtractor={(item) => item.friend_id}
  numColumns={3}
  scrollEnabled={false}
  columnWrapperStyle={styles.row}
  renderItem={({ item }) => <HomeFriendCard friend={item} />}
/>

// styles.row:
row: {
  paddingHorizontal: 8,
  marginBottom: 8,
},
```

### RefreshControl on ScrollView

```typescript
// Source: React Native docs — RefreshControl
import { RefreshControl, ScrollView } from 'react-native';

const [refreshing, setRefreshing] = useState(false);

async function handleRefresh() {
  setRefreshing(true);
  await fetchAllFriends();
  setRefreshing(false);
}

<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={COLORS.textSecondary}
    />
  }
>
```

### Empty State (No Friends)

```typescript
// When friends.length === 0 — show warm onboarding state
<View style={styles.emptyContainer}>
  <Text style={styles.emptyEmoji}>🔥</Text>
  <Text style={styles.emptyHeading}>No friends yet</Text>
  <Text style={styles.emptyBody}>Add your first friends to see who's free!</Text>
  <PrimaryButton title="Add Friends" onPress={() => router.push('/friends/add')} />
</View>
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `supabase.from('statuses').on()` (v1 API) | `supabase.channel().on('postgres_changes')` | Supabase JS v2 uses channel-based Realtime API. Never use the v1 `.on()` pattern. |
| Polling interval for fresh data | Realtime + stale-while-revalidate | Realtime fires on change; mount-time fetch gives initial freshness without constant polling |
| `LayoutAnimation` for count change | `Animated.sequence` | `LayoutAnimation` is simpler but can cause flicker on Android; `Animated` is more predictable cross-platform for a scale pulse |

**Deprecated/outdated:**
- `supabase.from('table').on('*', callback).subscribe()`: Supabase JS v1 Realtime API — removed in v2. This project uses v2.99.2; use `supabase.channel()` API exclusively.

---

## Open Questions

1. **Realtime subscription when friend list changes**
   - What we know: The subscription filter is set once with the friend IDs at load time. If the user adds/removes a friend while the home screen is open, the subscription filter becomes stale.
   - What's unclear: How critical is this edge case for Phase 3? Adding a friend during active home screen session is an uncommon flow.
   - Recommendation: For Phase 3, refresh the subscription on each mount/re-validate cycle (tear down and re-subscribe inside `fetchAllFriends`). This handles the case without complex dynamic subscription management. The overhead of one channel re-subscription per fetch is negligible.

2. **FlatList `key` on re-render when data changes**
   - What we know: When Realtime fires and `freeFriends` array changes length, a grid FlatList with `numColumns={3}` may visually "jump" if items are removed from mid-list.
   - What's unclear: Visual polish of transitions when friends go free/not-free.
   - Recommendation: For Phase 3, simple re-render without animation. Smooth transitions are Phase 6 polish scope.

---

## Validation Architecture

### Test Framework

No test framework is configured in this project. Phase 3 validation follows manual smoke testing on physical device.

| Property | Value |
|----------|-------|
| Framework | None — no Jest/Vitest configured |
| Config file | None |
| Quick run command | `npx expo start` (manual test on device) |
| Full suite command | Manual smoke test checklist |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| HOME-01 | Home screen renders from Zustand cache immediately, then revalidates | manual | n/a | Navigate away and back; grid should appear without loading flash |
| HOME-01 | Free friends sorted by most-recently-updated | manual | n/a | Change status of two test users at different times; verify order |
| HOME-02 | Header shows "X friends free now" count | manual | n/a | Verify count matches number of visible free friend cards |
| HOME-02 | Count animates when number changes | manual | n/a | Trigger status change on another test device; watch header |
| HOME-03 | Each card shows avatar, display name, context tag emoji | manual | n/a | Use seed data users with avatars + tags set |
| HOME-04 | Status change appears without manual refresh | manual | n/a | On test device B, change status to Free; verify device A updates within seconds |
| HOME-04 | Subscription cleaned up on unmount | manual (dev tools) | n/a | Navigate away; verify no WebSocket leak in Supabase Realtime dashboard |
| HOME-05 | Start Plan FAB visible and navigates to Plans tab | manual | n/a | Tap FAB; verify Plans tab activates |

### Wave 0 Gaps
- None — no test infrastructure needed. Manual smoke testing is the appropriate validation method for this phase given no test framework exists in the project.

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0001_init.sql` — `get_free_friends()` RPC definition, `get_friends()` RPC, `REPLICA IDENTITY FULL` on statuses table, confirmed present and correct
- `src/hooks/useFriends.ts` — Existing `fetchFriends()` pattern: `get_friends()` RPC + statuses join + client-side sort; directly reusable for "Everyone Else" section
- `src/stores/useAuthStore.ts` — Zustand store pattern to follow for `useHomeStore`
- `src/screens/friends/FriendsList.tsx` — FAB pattern with `useSafeAreaInsets()` and `COLORS.accent`, directly reusable for Start Plan FAB
- `src/components/common/AvatarCircle.tsx` — `size` prop confirmed, supports `56` without changes
- `src/components/friends/StatusPill.tsx` — Reusable for "Everyone Else" cards with `showStatusPill` prop
- `src/constants/colors.ts` — All colours confirmed: `COLORS.accent` (#f97316), `COLORS.secondary` (#2a2a2a), `COLORS.dominant` (#1a1a1a)
- `package.json` — Confirmed all needed libraries are installed; no new packages required

### Secondary (MEDIUM confidence)
- [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) — `channel().on('postgres_changes')` API, filter syntax `user_id=in.(...)`, REPLICA IDENTITY requirement
- [React Native FlatList docs](https://reactnative.dev/docs/flatlist) — `numColumns`, `scrollEnabled`, `columnWrapperStyle`, `refreshControl` props

### Tertiary (LOW confidence — needs dev validation)
- ScrollView + scrollEnabled={false} FlatList pattern: widely documented community approach; validate that no VirtualizedList warnings appear in this specific Expo SDK 55 / React Native 0.83.2 combination

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed via package.json; no new installs needed
- Architecture: HIGH — patterns derived directly from existing code (FriendsList.tsx, useFriends.ts, useAuthStore.ts); minimal speculation
- Realtime: HIGH — REPLICA IDENTITY FULL confirmed in migration; Supabase JS v2 channel API confirmed in docs
- Pitfalls: HIGH — subscription cleanup, numColumns, nested scroll patterns are well-documented React Native behaviors
- Animation: MEDIUM — `Animated.sequence` with `useNativeDriver: true` is standard but count-change animation implementation detail is left to Claude's discretion

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable libraries; Supabase Realtime API changes slowly)
