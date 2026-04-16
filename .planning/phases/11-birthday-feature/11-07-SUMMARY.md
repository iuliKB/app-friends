---
phase: 11-birthday-feature
plan: 07
subsystem: ui
tags: [typescript, react-native, birthday, wish-list, group-chat, navigation, expo-router]

# Dependency graph
requires:
  - phase: 11-03
    provides: formatTurningAge, BirthdayEntry.birthday_year
  - phase: 11-04
    provides: group_channel_id on messages, group chat navigation pattern
  - phase: 11-05
    provides: useFriendWishList, useFriendsOfFriend, WishListItem component
provides:
  - src/app/squad/birthdays.tsx — tappable birthday rows with "turning N" age label
  - src/app/squad/_layout.tsx — birthday/[id] route registered
  - src/app/squad/birthday/[id].tsx — Friend Birthday Page (wish list + friend picker + group creation)
affects:
  - 11-08 (final plan — integration/polish if any)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pressable with router.push for list row tap navigation
    - combinedLabel array filter + join for conditional multi-part subtitle
    - Set<string> selectedIds for multi-select friend picker state
    - creating state guard for double-tap DoS prevention (T-11-P07-04)
    - Silent failure on RPC error (console.warn + return, user can retry)

key-files:
  created:
    - src/app/squad/birthday/[id].tsx
  modified:
    - src/app/squad/birthdays.tsx
    - src/app/squad/_layout.tsx

key-decisions:
  - "BirthdayRow daysLabel appears both in combinedLabel (middle column) and separately on the right — plan specified this dual rendering; right column shows daysLabel alone, middle shows full combined label"
  - "Birthday person excluded from group picker via get_friends_of RPC output — RPC already excludes birthday person and current user; no additional UI filtering needed (D-16 accepted as UI concern per RESEARCH.md)"
  - "handlePlanBirthday silent failure on RPC error — no Alert shown, user retries by tapping Plan Birthday again (plan spec)"

patterns-established:
  - "Friend Birthday Page pattern: wish list section + friend picker section + action button — reusable pattern for any friend-detail action page"
  - "Multi-select Set<string> state pattern with toggle function returning new Set — use for any checkbox/multi-select list"

requirements-completed:
  - D-02
  - D-12
  - D-13
  - D-14
  - D-15
  - D-16
  - D-18

# Metrics
duration: 8min
completed: 2026-04-17
---

# Phase 11 Plan 07: Birthday Navigation and Friend Birthday Page Summary

**Tappable birthday rows with "turning N" label, birthday/[id] route registration, and Friend Birthday Page with wish list viewing, friend picker, and birthday group chat creation**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-17
- **Completed:** 2026-04-17
- **Tasks:** 2
- **Files modified:** 2 modified, 1 created

## Accomplishments

- Updated `BirthdayRow` in `birthdays.tsx`: converted from `View` to `Pressable`, added `useRouter` with `router.push` to `/squad/birthday/${entry.friend_id}?name=...`, added `formatTurningAge` import and `ageLabel` conditional on `birthday_year !== null`, combined label joins `dateLabel`, `ageLabel`, `daysLabel` with `·` separator (D-02)
- Registered `birthday/[id]` `Stack.Screen` in `squad/_layout.tsx` (required for Expo Router to resolve the new route)
- Created `src/app/squad/birthday/[id].tsx` — Friend Birthday Page: wish list section with `WishListItem` rows and `toggleClaim` wiring, "Plan Birthday With" section with `FriendPickerRow` multi-select checkboxes, `handlePlanBirthday` calling `create_birthday_group` RPC with `p_name` and `p_member_ids`, navigates to `/chat/room?group_channel_id=...&friend_name=...` on success (D-15, D-18)
- `creating` state guard: `disabled={creating || selectedIds.size === 0}` prevents double-tap (T-11-P07-04)

## Task Commits

1. **Task 1: Update birthdays.tsx + register route in _layout.tsx** - `1026c95` (feat)
2. **Task 2: Build Friend Birthday Page** - `77e07e7` (feat)

## Files Created/Modified

- `src/app/squad/birthdays.tsx` — Pressable rows, formatTurningAge, router.push navigation (+19 lines)
- `src/app/squad/_layout.tsx` — birthday/[id] Stack.Screen registered (+1 line)
- `src/app/squad/birthday/[id].tsx` — Friend Birthday Page, 314 lines (created)

## Decisions Made

- **combinedLabel dual rendering:** The `daysLabel` string appears both in `combinedLabel` (middle column subtitle) and as a standalone right-side label. The plan spec is explicit about this pattern — it matches the existing row layout where days are displayed on the right.

- **Birthday person exclusion (D-16):** No UI-level filtering needed. `useFriendsOfFriend` calls `get_friends_of(friendId)` which returns the birthday friend's friends — the birthday person themselves is not in that list. The current user is also excluded by the RPC. Accepted per plan RESEARCH.md security note.

- **Silent failure on group creation error:** `handlePlanBirthday` logs a warning and returns without showing an Alert. The user can retry by tapping Plan Birthday again. This matches the plan spec.

## Deviations from Plan

None — plan executed exactly as written. All code matched the plan templates and interfaces.

## Known Stubs

None — all data is wired to real hooks (`useFriendWishList`, `useFriendsOfFriend`) and the `create_birthday_group` RPC. The birthday friend's name comes from the route `name` query param, which is set by `birthdays.tsx` on navigation.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model. The `create_birthday_group` RPC is the only new server call; RLS enforces membership. The `group_channel_id` in `router.push` comes directly from the RPC return value (T-11-P07-01 accepted).

## Self-Check

- `src/app/squad/birthdays.tsx` imports `Pressable`: FOUND
- `src/app/squad/birthdays.tsx` imports `formatTurningAge`: FOUND
- `src/app/squad/birthdays.tsx` contains `router.push` with `/squad/birthday/`: FOUND
- `src/app/squad/birthdays.tsx` contains `birthday_year !== null`: FOUND
- `src/app/squad/_layout.tsx` contains `birthday/[id]`: FOUND
- `src/app/squad/birthday/[id].tsx` exists: FOUND
- `src/app/squad/birthday/[id].tsx` imports `useFriendWishList`: FOUND
- `src/app/squad/birthday/[id].tsx` imports `useFriendsOfFriend`: FOUND
- `src/app/squad/birthday/[id].tsx` contains `create_birthday_group`: FOUND
- `src/app/squad/birthday/[id].tsx` contains `group_channel_id`: FOUND
- `src/app/squad/birthday/[id].tsx` contains `FriendPickerRow`: FOUND
- Commit `1026c95` exists: FOUND
- Commit `77e07e7` exists: FOUND
- `npx tsc --noEmit` exits 0: PASSED

## Self-Check: PASSED
