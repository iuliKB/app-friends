---
phase: 08-iou-create-detail
plan: "03"
subsystem: ui
tags: [supabase, react-native, hooks, iou, expo-haptics, expo-router]

# Dependency graph
requires:
  - phase: 08-01
    provides: "database.ts IouGroup/IouMember types and create_expense RPC signature"
  - phase: 08-02
    provides: "IOU screen components (ExpenseCreateScreen, ExpenseDetailScreen) that consume these hooks"
provides:
  - "useExpenseCreate: form state + create_expense RPC call + haptic + navigation"
  - "useExpenseDetail: three-query expense fetch + settle() action with composite PK"
  - "FriendEntry, ExpenseCreateData, ParticipantEntry, ExpenseDetail, ExpenseDetailData interfaces"
affects: [08-04, 09-iou-list-summary, 10-squad-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-query sequential fetch pattern for expense detail (iou_groups → iou_members → profiles)"
    - "Per-row loading state (settleLoading) on participant entries for optimistic UI"
    - "Payer auto-include guard before RPC call (Pitfall 6 pattern)"
    - "Composite PK settle pattern: .eq('iou_group_id').eq('user_id') — never .eq('id')"

key-files:
  created:
    - src/hooks/useExpenseCreate.ts
    - src/hooks/useExpenseDetail.ts
  modified: []

key-decisions:
  - "canSubmit acts as DoS guard: submitting=true included in guard expression (T-08-P03-04)"
  - "settle() reads fresh state via refetch() after success rather than optimistic update — ensures server-side allSettled calculation is always accurate"
  - "friends loaded via get_friends RPC (returns accepted friends only) mapped to FriendEntry[] for picker"

patterns-established:
  - "useExpenseCreate: sessionCount-style guard (submitting=true disables canSubmit) for double-tap protection"
  - "useExpenseDetail: per-row settleLoading as field on ParticipantEntry, updated immutably"

requirements-completed: [IOU-01, IOU-02, IOU-04]

# Metrics
duration: 3min
completed: 2026-04-12
---

# Phase 8 Plan 03: IOU Data Hooks Summary

**useExpenseCreate (form state + create_expense RPC + payer auto-include guard) and useExpenseDetail (three-query fetch + composite-PK settle) — both TypeScript strict, haptics wired**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-12T09:56:11Z
- **Completed:** 2026-04-12T09:59:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- useExpenseCreate manages all form state (title, rawDigits, splitMode, selectedFriendIds, customAmounts), derives totalCents/allocatedCents, loads friends via get_friends RPC, calls create_expense atomically, fires haptic and navigates to detail screen on success
- useExpenseDetail fetches iou_groups + iou_members + profiles in three sequential queries, builds ParticipantEntry[] with per-row settleLoading, settle() uses composite PK (iou_group_id + user_id), fires haptic on success
- Both hooks match useUpcomingBirthdays pattern: userId guard, loading/error/refetch, useCallback + useEffect

## Task Commits

Each task was committed atomically:

1. **Task 1: Build useExpenseCreate hook** - `0470f49` (feat)
2. **Task 2: Build useExpenseDetail hook with settle action** - `15c1bfd` (feat)

## Files Created/Modified

- `src/hooks/useExpenseCreate.ts` - Form state management + create_expense RPC + navigation
- `src/hooks/useExpenseDetail.ts` - Expense detail fetch + settle() with composite PK

## Decisions Made

- canSubmit includes `!submitting` so the submitting flag acts as a double-tap guard (T-08-P03-04 mitigation)
- settle() calls refetch() after success rather than patching local state directly — ensures allSettled is always computed from server truth
- Friends loaded via get_friends RPC which filters to accepted friends only; mapped to FriendEntry[] (subset of FriendWithStatus)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — tsc passes clean on both hooks, all acceptance criteria verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both hooks are ready for Plan 04 (screens) to consume via direct import
- useExpenseCreate: call `submit()` after form is filled; navigate target is `/squad/expenses/[groupId]`
- useExpenseDetail: call `useExpenseDetail(expenseId)` from the detail screen; `settle(participantUserId)` for settle button handler
- isCreator flag drives settle button visibility in the detail screen

---
*Phase: 08-iou-create-detail*
*Completed: 2026-04-12*
