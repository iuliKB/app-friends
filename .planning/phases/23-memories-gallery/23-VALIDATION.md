---
phase: 23
slug: memories-gallery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Expo / React Native (no automated test framework detected) |
| **Config file** | none — project does not use jest or vitest |
| **Quick run command** | `npx expo lint` |
| **Full suite command** | `npx expo lint` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx expo lint`
- **After every plan wave:** Run `npx expo lint` + manual smoke on iOS simulator
- **Before `/gsd-verify-work`:** Lint green + manual MEMO-01/02/03 smoke
- **Max feedback latency:** ~10 seconds (lint) + manual smoke

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | MEMO-01, MEMO-02, MEMO-03 | — | N/A | lint | `npx expo lint` | ❌ W0 | ⬜ pending |
| 23-01-02 | 01 | 1 | MEMO-01 | — | N/A | lint | `npx expo lint` | ❌ W0 | ⬜ pending |
| 23-02-01 | 02 | 2 | MEMO-02, MEMO-03 | — | N/A | manual-smoke | — | ❌ manual | ⬜ pending |
| 23-02-02 | 02 | 2 | MEMO-02 | — | N/A | lint | `npx expo lint` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.
- No test framework present in project — all verification via lint + manual smoke
- No Wave 0 test stub files needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Widget shows latest 6 photos on Home screen | MEMO-01 | No automated test framework | Open app → Home tab → verify RecentMemoriesSection renders with photos and plan captions |
| Tapping "See all" navigates to `/memories` | MEMO-02 | Navigation requires running app | Tap "See all" → verify MemoriesScreen opens with photos grouped by plan, newest first |
| Tapping widget thumbnail navigates to `/memories` | MEMO-02 | Navigation requires running app | Tap a widget thumbnail → verify MemoriesScreen opens |
| Gallery sections ordered newest-plan-first | MEMO-02 | Requires live data | Verify section order matches plan ordering by most recent photo |
| Tapping gallery thumbnail opens GalleryViewerModal | MEMO-03 | Modal interaction | Tap thumbnail → verify viewer opens with correct photo and uploader overlay |
| Delete button only visible for own photos | MEMO-03 | Auth-conditional UI | Verify trash icon shown only for photos uploaded by current user |
| Widget hidden when no photos exist | MEMO-01 | Requires empty data state | Log out, create a fresh test account with no plans → verify widget absent from Home |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
