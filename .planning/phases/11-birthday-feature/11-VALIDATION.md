---
phase: 11
slug: birthday-feature
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (existing `tests/visual/` suite) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (tsc)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | D-01 | T-11-01 | birthday_year nullable at DB, enforced client-side | unit | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 0 | D-07 | T-11-02 | wish_list_claims hidden from item owner via RLS | unit | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | D-04 | — | wish list CRUD in Profile tab | manual | visual verify | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | D-08 | T-11-03 | claim toggle visible to friends, hidden from owner | manual | visual verify | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | D-13 | — | Friend Birthday Page shows wish list + friend list | manual | visual verify | ❌ W0 | ⬜ pending |
| 11-04-01 | 04 | 3 | D-15 | T-11-04 | group chat created without birthday person | manual | visual verify | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/visual/birthday-wishlist.spec.ts` — stubs for wish list + birthday year
- [ ] `tests/visual/birthday-group-chat.spec.ts` — stubs for group chat creation
- [ ] Existing infrastructure (`playwright.config.ts`, login fixtures) covers all phase requirements

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claim is invisible to item owner | D-10 | RLS enforcement verified in Supabase but UI path requires two user sessions | Login as friend, claim item. Login as birthday person, verify no claim indicator visible. |
| Group chat excludes birthday person | D-16 | Requires multi-user session to verify member list | Create group from birthday page, confirm birthday person not in participants. |
| Age "turning N" label correct on boundary dates | D-02 | Date arithmetic edge cases (birthday today, tomorrow, year-wrap) | Verify "turning N" is correct for a friend whose birthday is today and one whose birthday is in 364 days. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
