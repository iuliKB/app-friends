# Phase 33: Friend Profile Redesign — Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 17 new + 4 modified = 21
**Analogs found:** 21 / 21 (every file has a direct in-repo analog)

> All references are file:line. Code excerpts are 5–15 lines and lifted verbatim from the repo so the planner / executor can copy without re-discovery. CONTEXT.md and UI-SPEC.md text that conflicts with reality (e.g. `surface.elevated`, migration `0025`, `queryKeys.friends.profile`) is corrected here using RESEARCH.md §Code-level Confirmations.

---

## Corrections (must override CONTEXT / UI-SPEC text)

| CONTEXT/UI-SPEC says | Reality (verified) | Source |
|----------------------|--------------------|--------|
| Migration `0025_add_profile_bio.sql` | Use **`0027_add_profile_bio.sql`** (0025 + 0026 already taken) | `ls supabase/migrations/` + 33-RESEARCH §Code-level Confirmations #1 |
| `surface.elevated` token | Maps to `colors.surface.card` (`surface.elevated` does not exist) | `src/theme/colors.ts`, `src/theme/light-colors.ts` + UI-SPEC §Surface mapping note |
| `queryKeys.friends.profile(friendId)` | Reuse existing `queryKeys.friends.detail(friendId)` (declared, currently unused) | `src/lib/queryKeys.ts:51` + 33-RESEARCH §Code-level Confirmations #9 |
| `useFriendProfile` returns flat object | Existing hooks return `{ data, isLoading, error, refetch }` from `useQuery` — match that shape, not a flattened destructure | `src/hooks/useFriendWishList.ts:137-144` |
| ErrorDisplay takes `heading`/`body`/`cta`/`onRetry` | Actual API: `{ message, technicalDetails?, mode?, onRetry? }` — CTA hard-coded as "Try Again" | `src/components/common/ErrorDisplay.tsx:6-11,65-67` |
| `subscribeHomeStatuses` cache slice keyed per-friend | Slice is `queryKeys.home.friends(userId)` (list, not per-friend) | `src/lib/realtimeBridge.ts:344-378` |
| Tap big avatar opens Phase 16 lightbox | Component is `ImageViewerModal` at `src/components/chat/ImageViewerModal.tsx` (NOT `GalleryViewerModal`) | 33-RESEARCH §Code-level Confirmations #2 |
| `AvatarCircle` needs new `size=140` variant | `size` prop is already `number`, defaults to 80, accepts any value | `src/components/common/AvatarCircle.tsx:6,42-46` |
| `useReducedMotion` mock | Already shipped in Phase 29.1-04 — no mock work needed | 33-RESEARCH §Test Framework |

---

## File Classification

### NEW Files (17)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `supabase/migrations/0027_add_profile_bio.sql` | migration | schema-DDL | `supabase/migrations/0013_cover_image_url.sql` | exact (single-column ADD COLUMN on existing table) |
| `src/hooks/useFriendProfile.ts` | hook | request-response (read) | `src/hooks/useStatus.ts` (hybrid Pattern 5 read) + `src/hooks/useFriendWishList.ts` (multi-step queryFn) | exact-blend |
| `src/hooks/useFriendMutuals.ts` | hook | request-response (multi-table aggregate) | `src/hooks/useExpensesWithFriend.ts` (multi-step caller↔friend intersection) | exact |
| `src/hooks/useUpdateMyBio.ts` | hook | mutation (CRUD-update, optimistic) | `src/hooks/useStatus.ts` setMutation (lines 159-230) | exact (canonical Pattern 5) |
| `src/hooks/__tests__/useFriendProfile.test.ts` | test | unit | `src/hooks/__tests__/useStatus.test.ts` | exact |
| `src/hooks/__tests__/useFriendMutuals.test.ts` | test | unit | `src/hooks/__tests__/useExpensesWithFriend.test.ts` | exact |
| `src/hooks/__tests__/useUpdateMyBio.test.ts` | test | unit | `src/hooks/__tests__/useStatus.test.ts` (mutation half) | exact |
| `src/components/friends/FriendProfileHeader.tsx` | component | scroll-driven animation | `src/screens/welcome/WelcomeScreen.tsx` (Reanimated v4 scroll handler stack) | exact |
| `src/components/friends/FriendProfileBlurredWash.tsx` | component | image-render with overlay | `src/components/squad/MemoriesTabContent.tsx` (expo-image + LinearGradient + cellGradient) | role-match |
| `src/components/friends/QuickActionsRow.tsx` | component | layout container | `src/app/profile/edit.tsx` card pattern + `src/components/home/HomeFriendCard.tsx` action handlers | role-match |
| `src/components/friends/ActionIconButton.tsx` | component | press-feedback button | `src/components/squad/bento/BentoCard.tsx` (Reanimated press-spring) + `src/components/home/HomeFriendCard.tsx` (Animated.spring press) | exact |
| `src/components/friends/GroupedInsetSection.tsx` | component | layout container | `src/app/profile/edit.tsx` "card" pattern (lines 118-123, 216-273) | exact |
| `src/components/friends/ProfileInfoRow.tsx` | component | row with leading icon | `src/components/squad/bento/BirthdayTile.tsx` (iconBubble + label) + `src/components/squad/MemoriesTabContent.tsx` sectionHeader (Pressable + chevron) | role-blend |
| `src/components/friends/BioRow.tsx` | component | row + expand-collapse | `src/components/squad/MemoriesTabContent.tsx` sectionHeader with chevron + numberOfLines pattern from `src/app/profile/edit.tsx` text input area | role-match |
| `src/components/friends/friendIconPalette.ts` | utility | constants | `src/components/squad/bento/tileAccents.ts` (semantic accent palette + ACCENT_FILL pattern) | exact |
| `src/app/friends/[id]/photos.tsx` (Photos quick-action route) | screen | request-response | `src/components/squad/MemoriesTabContent.tsx` filtered to `sharedPlanIds` | role-match |
| `src/app/friends/__tests__/[id].test.tsx` | test | unit (RTL render) | `src/hooks/__tests__/useFriends.test.ts` + RTL pattern used in existing screen tests | role-match |

