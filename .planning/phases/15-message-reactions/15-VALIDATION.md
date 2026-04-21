---
phase: 15
slug: message-reactions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / React Native Testing Library |
| **Config file** | jest.config.js |
| **Quick run command** | `npx jest --testPathPattern=reaction` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=reaction`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | CHAT-01 | — | N/A | manual | `npx expo start` → long-press bubble → emoji strip visible above pill | ✅ | ⬜ pending |
| 15-01-02 | 01 | 1 | CHAT-01 | — | N/A | unit | `npx jest --testPathPattern=MessageBubble` | ✅ | ⬜ pending |
| 15-02-01 | 02 | 1 | CHAT-02 | — | RLS: insert only own reactions | unit | `npx jest --testPathPattern=useChatRoom` | ✅ | ⬜ pending |
| 15-02-02 | 02 | 1 | CHAT-02 | — | Optimistic update reverts on error | unit | `npx jest --testPathPattern=useChatRoom` | ✅ | ⬜ pending |
| 15-03-01 | 03 | 2 | CHAT-03 | — | Realtime dedup: own-reaction not double-counted | unit | `npx jest --testPathPattern=useChatRoom` | ✅ | ⬜ pending |
| 15-03-02 | 03 | 2 | CHAT-03 | — | Badge disappears when count reaches zero | unit | `npx jest --testPathPattern=MessageBubble` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Emoji strip renders above context pill on all device sizes | CHAT-01 | Layout positioning requires visual verification | Open expo dev client, long-press a message, verify strip above pill on both small (SE) and large (Pro Max) simulators |
| Real-time reactions visible across two devices/sessions | CHAT-03 | Requires two simultaneous clients | Open app in two simulators logged in as different users; react on one, verify badge appears on other within 1s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
