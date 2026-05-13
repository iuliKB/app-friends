---
phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
plan: 04
subsystem: navigation
tags: [zustand, navigation, custom-tab-bar, chat-room-screen, use-focus-effect, tdd]

# Dependency graph
requires:
  - phase: 30-01
    provides: useNavigationStore zustand slice (currentSurface, setSurface, reset)
  - phase: 30-03
    provides: src/app/chat/room.tsx hoisted to root Stack
provides:
  - CustomTabBar consumes useNavigationStore via selector — bar hides on any non-'tabs' surface
  - ChatRoomScreen useFocusEffect writer — sets 'chat' on focus, restores 'tabs' on blur cleanup
  - Producer-consumer wire-up that closes the Phase 30 root-cause bug
affects: [30-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 30 consumer/writer wire-up — CustomTabBar reads currentSurface via selector form; ChatRoomScreen pushes surface on focus and pops on blur via useFocusEffect"
    - "Mock theme extended with FONT_WEIGHT + RADII.pill (Rule 3 — required to render ChatRoomScreen in tests)"

key-files:
  created:
    - src/components/common/__tests__/CustomTabBar.test.tsx
    - src/screens/chat/__tests__/ChatRoomScreen.surface.test.tsx
  modified:
    - src/components/common/CustomTabBar.tsx
    - src/screens/chat/ChatRoomScreen.tsx
    - src/__mocks__/theme.js

key-decisions:
  - "Visibility predicate is `surface !== 'tabs'` (not `surface === 'chat'`) — future-proofs new full-screen surfaces (plan, modal, auth) so they don't need to update CustomTabBar"
  - "Selector form `useNavigationStore((s) => s.currentSurface)` chosen over destructure — destructure would re-render on every store change; selector keys on a single field"
  - "setSurface selector returns the stable setter only — pulling currentSurface in the same selector would cause every store update to re-render ChatRoomScreen"
  - "Bare `useCallback(...)` import (not `React.useCallback`) — matches the rest of ChatRoomScreen's hook-import convention (useEffect/useMemo/useRef/useState are all bare); locked in plan due to file consistency"
  - "useFocusEffect placed after useChatMembers + chatTodoData hooks but BEFORE the first conditional return (`if (error)` at line 426) — preserves rules-of-hooks ordering"
  - "Mock theme extension (FONT_WEIGHT + RADII.pill) scoped to src/__mocks__/theme.js — same precedent as Phase 29.1 Plan 04 (reanimated) and Plan 06 (LayoutAnimation)"

patterns-established:
  - "Phase 30 store-consumer pattern: read via selector at the top of the render function, return null inline based on a single surface comparison"
  - "Phase 30 store-writer pattern: useFocusEffect + useCallback([stableSetter]) wrapping setSurface('X') with cleanup returning setSurface('tabs')"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-05-13
---

# Phase 30 Plan 04: CustomTabBar Consumer + ChatRoomScreen Writer Summary

**Wired CustomTabBar.tsx as a consumer of `useNavigationStore` (replacing the broken nested-navigator-state inspection at lines 123-129 with a 2-line surface-equality check) and ChatRoomScreen.tsx as a writer that pushes `'chat'` on focus via `useFocusEffect` and restores `'tabs'` on blur cleanup — closing the Phase 30 root-cause bug where the bottom bar leaked through to the chat screen when entered from non-canonical paths (Squad → Memories → PlanDashboard → "Open Chat" pill).**

## Performance

- **Duration:** 5 min 17 s
- **Started:** 2026-05-13T00:04:12Z
- **Completed:** 2026-05-13T00:09:29Z
- **Tasks:** 2 (both TDD: RED → GREEN, no REFACTOR needed)
- **Files created:** 2 (both jest test scaffolds)
- **Files modified:** 3 (2 production files, 1 mock)
- **Commits:** 5 (2 RED test, 2 GREEN impl, 1 docs)

## Accomplishments

- **Task 1:** `CustomTabBar.tsx:123-129` 7-line nested-navigator-state guard replaced with 2 lines: `const surface = useNavigationStore((s) => s.currentSurface);` + `if (surface !== 'tabs') return null;`. Bar now hides on any non-`'tabs'` surface (future-proof for `'plan'` / `'modal'` / `'auth'` without further edits).
- **Task 2:** `ChatRoomScreen.tsx` now declares `useFocusEffect(useCallback(() => { setSurface('chat'); return () => setSurface('tabs'); }, [setSurface]))` — the canonical producer/cleanup pair. Bar hides on entry, restores on exit, for ALL 8 verification-anchor entry paths (CONTEXT.md §Verification anchor).
- **5 + 3 jest tests pass** (RED → GREEN for each task); full project test suite green at **96 passed, 24 suites**.
- **Zero new tsc errors** introduced; one pre-existing tsc error in `ChatRoomScreen.tsx` (line 72 `refetch` not on `UseChatRoomResult`) verified as pre-existing on `main` via `git stash` baseline and logged to `deferred-items.md`.

## Task Commits

Each task was committed atomically (TDD: test then feat), plus a docs commit:

1. **Task 1 RED: failing visibility test for CustomTabBar** — `88725f8` (test)
2. **Task 1 GREEN: CustomTabBar useNavigationStore consumer** — `36b9d42` (feat)
3. **Task 2 RED: failing surface-writer test for ChatRoomScreen** — `f4730a4` (test) — also extended `src/__mocks__/theme.js` (Rule 3)
4. **Task 2 GREEN: ChatRoomScreen useFocusEffect writer** — `ff918d7` (feat)
5. **Docs: pre-existing tsc error logged** — `286be31` (docs)

REFACTOR step skipped for both tasks — implementation matched the analog on first write; no cleanup required.

## Files Created/Modified

**Created:**
- `src/components/common/__tests__/CustomTabBar.test.tsx` — 5 render-based tests asserting bar visibility for each NavigationSurface literal (93 lines)
- `src/screens/chat/__tests__/ChatRoomScreen.surface.test.tsx` — 3 tests that intercept the `useFocusEffect` callback via expo-router mock, then invoke it manually to verify surface flips and cleanup restore (140 lines)

**Modified:**
- `src/components/common/CustomTabBar.tsx` — added 1 import + replaced 7 lines with 2 lines (net −4 lines)
- `src/screens/chat/ChatRoomScreen.tsx` — added `useCallback` to react named-imports, added `useFocusEffect` to expo-router named-imports, added `useNavigationStore` import after `useAuthStore`, added 8-line useFocusEffect block (net +15 lines)
- `src/__mocks__/theme.js` — added `FONT_WEIGHT` const + `RADII.pill` (required for ChatRoomScreen render in jest; Rule 3 deviation scoped to mock file)

## Decisions Made

1. **Visibility predicate is `surface !== 'tabs'` (not `surface === 'chat'`).** Future-proofs new full-screen surfaces — when Phase 31+ adds `'plan'` / `'modal'` / `'auth'`, those screens just push their surface into the store and the bar hides automatically. No edit to CustomTabBar required. This matches the plan's CRITICAL constraints section.
2. **Selector form everywhere (no destructure).** Both consumers use `useNavigationStore((s) => s.x)`. Destructure (`const { setSurface } = useNavigationStore()`) would re-render every consumer on every store change. The selector pattern is locked across all 5 existing stores and applies to the new one verbatim.
3. **`setSurface`-only selector in ChatRoomScreen.** Pulling both `currentSurface` and `setSurface` in the same selector would re-render the heavy chat screen on every other screen's surface push. Since `setSurface` is a stable zustand setter, including it in the `[setSurface]` dep array satisfies exhaustive-deps without triggering re-runs.
4. **Bare `useCallback(...)` import-style locked.** Plan §LOCKED IMPORT STYLE forbade `React.useCallback`. Used named import `useCallback` alphabetised into the existing react destructure (line 1: `useCallback, useEffect, useMemo, useRef, useState`). Matches the file's existing convention.
5. **useFocusEffect placement after useChatMembers and chatTodoData hooks, before first conditional return.** Preserves rules-of-hooks ordering on every render path. The `if (error)` block at line 426 is the first conditional return; our new hook sits at line 126 — well clear of any conditional branch.
6. **Mock theme extension scoped to `src/__mocks__/theme.js`.** Adding `FONT_WEIGHT` const + `RADII.pill` was required to render ChatRoomScreen in jest (it imports both). This is the same Rule 3 precedent set by Phase 29.1 Plan 04 (reanimated mock extension) and Plan 06 (LayoutAnimation mock extension) — scoped to the mock file, zero production-code impact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking import] Extended src/__mocks__/theme.js with FONT_WEIGHT + RADII.pill**
- **Found during:** Task 2 RED test execution
- **Issue:** `TypeError: Cannot read properties of undefined (reading 'regular')` at ChatRoomScreen.tsx:403 (`FONT_WEIGHT.regular`) and a parallel undefined `RADII.pill` — the theme mock did not expose either symbol, so ChatRoomScreen could not mount in jest.
- **Fix:** Added `const FONT_WEIGHT = { regular: '400', semibold: '600', bold: '700' };` and `pill: 18` to the RADII const + included `FONT_WEIGHT` in the module.exports list. Both values mirror `src/theme/typography.ts` and `src/theme/radii.ts` verbatim.
- **Files modified:** `src/__mocks__/theme.js`
- **Commit:** `f4730a4` (bundled with the RED test commit since the mock fix was needed for the RED test to even fail-for-the-right-reason)
- **Scope:** Mock file only — zero production-code impact. Precedent: Phase 29.1 Plan 04 (reanimated) and Plan 06 (LayoutAnimation) extensions.

