---
phase: 25-auth-onboarding-errors
plan: "01"
subsystem: auth
tags: [auth, forgot-password, tos, animation, accessibility]
dependency_graph:
  requires: []
  provides: [AUTH-01, AUTH-02]
  affects: [src/screens/auth/AuthScreen.tsx]
tech_stack:
  added: []
  patterns:
    - "3-state AuthMode machine (login/reset/reset-sent) via useState"
    - "Fade transition using Animated.timing with ANIMATION.duration.fast tokens"
    - "ANIMATION.easing.standard() for all form fade transitions"
key_files:
  modified:
    - src/screens/auth/AuthScreen.tsx
decisions:
  - "Wrapped full form area in Animated.View for opacity — enables fade without layout shift"
  - "Tab switcher hidden during reset/reset-sent modes to reduce visual noise"
  - "OAuth divider and buttons hidden during reset flow — contextually irrelevant"
  - "ToS disclaimer placed inside authMode===login block, activeTab===signup condition"
metrics:
  duration_minutes: 5
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_modified: 1
---

# Phase 25 Plan 01: Forgot Password + ToS/Privacy Links Summary

Inline forgot-password 3-state machine and ToS/Privacy legal disclaimer added to AuthScreen.tsx using animation tokens and theme design system.

## What Was Built

**Task 1 — AUTH-01: Inline forgot-password state machine**

AuthScreen.tsx extended with:
- `AuthMode` type: `'login' | 'reset' | 'reset-sent'`
- `handleForgotPassword()` — fades form out, sets mode to `'reset'`, fades in
- `handleBackToSignIn()` — fades out, resets to `'login'`, clears reset state, fades in
- `handleSendResetLink()` — validates email via existing `validateEmail()`, calls `supabase.auth.resetPasswordForEmail()`, transitions to `'reset-sent'` on success
- `handleTabChange()` extended to reset `authMode` to `'login'` on every tab switch
- "Forgot password?" link appears below password field on login tab only
- Reset form: email input + "Send reset link" button + inline error via `ErrorDisplay`
- Reset-sent success state: checkmark icon + "Check your email" heading + email confirmation + "Back to sign in" link
- All fade transitions use `ANIMATION.duration.fast` (200ms) with `ANIMATION.easing.standard()`

**Task 2 — AUTH-02: ToS/Privacy legal disclaimer**

- `TOS_URL` and `PRIVACY_URL` constants at module scope
- Disclaimer text "By creating an account you agree to our Terms of Service and Privacy Policy." renders below "Create Account" button on sign-up tab only
- Tapping each link calls `WebBrowser.openBrowserAsync()` with the respective URL (no duplicate import — WebBrowser already present)
- `tosLink` style uses `textDecorationLine: 'underline'` per UI-SPEC
- All styles inside `useMemo([colors])` StyleSheet.create block

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 + Task 2 | d59e51c | feat(25-01): add inline forgot-password state machine to AuthScreen |

## Deviations from Plan

**1. [Rule — Structural] Tab switcher and OAuth section hidden during reset flow**
- **Found during:** Task 1 implementation
- **Issue:** Plan spec wraps only the "form content area" in Animated.View, but the AuthTabSwitcher and OAuth buttons are outside the form. Showing the tab switcher while in reset mode is confusing UX — user is mid-flow and switching tabs would reset the form anyway via handleTabChange.
- **Fix:** Conditionally render `<AuthTabSwitcher>` and the OAuth divider/buttons block only when `authMode === 'login'`. No architectural change — same conditional pattern used throughout the JSX.
- **Files modified:** src/screens/auth/AuthScreen.tsx
- **Commit:** d59e51c

**2. [Rule — Structural] Tasks 1 and 2 committed atomically**
- Both tasks modify only `AuthScreen.tsx`. Splitting into two sequential commits would require an intermediate state where the file has no ToS content — unclear value. Both tasks committed together in d59e51c.

## Known Stubs

None — all functionality wired to real Supabase APIs and WebBrowser calls. No placeholder data.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All additions are client-side UI state + existing Supabase auth API + system browser navigation.

## Self-Check: PASSED

- src/screens/auth/AuthScreen.tsx exists and contains all required elements
- Commit d59e51c verified in git log
- All acceptance criteria met (verified via grep checks)
