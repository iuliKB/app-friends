---
phase: 25-auth-onboarding-errors
verified: 2026-05-05T12:00:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Tap 'Forgot password?' on login screen — verify fade animation, reset form appears, submit triggers Supabase reset email"
    expected: "Form fades out (200ms), reset form fades in, valid email submission calls supabase.auth.resetPasswordForEmail and transitions to reset-sent state showing 'Check your email'"
    why_human: "Animation feel and actual Supabase email delivery require device testing; no test runner available"
  - test: "Tab switch while in reset mode — verify authMode resets to 'login'"
    expected: "Tapping Signup tab while reset form is visible clears reset state and shows signup form"
    why_human: "State machine reset requires runtime interaction"
  - test: "Sign-up tab shows ToS/Privacy links — verify both open correct URLs in system browser"
    expected: "Tapping 'Terms of Service' opens https://campfire.app/tos; tapping 'Privacy Policy' opens https://campfire.app/privacy"
    why_human: "WebBrowser.openBrowserAsync behavior requires device testing"
  - test: "First-run onboarding: fresh account with zero friends sees OnboardingHintSheet after HomeScreen loads"
    expected: "Sheet slides up from bottom, shows fire emoji, 'Welcome to Campfire!' heading, two guidance lines, 'Get Started' button. Sheet cannot be dismissed by tapping backdrop. Tapping 'Get Started' dismisses and writes AsyncStorage flag — sheet never appears again"
    why_human: "AsyncStorage flag persistence and Modal behavior require device testing; D-11 (no swipe/tap-to-dismiss) needs physical interaction to confirm"
  - test: "User with existing friends does NOT see OnboardingHintSheet"
    expected: "HomeScreen loads normally, no onboarding sheet appears (friends.length > 0 guard prevents display)"
    why_human: "Conditional display logic requires runtime verification with real user data"
  - test: "All 12 screens show ErrorDisplay on network failure — verify retry button works"
    expected: "Simulating a hook error (temporarily modify fetch to return error) shows ErrorDisplay with correct copy and working retry button on each screen"
    why_human: "Error simulation requires manual modification of hooks; runtime behavior cannot be verified statically"
---

# Phase 25: Auth, Onboarding & Errors — Verification Report

