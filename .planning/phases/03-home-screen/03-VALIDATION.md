---
phase: 3
slug: home-screen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no Jest/Vitest configured |
| **Config file** | None |
| **Quick run command** | `npx expo start` (manual test on device) |
| **Full suite command** | Manual smoke test checklist |
| **Estimated runtime** | ~30 seconds per manual check |

---

## Sampling Rate

- **After every task commit:** Run `npx expo start` and verify on device
- **After every plan wave:** Full manual smoke test checklist
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | HOME-01 | manual | n/a | n/a | ⬜ pending |
| 03-01-02 | 01 | 1 | HOME-02 | manual | n/a | n/a | ⬜ pending |
| 03-01-03 | 01 | 1 | HOME-03 | manual | n/a | n/a | ⬜ pending |
| 03-01-04 | 01 | 1 | HOME-05 | manual | n/a | n/a | ⬜ pending |
| 03-02-01 | 02 | 2 | HOME-04 | manual | n/a | n/a | ⬜ pending |
| 03-02-02 | 02 | 2 | HOME-01 | manual | n/a | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed — manual smoke testing is the appropriate validation method for this mobile UI phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Home screen renders from cache instantly | HOME-01 | UI timing, cache behaviour | Navigate away and back; grid should appear without loading flash |
| Free friends sorted by most-recently-updated | HOME-01 | Requires multi-device timing | Change status of two test users at different times; verify order |
| Header shows correct count | HOME-02 | Visual verification | Verify count matches visible free friend cards |
| Count animates on change | HOME-02 | Visual animation check | Trigger status change on second device; watch header |
| Cards show avatar, name, emoji tag | HOME-03 | Visual layout check | Use seed data users with avatars + tags set |
| Realtime status updates | HOME-04 | Requires two devices/sessions | On device B, change status; verify device A updates within seconds |
| Subscription cleanup on unmount | HOME-04 | Requires dev tools | Navigate away; check no WebSocket leak in Supabase dashboard |
| Start Plan FAB navigates to Plans tab | HOME-05 | Navigation check | Tap FAB; verify Plans tab activates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
