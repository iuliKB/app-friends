---
phase: 260513-5as-add-usetabbarspacing-hook-for-consistent
verified: 2026-05-13T00:00:00Z
status: passed
score: 9/9 must-haves verified (static-code) + 2/2 human-verification items confirmed by user 2026-05-13
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/8
  followup_commit: 6bc55d8
  gaps_closed:
    - "ChatListScreen.tsx (src/screens/chat/) was not in the original callsite_map; user reported the chat list still overflowed the floating bottom bar. Commit 6bc55d8 added the hook to this 7th callsite — static checks PASS"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open the running app on a physical device or simulator, navigate through Home, Plans, Profile, Squad → Friends, Squad → Activity, Squad → Memories. Scroll each list/screen to its end."
    expected: "The last row/content in every tab screen stops above the floating bottom-nav bar with comfortable breathing room (matching Home's existing feel). No content is hidden under the bar. When entering a chat/plan/modal surface, padding shrinks back to just the device safe-area inset."
    why_human: "Visual layout cannot be confirmed programmatically. The numeric formula equivalence is proven by the unit test (134 === 34 + 100), but pixel-level placement on real device chrome and the perceived 'breathing room' need an eye."
    result: approved
    approved_on: 2026-05-13
  - test: "Open the Chats tab. Scroll the SectionList to its end with several conversations present. Also force the empty state (e.g. clear or filter to zero matches) and confirm the EmptyState centering still works."
    expected: "The last chat row stops above the floating bottom-nav bar with the same breathing room as Home — no row hidden behind the bar. In the empty state, the EmptyState component remains vertically centered (driven by styles.emptyList.flex: 1) and its content is not clipped by the bar."
    why_human: "Follow-up commit 6bc55d8 added ChatListScreen to the hook's consumer set. Static checks confirm the diff is applied correctly and identically structured to the squad.tsx Friends SectionList, but the chat-tab visual feel was the specific surface the user flagged — needs an eye to confirm parity with Home."
    result: approved
    approved_on: 2026-05-13
---

# Quick Task 260513-5as: useTabBarSpacing Hook — Verification Report

**Task Goal:** Add `useTabBarSpacing` hook for consistent bottom-nav clearance across tab screens. Centralize the formula behind one hook; apply at all tab-screen callsites; preserve home's pixel output exactly (zero visual regression).

**Verified:** 2026-05-13
**Status:** passed (9/9 static-code must-haves PASS; both human-verification items approved by user 2026-05-13)
**Re-verification:** Yes — followup commit 6bc55d8 added ChatListScreen; user-approved on 2026-05-13

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

---

## Supplementary Verification — ChatListScreen follow-up (commit 6bc55d8)

**Context:** The original 6-callsite plan shipped without covering `src/screens/chat/ChatListScreen.tsx`. The user reported the chat list still overflowed the floating bottom bar. Commit `6bc55d8` ("fix(chat): route ChatListScreen padding through useTabBarSpacing") added the hook to this 7th consumer.

**Verified:** 2026-05-13 (supplementary pass)
**Commit:** 6bc55d8 — 1 file changed, 7 insertions(+), 1 deletion(-)

