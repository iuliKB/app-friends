---
phase: 19-theme-migration
plan: "03"
subsystem: theme
tags: [refactor, theme, useTheme, COLORS-removal]
dependency_graph:
  requires: [19-01, 19-02]
  provides: [theme-migration-complete, compat-shim-removed]
  affects: [all-app-routes, all-screens]
tech_stack:
  added: []
  patterns:
    - useTheme() + useMemo(StyleSheet.create, [colors]) in all route and screen files
    - DARK alias for static palette in pre-ThemeProvider contexts (splash)
    - Module-level component pattern for RootLayoutStack to satisfy React hooks rules
    - Named style interfaces (FriendPickerRowStyles, BirthdayRowStyles) for sub-component style props
key_files:
  created: []
  modified:
    - src/theme/index.ts
    - src/app/_layout.tsx
    - src/app/(tabs)/profile.tsx
    - src/app/(tabs)/_layout.tsx
    - src/app/(tabs)/chat/_layout.tsx
    - src/app/(tabs)/squad.tsx
    - src/app/friends/_layout.tsx
    - src/app/friends/[id].tsx
    - src/app/friends/index.tsx
    - src/app/plans/_layout.tsx
    - src/app/profile/_layout.tsx
    - src/app/profile/edit.tsx
    - src/app/profile/wish-list.tsx
    - src/app/qr-code.tsx
    - src/app/squad/_layout.tsx
    - src/app/squad/birthday/[id].tsx
    - src/app/squad/birthdays.tsx
    - src/app/squad/expenses/[id].tsx
    - src/app/squad/expenses/create.tsx
    - src/app/squad/expenses/friend/[id].tsx
    - src/app/squad/expenses/index.tsx
    - src/screens/auth/AuthScreen.tsx
    - src/screens/auth/ProfileSetup.tsx
    - src/screens/chat/ChatListScreen.tsx
    - src/screens/chat/ChatRoomScreen.tsx
    - src/screens/friends/AddFriend.tsx
    - src/screens/friends/FriendRequests.tsx
    - src/screens/friends/FriendsList.tsx
    - src/screens/home/HomeScreen.tsx
    - src/screens/plans/PlanCreateModal.tsx
    - src/screens/plans/PlanDashboardScreen.tsx
    - src/screens/plans/PlansListScreen.tsx
decisions:
  - Use module-level RootLayoutStack component rather than nested function inside RootLayout to satisfy React hooks rules for useTheme()
  - Keep LinearGradient hardcoded hex colors in AuthScreen and HomeScreen — these are intentional design values not mapped to theme tokens
  - Use named typed interfaces instead of ReturnType<typeof StyleSheet.create> for sub-component style props to satisfy TypeScript strict mode
metrics:
  duration: ~90 minutes (session continuation)
  completed: "2026-04-28"
  tasks: 3
  files_modified: 31
---

# Phase 19 Plan 03: App Routes and Screens Theme Migration Summary

Final migration wave removing all `COLORS` static imports from `src/app/**` routes and `src/screens/**` screens, plus removing the `COLORS` compat shim from `src/theme/index.ts`.

## What Was Built

Replaced all remaining `import { COLORS } from '@/theme'` usages with `useTheme()` hook + `useMemo(() => StyleSheet.create({...}), [colors])` across 31 files. Removed the compat shim `export { COLORS } from './colors'` from `src/theme/index.ts`. The codebase now has zero `COLORS` static imports — all color references go through the live theme context.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Migrate 19 src/app/** route files | d9bdfa1 |
| 2 | Migrate 11 src/screens/** screen files | 8e4fab0 |
| 3 | Remove compat shim + tsc gate | f872e5c |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] profile.tsx was not in Task 1 file list**
- **Found during:** Task 3 (tsc --noEmit revealed `COLORS` import still present)
- **Issue:** `src/app/(tabs)/profile.tsx` was listed under `files_modified` in the plan but not included in Task 1's explicit migration scope. It still exported `COLORS` and caused a tsc error after compat shim removal.
- **Fix:** Full migration of profile.tsx to useTheme() + useMemo(StyleSheet.create, [colors]) pattern
- **Files modified:** src/app/(tabs)/profile.tsx
- **Commit:** f872e5c

**2. [Rule 1 - Bug] TypeScript style prop type errors in FriendPickerRow and BirthdayRow**
- **Found during:** Task 3 (tsc --noEmit)
- **Issue:** `ReturnType<typeof StyleSheet.create>` returns `ViewStyle | TextStyle | ImageStyle` which TypeScript can't assign to `StyleProp<ViewStyle>` or `StyleProp<TextStyle>` when used on component props. Added in the previous context window when solving the sub-component hook violation.
- **Fix:** Replaced `ReturnType<typeof StyleSheet.create>` with named typed interfaces (`FriendPickerRowStyles`, `BirthdayRowStyles`) specifying exact ViewStyle/TextStyle per key
- **Files modified:** src/app/squad/birthday/[id].tsx, src/app/squad/birthdays.tsx
- **Commit:** f872e5c

## Known Stubs

None. All color references are now wired through the live theme context.

## Pre-existing tsc Errors (out of scope)

The following type errors existed before this plan and are not related to the COLORS migration:
- `src/app/friends/[id].tsx` — string narrowing with useLocalSearchParams
- `src/components/chat/SendBar.tsx` — onPress type mismatch
- `src/hooks/useChatRoom.ts` — `create_poll` RPC not in generated DB types
- `src/hooks/usePoll.ts` — polls/poll_options/poll_votes tables not in Supabase types
- `src/hooks/usePushNotifications.ts` — NotificationPermissionsStatus type change

These were logged but not fixed (out of scope per deviation scope boundary rule).

## Checkpoint Pending

Task 4 (human-verify) requires visual verification in Expo Go that all screens render correctly under both light and dark themes. The app should be launched and tested before this plan is marked complete.

## Self-Check: PASSED

All 3 task commits verified:
- d9bdfa1: refactor(19-03): migrate src/app/** routes to useTheme hook
- 8e4fab0: refactor(19-03): migrate src/screens/** to useTheme hook
- f872e5c: refactor(19-03): remove COLORS compat shim; fix style prop typing

All key files confirmed modified:
- src/theme/index.ts: compat shim removed (line 1 deleted)
- src/app/(tabs)/profile.tsx: fully migrated
- 29 additional route/screen files migrated
