---
phase: 18
slug: theme-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | jest.config.js — Wave 0 installs |
| **Quick run command** | `npx jest --testPathPattern="theme"` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="theme"`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 0 | THEME-01 | — | N/A | unit | `npx jest --testPathPattern="ThemeContext"` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | THEME-01 | — | N/A | unit | `npx jest --testPathPattern="ThemeContext"` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 1 | THEME-02 | — | N/A | unit | `npx jest --testPathPattern="ThemeContext"` | ❌ W0 | ⬜ pending |
| 18-03-01 | 03 | 1 | THEME-03 | — | N/A | unit | `npx jest --testPathPattern="ThemeContext"` | ❌ W0 | ⬜ pending |
| 18-04-01 | 04 | 2 | THEME-05 | — | N/A | manual | `npx expo start` — visual regression check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/theme/__tests__/ThemeContext.test.tsx` — stubs for THEME-01, THEME-02, THEME-03
- [ ] `jest.config.js` — jest config with expo preset
- [ ] `babel.config.js` — if not present, required for jest transform

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| COLORS compat shim — zero visual regression on all existing screens | THEME-05 | Requires visual inspection of all screens | Launch app with `npx expo start`, navigate through all screens, confirm no layout/color regressions |
| Theme persistence survives full app restart | THEME-03 | Requires hardware/simulator restart cycle | Set theme to LIGHT, kill app, re-launch, confirm LIGHT is active before splash hides |
| OS chrome tracks theme (status bar, home indicator) | THEME-03 | Requires device observation | Toggle theme, observe iOS status bar style changes between light/dark |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
