---
phase: 06-notifications-polish
plan: "02"
subsystem: ui-components
tags: [shared-components, profile, friends, empty-state, loading]
dependency_graph:
  requires: []
  provides: [EmptyState, LoadingIndicator, EditProfileScreen, FriendProfileScreen]
  affects: [src/app/(tabs)/profile.tsx, src/app/friends/index.tsx]
tech_stack:
  added: []
  patterns: [expo-image-picker base64 avatar upload, Alert.alert action sheet, Stack.Screen dynamic title]
key_files:
  created:
    - src/components/common/EmptyState.tsx
    - src/components/common/LoadingIndicator.tsx
    - src/app/profile/_layout.tsx
    - src/app/profile/edit.tsx
    - src/app/friends/[id].tsx
  modified: []
decisions:
  - "EditProfileScreen uses isDirty check (name + avatar) to enable Save — prevents pointless server calls"
  - "FriendProfileScreen fetches profile + status in parallel with Promise.all — reduces latency"
  - "Stack.Screen title set inline in FriendProfileScreen component — avoids useEffect for navigation.setOptions"
  - "EmptyState ctaWrapper uses width:100% so PrimaryButton fills available space within paddingHorizontal:32 container"
metrics:
  duration: 2
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 6 Plan 02: Shared UI Components + Profile Screens Summary

EmptyState/LoadingIndicator shared components plus edit-profile and other-user-profile screens with avatar upload via gallery/camera action sheet and full DM+remove-friend flows.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Shared EmptyState and LoadingIndicator components | 2fb01ae | EmptyState.tsx, LoadingIndicator.tsx |
| 2 | Edit profile screen and view-other-user profile screen | 3e631bc | edit.tsx, [id].tsx, profile/_layout.tsx |

## What Was Built

### Task 1: Shared Components

**EmptyState** (`src/components/common/EmptyState.tsx`): Reusable empty-list component supporting emoji or Ionicons icon (via `iconType` prop), heading (20px/600), body (14px/400), and optional CTA via PrimaryButton. Used by Plan 03 to replace all inline empty-state patterns.

**LoadingIndicator** (`src/components/common/LoadingIndicator.tsx`): Centered ActivityIndicator in a `flex:1` container with configurable color (default `COLORS.textSecondary`), size (default `large`), and optional `style` prop. Replaces all inline loading spinners in Plan 03.

### Task 2: Profile Screens

**profile/_layout.tsx**: Stack layout for `profile/` routes with `COLORS.dominant` header and "Edit Profile" title on the `edit` screen.

**profile/edit.tsx**: Full edit profile screen with:
- Initial data fetch from `supabase.from('profiles')` into controlled state
- Avatar change via `Alert.alert` action sheet with "Choose from Library" / "Take Photo" / "Cancel"
- Camera permission request via `ImagePicker.requestCameraPermissionsAsync()`
- Base64 avatar upload to Supabase Storage (`avatars` bucket, `userId/avatar.ext` path)
- ActivityIndicator overlay on avatar + "Uploading..." label during upload
- Display name TextInput with char count (`{n}/50`) and `displayNameMaxLength` enforcement
- `isDirty` + `canSave` guards on Save Changes button
- Server confirmation pattern: navigates back only on success

**friends/[id].tsx**: Other-user profile screen with:
- Parallel fetch of `profiles` + `statuses` tables
- LoadingIndicator while fetching
- AvatarCircle, display name, @username, status dot + text with `COLORS.status[value]` colour, emoji tag inline
- `Message [FirstName]` via `supabase.rpc('get_or_create_dm_channel')` then push to `/chat/room`
- `Remove Friend` with `Alert.alert` confirmation dialog then `.delete().or(...)` using sorted canonical pair pattern
- `Stack.Screen` dynamic title set to `profile.display_name`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/components/common/EmptyState.tsx` exists with `export function EmptyState`
- [x] `src/components/common/LoadingIndicator.tsx` exists with `export function LoadingIndicator`
- [x] `src/app/profile/_layout.tsx` exists with `Stack` and `edit`
- [x] `src/app/profile/edit.tsx` exists with `Save Changes`, `Change Photo`, avatar upload
- [x] `src/app/friends/[id].tsx` exists with `Remove Friend`, `Message`, `LoadingIndicator`
- [x] All new files pass `npx expo lint` (no errors introduced)
- [x] Commits 2fb01ae and 3e631bc exist
