---
phase: quick-260416-w3y
plan: 01
subsystem: navigation
tags: [quick-fix, squad, iou, navigation]
dependency_graph:
  requires: []
  provides: [add-friend-entry-point, iou-create-entry-point]
  affects: [src/app/(tabs)/squad.tsx, src/app/squad/expenses/index.tsx]
tech_stack:
  added: []
  patterns: [ScreenHeader rightAction, absolute-positioned FAB]
key_files:
  modified:
    - src/app/(tabs)/squad.tsx
    - src/app/squad/expenses/index.tsx
decisions:
  - Squad header person-add icon uses existing Ionicons + TouchableOpacity imports — no new deps
  - FAB uses absolute positioning inside SafeAreaView flex:1 container — standard RN overlay pattern
metrics:
  duration: ~5 minutes
  completed: 2026-04-16
---

# Quick Fix 260416-w3y: Fix Add-Friend Button and IOU FAB

**One-liner:** Squad header gains person-add icon routing to /friends/add; IOU Balances screen gains accent FAB routing to /squad/expenses/create.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add person-add rightAction to Squad ScreenHeader | 8c2fa7b | src/app/(tabs)/squad.tsx |
| 2 | Add FAB to IOU Balances index screen | 0f19ec9 | src/app/squad/expenses/index.tsx |

## Summary

Both navigation entry points were unreachable despite the underlying routes being live:

1. **Squad header** — `ScreenHeader` in `squad.tsx` now carries a `rightAction` prop with a `person-add-outline` Ionicons icon. Tapping it pushes `/friends/add`. No new imports required — `TouchableOpacity`, `Ionicons`, `router`, and `COLORS` were all already present.

2. **IOU Balances FAB** — `expenses/index.tsx` now renders an absolute-positioned circular FAB (56×56, `COLORS.interactive.accent` background, `add` icon) inside the success-state `SafeAreaView`. Tapping pushes `/squad/expenses/create`. Added `TouchableOpacity` to the existing RN import and `Ionicons` from `@expo/vector-icons`. Three hardcoded pixel values guarded with `eslint-disable-next-line campfire/no-hardcoded-styles` per project convention.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/app/(tabs)/squad.tsx — modified, committed 8c2fa7b
- src/app/squad/expenses/index.tsx — modified, committed 0f19ec9
- `npx tsc --noEmit` — zero errors both tasks
