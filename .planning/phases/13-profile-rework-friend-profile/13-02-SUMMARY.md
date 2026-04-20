---
phase: 13-profile-rework-friend-profile
plan: "02"
subsystem: profile-tab
tags: [profile, edit-screen, wish-list, ux-split]
dependency_graph:
  requires: [13-01-SUMMARY]
  provides: [edit-screen-stripped, wish-list-screen, profile-layout-updated]
  affects:
    - src/app/profile/edit.tsx
    - src/app/profile/wish-list.tsx
    - src/app/profile/_layout.tsx
tech_stack:
  added: []
  patterns: [screen-split, wish-list-crud, read-only-display, ScreenHeader-no-back]
key_files:
  created:
    - src/app/profile/wish-list.tsx
  modified:
    - src/app/profile/edit.tsx
    - src/app/profile/_layout.tsx
decisions:
  - ScreenHeader does not accept onBack prop; wish-list.tsx uses ScreenHeader title-only and relies on native back gesture (headerShown: false in layout, Stack navigation back gesture available)
  - Prettier auto-fix applied via eslint --fix to both edit.tsx and wish-list.tsx after initial write
metrics:
  duration_minutes: 15
  completed_date: "2026-04-20"
  tasks_completed: 2
  files_modified: 3
---

# Phase 13 Plan 02: Edit Screen Strip + Wish List Screen Summary

**One-liner:** Stripped edit.tsx to display name / read-only username / birthday editor, moved wish list CRUD verbatim to new wish-list.tsx screen, registered wish-list in profile/_layout.tsx.

## What Was Removed from edit.tsx

| Section | Details |
|---------|---------|
| Avatar imports | `decode` from `base64-arraybuffer`, `* as ImagePicker` from `expo-image-picker`, `AvatarCircle` import |
| Avatar state | `avatarUrl`, `originalAvatarUrl`, `avatarLoading` state declarations |
| Avatar functions | `uploadAvatar()` and `handleChangeAvatar()` (both moved to profile.tsx in Plan 01) |
| Avatar JSX | Entire `<View style={styles.avatarSection}>` block (avatar circle + "Change Photo" button) |
| Wish list import | `useMyWishList` hook import |
| Wish list state | `addingWishItem`, `newItemTitle`, `newItemUrl`, `newItemNotes` |
| Wish list function | `handleAddWishItem()` |
| Wish list JSX | "My Wish List" label, item rows, empty state, add item form (all 3 TextInputs + "Add Item" button) |
| Wish list styles | `avatarSection`, `avatarWrapper`, `avatarOverlay`, `changePhotoButton`, `changePhotoText`, `wishListRow`, `wishListItemContent`, `wishListItemTitle`, `wishListItemUrl`, `wishListItemNotes`, `wishListEmpty`, `wishItemInput`, `deleteWishItem`, `deleteWishItemText`, `addWishItemButton`, `addWishItemButtonDisabled`, `addWishItemButtonText` |
| RN import | `ActivityIndicator` (no longer needed after avatar section removed) |
| isDirty | Removed `avatarUrl !== originalAvatarUrl` comparison (Pitfall 5 fix) |
| handleSave payload | Removed `avatar_url: avatarUrl` from profiles UPDATE (Pitfall 7 fix) |

## What Was Added to edit.tsx

| Addition | Details |
|----------|---------|
| `username` state | `const [username, setUsername] = useState<string | null>(null)` |
| profiles SELECT | Added `username` to select string |
| setUsername call | `setUsername(data.username ?? null)` in `.then()` callback |
| Read-only username display | `<Text style={styles.fieldLabel}>Username</Text>` + `<Text style={styles.usernameValue}>@{username ?? ''}</Text>` between charCount and birthdayLabel |
| `fieldLabel` style | Same token pattern as `birthdayLabel` — secondary text, marginTop xl, marginBottom sm |
| `usernameValue` style | lg font size, secondary color, paddingHorizontal lg to signal non-interactive |

## wish-list.tsx Structure

**File:** `src/app/profile/wish-list.tsx`
**Export:** `default function WishListScreen`
**Hook:** `useMyWishList` — provides `items`, `addItem`, `deleteItem`, `loading`

