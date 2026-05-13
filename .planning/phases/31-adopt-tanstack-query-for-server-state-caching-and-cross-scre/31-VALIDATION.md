---
phase: 31
slug: adopt-tanstack-query-for-server-state-caching-and-cross-scre
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-13
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Sourced from `31-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + `@testing-library/react-native` 13 + `jest-expo` 55 |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPatterns="<file you touched>" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~30–90 seconds full suite (current footprint) |

---

## Sampling Rate

- **After every task commit:** Run quick command scoped to the touched file
- **After every plan wave:** Run full suite (`npx jest --no-coverage`)
- **Before `/gsd-verify-work`:** Full suite green + manual cross-screen reactivity check (habits pilot demo)
- **Max feedback latency:** ≤90 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD-01 | Wave 1 install | 1 | TSQ-02 | — | N/A | unit | `npx jest --testPathPatterns="queryClient.staleTime" --no-coverage` | ❌ W0 — `src/lib/__tests__/queryClient.test.ts` | ⬜ pending |
| TBD-02 | Wave 1 realtime bridge | 1 | TSQ-05 | — | N/A | unit | `npx jest --testPathPatterns="realtimeBridge.dedupe" --no-coverage` | ❌ W0 — `src/lib/__tests__/realtimeBridge.test.ts` | ⬜ pending |
| TBD-03 | Wave 1 auth bridge | 1 | TSQ-10 | — | Sign-out clears user-scoped cache (no stale per-user data leaks to next session) | unit | `npx jest --testPathPatterns="authBridge" --no-coverage` | ❌ W0 — `src/lib/__tests__/authBridge.test.ts` | ⬜ pending |
| TBD-04 | Wave 1 devtools gating | 1 | TSQ-09 | — | Devtools removed from production bundle | manual | `npx expo export --platform ios && ! grep -r 'dev-plugins/react-query' dist/` | ❌ W1 manual smoke | ⬜ pending |
| TBD-05 | Wave 1 query-key taxonomy | 1 | TSQ-07 | — | N/A | static | `! grep -rln "queryKey: \\['" src/hooks/ src/screens/` (after migration completes, only `queryKeys.*()` calls allowed) | ❌ enforced in CI gate | ⬜ pending |
| TBD-06 | Wave 2 habits pilot | 2 | TSQ-01 | — | N/A | integration | `npx jest --testPathPatterns="useHabits.crossScreen" --no-coverage` | ❌ W0 — `src/hooks/__tests__/useHabits.crossScreen.test.tsx` | ⬜ pending |
| TBD-07 | Wave 2 habits pilot | 2 | TSQ-03 | — | Optimistic toggle rolls back on RPC error (no silent state drift on failure) | unit | `npx jest --testPathPatterns="useHabits.optimistic" --no-coverage` | ✅ rewrite existing `src/hooks/__tests__/useHabits.test.ts` to target `useMutation` shape (snapshot via ctx, rollback in `onError`) | ⬜ pending |
| TBD-08 | Wave 2 mutation-shape gate | 2 | TSQ-08 | — | N/A | unit/static | `npx jest --testPathPatterns="mutationShape" --no-coverage` OR static grep gate ensuring every migrated `useMutation` has `onMutate` + `onError` + `onSettled` | ❌ W2 — `src/hooks/__tests__/mutationShape.test.ts` | ⬜ pending |
| TBD-09 | Wave 8 persistence | 8 | TSQ-04 | — | N/A | integration | `npx jest --testPathPatterns="persistQueryClient" --no-coverage` | ❌ W8 — `src/lib/__tests__/persistQueryClient.test.ts` | ⬜ pending |
| TBD-10 | Wave 8 boundary doc | 8 | TSQ-06 | — | N/A | manual grep | `test -f src/hooks/README.md && grep -q "TanStack Query" src/hooks/README.md` | ❌ W8 — new doc file | ⬜ pending |

*Task IDs are placeholders — planner will replace `TBD-XX` with the canonical `{N}-{plan}-{task}` form once plans are split into waves.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 = scaffold and install before any migration begins. The following files / installs MUST be present before subsequent waves can run their per-task verifications:

- [ ] `npx expo install @tanstack/react-query @react-native-community/netinfo @dev-plugins/react-query` — install authoritative SDK-pinned versions (verify with `npm ls @tanstack/react-query`)
- [ ] `src/__mocks__/createTestQueryClient.tsx` — shared test helper wrapping `renderHook` with a fresh `QueryClientProvider` (required by every migrated hook test)
- [ ] `src/lib/__tests__/queryClient.test.ts` — covers TSQ-02 (cache hit within staleTime)
- [ ] `src/lib/__tests__/realtimeBridge.test.ts` — covers TSQ-05 (subscription dedup, ref-counted teardown)
- [ ] `src/lib/__tests__/authBridge.test.ts` — covers TSQ-10 (sign-out → `queryClient.removeQueries`)
- [ ] `src/hooks/__tests__/useHabits.crossScreen.test.tsx` — covers TSQ-01 (cross-screen reactivity, the pilot's canonical proof)

*Framework is already present (Jest 30 + jest-expo) — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-screen reactivity end-to-end demo (habits pilot) | TSQ-01 | Verifies multi-screen render under real navigation, not a jsdom mount; final gate before phase ships | 1) Boot dev client. 2) Open Home tab — note habit toggle state on Habits tile. 3) Open Habits detail. 4) Toggle one habit. 5) Return to Home — tile reflects new state WITHOUT pull-to-refresh. 6) Repeat with squad tile if applicable. |
| Devtools absent from production bundle | TSQ-09 | Bundle inspection is post-build; not a unit test | `npx expo export --platform ios` then `! grep -r "dev-plugins/react-query" dist/ && echo PASS` |
| Realtime cache-write under poor network | TSQ-05 | Real channel reconnection behavior; can't be reliably mocked | 1) Dev client with `useChatRoom` migrated. 2) Toggle airplane mode mid-session. 3) Restore. 4) Send a message from another device. 5) Verify exactly one Realtime channel re-subscribe (network log) and one `setQueryData` write per incoming row. |
| Network audit: fetch count drops vs. pre-migration | TSQ-02 | Requires a typical-session script run twice (pre + post) | 1) `eas build --profile development`, run `react-devtools` network panel for a scripted 2-minute session (home → habits → chat → plans → back). 2) Record total Supabase fetch count. 3) Compare against pre-Phase-31 baseline (collect baseline from `main` before merging Wave 2). |
| Persisted cache cold-start (Wave 8) | TSQ-04 | Cold-start is a real-device behavior; jsdom test only proves dehydrate/hydrate symmetry, not perceived UX | 1) Sign in, exercise the app (home + habits + plans). 2) Force-quit. 3) Toggle airplane mode. 4) Cold-launch. 5) Home + habits should show last-known data instantly (within 1 frame), with stale indicators if any are designed in. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`queryClient.test.ts`, `realtimeBridge.test.ts`, `authBridge.test.ts`, `useHabits.crossScreen.test.tsx`, `createTestQueryClient.tsx`)
- [ ] No watch-mode flags (all jest invocations use `--no-coverage` and not `--watch`)
- [ ] Feedback latency < 90s (full suite) — verified empirically after Wave 0 lands
- [ ] `nyquist_compliant: true` set in frontmatter (after planner maps every task to a row above)

**Approval:** pending — planner sets `nyquist_compliant: true` after every plan task is mapped to a row in the per-task verification map.
