---
phase: 10
slug: squad-tab
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (visual regression) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test --project=mobile` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --project=mobile`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SQAD-01 | visual | `npx playwright test` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | SQAD-02 | visual | `npx playwright test` | ✅ | ⬜ pending |
| 10-01-03 | 01 | 1 | SQAD-03 | visual | `npx playwright test` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 1 | SQAD-04 | visual | `npx playwright test` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 1 | SQAD-05 | manual | N/A (navigation) | N/A | ⬜ pending |
| 10-02-03 | 02 | 1 | SQAD-06 | manual | N/A (conditional render) | N/A | ⬜ pending |
| 10-02-04 | 02 | 1 | SQAD-07 | manual | N/A (navigation) | N/A | ⬜ pending |
| 10-03-01 | 03 | 1 | SQAD-08 | visual | `npx playwright test` | ✅ | ⬜ pending |
| 10-03-02 | 03 | 1 | SQAD-09 | manual | N/A (badge check) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Playwright visual regression suite already exists with baselines for all screens.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FAB navigates to Add Friend | SQAD-05 | Navigation action requires tap simulation | Tap FAB on Friends tab → verify /friends/add opens |
| Friend Requests row navigates | SQAD-07 | Navigation action requires tap simulation | Tap "Friend Requests (N)" row → verify /friends/requests opens |
| Friend Requests row conditional | SQAD-06 | Requires test data with pending requests | Verify row appears when pendingCount > 0, hidden when 0 |
| Badge on Squad tab icon | SQAD-09 | Requires test data + bottom nav inspection | Verify pending badge shows on Squad tab, not Profile |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
