---
phase: 33-friend-profile-redesign
reviewed: 2026-05-13T20:42:29Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - src/__mocks__/reanimated.js
  - src/app/friends/__tests__/[id].test.tsx
  - src/app/friends/[id].tsx
  - src/app/friends/[id]/photos.tsx
  - src/app/profile/edit.tsx
  - src/components/common/AvatarCircle.tsx
  - src/components/friends/ActionIconButton.tsx
  - src/components/friends/BioRow.tsx
  - src/components/friends/friendIconPalette.ts
  - src/components/friends/FriendProfileBlurredWash.tsx
  - src/components/friends/FriendProfileHeader.tsx
  - src/components/friends/GroupedInsetSection.tsx
  - src/components/friends/ProfileInfoRow.tsx
  - src/components/friends/QuickActionsRow.tsx
  - src/hooks/__tests__/useChatDmPreferences.test.ts
  - src/hooks/__tests__/useFriendMutuals.test.ts
  - src/hooks/__tests__/useFriendProfile.test.ts
  - src/hooks/__tests__/useUpdateMyBio.test.ts
  - src/hooks/useChatDmPreferences.ts
  - src/hooks/useFriendMutuals.ts
  - src/hooks/useFriendProfile.ts
  - src/hooks/useUpdateMyBio.ts
  - src/lib/queryKeys.ts
  - supabase/migrations/0027_add_profile_bio.sql
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-05-13T20:42:29Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Phase 33 delivers the friend profile redesign across one migration, four data hooks, seven UI components, two screens (friend profile + shared photos), and a profile-edit update to write `bio`. The code follows project conventions well: Pattern 5 mutations with full optimistic/rollback/settle shape (`useUpdateMyBio`), per-user query keys via the central factory (`queryKeys`), reduced-motion handling on every Reanimated style block, accessibility labels on all interactive elements, theme-token-driven styling, and per-file `useMemo` styles. Tests cover the documented requirements (REQ-FP-06/07/09/12) plus loading/error/sparse data branches.

No critical security or data-loss issues were found. The four warnings concentrate on the **Mute toggle path** in `friends/[id].tsx`: it has a true race window before `mutingInFlight` becomes `true`, the optimistic cache flip lacks any rollback, an `await` error is silently swallowed by the `try/finally`, and an off-by-one in `BioRow` makes exactly-3-line bios falsely tappable. Info findings cover taxonomy/maintenance hygiene (fragile `isDark` detection, `(supabase as any)` casts, `setState` after unmount in `profile/edit.tsx`, and a no-op `deletePhoto` prop in the shared photos viewer).

## Warnings

### WR-01: Mute toggle race — concurrent presses can fire duplicate RPCs

