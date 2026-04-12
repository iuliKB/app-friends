---
phase: 08-iou-create-detail
plan: "04"
subsystem: iou-screens
tags: [iou, expenses, routing, squad-tab, react-native]
dependency_graph:
  requires:
    - 08-02-PLAN.md  # IOU components (ExpenseHeroCard, ParticipantRow, SplitModeControl, RemainingIndicator)
    - 08-03-PLAN.md  # useExpenseCreate, useExpenseDetail hooks
  provides:
    - /squad/expenses/create route screen
    - /squad/expenses/[id] route screen
    - Squad tab '+' entry point
  affects:
    - src/app/squad/_layout.tsx
    - src/app/(tabs)/squad.tsx
tech_stack:
  added: []
  patterns:
    - Thin route shells wiring hooks + components (birthdays.tsx pattern)
    - ScreenHeader rightAction for tab-level navigation entry points
    - FlatList inside ScrollView with scrollEnabled=false for friend picker
    - Skeleton loading rows for expense detail
key_files:
  created:
    - src/app/squad/expenses/create.tsx
    - src/app/squad/expenses/[id].tsx
  modified:
    - src/app/squad/_layout.tsx
    - src/app/(tabs)/squad.tsx
decisions:
  - EmptyState uses icon/heading/body props (not title/message) — fixed during execution
  - PrimaryButton uses title prop (not label); onPress wrapped in void to satisfy () => void type
  - ScreenHeader has no built-in safe area; paddingTop insets stay on root View
  - '+' icon sized at FONT_SIZE.xxl (24) per D-10 spec
metrics:
  duration_seconds: 113
  completed_date: "2026-04-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 2
---

# Phase 8 Plan 04: Route Assembly — IOU Create & Detail Screens Summary

**One-liner:** Wired useExpenseCreate and useExpenseDetail hooks into two new route screens and added a '+' Squad tab entry point via ScreenHeader rightAction.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Register expense screens in squad stack + build route shells | 00d7721 |
| 2 | Add '+' entry point button to Squad tab (D-10) | 1007883 |
| 3 | Visual verification checkpoint | approved |

## What Was Built

### src/app/squad/expenses/create.tsx
Full expense creation screen. Single ScrollView with `keyboardShouldPersistTaps="handled"`. Sections: title TextInput, amount TextInput with live currency formatting via `formatCentsDisplay`/`parseCentsFromInput`, friend picker FlatList (`scrollEnabled=false`) with checkbox rows, SplitModeControl toggle, custom split per-person TextInputs with RemainingIndicator, error display, and PrimaryButton submit. All state from `useExpenseCreate` hook.

### src/app/squad/expenses/[id].tsx
Expense detail screen. Three rendering branches: skeleton (ExpenseHeroCardSkeleton + 3 placeholder rows), error/empty (with pull-to-refresh), and success (ExpenseHeroCard + participant count label + ParticipantRow list). Uses `useLocalSearchParams` for route id, `useExpenseDetail` for data and settle action.

### src/app/squad/_layout.tsx
Added two `<Stack.Screen>` entries: `expenses/create` (title: "New Expense") and `expenses/[id]` (title: "Expense Detail").

### src/app/(tabs)/squad.tsx
Imported `ScreenHeader` and added it as the first child of the root View (before SquadTabSwitcher). The `rightAction` is a TouchableOpacity with an `add` Ionicons icon (`COLORS.interactive.accent`, `FONT_SIZE.xxl`) navigating to `/squad/expenses/create`. `accessibilityLabel="Create expense"` added for accessibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EmptyState prop names mismatch**
- **Found during:** Task 1 type-check
- **Issue:** Plan used `title`/`message` props; actual EmptyState component uses `icon`/`heading`/`body`
- **Fix:** Changed to `icon="👥" heading="No friends yet" body="Add friends to split expenses with them"`
- **Files modified:** src/app/squad/expenses/create.tsx
- **Commit:** 00d7721

**2. [Rule 1 - Bug] PrimaryButton prop name + async type mismatch**
- **Found during:** Task 1 type-check
- **Issue:** Plan used `label` prop; actual PrimaryButton uses `title`. Also `form.submit` is `() => Promise<void>` but PrimaryButton expects `() => void`
- **Fix:** Changed `label` to `title`; wrapped onPress in `() => { void form.submit(); }`
- **Files modified:** src/app/squad/expenses/create.tsx
- **Commit:** 00d7721

## Known Stubs

None — all data is wired to live hooks (useExpenseCreate, useExpenseDetail).

## Threat Surface Scan

No new network endpoints or auth paths introduced. Route screens consume existing hooks which already have RLS enforcement at the Supabase layer (documented in T-08-P04-01 through T-08-P04-04 in plan threat model).

## Self-Check: PASSED

All 3 tasks complete. Human visual verification approved. Automated checks passed: tsc exits 0, all files exist, all grep matches confirmed.