### MODIFIED Files (4)

| File | Role | Data Flow | Self-Analog (current shape) | Migration |
|------|------|-----------|------------------------------|-----------|
| `src/app/friends/[id].tsx` | screen | request-response | Current: `useState + useEffect + supabase.from('profiles').select(...).single()` (lines 50-87) | Rewrite to mount `useFriendProfile` + `useFriendMutuals` + `useFriendWishList` |
| `src/app/profile/edit.tsx` | screen | mutation | Current: `display_name`/`birthday` row pattern (lines 216-273) | Add a 4th row inside same `card` View for `bio` TextInput |
| `src/components/common/AvatarCircle.tsx` | component | image render | Current: `{size, imageUri, displayName, onPress}` (lines 5-10) | Add optional `onLoad?: () => void` pass-through to inner `<Image>` |
| `src/lib/queryKeys.ts` | constant factory | — | Current: `friends.{all,list,detail,ofFriend,pendingRequests,wishList}` (lines 48-55) + `chat.{all,list,room,messages,members}` (lines 31-38) | Add `friends.mutuals(friendId)`, `friends.sharedPhotos(friendId)`, `chat.preferences(channelId)` |

---

## Pattern Assignments

### 1. `supabase/migrations/0027_add_profile_bio.sql` (migration)

**Analog:** `supabase/migrations/0013_cover_image_url.sql` (verbatim, 2 lines)

**Full file pattern** (`0013_cover_image_url.sql:1-2`):
```sql
-- Add optional cover image URL to plans (D-16)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS cover_image_url text;
```

**For Phase 33 produce:**
```sql
-- Phase 33 — Add nullable bio column to profiles (D-05).
-- No RLS change: profiles_select_authenticated covers SELECT for any auth'd user;
-- profiles_update_own covers owner UPDATE. No CHECK constraint — 160-char cap is
-- enforced client-side on /profile/edit (see RESEARCH §Recommendations).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
```

**Header pattern for longer migrations** (`0026_chat_todos_multi_scope.sql:1-29`) — use the `-- =================` banner + numbered rationale block ONLY if the migration grows past one ALTER. Single-column add does NOT need the banner.

---

### 2. `src/hooks/useFriendProfile.ts` (hook, request-response read)

**Primary analog:** `src/hooks/useStatus.ts` (hybrid useQuery + cache-slice read)
**Secondary analog:** `src/hooks/useFriendWishList.ts` (multi-step queryFn with intermediate joins)

**Imports pattern** (`useStatus.ts:22-33`):
```typescript
import { useEffect, useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
```

**Module-doc header pattern** (`useFriendWishList.ts:1-6`):
```typescript
// Phase 33 — Friend profile single-entity read (D-13).
// Single useQuery returning profile + friends-since + status. Opportunistically
// reads queryKeys.home.friends(myId) for status to share the slice that
// subscribeHomeStatuses already keeps fresh (D-15). Falls back to direct
// effective_status read when home cache is empty (deep-link entry).
// Public shape: { data, isLoading, error, refetch }.
```

**Session + key pattern** (`useFriendWishList.ts:33-37`):
```typescript
export function useFriendProfile(friendId: string) {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const key = queryKeys.friends.detail(friendId); // REUSE detail, not new profile key
```

**Multi-step queryFn pattern** (`useExpensesWithFriend.ts:36-72` — 3-step caller↔friend intersection):
```typescript
queryFn: async (): Promise<FriendProfileData | null> => {
  if (!userId) return null;

  // Step 1: profile row — RLS USING (true) returns row when id exists
  const profileRes = await (supabase as any)
    .from('profiles')
    .select('display_name, username, avatar_url, birthday_month, birthday_day, birthday_year, timezone, bio')
    .eq('id', friendId)
    .maybeSingle();

  // Step 2: friendships row (caller↔friend) — also surfaces friends-since
  const friendshipRes = await supabase
    .from('friendships')
    .select('created_at')
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`)
    .eq('status', 'accepted')
    .maybeSingle();

  // Step 3: status — opportunistic shared-slice read, direct fallback
  const homeStatuses = queryClient.getQueryData<StatusRow[]>(queryKeys.home.friends(userId));
  let statusRow = homeStatuses?.find((s) => s.user_id === friendId) ?? null;
  if (!statusRow) {
    const res = await supabase
      .from('effective_status')
      .select('user_id, effective_status, context_tag, status_expires_at, last_active_at')
      .eq('user_id', friendId)
      .maybeSingle();
    statusRow = (res.data as StatusRow | null) ?? null;
  }
  return { profile: profileRes.data, friendsSince: friendshipRes.data?.created_at ?? null, ...statusRow };
},
enabled: !!userId && !!friendId,
```

**`(supabase as any)` precedent for `bio` column** — same trick used in `src/hooks/usePoll.ts:60-65` for polls table (yet-to-be-codegen'd). Drop the cast at the read site, retain `supabase` typed at every other call.

**Return shape pattern** (`useFriendWishList.ts:137-144`):
```typescript
return {
  data: query.data ?? null,
  isLoading: query.isLoading,
  error: query.error ? (query.error as Error).message : null,
  refetch: query.refetch,
};
```

**Effective-status query body** (`useStatus.ts:124-128`) — verbatim shape (column list match):
```typescript
const { data, error } = await supabase
  .from('effective_status')
  .select('effective_status, context_tag, status_expires_at, last_active_at')
  .eq('user_id', userId)
  .maybeSingle();
```

---

### 3. `src/hooks/useFriendMutuals.ts` (hook, multi-table aggregate)

**Analog:** `src/hooks/useExpensesWithFriend.ts` — the gold-standard "caller-set ∩ friend-set" pattern (lines 40-71)

**Intersection pattern** (`useExpensesWithFriend.ts:40-58` — adapted to plan_members):
```typescript
// Step 1: caller's plan IDs
const { data: callerMemberships, error: callerErr } = await supabase
  .from('plan_members')
  .select('plan_id')
  .eq('user_id', userId);
