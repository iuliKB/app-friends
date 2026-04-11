---
phase: 03
slug: card-stack-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (visual regression) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/visual/card-stack.spec.ts` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Visual inspection in Expo Go
- **After every plan wave:** `npx playwright test --project mobile`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | — | — | N/A | infra | Manual verify GestureHandlerRootView added | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | CARD-01 | — | N/A | visual | `npx playwright test tests/visual/card-stack.spec.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | CARD-03 | — | N/A | visual | `npx playwright test tests/visual/card-stack.spec.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | CARD-02 | — | N/A | manual | Manual — requires live Supabase | N/A | ⬜ pending |
| 03-03-02 | 03 | 2 | CARD-04 | — | N/A | unit | Manual inspection of filter function | ❌ | ⬜ pending |
| 03-03-03 | 03 | 2 | CARD-05 | — | N/A | visual | `npx playwright test tests/visual/card-stack.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `GestureHandlerRootView` wrapping app in `_layout.tsx` — prerequisite for all gestures
- [ ] `tests/visual/card-stack.spec.ts` — covers CARD-01, CARD-03, CARD-05

*Existing infrastructure covers Playwright framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nudge opens DM | CARD-02 | Requires live Supabase RPC | Tap Nudge → verify DM screen opens |
| Swipe gesture feel | CARD-03 | RNGH gestures don't translate to web Playwright | Swipe card in Expo Go → verify animation |
| Undo swipe-down | D-10 | Gesture-based | Swipe down after skip → verify card returns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