### Out-of-scope deferred items

**Pre-existing tsc error: `UseChatRoomResult.refetch` does not exist on type.** Verified pre-existing on `main` via `git stash` (the count of `ChatRoomScreen.tsx` tsc errors was already 1 before Plan 30-04's edits). Plan 30-04 introduces zero new tsc errors. Logged to `.planning/phases/30-.../deferred-items.md`. Out of scope per scope-boundary rule.

## Issues Encountered

None — both RED tests failed for the expected reason (no useNavigationStore reader / no useFocusEffect writer), and both GREEN passes were single-edit single-rerun completions. The mock-extension was a Rule 3 auto-fix during RED phase, not a blocker.

## User Setup Required

None — pure source-code change. No Supabase migration, no environment variables, no native rebuild required. Surface visibility takes effect on next app run.

## Next Phase Readiness

- **Plan 30-05** (migrate 13 callsites to `openChat()`) is unblocked. With Plan 30-04 shipped, ChatRoomScreen now self-declares `'chat'` on focus regardless of which `/chat/room?...` URL pushed it onto the stack — so all 13 callsites benefit from the fix automatically.
- The **8-entry-path verification anchor** from CONTEXT.md is now satisfied at the source-code level for every entry point that pushes `/chat/room?...`:
  1. Chat tab → chat row → chat → back — focus fires, bar hides; blur fires, bar restores
  2. Squad Friends sub-tab → friend → DM → back — same
  3. Plans tab → plan → "Open Chat" pill → back — same
  4. Squad Memories → plan section → PlanDashboard → "Open Chat" pill → back — **the originating bug, now fixed**
  5. Home screen friend chip (OverflowChip / FriendSwipeCard / HomeFriendCard / RadarBubble) → DM → back — same
  6. Birthday page → wish chat → back — same
  7. Friend detail page → DM → back — same
  8. Push notification deep link → chat → back — same

  Hardware smoke test deferred to v1.3 Hardware Verification Gate (project_hardware_gate_deferral.md memory rule).
- The **dual-mount risk** from Plan 30-03's hoist + Plan 30-04's store-driven hide gives defense-in-depth: even if expo-router 55 ever mounted ChatRoomScreen at two navigator levels, the bar would still hide because BOTH mounts would push `'chat'` to the same store on focus.

## Known Stubs

None — both production files are fully implemented; both tests cover real contract behavior (visibility predicate + focus/blur cleanup).

## Threat Flags

None — no new network surface, no auth path changes, no schema changes, no Storage interaction. The store is in-memory ephemeral state; surface values are not user-supplied and never round-trip to Supabase.

## TDD Gate Compliance

Both tasks followed the RED → GREEN gate sequence:

- **Task 1:** `test(30-04)` commit `88725f8` (RED, 4/5 tests fail) → `feat(30-04)` commit `36b9d42` (GREEN, 5/5 tests pass) ✓
- **Task 2:** `test(30-04)` commit `f4730a4` (RED, 3/3 tests fail) → `feat(30-04)` commit `ff918d7` (GREEN, 3/3 tests pass) ✓

REFACTOR step skipped for both tasks — implementation matched the analog on first write.

## Self-Check

Verification of summary claims:

- `[ -f src/components/common/CustomTabBar.tsx ]` → FOUND
- `[ -f src/screens/chat/ChatRoomScreen.tsx ]` → FOUND
- `[ -f src/components/common/__tests__/CustomTabBar.test.tsx ]` → FOUND
- `[ -f src/screens/chat/__tests__/ChatRoomScreen.surface.test.tsx ]` → FOUND
- `[ -f src/__mocks__/theme.js ]` → FOUND
- `git log --oneline | grep 88725f8` → FOUND (Task 1 RED)
- `git log --oneline | grep 36b9d42` → FOUND (Task 1 GREEN)
- `git log --oneline | grep f4730a4` → FOUND (Task 2 RED)
- `git log --oneline | grep ff918d7` → FOUND (Task 2 GREEN)
- `git log --oneline | grep 286be31` → FOUND (docs deferred-items update)
- `npx jest --testPathPatterns="CustomTabBar|ChatRoomScreen.surface|useNavigationStore" --no-coverage` → 12 passed, 0 failed
- `npx jest --no-coverage` (full) → 96 passed, 0 failed
- `grep -cF "useNavigationStore((s) => s.currentSurface)" src/components/common/CustomTabBar.tsx` → 1
- `grep -cF "if (surface !== 'tabs') return null;" src/components/common/CustomTabBar.tsx` → 1
- `grep -cF "useNavigationStore((s) => s.setSurface)" src/screens/chat/ChatRoomScreen.tsx` → 1
- `grep -cF "setSurface('chat');" src/screens/chat/ChatRoomScreen.tsx` → 1
- `grep -cF "return () => setSurface('tabs');" src/screens/chat/ChatRoomScreen.tsx` → 1
- `grep -cE "nestedRoute|nestedState|nestedIndex" src/components/common/CustomTabBar.tsx` → 0 (old logic removed)
- `grep -cF "React.useCallback" src/screens/chat/ChatRoomScreen.tsx` → 0 (bare form locked)
- `npx tsc --noEmit 2>&1 | grep -c "CustomTabBar.tsx"` → 0
- `npx tsc --noEmit 2>&1 | grep -c "ChatRoomScreen.tsx"` → 1 (pre-existing, logged in deferred-items.md)

## Self-Check: PASSED

---
*Phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers*
*Plan: 04*
*Completed: 2026-05-13*