**Phase Goal:** App Store-blocking auth and error experience items are complete
**Verified:** 2026-05-05T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can tap "Forgot password?" on login screen, enter email, receive a reset link without contacting support | VERIFIED | `AuthMode` type and 3-state machine in `AuthScreen.tsx` (line 26); `handleSendResetLink` calls `supabase.auth.resetPasswordForEmail` (line 134); "Forgot password?" link rendered in JSX (line 486) |
| 2 | Sign-up screen displays visible, tappable Terms of Service and Privacy Policy links | VERIFIED | `TOS_URL`/`PRIVACY_URL` constants at lines 22-23; `openBrowserAsync(TOS_URL)` and `openBrowserAsync(PRIVACY_URL)` wired to `onPress` handlers; `textDecorationLine: 'underline'` at line 404 |
| 3 | Every data-fetching screen shows ErrorDisplay with a retry action when fetch fails — no silent blank screens | VERIFIED | All 12 screens confirmed: HomeScreen, FriendsList, FriendRequests, AddFriend, ChatListScreen, ChatRoomScreen, PlansListScreen, PlanDashboardScreen, squad.tsx, wish-list.tsx, birthday/[id].tsx, MemoriesTabContent — each imports `ErrorDisplay`, uses `mode="screen"`, and wires `onRetry` to a refetch function |
| 4 | A first-run user (zero friends) sees a one-time dismissible hint guiding them to set their status and add a friend | VERIFIED | `OnboardingHintSheet.tsx` created with correct content; HomeScreen wires AsyncStorage flag check with `friends.length === 0` guard; `handleOnboardingDismiss` writes `@campfire/onboarding_hint_shown` flag; no `PanResponder` or `TouchableWithoutFeedback` backdrop (D-11 honored) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/screens/auth/AuthScreen.tsx` | Inline forgot-password toggle + ToS/Privacy links | VERIFIED | Contains `AuthMode` type, `handleForgotPassword`, `handleSendResetLink`, `handleBackToSignIn`, `setAuthMode('login')` in `handleTabChange`, `ANIMATION.duration.fast` tokens, `TOS_URL`/`PRIVACY_URL` |
| `src/hooks/useHomeScreen.ts` | `refetch: fetchAllFriends` alias | VERIFIED | Line 160: `refetch: fetchAllFriends` present alongside original `fetchAllFriends` field |
| `src/hooks/useFriends.ts` | Top-level `error: string \| null` + `refetch: fetchFriends` | VERIFIED | Line 37: `const [error, setError] = useState<string \| null>(null)`; line 42: `setError(null)` clear on call; line 46: `setError(rpcError.message)` on error; line 282: `refetch: fetchFriends` |
| `src/hooks/useChatRoom.ts` | `refetch: fetchMessages` alias | VERIFIED | Line 778: `refetch: fetchMessages` present |
| `src/screens/home/HomeScreen.tsx` | ErrorDisplay + OnboardingHintSheet wiring | VERIFIED | ErrorDisplay at line 169; AsyncStorage import at line 11; OnboardingHintSheet import at line 20; flag key at line 49; `friends.length === 0` at line 58; `<OnboardingHintSheet>` at line 240 |
| `src/screens/friends/FriendsList.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 10; ErrorDisplay at lines 89-92 with `onRetry={refetch}` |
| `src/screens/friends/FriendRequests.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 8; ErrorDisplay at lines 79-82 with `onRetry={fetchPendingRequests}` |
| `src/screens/friends/AddFriend.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 8; ErrorDisplay at lines 299-302 with `onRetry={refetch}` |
| `src/screens/chat/ChatListScreen.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 10; ErrorDisplay at lines 66-69 with `onRetry={handleRefresh}` |
| `src/screens/chat/ChatRoomScreen.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 32; ErrorDisplay at lines 281-284 with `onRetry={refetch}` |
| `src/screens/plans/PlansListScreen.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 17; ErrorDisplay at lines 316-319 with `onRetry={fetchPlans}` |
| `src/screens/plans/PlanDashboardScreen.tsx` | ErrorDisplay mode='screen' (replacing bespoke error text) | VERIFIED | Import at line 36; ErrorDisplay at lines 450-453 with `onRetry={refetch}` |
| `src/app/(tabs)/squad.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 32; ErrorDisplay at lines 297-300 with `onRetry={streak.refetch}` |
| `src/app/profile/wish-list.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 14; ErrorDisplay at lines 136-139 with `onRetry={refetch}` |
| `src/app/squad/birthday/[id].tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 25; ErrorDisplay at lines 209-212 with `onRetry={refetchFriends}` |
| `src/components/squad/MemoriesTabContent.tsx` | ErrorDisplay mode='screen' | VERIFIED | Import at line 19; ErrorDisplay at lines 133-136 with `onRetry={refetch}` |
| `src/components/onboarding/OnboardingHintSheet.tsx` | Custom bottom sheet with Animated + Modal, no swipe/tap-to-dismiss | VERIFIED | File exists; contains `Modal transparent animationType="none"`, `Animated.timing`, `translateY.setValue(600)`, "Welcome to Campfire!", "Get Started" button, `accessibilityViewIsModal`; no `PanResponder` or `TouchableWithoutFeedback` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| "Forgot password?" link | `authMode` state machine | `onPress setAuthMode('reset')` via `handleForgotPassword` | WIRED | `handleForgotPassword` fades form and calls `setAuthMode('reset')` at line 99 |
| `handleSendResetLink` | `supabase.auth.resetPasswordForEmail` | async call | WIRED | Line 134: `const { error } = await supabase.auth.resetPasswordForEmail(resetEmail)` |
| ToS/Privacy Text spans | `WebBrowser.openBrowserAsync` | `onPress` | WIRED | Lines 509-519: `onPress={() => WebBrowser.openBrowserAsync(TOS_URL)}` and `openBrowserAsync(PRIVACY_URL)` |
| `handleTabChange` | `setAuthMode('login')` | extends existing handler | WIRED | Line 88: `setAuthMode('login')` inside `handleTabChange` |
| `useFriends` error state | `FriendsList` / `FriendRequests` screens | destructured `error` field | WIRED | FriendsList: `const { ..., error, refetch } = useFriends()`; FriendRequests: `const { ..., error, fetchPendingRequests } = useFriends()` |
| `useChatRoom refetch` | `ChatRoomScreen` | `ErrorDisplay onRetry` prop | WIRED | `ChatRoomScreen.tsx` line 284: `onRetry={refetch}` where refetch = fetchMessages |
| `HomeScreen useEffect` | `AsyncStorage.getItem('@campfire/onboarding_hint_shown')` | useEffect after loading settles | WIRED | Lines 53-63: effect with `if (loading) return` guard, `AsyncStorage.getItem`, `friends.length === 0` condition |
| `OnboardingHintSheet onDismiss` | `AsyncStorage.setItem('@campfire/onboarding_hint_shown', 'true')` | `handleOnboardingDismiss` in HomeScreen | WIRED | Line 66: `AsyncStorage.setItem(ONBOARDING_FLAG_KEY, 'true').catch(() => {})` |

### Data-Flow Trace (Level 4)

