---
phase: 5
slug: chat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no Jest/Vitest configured |
| **Config file** | None |
| **Quick run command** | `npx tsc --noEmit` (compile check) |
| **Full suite command** | Manual smoke test checklist |
| **Estimated runtime** | ~30 seconds per manual check |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` for compile check
- **After every plan wave:** Full manual smoke test checklist
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | CHAT-01, CHAT-02 | manual | n/a | n/a | ⬜ pending |
| 05-02-01 | 02 | 2 | CHAT-03, CHAT-05 | manual | n/a | n/a | ⬜ pending |
| 05-03-01 | 03 | 3 | CHAT-04, CHAT-06, CHAT-07 | manual | n/a | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed — manual smoke testing is the appropriate validation method for this mobile UI phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Messages in chronological order | CHAT-01 | Visual verification | Open plan chat, send messages, verify order |
| Send message appears immediately | CHAT-02 | Optimistic UI timing | Send message, verify instant appearance |
| Realtime message from other user | CHAT-03 | Requires two devices | Send from device B, verify device A sees it within seconds |
| DM from friend card | CHAT-04 | Navigation flow | Tap friend → Start DM → verify chat room opens |
| Chat list sorted by last message | CHAT-05 | Visual verification | Send messages in different chats, verify sort order |
| Plan chat linked from dashboard | CHAT-05 | Navigation check | Tap Open Chat on plan dashboard, verify correct chat room |
| Pinned plan card in plan chat | CHAT-06 | Visual verification | Open plan chat, verify banner shows plan title + time |
| DM from friend card via RPC | CHAT-07 | Navigation + RPC | Tap Start DM, verify get_or_create_dm_channel works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
