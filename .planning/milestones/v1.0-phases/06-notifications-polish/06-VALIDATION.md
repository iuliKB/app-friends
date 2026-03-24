---
phase: 6
slug: notifications-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 6 — Validation Strategy

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
| 06-01-01 | 01 | 1 | NOTF-01, NOTF-02 | manual | n/a | n/a | ⬜ pending |
| 06-02-01 | 02 | 2 | PROF-03, PROF-04 | manual | n/a | n/a | ⬜ pending |
| 06-03-01 | 03 | 3 | UIPOL-01, UIPOL-02, UIPOL-03, UIPOL-04 | manual | n/a | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push notification on plan invite | NOTF-01 | Requires EAS build + two devices | Create plan with invitee, verify push arrives |
| Tap notification opens plan dashboard | NOTF-01 | Device interaction | Tap notification, verify correct plan opens |
| Cold-start deep link | NOTF-01 | Kill app, receive push, tap | Kill app, send invite, tap notification from lock screen |
| Push token registration | NOTF-02 | Device-specific | Verify push_tokens table has entry after permission grant |
| Edit display name | PROF-03 | Form interaction | Change name, save, verify profile updated |
| Change avatar (gallery + camera) | PROF-03 | Device gallery/camera | Pick photo, verify upload to Storage |
| View other user's profile | PROF-04 | Navigation flow | Tap View Profile in FriendActionSheet, verify screen |
| Empty states on all list screens | UIPOL-03 | Visual verification | Check each screen with empty data |
| Status colours consistent | UIPOL-04 | Visual audit | Review all screens for correct colour usage |
| Loading indicators on all async | UIPOL-02 | Visual verification | Trigger each async op, verify indicator shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
