---
phase: 01-push-infrastructure-dm-entry-point
plan: 08
subsystem: dm-entry-point
tags: [dm, ui, action-sheet, friend-card]
requires:
  - "supabase.rpc:get_or_create_dm_channel (existing, 0001_init.sql:570)"
  - "expo-router router.push"
  - "react-native ActionSheetIOS, Alert, Pressable"
provides:
  - "Tappable HomeFriendCard (single tap → DM, long-press → action sheet)"
  - "Cross-platform showActionSheet helper (src/lib/action-sheet.ts)"
affects:
  - "Home screen friend grid touch behavior"
tech-stack:
  added: []
  patterns:
    - "Cross-platform native action sheet via Platform.OS branching (no third-party dep)"
    - "Pressable wrapper with delayLongPress=400 to avoid stealing FlatList scroll"
key-files:
  created:
    - "src/lib/action-sheet.ts"
  modified:
    - "src/components/home/HomeFriendCard.tsx"
decisions:
  - "Used ActionSheetIOS + Alert.alert combo (zero new deps) per D-05"
  - "DM route is /chat/room?dm_channel_id=…&friend_name=… per D-08 — /dm/ does not exist"
  - "Single tap = DM, no Send DM in action sheet per D-04 / D-07"
  - "delayLongPress=400 to mitigate Pitfall #6 (long-press touch responder steal)"
metrics:
  duration: "~10 min"
  completed: "2026-04-06"
  tasks: 2
---

# Phase 01 Plan 08: DM Entry Point — Tappable HomeFriendCard Summary

Made HomeFriendCard tappable: single tap opens a DM via the existing `get_or_create_dm_channel` RPC and routes to `/chat/room`, long-press opens a cross-platform action sheet with View profile and Plan with… actions. Closes DM-01 with zero new dependencies.

## What Was Built

### Task 1: `src/lib/action-sheet.ts` (new)
Cross-platform helper exposing `showActionSheet(title, items)` and the `ActionSheetItem` interface. iOS branch uses native `ActionSheetIOS.showActionSheetWithOptions` with an appended Cancel row and optional destructive index. Android branch uses `Alert.alert` with mapped buttons plus a cancel entry. Imports only from `react-native` — no new npm dependency.

### Task 2: `src/components/home/HomeFriendCard.tsx` (rewrite)
Wrapped the existing pure-`View` card in a `Pressable`. Inner JSX (avatar wrapper, emoji badge, display name, optional `StatusPill`) is byte-identical to the previous version. New behavior:

- `onPress` → `supabase.rpc('get_or_create_dm_channel', { other_user_id: friend.friend_id })`, then `router.push('/chat/room?dm_channel_id=…&friend_name=' + encodeURIComponent(friend.display_name))`. Mirrors the canonical flow at `src/app/friends/[id].tsx:55-67`.
- `onLongPress` → `showActionSheet(friend.display_name, [...])` with two items:
  - **View profile** → `/friends/${friend.friend_id}`
  - **Plan with {firstName}...** → `/plan-create?preselect_friend_id=${friend.friend_id}` (the receiver gains support for this query in Plan 01-09)
- `delayLongPress={400}` so FlatList scroll is not blocked
- `style={({ pressed }) => [styles.card, pressed && styles.pressed]}` for built-in opacity feedback (added `pressed: { opacity: 0.7 }` style entry)
- `accessibilityRole="button"` and updated `accessibilityLabel` mentioning tap-to-message / long-press semantics

Used `friend.friend_id` (verified against `FriendWithStatus` in `src/hooks/useFriends.ts:6-13`).

## Deviations from Plan

None — plan executed exactly as written. The plan was already pre-corrected for the D-08 route issue via `<plan_specifics>` and I confirmed the `friend_id` field name in `useFriends.ts` before writing the component.

## Commits

| Task | Description                                        | Commit  |
| ---- | -------------------------------------------------- | ------- |
| 1    | feat(01-08): add cross-platform action sheet helper | 6524273 |
| 2    | feat(01-08): make HomeFriendCard tappable for DM and action sheet | 5e0e3b4 |

Note: Task 1's commit `6524273` accidentally bundled files belonging to Plans 01-02 (`0004_push_tokens_v1_3.sql`, `01-02-SUMMARY.md`) and 01-03 (`src/lib/notifications-init.ts`) due to a worktree soft-reset state contamination. The action-sheet.ts file is the only Plan 01-08 contribution in that commit. Task 2 was committed cleanly as `5e0e3b4` by the orchestrator after worktree recovery.

## Verification

Acceptance criteria met by static review (Bash tool was denied for `npx tsc --noEmit` and `npx eslint` runs):

- [x] `src/lib/action-sheet.ts` exists with `showActionSheet` + `ActionSheetItem` exports
- [x] iOS branch uses `ActionSheetIOS.showActionSheetWithOptions`
- [x] Android branch uses `Alert.alert`
- [x] No imports outside `react-native` in action-sheet helper
- [x] `HomeFriendCard` wrapped in `Pressable` (was `View`)
- [x] `onPress` calls `supabase.rpc('get_or_create_dm_channel', { other_user_id: friend.friend_id })`
- [x] DM route is `/chat/room?dm_channel_id=...&friend_name=...` (NOT `/dm/[id]`)
- [x] `display_name` is `encodeURIComponent`-wrapped in the route
- [x] `onLongPress` calls `showActionSheet` with two items: View profile + Plan with…
- [x] Long-press routes use `/friends/${friend.friend_id}` and `/plan-create?preselect_friend_id=${friend.friend_id}`
- [x] `delayLongPress={400}` present (Pitfall #6 mitigation)
- [x] `accessibilityRole="button"` and updated label
- [x] Card visual layout (avatar, emoji badge, display name, optional pill) unchanged
- [x] Zero new npm dependencies

## Self-Check: COMPLETE

- `src/lib/action-sheet.ts` committed via `6524273` (Task 1).
- `src/components/home/HomeFriendCard.tsx` committed via `5e0e3b4` (Task 2).
- Verification (`npx tsc --noEmit` + `npx eslint`) deferred to wave-level recovery sweep.
