---
phase: 260513-5as-add-usetabbarspacing-hook-for-consistent
reviewed: 2026-05-13T00:00:00Z
depth: quick
files_reviewed: 7
files_reviewed_list:
  - src/hooks/useTabBarSpacing.ts
  - src/hooks/__tests__/useTabBarSpacing.test.ts
  - src/screens/home/HomeScreen.tsx
  - src/screens/plans/PlansListScreen.tsx
  - src/app/(tabs)/profile.tsx
  - src/app/(tabs)/squad.tsx
  - src/components/squad/MemoriesTabContent.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Quick 260513-5as: Code Review Report

**Reviewed:** 2026-05-13
**Depth:** quick
**Files Reviewed:** 7
**Status:** clean

## Summary

Small, well-scoped refactor that centralises tab-screen bottom padding behind a new `useTabBarSpacing()` hook and migrates all six callsites. Reviewed against the explicit plan at `260513-5as-PLAN.md`. No bugs, security issues, or code-quality regressions found. Every plan invariant verified:

- **Hook correctness.** `useTabBarSpacing` imports `TAB_BAR_HEIGHT` and `TAB_BAR_BOTTOM_GAP` from `@/components/common/CustomTabBar` (no duplication), holds `BREATHING_ROOM = 24` locally and unexported as specified, and uses the idiomatic single-primitive selector `useNavigationStore((s) => s.currentSurface)` — referentially stable in Zustand v5, so no `shallow` required and no unnecessary re-renders.
- **Algebraic equivalence on Home preserved.** With `insets.bottom === 34` and surface `'tabs'`, formula yields `34 + 64 + 12 + 24 = 134`, identical to the previous `insets.bottom + 100 = 134`. The unit test pins this with `expect(result.current).toBe(134)`.
- **All 6 callsites consume the hook** (verified by grep: 10 `useTabBarSpacing` references across the 5 consumer files — 5 imports + 5 call sites; squad.tsx has 1 import + 1 call shared between Friends and Activity).
- **Magic numbers eliminated:** `insets.bottom + 100` in HomeScreen, `paddingBottom: 100` (+ dangling `eslint-disable`) in PlansListScreen, `insets.bottom + SPACING.xxl` in Squad Activity, `insets.bottom + SPACING.lg` in MemoriesTabContent — all gone.
- **`insets` references remaining are all legitimate.** Each of HomeScreen, PlansListScreen, profile.tsx, and squad.tsx still uses `insets.top` for top-edge padding — keeping `useSafeAreaInsets()` in those files is correct, not dead code. MemoriesTabContent, the only file where `insets` became fully unused, correctly drops both the `const insets = ...` line and the `from 'react-native-safe-area-context'` import (plan task 2E followed exactly).
- **Test mock coverage is sound.** The test file mocks `react-native-safe-area-context` (bottom: 34), `@expo/vector-icons`, `@/hooks/usePendingRequestsCount`, and `@/hooks/useInvitationCount` to short-circuit the transitive `CustomTabBar` import chain (`CustomTabBar.tsx` re-exports the constants but also pulls Expo modules at module load). It drives the real `useNavigationStore` via `getState().setSurface()` per the plan, with `beforeEach` calling `reset()`. Three test cases cover `'tabs'`, `'chat'`, and the loop over `('plan' | 'modal' | 'auth')` — matching the plan's required coverage.
- **Re-render efficiency.** Hook returns a `number` primitive. The selector is a single property read (`s.currentSurface`), also a primitive. Zustand v5 returns referentially stable primitives, so the hook only re-renders when the surface actually changes — exactly the desired behaviour (so the bottom padding shrinks/grows when the floating bar appears/disappears).
- **Squad Friends padding gain is a bug fix, not a regression.** The Friends SectionList previously had no bottom padding (`styles.listContent = { flexGrow: 1 }` only); per plan this was an intentional gap-fix where the last friend row used to hide under the floating bar. `flexGrow: 1` is preserved in the style sheet so `ListEmptyComponent` still centres vertically, and the inline `paddingBottom: bottomSpacing` is added via array form rather than mutating the style object.

## Notes (non-issues)

The four other `eslint-disable-next-line campfire/no-hardcoded-styles` comments still present in `PlansListScreen.tsx` (lines 110, 162, 177, 202) are unrelated to this refactor — they cover invite-banner `paddingVertical`, avatar gap, invite-title font size, and avatar negative-margin overlap. The plan only required removing the one on the now-deleted `paddingBottom: 100` line, which was done correctly. No action needed.

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
