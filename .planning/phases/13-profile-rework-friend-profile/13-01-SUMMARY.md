---
phase: 13-profile-rework-friend-profile
plan: "01"
subsystem: profile-tab
tags: [profile, avatar-upload, notifications, ux-cleanup]
dependency_graph:
  requires: []
  provides: [profile-tab-restructured, avatar-upload-inline, notifications-consolidated]
  affects: [src/app/(tabs)/profile.tsx]
tech_stack:
  added: []
  patterns: [avatar-upload-inline, useFocusEffect-refetch, tappable-row-pattern]
key_files:
  created: []
  modified:
    - src/app/(tabs)/profile.tsx
decisions:
  - Avatar upload logic moved inline to profile.tsx (uploadAvatar + handleChangeAvatar verbatim from edit.tsx); edit.tsx retains its own copy until Plan 02 strips it
  - eslint-disable added for useFocusEffect empty-dep array — intentional run-on-focus pattern, matches squad.tsx precedent
  - Prettier formatting applied to uploadAvatar destructure and Alert.alert call to pass --max-warnings 0
metrics:
  duration_minutes: 12
  completed_date: "2026-04-20"
  tasks_completed: 2
  files_modified: 1
---

# Phase 13 Plan 01: Profile Tab Restructure Summary

**One-liner:** Removed MoodPicker/YOUR STATUS from profile tab, added inline avatar upload with handleChangeAvatar, Edit Profile + My Wish List nav rows, and unified three notification toggles under a single NOTIFICATIONS header.

## What Changed in profile.tsx

### Sections Removed (PROF-01)
- `import { MoodPicker } from '@/components/status/MoodPicker'` — import deleted
- `<Text style={styles.sectionHeader}>YOUR STATUS</Text>` + `<MoodPicker />` — JSX block deleted
- `<Text style={styles.sectionHeader}>SETTINGS</Text>` — old notifications header removed
- `<Text style={styles.sectionHeader}>MORNING PROMPT</Text>` — old morning prompt header removed

### Sections Added
- **Avatar upload imports:** `decode` from `base64-arraybuffer`, `* as ImagePicker` from `expo-image-picker`, `APP_CONFIG` from `@/constants/config`
- **Avatar state:** `avatarLoading: boolean`, `avatarUrl: string | null` (local cache-busted URL)
- **`uploadAvatar()` function:** verbatim from edit.tsx — uploads to Supabase Storage, sets local cache-busted avatarUrl
- **`handleChangeAvatar()` function:** verbatim from edit.tsx — Alert with Choose from Library / Take Photo / Cancel actions
- **Avatar header:** converted from `TouchableOpacity` (navigating to /profile/edit) to `View`; `AvatarCircle` now has `onPress={avatarLoading ? undefined : handleChangeAvatar}`; `avatarOverlay` loading scrim added
- **Edit Profile row:** `person-outline` icon, navigates to `/profile/edit` via `router.push`
- **My Wish List row:** `gift-outline` icon, navigates to `/profile/wish-list` via `router.push`
- **`avatarOverlay` style:** absolute overlay with `rgba(0,0,0,0.5)` scrim (eslint-disable comment retained)
- **Single `NOTIFICATIONS` header:** replaces the two old headers, appears before plan invites row

### Section Order After Changes
```
ScreenHeader "Profile"
AvatarHeader (View, not TouchableOpacity)
  AvatarCircle → onPress: handleChangeAvatar
  avatarOverlay (conditional loading scrim)
  pencilOverlay (always visible)
  displayName, username

Edit Profile row → /profile/edit
My Wish List row → /profile/wish-list
My QR Code row → /qr-code

ACCOUNT section
  email row
  member since row

NOTIFICATIONS section  ← single header
  Plan invites (Switch)
  Friend availability (Switch)
  Morning prompt (Switch)
  Time row (tappable)
  DateTimePicker (conditional)
  morningDeniedHint (conditional)

Log out row
Version text
PrePromptModal
```

