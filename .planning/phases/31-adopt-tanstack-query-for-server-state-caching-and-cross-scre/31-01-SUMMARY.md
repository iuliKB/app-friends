---
phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre
plan: 01
subsystem: infra
tags: [tanstack-query, react-query, netinfo, supabase-realtime, react-native, expo, caching]

# Dependency graph
requires:
  - phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
    provides: stable routing layer for verifying cross-screen reactivity in later waves
provides:
  - QueryClient factory + provider mounted at app root
  - Central query-key taxonomy (single source of truth)
  - Ref-counted Supabase Realtime → query cache bridge (one channel per scope)
  - Auth-state bridge that clears query cache on SIGNED_OUT (T-31-04 mitigation)
  - Opt-in focus-refetch hook (useRefreshOnFocus) for screens that need it
  - Test helper (createTestQueryClient) for Wave 2+ hook tests
  - focusManager + onlineManager wired via AppState + NetInfo
  - useReactQueryDevTools mounted (auto-gated on __DEV__)
affects: [31-02-habits-pilot, 31-03-home-aggregates, 31-04-plans, 31-05-friends-expenses, 31-06-status-polls, 31-07-chat, 31-08-persistence-cleanup]

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-query ^5.100.10"
    - "@react-native-community/netinfo 11.5.2"
    - "@dev-plugins/react-query ^0.4.0"
  patterns:
    - "Lazy useState(() => createQueryClient()) for HMR-safe cache lifetime"
    - "Module-scope ref-counted registry for Supabase channel dedup (subscribeXxx convention)"
    - "Hybrid Realtime strategy: UPDATE → invalidateQueries, INSERT/DELETE → setQueryData (aggregations always invalidate)"
    - "Per-user query keys (queryKeys.<vertical>.list(userId)) for defense-in-depth on sign-out"
    - "Test mock vars prefixed with mock* to satisfy jest babel hoisting"

key-files:
  created:
    - src/lib/queryClient.ts
    - src/lib/queryKeys.ts
    - src/lib/realtimeBridge.ts
    - src/lib/authBridge.ts
    - src/hooks/useRefreshOnFocus.ts
    - src/__mocks__/createTestQueryClient.tsx
    - src/lib/__tests__/queryClient.test.ts
    - src/lib/__tests__/realtimeBridge.test.ts
    - src/lib/__tests__/authBridge.test.ts
  modified:
    - src/app/_layout.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "staleTime: 60_000 set as global default; per-query overrides allowed (A6 locked)"
  - "Hybrid Realtime: UPDATE invalidates, INSERT/DELETE setQueryData (A7 locked); habit_checkins aggregates always invalidate"
  - "QueryClient is a factory not a singleton — lazy useState in _layout.tsx keeps cache lifetime tied to RootLayout, HMR-safe"
  - "Auth bridge calls removeQueries() (not invalidateQueries) on SIGNED_OUT to avoid 401-refetch storm with expired session"
  - "Existing supabase.auth.onAuthStateChange block in _layout.tsx left unchanged; authBridge runs alongside (multiple listeners are supported)"
  - "Test mock vars renamed to mock-prefix to satisfy jest babel-plugin hoisting rule (Rule 1 auto-fix in Task 4 test)"

patterns-established:
  - "Pattern 1: QueryClient factory at src/lib/queryClient.ts — every consumer reaches createQueryClient()"
  - "Pattern 2: Query-key taxonomy at src/lib/queryKeys.ts — inline arrays forbidden, hierarchical with .all() for prefix invalidation"
  - "Pattern 3: subscribeXxx convention — every Supabase channel lifecycle lives in src/lib/realtimeBridge.ts, ref-counted by channel name"
  - "Pattern 4: attachAuthBridge runs once at app root; future cross-store side-effects on SIGNED_OUT stay in their own modules"

requirements-completed: [TSQ-02, TSQ-05, TSQ-07, TSQ-09, TSQ-10]

# Metrics
duration: 17min
completed: 2026-05-13
---

# Phase 31 Plan 01: TanStack Query Foundation Summary

**QueryClient mounted at app root with staleTime 60s, ref-counted Realtime bridge for Supabase channels, auth-state cache clearing on SIGNED_OUT, and dev-only React Query devtools — no hooks migrated yet (Wave 2 pilot begins next plan).**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-05-13T02:23:48Z
- **Completed:** 2026-05-13T02:41:14Z
- **Tasks:** 9
- **Files created:** 9
- **Files modified:** 3 (package.json, package-lock.json, src/app/_layout.tsx)
- **Tests added:** 27 (across 3 new suites) — all green
- **Full suite:** 126 tests, 28 suites — all green (no regressions)

## Accomplishments

