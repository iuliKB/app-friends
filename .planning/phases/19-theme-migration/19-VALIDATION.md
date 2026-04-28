---
phase: 19
slug: theme-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (`tsc --noEmit`) + manual Expo Go smoke test |
| **Config file** | `tsconfig.json` (existing) |
| **Quick run command** | `./node_modules/.bin/tsc --noEmit` |
| **Full suite command** | `./node_modules/.bin/tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `./node_modules/.bin/tsc --noEmit`
- **After every plan wave:** Run `./node_modules/.bin/tsc --noEmit` + manual scroll through all 5 tabs in light mode and dark mode in Expo Go
- **Before `/gsd-verify-work`:** Full tsc clean + manual smoke must pass
- **Max feedback latency:** ~10 seconds (tsc)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-* | 01 (Plan A) | 1 | THEME-04 | — | N/A | compile | `./node_modules/.bin/tsc --noEmit` | ✅ tsconfig.json | ⬜ pending |
| 19-02-* | 02 (Plan B) | 2 | THEME-04 | — | N/A | compile | `./node_modules/.bin/tsc --noEmit` | ✅ tsconfig.json | ⬜ pending |
| 19-03-* | 03 (Plan C) | 3 | THEME-04 | — | N/A | compile + manual | `./node_modules/.bin/tsc --noEmit` | ✅ tsconfig.json | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — this is a pure in-place refactor with TypeScript as the completeness gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All screens render correctly in light mode | THEME-04 | Visual — no automated visual diff configured | Open Expo Go, set theme to Light, scroll through Home, Squad, Explore, Chats, Profile tabs; verify white/light backgrounds with dark text |
| All screens render correctly in dark mode | THEME-04 | Visual | Open Expo Go, set theme to Dark, repeat same tab scroll; verify dark backgrounds |
| Theme toggle switches entire app instantly | THEME-04 | Visual + interaction | Tap Light → Dark → System in Profile → APPEARANCE; verify immediate full-app color switch |
| Theme preference persists across restart | THEME-04 | Requires app restart | Set to Light, force-close Expo Go, reopen; verify app launches in light mode |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
