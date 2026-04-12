---
phase: 08-iou-create-detail
plan: "01"
subsystem: types + tests
tags: [iou, types, playwright, tdd-scaffold]
dependency_graph:
  requires: [phase-05-database-migrations]
  provides: [IouGroup type, IouMember type, create_expense RPC type, iou-create-detail test scaffold]
  affects: [src/hooks/useExpenseCreate.ts, src/screens/expenses/]
tech_stack:
  added: []
  patterns: [Tables<T> alias pattern, Playwright test scaffold with intentional RED state]
key_files:
  created:
    - tests/visual/iou-create-detail.spec.ts
  modified:
    - src/types/database.ts
decisions:
  - "create_expense RPC typed in Functions section matching migration 0015 signature"
  - "IouGroup and IouMember follow existing Tables<T> alias pattern"
  - "Test scaffold intentionally fails (RED) — screens not yet built; this is correct and expected"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 8 Plan 01: IOU Type Scaffold & Test Scaffold Summary

IouGroup/IouMember type aliases + create_expense RPC signature added to database.ts; Playwright RED-state scaffold created for IOU-01, IOU-02, IOU-04.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add IOU type aliases and create_expense to database.ts | 03f9907 | src/types/database.ts |
| 2 | Create Playwright test scaffold for IOU Create & Detail | f2c210f | tests/visual/iou-create-detail.spec.ts |

## What Was Built

**Task 1 — database.ts additions:**

Two additions to `src/types/database.ts`:

1. `create_expense` entry in the `Functions` section (after `get_upcoming_birthdays`) — typed with all five args (`p_title`, `p_total_amount_cents`, `p_participant_ids`, `p_split_mode?`, `p_custom_cents?`) and `Returns: string` (iou_groups UUID).

2. `IouGroup` and `IouMember` type aliases at bottom of file following the existing `Tables<T>` alias pattern.

**Task 2 — Playwright test scaffold:**

`tests/visual/iou-create-detail.spec.ts` with 5 tests in RED state:
- IOU-01: Create expense screen reachable via + button on squad tab
- IOU-01: Submitting valid expense navigates to expense detail
- IOU-02: Custom split shows Remaining indicator
- IOU-04: Expense detail screen shows participant rows
- IOU-04: Settle button visible only to expense creator

Tests follow exact birthday-calendar.spec.ts structure (login helper, navigateToSquad helper, same credentials).

## Verification

- `grep "export type IouGroup" src/types/database.ts` — match found
- `grep "export type IouMember" src/types/database.ts` — match found
- `grep "create_expense:" src/types/database.ts` — match found in Functions block
- `npx tsc --noEmit` — exits 0
- `ls tests/visual/iou-create-detail.spec.ts` — file exists
- Playwright tests: intentionally fail (RED state — screens not yet built in Wave 2+)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan only adds types and test scaffolding. No UI or data-rendering code was created.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Test credentials follow established pattern (T-08-P01-01 accepted in threat model).

## Self-Check: PASSED