- Three dependencies installed (`@tanstack/react-query@^5.100.10`, `@react-native-community/netinfo@11.5.2`, `@dev-plugins/react-query@^0.4.0`) via `npx expo install` (Expo SDK 55-compatible versions)
- `createQueryClient` factory with project-locked defaults: staleTime 60s, gcTime 5min, refetchOnWindowFocus off, refetchOnReconnect on, retry skips 401/403/404 and otherwise caps at 2, mutation retry 0
- `queryKeys` taxonomy — 9 namespaces (habits, todos, chat, plans, friends, expenses, home, polls, status), every leaf `as const` for literal types
- `realtimeBridge` — ref-counted `subscribeHabitCheckins` seed; two callers share one Supabase channel, teardown only after all unsubscribe
- `authBridge.attachAuthBridge(queryClient)` — `removeQueries()` on SIGNED_OUT; no-op on SIGNED_IN/TOKEN_REFRESHED/USER_UPDATED/INITIAL_SESSION
- `useRefreshOnFocus` opt-in hook with first-focus skip (no double-fetch on mount)
- `createTestQueryClient` helper exporting `{client, wrapper}` with retry:false/gcTime:Infinity/staleTime:Infinity for stable tests
- `_layout.tsx` rewired: lazy useState(createQueryClient), `useReactQueryDevTools`, AppState→focusManager, NetInfo→onlineManager, `attachAuthBridge`, all wrapped under `<QueryClientProvider>`
- Three new unit tests (`queryClient.test.ts` 15 cases, `realtimeBridge.test.ts` 6 cases, `authBridge.test.ts` 6 cases) — all green

## Task Commits

Each task committed atomically:

1. **Task 1: install dependencies** — `34995c2` (feat)
2. **Task 2: queryClient.ts factory** — `0cd0a36` (feat)
3. **Task 3: queryKeys.ts taxonomy** — `d01854a` (feat)
4. **Task 4: realtimeBridge.ts + test** — `6a5b196` (feat)
5. **Task 5: authBridge.ts + test** — `8e8618f` (feat)
6. **Task 6: queryClient.test.ts (TSQ-02 evidence)** — `afabce5` (test)
7. **Task 7: createTestQueryClient + useRefreshOnFocus** — `155b322` (feat)
8. **Task 8: _layout.tsx wiring** — `277cd69` (feat)
9. **Task 9: Audits** — recorded inline in this SUMMARY (no separate commit per plan instruction)

**Plan metadata commit:** to be appended after STATE/ROADMAP updates.

## Files Created/Modified

**Created:**
- `src/lib/queryClient.ts` — `createQueryClient()` factory with project defaults
- `src/lib/queryKeys.ts` — central taxonomy (9 namespaces, hierarchical `as const`)
- `src/lib/realtimeBridge.ts` — ref-counted channel dedup + `subscribeHabitCheckins` seed + `_resetRealtimeBridgeForTests`
- `src/lib/authBridge.ts` — `attachAuthBridge(qc)` clearing cache on SIGNED_OUT
- `src/hooks/useRefreshOnFocus.ts` — opt-in hook for screens needing focus refetch
- `src/__mocks__/createTestQueryClient.tsx` — jest helper with `{client, wrapper}`
- `src/lib/__tests__/queryClient.test.ts` — 15 cases incl. TSQ-02 cache-hit evidence
- `src/lib/__tests__/realtimeBridge.test.ts` — 6 cases: dedup, refcount teardown, distinct users, INSERT/UPDATE/DELETE invalidation
- `src/lib/__tests__/authBridge.test.ts` — 6 cases: subscribe/unsubscribe, SIGNED_OUT→removeQueries, no-op on other events

**Modified:**
- `src/app/_layout.tsx` — new imports (AppState, AppStateStatus, QueryClientProvider, focusManager, onlineManager, useReactQueryDevTools, NetInfo, createQueryClient, attachAuthBridge); lazy QC initialiser; 3 new useEffects (focusManager, onlineManager, authBridge); JSX wrapped in `<QueryClientProvider>`. Existing onAuthStateChange block preserved.
- `package.json` — three new dependencies
- `package-lock.json` — resolved

## Decisions Made

