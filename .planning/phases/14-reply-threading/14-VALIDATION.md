---
phase: 14
slug: reply-threading
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E), Jest/Vitest (unit) |
| **Config file** | playwright.config.ts |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 0 | CHAT-07 | — | N/A | build | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | CHAT-07 | — | Only own messages can be soft-deleted | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 14-02-01 | 02 | 1 | CHAT-07 | — | N/A | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 14-02-02 | 02 | 1 | CHAT-08 | — | N/A | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 14-03-01 | 03 | 2 | CHAT-08 | — | N/A | e2e | `npx playwright test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Migration file for `message_type` CHECK constraint fix and RLS UPDATE policy
- [ ] `supabase db push` run to apply migration before any app code changes

*These are infrastructure prerequisites — no test stubs needed for Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Long-press opens context menu | CHAT-07 | Native gesture, no Playwright support | Long-press a message bubble in dev build; verify menu appears |
| Quoted preview bar appears above composer | CHAT-08 | UI interaction | Tap Reply in context menu; verify quoted bar shows sender + first line |
| Tapping quoted block scrolls to original | CHAT-08 | FlatList scroll position | Tap quoted block; verify FlatList scrolls to original message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
