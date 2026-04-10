---
phase: 2
slug: radar-view-view-toggle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (via expo) |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern=radar --bail` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=radar --bail`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | HOME-01, HOME-02 | — | N/A | unit | `npx jest --testPathPattern=RadarViewToggle` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | HOME-05 | — | N/A | unit | `npx jest --testPathPattern=useViewPreference` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | RADAR-01, RADAR-02 | — | N/A | unit | `npx jest --testPathPattern=RadarContainer` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | RADAR-03 | — | N/A | unit | `npx jest --testPathPattern=PulseRing` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | RADAR-04, RADAR-05 | — | N/A | unit | `npx jest --testPathPattern=OverflowChip` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | RADAR-06 | — | N/A | integration | `npx jest --testPathPattern=HomeScreen` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/__tests__/RadarViewToggle.test.tsx` — stubs for HOME-01, HOME-02
- [ ] `src/hooks/__tests__/useViewPreference.test.ts` — stubs for HOME-05
- [ ] `src/components/__tests__/RadarContainer.test.tsx` — stubs for RADAR-01, RADAR-02
- [ ] `src/components/__tests__/PulseRing.test.tsx` — stubs for RADAR-03
- [ ] `src/components/__tests__/OverflowChip.test.tsx` — stubs for RADAR-04, RADAR-05
- [ ] `src/screens/__tests__/HomeScreen.radar.test.tsx` — stubs for RADAR-06

*Existing infrastructure covers test framework — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pulse ring animation renders smoothly at 60fps | RADAR-03 | Animation frame rate requires visual inspection on device | Open Radar view with ALIVE friends, observe pulse rings for jank |
| Radar bubbles adapt to different screen sizes | RADAR-02 | Layout adaptation requires testing on multiple device sizes | Test on small (iPhone SE), medium (iPhone 15), large (iPhone 15 Pro Max) screens |
| View toggle preference persists across app restart | HOME-05 | Requires full app restart cycle | Set toggle to Cards, force-quit app, relaunch, verify Cards is shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
