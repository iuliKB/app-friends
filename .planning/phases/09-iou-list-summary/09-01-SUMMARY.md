---
phase: 09-iou-list-summary
plan: 01
subsystem: ui
tags: [react-native, supabase, hooks, iou, expense-tracking]

# Dependency graph
requires:
  - phase: 05-database-migrations
    provides: iou_groups, iou_members tables, get_iou_summary RPC (migration 0015)
  - phase: 08-iou-create-detail
    provides: create_expense RPC type, IouGroup/IouMember aliases in database.ts
provides:
  - get_iou_summary Function type in database.ts
  - useIOUSummary hook (RPC wrapper for net balance index + IOUCard aggregate)
  - useExpensesWithFriend hook (multi-step query for per-friend expense history)
  - BalanceRow component (signed amount display, avatar, tappable)
  - ExpenseHistoryRow component (settled row dimming at opacity 0.45, tappable)
affects:
  - 09-02 (IOU balance index screen, per-friend history screen)
  - 09-03 (IOUCard dashboard card)
  - 10-squad-dashboard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RPC hook pattern: useCallback with userId guard, setLoading/setError/setRows, useEffect trigger
    - Multi-step parallel query: Promise.all for independent iou_groups + iou_members fetches after sequential membership checks
    - Settled row dimming: static opacity 0.45 wrapper View (no Animated) for isFullySettled rows

key-files:
  created:
    - src/hooks/useIOUSummary.ts
    - src/hooks/useExpensesWithFriend.ts
    - src/components/iou/BalanceRow.tsx
    - src/components/iou/ExpenseHistoryRow.tsx
  modified:
    - src/types/database.ts

key-decisions:
  - "get_iou_summary type added to database.ts Functions manually (same pattern as get_upcoming_birthdays in Phase 7)"
  - "useExpensesWithFriend uses 2 sequential membership checks then Promise.all for groups + members — correct RLS traversal order"
  - "BalanceRow signed label: +{absAmount} → you (green) / -{absAmount} ← you (red) per D-03"
  - "ExpenseHistoryRow settled dimming: static View wrapper with opacity 0.45, no Animated"

patterns-established:
  - "BalanceRow: Pressable with AvatarCircle(36) + nameColumn + signed amount, minHeight 44"
  - "ExpenseHistoryRow: settled rows wrapped in View opacity 0.45, Pressable inside, minHeight 44"

requirements-completed:
  - IOU-03
  - IOU-05

# Metrics
duration: 15min
completed: 2026-04-13
---

# Phase 9 Plan 01: IOU List & Summary — Type Foundation + Data Hooks + Row Components

**get_iou_summary RPC type, useIOUSummary and useExpensesWithFriend hooks, BalanceRow and ExpenseHistoryRow presentational components — typed foundation for Plans 02–03**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-13T11:17:41Z
- **Completed:** 2026-04-13
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `get_iou_summary` Function type to `database.ts` with correct return shape (`friend_id`, `display_name`, `avatar_url`, `net_amount_cents`, `unsettled_count`)
- Created `useIOUSummary` hook following the `useUpcomingBirthdays` canonical pattern — exposes both per-friend `rows` for the index screen and aggregated `netCents`/`unsettledCount` for IOUCard
- Created `useExpensesWithFriend` hook with 3-step multi-query approach: sequential membership validation then `Promise.all` for parallel group + member fetches, `isFullySettled` computed per expense
- Created `BalanceRow` with signed amount display (`+$X → you` green / `-$X ← you` red), `AvatarCircle` size 36, `minHeight: 44`
- Created `ExpenseHistoryRow` with settled row dimming via static `opacity: 0.45` wrapper View, `Intl.DateTimeFormat` date formatting, `minHeight: 44`
- TypeScript compile: zero errors (`npx tsc --noEmit` clean)

## Task Commits

1. **Task 1: Add get_iou_summary type + useIOUSummary hook** - `6f805ae` (feat)
2. **Task 2: useExpensesWithFriend hook + BalanceRow + ExpenseHistoryRow components** - `abe20ae` (feat)

## Files Created/Modified

- `src/types/database.ts` — Added `get_iou_summary` entry in Functions section after `create_expense`
- `src/hooks/useIOUSummary.ts` — New: RPC hook, exports `useIOUSummary`, `IOUSummaryRow`, `IOUSummaryData`
- `src/hooks/useExpensesWithFriend.ts` — New: multi-step query hook, exports `useExpensesWithFriend`, `ExpenseWithFriend`, `ExpensesWithFriendData`
- `src/components/iou/BalanceRow.tsx` — New: signed amount row component with `AvatarCircle`
- `src/components/iou/ExpenseHistoryRow.tsx` — New: expense history row with settled dimming

## Decisions Made

- Signed label format `+{absAmount} → you` / `-{absAmount} ← you` (D-03) — directional arrows make debt direction scannable
- `useExpensesWithFriend` uses 2 sequential `.from('iou_members')` steps before `Promise.all` — required for correct RLS traversal (step 1 validates caller membership; step 2 uses those IDs to find friend overlap)
- `ExpenseHistoryRow` settled dimming via static `View style={{ opacity: 0.45 }}` wrapper — no `Animated`, avoids useNativeDriver complexity, per UI-SPEC mandate

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All typed contracts ready for Plan 02 (balance index screen + per-friend history screen) and Plan 03 (IOUCard + squad.tsx integration)
- `useIOUSummary` exports `rows` (for FlatList in index screen) and `netCents`/`unsettledCount` (for IOUCard aggregate display)
- `useExpensesWithFriend(friendId)` ready to be called from the history screen with `friendId` from route params
- `BalanceRow` and `ExpenseHistoryRow` ready to be composed into FlatList `renderItem` callbacks

---
*Phase: 09-iou-list-summary*
*Completed: 2026-04-13*
