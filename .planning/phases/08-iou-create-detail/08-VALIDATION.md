---
phase: 8
slug: iou-create-detail
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (visual/screenshot tests) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/visual/iou-create-detail.spec.ts` |
| **Full suite command** | `npx playwright test tests/visual/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/visual/iou-create-detail.spec.ts`
- **After every plan wave:** Run `npx playwright test tests/visual/`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | IOU-01 | — | N/A | setup | `npx playwright test tests/visual/iou-create-detail.spec.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | IOU-01 | — | N/A | visual | `npx playwright test tests/visual/iou-create-detail.spec.ts` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | IOU-02 | — | N/A | visual | `npx playwright test tests/visual/iou-create-detail.spec.ts` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 2 | IOU-02 | — | N/A | visual | `npx playwright test tests/visual/iou-create-detail.spec.ts` | ❌ W0 | ⬜ pending |
| 08-01-05 | 01 | 2 | IOU-04 | — | N/A | Creator-only settle | visual | `npx playwright test tests/visual/iou-create-detail.spec.ts` | ❌ W0 | ⬜ pending |
| 08-01-06 | 01 | 2 | IOU-04 | — | Haptic on settle | visual | `npx playwright test tests/visual/iou-create-detail.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/visual/iou-create-detail.spec.ts` — stubs for IOU-01, IOU-02, IOU-04

*Existing Playwright infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Haptic feedback on settle tap | IOU-04 | Haptics require physical device | Tap settle button on iOS device, verify medium haptic fires |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
