---
phase: 03-home-screen
plan: "01"
subsystem: home-screen
tags: [zustand, home, friends, grid, fab, animation]
dependency_graph:
  requires:
    - src/hooks/useFriends.ts (FriendWithStatus type)
    - src/stores/useAuthStore.ts (session)
    - src/lib/supabase.ts (get_friends RPC, statuses table)
    - src/components/common/AvatarCircle.tsx
    - src/components/friends/StatusPill.tsx
    - src/components/status/SegmentedControl.tsx
    - src/components/common/PrimaryButton.tsx
    - src/hooks/useStatus.ts
  provides:
    - src/stores/useHomeStore.ts (useHomeStore — friends cache)
    - src/hooks/useHomeScreen.ts (useHomeScreen — data fetch + derived arrays)
    - src/components/home/HomeFriendCard.tsx (HomeFriendCard)
    - src/screens/home/HomeScreen.tsx (HomeScreen)
  affects:
    - src/app/(tabs)/index.tsx (replaced placeholder with HomeScreen)
tech_stack:
  added: []
  patterns:
    - Zustand cache store (stale-while-revalidate pattern)
    - FlatList with numColumns=3 inside ScrollView (scrollEnabled=false)
    - Animated.sequence scale pulse for count heading
    - Absolute-positioned FAB with safe area insets
key_files:
  created:
    - src/stores/useHomeStore.ts
    - src/hooks/useHomeScreen.ts
    - src/components/home/HomeFriendCard.tsx
    - src/screens/home/HomeScreen.tsx
  modified:
    - src/app/(tabs)/index.tsx
decisions:
  - "statusUpdatedAt map stored alongside friends in Zustand — required to sort freeFriends by most-recently-updated without adding updated_at to FriendWithStatus type"
  - "setFriends action takes both friends and statusUpdatedAt in one call — avoids two-render flicker from two separate set() calls"
  - "handleRefresh manages refreshing state inside the hook — callers don't need to track it"
metrics:
  duration_seconds: 87
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 3 Plan 01: Home Screen Summary

**One-liner:** Two-section friend grid with Zustand cache (useHomeStore), data fetch hook (useHomeScreen), HomeFriendCard with emoji badge, and HomeScreen with count heading scale animation + Start Plan FAB.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create useHomeStore and useHomeScreen hook | 766b531 | src/stores/useHomeStore.ts, src/hooks/useHomeScreen.ts |
| 2 | Create HomeFriendCard, HomeScreen, wire route shell | 41f602f | src/components/home/HomeFriendCard.tsx, src/screens/home/HomeScreen.tsx, src/app/(tabs)/index.tsx |

## What Was Built

- **useHomeStore** — Zustand cache holding `friends[]`, `statusUpdatedAt` map, and `lastFetchedAt`. The `setFriends` action accepts both arrays in one call to avoid re-render flicker.
- **useHomeScreen** — Fetches all friends via `get_friends` RPC, then queries `statuses` for `user_id, status, context_tag, updated_at`. Derives `freeFriends` sorted by `updated_at` descending and `otherFriends` sorted maybe > busy > alpha. Exposes `loading`, `error`, `refreshing`, `handleRefresh`, `fetchAllFriends`.
- **HomeFriendCard** — Non-interactive `View` card with 56px `AvatarCircle`, absolute-positioned emoji badge at avatar bottom-right, single-line display name, optional `StatusPill` via `showStatusPill` prop.
- **HomeScreen** — Outer `ScrollView` with `RefreshControl`. Status toggle at top. Count heading via `Animated.Text` with `Animated.sequence` scale pulse (1.15 → 1) on count change. Two `FlatList` grids with `numColumns={3}` and `scrollEnabled={false}`. "Everyone Else" section header. Empty state with fire emoji, heading, body, and "Add Friends" `PrimaryButton`. Inline error text. Absolute-positioned "Start Plan" FAB using `COLORS.accent` and safe area insets.
- **src/app/(tabs)/index.tsx** — Replaced Phase 2 placeholder with thin route shell: `export default function HomeTab() { return <HomeScreen />; }`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files created:
- FOUND: src/stores/useHomeStore.ts
- FOUND: src/hooks/useHomeScreen.ts
- FOUND: src/components/home/HomeFriendCard.tsx
- FOUND: src/screens/home/HomeScreen.tsx

Commits:
- FOUND: 766b531
- FOUND: 41f602f

TypeScript: zero errors (`npx tsc --noEmit` exits 0)