### Observable Truth #9

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 9 | `ChatListScreen.tsx` SectionList content clears the floating bottom-nav bar via `useTabBarSpacing()` on both populated and empty branches | VERIFIED (static) | Hook imported at L14 from `@/hooks/useTabBarSpacing` (matches the 5 other callsites' alias-path style). Hook invoked unconditionally at top of component (L28, between `useSafeAreaInsets()` on L27 and `useAuthStore` on L29). `contentContainerStyle` on the SectionList (L278-282) is the array form `sections.length === 0 ? [styles.emptyList, { paddingBottom: bottomSpacing }] : { paddingBottom: bottomSpacing }` — both ternary branches apply `paddingBottom: bottomSpacing` unconditionally. Visual confirmation deferred to human-verification item #2 below |

**Cumulative score:** 9/9 truths verified by static checks (the original 8 + this addition). One human-verification item already covered Home/Plans/Profile/Squad/Memories visual feel; a second item below covers the Chats tab specifically.

### Per-Check Verdict Table (ChatListScreen)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Hook import is correct — uses `@/hooks/useTabBarSpacing` (not relative path), matches 5 other callsites' style | PASS | L14: `import { useTabBarSpacing } from '@/hooks/useTabBarSpacing';` — identical alias to HomeScreen L20, PlansListScreen L17, profile L33, squad L28, MemoriesTabContent L18 |
| 2 | Hook invoked once at top of component, not inside render/conditional/callback | PASS | L28: `const bottomSpacing = useTabBarSpacing();` — sits at top of `ChatListScreen` function body alongside `useTheme`, `useRouter`, `useSafeAreaInsets`, `useAuthStore`, etc. No re-invocation; not nested in any branch |
| 3 | `paddingBottom: bottomSpacing` applied unconditionally on both branches of the `sections.length === 0` ternary | PASS | L278-282: empty branch is `[styles.emptyList, { paddingBottom: bottomSpacing }]`, populated branch is `{ paddingBottom: bottomSpacing }`. Both include `paddingBottom: bottomSpacing` |
| 4 | `styles.emptyList` (`flex: 1`) preserved on empty branch — EmptyState vertical centering not regressed | PASS | L181-183: `emptyList: { flex: 1 }` still in StyleSheet. L280 spreads `styles.emptyList` first inside the array so `flex: 1` survives composition with `{ paddingBottom: bottomSpacing }` |
| 5 | No other padding hacks (e.g. `paddingBottom: 100`, `insets.bottom + 100`, `insets.bottom + SPACING.xxl`, `insets.bottom + SPACING.lg`) remain in ChatListScreen.tsx | PASS | `grep -nE 'paddingBottom:\s*100\|insets\.bottom\s*\+\s*100\|insets\.bottom\s*\+\s*SPACING\.(xxl\|lg)' src/screens/chat/ChatListScreen.tsx` → 0 matches |
| 6 | Hook returns the correct value on the chat tab — `useNavigationStore.currentSurface === 'tabs'` while the Chats tab is displayed (the floating bar is visible), so the hook returns `insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 24` (== `insets.bottom + 100`) | PASS | The Chats tab is part of the `(tabs)` group — surface stays `'tabs'` while on it. Hook source L12-19 confirms branch: `if (surface !== 'tabs') return insets.bottom; return insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + BREATHING_ROOM;`. Yields parity with Home's pre-refactor `insets.bottom + 100`. (When the user taps a row and `openChat` pushes the chat/room route, `currentSurface` transitions to `'chat'` and the spacing collapses to `insets.bottom` — correct behavior) |
| 7 | No type regressions — array form `[styles.emptyList, { paddingBottom: bottomSpacing }]` is a standard `StyleProp<ViewStyle>` accepted by SectionList | PASS | Same pattern as squad.tsx Friends SectionList L456 (`[styles.listContent, { paddingBottom: bottomSpacing }]`) and other migrated screens. RN `SectionListProps.contentContainerStyle` accepts `StyleProp<ViewStyle>`, which covers both `ViewStyle` and `RegisteredStyle<ViewStyle> \| RecursiveArray<…>`. The original pre-fix code already used a conditional that returned either `styles.emptyList` or `undefined`, so the typing surface is unchanged — and the existing passing TypeScript baseline (no new errors per the original plan's tsc check) carries forward |
| 8 | No dead imports — `useSafeAreaInsets` is still used (L4 import, L27 call, L222 and L248 consumption via `{ paddingTop: insets.top }`) | PASS | Import at L4 retained correctly; `insets.top` is still consumed in both the loading-skeleton container (L222) and the main render container (L248). Removing `useSafeAreaInsets` here would have been wrong |

### Diff Verification

`git show --stat 6bc55d8` confirms: 1 file changed, 7 insertions, 1 deletion. The diff aligns 1:1 with the user-reported description (import added, hook called, contentContainerStyle widened to apply `paddingBottom: bottomSpacing` on both branches of the ternary). No collateral edits.

### Additional Human Verification Required

The supplementary human-verification entry for the Chats tab is in the frontmatter `human_verification` array (second item). Summary: scroll the Chats SectionList to its end with several conversations present, confirm the last row clears the floating bar with the same breathing room as Home; also force the empty state to verify the `EmptyState` component remains vertically centered.

### Supplementary Gaps Summary

No automated gaps for the ChatListScreen addition. All 8 check dimensions PASS. Status remains `human_needed` — the visual-feel confirmation now spans the original 6 screens plus the Chats tab.

---

_Supplementary verification: 2026-05-13_
_Commit verified: 6bc55d8_
_Verifier: Claude (gsd-verifier)_