**Screen layout:**
```
KeyboardAvoidingView (flex)
  ScrollView (keyboardShouldPersistTaps="handled")
    ScreenHeader title="My Wish List"
    [wish list item rows] (map over items)
    [empty state: "No wish list items yet."]
    "ADD ITEM" section label
    TextInput (title, maxLength=120)
    TextInput (url, maxLength=500, keyboardType=url)
    TextInput (notes, maxLength=200)
    TouchableOpacity "Add Item" / "Adding..."
```

**Patterns used:** KeyboardAvoidingView + ScrollView shell from edit.tsx, wish list item rows and add form verbatim from edit.tsx, ScreenHeader title-only (no onBack — ScreenHeader does not accept that prop).

## _layout.tsx Change

Single line addition:
```typescript
<Stack.Screen name="wish-list" options={{ headerShown: false }} />
```
Added after the existing `edit` Stack.Screen entry. Prevents double header when navigating to wish-list.tsx (Pitfall 4).

## Issues Encountered and Resolved

### 1. Prettier formatting errors (Rule 1 - Bug)
- **Found during:** Task 2 ESLint run
- **Issue:** edit.tsx ScrollView indentation was off (missing 2 spaces on JSX block inside KeyboardAvoidingView); wish-list.tsx had inline `{item.title}`, `{item.url}`, `{item.notes}` on long Text lines that needed wrapping
- **Fix:** `npx eslint --fix` applied automatically; 48 prettier errors resolved across both files
- **Files modified:** `src/app/profile/edit.tsx`, `src/app/profile/wish-list.tsx`
- **Commit:** 2ccaad4

### 2. ScreenHeader onBack prop (deviation from plan template)
- **Found during:** Task 2 pre-write check
- **Issue:** Plan template showed `<ScreenHeader title="My Wish List" onBack={() => router.back()} />` but ScreenHeader component API does not accept `onBack`
- **Fix:** Used `<ScreenHeader title="My Wish List" />` per PATTERNS.md recommendation — native back gesture via Stack navigation (headerShown: false still allows back swipe on iOS)
- **Impact:** No visual back button rendered; back navigation via native gesture only. Consistent with edit.tsx behaviour.

## Verification Output

```
npx tsc --noEmit                    → exit 0  ✓
npx eslint ... --max-warnings 0    → exit 0  ✓
grep AvatarCircle/useMyWishList/avatarUrl in edit.tsx  → 0  ✓
grep usernameValue in edit.tsx     → 2  ✓
grep username in edit.tsx          → 6  ✓
isDirty contains avatarUrl         → no  ✓
wish-list.tsx exists               → yes  ✓
WishListScreen export              → 1  ✓
useMyWishList in wish-list.tsx     → 2  ✓
name="wish-list" in _layout.tsx    → 1  ✓
headerShown: false for wish-list   → confirmed  ✓
```

## Known Stubs

None. All functionality is fully wired:
- edit.tsx: profiles SELECT/UPDATE fully connected, username fetched and displayed
- wish-list.tsx: useMyWishList hook provides live data, add and delete are operational
- _layout.tsx: wish-list screen registered, no placeholder routes

## Threat Flags

No new threat surface beyond the plan's threat model (T-13-02-01 through T-13-02-05):
- T-13-02-01: `maxLength={APP_CONFIG.displayNameMaxLength}` on display name TextInput — present in edit.tsx
- T-13-02-02: `maxLength={120}` on wish list item title — present in wish-list.tsx
- T-13-02-03: `deleteItem` passes user ownership; RLS enforces server-side
- T-13-02-04: username shown to authenticated owner only via session-gated screen

## Self-Check: PASSED

- `src/app/profile/edit.tsx` exists: FOUND
- `src/app/profile/wish-list.tsx` exists: FOUND
- `src/app/profile/_layout.tsx` exists: FOUND
- Task 1 commit cf2ff6c: FOUND
- Task 2 commit 2ccaad4: FOUND
- AvatarCircle absent from edit.tsx: CONFIRMED (count = 0)
- useMyWishList absent from edit.tsx: CONFIRMED (count = 0)
- usernameValue present in edit.tsx: CONFIRMED (count = 2)
- isDirty has no avatarUrl: CONFIRMED
- wish-list.tsx WishListScreen export: CONFIRMED
- _layout.tsx registers wish-list: CONFIRMED
- tsc --noEmit: PASS
- eslint --max-warnings 0: PASS
