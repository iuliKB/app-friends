---
phase: 10
slug: squad-tab
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (visual regression) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test squad-dashboard.spec.ts --project=mobile` |
| **Full suite command** | `npx playwright test --project=mobile` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test squad-dashboard.spec.ts --project=mobile`
- **After every plan wave:** Run `npx playwright test --project=mobile`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | DASH-01 | visual | `npx playwright test squad-dashboard.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 10-01-02 | 01 | 1 | DASH-02 | visual | `npx playwright test squad-dashboard.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 10-01-03 | 01 | 1 | DASH-03 | visual | `npx playwright test squad-dashboard.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 10-01-04 | 01 | 1 | DASH-04 | visual | `npx playwright test squad-dashboard.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 10-02-01 | 02 | 2 | DASH-01..04 | visual | `npx playwright test squad-dashboard.spec.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

| File | Covers | Pattern |
|------|--------|---------|
| `tests/visual/squad-dashboard.spec.ts` | DASH-01, DASH-02, DASH-03, DASH-04 | login + navigate to `/squad` + screenshot; same pattern as `iou-create-detail.spec.ts` |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cards animate in on first load | DASH-03 | Animation timing requires visual inspection | Open Squad tab fresh (cold start) — verify cards fade/slide in |
| Animation does NOT replay on pull-to-refresh | DASH-03 | Requires device interaction | Pull down to refresh — verify cards do not re-animate |
| Friend compact row taps navigate correctly | DASH-01 | Navigation action requires tap | Tap a friend avatar/name — verify correct screen opens |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