if (callerErr) throw callerErr;
const callerPlanIds = (callerMemberships ?? []).map((m) => m.plan_id);
if (callerPlanIds.length === 0) return { mutualPlansCount: 0, mutualFriendsCount: 0, sharedPhotosCount: 0, sharedPlanIds: [] };

// Step 2: of those, ones friendId is also in
const { data: friendMemberships, error: friendErr } = await supabase
  .from('plan_members')
  .select('plan_id')
  .eq('user_id', friendId)
  .in('plan_id', callerPlanIds);
if (friendErr) throw friendErr;
const sharedPlanIds = (friendMemberships ?? []).map((m) => m.plan_id);
```

**Count-without-payload pattern** (33-RESEARCH §Technical Approach line 369):
```typescript
const photos = await supabase
  .from('plan_photos')
  .select('id', { count: 'exact', head: true })
  .in('plan_id', sharedPlanIds);
const sharedPhotosCount = photos.count ?? 0;
```

**Cache-read-with-fallback for mutual friends** (`useStatus.ts:124-128` analog + `useFriendsOfFriend.ts:31-34`):
```typescript
const myFriends = queryClient.getQueryData<FriendRow[]>(queryKeys.friends.list(userId));
const friendsOfFriend = queryClient.getQueryData<FriendOfFriend[]>(queryKeys.friends.ofFriend(friendId));
// Fallback: trigger fetch via the dedicated hooks if either cache is empty.
// Recommendation: read both from cache only — if cold, count renders 0 until
// the source hooks populate it. Simpler than wiring two extra await blocks.
```

**Key + enabled pattern** — uses NEW `queryKeys.friends.mutuals(friendId)`:
```typescript
const query = useQuery({
  queryKey: queryKeys.friends.mutuals(friendId),
  queryFn: async () => { /* steps above */ },
  enabled: !!userId && !!friendId,
});
```

---

### 4. `src/hooks/useUpdateMyBio.ts` (hook, mutation — canonical Pattern 5)

**Analog:** `src/hooks/useStatus.ts` setMutation (lines 159-230) — exact Pattern 5 with optimistic snapshot, rollback, settle-invalidate.

**Module-doc header** — must explain WHY this hook is bio-only (NOT a full profile mutation):
```typescript
// Phase 33 — Bio-only mutation (D-14). Scoped to a single column so the
// existing /profile/edit display_name + birthday raw write (lines 79-88) stays
// untouched (per Phase 31 "no scope creep" convention). Pattern 5 verbatim:
// optimistic flip on profiles.bio, rollback on error, invalidate on settle.
// mutationShape regression gate at src/hooks/__tests__/mutationShape.test.ts
// will pass without exemption.
```

**Canonical Pattern 5 shape** (`useStatus.ts:159-230` — copy the structure, change the table + payload):
```typescript
const mutation = useMutation({
  mutationFn: async (input: { bio: string | null }) => {
    if (!userId) throw new Error('Not authenticated');
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ bio: input.bio, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
    return input.bio;
  },
  onMutate: async (input) => {
    const key = queryKeys.friends.detail(userId ?? '');
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<FriendProfileData | null>(key);
    queryClient.setQueryData<FriendProfileData | null>(key, (old) =>
      old ? { ...old, profile: { ...old.profile, bio: input.bio } } : old,
    );
    return { previous };
  },
  onError: (_err, _input, ctx) => {
    if (ctx?.previous !== undefined) {
      queryClient.setQueryData(queryKeys.friends.detail(userId ?? ''), ctx.previous);
    }
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.friends.detail(userId ?? '') });
  },
});
```

**Public wrapper pattern** (`useStatus.ts:232-251` — `useCallback` exposing `{ error }` shape consistent with current `/profile/edit` handler):
```typescript
const updateBio = useCallback(
  async (bio: string | null): Promise<{ error: string | null }> => {
    if (!session) return { error: 'Not ready' };
    try {
      await mutation.mutateAsync({ bio });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'updateBio failed' };
    }
  },
  [session, mutation],
);

