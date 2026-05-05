---
phase: 28
slug: branding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual / Expo CLI |
| **Config file** | app.config.ts |
| **Quick run command** | `npx expo config --type introspect` |
| **Full suite command** | `npx expo prebuild --clean && npx expo run:ios` |
| **Estimated runtime** | ~120 seconds (prebuild) |

---

## Sampling Rate

- **After every task commit:** Run `npx expo config --type introspect`
- **After every plan wave:** Run `npx expo prebuild --clean`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (config check), 120 seconds (prebuild)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | BRAND-01 | — | N/A | manual | `npx expo config --type introspect \| grep -A5 icon` | ✅ app.config.ts | ⬜ pending |
| 28-01-02 | 01 | 1 | BRAND-02 | — | N/A | manual | `npx expo config --type introspect \| grep -A10 splash` | ✅ app.config.ts | ⬜ pending |
| 28-01-03 | 01 | 1 | BRAND-03 | — | N/A | manual | `npx expo config --type introspect \| grep -A5 dark` | ✅ app.config.ts | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no test framework needed for build-time config changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App icon shows on home screen | BRAND-01 | Requires physical device or Simulator | Build app, install on Simulator, check home screen icon |
| Branded splash with fade transition | BRAND-02 | Requires native build + visual inspection | Run `expo run:ios`, observe launch sequence |
| Splash dark mode correct | BRAND-03 | Requires OS dark mode toggle | Switch Simulator to dark mode, relaunch app, verify background |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