- **staleTime 60_000 global default (A6 locked)** — tab-bounces inside the window are cache hits not refetches; Realtime events keep tables with subscriptions fresh; staleTime covers the rest. Per-query overrides allowed (Wave 7 may drop chat unread to 5_000).
- **Hybrid Realtime strategy (A7 locked)** — UPDATE → `invalidateQueries` (avoids missed-field bug since Postgres default REPLICA IDENTITY only ships PK in `payload.new`), INSERT/DELETE → `setQueryData` for splice. The `subscribeHabitCheckins` seed special-cases aggregation RPCs (`get_habits_overview`) — all three event types invalidate, no splice attempted, since aggregates can't be safely updated from a single row.
- **Factory not singleton** — `createQueryClient()` returns a fresh instance per call; `_layout.tsx` uses `useState(() => createQueryClient())` so the cache lifetime is tied to `RootLayout`, HMR double-mount cannot accidentally share.
- **Auth bridge: removeQueries, not invalidate** — `invalidateQueries` would refetch every cached entry with the now-expired session, returning 401 storm. `removeQueries()` deletes data instead. Per-user keys (`list(userId)` etc.) give defense in depth even if a cached query slipped through.
- **Existing onAuthStateChange untouched** — `_layout.tsx`'s pre-existing block manages `session` state, `needsProfileSetup`, and profile lookup. `attachAuthBridge` subscribes independently (Supabase allows multiple listeners). This keeps the bridge laser-focused on cache, and avoids re-architecting session bootstrap inside this plan.
- **`mock`-prefixed jest mock variables** — jest's babel plugin hoists `jest.mock()` factories above declarations; references to outside variables throw unless prefixed with `mock` (case-insensitive). Applied to `realtimeBridge.test.ts` and `authBridge.test.ts` (Rule 1 auto-fix during Task 4).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed test mock variables to `mock*` prefix to satisfy jest babel hoisting**
- **Found during:** Task 4 (realtimeBridge.test.ts execution)
- **Issue:** Plan-supplied test code declared `channelMock`, `onMock`, `removeChannelMock`, `capturedHandler` outside `jest.mock()` and referenced them inside the factory. Jest's babel plugin hoists `jest.mock()` calls above any declarations; references to outside variables throw `ReferenceError: The module factory of jest.mock() is not allowed to reference any out-of-scope variables. Invalid variable access: channelMock`. The plugin allows-lists names with `mock` prefix (case-insensitive).
- **Fix:** Renamed to `mockChannel`, `mockOn`, `mockRemoveChannel`, `mockCapturedHandler` in both `realtimeBridge.test.ts` (Task 4) and applied preemptively to `authBridge.test.ts` (Task 5) where the same pattern existed.
- **Files modified:** `src/lib/__tests__/realtimeBridge.test.ts`, `src/lib/__tests__/authBridge.test.ts`
- **Verification:** Both test suites pass (6 tests each); full jest suite green (126 tests across 28 suites)
- **Committed in:** `6a5b196` (realtimeBridge), `8e8618f` (authBridge)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test scaffolding bug)
**Impact on plan:** Behavioral expectations unchanged; only the local variable naming was adjusted to satisfy jest's hoisting constraint. No production-code impact, no behavioral drift.

## Issues Encountered

- **Pre-existing TS errors** — `npx tsc --noEmit` reports ~659 errors across the repo, dominated by missing `@types/jest` (errors in `src/stores/__tests__/`, `src/theme/__tests__/`, `src/screens/chat/__tests__/`, etc.). None of these are introduced or worsened by this plan; my new test files inherit the same pre-existing gap. The non-test production code I created/modified produces ZERO tsc errors. Out of scope for this plan; logged here for visibility.
- **Pre-existing tsc error in `src/screens/chat/ChatRoomScreen.tsx:72`** — `Property 'refetch' does not exist on type 'UseChatRoomResult'`. Pre-existing from Phase 30; out of scope.

## Audit Findings

### REPLICA IDENTITY FULL (A7)

- Tables with REPLICA IDENTITY FULL: **`messages`**, **`statuses`** (set in migrations `0007_messages_replica_identity.sql:6` and `0001_init.sql:490`)
- Implication: Both tables can opt into `setQueryData` on UPDATE in their respective waves (chat in Wave 7, status in Wave 6) — payload.new will carry the full row, so the missed-field bug doesn't apply. All other tables stick with the Hybrid default (UPDATE → invalidate). The Wave 6 (`useStatus.ts`) and Wave 7 (`useChatRoom.ts`) plans should reference this finding and call out the choice between `invalidateQueries` and `setQueryData` on UPDATE.

### supabase.functions.invoke usage (Open Q #4)

- Count: **0**
- Locations: none
- Implication: No edge-function mutations to model. Waves 3-7 mutation hooks all wrap direct table operations or RPCs (`supabase.from(...)`, `supabase.rpc(...)`). No `useMutation` wraps `supabase.functions.invoke` in this migration.

## User Setup Required

None — no external service configuration. NetInfo is included by default in Expo SDK 55 dev clients (Pitfall 8 confirmed in plan); devtools auto-gate on `__DEV__`.

## Next Phase Readiness

- **Wave 2 (Plan 02) — Habits pilot** can begin immediately. Required primitives are in place:
  - `createQueryClient` for the provider
  - `queryKeys.habits.overview/detail/streak` factories
  - `subscribeHabitCheckins` ready to plug into the migrated hook (replaces the existing channel block in `useHabits.ts:78-101`)
  - `createTestQueryClient` ready for `useHabits.test.ts` to consume
- App boots cleanly with no behavioral change — every existing screen still renders identically (no hooks migrated).
- No blockers carried forward into Wave 2.

## Self-Check: PASSED

All 9 created files present on disk; all 8 task commits present in `git log --all`. Tests green (27 new, 126 total). No new tsc errors in production code.

---
*Phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre*
*Plan: 01*
*Completed: 2026-05-13*
