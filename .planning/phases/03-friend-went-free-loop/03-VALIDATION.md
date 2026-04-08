---
phase: 03
slug: friend-went-free-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| (to be filled by planner) | | | | | | | | | ⬜ pending |

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

**Approval:** pending
