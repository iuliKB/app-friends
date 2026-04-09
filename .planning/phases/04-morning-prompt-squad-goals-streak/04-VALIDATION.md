---
phase: 4
slug: morning-prompt-squad-goals-streak
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-09
updated: 2026-04-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

***

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — Jest rejected project-wide (Phase 2 OVR-10) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit && npx expo lint` |
| **Full suite command** | `npx tsc --noEmit && npx expo lint && bash scripts/phase-4-grep-invariants.sh` (script authored inline by the plans' `<verify>` blocks) |
| **Estimated runtime** | ~20–30 seconds |

Verification model: **deterministic invariant checks** via `grep -F` / `grep -c`, `tsc --noEmit`, `npx expo lint`, and SQL attestation SELECTs. Every requirement maps to one or more mechanical checks defined in each plan's `<verify>` and `<acceptance_criteria>` blocks.

***

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit && npx expo lint`
- **After every plan wave:** Re-run `<verify>` blocks for each plan in the completed wave
- **Before `/gsd-verify-work`:** All six plans' `<acceptance_criteria>` + Plan 02 attestation SELECTs + Plan 06 approval field populated
- **Max feedback latency:** ~30 seconds

***

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement(s) | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | STREAK-02..07 | T-04-01, T-04-02, T-04-03, T-04-05 | SECURITY DEFINER + `search_path=''` + `auth.uid()<>viewer_id` guard + grant only to `authenticated` | grep + sql | `grep -q "security definer" supabase/migrations/0011_squad_streak_v1_3.sql && grep -q "set search_path = ''" supabase/migrations/0011_squad_streak_v1_3.sql && grep -q "auth.uid()" supabase/migrations/0011_squad_streak_v1_3.sql && grep -q "grant execute on function public.get_squad_streak(uuid, text) to authenticated" supabase/migrations/0011_squad_streak_v1_3.sql` | ❌ authored by Task | ⬜ pending |
| 4-02-01 | 02 | 2 | STREAK-07 | T-04-01..05 (re-verified in live DB) | Attestation SELECT output pasted into SUMMARY | manual SQL | `supabase db push && supabase db execute "select proname, prokind, prosecdef from pg_proc where proname='get_squad_streak'"` | N/A (runtime) | ⬜ pending |
| 4-03-01 | 03 | 1 | MORN-01, MORN-02 | T-04-11, T-04-12 | Stable identifier + no valid_until in payload + try/catch swallow | grep + tsc | `test -f src/lib/morningPrompt.ts && grep -q "'campfire:morning_prompt'" src/lib/morningPrompt.ts && grep -q "repeats: true" src/lib/morningPrompt.ts && ! grep -q "valid_until" src/lib/morningPrompt.ts && npx tsc --noEmit` | ❌ authored by Task | ⬜ pending |
| 4-03-02 | 03 | 1 | MORN-03, MORN-04, MORN-05, MORN-06 | T-04-06, T-04-07, T-04-08, T-04-10, T-04-11 | 12h guard from `response.notification.date`, action whitelist, tap-time DEAD check, upsert via authenticated session | grep + tsc | `grep -q "category === 'morning_prompt'" src/app/_layout.tsx && grep -q "12 \* 60 \* 60 \* 1000" src/app/_layout.tsx && grep -q "heartbeat !== 'dead'" src/app/_layout.tsx && grep -q "window_id: 'rest_of_day'" src/app/_layout.tsx && npx tsc --noEmit` | ⚠️ _layout.tsx exists; branch new | ⬜ pending |
| 4-03-03 | 03 | 1 | MORN (signout hygiene) | T-04-09 | Single auth subscriber calls both expiry + morning cancel; no second listener added | grep | `grep -c "useAuthStore.subscribe" src/hooks/useStatus.ts` == 1 && `grep -q "cancelMorningPrompt().catch" src/hooks/useStatus.ts` | ⚠️ useStatus.ts exists; one-line edit | ⬜ pending |
| 4-04-01 | 04 | 3 | STREAK-01 (data path) | T-04-13, T-04-14 | Device tz at query time (D-06), silent fallback to zero state on error (D-17) | grep + tsc | `grep -q "supabase.rpc('get_squad_streak'" src/hooks/useStreakData.ts && grep -q "Intl.DateTimeFormat" src/hooks/useStreakData.ts && grep -q "console.warn('get_squad_streak failed'" src/hooks/useStreakData.ts && ! grep -q "Alert" src/hooks/useStreakData.ts && npx tsc --noEmit` | ❌ authored by Task | ⬜ pending |
| 4-04-02 | 04 | 3 | STREAK-01 (UI) | T-04-15 | StreakCard uses theme tokens only, zero-state copy matches D-13, tap target = /plan-create | grep + lint + tsc | `grep -q "router.push('/plan-create'" src/components/squad/StreakCard.tsx && grep -q "Start your first week — make a plan with friends" src/components/squad/StreakCard.tsx && ! grep -qE "#[0-9A-Fa-f]{3,6}" src/components/squad/StreakCard.tsx && npx tsc --noEmit && npx expo lint src/components/squad/StreakCard.tsx` | ❌ authored by Task | ⬜ pending |
| 4-04-03 | 04 | 3 | STREAK-01 (Goals tab) | — | Pull-to-refresh wired; "Coming soon" removed | grep + tsc | `grep -q "<StreakCard" "src/app/(tabs)/squad.tsx" && grep -q "RefreshControl" "src/app/(tabs)/squad.tsx" && ! grep -q "Coming soon" "src/app/(tabs)/squad.tsx" && npx tsc --noEmit` | ⚠️ squad.tsx exists; stub replaced | ⬜ pending |
| 4-05-01 | 05 | 2 | MORN-07, MORN-08 | T-04-16, T-04-17 | AsyncStorage-only persistence (no profiles column), permission-denied reverts Switch + writes 'false' | grep + tsc + lint | `grep -q "campfire:morning_prompt_enabled" "src/app/(tabs)/profile.tsx" && grep -q "mode=\"time\"" "src/app/(tabs)/profile.tsx" && ! grep -q "notify_morning_prompt" "src/app/(tabs)/profile.tsx" && npx tsc --noEmit && npx expo lint "src/app/(tabs)/profile.tsx"` | ⚠️ profile.tsx exists; section added | ⬜ pending |
| 4-05-02 | 05 | 2 | MORN (cold launch) | — | OVR-04 single-listener rule preserved: exactly one useEffect in (tabs)/_layout.tsx | grep + tsc | `grep -c "useEffect" "src/app/(tabs)/_layout.tsx"` == 1 && `grep -q "ensureMorningPromptScheduled().catch" "src/app/(tabs)/_layout.tsx"` | ⚠️ (tabs)/_layout.tsx exists; one call added | ⬜ pending |
| 4-06-01 | 06 | 4 | STREAK-08 (inventory) | T-04-20, T-04-21 | Every Phase 4 user-facing string inventoried and grep-verifiable in source | grep | `test -f .planning/phases/04-morning-prompt-squad-goals-streak/04-COPY-REVIEW.md && grep -q "Non-engineer approval" .planning/phases/04-morning-prompt-squad-goals-streak/04-COPY-REVIEW.md && grep -q "week streak" .planning/phases/04-morning-prompt-squad-goals-streak/04-COPY-REVIEW.md` | ❌ authored by Task | ⬜ pending |
| 4-06-02 | 06 | 4 | STREAK-08 (approval) | T-04-20 | Approval field populated with non-placeholder reviewer name + ISO date | manual + grep | `! grep -qE "Reviewer:\s*_\(" .planning/phases/04-morning-prompt-squad-goals-streak/04-COPY-REVIEW.md` | N/A (human checkpoint) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

