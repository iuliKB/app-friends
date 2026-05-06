---
phase: 29
slug: home-screen-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern="home\|radar\|viewPreference\|eventCard" --passWithNoTests` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="home\|radar\|viewPreference\|eventCard" --passWithNoTests`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | HOME-05 | — | N/A | unit | `npx jest --testPathPattern="RadarBubble.dead" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | HOME-06/HOME-08 | — | N/A | unit | `npx jest --testPathPattern="useViewPreference\|EventCard.phase29" --passWithNoTests` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 1 | HOME-05 | — | N/A | unit | `npx jest --testPathPattern="RadarBubble.dead" --no-coverage` | ❌ W0 | ⬜ pending |
| 29-03-01 | 03 | 1 | HOME-07 | — | N/A | visual | `! grep -qi "onboarding\|OnboardingHintSheet\|AsyncStorage" src/screens/home/HomeScreen.tsx && echo "PASS: clean" || echo "FAIL: stale references"` | ✅ | ⬜ pending |
| 29-04-01 | 04 | 1 | HOME-08 | — | N/A | unit | `npx jest --testPathPattern="EventCard.phase29" --no-coverage` | ❌ W0 | ⬜ pending |
| 29-05-01 | 05 | 2 | HOME-08 | — | N/A | unit | `npx jest --testPathPattern="EventCard.phase29\|UpcomingEventsSection" --no-coverage` | ❌ W0 | ⬜ pending |
| 29-05-02 | 05 | 2 | HOME-08 | — | N/A | visual | `npx tsc --noEmit 2>&1 | grep -i "homescreen\|UpcomingEvents" | head -5 && echo "PASS" || echo "FAIL"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/home/__tests__/RadarBubble.dead.test.tsx` — stubs for HOME-05 radar bubble visual states
- [ ] `src/hooks/__tests__/useViewPreference.test.ts` — unit tests for HOME-06 persistence
- [ ] `src/components/home/__tests__/EventCard.phase29.test.tsx` — stubs for HOME-08 event card dimensions + date pill

*Existing jest infrastructure confirmed — Wave 0 adds test stubs only. HOME-07 (EmptyState/OnboardingHintSheet) verified via grep command, no unit test file needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DEAD bubble greyscale overlay renders correctly on device | HOME-05 | Visual opacity/overlay can't be asserted in jest snapshot | Run app, navigate to Home, verify dead-status friend bubble appears greyscale |
| View mode persists after app kill | HOME-06 | Requires actual AsyncStorage + app restart on device/simulator | Switch to Cards mode, kill app, reopen, verify Cards mode still selected |
| "Invite friends" CTA navigates to Add Friend flow | HOME-07 | expo-router navigation not exercised in unit tests | Zero-friends state: tap "Invite friends" button, confirm correct screen opens |
| Events cards visual hierarchy feels native | HOME-08 | Subjective visual quality requires human review | Review event cards on-device for date prominence, avatar sizing, spacing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