Dynamic data-rendering artifacts from this phase do not render streamed or fetched data — they render fixed copy strings (error messages, onboarding text) or pass through hook state that was verified wired at Level 3. Level 4 trace is not applicable for these artifacts.

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points without a device/simulator; app requires Expo Go.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUTH-01 | 25-01 | User can reset their password via email link from login screen | SATISFIED | `handleSendResetLink` + `supabase.auth.resetPasswordForEmail` + 3-state `AuthMode` machine in `AuthScreen.tsx` |
| AUTH-02 | 25-01 | Sign-up screen shows visible Terms of Service and Privacy Policy links | SATISFIED | `TOS_URL`/`PRIVACY_URL` constants + `openBrowserAsync` wiring + `textDecorationLine: 'underline'` in `AuthScreen.tsx` |
| AUTH-03 | 25-02, 25-03, 25-04 | Every data-fetching screen shows ErrorDisplay with retry action when fetch fails | SATISFIED | 3 hooks standardised with `error` + `refetch`; 12 screens wired with `ErrorDisplay mode='screen'` and `onRetry` |
| AUTH-04 | 25-05 | First-run users see one-time hint guiding them to set status and add a friend | SATISFIED | `OnboardingHintSheet.tsx` created; HomeScreen wired with AsyncStorage flag check + `friends.length === 0` guard |

All 4 requirements mapped to Phase 25 in REQUIREMENTS.md traceability table are SATISFIED. REQUIREMENTS.md shows all four marked `[x]`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/screens/plans/PlansListScreen.tsx` | 403 | Residual inline error Text inside `ListEmptyComponent` with `{error ?? "Couldn't load plans. Pull down to try again."}` | Info | Dead code — the early-return `if (error)` guard at line 313 prevents this render path from executing when error is truthy. No user-visible impact. |

### Human Verification Required

**All automated checks passed.** The following items require device or simulator testing to confirm behavioral correctness:

#### 1. Forgot Password Flow (AUTH-01)

**Test:** On login screen, tap "Forgot password?" link below password field.
**Expected:** Login form fades out (200ms), reset form slides in with email input and "Send reset link" button. Submit with valid email — form shows "Check your email" success state. Tap "Back to sign in" — returns to login form.
**Why human:** Animation timing and Supabase email delivery require runtime testing.

#### 2. Tab Switch Resets Auth Mode (AUTH-01)

**Test:** Enter reset form mode. Switch to Signup tab. Switch back to Login tab.
**Expected:** Reset form is cleared; login form appears fresh on each tab switch.
**Why human:** React state machine reset requires runtime interaction.

#### 3. ToS/Privacy Links Open Correct URLs (AUTH-02)

**Test:** On sign-up tab, tap "Terms of Service" and "Privacy Policy" links.
**Expected:** System browser opens `https://campfire.app/tos` and `https://campfire.app/privacy` respectively.
**Why human:** `WebBrowser.openBrowserAsync` behavior requires device testing.

#### 4. First-Run Onboarding Sheet (AUTH-04)

**Test:** Clear app data or use a fresh account with zero friends. Navigate to HomeScreen.
**Expected:** After friends data loads (empty), `OnboardingHintSheet` slides up from bottom. Sheet shows fire emoji, "Welcome to Campfire!" heading, "Tap your status above..." and "Head to Squad to add friends." guidance lines, and "Get Started" button. Tapping backdrop does NOT dismiss. Tapping "Get Started" dismisses sheet.
**Why human:** Modal behavior, animation, and "no swipe/tap-to-dismiss" (D-11) require physical interaction to confirm.

#### 5. Onboarding Sheet Shown Only Once (AUTH-04)

**Test:** After dismissing the sheet, navigate away and return to HomeScreen. Restart the app.
**Expected:** Sheet does NOT appear again on subsequent visits.
**Why human:** AsyncStorage persistence requires runtime verification.

#### 6. Existing Users Not Shown Onboarding Sheet (AUTH-04)

**Test:** Log in as a user with at least one friend. Navigate to HomeScreen.
**Expected:** No onboarding sheet appears.
**Why human:** `friends.length > 0` guard requires real user data to confirm.

#### 7. Error States on Each Screen (AUTH-03)

**Test:** For a sample of screens (HomeScreen, ChatRoomScreen, PlansListScreen), temporarily modify the hook to return an error string. Verify ErrorDisplay appears with correct copy and retry works.
**Expected:** Each screen shows ErrorDisplay with the documented message and working "Try Again" button.
**Why human:** Error simulation requires hook modification and Expo Go reload.

### Gaps Summary

No blocking gaps found. All must-haves are verified in the codebase. The phase goal is achieved at the code level.

One informational anti-pattern: `PlansListScreen.tsx` line 403 has a residual inline error Text inside `ListEmptyComponent`. This is unreachable dead code (the early-return guard prevents this path when `error` is truthy). No action required before phase close, but can be cleaned up during future maintenance.

---

_Verified: 2026-05-05T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
