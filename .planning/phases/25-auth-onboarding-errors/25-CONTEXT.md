# Phase 25: Auth, Onboarding & Errors - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver four polish requirements for the auth flow and app-wide error handling:
- AUTH-01: Forgot password link + email reset flow (inline on login tab)
- AUTH-02: ToS & Privacy Policy links on the sign-up tab
- AUTH-03: Consistent ErrorDisplay with retry on every data-fetching screen (~12 screens, ~14 hooks)
- AUTH-04: One-time first-run onboarding bottom sheet for new users

No new capabilities. No in-app deep link handler for the reset email — Supabase browser page handles that.

</domain>

<decisions>
## Implementation Decisions

### Password Reset (AUTH-01)
- **D-01:** Inline on the login tab — no new route needed. A "Forgot password?" tappable link appears below the password field. Tapping it toggles the login form into a "reset mode": shows a single email input + "Send reset link" button + "Back to sign in" link. On success, show a confirmation message in-place.
- **D-02:** The reset email link opens the Supabase-hosted browser page. No in-app deep link handler (`/auth/reset-confirm`) is in scope for this phase.

### ToS & Privacy Policy Links (AUTH-02)
- **D-03:** Placeholder URLs only — real hosted pages are a pre-submission task, not a coding task. Use `https://campfire.app/tos` and `https://campfire.app/privacy` as placeholder hrefs.
- **D-04:** Appears on the sign-up tab only, below the sign-up button. Standard convention: "By creating an account you agree to our [Terms of Service] and [Privacy Policy]." Both links open via `expo-web-browser` (already installed for Google OAuth).

### Error Audit (AUTH-03)
- **D-05:** All data-fetching screens get the audit — AUTH-03 says "every" and we honor that. Target: every screen that calls a hook backed by Supabase. Approximately 12 screens.
- **D-06:** Standardize hook return shape: every data hook returns `{ data, loading, error, refetch }`. Add `error: string | null` and `refetch: () => void` to each hook that currently only returns `data + loading`.
- **D-07:** On error, screens render `<ErrorDisplay mode="screen" message="..." onRetry={refetch} />`. The existing `ErrorDisplay` component already supports this — no changes to the component needed.

### First-Run Onboarding Hint (AUTH-04)
- **D-08:** UI is a **custom bottom sheet** (same custom implementation pattern as the existing codebase — `@gorhom/bottom-sheet` is broken on Reanimated v4). Appears once on the Home screen after profile setup completes.
- **D-09:** Content: "Welcome to Campfire!" heading, two guidance lines: "Tap your status above to let friends know if you're free." and "Head to Squad to add friends." One CTA button: "Get Started" that dismisses and sets the flag.
- **D-10:** Trigger: immediately after `ProfileSetup` screen completes and user lands on Home for the first time. Flag persisted in `AsyncStorage` with key `@campfire/onboarding_hint_shown`. Checked in `HomeScreen` on mount — if flag is absent AND user was just created (i.e., no friends yet), show the sheet.
- **D-11:** Dismissal: single "Get Started" button only. No swipe-to-dismiss — keeps implementation simple and avoids gesture handler complexity.

### Claude's Discretion
- The exact visual styling of the "Forgot password?" toggle animation (fade vs. immediate swap)
- The bottom sheet height for the onboarding hint (enough to show content comfortably, no fixed height needed)
- Exact error message copy per screen (e.g., "Couldn't load your friends" vs. generic "Something went wrong")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §AUTH-01–AUTH-04 — The four requirements this phase covers

### Auth Screen (main implementation target for AUTH-01 and AUTH-02)
- `src/screens/auth/AuthScreen.tsx` — Login/signup tab switcher; forgot password + ToS links go here
- `src/screens/auth/ProfileSetup.tsx` — Navigation from here to Home triggers the onboarding hint (AUTH-04)

