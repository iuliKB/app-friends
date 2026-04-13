---
phase: 09-iou-list-summary
plan: 02
subsystem: ui
tags: [react-native, expo-router, iou, expense-tracking, navigation]

# Dependency graph
requires:
  - phase: 09-01
    provides: useIOUSummary, useExpensesWithFriend, BalanceRow, ExpenseHistoryRow hooks and components

provides:
  - IOUCard dashboard component (Goals tab card, aggregate net balance)
  - /squad/expenses balance index screen
  - /squad/expenses/friend/[id] per-friend history screen
  - Stack.Screen registrations for both new routes in _layout.tsx

affects:
  - 09-03 (IOUCard wired into squad.tsx Goals tab)
  - 10-squad-dashboard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FlatList with RefreshControl and ListEmptyComponent for list screens
    - Stack.Screen dynamic title via options prop inside screen body
    - Route params parsed with parseInt guard (Pitfall 5 pattern)
    - IOUCard data-ownership: parent owns hook, passes IOUSummaryData prop

key-files:
  created:
    - src/components/squad/IOUCard.tsx
    - src/app/squad/expenses/index.tsx
    - src/app/squad/expenses/friend/[id].tsx
  modified:
    - src/app/squad/_layout.tsx

key-decisions:
  - "IOUCard receives IOUSummaryData prop from parent (data-ownership pattern matching BirthdayCard/StreakCard)"
  - "expenses/index Stack.Screen name (not expenses) required for Expo Router file-system routing of index.tsx"
  - "netAmountCents route param display-only (T-09-P02-01 accept disposition) — authoritative data always from RPC"
  - "parseInt(netAmountCents ?? '0', 10) guard for route param string-to-int conversion"

patterns-established:
  - "IOUCard: Pressable card with loading skeleton, aggregate display (owed/owe/settled), tap → /squad/expenses"
  - "Balance index: SafeAreaView + ScreenHeader + FlatList with per-friend BalanceRow rows"
  - "History screen: net balance strip (48px, surface.card) + FlatList with ExpenseHistoryRow, dynamic Stack.Screen title"

requirements-completed:
  - IOU-03
  - IOU-05

# Metrics
duration: ~2min
completed: 2026-04-13
---

# Phase 9 Plan 02: IOU List & Summary — IOUCard + Balance Index + Per-Friend History Screens

**IOUCard dashboard component + /squad/expenses balance index + /squad/expenses/friend/[id] history screen + Stack navigator registration**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-13T11:23:18Z
- **Completed:** 2026-04-13T11:25:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `IOUCard` component matching `BirthdayCard`/`StreakCard` visual pattern: Pressable card with `IOUCardSkeleton`, aggregate net balance display ("You're owed $X" green / "You owe $X" red / "All settled up!" empty state), tap navigates to `/squad/expenses`
- Registered `expenses/index` and `expenses/friend/[id]` Stack.Screen entries in `_layout.tsx` with correct Expo Router file-system routing names
- Created `/squad/expenses` balance index screen: `SafeAreaView` + `ScreenHeader` + `FlatList` with `BalanceRow` rows, `EmptyState` ("All settled up!" / "No unsettled balances with friends."), pull-to-refresh, error state
- Created `/squad/expenses/friend/[id]` per-friend history screen: 48px net balance strip (`surface.card` background, signed amount in green/red), `FlatList` with `ExpenseHistoryRow`, dynamic title via `Stack.Screen`, pull-to-refresh, error state
- All route params parsed safely (`parseInt(netAmountCents ?? '0', 10)` guard per Pitfall 5)
- TypeScript compile: zero errors (`npx tsc --noEmit` clean)

## Task Commits

1. **Task 1: IOUCard component + _layout.tsx route registration** — `00ac27f` (feat)
2. **Task 2: Balance index screen + per-friend expense history screen** — `592c0dd` (feat)

## Files Created/Modified

- `src/components/squad/IOUCard.tsx` — New: IOUCard with skeleton, aggregate balance display, tap navigation
- `src/app/squad/_layout.tsx` — Added `expenses/index` and `expenses/friend/[id]` Stack.Screen entries
- `src/app/squad/expenses/index.tsx` — New: IOU balance index screen with FlatList + BalanceRow
- `src/app/squad/expenses/friend/[id].tsx` — New: per-friend history screen with net balance strip + FlatList + ExpenseHistoryRow

## Decisions Made

- `IOUCard` receives `IOUSummaryData` prop from parent — data-ownership pattern matches `BirthdayCard`/`StreakCard`; parent controls hook lifecycle
- `Stack.Screen name="expenses/index"` (not `"expenses"`) — Expo Router maps `expenses/index.tsx` to this exact name; using `"expenses"` would not match
- `netAmountCents` route param treated as display-only (T-09-P02-01 accept disposition) — authoritative net balance always from `get_iou_summary()` RPC

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired: `IOUCard` and balance index screen consume `useIOUSummary`; history screen consumes `useExpensesWithFriend`. The `IOUCard` is not yet placed in the Goals tab — that wiring happens in Plan 03.

## Threat Flags

No new security surface introduced beyond what is documented in the plan's threat model (T-09-P02-01 through T-09-P02-04).

## Self-Check: PASSED

- `src/components/squad/IOUCard.tsx` — FOUND
- `src/app/squad/expenses/index.tsx` — FOUND
- `src/app/squad/expenses/friend/[id].tsx` — FOUND
- `src/app/squad/_layout.tsx` updated — FOUND (expenses/index + expenses/friend/[id])
- Task 1 commit `00ac27f` — FOUND
- Task 2 commit `592c0dd` — FOUND
- `npx tsc --noEmit` — PASSED (zero errors)

---
*Phase: 09-iou-list-summary*
*Completed: 2026-04-13*
