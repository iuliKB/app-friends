---
phase: 11
slug: navigation-restructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 11 — Validation Strategy

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

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | NAV-01, NAV-02, NAV-03 | visual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | NAV-04 | grep | `grep -r "router.push" src/` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | NAV-01, NAV-02, NAV-03 | visual | `npx playwright test --update-snapshots` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Playwright suite already exists.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tab order correct on device | NAV-01 | Visual confirmation of 5-tab order | Open app → verify Home, Squad, Explore, Chats, Profile left-to-right |
| Explore functionality intact | NAV-02 | Full plan creation flow | Create a plan from Explore tab → verify it works end-to-end |
| Chats functionality intact | NAV-03 | Full chat flow | Open a chat from Chats tab → verify messaging works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
