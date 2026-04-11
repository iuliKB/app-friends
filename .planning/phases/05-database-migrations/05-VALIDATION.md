---
phase: 5
slug: database-migrations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Supabase CLI (`supabase db push`) + psql smoke-test queries |
| **Config file** | `supabase/config.toml` |
| **Quick run command** | `npx supabase db push --local` |
| **Full suite command** | `npx supabase db push --local && npx supabase db lint` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx supabase db push --local`
- **After every plan wave:** Run `npx supabase db push --local && npx supabase db lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | IOU-01, IOU-02 | T-05-01 | iou_groups + iou_members tables created with INTEGER cents | migration | `npx supabase db push --local` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | IOU-04 | T-05-02 | RLS restricts settlement to expense creator only | policy | psql smoke-test query | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | IOU-01, IOU-02 | T-05-03 | create_expense() atomic RPC commits or rolls back fully | rpc | psql call with valid/invalid params | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | IOU-03, IOU-05 | — | get_iou_summary() returns per-group net balances | rpc | psql call with seed data | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | BDAY-01 | — | birthday_month + birthday_day columns on profiles | migration | `npx supabase db push --local` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | BDAY-02, BDAY-03 | — | get_upcoming_birthdays() sorts by next occurrence with year-wrap | rpc | psql call with seed data | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | — | — | plans.iou_notes renamed to general_notes, client refs updated | rename | `grep -r iou_notes src/` returns 0 matches | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements — Supabase CLI and psql already available.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `supabase db push` completes without errors on remote | All | Requires Supabase project credentials | Run `supabase db push` with project ref |
| RLS smoke-test queries return correct rows | IOU-01 through IOU-05 | Requires authenticated session context | Execute as different seed users, verify row visibility |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
