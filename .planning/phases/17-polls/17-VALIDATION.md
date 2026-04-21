---
phase: 17
slug: polls
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-21
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no jest.config.* or `__tests__/` directory in project |
| **Config file** | N/A |
| **Quick run command** | `npx expo lint` |
| **Full suite command** | `npx expo lint` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx expo lint`
- **After every plan wave:** Run `npx expo lint`
- **Before `/gsd-verify-work`:** Lint must pass with zero errors
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | CHAT-10 | — | N/A | lint | `npx expo lint` | ✅ | ⬜ pending |
| 17-01-02 | 01 | 1 | CHAT-09, CHAT-11 | — | N/A | lint | `npx expo lint` | ✅ | ⬜ pending |
| 17-02-01 | 02 | 1 | CHAT-09 | — | N/A | lint | `npx expo lint` | ✅ | ⬜ pending |
| 17-03-01 | 03 | 2 | CHAT-10, CHAT-11 | — | N/A | lint | `npx expo lint` | ✅ | ⬜ pending |
| 17-04-01 | 04 | 3 | CHAT-09, CHAT-10 | — | N/A | lint | `npx expo lint` | ✅ | ⬜ pending |
| 17-04-02 | 04 | 3 | CHAT-09 | — | N/A | lint | `npx expo lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — no test framework exists in this project. Existing lint infrastructure covers all phase requirements.

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

- [x] All tasks have `<automated>` verify (npx expo lint on every task)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0: no test framework in project — lint-only sampling is appropriate
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-04-21
