---
phase: 27
slug: plans-squad-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + tsx (React Native testing, Phase 26 pattern) |
| **Config file** | jest.config.js |
| **Quick run command** | `npx jest --testPathPattern="PLANS\|SQUAD\|RSVPButtons\|WishList" --passWithNoTests` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="PLANS\|SQUAD\|RSVPButtons\|WishList" --passWithNoTests`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-xx-01 | 01 | 1 | PLANS-01 | — | N/A | unit | `npx jest --testPathPattern="PlanCard\|plans" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 27-xx-02 | 01 | 2 | PLANS-02 | — | N/A | unit | `npx jest --testPathPattern="RSVPButtons" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 27-xx-03 | 01 | 2 | PLANS-03 | — | N/A | unit | `npx jest --testPathPattern="PlanCreate" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 27-xx-04 | 01 | 2 | PLANS-04 | — | N/A | unit | `npx jest --testPathPattern="ExploreMap" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 27-xx-05 | 02 | 2 | SQUAD-01 | — | N/A | unit | `npx jest --testPathPattern="FriendRequests" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 27-xx-06 | 02 | 2 | SQUAD-02 | — | N/A | unit | `npx jest --testPathPattern="IOU\|squad" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 27-xx-07 | 02 | 1 | SQUAD-03 | — | N/A | unit | `npx jest --testPathPattern="animation" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 27-xx-08 | 02 | 3 | SQUAD-04 | — | N/A | unit | `npx jest --testPathPattern="WishListItem" --passWithNoTests` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/plans/__tests__/RSVPButtons.test.tsx` — PLANS-02 animation/haptic mock
- [ ] `src/components/squad/__tests__/WishListItem.test.tsx` — SQUAD-04 press feedback
- [ ] `src/theme/__tests__/animation.test.ts` — SQUAD-03 token value assertion

*Existing jest infrastructure covers the rest — new test files only for components without existing test coverage.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RSVP spring bounce feels correct | PLANS-02 | Haptic feel and animation quality are device-only | Tap Yes/No/Maybe on a plan; verify spring bounce and haptic fire |
| Plan creation success haptic | PLANS-03 | Haptic cannot be simulated in Jest | Create a plan; verify success haptic fires before navigation away |
| Friend accept/reject haptic | SQUAD-01 | Haptic device-only | Accept then reject a friend request; verify distinct haptic strengths |
| IOU settle haptic | SQUAD-02 | Haptic device-only | Settle an IOU; verify success haptic fires |
| Squad card stagger on load | SQUAD-03 | Animation timing requires visual check | Navigate to Squad Dashboard; verify cards animate in with stagger |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
