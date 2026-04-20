---
phase: 13
slug: profile-rework-friend-profile
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / React Native Testing Library |
| **Config file** | jest.config.js |
| **Quick run command** | `npx jest --testPathPattern="profile" --passWithNoTests` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="profile" --passWithNoTests`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | PROF-01 | — | N/A | manual | UI smoke: status pill absent from Profile tab | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | PROF-02 | — | N/A | manual | UI smoke: notification toggles consolidated | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | PROF-03 | — | N/A | manual | UI smoke: Edit Profile opens detail-only editor | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 2 | PROF-04 | — | N/A | manual | UI smoke: Friend Profile screen renders correctly | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | PROF-04 | — | N/A | effective_status null → no status row rendered | unit | `npx jest --testPathPattern="friendProfile" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 13-02-03 | 02 | 2 | PROF-05 | — | N/A | manual | UI smoke: back navigation returns to entry point | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing test infrastructure covers TypeScript compilation checks
- [ ] Manual smoke tests cover all UI-only behaviors (no automated equivalent)

*Existing infrastructure covers all phase requirements where automation is applicable.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Status pill absent from Profile tab | PROF-01 | UI-only layout change | Open Profile tab, verify no status pill or mood section visible |
| Notification toggles consolidated | PROF-02 | UI-only layout change | Open Profile tab, verify single "Notifications" section, no orphan toggles |
| Edit Profile opens detail-only editor | PROF-03 | Navigation behavior | Tap "Edit Profile", verify only display name + username fields shown |
| Friend Profile opens from friend tap | PROF-04 | Navigation + data display | Tap friend name/avatar, verify avatar, display name, status, birthday, wish list shown |
| Back navigation returns to entry screen | PROF-05 | Navigation stack | Open Friend Profile from multiple entry points, verify back returns correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
