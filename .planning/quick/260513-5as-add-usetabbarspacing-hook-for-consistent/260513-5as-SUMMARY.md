---
phase: 260513-5as
plan: 01
subsystem: hooks/layout
tags: [hooks, tab-bar, layout, refactor, quick-task]
dependency-graph:
  requires:
    - "@/components/common/CustomTabBar (TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP exports)"
    - "@/stores/useNavigationStore (currentSurface selector)"
    - "react-native-safe-area-context (useSafeAreaInsets)"
  provides:
    - "useTabBarSpacing(): number — single source of truth for tab-screen paddingBottom"
  affects:
    - "HomeScreen, PlansListScreen, Profile, Squad (Friends+Activity), MemoriesTabContent"
tech-stack:
  added: []
  patterns:
    - "Surface-aware layout hook (mirrors CustomTabBar's read of currentSurface)"
key-files:
  created:
    - "src/hooks/useTabBarSpacing.ts (17 lines)"
    - "src/hooks/__tests__/useTabBarSpacing.test.ts (50 lines)"
  modified:
    - "src/screens/home/HomeScreen.tsx (+2/-1)"
    - "src/screens/plans/PlansListScreen.tsx (+3/-3)"
    - "src/app/(tabs)/profile.tsx (+5/-2)"
    - "src/app/(tabs)/squad.tsx (+4/-5)"
    - "src/components/squad/MemoriesTabContent.tsx (+3/-3)"
decisions:
  - "Hook test mocks usePendingRequestsCount + useInvitationCount + @expo/vector-icons (transitive deps of CustomTabBar) — Rule 3 fix; matches the CustomTabBar.test.tsx mock layout exactly"
  - "MemoriesTabContent useSafeAreaInsets import + call removed — insets was used in exactly one place (the SectionList paddingBottom), so removing the magic-number paddingBottom made the import dead"
  - "Other 4 files (HomeScreen, PlansListScreen, profile, squad) kept useSafeAreaInsets — still needed for paddingTop: insets.top on each screen container"
metrics:
  duration_minutes: ~10
  completed_at: "2026-05-13T01:05:57Z"
---

# Quick Task 260513-5as: useTabBarSpacing hook for consistent bottom-nav clearance — Summary

**One-liner:** Replaced four different magic-number paddings with a single surface-aware `useTabBarSpacing()` hook composed of `useSafeAreaInsets()` + the existing `TAB_BAR_HEIGHT`/`TAB_BAR_BOTTOM_GAP` exports + 24px breathing room.

## What was built

1. **`src/hooks/useTabBarSpacing.ts`** — 17 lines, single named export. Imports `TAB_BAR_HEIGHT` (64) and `TAB_BAR_BOTTOM_GAP` (12) from `@/components/common/CustomTabBar` (no redefinition). Imports `useNavigationStore` for the `currentSurface` selector. Body returns `insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 24` when surface is `'tabs'`, falls through to `insets.bottom` otherwise. `BREATHING_ROOM = 24` is a non-exported module constant.

2. **`src/hooks/__tests__/useTabBarSpacing.test.ts`** — 3 tests, all passing. Asserts `result.current === 134` for `insets.bottom === 34` on the tabs surface (this is the algebraic proof of zero visual regression on Home). Asserts `result.current === 34` on `chat` plus a loop over `plan`/`modal`/`auth`. Mocks `@expo/vector-icons`, `usePendingRequestsCount`, `useInvitationCount`, and `react-native-safe-area-context` — the same set CustomTabBar.test.tsx mocks, because the hook transitively imports CustomTabBar.

3. **6 callsite migrations** across 5 files (HomeScreen ScrollView, PlansListScreen FlatList, Profile ScrollView, Squad Friends SectionList + Activity ScrollView, MemoriesTabContent SectionList). Every callsite now consumes the same `bottomSpacing` value. Four old magic-number formulas (`insets.bottom + 100`, `paddingBottom: 100`, `insets.bottom + SPACING.xxl`, `insets.bottom + SPACING.lg`) are gone.

## Commits

| Task | Commit  | Subject                                                                        | Files |
| ---- | ------- | ------------------------------------------------------------------------------ | ----- |
| 1    | a508055 | `feat(hooks): add useTabBarSpacing for consistent tab-screen bottom clearance` | 2     |
| 2    | a21f125 | `refactor: route tab-screen bottom padding through useTabBarSpacing`           | 5     |

## Test output