### Error Infrastructure (AUTH-03)
- `src/components/common/ErrorDisplay.tsx` — Existing component with `mode='screen'` + `onRetry` prop; no changes needed
- `src/screens/plans/PlanDashboardScreen.tsx` — Currently the only screen using ErrorDisplay; reference as the pattern to replicate

### Data-Fetching Hooks to Audit (AUTH-03)
- `src/hooks/useHomeScreen.ts`
- `src/hooks/useFriends.ts`
- `src/hooks/usePlans.ts`
- `src/hooks/useChatRoom.ts`
- `src/hooks/useIOUSummary.ts`
- `src/hooks/useUpcomingBirthdays.ts`
- `src/hooks/useStreakData.ts`
- `src/hooks/useAllPlanPhotos.ts`
- `src/hooks/usePlanPhotos.ts`
- `src/hooks/useMyWishList.ts`
- `src/hooks/useFriendsOfFriend.ts`
- `src/hooks/useExpenseCreate.ts` — Write hook; error pattern may differ
- `src/hooks/useStatus.ts`
- `src/hooks/usePushNotifications.ts` — Not a data fetch; skip

### First-Run Hint Pattern Reference (AUTH-04)
- `src/theme/ThemeContext.tsx` — AsyncStorage pattern for persisted flags
- `src/app/(tabs)/index.tsx` — HomeScreen entry point; onboarding hint check goes here

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ErrorDisplay` at `src/components/common/ErrorDisplay.tsx`: Already has `mode='screen'` with icon, message, and `onRetry` button. Zero changes needed for AUTH-03.
- `expo-web-browser`: Already installed and used for Google OAuth. Use `WebBrowser.openBrowserAsync()` for ToS/Privacy links.
- `AsyncStorage`: Already used in `ThemeContext.tsx`, `usePushNotifications.ts`, and `useChatRoom.ts` for persisted flags. Same pattern for `@campfire/onboarding_hint_shown`.
- `PrimaryButton`: Loading state already supported — use for "Send reset link" button.
- `FormField`: Use for the reset email input in the inline forgot-password view.

### Established Patterns
- All hooks return `{ data, loading }` today. The new standard shape `{ data, loading, error, refetch }` is an additive change — no breaking changes to callers that don't use the new fields.
- Custom bottom sheet: `@gorhom/bottom-sheet` is broken on Reanimated v4. Prior custom sheets use `Animated` + `Modal` with a semi-transparent backdrop. See existing sheet implementations in the codebase.
- `useTheme()` + `useMemo([colors])` mandatory for any new components (OnboardingSheet, inline reset view).

### Integration Points
- `src/screens/auth/AuthScreen.tsx`: Add inline forgot-password toggle + ToS text with links on signup tab
- `src/screens/auth/ProfileSetup.tsx`: Set `@campfire/onboarding_hint_shown` flag trigger OR pass a param to HomeScreen to show the sheet
- `src/app/(tabs)/index.tsx` (HomeScreen): Check AsyncStorage flag on mount, conditionally render OnboardingBottomSheet
- All 12+ data-fetching screens: Replace silent empty/loading state with `ErrorDisplay mode='screen'` on error

</code_context>

<specifics>
## Specific Ideas

- The inline forgot-password view could use a simple `useState<'login' | 'reset'>` toggle within the existing `AuthScreen` — no new component needed.
- The onboarding bottom sheet is likely a new component at `src/components/onboarding/OnboardingHintSheet.tsx`.
- The "Get Started" button in the onboarding sheet can use the existing `PrimaryButton` component.

</specifics>

<deferred>
## Deferred Ideas

- In-app deep link handler for password reset email (`/auth/reset-confirm` route) — belongs in a future auth hardening phase, not a polish milestone item.
- Real hosted ToS and Privacy Policy pages — pre-submission task, not code.
- Pull-to-refresh haptic (mentioned in REQUIREMENTS.md future requirements) — deferred to v1.8 per requirements.

</deferred>

---

*Phase: 25-auth-onboarding-errors*
*Context gathered: 2026-05-05*
