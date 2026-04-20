---
phase: 13-profile-rework-friend-profile
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/app/(tabs)/profile.tsx
  - src/app/friends/[id].tsx
  - src/app/profile/_layout.tsx
  - src/app/profile/edit.tsx
  - src/app/profile/wish-list.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-04-20
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files were reviewed covering the profile rework and friend profile screen. The code is generally well-structured, optimistic-UI patterns are applied consistently, and edge cases are handled thoughtfully (partial-birthday guard, Feb-29 normalization, permission states for morning prompt). No critical security issues were found.

Four warnings were found: two missing-error-handling gaps in async operations that silently swallow failures, one race condition on fast double-tap of "Add Item", and one edge-case crash on an unexpected `id` array from `useLocalSearchParams`. Three info items cover minor quality points.

---

## Warnings

### WR-01: Silent failure when avatar upload succeeds but profile DB update is never written

**File:** `src/app/(tabs)/profile.tsx:86-108`

**Issue:** `uploadAvatar` writes the new avatar to Storage and updates local `avatarUrl` state, but it never persists the new `avatar_url` back to the `profiles` table. If the user navigates away and returns, `fetchProfile()` re-fetches the old `avatar_url` from the DB and overwrites the local state, silently reverting the visible avatar. The user has no indication the change was not saved server-side.

**Fix:**
```ts
// After obtaining publicUrl, update the profiles row:
const newUrl = `${publicUrl}?t=${Date.now()}`;
const { error: dbError } = await supabase
  .from('profiles')
  .update({ avatar_url: publicUrl }) // store without cache-bust param
  .eq('id', session.user.id);
if (dbError) {
  Alert.alert('Error', "Photo uploaded but couldn't save to profile. Try again.");
}
setAvatarUrl(newUrl);
```

---

### WR-02: `handleAddWishItem` is not guarded against concurrent calls — double-tap submits twice

**File:** `src/app/profile/wish-list.tsx:24-33`

**Issue:** `handleAddWishItem` sets `addingWishItem = true` after the early-return check, but `TouchableOpacity` `disabled` prop references the state value from the render cycle at tap time. A fast double-tap can fire two concurrent `addItem` calls before the first `setAddingWishItem(true)` re-render completes, inserting a duplicate item.

**Fix:**
```ts
async function handleAddWishItem() {
  const trimmedTitle = newItemTitle.trim();
  if (!trimmedTitle || addingWishItem) return; // add addingWishItem guard here
  setAddingWishItem(true);
  // ... rest unchanged
}
```
The `disabled` prop on the button already helps on iOS, but the function guard makes the logic self-contained and safe.

---

### WR-03: `toggleClaim` errors are silently discarded in `useFriendWishList`

**File:** `src/hooks/useFriendWishList.ts:107-124` (called from `src/app/friends/[id].tsx`)

**Issue:** `toggleClaim` calls `supabase…delete()` and `supabase…insert()` without checking their return `error` fields. If the DB operation fails (e.g. network error, RLS violation), the function still calls `refetch()`, which may reload the pre-toggle state. The user sees the toggle snap back with no explanation.

**Fix:**
```ts
const toggleClaim = useCallback(async (itemId: string, currentlyClaimed: boolean) => {
  if (!userId) return;
  let opError;
  if (currentlyClaimed) {
    ({ error: opError } = await supabase
      .from('wish_list_claims')
      .delete()
      .eq('item_id', itemId)
      .eq('claimer_id', userId));
  } else {
    ({ error: opError } = await supabase
      .from('wish_list_claims')
      .insert({ item_id: itemId, claimer_id: userId }));
  }
  if (opError) {
    // surface error to caller or show Alert; for now at least log
    console.warn('toggleClaim failed', opError);
  }
  await refetch();
}, [userId, refetch]);
```

---

### WR-04: `useLocalSearchParams` can return `string | string[]` — unguarded array crashes `supabase` query

**File:** `src/app/friends/[id].tsx:44`

**Issue:** `useLocalSearchParams<{ id: string }>` types `id` as `string`, but at runtime Expo Router can return an array (`string[]`) if the same param key appears multiple times in the URL. The value is passed directly to `.eq('id', id)` and `supabase.rpc('get_or_create_dm_channel', { other_user_id: id })`. Passing an array to an `.eq()` filter produces an unexpected query; passing it to an RPC stringifies to `[object Object]`, causing a silent error.

**Fix:**
```ts
const params = useLocalSearchParams<{ id: string | string[] }>();
const id = Array.isArray(params.id) ? params.id[0] : params.id;
```

---

## Info

### IN-01: `morningDeniedHint` message is iOS-specific but renders on Android

**File:** `src/app/(tabs)/profile.tsx:476-478`

**Issue:** The hint text says "Enable notifications in iOS Settings…" but the morning prompt feature works on Android too. If the notification permission is denied on Android, the hint text misleads the user.

**Fix:** Conditionalise the string:
```ts
const settingsHint = Platform.OS === 'ios'
  ? 'Enable notifications in iOS Settings → Campfire → Notifications.'
  : 'Enable notifications in your device Settings → Apps → Campfire → Notifications.';
```

---

### IN-02: `profile` null case renders nothing with no user feedback

**File:** `src/app/friends/[id].tsx:134-136`

**Issue:** After loading completes, if `profileResult.data` is null or an error occurred, the component returns `null` — a blank screen with no error state, back button, or retry. A deleted account or a bad `id` param leaves the user stuck.

**Fix:** Return a minimal error view:
```tsx
if (!profile) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile not found.</Text>
    </View>
  );
}
```

---

### IN-03: Unused `avatar_url` field fetched in `edit.tsx` profile query

**File:** `src/app/profile/edit.tsx:42`

**Issue:** The `.select()` call includes `avatar_url`, but the value is never stored in state or used anywhere in the component. This fetches unnecessary data on every load.

**Fix:** Remove `avatar_url` from the select:
```ts
.select('display_name, birthday_month, birthday_day, birthday_year, username')
```

---

_Reviewed: 2026-04-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
