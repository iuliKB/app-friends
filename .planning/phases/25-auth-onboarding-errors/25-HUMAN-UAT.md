---
status: passed
phase: 25-auth-onboarding-errors
source: [25-VERIFICATION.md]
started: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## Current Test

Human testing complete.

## Tests

### 1. Forgot password fade animation and Supabase email delivery
expected: Tapping "Forgot password?" smoothly fades out the login form and fades in the reset form (email field + "Send reset link" button). Submitting a valid email triggers a Supabase password reset email delivery.
result: pass

### 2. Tab switch resets auth mode
expected: Switching between Login and Sign Up tabs always resets authMode back to 'login', dismissing the reset form if it was open.
result: pass

### 3. ToS/Privacy links open correct URLs
expected: Tapping "Terms of Service" opens https://campfire.app/tos and "Privacy Policy" opens https://campfire.app/privacy via the in-app browser (WebBrowser.openBrowserAsync).
result: pass — browser opens correctly; URLs are placeholder pages (no app content yet — create campfire.app/tos and campfire.app/privacy before App Store submission)

### 4. First-run onboarding sheet appears and cannot be dismissed by backdrop
expected: On first launch with zero friends, the OnboardingHintSheet slides up. Tapping outside the sheet (backdrop) does NOT dismiss it. Only the "Get Started" button closes it (D-11 requirement).
result: pass

### 5. Onboarding sheet shown only once
expected: After dismissing the sheet via "Get Started", relaunching the app does not show the sheet again (AsyncStorage flag @campfire/onboarding_hint_shown persists the dismissal).
result: pass

### 6. Existing users do not see onboarding sheet
expected: Users with one or more friends do not see the onboarding sheet on HomeScreen, even on first install.
result: pass

### 7. ErrorDisplay and retry on sample screens
expected: When a hook returns an error (e.g., simulated network failure), the screen shows ErrorDisplay in full-screen mode with a retry button. Tapping retry re-fetches and restores the screen.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