**File:** `src/app/friends/[id].tsx:351-392`
**Issue:**
`handleToggleMute` reads `dmChannelId` and `mutingInFlight` from React state, but the guard against re-entry depends on the state update completing before the next press. Because `setMutingInFlight(true)` is asynchronous (React batches state writes and they don't apply until re-render) and the function never checks `mutingInFlight` itself, two rapid taps can both enter the function, both call `get_or_create_dm_channel`, and both upsert the preferences row. The `muteDisabled` prop on `QuickActionsRow` does block the visible button while in flight, but the protection only takes effect on the **next** render — the first two consecutive `onPress` fires can sneak through before the disabled prop is applied.
**Fix:**
Add a synchronous re-entry guard using a ref:

```tsx
const muteInFlightRef = useRef(false);

async function handleToggleMute() {
  if (!myId || muteInFlightRef.current) return;
  muteInFlightRef.current = true;
  setMutingInFlight(true);
  try {
    // ... existing body ...
  } finally {
    muteInFlightRef.current = false;
    setMutingInFlight(false);
  }
}
```

### WR-02: Mute optimistic cache flip is never rolled back on failure

**File:** `src/app/friends/[id].tsx:373-388`
**Issue:**
Line 373 optimistically writes `{ isMuted: nextMuted }` into `queryKeys.chat.preferences(resolvedChannelId)` **before** the `chat_preferences.upsert` await. If the upsert throws (network error, RLS rejection, conflict resolution failure), the optimistic write is left in place because there is no `try/catch` around it — only a `try/finally` that resets `mutingInFlight`. The invalidate on lines 387-388 *will* eventually correct the cache, but only when the query re-fetches and successfully reads the DB row — until then the user sees the wrong icon/label and missing notifications behave inconsistently with the displayed state. This contradicts the canonical Pattern 5 contract used elsewhere in the phase (e.g. `useUpdateMyBio.ts:59-64`).
**Fix:**
Snapshot before the optimistic write and roll back on error:

```tsx
const prev = queryClient.getQueryData(queryKeys.chat.preferences(resolvedChannelId));
queryClient.setQueryData(queryKeys.chat.preferences(resolvedChannelId), { isMuted: nextMuted });
try {
  const { error: upsertError } = await supabase.from('chat_preferences').upsert(/* ... */);
  if (upsertError) throw upsertError;
} catch (err) {
  queryClient.setQueryData(queryKeys.chat.preferences(resolvedChannelId), prev);
  Alert.alert('Error', "Couldn't update mute setting. Try again.");
  return;
}
void queryClient.invalidateQueries({ queryKey: queryKeys.chat.preferences(resolvedChannelId) });
void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(myId) });
```

Better still: extract the mute toggle into a Pattern 5 `useMutation` hook (matches the rest of the phase's mutation taxonomy and would automatically pass the `mutationShape` gate).

### WR-03: `supabase.from('chat_preferences').upsert(...)` error is silently dropped

**File:** `src/app/friends/[id].tsx:376-385`
**Issue:**
The upsert is awaited but its `{ error }` return value is never destructured or checked. Combined with WR-02 (no rollback), the user gets no feedback when the mute write fails — the optimistic flip stays, the button looks correct, and the DB never receives the update. Subsequent app launches will reveal the inconsistency. Compare to `removeMutation.mutationFn` (line 316) which properly throws on `deleteError`.
**Fix:**
Destructure and throw:

```tsx
const { error: upsertError } = await supabase
  .from('chat_preferences')
  .upsert(/* ... */, { onConflict: 'user_id,chat_type,chat_id' });
if (upsertError) throw upsertError;
```

Then the surrounding try/catch from WR-02 will handle the rollback and user alert.

### WR-04: `BioRow` off-by-one — exactly-3-line bios are wrongly marked as overflowing

**File:** `src/components/friends/BioRow.tsx:44`
**Issue:**
`e.nativeEvent.lines.length >= BIO_COLLAPSED_LINES` treats a bio that fits in exactly 3 lines as overflowing. With `numberOfLines={BIO_COLLAPSED_LINES}` (3) the text already fits — `>=` makes the row tappable, swaps the `<View>` for a `<Pressable>`, applies the "Tap to read full bio" accessibilityHint, and gives users a no-op tap (toggle from `false`→`true` doesn't change rendered lines because the content already fits). The intent is clearly "render the bio in 3 lines but truncate; if it would have rendered in MORE than 3 lines, make it expandable" — which requires `>`.
**Fix:**
Change line 44 from `>=` to `>`:

```tsx
if (!overflowing && e.nativeEvent.lines.length > BIO_COLLAPSED_LINES) {
  setOverflowing(true);
}
```

Note: this depends on whether `onTextLayout` reports the **rendered** line count (capped at `numberOfLines`) or the **natural** line count. On RN ≥ 0.71 it reports the natural count when measured before truncation kicks in, so `>` is correct. Confirm with a 3-line bio + a 4-line bio in dev to be sure.

## Info

### IN-01: `friendIconPalette.isDark()` detection is fragile

**File:** `src/components/friends/friendIconPalette.ts:42-44`
**Issue:**
The palette detects light vs dark theme by hex-comparing `colors.interactive.accent` against the literal `'#B9FF3B'`. Any future tweak to the dark-mode accent token (rebrand, A11y bump, seasonal accent, etc.) silently flips this helper's mode, swapping every icon background/glyph in the friend profile sections. The `useTheme()` hook already returns `isDark` as a stable boolean (used correctly in `FriendProfileBlurredWash.tsx:34`).
**Fix:**
Pass `isDark` through the palette signature:

```ts
export function getIconPalette(tint: IconTint, isDark: boolean): IconPaletteEntry { /* ... */ }
```

Or keep the colors signature but extend `PaletteColors` with `isDark: boolean` and have callers pass `{ ...colors, isDark }` (or just call `useTheme()` inside but that requires the function to become a hook).

### IN-02: `(supabase as any)` casts leak typed query safety

**File:** `src/hooks/useFriendProfile.ts:74`, `src/hooks/useUpdateMyBio.ts:40`, `src/app/profile/edit.tsx:51-56`
**Issue:**
Three call sites cast `supabase` to `any` to bypass the un-regenerated `database.ts` types around the new `bio` column. The comments document the intent and reference prior precedent (Phase 31/32) so this is technical debt rather than a bug — flagging only to track the regen follow-up. While the cast is in place, response shapes are untyped and a column-name typo would only surface at runtime.
**Fix:**
Regenerate `src/types/database.ts` from the live schema (post-migration 0027) and remove the three `(supabase as any)` casts in a follow-up PR. Track as TECHDEBT.

### IN-03: `profile/edit.tsx` `useEffect` can `setState` after unmount

**File:** `src/app/profile/edit.tsx:46-73`
**Issue:**
The effect kicks off a Supabase select via `.then()` without an AbortController/cancellation flag. If the user navigates away before the request resolves, `setDisplayName`, `setBirthdayMonth`, etc. fire on an unmounted component. React 18 demotes this from an error to a warning, but it still leaks the resolved data and pollutes the dev console.
**Fix:**
Use a cancelled flag:

```ts
useEffect(() => {
  if (!session) return;
  let cancelled = false;
  (supabase as any)
    .from('profiles')
    .select(/* ... */)
    .eq('id', session.user.id)
    .single()
    .then(({ data, error }: { data: any; error: any }) => {
      if (cancelled) return;
      if (data && !error) { /* ... existing setters ... */ }
      setLoading(false);
    });
  return () => { cancelled = true; };
}, [session]);
```

### IN-04: `SharedPhotosScreen` passes a no-op `deletePhoto` to GalleryViewerModal

**File:** `src/app/friends/[id]/photos.tsx:233`
**Issue:**
`deletePhoto={() => Promise.resolve({ error: null })}` returns success without actually deleting. If `GalleryViewerModal` renders a delete UI based on `currentUserId === photo.uploader.id`, the user can "delete" their own photos here and see no effect (and probably an optimistic local removal that re-appears on next load). The friend profile context is read-only by design, so a more honest contract is to pass a clearly-disabled handler or skip the delete capability entirely.
**Fix:**
Either pass `undefined`/a disabled flag if the modal supports it, or have it explicitly reject with a user-facing message:

```tsx
deletePhoto={() => Promise.resolve({ error: 'Cannot delete photos from this view' })}
```

Better: extend `GalleryViewerModalProps` with a `readOnly?: boolean` flag and hide the delete affordance entirely when consumed from `/friends/[id]/photos`.

### IN-05: `firstName` fallback is dead code

**File:** `src/app/friends/[id].tsx:495`
**Issue:**
`const firstName = displayName.split(' ')[0] ?? displayName;` — `String.prototype.split` never returns `undefined` for index 0 (returns `''` for an empty string), so `?? displayName` cannot fire. When `displayName === ''`, `firstName === ''`, which is the same as `displayName`. Cosmetic only.
**Fix:**
Either drop the fallback or guard against empty:

```ts
const firstName = displayName ? displayName.split(' ')[0] : '';
```

### IN-06: `AvatarCircle` re-creates `circleStyle` every render

**File:** `src/components/common/AvatarCircle.tsx:43-47`
**Issue:**
The inline `circleStyle = { width: size, height: size, borderRadius: size / 2 }` object is rebuilt every render and merged into the StyleSheet array, defeating StyleSheet hashing for that style. With friend profile rendering at 140pt and the row icons at 32pt, this is fine performance-wise but is inconsistent with the strict `useMemo`+`StyleSheet.create` pattern used everywhere else in the phase.
**Fix:**
Move into the `useMemo` block keyed on `size`:

```ts
const styles = useMemo(() => StyleSheet.create({
  circle: { /* ... */ width: size, height: size, borderRadius: size / 2 },
  /* ... */
}), [colors, size]);
```

### IN-07: `useChatDmPreferences` uses empty string as a sentinel query key

**File:** `src/hooks/useChatDmPreferences.ts:32`
**Issue:**
`queryKey: queryKeys.chat.preferences(channelId ?? '')` keys a disabled query at `['chat', 'preferences', '']`. If any other code path ever uses `queryKeys.chat.preferences('')` (or sets data into that slot, intentionally or by accident) it collides with this hook's disabled-state key. The query is gated by `enabled`, so the actual fetch is suppressed, but writes via `setQueryData` would not be.
**Fix:**
Two options:
1. Build the key from a placeholder that can't collide: `channelId ?? '__disabled__'` (or `null`-typed if the factory supports it).
2. Skip the query entirely when channelId is null and use a `useState`-backed default — but that's a bigger refactor.

Lowest-effort fix: change the disabled key to a sentinel:

```ts
queryKey: queryKeys.chat.preferences(channelId ?? '__disabled__'),
```

---

_Reviewed: 2026-05-13T20:42:29Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