## Issues Encountered and Resolved

### 1. Prettier formatting errors (Rule 1 - Bug)
- **Found during:** Task 1 ESLint run
- **Issue:** uploadAvatar function had `const { data: { publicUrl } }` on one line and Alert.alert on one line — exceeded Prettier line length
- **Fix:** Reformatted destructure to multiline and split Alert.alert arguments across lines
- **Files modified:** src/app/(tabs)/profile.tsx
- **Commit:** a2b2526

### 2. ESLint exhaustive-deps warning (pre-existing, suppressed)
- **Found during:** Task 2 ESLint run
- **Issue:** `useFocusEffect(useCallback(() => {...}, []))` triggers `react-hooks/exhaustive-deps` warning because `fetchProfile` and `loadNotificationsEnabled` are not in the dep array
- **Context:** This is the intentional "run-on-focus" pattern used throughout the app (e.g., squad.tsx line 68, 85). The empty dep array is correct — we want one execution per focus event, not on every render cycle
- **Fix:** Added `// eslint-disable-next-line react-hooks/exhaustive-deps` inside the callback before the closing `}, [])` — matching the squad.tsx inline disable pattern
- **Commit:** a2b2526

## Verification Output

```
grep -c "MoodPicker|YOUR STATUS" profile.tsx  → 0  ✓
grep -c "SETTINGS|MORNING PROMPT" profile.tsx → 0  ✓
grep -c "NOTIFICATIONS" profile.tsx           → 1  ✓
grep -c "Edit Profile" profile.tsx            → 2  ✓ (label + comment)
grep -c "My Wish List" profile.tsx            → 2  ✓ (label + comment)
grep -c "handleChangeAvatar" profile.tsx      → 2  ✓ (definition + onPress)
npx tsc --noEmit                              → exit 0  ✓
npx eslint ... --max-warnings 0              → exit 0  ✓
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prettier formatting on uploadAvatar function**
- **Found during:** Task 2 ESLint run (after both tasks were written)
- **Issue:** Two lines exceeded Prettier line length limit — object destructure and Alert.alert call
- **Fix:** Reformatted to match edit.tsx's own formatting (verbatim source had different wrapping)
- **Files modified:** src/app/(tabs)/profile.tsx
- **Commit:** a2b2526

**2. [Rule 2 - Missing critical] eslint-disable for useFocusEffect exhaustive-deps**
- **Found during:** Task 2 ESLint run
- **Issue:** Pre-existing pattern in profile.tsx had no suppress comment; ESLint --max-warnings 0 gate fails without it
- **Fix:** Added inline disable comment matching squad.tsx precedent
- **Files modified:** src/app/(tabs)/profile.tsx
- **Commit:** a2b2526

## Known Stubs

None. All navigation targets (`/profile/edit`, `/profile/wish-list`) are existing or planned routes. `/profile/edit` exists today. `/profile/wish-list` will be created in Plan 02.

## Threat Flags

No new threat surface introduced beyond what is documented in the plan's threat model (T-13-01-01 through T-13-01-04). File path is `{user_id}/avatar.{ext}` derived from authenticated session — Supabase RLS on avatars bucket prevents cross-user overwrites.

## Self-Check: PASSED

- `src/app/(tabs)/profile.tsx` exists: FOUND
- Task 1 commit 9620a1c: FOUND (`git log --oneline | grep 9620a1c`)
- Task 2 commit a2b2526: FOUND (`git log --oneline | grep a2b2526`)
- MoodPicker absent: CONFIRMED (grep count = 0)
- YOUR STATUS absent: CONFIRMED (grep count = 0)
- NOTIFICATIONS present (1 occurrence): CONFIRMED
- handleChangeAvatar present: CONFIRMED
- uploadAvatar present: CONFIRMED
- Edit Profile row present: CONFIRMED
- My Wish List row present: CONFIRMED
- tsc --noEmit: PASS
- eslint --max-warnings 0: PASS
