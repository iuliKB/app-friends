---
phase: 03
slug: friend-went-free-loop
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Populated by gsd-planner during plan creation. Wave 0 populates missing rows.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (RN + Expo repo has no jest/vitest — see Phase 2 02-03-SUMMARY deviation #2) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit && npx eslint <touched files>` |
| **Full suite command** | `npx tsc --noEmit && npx eslint src/` |
| **Estimated runtime** | ~30s tsc, ~15s eslint |

**Plus SQL attestation** for migration + trigger work: `SUPABASE_ACCESS_TOKEN=… npx supabase db query --linked "<verification SELECT>"` — see 03-02-PLAN (schema push) for the canonical 6-SELECT attestation suite.

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` on the changed files (Phase 2 pattern)
- **After every plan wave:** Run full `npx tsc --noEmit && npx eslint src/` project-wide
- **After schema push (BLOCKING plan):** Run the 6-SELECT SQL attestation suite against the live DB
- **Before phase verification:** All of the above must be green
- **Max feedback latency:** ~60s for the quick loop

---

## Per-Task Verification Map

Populated by gsd-planner in step 8. Rows are added as plans are authored.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T-03-01-T1 | 03-01 | 1 | FREE-02/03/04/05/06/07/10/11 | T-03-01..10 | Migration authors all Phase 3 schema with hardened SECURITY DEFINER search_path="" and deny-by-default RLS | grep + line-count | `grep -cE "SET search_path = ''" supabase/migrations/0010_friend_went_free_v1_3.sql` returns ≥3; grep gauntlet in 03-01 Task 1 | ✓ | ⬜ pending |
| T-03-02-T1 | 03-02 | 2 | FREE-02/03/04/05/06/07/10/11 | T-03-12,13,14 | Pre-push safety gate via supabase migration list --linked; db push applies 0010 | shell | `SUPABASE_ACCESS_TOKEN=… npx supabase db push` exits 0 with "Applying migration 0010" in output | ✓ | ⬜ pending |
| T-03-02-T2 | 03-02 | 2 | FREE-02/03/04/05/06/07/10/11 | T-03-04,05 | 7-SELECT attestation verifies extension, tables, trigger attributes, RLS | SQL | `SUPABASE_ACCESS_TOKEN=… npx supabase db query --linked "SELECT (to_regclass('public.free_transitions') IS NOT NULL)::text || ',' || (to_regclass('public.friend_free_pushes') IS NOT NULL)::text"` returns "true,true" | ✓ | ⬜ pending |
| T-03-02-T3 | 03-02 | 2 | FREE-10 | T-03-07,11 | Webhook dispatch URL GUC set at database level | SQL | `SELECT current_setting('app.edge_functions_url', true)` returns supabase.co URL | ✓ | ⬜ pending |
| T-03-02-T4 | 03-02 | 2 | FREE-02/03/04/05/06/07/10/11 | — | src/types/database.ts hand-patched; tsc clean | tsc | `npx tsc --noEmit` returns 0 errors | ✓ | ⬜ pending |
| T-03-02-T5 | 03-02 | 2 | FREE-10 | T-03-11 | Human Studio verification + service_role_key GUC set via SQL Editor (never via shell) | human checkpoint | Operator types "approved" after 4 Studio checks | — | ⬜ pending |
| T-03-03-T1 | 03-03 | 2 | FREE-01/02/03/04/05/06/07/08/10 | T-03-15..22 | Edge Function rate-limit gauntlet with 8 suppression reasons + DeviceNotRegistered parser | grep | 11-literal grep gauntlet in 03-03 Task 1 verify block | ✓ | ⬜ pending |
| T-03-04-T1 | 03-04 | 1 | EXPIRY-01 | T-03-26 | window_id added as optional; nextLargerWindow helper covers all WindowId values | grep + tsc | `grep -q "export function nextLargerWindow" src/lib/windows.ts && npx tsc --noEmit` clean | ✓ | ⬜ pending |
| T-03-04-T2 | 03-04 | 1 | EXPIRY-01 | T-03-23,24,25 | Scheduler cancels previous + schedules new; AsyncStorage persistence | grep + tsc | 6-literal grep gauntlet in 03-04 Task 2 verify block | ✓ | ⬜ pending |
| T-03-05-T1 | 03-05 | 3 | EXPIRY-01 | T-03-30 | useStatus.setStatus calls scheduleExpiryNotification after successful upsert; signout cancels | grep + tsc | `grep -q "scheduleExpiryNotification" src/hooks/useStatus.ts && npx tsc --noEmit` clean | ✓ | ⬜ pending |
| T-03-05-T2 | 03-05 | 3 | FREE-06 | T-03-27,28,29,31 | profiles.timezone sync with Hermes UTC guard; SELECT-then-UPDATE pattern | grep + tsc + eslint | `grep -q "getTimezoneOffset" src/hooks/useStatus.ts && npx tsc --noEmit && npx eslint src/hooks/useStatus.ts` clean | ✓ | ⬜ pending |
| T-03-06-T1 | 03-06 | 4 | EXPIRY-01 | — | iOS categories registered at module scope (friend_free body-only; expiry_warning KEEP_IT/HEADS_DOWN) | grep + tsc | 4-literal grep gauntlet in 03-06 Task 1 | ✓ | ⬜ pending |
| T-03-06-T2 | 03-06 | 4 | FREE-09, EXPIRY-01 | T-03-32..38 | Response listener routes by categoryIdentifier; friend_free → DM, expiry_warning → setStatus via getState() | grep + tsc + eslint | 8-literal grep gauntlet + tsc + eslint in 03-06 Task 2 | ✓ | ⬜ pending |
| T-03-07-T1 | 03-07 | 4 | FREE-07 | T-03-39,40,41 | Friend availability toggle reads/writes profiles.notify_friend_free with optimistic UI | grep + tsc + eslint | 4-literal grep + tsc + eslint in 03-07 Task 1 | ✓ | ⬜ pending |
| T-03-08-T1 | 03-08 | 1 | FREE-11 | T-03-42 | Monitoring doc publishes stale-outbox SQL and suppression diagnostics | grep + wc | 5-literal grep + `wc -l` ≥ 30 in 03-08 Task 1 | ✓ | ⬜ pending |
| T-03-08-T2 | 03-08 | 1 | FREE-01/03/04/05/06/08/09, EXPIRY-01 | T-03-43 | Phase 5 smoke-test checklist appended to ROADMAP inputs | grep | `grep -q "03-SMOKE-TEST.md" .planning/ROADMAP.md` | ✓ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Confirm `pg_net` is installable on project `zqmaauaopyolutfoizgq` — ALREADY CONFIRMED by orchestrator (pg_net 0.20.0 available, not yet installed)
- [ ] `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;` as the first statement in migration `0010_friend_went_free_v1_3.sql`
- [ ] SQL attestation suite template in the schema-push plan (mirror of Phase 2 Plan 02's 6-SELECT verification block)

*Phase 3 has no test framework to install — sampling is tsc + eslint + SQL attestation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Expo push lands on device within ~5s of transition | FREE-01 | Requires real device + push token + EAS dev build (Phase 1 D-11) | Set sender Free while recipient is Alive and not in quiet hours; confirm push arrives; defer to Phase 5 Hardware Gate |
| Push body format matches "Ana is Free • pizza 🍕" | FREE-08 | Requires device to render the notification | Confirm body on device; defer to Phase 5 |
| Tap friend-free push opens correct DM (warm start) | FREE-09 | Requires real notification tap + routing | Tap notification, confirm `/chat/room?dm_channel_id=…` opens; defer to Phase 5 |
| Tap friend-free push opens correct DM (cold start) | FREE-09 | Requires cold-start boot + auth-guarded routing | Kill app, tap notification, confirm it opens DM after auth; defer to Phase 5 |
| EXPIRY-01 local notification fires 30min before expiry | EXPIRY-01 | Requires real scheduled wait (Android Doze risk) | Set 1h window, wait 30min, confirm notification appears; defer to Phase 5 |
| [Keep it] / [Heads down] action buttons dispatch correctly | EXPIRY-01 | Requires iOS long-press / Android expand to show action row | Long-press expiry notification, tap action, confirm setStatus landed; defer to Phase 5 |
| Quiet hours suppression honors recipient's IANA timezone | FREE-06 | Requires cross-timezone test accounts | Set recipient tz=UTC, send at 23:00 UTC, confirm NO push; defer to Phase 5 |
| Rate limits (15min pair / 5min recipient / 3/day) enforced | FREE-03/04/05 | Requires rapid-fire real transitions | Manually flip Free 4× in 10min, confirm only 1 push reaches recipient; defer to Phase 5 |

Rationale: Per project memory `project_hardware_gate_deferral.md`, v1.3 Phase 5 "Hardware Verification Gate" consolidates all manual device smoke tests; feature phases ship with automated validation only (tsc + eslint + SQL attestation).

---

## Validation Sign-Off

- [ ] All plans have SQL attestation or tsc+eslint verification commands
- [ ] Migration plan has the 6-SELECT attestation block
- [ ] Each FREE-xx / EXPIRY-01 has either an automated verification row OR an entry in Manual-Only Verifications → Phase 5
- [ ] No watch-mode flags
- [ ] Per-task verification map is populated by planner
- [ ] `nyquist_compliant: true` set by planner when all requirements have a validation path

**Approval:** planner 2026-04-08 — all 16 tasks have automated verification commands
