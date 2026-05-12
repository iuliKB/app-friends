---
phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
plan: 03
subsystem: navigation
tags: [expo-router, route-topology, stack-screen, chat-route]

# Dependency graph
requires:
  - phase: none
    provides: existing root-level route convention (src/app/plans/_layout.tsx + Stack.Screen entry in src/app/_layout.tsx)
provides:
  - src/app/chat/room.tsx route file mounted at root Stack level (sibling of (tabs))
  - src/app/chat/_layout.tsx Stack layout mirroring plans/_layout.tsx (themed header chrome)
  - <Stack.Screen name="chat" options={{ headerShown: false }} /> entry in RootLayoutStack inside auth-protected block
affects: [30-04, 30-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 30 chat route topology — ChatRoomScreen mounts at root Stack regardless of entry path; URL /chat/room?... resolves identically because expo-router file-based routing collapses src/app/chat/room.tsx and src/app/(tabs)/chat/room.tsx to the same path"
    - "Per-directory _layout.tsx convention extended to chat/ (now consistent with plans/, friends/, squad/, profile/)"

key-files:
  created:
    - src/app/chat/room.tsx
    - src/app/chat/_layout.tsx
  modified:
    - src/app/_layout.tsx
    - (rename: src/app/(tabs)/chat/room.tsx removed)

key-decisions:
  - "Hoist (not keep-in-place) — eliminates the assumption-#2 dual-mount risk surfaced by Opus 4.7 Agent 2 in CONTEXT.md; with the route at root level, ChatRoomScreen is structurally never under the Tabs navigator"
  - "chat/_layout.tsx leaves default headerShown intact (no headerShown: false) so chat/room.tsx's navigation.setOptions({ title: friend_name }) renders the per-route title via the Stack header chrome; the root-level Stack.Screen entry uses headerShown: false because the nested Stack provides the header"
  - "Stack.Screen name=\"chat\" lives inside <Stack.Protected guard={!!session && !needsProfileSetup}> alongside plans — chat requires auth + complete profile; no presentation: 'modal' because chat is a regular push, not a modal"
  - "No callsite URL changes — /chat/room?... continues to resolve identically; Plan 05 owns the openChat() migration of the 13 inline call sites"

patterns-established:
  - "Phase 30 route hoist pattern: when a screen is reachable from multiple navigator branches, move its route file to the root level so it always mounts above the tab bar — preferable to relying on a navigator-state inspection guard"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-05-12
---

# Phase 30 Plan 03: Hoist /chat/room to Root Stack Summary

**Moved the chat-room route from `src/app/(tabs)/chat/room.tsx` to `src/app/chat/room.tsx`, added `src/app/chat/_layout.tsx` mirroring `src/app/plans/_layout.tsx`, and registered a new `<Stack.Screen name="chat" options={{ headerShown: false }} />` inside the auth-protected block of `RootLayoutStack` — so `ChatRoomScreen` now always mounts at the root Stack level regardless of entry path, structurally eliminating the dual-mount risk from outside-tabs callers.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-12T23:53:46Z
- **Completed:** 2026-05-12T23:55:11Z
- **Tasks:** 3 (no TDD — pure route-topology change)
- **Files created:** 2
- **Files modified:** 1
- **Files deleted:** 1 (preserved as rename to new location)

## Accomplishments

- `src/app/chat/room.tsx` exists with verbatim copy of the old route content (no behavior change, no Provider wrapping, no header override at the route level)
- `src/app/(tabs)/chat/room.tsx` no longer exists — git tracked the move as a 100% rename
- `src/app/chat/_layout.tsx` mirrors `src/app/plans/_layout.tsx` byte-for-byte except for the component name (`ChatStackLayout` vs `PlansStackLayout`); themed `headerStyle` / `headerTintColor` / `headerShadowVisible: false` with default `headerShown` (so per-route titles set via `navigation.setOptions` render correctly)
- `src/app/_layout.tsx` declares `<Stack.Screen name="chat" options={{ headerShown: false }} />` immediately after the `plans` entry, inside the existing `<Stack.Protected guard={!!session && !needsProfileSetup}>` block — preserving the auth + profile-complete guard for chat
- URL `/chat/room?...` continues to resolve identically — every existing callsite still works without modification
- Tab `(tabs)/chat/` directory now contains only `_layout.tsx` and `index.tsx` (the chat list tab is preserved)
- Zero new tsc errors introduced

## Task Commits

Each task was committed atomically:

1. **Task 1: Hoist route file** — `b8851e7` (refactor) — git rename: `src/app/(tabs)/chat/room.tsx` → `src/app/chat/room.tsx`
2. **Task 2: Create src/app/chat/_layout.tsx** — `8583c62` (feat) — 15 lines mirroring `plans/_layout.tsx`
3. **Task 3: Register chat Stack.Screen** — `68fe389` (feat) — single-line insertion inside `Stack.Protected` block

## Files Created/Modified

- `src/app/chat/room.tsx` (22 lines) — root-level route delegating to `ChatRoomScreen`; verbatim copy of the old `(tabs)/chat/room.tsx`
- `src/app/chat/_layout.tsx` (15 lines) — Stack layout with themed header chrome (mirrors plans/_layout.tsx)
- `src/app/_layout.tsx` — added one line: `<Stack.Screen name="chat" options={{ headerShown: false }} />` inside `<Stack.Protected guard={!!session && !needsProfileSetup}>`
- `src/app/(tabs)/chat/room.tsx` — deleted (recorded by git as a rename to the new location)

## Decisions Made

- **Hoist over keep-in-place:** chose to move the route to root Stack level rather than rely on `useNavigationStore` alone (Plan 04 defense-in-depth). Rationale: keep-in-place would require the bar-hide guard to absorb expo-router 55's behavior of pushing `/chat/room` from a root-Stack sibling — a topology-dependent invariant. Hoisting eliminates the dual-mount risk at the structural level; the store-driven bar is then a clean independent layer.
- **chat/_layout.tsx leaves `headerShown` at its default (true):** the chat route file calls `navigation.setOptions({ title: friend_name })` to render per-chat titles; the Stack layout provides the themed chrome (background colour, tint, no shadow). Setting `headerShown: false` here would suppress the title and produce a chromeless screen — the opposite of the plans/_layout.tsx convention.
- **Root-level `Stack.Screen name="chat"` uses `headerShown: false`:** the per-route header is owned by `chat/_layout.tsx` + `chat/room.tsx`'s `navigation.setOptions`. Mirroring the `plans` entry's `headerShown: false` keeps the two route groups consistent.
- **Stay inside `<Stack.Protected guard={!!session && !needsProfileSetup}>`:** chat needs both a session AND a completed profile (same conditions as plans). No `presentation: 'modal'` — chat is a regular push.
- **No callsite changes:** Plan 05 owns the openChat() migration; URLs are identical from the old and new file locations because expo-router resolves both to `/chat/room`.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks completed without auto-fix invocations.

## Issues Encountered

None. The git rename detection worked cleanly: Task 1's commit shows as a 100% rename rather than a separate add+delete pair.

## User Setup Required

None — pure source-code change. No Supabase migration, no environment-variable changes, no native rebuild required (URL routing is identical; only the in-memory navigator topology changed).

## Next Phase Readiness

- **Plan 04** (CustomTabBar refactor + ChatRoomScreen.useFocusEffect writer) can now rely on the route living at root Stack level — when the user enters chat from PlanDashboard's "Open Chat" pill, the screen will mount as a sibling of `(tabs)`, not nested below it. Combined with Plan 04's `useNavigationStore`-driven hide logic, the bar is structurally + state-driven hidden over chat.
- **Plan 05** (callsite migration to `openChat`) is unaffected by this hoist — every URL string `/chat/room?...` still works.
- No callsites changed in this plan — zero ripple effects in src/.

## Known Stubs

None — the route file is fully implemented (verbatim from the old location) and the layout file mirrors an established, working analog.

## Threat Flags

None — no new network surface, no auth path changes, no schema changes. The auth gate (`<Stack.Protected guard={!!session && !needsProfileSetup}>`) is preserved by placing the new `Stack.Screen` inside the same Protected block; chat remains gated identically to plans.

## Self-Check

Verification of summary claims:

- `[ -f src/app/chat/room.tsx ]` → FOUND
- `[ -f src/app/chat/_layout.tsx ]` → FOUND
- `[ ! -f src/app/(tabs)/chat/room.tsx ]` → CONFIRMED DELETED
- `grep -F 'Stack.Screen name="chat" options={{ headerShown: false }}' src/app/_layout.tsx` → FOUND (1)
- `grep -F 'headerShown: false' src/app/chat/_layout.tsx` → ABSENT (0, as required)
- `git log --oneline | grep b8851e7` → FOUND (Task 1)
- `git log --oneline | grep 8583c62` → FOUND (Task 2)
- `git log --oneline | grep 68fe389` → FOUND (Task 3)
- `npx tsc --noEmit 2>&1 | grep -E "(src/app/_layout\.tsx|src/app/chat/)" | grep -v __tests__ | wc -l` → 0 (zero production-file errors)

## Self-Check: PASSED

---
*Phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers*
*Plan: 03*
*Completed: 2026-05-12*