```
PASS src/hooks/__tests__/useTabBarSpacing.test.ts
  useTabBarSpacing (quick 260513-5as)
    ✓ returns insets.bottom + 100 (== insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 24) when surface === tabs
    ✓ returns only insets.bottom when surface === chat
    ✓ returns only insets.bottom for plan/modal/auth surfaces

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

Combined with CustomTabBar suite: 8 passed, 8 total.

## Verification grep evidence

```
$ grep -n 'insets.bottom + 100' src/screens/home/HomeScreen.tsx          → 0 matches OK
$ grep -n 'paddingBottom: 100' src/screens/plans/PlansListScreen.tsx     → 0 matches OK
$ grep -n 'insets.bottom + SPACING.xxl' src/app/(tabs)/squad.tsx          → 0 matches OK
$ grep -n 'insets.bottom + SPACING.lg' src/components/squad/MemoriesTabContent.tsx → 0 matches OK
$ grep -n 'TAB_BAR_HEIGHT\s*=\s*64' src/hooks/useTabBarSpacing.ts         → 0 matches OK (no redefinition)
$ grep -rn 'useTabBarSpacing' <all 5 callsite files> | wc -l              → 10 lines OK (2/file × 5 files)
```

The one dangling `eslint-disable-next-line campfire/no-hardcoded-styles` at PlansListScreen.tsx:81 (above the deleted `paddingBottom: 100`) was removed. PlansListScreen still has 4 other unrelated `eslint-disable-next-line` directives elsewhere in the file — those are for separate hardcoded values (`paddingVertical: 14`, `gap: 10`, `fontSize: 18`, `marginRight: -6`) that were already in the file and out of scope for this task.

## Lint baseline diff

Eslint on the 6 touched files reports the same 4 errors + 2 warnings before and after this task:
- `src/app/(tabs)/squad.tsx` — ReadonlyArray (L43), prettier (L108, L208), stale eslint-disable (L323)
- `src/screens/plans/PlansListScreen.tsx` — hardcoded gap (L247), hardcoded color (L258)

All pre-existing. Captured in `.planning/quick/260513-5as-add-usetabbarspacing-hook-for-consistent/deferred-items.md`. The two transient prettier errors I introduced during Task 2 (multi-line `contentContainerStyle` arrays) were fixed before commit.

`npx tsc --noEmit` returns 658 errors after this task vs. 644 before — the 14-error delta is exactly the per-test jest globals pattern (`Cannot find name 'jest'`, `Cannot find name 'describe'`, etc.) that affects every test file in this project. The new hook file itself contributes zero tsc errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Test fixture: transitive native-module mocks**

- **Found during:** Task 1, first jest run
- **Issue:** The hook imports `TAB_BAR_HEIGHT`/`TAB_BAR_BOTTOM_GAP` from `CustomTabBar.tsx`, which transitively requires `@expo/vector-icons` (native module chain) and `usePendingRequestsCount`/`useInvitationCount` (each importing `expo-router`). Jest crashed with `Cannot read properties of undefined (reading 'EventEmitter')` before reaching any test body.
- **Fix:** Added the same module-scope `jest.mock(...)` blocks for `@expo/vector-icons`, `@/hooks/usePendingRequestsCount`, and `@/hooks/useInvitationCount` that `src/components/common/__tests__/CustomTabBar.test.tsx` already uses for the identical transitive surface. Mocks are scoped to the test file — zero production-code impact.
- **Files modified:** `src/hooks/__tests__/useTabBarSpacing.test.ts`
- **Commit:** Folded into Task 1 commit `a508055`.

**2. [Rule 1 — Bug] Prettier formatting on two new lines**

- **Found during:** Task 2 verification (`npx eslint ... --max-warnings=0`)
- **Issue:** Initial draft of `profile.tsx:455` put a 3-element style array on one long line; `squad.tsx:473-475` kept the pre-existing 4-line `contentContainerStyle` formatting after the inline-object body shrank below the prettier wrap threshold.
- **Fix:** Wrapped `profile.tsx` array across 4 lines; collapsed `squad.tsx` array to one line. Matches prettier's preferences and the project's existing one-line-when-short / multi-line-when-long array style.
- **Files modified:** `src/app/(tabs)/profile.tsx`, `src/app/(tabs)/squad.tsx`
- **Commit:** Folded into Task 2 commit `a21f125`.

### Other notes

- **MemoriesTabContent dead `useSafeAreaInsets`** was removed as the plan anticipated (Task 2 step E says "if not [used elsewhere], drop the call and import"). Grep confirmed `insets` was used in exactly one place before the change, so both the call and the `import { useSafeAreaInsets }` line were dropped.

- **Plan's strict `--max-warnings=0` verification will report failure** when run against the 5 production callsite files, but every reported issue is pre-existing and matches the baseline (verified via `git stash`/`stash pop` comparison). The new hook file itself + all touched lines lint clean. Captured in `deferred-items.md`.

## Zero visual regression on Home — algebraic proof

```
insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + BREATHING_ROOM
= insets.bottom + 64           + 12                  + 24
= insets.bottom + 100
= the value HomeScreen had before this task
```

Unit test asserts `result.current === 134` for `insets.bottom === 34` (iPhone X). Matches the previous behavior bit-for-bit on the `'tabs'` surface.

## Self-Check: PASSED

- `src/hooks/useTabBarSpacing.ts` — FOUND (17 lines)
- `src/hooks/__tests__/useTabBarSpacing.test.ts` — FOUND (50 lines, 3 tests passing)
- `src/screens/home/HomeScreen.tsx` — FOUND, contains `useTabBarSpacing` import + call
- `src/screens/plans/PlansListScreen.tsx` — FOUND, contains `useTabBarSpacing`
- `src/app/(tabs)/profile.tsx` — FOUND, contains `useTabBarSpacing`
- `src/app/(tabs)/squad.tsx` — FOUND, contains `useTabBarSpacing`
- `src/components/squad/MemoriesTabContent.tsx` — FOUND, contains `useTabBarSpacing`
- Commit `a508055` — FOUND in git log
- Commit `a21f125` — FOUND in git log
