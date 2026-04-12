---
phase: 7
slug: birthday-calendar-feature
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (visual regression) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/visual/birthday-calendar.spec.ts` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/visual/birthday-calendar.spec.ts`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BDAY-02 | — | N/A | visual | `npx playwright test tests/visual/birthday-calendar.spec.ts` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | BDAY-02 | — | N/A | visual | `npx playwright test tests/visual/birthday-calendar.spec.ts` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | BDAY-03 | — | N/A | visual | `npx playwright test tests/visual/birthday-calendar.spec.ts` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | BDAY-03 | — | N/A | visual | `npx playwright test tests/visual/birthday-calendar.spec.ts` | ❌ W0 | ⬜ pending |
| 07-01-05 | 01 | 1 | BDAY-02+03 | — | N/A | visual/smoke | `npx playwright test tests/visual/birthday-calendar.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/visual/birthday-calendar.spec.ts` — stubs for BDAY-02 and BDAY-03; follow `birthday-profile.spec.ts` pattern (login + navigate + screenshot)

*Existing infrastructure covers remaining phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tapping birthday card navigates to list screen | BDAY-03 | Navigation flow requires real device/emulator interaction | 1. Open Squad tab 2. Tap BirthdayCard 3. Verify /squad/birthdays screen opens with back button |
| Today's birthday accent highlight visible | BDAY-02 | Visual accent color rendering varies by theme | 1. Seed a friend with today's birthday 2. Open birthday list 3. Verify accent background on today row |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
