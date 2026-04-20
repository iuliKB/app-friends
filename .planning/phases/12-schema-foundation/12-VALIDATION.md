---
phase: 12
slug: schema-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript strict (`tsc --noEmit`) + Supabase migration apply |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && supabase db push` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit && supabase db push`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | CHAT infra | — | Migration applies without data loss | manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | CHAT infra | — | `body` nullable; existing rows unaffected | manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | CHAT infra | — | `is_channel_member()` exists with SECURITY DEFINER | manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | CHAT infra | — | RLS on message_reactions enforces membership | manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 2 | CHAT infra | — | `src/types/chat.ts` compiles with strict TS | unit | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — TypeScript compiler and Supabase CLI are already available. No new test framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 0018 applies cleanly | CHAT infra | Requires live Supabase project connection | Run `supabase db push`; verify zero errors |
| Existing chat messages load normally | CHAT infra | Requires running app + Supabase | Open app, navigate to chat, send a message |
| `chat-media` bucket exists with public read | CHAT infra | Supabase dashboard / storage API | `supabase storage ls` or check dashboard |
| `create_poll()` RPC callable | CHAT infra | Requires Supabase connection | `supabase db execute` or PostgREST `/rpc/create_poll` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
