---
phase: 2
slug: friends-status
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — lint + typecheck as validation proxy |
| **Config file** | `eslint.config.js` + `tsconfig.json` |
| **Quick run command** | `npx tsc --noEmit && npx expo lint` |
| **Full suite command** | `npx tsc --noEmit && npx expo lint` + manual smoke test |
| **Estimated runtime** | ~10 seconds (automated) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npx expo lint`
- **After every plan wave:** Run full suite + manual smoke test on device
- **Before `/gsd:verify-work`:** Full lint + typecheck + physical device smoke test
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-01-01 | 01 | 1 | FRND-01,02 | type-check | `npx tsc --noEmit && npx expo lint` | ⬜ pending |
| 02-01-02 | 01 | 1 | FRND-03,04,05 | type-check | `npx tsc --noEmit && npx expo lint` | ⬜ pending |
| 02-02-01 | 02 | 2 | FRND-06,07 | type-check | `npx tsc --noEmit && npx expo lint` | ⬜ pending |
| 02-03-01 | 03 | 1 | STAT-01,02,03,04 | type-check | `npx tsc --noEmit && npx expo lint` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Username search returns card | FRND-01 | Requires device + Supabase | Search for seed user, verify card appears |
| Friend request inserts row | FRND-02 | Requires device | Send request, check Supabase dashboard |
| Pending requests visible | FRND-03 | Requires two accounts | Use seed test accounts |
| Accept/reject works | FRND-04 | Requires device interaction | Test both paths |
| Friends list shows status | FRND-05 | Visual check | Verify colour pills match status |
| QR code scannable | FRND-06 | Physical device only | Use external QR reader to verify |
| QR scan adds friend | FRND-07 | Requires two devices | Scan between devices |
| Status toggle saves to DB | STAT-01 | Requires device | Toggle, check statuses table |
| Emoji sets context_tag | STAT-02 | Requires device | Tap emoji, verify DB column |
| Emoji clear works | STAT-03 | Requires device | Tap same emoji, verify NULL |
| New user defaults maybe | STAT-04 | DB trigger | Already verified — handle_new_user trigger |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