return { updateBio, saving: mutation.isPending };
```

**Required for mutationShape gate** (`src/hooks/__tests__/mutationShape.test.ts:19`): block MUST contain literal strings `mutationFn`, `onMutate`, `onError`, `onSettled`. The shape above has all four. Do NOT use exemption marker.

---

### 5. `src/hooks/__tests__/useFriendProfile.test.ts` (test, unit)

**Analog:** `src/hooks/__tests__/useStatus.test.ts` (lines 1-80) — same `@jest-environment jsdom` + `mockFrom` factory + `renderHook` shape.

**Header + mocks pattern** (`useStatus.test.ts:1-67`):
```typescript
/**
 * @jest-environment jsdom
 *
 * useFriendProfile test — Phase 33 (TanStack Query single-entity read).
 *  - Single useQuery keyed by queryKeys.friends.detail(friendId).
 *  - Multi-step queryFn (profile → friendships → status with cache fallback).
 *  - Friend-not-found case (friendships row missing) surfaces friendsSince:null.
 *
 * Run: npx jest --testPathPatterns="useFriendProfile" --no-coverage
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient } from '@/__mocks__/createTestQueryClient';
import { queryKeys } from '@/lib/queryKeys';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

import { useFriendProfile } from '../useFriendProfile';
```

**Mock factory for sequential `.from()` calls** (`useExpensesWithFriend.test.ts:37-60`):
```typescript
let call = 0;
mockFrom.mockImplementation((table: string) => {
  call++;
  if (call === 1 && table === 'profiles') {
    return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: PROFILE, error: null }) }) }) };
  }
  if (call === 2 && table === 'friendships') {
    return { select: () => ({ or: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { created_at: '2024-05-12' }, error: null }) }) }) }) };
  }
  if (call === 3 && table === 'effective_status') {
    return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: STATUS, error: null }) }) }) };
  }
});
```

---

### 6. `src/hooks/__tests__/useFriendMutuals.test.ts` (test, unit)

**Analog:** `src/hooks/__tests__/useExpensesWithFriend.test.ts:1-60` (multi-step caller-friend intersection test). Same `let call = 0` factory; assert the final `mutualPlansCount`/`mutualFriendsCount`/`sharedPhotosCount` triple.

---

### 7. `src/hooks/__tests__/useUpdateMyBio.test.ts` (test, unit)

**Analog:** `src/hooks/__tests__/useStatus.test.ts` (mutation half — setStatus assertions). Assert:
- `onMutate` writes optimistic value into `queryKeys.friends.detail(myId)`.
- `onError` restores previous value from `ctx.previous`.
- `onSettled` invalidates the same key.
- Block contains literal `mutationFn`/`onMutate`/`onError`/`onSettled` (so mutationShape gate passes).

---

### 8. `src/components/friends/FriendProfileHeader.tsx` (component, scroll-driven animation)

**Analog:** `src/screens/welcome/WelcomeScreen.tsx` — same Reanimated v4 stack (`useSharedValue` + `useAnimatedScrollHandler` + `useAnimatedStyle` + `interpolate` + `Extrapolation.CLAMP` + `useReducedMotion`).

**Imports pattern** (`WelcomeScreen.tsx:1-15`):
```typescript
import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
```

**Shared-value + scroll-handler pattern** (`WelcomeScreen.tsx:53-63`):
```typescript
const { colors } = useTheme();
const reducedMotion = useReducedMotion();
const scrollX = useSharedValue(0); // for FriendProfileHeader: rename to scrollY

const scrollHandler = useAnimatedScrollHandler({
  onScroll: (e) => {
    scrollX.value = e.contentOffset.x; // for FriendProfileHeader: e.contentOffset.y
  },
});
```

**Reduced-motion-aware animated style pattern** (`WelcomeScreen.tsx:270-287`) — the canonical short-circuit:
```typescript
const animated = useAnimatedStyle(() => {
  if (reducedMotion) {
    // static collapsed values
    return { transform: [{ scale: COLLAPSED_SCALE }], opacity: 0 };
  }
  const scale = interpolate(scrollY.value, [0, 160], [1, COLLAPSED_SCALE], Extrapolation.CLAMP);
  const opacity = interpolate(scrollY.value, [0, 120, 160], [1, 1, 0], Extrapolation.CLAMP);
  return { transform: [{ scale }], opacity };
}, [reducedMotion]);
```

**Theme + StyleSheet.create + useMemo pattern** (`WelcomeScreen.tsx:91-94` — required by v1.6 hard constraint):
```typescript
const styles = useMemo(
  () =>
    StyleSheet.create({
      root: { flex: 1 },
      // ... etc — no raw numbers, all SPACING/FONT_SIZE/RADII tokens
    }),
  [colors]
);
```

**Const block for non-token dimensions** (mandated by UI-SPEC §Spacing Scale):
```typescript
// Header layout constants — not SPACING tokens (UI-SPEC justifies as locked exceptions).
const BIG_AVATAR_SIZE = 140;
const COLLAPSED_AVATAR_SIZE = 32;
const HEADER_HEIGHT = 280;
const COLLAPSE_END = HEADER_HEIGHT - 120; // 160 — anchor for interpolate ranges
const WASH_FADE_END = HEADER_HEIGHT - 60; // 220
```

---

### 9. `src/components/friends/FriendProfileBlurredWash.tsx` (component, image render)

**Analog:** `src/components/squad/MemoriesTabContent.tsx` — same `Image` from `expo-image` + `LinearGradient` from `expo-linear-gradient` import pair (lines 13-15).

**Imports pattern** (`MemoriesTabContent.tsx:13-15`):
```typescript
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
```

**Image-with-blur pattern** (UI-SPEC §Blurred-Avatar Wash + `expo-image` native API):
```typescript
{avatarUrl ? (
  <Image
    source={{ uri: avatarUrl }}
    style={StyleSheet.absoluteFill}
    blurRadius={40}
    contentFit="cover"
    onLoad={() => setWashReady(true)}
  />
) : (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface.card }]} />
)}
```

**LinearGradient overlay pattern** (`MemoriesTabContent.tsx:217-223` — cellGradient bottom-fade):
```typescript
cellGradient: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: '45%',
},
// inside render:
<LinearGradient
  colors={['transparent', 'rgba(0,0,0,0.6)']}
  style={styles.cellGradient}
/>
```

Phase 33 variant — UI-SPEC §Blurred-Avatar Wash gradient stops:
```typescript
<LinearGradient
  colors={[washTopColor, washBottomColor]} // 0.35 → 0.95 alpha over surface.base
  locations={[0, 1]}
  style={StyleSheet.absoluteFill}
/>
```

**Cross-fade on load** — pattern from UI-SPEC §Cross-fade + `ANIMATION.duration.normal`:
```typescript
const opacity = useSharedValue(0);
useEffect(() => {
  if (washReady) opacity.value = withTiming(1, { duration: ANIMATION.duration.normal });
}, [washReady]);
```

---

### 10. `src/components/friends/QuickActionsRow.tsx` (component, layout container)

**Analog (layout):** Horizontal `View` with `gap: SPACING.md` — no exact precedent for a 4-button row, but the closest visual + ergonomic match is the way `src/app/profile/edit.tsx` lays out fields inside a card with consistent gaps (lines 116-133).

**Analog (handlers):** `src/components/home/HomeFriendCard.tsx:114-136` for the "tap → openChat", "long-press → showActionSheet" pair.

**openChat call pattern** (`HomeFriendCard.tsx:114-120` — exact shape required for the Message button):
```typescript
async function handlePress() {
  await openChat(router, {
    kind: 'dmFriend',
    friendId: friend.friend_id,
    friendName: friend.display_name,
  });
}
```

**showActionSheet call pattern** (`HomeFriendCard.tsx:122-136`):
```typescript
function handleLongPress() {
  const firstName = friend.display_name.split(' ')[0];
  showActionSheet(friend.display_name, [
    {
      label: 'View profile',
      onPress: () => router.push(`/friends/${friend.friend_id}` as never),
    },
    {
      label: `Plan with ${firstName}...`,
      onPress: () => router.push(`/plan-create?preselect_friend_id=${friend.friend_id}` as never),
    },
  ]);
}
```

**Phase 33 More menu** — single destructive item (33-RESEARCH §Remove Friend):
```typescript
showActionSheet(profile.display_name, [
  { label: 'Remove Friend', destructive: true, onPress: handleConfirmRemove },
]);
// helper auto-appends Cancel — do NOT include it (src/lib/action-sheet.ts:13-14)
```

**Mute upsert pattern** (`src/screens/chat/ChatListScreen.tsx:120-123` — verbatim):
```typescript
await supabase.from('chat_preferences').upsert(
  { user_id: userId, chat_type: 'dm', chat_id: dmChannelId, is_muted: nextMuted, updated_at: new Date().toISOString() },
  { onConflict: 'user_id,chat_type,chat_id' },
);
```

---

### 11. `src/components/friends/ActionIconButton.tsx` (component, press-feedback button)

**Analog (press-spring):** `src/components/squad/bento/BentoCard.tsx` — Reanimated v4 `useSharedValue` + `withSpring` press scale (lines 41-100).

**Reanimated press-spring pattern** (`BentoCard.tsx:30-47, 92-100`):
```typescript
const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.5 };
const PRESS_SCALE = 0.97; // Phase 33 may pick 0.96 per UI-SPEC §Quick-Action Buttons

const scale = useSharedValue(1);
const reduceMotion = useReducedMotion();

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

const handlePressIn = () => {
  if (!reduceMotion) {
    scale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
const handlePressOut = () => {
  scale.value = withSpring(1, PRESS_SPRING);
};
```

**Pressable + hitSlop pattern** — UI-SPEC §Quick-Action Buttons (44pt floor):
```typescript
<Pressable
  onPress={onPress}
  onPressIn={handlePressIn}
  onPressOut={handlePressOut}
  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
  accessibilityRole="button"
  accessibilityLabel={accessibilityLabel}
  style={styles.pressable}
>
```

**Icon-bubble + label-below pattern** (`src/components/squad/bento/BirthdayTile.tsx:21-46` — 28pt round icon bubble; Phase 33 scales to 48pt):
```typescript
iconBubble: {
  width: 28, height: 28,                  // → 48pt for ActionIconButton
  borderRadius: RADII.full,
  alignItems: 'center', justifyContent: 'center',
  backgroundColor: TILE_ACCENTS.birthday + ACCENT_FILL, // tinted bg
},
// inside render:
<View style={styles.iconBubble}>
  <Ionicons name="gift-outline" size={16} color={TILE_ACCENTS.birthday} />
</View>
```

---

### 12. `src/components/friends/GroupedInsetSection.tsx` (component, layout container)

**Analog:** `src/app/profile/edit.tsx` — the existing "card" pattern, which IS the Telegram-style grouped inset (lines 116-123).

**Card pattern** (`profile/edit.tsx:117-123` — verbatim):
```typescript
card: {
  backgroundColor: colors.surface.card,
  borderRadius: RADII.lg,
  overflow: 'hidden',
  marginTop: SPACING.lg,
},
```

**Section-title (small caps) pattern** (`src/screens/chat/ChatListScreen.tsx:200-214`):
```typescript
sectionHeader: {
  paddingHorizontal: SPACING.lg,
  paddingTop: SPACING.md,
  paddingBottom: SPACING.xs,
  backgroundColor: colors.surface.base,
},
sectionTitle: {
  fontSize: FONT_SIZE.xs,
  fontFamily: FONT_FAMILY.body.semibold,
  color: colors.text.secondary,
  // eslint-disable-next-line campfire/no-hardcoded-styles
  textTransform: 'uppercase',
  // eslint-disable-next-line campfire/no-hardcoded-styles
  letterSpacing: 0.8, // UI-SPEC §Typography mandates 0.5 — change value, keep disable comments
},
```

**Hairline separator pattern** (`profile/edit.tsx:160-164`):
```typescript
divider: {
  height: StyleSheet.hairlineWidth,
  backgroundColor: colors.border,
  marginLeft: SPACING.md, // Phase 33 use larger offset to align under label, not icon
},
```

---

### 13. `src/components/friends/ProfileInfoRow.tsx` (component, row with leading icon)

**Analog (icon-bubble structure):** `src/components/squad/bento/BirthdayTile.tsx:21-46, 97-100` — round tinted icon bubble with Ionicon glyph.

**Analog (row + chevron + Pressable):** `src/components/squad/MemoriesTabContent.tsx:304-320` — Pressable row with `accessibilityRole="button"`, `accessibilityLabel`, content + chevron.

**Row press-state pattern** (`MemoriesTabContent.tsx:304-310`):
```typescript
<Pressable
  onPress={() => router.push(`/plans/${section.planId}` as never)}
  style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.7 }]}
  accessibilityRole="button"
  accessibilityLabel={`Open plan ${section.title}`}
>
```

Phase 33 UI-SPEC mandates `surface.overlay` flash instead of opacity dim — use:
```typescript
style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface.overlay }]}
```

**Chevron pattern** (`MemoriesTabContent.tsx:320`):
```typescript
<Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
// UI-SPEC says size={16} for row chevron — adjust accordingly
```

**Icon-bubble with semantic tint** (`BirthdayTile.tsx:23-30, 97-100` + `tileAccents.ts:6-15` + `tileAccents.ts:17` for ACCENT_FILL):
```typescript
iconBubble: {
  width: 32, height: 32,        // Phase 33 uses 32 (ROW_ICON_SIZE), bento uses 28
  borderRadius: RADII.full,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: TILE_ACCENTS.birthday + ACCENT_FILL,  // "#F472B6" + "1F" = 12% alpha
},
// render:
<View style={styles.iconBubble}>
  <Ionicons name="gift-outline" size={18} color={TILE_ACCENTS.birthday} />
</View>
```

For Phase 33's 8-tone palette, copy `tileAccents.ts` shape into `friendIconPalette.ts` (next file).

---

### 14. `src/components/friends/BioRow.tsx` (component, row + expand-collapse)

**Analog (numberOfLines collapse + tap-to-expand):** No exact in-repo analog; UI-SPEC mandates `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` BEFORE `setState` (Phase 29.1 Pitfall 9). The closest structural analog remains `ProfileInfoRow` for the icon + label layout, then add a full-width `<Text numberOfLines={collapsed ? 3 : undefined}>{bio}</Text>` below.

**Bio expand-collapse pattern:**
```typescript
const [expanded, setExpanded] = useState(false);
const [isTruncated, setIsTruncated] = useState(false);

function handleToggle() {
  if (!isTruncated) return; // only tappable when overflowing
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpanded((e) => !e);
}

// in render:
<Text
  numberOfLines={expanded ? undefined : 3}
  onTextLayout={(e) => setIsTruncated(e.nativeEvent.lines.length >= 3)}
  style={styles.bioBody}
>
  {bio}
</Text>
```

---

### 15. `src/components/friends/friendIconPalette.ts` (utility, constants)

**Analog:** `src/components/squad/bento/tileAccents.ts` — verbatim shape, just a different palette and a `getIconPalette(tint, colors)` accessor for light/dark switching.

**Full analog file** (`tileAccents.ts:1-21`):
```typescript
// Semantic accent palette for Activity bento tiles.
// Each tool owns a color so the grid reads chromatically — money is money,
// birthdays are birthdays. Tints (10-20% alpha) sit nicely on surface.card
// (#1D2027) without competing with the brand neon-green #B9FF3B.

export const TILE_ACCENTS = {
  iouPositive: '#4ADE80',
  iouNegative: '#F87171',
  birthday: '#F472B6',
  // ... etc
  neutral: '#B9FF3B',
} as const;

export const ACCENT_FILL = '1F';   // 12% opacity hex suffix
export const ACCENT_BORDER = '33'; // 20% opacity hex suffix
```

**For Phase 33** — produce equivalent for the 8 leading-icon tints listed in UI-SPEC §Leading-Icon Palette (Bio, FriendsSince, Birthday, Timezone, MutualPlans, MutualFriends, SharedPhotos, IOU). UI-SPEC gives different alpha values per row (15-20%) and explicit Light vs Dark hex pairs — the helper should accept the `colors` object (from `useTheme()`) and return `{ bg, glyph }` per tint enum.

---

### 16. `src/app/friends/[id]/photos.tsx` (screen, Photos quick-action)

**Analog:** `src/components/squad/MemoriesTabContent.tsx` (filtered photo grid). Filter to `sharedPlanIds` from `useFriendMutuals(friendId)`. Reuse `useAllPlanPhotos()` and filter its `groups` array on screen.

**Filter pattern** (Phase 33 specific):
```typescript
const { groups, isLoading, error, refetch } = useAllPlanPhotos();
const { data: mutuals } = useFriendMutuals(friendId);
const sharedSet = new Set(mutuals?.sharedPlanIds ?? []);
const filteredGroups = groups.filter((g) => sharedSet.has(g.planId));
```

**Loading + error + empty states** — copy verbatim from `MemoriesTabContent.tsx:246-275`:
```typescript
if (isLoading && groups.length === 0) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.interactive.accent} />
    </View>
  );
}
if (error) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
      <ErrorDisplay mode="screen" message="Couldn't load shared photos." onRetry={refetch} />
    </View>
  );
}
```

---

### 17. `src/app/friends/[id].tsx` (screen, MODIFIED — full rewrite)

**Self-analog (current shape to REPLACE):** Lines 50-87 (inline `useState + useEffect + Promise.all` fetch) → `useFriendProfile(id)`.

**Pattern: imports** — analog `src/app/profile/edit.tsx:1-22` (already uses theme tokens, expo-router patterns, supabase, useAuthStore). Add Reanimated v4 imports per `WelcomeScreen.tsx:3-11` for the scroll-driven header.

**Animated.ScrollView pattern** (UI-SPEC §Reanimated Implementation Notes line 643):
```typescript
import Animated from 'react-native-reanimated';
// inside component:
const scrollY = useSharedValue(0);
const scrollHandler = useAnimatedScrollHandler({
  onScroll: (e) => { scrollY.value = e.contentOffset.y; },
});
// in render:
<Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
  <FriendProfileHeader scrollY={scrollY} profile={profile} status={status} />
  <QuickActionsRow ... />
  <GroupedInsetSection title="INFO"> ... </GroupedInsetSection>
  <GroupedInsetSection title="MUTUAL"> ... </GroupedInsetSection>
  <GroupedInsetSection title="WISH LIST"> ... </GroupedInsetSection>
</Animated.ScrollView>
```

**Stack.Screen with animated headerTitle** (UI-SPEC §Stack Screen Header):
```typescript
<Stack.Screen
  options={{
    title: profile?.display_name ?? '',
    headerTransparent: true,
    headerTitle: () => <AnimatedNavTitle scrollY={scrollY} displayName={profile?.display_name ?? ''} />,
  }}
/>
```
Pattern: `<Stack.Screen options={{ title }} />` is already used at `src/app/friends/[id].tsx:230` — extend it; do not replace the import.

**Remove Friend mutation pattern** — see 33-RESEARCH §Technical Approach lines 395-419. Pattern 5 Bio mutation analog applies — same `mutationFn + onMutate + onError + onSettled` shape.

**ImageViewerModal usage pattern** (`src/screens/chat/ChatRoomScreen.tsx:578` — existing consumer):
```typescript
const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
// in render:
<ImageViewerModal
  visible={avatarViewerOpen}
  imageUrl={profile?.avatar_url ?? null}
  onClose={() => setAvatarViewerOpen(false)}
/>
```

**Friend-not-found inline state** (33-RESEARCH §Recommendations — NOT ErrorDisplay; ~15 LOC custom):
```typescript
if (!isLoading && data && data.friendsSince === null) {
  return (
    <View style={styles.notFound}>
      <Ionicons name="people-outline" size={48} color={colors.text.secondary} />
      <Text style={styles.notFoundHeading}>No longer friends</Text>
      <Text style={styles.notFoundBody}>This person isn't in your friends list anymore.</Text>
      <PrimaryButton title="Back to friends" onPress={() => router.back()} />
    </View>
  );
}
```

---

### 18. `src/app/profile/edit.tsx` (screen, MODIFIED — add bio field)

**Self-analog:** existing display-name row pattern (lines 217-235) — copy structure verbatim for bio.

**State slots pattern** (`profile/edit.tsx:29-39`):
```typescript
const [displayName, setDisplayName] = useState('');
const [originalDisplayName, setOriginalDisplayName] = useState('');
// add:
const [bio, setBio] = useState('');
const [originalBio, setOriginalBio] = useState('');
```

**Hydrate pattern** (`profile/edit.tsx:41-62`) — extend `.select(...)`:
```typescript
.select('display_name, avatar_url, birthday_month, birthday_day, birthday_year, username, bio')
// then:
setBio(data.bio ?? '');
setOriginalBio(data.bio ?? '');
```

**Field row + char counter pattern** (`profile/edit.tsx:217-235` — verbatim shape, change icon + maxLength + placeholder):
```typescript
<View style={styles.fieldLabelRow}>
  <View style={styles.fieldLabelLeft}>
    <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.text.secondary} />
    <Text style={styles.fieldLabel}>Bio</Text>
  </View>
  <Text style={styles.charCountInline}>{bio.length}/160</Text>
</View>
<TextInput
  style={[styles.textInput, saving && styles.inputDisabled]}
  value={bio}
  onChangeText={setBio}
  placeholder="A short something about you"
  placeholderTextColor={colors.text.secondary}
  maxLength={160}
  multiline
  editable={!saving}
/>
```

**isDirty + canSave wiring pattern** (`profile/edit.tsx:99-104`) — extend:
```typescript
const isDirty =
  displayName.trim() !== originalDisplayName ||
  birthdayMonth !== originalBirthdayMonth ||
  birthdayDay !== originalBirthdayDay ||
  birthdayYear !== originalBirthdayYear ||
  bio.trim() !== originalBio;
```

**Save: prefer new `useUpdateMyBio` mutation hook** (`useStatus.ts:232-251` pattern) so the bio write goes through Pattern 5 + the mutationShape gate. The existing `display_name + birthday` raw write (lines 79-88) stays untouched per 33-RESEARCH §Open Q #2.

---

### 19. `src/components/common/AvatarCircle.tsx` (component, MODIFIED — add onLoad pass-through)

**Self-analog:** current props (lines 5-10) + current `<Image>` render (line 51).

**Minimal delta** — non-breaking prop add:
```typescript
interface AvatarCircleProps {
  size?: number;
  imageUri?: string | null;
  displayName: string;
  onPress?: () => void;
  onLoad?: () => void;       // NEW — forwarded to inner <Image>
}

// inside render — line 51 modified:
<Image
  source={{ uri: imageUri }}
  style={[styles.image, circleStyle]}
  resizeMode="cover"
  onLoad={onLoad}            // NEW
/>
```

No other change. Test: extend existing `AvatarCircle.test.tsx` if it exists, otherwise skip (33-RESEARCH says no new test required for a single non-breaking prop).

---

### 20. `src/lib/queryKeys.ts` (constant factory, MODIFIED — add 3 keys)

**Self-analog:** existing `friends` block (lines 48-55) and existing `chat` block (lines 31-38).

**Add to `friends` block** (after line 54, before closing `}`):
```typescript
friends: {
  all: () => ['friends'] as const,
  list: (userId: string) => [...queryKeys.friends.all(), 'list', userId] as const,
  detail: (friendId: string) => [...queryKeys.friends.all(), 'detail', friendId] as const,
  ofFriend: (friendId: string) => [...queryKeys.friends.all(), 'ofFriend', friendId] as const,
  pendingRequests: (userId: string) => [...queryKeys.friends.all(), 'pendingRequests', userId] as const,
  wishList: (userId: string) => [...queryKeys.friends.all(), 'wishList', userId] as const,
  mutuals: (friendId: string) => [...queryKeys.friends.all(), 'mutuals', friendId] as const,         // NEW Phase 33
  sharedPhotos: (friendId: string) => [...queryKeys.friends.all(), 'sharedPhotos', friendId] as const, // NEW Phase 33
},
```

**Add to `chat` block** (after line 37, before closing `}`):
```typescript
chat: {
  all: () => ['chat'] as const,
  list: (userId: string) => [...queryKeys.chat.all(), 'list', userId] as const,
  room: (channelId: string) => [...queryKeys.chat.all(), 'room', channelId] as const,
  messages: (channelId: string, opts: { before?: string } = {}) =>
    [...queryKeys.chat.room(channelId), 'messages', opts] as const,
  members: (channelId: string) => [...queryKeys.chat.room(channelId), 'members'] as const,
  preferences: (channelId: string) => [...queryKeys.chat.all(), 'preferences', channelId] as const,  // NEW Phase 33 (Mute lookup)
},
```

---

## Shared Patterns (apply across all relevant files)

### S-1. Theme + StyleSheet inside useMemo([colors])

**Source:** v1.6 hard constraint. Every component in `src/components/friends/` AND the rewritten `src/app/friends/[id].tsx`.
**Example:** `src/components/common/AvatarCircle.tsx:23-40`

```typescript
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

export function MyComponent() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      paddingHorizontal: SPACING.lg,
    },
  }), [colors]);
  // ...
}
```

**Apply to:** every new component this phase. NO raw numbers (ESLint guard `campfire/no-hardcoded-styles` v1.1 inherits).

**Allowed exceptions** (require `// eslint-disable-next-line campfire/no-hardcoded-styles` comment with reason):
- `letterSpacing: 0.5` on small-caps titles (UI-SPEC §Typography mandates 0.5; pattern at `ChatListScreen.tsx:213`)
- Named-constant pixel values (`BIG_AVATAR_SIZE = 140`, `HEADER_HEIGHT = 280`, `ROW_ICON_SIZE = 32`) — UI-SPEC §Spacing Scale §Exceptions justifies these.

### S-2. TanStack Query Pattern 5 (canonical mutation shape)

**Source:** `src/hooks/useStatus.ts:159-230` + mutationShape gate at `src/hooks/__tests__/mutationShape.test.ts:18-19`.
**Apply to:** `useUpdateMyBio`, the Remove Friend mutation (if extracted into hook OR inline inside `[id].tsx`).
**Required members:** `mutationFn`, `onMutate`, `onError`, `onSettled` — all four literal strings must appear in the block.

Excerpt: see §4 above.

### S-3. Auth gate pattern (`useAuthStore` + `userId ?? null` + `enabled: !!userId`)

**Source:** `src/hooks/useFriendWishList.ts:33-37, 108` — every hook uses this exact gate.
**Apply to:** `useFriendProfile`, `useFriendMutuals`, `useUpdateMyBio`.

```typescript
const session = useAuthStore((s) => s.session);
const userId = session?.user?.id ?? null;
// ...
useQuery({ queryKey: ..., queryFn: ..., enabled: !!userId && !!friendId });
```

### S-4. `(supabase as any)` cast for un-codegen'd columns

**Source:** `src/hooks/usePoll.ts:60-65` + 33-RESEARCH §Phase 32 polls precedent.
**Apply to:** every read/write of `profiles.bio` in this phase (until `src/types/database.ts` is regenerated in a future codegen pass).

```typescript
const profileRes = await (supabase as any)
  .from('profiles')
  .select('display_name, ..., bio')
  .eq('id', friendId)
  .maybeSingle();
```

### S-5. `useReducedMotion()` short-circuit

**Source:** `src/screens/welcome/WelcomeScreen.tsx:54, 270-287` + `src/components/squad/bento/BentoCard.tsx:42, 93`.
**Apply to:** `FriendProfileHeader`, `ActionIconButton`, `FriendProfileBlurredWash`, any new animated component.
**Pattern:** check `reducedMotion` at the top of each `useAnimatedStyle` and at every `withSpring`/`withTiming` call; short-circuit to static values when `true`.

### S-6. Haptics policy (`expo-haptics`)

**Source:** `src/components/squad/bento/BentoCard.tsx:17, 96` + `src/screens/welcome/WelcomeScreen.tsx:14, 69-72, 84-86`.
**Apply to:** QuickActionsRow buttons per UI-SPEC §Header Collapse Animation Contract §Haptic Policy table.
**Pattern:**
```typescript
import * as Haptics from 'expo-haptics';
// inside handler:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
// for selection toggle:
Haptics.selectionAsync().catch(() => {});
// for destructive confirm:
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
```
Skip ALL haptics when `useReducedMotion() === true`.

### S-7. Ionicons by `@expo/vector-icons`

**Source:** `src/components/squad/bento/BirthdayTile.tsx:3,99` + `src/components/squad/MemoriesTabContent.tsx:14,320`.
**Apply to:** every new icon glyph in this phase (leading row icons, quick-action icons, chevron, More overflow).
```typescript
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
```

### S-8. Test scaffolding (jsdom + mockFrom factory)

**Source:** `src/hooks/__tests__/useStatus.test.ts:1-77` + `src/hooks/__tests__/useExpensesWithFriend.test.ts:1-60`.
**Apply to:** every new hook test in this phase.
**Pattern:** `@jest-environment jsdom`, `mockFrom = jest.fn()` factory, `useAuthStore` mock with selector + `getState`, `createTestQueryClient` from `@/__mocks__/createTestQueryClient`, `renderHook + waitFor` from `@testing-library/react-native`.

---

## No Analog Found

**None.** Every file this phase introduces has a direct in-repo analog. The pattern coverage is complete.

The one structural novelty — the `Telegram-style collapsing header animation` — has a strong analog (`WelcomeScreen.tsx`) that uses the exact same Reanimated v4 primitives (`useAnimatedScrollHandler`, `interpolate`, `Extrapolation.CLAMP`, `useReducedMotion`). The pattern transfers cleanly; only the interpolation ranges and the Stack.Screen render-prop wiring are net-new (and are fully spec'd in UI-SPEC §Header Collapse Animation Contract).

---

## Metadata

**Analog search scope:**
- `src/hooks/**` (40 files scanned)
- `src/components/**` (all subdirs: common/, friends/, home/, chat/, squad/, plans/, squad/bento/)
- `src/screens/**` (auth/, chat/, plans/, welcome/)
- `src/app/**` (friends/, profile/, chat/)
- `src/lib/**` (action-sheet, openChat, queryKeys, realtimeBridge, supabase)
- `supabase/migrations/**` (0001-0026)

**Files scanned for analog selection:** ~90 source files + 21 test files + 26 migrations.

**Pattern extraction date:** 2026-05-13.

**Verification:** Every file:line reference in this PATTERNS.md was Read-verified during mapping. CONTEXT/UI-SPEC drift corrections in §Corrections are sourced from RESEARCH.md §Code-level Confirmations (lines 425-625) and were independently cross-checked against the actual files cited.
