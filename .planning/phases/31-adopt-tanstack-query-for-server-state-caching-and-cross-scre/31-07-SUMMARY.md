---
phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre
plan: 07
subsystem: data-layer
tags: [tanstack-query, react-query, spotlight, streak, habits-namespace, edge-functions-audit]

# Dependency graph
requires:
  - phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre
    provides: QueryClient factory, queryKeys.home.spotlight + queryKeys.habits.streak taxonomy, canonical useQuery patterns (Waves 1-6), createTestQueryClient, useHabits/useTodos/useUpcomingBirthdays/useIOUSummary cache infrastructure
provides:
  - useStreakData migrated to single useQuery keyed by queryKeys.habits.streak(userId) — public shape preserved verbatim
  - useSpotlight gained a TanStack-Query-backed useSpotlight() hook composing the 5 source caches via queryKeys.home.spotlight(userId); selectSpotlight() selector preserved verbatim for the BentoGrid callsite
  - Edge Function audit closed out — Wave 1 found 0 invocations (Case A); no additional migrations needed in this plan
  - mutationShape gate still green (no new mutations added — both hooks are read-only)
affects: [31-08-chat-persistence-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useMemo-derived synchronous aggregator mirrored into the canonical cache slot via setQueryData — keeps consumers of selectSpotlight() unchanged while still exposing a useQuery-backed hook for future direct consumers"
    - "useQuery with initialData + staleTime: 0 + synchronous queryFn — lets a pure derivation participate in the cache taxonomy without introducing a fetch"

key-files:
  created:
    - src/hooks/__tests__/useStreakData.test.ts
  modified:
    - src/hooks/useSpotlight.ts
    - src/hooks/useStreakData.ts
    - src/hooks/__tests__/useSpotlight.test.ts
    - src/components/squad/bento/__tests__/BentoGrid.test.tsx

key-decisions:
  - "useSpotlight kept its existing selectSpotlight() selector exported verbatim and ADDED a useSpotlight() hook alongside — BentoGrid (the only current selectSpotlight callsite) needs zero edits, while future consumers can adopt the hook. Plan task wording 'public return shape exactly' is honoured because the file's existing public surface (selectSpotlight + types) is unchanged."
  - "useSpotlight() derivation runs synchronously via useMemo and mirrors into the queryKeys.home.spotlight(userId) cache slot via setQueryData in a useEffect — the useQuery wrapper exists primarily to anchor the spotlight in the canonical taxonomy and let queryKeys.home.all() invalidation cascades reach it. queryFn returns the latest derived value; initialData seeds the cache on first render so a follow-up source-cache change is reflected within one React tick."
  - "useStreakData uses queryKeys.habits.streak(userId) — habits namespace, NOT a separate 'streak' namespace. This means invalidateQueries({queryKey: queryKeys.habits.all()}) would refresh BOTH the per-habit overview AND the squad-level streak. Wave 2's useHabits.toggleToday invalidation set intentionally targets only queryKeys.habits.overview(today) and is NOT broadened here — toggling a check-in does not necessarily change the streak (server batches end-of-day). Manual smoke deferred to next dev-client session."
  - "D-17 silent-error contract for streak preserved: query.error surfaces as a string via the return mapping, but currentWeeks/bestWeeks default to 0 when data is unavailable — consumer screens see zero state, not red banners."

patterns-established:
  - "Read-only aggregate hook over already-migrated sources: useMemo-derive + useEffect-setQueryData mirror + useQuery anchor — applicable to any future derived cache slot (e.g. a hypothetical useHomeOverview() that composes IOU + Birthdays + Streak into a single 'home rollup' SpotlightItem-like object)"

requirements-completed: [TSQ-01, TSQ-02, TSQ-07, TSQ-08]

# Metrics
duration: ~5min
completed: 2026-05-13
---

# Phase 31 Plan 07: Spotlight + Streak Data — TanStack Query Migration Summary

**2 hooks migrated (useStreakData → useQuery keyed by queryKeys.habits.streak; useSpotlight gained a TanStack-Query-backed useSpotlight() hook on top of the existing selectSpotlight selector); Edge Function audit closed out (Wave 1 found 0 invocations — Case A); mutationShape gate still green (38 checks across 16 files / 18 blocks — no new mutations added); jest full suite 226/226 green across 45 suites (was 221 at end of Wave 6 + 5 new cases: 2 useSpotlight hook + 3 useStreakData). Wave 7 closes out the non-chat surface — only Wave 8 (chat + persistence + boundary doc) remains.**

## Performance

- **Duration:** ~5 min
- **Tasks completed:** 3 of 3
- **Files created:** 1 (`src/hooks/__tests__/useStreakData.test.ts`)
- **Files modified:** 4 (useSpotlight.ts, useStreakData.ts, useSpotlight.test.ts, BentoGrid.test.tsx)
- **Tests added:** 5 new cases (2 useSpotlight hook tests + 3 useStreakData tests); the 5 existing selectSpotlight selector tests are preserved
- **Full suite:** 226 tests across 45 suites — all green (up from 221 at end of Wave 6; net +5)

## Net LOC Delta

| File | Before | After | Delta |
|------|--------|-------|-------|
| `src/hooks/useSpotlight.ts` | 210 | 342 | +132 (+63%) |
| `src/hooks/useStreakData.ts` | 74 | 85 | +11 (+15%) |
| **Total (production code)** | **284** | **427** | **+143 (+50%)** |

The +132 LOC headline on `useSpotlight.ts` is concentrated in:
- The new `useSpotlight()` hook (~80 LOC including helper documentation comments).
- An extended file-header documentation block explaining the Wave-7 dual-export pattern (selector + hook coexist).

The pure selector body (`selectSpotlight` + `isHabitAboutToBreak`) is unchanged — Phase 29.1's extension shape is intact.

`useStreakData.ts` +11 LOC is documentation comments + the StreakRow narrow interface; the actual hook body collapsed from useState×4 + useEffect + useCallback into a single `useQuery` call (~25 LOC shorter on the runtime path).

## Accomplishments

### useSpotlight (Task 1)

- **Dual-export pattern locked in.** `selectSpotlight()` continues to be exported verbatim — `BentoGrid.tsx:11` (the only existing callsite) still imports it and calls it directly with pre-fetched data from `useHabits`, `useTodos`, `useUpcomingBirthdays`, `useIOUSummary`, `useStreakData`. Zero callsite edits required.
- **New `useSpotlight()` hook** composes the 5 source hooks internally, derives the SpotlightItem synchronously via `useMemo`, and mirrors the result into the canonical cache slot at `queryKeys.home.spotlight(userId)` via a `useEffect` + `queryClient.setQueryData` write. A `useQuery` wraps the derivation with `initialData: derived` + `staleTime: 0` so the cache slot is populated immediately on first render and re-derives on every source-cache change in the same React tick.
- **Phase 29.1 extension shape preserved.** `isHabitAboutToBreak` three-cadence rule, habit-urgent ranking above todo-urgent, all 6 SpotlightKind branches (birthday/iou/habit/todo/streak/fallback), accent palette, optional avatarUrl/displayName/signedAmountCents fields — all intact byte-for-byte.
- **Test file extended with `createTestQueryClient` integration.** 2 new hook test cases (fallback + birthday surfaces) sit alongside the 5 existing `selectSpotlight()` selector tests. The new tests mock `@/lib/supabase`, `@/stores/useAuthStore`, and `@/lib/realtimeBridge` at the module level; selector tests remain unaffected because they don't reach into those modules.

### useStreakData (Task 2)

- **Single `useQuery` keyed by `queryKeys.habits.streak(userId)`** replaces the pre-migration `useState × 4` + `useEffect` + `useCallback` fetcher. Cache lives in the habits namespace so prefix invalidation under `queryKeys.habits.all()` reaches both overview AND streak.
- **Public `StreakData` shape preserved verbatim** — `{ currentWeeks, bestWeeks, loading, error, refetch }`. Three consumers (`HomeScreen` `YourZoneSection` at lines 229 + 699, `squad.tsx` line 89, `BentoGrid` via prop in same file) need zero edits.
- **D-17 silent-error contract maintained.** `console.warn('get_squad_streak failed', error)` still fires; `query.error` is populated; the return mapping defaults `currentWeeks/bestWeeks` to 0 when data is unavailable so consumer screens render zero state, not red banners.
- **Device timezone resolution still happens at call time** (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — never reads from a DB profile column per D-06.
- **New test file** (`src/hooks/__tests__/useStreakData.test.ts`) — 3 cases: successful row hydration, empty data fallback, RPC error path with zero-state visibility.

### Edge Function Audit (Task 3)

See `## Edge Function Migration Status` below.

## Edge Function Migration Status

**Case A — None.**

Wave 1's audit (recorded in `31-01-SUMMARY.md` line 174: *"supabase.functions.invoke usage (Open Q #4) — Count: 0, Locations: none"*) found zero `supabase.functions.invoke` callsites across `src/`. No additional mutations need to be modelled as `useMutation` wrappers in this plan or in Wave 8. Every mutation across Waves 2-7 wraps either direct table operations (`supabase.from(...)`) or RPCs (`supabase.rpc(...)`).

The Phase's edge functions (`notify-plan-invite`, `notify-friend-free`) are fired server-side by Postgres triggers + Database Webhooks (outbox pattern from v1.3) and never invoked from the React Native client. They're unaffected by the TanStack Query migration.

## Task Commits

Each task committed atomically:

1. **Task 1: useSpotlight migration** — `e421bd8` (feat)
2. **Task 2: useStreakData migration** — `6492cb3` (feat)
3. **Task 3: BentoGrid test mock fix** (deviation auto-fix) — `4467974` (fix)
4. **Task 3 documentation** — folded into the SUMMARY (plan-metadata commit appended after STATE/ROADMAP updates).

## Files Created/Modified

**Created:**
- `src/hooks/__tests__/useStreakData.test.ts` — 3 cases (success, empty data, RPC error)

**Modified:**
- `src/hooks/useSpotlight.ts` — added `useSpotlight()` hook + supporting imports; `selectSpotlight` selector preserved verbatim (210 → 342 LOC)
- `src/hooks/useStreakData.ts` — full rewrite to single `useQuery` + StreakRow narrow interface (74 → 85 LOC)
- `src/hooks/__tests__/useSpotlight.test.ts` — added 2 hook test cases using `createTestQueryClient` (5 → 7 cases; 164 → 263 LOC)
- `src/components/squad/bento/__tests__/BentoGrid.test.tsx` — added `jest.mock('@/lib/supabase')` + `jest.mock('@/stores/useAuthStore')` stubs to keep the component test decoupled from the now-transitively-pulled-in supabase import (95 → 117 LOC)

## Decisions Made

- **Dual-export pattern for useSpotlight** — keeping `selectSpotlight()` as a pure selector AND adding `useSpotlight()` as a hook honours BOTH the plan's intent ("Rewrite using a `useQuery`") AND the plan's success criterion ("No callsite changes for either hook"). `BentoGrid.tsx` continues to call `selectSpotlight(props)` directly because that's the cleanest consumer model — `BentoGrid` already receives all five sources as props from `squad.tsx` so each tile and the spotlight share the same in-flight data. A future planner can migrate `BentoGrid` (and its `squad.tsx` caller) to use `useSpotlight()` directly when convenient; this plan leaves the consumer surface untouched.
- **Synchronous derivation + cache mirror via useEffect** — the alternative ("real" useQuery with the 5 sources as queryKey deps) would have run the queryFn asynchronously and shown a "loading" tick on every source change, which is visually wrong for a derived selector. The chosen pattern (`useMemo` for the derivation + `setQueryData` to mirror it into the cache + `useQuery` with `initialData: derived` as an anchor) gives the synchronous selector contract back while still participating in the cache taxonomy.
- **useStreakData cache key in habits namespace** — `queryKeys.habits.streak(userId)`, NOT a separate streak namespace. Research and plan both call this out: "different RPC, different table, different concept from habit check-ins, but same domain." Prefix invalidation under `queryKeys.habits.all()` will refresh both; the Wave 2 toggleToday invalidation intentionally does not broaden today (streak is server-batched).
- **Skip broadening Wave 2's invalidation set** — the plan explicitly says "Do not change Wave 2's invalidation set." Toggling a habit check-in does not necessarily change the streak; the streak is computed end-of-day. If a manual smoke later shows staleness, the fix is a one-line broadening to `queryKeys.habits.all()`. Recorded here for the next planner.
- **Add a `useStreakData.test.ts` test file** — the plan's `<verify><automated>` command targeted `useStreakData` but no test file existed pre-migration. Without a test, the verification command would exit with `No tests found`. Adding 3 cases (success, empty, error) satisfies the verification gate AND establishes a regression baseline for the D-17 silent-error contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useSpotlight.ts was a pure selector pre-migration, not a fetching hook — plan assumption mismatched**

- **Found during:** Task 1 pre-write context loading.
- **Issue:** Plan task 1 prescribed wrapping `useSpotlight` in a `useQuery` and preserving "the public return shape exactly." The file's pre-migration public surface was a pure synchronous `selectSpotlight()` selector function (NO hook, NO fetching, NO useState). Wrapping the selector in `useQuery` and replacing the selector signature would have broken the `BentoGrid.tsx:11` callsite (which calls `selectSpotlight(props)` synchronously inside a `useMemo`). Plan success criterion 4 ("No callsite changes for either hook") explicitly forbids that break.
- **Fix:** Adopted the dual-export pattern documented under Decisions — `selectSpotlight()` preserved verbatim, NEW `useSpotlight()` hook added alongside that internally composes the five source hooks and exposes a `useQuery`-backed { item, loading, error } trio. Both the AC grep gates (useQuery present, queryKeys.home.spotlight present, useState< === 0, createTestQueryClient in test) AND the success criterion (no BentoGrid edit) are satisfied.
- **Files modified:** `src/hooks/useSpotlight.ts`, `src/hooks/__tests__/useSpotlight.test.ts`
- **Verification:** All 4 ACs green (`useQuery\(` count = 1, `queryKeys.home.spotlight` count = 5, `useState<` count = 0, `createTestQueryClient` in test count = 3); useSpotlight tests 7/7 green (5 existing selector + 2 new hook cases).
- **Committed in:** `e421bd8`

**2. [Rule 1 - Bug] First useSpotlight() draft used useQuery as the synchronous derivation engine — broke the synchronous contract**

- **Found during:** Task 1 first jest run.
- **Issue:** The initial draft set `useQuery({ queryFn: async () => selectSpotlight({...}), enabled: !!userId })` with no `initialData` and no `useMemo` mirror. The "surfaces birthday" test failed because the queryFn captured an early closure with empty source caches; even after the sources refilled, the spotlight queryFn didn't re-run (its queryKey didn't change). Result: SpotlightItem stayed `fallback` instead of flipping to `birthday`.
- **Fix:** Restructured to derive synchronously via `useMemo` over the five source values, mirror into the cache via `useEffect` + `setQueryData`, and use `useQuery` with `initialData: derived` + `staleTime: 0` as the cache anchor. The queryFn returns the latest derived value (still synchronous; the `async` wrapper is just TanStack Query's contract).
- **Files modified:** `src/hooks/useSpotlight.ts`
- **Verification:** Both new hook test cases (fallback + birthday) green.
- **Committed in:** `e421bd8`

**3. [Rule 1 - Bug] Useless generic-type parameter on useQuery broke the AC grep gate**

- **Found during:** Task 1 AC verification.
- **Issue:** Initial draft used `useQuery<SpotlightItem>({...})`. The plan AC pattern is `grep -cE "useQuery\(|useQueries\("` — `\(` matches a literal `(`, so `useQuery<SpotlightItem>(` does NOT match `useQuery(`. AC1 returned 0 instead of ≥1.
- **Fix:** Dropped the generic type parameter; TS inference still produces the correct return type from `queryFn`'s explicit `Promise<SpotlightItem>` signature.
- **Files modified:** `src/hooks/useSpotlight.ts`
- **Verification:** AC1 grep now returns 1.
- **Committed in:** `e421bd8`

**4. [Rule 1 - Bug] BentoGrid component test crashed after useSpotlight pulled in supabase transitively**

- **Found during:** Full jest suite run after Task 2.
- **Issue:** `useSpotlight.ts` now imports the migrated source hooks (`useHabits`, `useTodos`, ...) which all `import { supabase } from '@/lib/supabase'`. `BentoGrid.tsx` only uses the pure `selectSpotlight()` selector and never calls a source hook directly, but the import graph still touches supabase at module-load time. `BentoGrid.test.tsx` didn't mock supabase (no need, pre-migration). Result: `Missing Supabase environment variables` thrown at suite load.
- **Fix:** Added `jest.mock('@/lib/supabase')` + `jest.mock('@/stores/useAuthStore')` stubs to `BentoGrid.test.tsx`. The test still asserts the 6 feature tiles + spotlight render via the same stub data shape; only the module-level import graph is now decoupled.
- **Files modified:** `src/components/squad/bento/__tests__/BentoGrid.test.tsx`
- **Verification:** `BentoGrid` test now passes; full jest suite 45/45 suites + 226/226 cases green.
- **Committed in:** `4467974`

---

**Total deviations:** 4 auto-fixed (1 Rule 1 plan-vs-codebase shape mismatch, 1 Rule 1 useQuery-as-sync-engine bug, 1 Rule 1 grep-gate literal mismatch, 1 Rule 1 import-graph leakage into a sibling test). All scoped to surface-level fixes; no architectural changes; no callsite edits needed for either hook.

**Impact on plan:** The plan's high-level intent is delivered exactly — 2 hooks gain useQuery-backed access paths, the Phase 29.1 extension contract is preserved, the Wave 1 Edge Function audit is closed out as Case A, and `mutationShape` plus the full jest suite stay green.

## Authentication Gates

None encountered. All Supabase tables/RPCs already accessible.

## Known Stubs

None — both hooks are fully wired to their data sources. No placeholders or TODO/FIXME markers introduced. The `useSpotlight()` hook's `fallback` SpotlightItem is the canonical empty-state item from Phase 29.1 (`kind: 'fallback', title: 'Plan something with your squad'`) — that's a real value, not a stub.

## Threat Flags

None. T-31-22 (streak cache survives sign-out) is mitigated by Wave 1's `authBridge.removeQueries()` + Wave 6's `useStatusStore.clear()` chain — the same chain applies to `queryKeys.habits.streak(userId)` because `removeQueries()` is unconditional. T-31-23 (Edge function response with unexpected shape corrupts cache) is moot in this plan because the Wave 1 audit found 0 Edge Function invocations to wrap.

## Issues Encountered

- **Pre-existing tsc errors carried forward** — same ~659 errors as the Wave 6 baseline (dominated by missing `@types/jest`). None introduced or worsened by this plan; the 1 new test file inherits the same pre-existing gap. Out of scope.
- **No regressions** — full jest suite 226/226 green (up from 221 at end of Wave 6: +5 new cases). The single mid-plan failure (BentoGrid suite load) was the import-graph leak documented under Deviations §4 and is fully resolved.

## mutationShape Coverage Status

- **Files now checked:** 16 (was 14 at end of Wave 6 — added `useStreakData.ts` and `useSpotlight.ts` to the static walk). Neither file declares a `useMutation`, so both pass the gate trivially (the gate skips files with zero mutation blocks).
- **Mutation blocks asserted:** 18 (unchanged from Wave 6 — no new mutations introduced; both hooks are read-only).
- **Exemption markers in use:** 8 (unchanged).
- **All blocks pass** — every non-exempt block has `mutationFn` + `onMutate` + `onError` + `onSettled`.

## Carry-Forward to Wave 8

Wave 8 (chat + persistence + boundary doc) inherits the following carry-forwards:

- **Chat hooks not yet migrated (3):** `useChatList`, `useChatRoom`, `useChatMembers`. The plan was sequenced last because chat is the highest-complexity surface (Realtime, optimistic message send, dedup-by-id, media upload). Wave 8 will own these.
- **Persistence (TSQ-04):** Swap `QueryClientProvider` → `PersistQueryClientProvider` in `src/app/_layout.tsx`. Add `src/lib/__tests__/persistQueryClient.test.ts` covering dehydrate/hydrate symmetry.
- **Boundary doc (TSQ-06):** Write `src/hooks/README.md` documenting the zustand-vs-cache boundary. Must explicitly reference: (a) the hybrid useQuery+zustand pattern (Wave 6 useStatus); (b) the intentional non-migration of useNetworkStatus + useViewPreference (Wave 6 audit); (c) the dual-export pattern (Wave 7 useSpotlight selector + hook); (d) the authBridge fan-out (Wave 1 + Wave 6 expansion); (e) the realtimeBridge channel ownership convention (Waves 1, 3, 6).
- **`useChatStore.chatList` strip:** Remove the `chatList` + `lastFetchedAt` mirror from `src/stores/useChatStore.ts` once `useChatList` migrates to `useQuery({queryKey: queryKeys.chat.list(userId)})`. Pattern is identical to Wave 3's `useHomeStore.friends` strip and Wave 4's `usePlansStore.plans` strip.
- **Manual smoke (optional):** On a dev client, set up a habit, toggle it, and observe whether the streak tile on `YourZoneSection` shows a change. If yes — the Wave 2 invalidation breadth was sufficient. If no — broaden Wave 2's `useHabits.toggleToday.onSettled` to `queryClient.invalidateQueries({queryKey: queryKeys.habits.all()})` in a small Wave 8 follow-up commit.

## User Setup Required

None. No external service configuration. All RPCs (`get_squad_streak`) are existing and already accessible in the dev environment.

## Next Phase Readiness

- **Wave 8 (Plan 08) — Chat + persistence + boundary doc** can begin immediately. All non-chat hooks are now migrated. The four surfaces (3 chat hooks + persistence + boundary doc + useChatStore strip) are well-scoped and independently shippable.
- After Wave 8 lands, the entire 35-hook server-state surface is migrated to TanStack Query — the phase ships.

## Self-Check: PASSED

All 1 created + 4 modified files present on disk; all 3 task commits present in `git log --all` (`e421bd8`, `6492cb3`, `4467974`). Tests green: 5 new cases (2 useSpotlight hook + 3 useStreakData) — full suite 226/226 green across 45 suites. mutationShape gate green (38 checks, no new mutations). No new tsc errors in production code introduced by Plan 07.

---
*Phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre*
*Plan: 07*
*Completed: 2026-05-13*
