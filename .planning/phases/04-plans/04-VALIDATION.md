---
phase: 4
slug: plans
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 4 — Validation Strategy

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

- **After every task commit:** Run `npx tsc --noEmit` for compile check
- **After every plan wave:** Full manual smoke test checklist
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | PLAN-01, PLAN-02 | manual | n/a | n/a | ⬜ pending |
| 04-02-01 | 02 | 2 | PLAN-03 | manual | n/a | n/a | ⬜ pending |
| 04-02-02 | 02 | 2 | PLAN-04, PLAN-05, PLAN-06 | manual | n/a | n/a | ⬜ pending |
| 04-03-01 | 03 | 3 | PLAN-07, PLAN-08, PLAN-09 | manual | n/a | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed — manual smoke testing is the appropriate validation method for this mobile UI phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quick Plan creation <10 seconds | PLAN-01 | Timing, UX flow | Open FAB, fill minimal fields, tap Create, measure time |
| Free friends pre-checked | PLAN-02 | UI state on mount | Set test friend to Free, open creation, verify checkbox |
| Plans list sorted by time | PLAN-03 | Visual verification | Create 3 plans at different times, verify order |
| Edit mode saves details | PLAN-04 | Multi-field edit flow | Toggle edit, change title/time/location, verify persistence |
| RSVP persists | PLAN-05 | Server confirmation | Tap Going, refresh, verify still Going |
| Member list grouped by RSVP | PLAN-06 | Visual grouping | Have 3 members with different RSVPs, verify groups |
| Link Dump saves on blur | PLAN-07 | Blur event timing | Type URL, tap away, reload, verify text persists |
| IOU Notes saves on blur | PLAN-08 | Blur event timing | Type note, tap away, reload, verify text persists |
| Open Chat navigates to Chat tab | PLAN-09 | Navigation check | Tap button, verify Chat tab activates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
