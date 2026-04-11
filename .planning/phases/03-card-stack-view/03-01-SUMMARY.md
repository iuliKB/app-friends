---
phase: 03-card-stack-view
plan: "01"
subsystem: layout, testing
tags: [gesture-handler, playwright, root-layout, test-scaffold]
dependency_graph:
  requires: []
  provides: [GestureHandlerRootView-root-wrapper, card-stack-test-scaffold]
  affects: [src/app/_layout.tsx, tests/visual/card-stack.spec.ts]
tech_stack:
  added: []
  patterns: [GestureHandlerRootView-root-wrapper, playwright-visual-regression-scaffold]
key_files:
  modified:
    - src/app/_layout.tsx
  created:
    - tests/visual/card-stack.spec.ts
decisions:
  - GestureHandlerRootView replaces root View in _layout.tsx — identical style prop, transparent pass-through wrapper
  - Test scaffold uses same login/screenshot pattern as design-system.spec.ts for consistency
metrics:
  duration: "~8 minutes"
  completed: "2026-04-11T11:53:34Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 3 Plan 01: Prerequisites — GestureHandlerRootView + Test Scaffold Summary

GestureHandlerRootView wraps the app root and Playwright card-stack test scaffold created covering CARD-01/03/05.

## What Was Built

**Task 1 — GestureHandlerRootView root wrapper:**
- Added `import { GestureHandlerRootView } from 'react-native-gesture-handler'` to `_layout.tsx`
- Replaced `<View style={{ flex: 1, backgroundColor: COLORS.surface.base }}>` with `<GestureHandlerRootView ...>` in the main return
- Splash screen `LinearGradient` branch (`if (!ready)`) left untouched
- Style prop is identical — visual output unchanged

**Task 2 — Playwright test scaffold:**
- Created `tests/visual/card-stack.spec.ts` with `login()` and `switchToCardsView()` helpers
- 3 test cases: deck renders (CARD-01), skip button visible/tappable (CARD-03), counter label visible (CARD-05)
- Screenshot baselines (`card-stack-deck.png`, `card-stack-after-skip.png`) generated on first run with `--update-snapshots`
- Tests will fail gracefully until CardStackView is implemented in Plans 02-03 — expected at this wave

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 5f657fa | feat(03-01): wrap root layout with GestureHandlerRootView |
| 2 | b49ef59 | feat(03-01): add Playwright test scaffold for card stack view |

## Verification

1. `grep "GestureHandlerRootView" src/app/_layout.tsx` — 3 lines (import + opening tag + closing tag)
2. `<View style={{ flex: 1, backgroundColor: COLORS.surface.base }}>` no longer appears in main return
3. `tests/visual/card-stack.spec.ts` exists with 3 tests, no TypeScript errors
4. Splash screen `LinearGradient` branch unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan is infrastructure only. No UI data flows involved.

## Threat Flags

None — GestureHandlerRootView is a transparent pass-through wrapper with no auth/data logic (T-03-01 accepted in plan threat model).

## Self-Check: PASSED
