# Phase 25: Auth, Onboarding & Errors - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 25-auth-onboarding-errors
**Areas discussed:** Password Reset Flow, ToS & Privacy Links, Error Audit Scope, First-Run Hint UI

---

## Password Reset Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on login tab | Small 'Forgot password?' link below password field; toggles login form to reset mode in-place. No new screen needed. | ✓ |
| Separate forgot-password screen | Dedicated /auth/forgot-password route. Cleaner stack but requires a new route file. | |

**User's choice:** Inline on login tab — toggle `useState<'login' \| 'reset'>` within existing AuthScreen.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Out of scope for now | Supabase-hosted browser page handles reset link. No in-app deep link handler needed. | ✓ |
| Handle the deep link in-app | Add /auth/reset-confirm route with new password form. Requires Expo deep link config + token parsing. | |

**User's choice:** Out of scope — Supabase browser page handles it. Fits the "polish only" milestone scope.

---

## ToS & Privacy Links

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder links | Use placeholder URLs (e.g. https://campfire.app/tos). Easy to swap before App Store submission. | ✓ |
| Real hosted URLs | Requires hosting the pages now — outside codebase scope. | |

**User's choice:** Placeholder links.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sign-up tab only | Standard convention — only shown when creating an account. | ✓ |
| Both login and signup tabs | Always visible; unusual UX for returning users. | |

**User's choice:** Sign-up tab only.

---

## Error Audit Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All data-fetching screens | Every screen with a Supabase-backed hook gets ErrorDisplay mode='screen' + retry. ~12 screens. | ✓ |
| Main screens only | Focus on 5 tabs + Plan dashboard. Faster but doesn't satisfy AUTH-03 "every screen". | |

**User's choice:** All data-fetching screens — AUTH-03 says "every" and we honor that.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add error + refetch to each hook | Standardize: every hook returns { data, loading, error, refetch }. Clean and consistent. | ✓ |
| Screen-level try/catch only | Leave hooks as-is; screens add own error state. Less invasive but duplicates logic. | |

**User's choice:** Add `error + refetch` to each data hook. Standard shape going forward.

---

## First-Run Hint UI

| Option | Description | Selected |
|--------|-------------|----------|
| Inline banner on Home screen | Dismissible card at top of Home content. Two action rows. | |
| Bottom sheet on first launch | Modal bottom sheet with guidance content and a single CTA button. | ✓ |

**User's choice:** Bottom sheet — more prominent, intentional first impression.

---

| Option | Description | Selected |
|--------|-------------|----------|
| After profile setup completes | Trigger when new user finishes ProfileSetup and lands on Home. Doesn't affect reinstalls. | ✓ |
| On first Home screen mount ever | Could show to users who reinstalled. | |

**User's choice:** After profile setup completes.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single 'Get Started' button | One CTA closes it and sets AsyncStorage flag. Clean and intentional. | ✓ |
| Swipe down or button | Both gesture and button. More flexible but requires custom gesture handling. | |

**User's choice:** Single "Get Started" button only.

---

## Claude's Discretion

- Toggle animation style for the inline forgot-password view (fade vs. immediate swap)
- Bottom sheet height for the onboarding hint
- Exact per-screen error message copy

## Deferred Ideas

- In-app deep link handler for password reset email — future auth hardening phase
- Real hosted ToS / Privacy Policy pages — pre-submission task, not code
