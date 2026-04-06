---
phase: 12
slug: profile-simplification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (visual regression) + TypeScript compiler |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | PROF-01, PROF-02 | tsc + grep | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | — (enhancement) | tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | PROF-01, PROF-02, PROF-03 | visual | `npx playwright test --update-snapshots` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No friend list on Profile | PROF-01 | Visual confirmation | Open Profile tab → verify no "My Friends" row |
| No friend requests on Profile | PROF-02 | Visual confirmation | Open Profile tab → verify no "Friend Requests" row |
| No badge on Profile tab | PROF-03 | Badge rendering | Check Profile tab icon has no badge number |
| @username visible | — | Visual check | Verify @username appears below display name |
| Email visible | — | Visual check | Verify email row in ACCOUNT section |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