***

## Wave 0 Requirements

Phase 4 has no Wave 0 test scaffolding requirements — Jest is forbidden project-wide (Phase 2 OVR-10). Validation is mechanical via grep + tsc + expo lint + SQL attestation. The only file authored before code-under-test is `.planning/phases/04-morning-prompt-squad-goals-streak/04-VALIDATION.md` (this file) and `.planning/phases/04-morning-prompt-squad-goals-streak/04-COPY-REVIEW.md` (Plan 06 Task 1).

Optional inline seed fixture for Plan 01 manual SQL validation: documented inline in Plan 02's `<action>` (sanity RPC call). No separate `supabase/scripts/seed_streak_fixtures.sql` is authored — the function is walked during review with a live dataset.

***

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Daily notification actually fires at the configured local time on a real device | MORN-01, MORN-02 | Expo Go limitations; EAS dev build on real iOS required | Deferred to Phase 5 Hardware Verification Gate (no active Apple Developer account). Append to `.planning/phases/05-hardware-verification-gate/` inputs. |
| Action button taps from the lock screen (cold start) route through response dispatcher | MORN-03, MORN-04 | iOS category actions don't work in Expo Go | Deferred to Phase 5 Hardware Verification Gate |
| 12h `valid_until` guard — tap action button >12h after fire time | MORN-05 | Requires advancing device clock + firing real notification | Deferred to Phase 5 Hardware Verification Gate (document seed/repro steps in Phase 4 SUMMARY) |
| PrePromptModal re-use for morning-prompt-ON path feels right to non-engineer | STREAK-08 / copy debt | Subjective UX review of reused Phase 1 modal | Plan 06 Task 2 human checkpoint (reviewer may flag PrePromptModal copy mismatch) |
| Streak sliding-4-week-window math against a known seed dataset | STREAK-02..07 | PL/pgSQL walk is algorithmically correct but exact output depends on seed history | Plan 02 Task 1 includes a sanity RPC call `select * from get_squad_streak(auth.uid(), 'UTC')` — if the returned row is implausible for the user's known history, open a revision to Plan 01 |
| Non-engineer copy review | STREAK-08 | Human judgment required | Plan 06 Task 2 (BLOCKING) |

***

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a manual-only justification above
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has a grep or tsc/lint check)
- [x] Wave 0 covers all MISSING references (no Wave 0 test scaffolding — Jest forbidden)
- [x] No watch-mode flags
- [x] Feedback latency < 30s for all automated checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planning complete (2026-04-09)
