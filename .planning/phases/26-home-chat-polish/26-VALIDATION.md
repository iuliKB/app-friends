---
phase: 26
slug: home-chat-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (React Native / Expo) |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern="home\|chat" --passWithNoTests` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="home\|chat" --passWithNoTests`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | HOME-01 | — | N/A | manual | visual inspection — skeleton renders while loading | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | HOME-02 | — | N/A | manual | empty state card renders with CTA for 0 friends | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | HOME-03 | — | N/A | manual | FADING bubble shows amber pulse ring in radar view | ❌ W0 | ⬜ pending |
| 26-01-04 | 01 | 1 | HOME-04 | — | N/A | manual | all home cards compress to 0.96 on press | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 2 | CHAT-01 | — | N/A | manual | skeleton rows render while chat list loads | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 2 | CHAT-02 | — | N/A | manual | haptic fires on send + reaction tap | ❌ W0 | ⬜ pending |
| 26-02-03 | 02 | 2 | CHAT-03 | — | N/A | unit | `npx jest --testPathPattern="useChatRoom" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 26-02-04 | 02 | 2 | CHAT-04 | — | N/A | manual | long-press bubble compresses to 0.96 before context menu | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. No new test files required — CHAT-03 optimistic send unit test leverages existing jest setup.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skeleton blobs appear during home load | HOME-01 | Visual animation, no DOM | Open app on slow connection or throttled simulator; verify shimmer renders before data arrives |
| Empty state card with CTA | HOME-02 | Requires 0-friends account state | Sign in with account that has no friends; verify card with "Add a friend" button appears |
| FADING pulse ring (amber) | HOME-03 | Visual animation + color | Set a friend's heartbeat to FADING state; verify amber ring animates slowly in radar view |
| Press scale feedback | HOME-04 | Tactile animation | Tap home cards; verify subtle compress-and-spring on each Pressable |
| Chat list skeleton | CHAT-01 | Visual animation | Open chat list on slow connection; verify skeleton rows before data arrives |
| Haptic feedback | CHAT-02 | Haptic engine | Send message and tap reaction; verify haptic fires on device |
| Long-press bubble scale | CHAT-04 | Visual + tactile | Long-press message bubble; verify compress animation before context menu opens |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
