---
phase: 260513-5as-add-usetabbarspacing-hook-for-consistent
verified: 2026-05-13T00:00:00Z
status: human_needed
score: 8/8 must-haves verified (static-code) — pending 1 device-level human check
overrides_applied: 0
human_verification:
  - test: "Open the running app on a physical device or simulator, navigate through Home, Plans, Profile, Squad → Friends, Squad → Activity, Squad → Memories. Scroll each list/screen to its end."
    expected: "The last row/content in every tab screen stops above the floating bottom-nav bar with comfortable breathing room (matching Home's existing feel). No content is hidden under the bar. When entering a chat/plan/modal surface, padding shrinks back to just the device safe-area inset."
    why_human: "Visual layout cannot be confirmed programmatically. The numeric formula equivalence is proven by the unit test (134 === 34 + 100), but pixel-level placement on real device chrome and the perceived 'breathing room' need an eye."
---

# Quick Task 260513-5as: useTabBarSpacing Hook — Verification Report

**Task Goal:** Add `useTabBarSpacing` hook for consistent bottom-nav clearance across tab screens. Centralize the formula behind one hook; apply at all tab-screen callsites; preserve home's pixel output exactly (zero visual regression).

**Verified:** 2026-05-13
**Status:** human_needed (all 8 static-code must-haves PASS; 1 device-level visual confirmation required)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A single `useTabBarSpacing()` hook in `src/hooks/` returns the correct paddingBottom for tab screens | VERIFIED | `src/hooks/useTabBarSpacing.ts` exists (19 lines); single named export `useTabBarSpacing(): number` at line 12 |
| 2 | When `currentSurface === 'tabs'`, the hook returns `insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 24` (numerically identical to HomeScreen's previous `insets.bottom + 100`) | VERIFIED | Hook body line 18: `return insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + BREATHING_ROOM;` with `BREATHING_ROOM = 24` (line 10). `TAB_BAR_HEIGHT=64`, `TAB_BAR_BOTTOM_GAP=12` imported (not redefined) from `@/components/common/CustomTabBar`. Algebraic equivalence: 64 + 12 + 24 = 100. Unit test pins `result.current === 134` for `insets.bottom === 34` |
| 3 | When `currentSurface !== 'tabs'`, the hook returns `insets.bottom` only | VERIFIED | Hook body lines 15-17: `if (surface !== 'tabs') { return insets.bottom; }`. Unit tests cover `'chat'` and a loop over `'plan'`/`'modal'`/`'auth'`, all asserting `result.current === 34` |
| 4 | All 6 callsites (Home ScrollView, PlansListScreen FlatList, Profile ScrollView, Squad Friends SectionList, Squad Activity ScrollView, Memories SectionList) consume the hook | VERIFIED | `grep -rn 'useTabBarSpacing()' <5 consumer files>` → 5 call sites (one per file; squad.tsx's single call feeds both Friends L456 and Activity L475). All 6 scroll containers use `bottomSpacing`: HomeScreen.tsx:205, PlansListScreen.tsx:437, profile.tsx:459, squad.tsx:456 (Friends) + :475 (Activity), MemoriesTabContent.tsx:288 |
| 5 | Pre-existing magic numbers (+100 in HomeScreen, +100 in PlansListScreen, SPACING.xxl in Squad Activity, SPACING.lg in Memories) are eliminated | VERIFIED | `grep -n 'insets.bottom + 100' src/screens/home/HomeScreen.tsx` → 0 matches. `grep -n 'paddingBottom: 100' src/screens/plans/PlansListScreen.tsx` → 0 matches. `grep -n 'insets.bottom + SPACING.xxl' src/app/(tabs)/squad.tsx` → 0 matches. `grep -n 'insets.bottom + SPACING.lg' src/components/squad/MemoriesTabContent.tsx` → 0 matches. PlansListScreen `listContent` style block (lines 81-83) cleaned to `{ paddingHorizontal: SPACING.lg }` only |
| 6 | The dangling `eslint-disable-next-line campfire/no-hardcoded-styles` comment in PlansListScreen.tsx:81 is removed | VERIFIED | The eslint-disable above the deleted `paddingBottom: 100` is gone. Four other `eslint-disable-next-line campfire/no-hardcoded-styles` directives remain in the file (lines 110, 162, 177, 202) — these cover unrelated hardcoded values (invite-banner padding, gap, font size, negative margin) and were explicitly out of scope per the plan |
| 7 | Hook test verifies both surface branches and uses real `useNavigationStore` (driven via `getState().setSurface()`) | VERIFIED | `src/hooks/__tests__/useTabBarSpacing.test.ts` (64 lines, 3 tests) imports the real `useNavigationStore`, mocks only the transitive native-module surface (`@expo/vector-icons`, `usePendingRequestsCount`, `useInvitationCount`, `react-native-safe-area-context`). `beforeEach` resets the store; each test calls `useNavigationStore.getState().setSurface(...)` before `renderHook`. Jest run: 3 passed, 3 total |
| 8 | Home screen produces identical pixel output (zero visual regression — user emphasized "homescreen is the ideal amount") | VERIFIED (static) — needs device confirmation | Algebraic proof: `insets.bottom + 64 + 12 + 24 = insets.bottom + 100`, identical to the pre-refactor HomeScreen value on the `'tabs'` surface. Unit test pins `134 === 34 + 100` for `insets.bottom === 34`. Visual confirmation on device deferred to human verification item below |

**Score:** 8/8 truths verified by static checks. Truth #8's runtime-pixel guarantee follows from #2 (algebraic) and the passing unit test, but the user's "homescreen is the ideal amount" assertion is a perceptual judgment that ultimately wants an eye on it.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/hooks/useTabBarSpacing.ts` | Hook returning `number`, ≥15 lines, exports `useTabBarSpacing` | VERIFIED | 19 lines. Single named export at line 12. Imports `TAB_BAR_HEIGHT`/`TAB_BAR_BOTTOM_GAP` from `@/components/common/CustomTabBar` (not redefined — `grep TAB_BAR_HEIGHT\s*=\s*64` returned 0 matches in this file). `BREATHING_ROOM = 24` defined module-locally and NOT exported. Uses `useNavigationStore((s) => s.currentSurface)` selector form verbatim |
| `src/hooks/__tests__/useTabBarSpacing.test.ts` | Unit tests for both surface branches, ≥20 lines, references `useTabBarSpacing` | VERIFIED | 64 lines. 3 tests cover `'tabs'`, `'chat'`, and `'plan'`/`'modal'`/`'auth'` loop. Jest run: PASS |
| `src/screens/home/HomeScreen.tsx` | ScrollView contentContainerStyle uses hook | VERIFIED | Import at L20, call at L54 (`const bottomSpacing = useTabBarSpacing();`), consumed at L205 (`{ paddingBottom: bottomSpacing }`). No `insets.bottom + 100` anywhere |
| `src/screens/plans/PlansListScreen.tsx` | FlatList contentContainerStyle uses hook | VERIFIED | Import at L17, call at L47, consumed at L437. `listContent` style block reduced to `{ paddingHorizontal: SPACING.lg }` (L81-83). No `paddingBottom: 100` and no dangling eslint-disable above it |
| `src/app/(tabs)/profile.tsx` | ScrollView gets bottom padding from hook | VERIFIED | Import at L33, call at L42, consumed at L459 (`{ paddingTop: SPACING.lg, paddingBottom: bottomSpacing }`) |
| `src/app/(tabs)/squad.tsx` | Friends SectionList + Activity ScrollView use hook | VERIFIED | Import at L28, single call at L59 (reused for both consumers). Friends at L456 (`[styles.listContent, { paddingBottom: bottomSpacing }]`), Activity at L475 (`[styles.activityContent, { paddingBottom: bottomSpacing }]`). `styles.listContent` still defines `flexGrow: 1` (L274-276) so the empty-state `ListEmptyComponent` continues to vertically center |
| `src/components/squad/MemoriesTabContent.tsx` | Memories SectionList uses hook | VERIFIED | Import at L18, call at L78, consumed at L288. `useSafeAreaInsets` import + call correctly dropped — `insets` was used only for the now-replaced paddingBottom |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useTabBarSpacing.ts` | `src/components/common/CustomTabBar.tsx` | `import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP }` | WIRED | Line 7 of hook file |
| `src/hooks/useTabBarSpacing.ts` | `src/stores/useNavigationStore.ts` | selector `useNavigationStore((s) => s.currentSurface)` | WIRED | Line 14 of hook file — exact idiomatic form per plan |
| `src/hooks/useTabBarSpacing.ts` | `react-native-safe-area-context` | `useSafeAreaInsets()` | WIRED | Line 6 (import) + line 13 (call) |
| `src/screens/home/HomeScreen.tsx` | `src/hooks/useTabBarSpacing.ts` | consumer of paddingBottom | WIRED | L20 import, L54 call, L205 consumption |
| `src/screens/plans/PlansListScreen.tsx` | `src/hooks/useTabBarSpacing.ts` | FlatList contentContainerStyle | WIRED | L17 import, L47 call, L437 consumption |
| `src/app/(tabs)/profile.tsx` | `src/hooks/useTabBarSpacing.ts` | ScrollView contentContainerStyle | WIRED | L33 import, L42 call, L459 consumption |
| `src/app/(tabs)/squad.tsx` | `src/hooks/useTabBarSpacing.ts` | Friends + Activity scroll containers | WIRED | L28 import, L59 call, L456 (Friends) + L475 (Activity) consumption |
| `src/components/squad/MemoriesTabContent.tsx` | `src/hooks/useTabBarSpacing.ts` | SectionList contentContainerStyle | WIRED | L18 import, L78 call, L288 consumption |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `useTabBarSpacing` hook | `surface` | `useNavigationStore((s) => s.currentSurface)` — real Zustand store, default `'tabs'` | Yes (live store value drives branch) | FLOWING |
| `useTabBarSpacing` hook | `insets` | `useSafeAreaInsets()` from `react-native-safe-area-context` provider | Yes (device chrome) | FLOWING |
| 6 callsites | `bottomSpacing` | live return value of `useTabBarSpacing()` consumed in `contentContainerStyle` arrays | Yes (rendered into each scroll container's bottom padding) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Hook tests pass | `unset NODE_OPTIONS && npx jest --testPathPatterns="useTabBarSpacing" --no-coverage` | `Test Suites: 1 passed, 1 total / Tests: 3 passed, 3 total` (0.615 s) | PASS |
| Algebraic equivalence on home (tabs surface) | Test #1: `expect(result.current).toBe(134)` with `insets.bottom === 34` | 134 === 34 + 100 (matches pre-refactor HomeScreen output exactly) | PASS |
| Surface fall-through to bare insets | Test #2 + #3: `'chat'`, `'plan'`, `'modal'`, `'auth'` all yield `34` | All four non-tabs surfaces return `insets.bottom` only | PASS |
| All callsite files reference the hook | `grep -rn 'useTabBarSpacing' <5 files>` | 10 references (5 imports + 5 calls — squad.tsx has 1 call serving both Friends and Activity, as planned) | PASS |
| No magic-number paddings remain in scope | `grep -n 'insets.bottom + 100\|paddingBottom: 100\|insets.bottom + SPACING.xxl\|insets.bottom + SPACING.lg' <5 files>` | 0 matches in any scroll-container paddingBottom site | PASS |
| Hook does not redefine tab-bar constants | `grep -n 'TAB_BAR_HEIGHT\s*=\s*64' src/hooks/useTabBarSpacing.ts` | 0 matches (constants imported, never redefined) | PASS |
| `styles.listContent` retains `flexGrow: 1` in squad.tsx | Read of `(tabs)/squad.tsx:274-276` | `listContent: { flexGrow: 1 }` preserved — empty-state centering intact | PASS |
| Eslint-disable above deleted `paddingBottom: 100` is gone | `grep -n 'eslint-disable-next-line campfire/no-hardcoded-styles' src/screens/plans/PlansListScreen.tsx` shows only L110/162/177/202 (unrelated to this task) | Line 81 area is clean | PASS |

### Anti-Patterns Found

None.

- The hook file has no TODO/FIXME/placeholder comments. The header comment is a real one-paragraph explanation of intent (matches the plan's documentation requirement).
- Test file mocks are scoped, named correctly, and limited to the transitive native-module surface required for the hook's import graph to resolve in jest — not a stub substitution for production behavior.
- All 6 callsites consume `bottomSpacing` directly inside live `contentContainerStyle` arrays — no hardcoded fallback empty values, no orphaned variables.
- `MemoriesTabContent.tsx` correctly drops both the now-unused `useSafeAreaInsets` call and its import (matches plan task 2E's conditional).
- Other 4 consumers correctly keep `useSafeAreaInsets()` because they still use `insets.top` elsewhere (paddingTop on each screen container) — confirmed by code review.

### Human Verification Required

#### 1. Tab-screen bottom clearance on device/simulator

**Test:** Launch the app on a physical device or simulator. Walk through each tab and its sub-views and scroll each list/screen to its end:

- Home (ScrollView)
- Plans → list view (FlatList)
- Profile (ScrollView)
- Squad → Friends tab (SectionList)
- Squad → Memories tab (SectionList)
- Squad → Activity tab (ScrollView)

Then enter a chat (or a plan/modal surface) and scroll to its bottom too.

**Expected:**
- On every tab screen, the last row of content stops above the floating bottom-nav bar with the same breathing room Home has today — nothing is hidden behind the bar.
- The new Squad → Friends bottom padding correctly clears the bar (previously the last friend row was hidden).
- When `currentSurface !== 'tabs'` (chat/plan/modal), the bottom padding shrinks back to just the device safe-area inset — content goes right to the bottom edge as it should on a full-screen surface.

**Why human:** Pixel-level placement against real device chrome is not testable programmatically. The unit test proves the formula evaluates to 134 for `insets.bottom = 34` (identical to the previous value), but the user explicitly framed the goal as "homescreen is the ideal amount" — a perceptual benchmark that wants an eye on every other tab to confirm parity.

### Gaps Summary

No automated gaps. All 8 must-haves verified by static analysis, grep evidence, and a passing unit test (3/3). The single outstanding item is a one-time visual confirmation on device/simulator — not a code defect.

---

_Verified: 2026-05-13_
_Verifier: Claude (gsd-verifier)_
