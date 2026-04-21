---
phase: 17
slug: polls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (React Native / Expo) |
| **Config file** | jest.config.js |
| **Quick run command** | `npx jest --testPathPattern=poll --passWithNoTests` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=poll --passWithNoTests`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | CHAT-09 | — | N/A | manual | — | ✅ | ⬜ pending |
| 17-01-02 | 01 | 1 | CHAT-09 | — | N/A | manual | — | ✅ | ⬜ pending |
| 17-02-01 | 02 | 2 | CHAT-10 | — | N/A | unit | `npx jest --testPathPattern=usePoll --passWithNoTests` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 2 | CHAT-10 | — | N/A | manual | — | ✅ | ⬜ pending |
| 17-03-01 | 03 | 3 | CHAT-11 | — | N/A | manual | — | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/hooks/usePoll.test.ts` — stubs for vote / change-vote / un-vote logic (CHAT-10)

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Poll creation sheet opens on tap | CHAT-09 | React Native modal interaction | Tap "Poll" in attachment menu; verify sheet appears |
| Poll card renders full-width | CHAT-09 | Visual layout check | Send a poll; verify card spans full width in chat |
| Optimistic vote update | CHAT-10 | Real-time UI state | Tap option; verify immediate fill before DB confirms |
| Live count update for other participant | CHAT-11 | Multi-device Realtime | Vote on Device A; verify Device B count updates without refresh |
| Un-vote returns to unvoted state | CHAT-10 | UI state regression | Vote, then tap same option; verify bars/counts disappear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
