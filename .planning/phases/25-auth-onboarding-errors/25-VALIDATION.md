---
phase: 25
slug: auth-onboarding-errors
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — project has no jest/vitest/test directory |
| **Config file** | none — Wave 0 installs nothing |
| **Quick run command** | Manual verification on Expo Go / simulator |
| **Full suite command** | Manual end-to-end verification |
| **Estimated runtime** | ~5 minutes per wave (manual) |

---

## Sampling Rate

- **After every task commit:** Verify the changed screen/hook in Expo Go on simulator
- **After every plan wave:** Manually verify the feature worked end-to-end on the affected screens
- **Before `/gsd-verify-work`:** All 4 success criteria verified manually
- **Max feedback latency:** Immediate (developer checks after each task)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | AUTH-01 | T-25-01 | validateEmail() reused; no duplicate logic | manual | N/A | N/A | ⬜ pending |
| 25-01-02 | 01 | 1 | AUTH-01 | T-25-01 | authMode resets to 'login' on tab switch | manual | N/A | N/A | ⬜ pending |
| 25-01-03 | 01 | 1 | AUTH-01 | — | Reset confirmation shown on success | manual | N/A | N/A | ⬜ pending |
| 25-02-01 | 02 | 1 | AUTH-02 | — | ToS/Privacy links open system browser | manual | N/A | N/A | ⬜ pending |
| 25-03-01 | 03 | 2 | AUTH-03 | — | All 12 screens render ErrorDisplay on error | manual | N/A | N/A | ⬜ pending |
| 25-03-02 | 03 | 2 | AUTH-03 | — | Retry button calls refetch | manual | N/A | N/A | ⬜ pending |
| 25-04-01 | 04 | 2 | AUTH-04 | — | Sheet appears on first launch, zero friends | manual | N/A | N/A | ⬜ pending |
| 25-04-02 | 04 | 2 | AUTH-04 | — | Sheet not shown after "Get Started" dismissed | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — no test infrastructure to create. Existing manual verification covers all phase requirements.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Forgot-password toggle shows reset form | AUTH-01 | No test framework | Tap "Forgot password?" on login screen — verify form swaps |
| Reset email delivered via Supabase | AUTH-01 | Requires live Supabase + email provider | Enter real email, tap "Send reset link", check inbox |
| Success confirmation shown after send | AUTH-01 | No test framework | After submit, verify in-place confirmation message appears |
| Tab switch resets authMode to login | AUTH-01 | No test framework | While in reset form, switch to sign-up tab, switch back — login form should appear |
| ToS link opens system browser | AUTH-02 | Requires device/simulator | Tap "Terms of Service" on sign-up tab — verify browser opens |
| Privacy link opens system browser | AUTH-02 | Requires device/simulator | Tap "Privacy Policy" on sign-up tab — verify browser opens |
| All 12 screens show ErrorDisplay on error | AUTH-03 | Requires simulated network failure | Kill network mid-fetch; verify each screen shows ErrorDisplay with retry |
| Retry button calls refetch | AUTH-03 | Requires network simulation | After error, restore network, tap retry — verify data loads |
| Sheet shown on first launch, no friends | AUTH-04 | Requires clean AsyncStorage state | Clear app data, sign in as user with no friends, verify sheet appears |
| Sheet not shown after dismissed | AUTH-04 | Requires state persistence | Dismiss sheet, kill + reopen app — verify sheet does not appear |
| Sheet not shown if user already has friends | AUTH-04 | Requires friend data in DB | Sign in as user with existing friends — verify no sheet |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual instructions
- [ ] Sampling continuity: developer runs Expo Go check after each task commit
- [ ] Wave 0 covers all MISSING references (N/A — no test infra)
- [ ] No watch-mode flags
- [ ] Feedback latency: immediate (each task verified in simulator before next commit)
- [ ] `nyquist_compliant: true` set in frontmatter once sign-off complete

**Approval:** pending
