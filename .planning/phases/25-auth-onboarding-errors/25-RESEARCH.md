# Phase 25: Auth, Onboarding & Errors - Research

**Researched:** 2026-05-05
**Domain:** React Native auth flows, Supabase password reset, AsyncStorage flags, error state standardisation
**Confidence:** HIGH

## Summary

Phase 25 is a pure polish phase with zero new capabilities. All four requirements are additive changes on top of already-working infrastructure. The codebase is highly consistent and well-structured — every pattern needed already exists and only needs to be replicated or extended.

AUTH-01 adds an inline forgot-password toggle to `AuthScreen.tsx`. The Supabase JS client's `resetPasswordForEmail()` method sends a hosted reset email. No routing or deep link work is in scope. AUTH-02 adds a ToS/Privacy legal disclaimer to the sign-up tab using `expo-web-browser` (already installed). AUTH-03 is a mechanical audit: 12–14 hooks are checked against the standard `{ data, loading, error, refetch }` shape, and ~12 screens are updated to render `<ErrorDisplay mode="screen" onRetry={refetch} />` on error. AUTH-04 adds a one-time onboarding bottom sheet using the established `Animated + Modal` custom-sheet pattern.

**Primary recommendation:** Follow the patterns already in the codebase exactly. Every technique required — Supabase auth calls, `expo-web-browser`, AsyncStorage flags, custom bottom sheets, `ErrorDisplay` — has a working reference implementation. Do not introduce new dependencies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Password Reset (AUTH-01)**
- D-01: Inline toggle on login tab (`useState<'login' | 'reset'>` or similar). No new route. Tapping "Forgot password?" swaps the login form into a single-email + "Send reset link" UI. On success, show in-place confirmation.
- D-02: Reset email links to Supabase-hosted browser page only. No in-app `/auth/reset-confirm` deep link handler in this phase.

**ToS & Privacy Links (AUTH-02)**
- D-03: Placeholder URLs: `https://campfire.app/tos` and `https://campfire.app/privacy`. Not real pages yet.
- D-04: Appears on sign-up tab only, below the sign-up button. Standard copy: "By creating an account you agree to our [Terms of Service] and [Privacy Policy]." Links open via `WebBrowser.openBrowserAsync()`.

**Error Audit (AUTH-03)**
- D-05: Every data-fetching screen that calls a Supabase-backed hook gets the audit. Target: ~12 screens.
- D-06: Standard hook return shape: `{ data, loading, error, refetch }`. Additive only — no breaking changes to callers not using the new fields.
- D-07: Error state renders `<ErrorDisplay mode="screen" message="..." onRetry={refetch} />`. Existing component — no changes needed.

**First-Run Onboarding Hint (AUTH-04)**
- D-08: Custom bottom sheet — `Animated + Modal` pattern. `@gorhom/bottom-sheet` is broken on Reanimated v4 and must NOT be used.
- D-09: Content: "Welcome to Campfire!" heading, two guidance lines, one "Get Started" CTA.
- D-10: Trigger: after `ProfileSetup` completes and user lands on `HomeScreen` for the first time. Flag key: `@campfire/onboarding_hint_shown` in AsyncStorage. Show if flag absent AND user has no friends.
- D-11: No swipe-to-dismiss. "Get Started" button is the only exit.

### Claude's Discretion
- Exact visual styling of the "Forgot password?" toggle animation (fade vs. immediate swap). UI-SPEC says: fade out current form at 200ms, fade in reset form at 200ms using `ANIMATION.duration.fast`.
- The bottom sheet height for the onboarding hint — content-driven per UI-SPEC.
- Exact error message copy per screen — specified in UI-SPEC Copywriting Contract.

### Deferred Ideas (OUT OF SCOPE)
- In-app deep link handler for password reset email (`/auth/reset-confirm` route)
- Real hosted ToS and Privacy Policy pages
- Pull-to-refresh haptic (v1.8)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can reset their password via an email link from the login screen | Supabase `resetPasswordForEmail()` sends hosted reset email; inline toggle is a simple `useState` state machine in `AuthScreen.tsx` |
| AUTH-02 | Sign-up screen shows visible Terms of Service and Privacy Policy links | `expo-web-browser` already installed; `WebBrowser.openBrowserAsync()` is the correct API; links go in sign-up tab below CTA |
| AUTH-03 | Every data-fetching screen shows ErrorDisplay with a retry action when the fetch fails | 12 hooks audited — most already return `error` + `refetch`; screens only need to consume them; `ErrorDisplay` component requires no changes |
| AUTH-04 | First-run users see a one-time hint guiding them to set their status and add a friend | AsyncStorage flag pattern established in `ThemeContext.tsx`; custom bottom sheet pattern established in `StatusPickerSheet.tsx` |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Password reset email dispatch | Supabase Auth (cloud) | Client (trigger only) | `resetPasswordForEmail()` is a Supabase Auth API call; the app only triggers it |
| Forgot-password toggle UI | React Native screen | — | Pure local state machine inside `AuthScreen.tsx` |
| ToS/Privacy link opening | expo-web-browser | — | Already used for Google OAuth in same file |
| Error state standardisation | Hook layer (data) + Screen layer (UI) | — | Hooks expose `error` + `refetch`; screens render `ErrorDisplay` |
| Onboarding flag persistence | AsyncStorage | — | Lightweight key-value flag, same pattern as theme preference |
| Onboarding sheet rendering | React Native screen | — | Conditional render in `HomeScreen` on mount |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | in use | `resetPasswordForEmail()` for password reset | Already the auth provider |
| `expo-web-browser` | in use | Open ToS/Privacy URLs in system browser | Already used for Google OAuth in `AuthScreen.tsx` |
| `@react-native-async-storage/async-storage` | in use | Persist `@campfire/onboarding_hint_shown` flag | Established pattern in `ThemeContext.tsx` and `useChatRoom.ts` |
| `react-native` `Animated` + `Modal` | in use | Custom bottom sheet for `OnboardingHintSheet` | `@gorhom/bottom-sheet` broken on Reanimated v4; `StatusPickerSheet.tsx` is the reference |

### No new packages required

All capabilities are covered by currently installed dependencies. Do not add `@gorhom/bottom-sheet` or any bottom sheet library.

**Installation:** None needed.

---

## Architecture Patterns

### System Architecture Diagram

```
AUTH-01: Forgot Password Flow
──────────────────────────────
User taps "Forgot password?" 
  → AuthScreen setState('reset')
  → [fade out login form] → [fade in reset form]
  → User enters email → taps "Send reset link"
  → supabase.auth.resetPasswordForEmail(email, { redirectTo })
  → [success] → setState('reset-sent') → show confirmation
  → [error]   → show inline error via ErrorDisplay mode='inline'
  → "Back to sign in" → setState('login')

AUTH-02: ToS / Privacy Links
──────────────────────────────
sign-up tab renders → below PrimaryButton ("Create Account")
  → Text disclaimer with onPress spans
  → onPress("Terms of Service") → WebBrowser.openBrowserAsync(TOS_URL)
  → onPress("Privacy Policy")   → WebBrowser.openBrowserAsync(PRIVACY_URL)

AUTH-03: Error State Audit
──────────────────────────────
Hook layer: each hook returns { data, loading, error: string|null, refetch }
Screen layer: 
  if (error) → <ErrorDisplay mode="screen" message="..." onRetry={refetch} />
  else       → normal screen content

AUTH-04: First-Run Onboarding
──────────────────────────────
ProfileSetup.handleSaveProfile() succeeds
  → setNeedsProfileSetup(false) → router transitions to HomeScreen
HomeScreen mounts → useEffect reads AsyncStorage key
  → flag absent? → check friends.length === 0
  → both true → setOnboardingVisible(true)
  → <OnboardingHintSheet visible onDismiss={handleDismiss} />
  → User taps "Get Started"
  → AsyncStorage.setItem('@campfire/onboarding_hint_shown', 'true')
  → setOnboardingVisible(false)
```

### Recommended Project Structure

```
src/
├── screens/auth/
│   └── AuthScreen.tsx           # AUTH-01 toggle + AUTH-02 ToS links (modify)
├── components/onboarding/
│   └── OnboardingHintSheet.tsx  # AUTH-04 new component
├── app/(tabs)/index.tsx         # AUTH-04 trigger (thin wrapper — delegates to HomeScreen)
├── screens/home/HomeScreen.tsx  # AUTH-04 flag check on mount
└── hooks/                       # AUTH-03 — add error + refetch to hooks that lack them
    ├── useFriends.ts            # has fetchFriends() returning {data, error} — needs refetch + error state
    ├── useChatRoom.ts           # has error state — verify refetch exposure
    └── (others — see Hook Audit below)
```

### Pattern 1: Supabase Password Reset Email

**What:** Call `supabase.auth.resetPasswordForEmail()` with the user's email. The `redirectTo` option tells Supabase where to redirect the browser page post-reset, but since D-02 defers the in-app handler, this can point to the Supabase hosted page.

**When to use:** When user submits the reset form.

**Example:**
```typescript
// Source: Supabase JS client, supabase.com/docs/reference/javascript/auth-resetpasswordforemail
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://campfire.app', // placeholder — Supabase handles the browser reset page
});
if (error) {
  setResetError(mapAuthError(error.message));
} else {
  setAuthMode('reset-sent');
}
```
[VERIFIED: Supabase auth pattern used throughout AuthScreen.tsx — the client instance and error-handling pattern are established in this file]

### Pattern 2: Custom Bottom Sheet (Established Codebase Pattern)

**What:** `Modal` (transparent) + `Animated.View` sliding from `translateY(600)` to `translateY(0)`. Backdrop is `TouchableWithoutFeedback` over `StyleSheet.absoluteFillObject` with `colors.overlay` background.

**When to use:** Any new bottom sheet in the app. @gorhom/bottom-sheet MUST NOT be used (broken on Reanimated v4 — locked project decision).

**Example (reference `StatusPickerSheet.tsx`):**
```typescript
// Source: [VERIFIED: src/components/status/StatusPickerSheet.tsx — full reference]
// Key structure:
<Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
  <TouchableWithoutFeedback onPress={onClose}>
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }]} />
  </TouchableWithoutFeedback>
  <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
    {/* drag handle + content */}
  </Animated.View>
</Modal>
```

For `OnboardingHintSheet` (D-11): no `TouchableWithoutFeedback` backdrop dismiss, no PanResponder — sheet closes only via "Get Started" button.

### Pattern 3: AsyncStorage Persisted Flag

**What:** Read key on mount, write on first meaningful action, never show again.

**Example (reference `ThemeContext.tsx`):**
```typescript
// Source: [VERIFIED: src/theme/ThemeContext.tsx lines 21-30]
useEffect(() => {
  AsyncStorage.getItem('@campfire/onboarding_hint_shown')
    .then((value) => {
      if (!value && friends.length === 0) {
        setOnboardingVisible(true);
      }
    })
    .catch(() => {}); // silent — worst case: don't show sheet
}, []); // run once on mount

// On dismiss:
AsyncStorage.setItem('@campfire/onboarding_hint_shown', 'true').catch(() => {});
```

### Pattern 4: ErrorDisplay Screen Mode

**What:** Replace blank/silent error states with `<ErrorDisplay mode="screen" message="..." onRetry={refetch} />` inside a `flex: 1` container.

**Example (reference `PlanDashboardScreen.tsx` lines 446-454 — existing but uses bespoke implementation):**
```typescript
// Source: [VERIFIED: src/components/common/ErrorDisplay.tsx — component is ready, mode='screen' fully implemented]
// Target pattern for all data-fetching screens:
if (error) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
      <ErrorDisplay
        mode="screen"
        message="Couldn't load your friends."
        onRetry={refetch}
      />
    </View>
  );
}
```

### Pattern 5: AuthScreen Mode State Machine

**What:** `useState<'login' | 'reset' | 'reset-sent'>` alongside the existing `useState<Tab>('login' | 'signup')`. Auth mode is reset to `'login'` whenever tab changes.

**Example:**
```typescript
// [ASSUMED] — natural extension of existing AuthScreen.tsx pattern
const [authMode, setAuthMode] = useState<'login' | 'reset' | 'reset-sent'>('login');

function handleTabChange(tab: Tab) {
  setActiveTab(tab);
  setAuthMode('login'); // reset mode on tab switch
  clearErrors();
}
```

### Anti-Patterns to Avoid

- **Using `@gorhom/bottom-sheet`:** Broken on Reanimated v4 — locked codebase decision. Use `Animated + Modal`.
- **Making `refetch` a write hook's concern:** `useExpenseCreate` is a write/form hook, not a data-fetch hook. Do not add retry on it — errors surface via `submitError` state in the form.
- **Showing ErrorDisplay for write failures:** Auth-03 targets data-fetching hooks only. Write actions use inline error states (existing `setGeneralError` pattern in `AuthScreen.tsx`).
- **Using hardcoded colour strings:** All colours must come from `useTheme()` → `colors.*` tokens. The lint rule `campfire/no-hardcoded-styles` enforces this.
- **Creating StyleSheet outside component body:** Styles must be inside `useMemo(() => StyleSheet.create({...}), [colors])` — established pattern in every screen.

---

## Hook Audit: AUTH-03

Audited all 14 hooks listed in CONTEXT.md canonical refs. Current state:

| Hook | Has `error` | Has `refetch` | Action Needed | Screen Consumer |
|------|-------------|---------------|---------------|-----------------|
| `useHomeScreen` | YES (`error: string\|null`) | YES (`fetchAllFriends`) | Add `refetch` alias to return (currently returns `fetchAllFriends` not `refetch`) — or update HomeScreen to call `fetchAllFriends` | `HomeScreen.tsx` |
| `useFriends` | Partial (returns from `fetchFriends()` result, no top-level `error` state) | YES (`fetchFriends`) | Add `error: string\|null` state + expose as top-level return field | `FriendsList.tsx`, `FriendRequests.tsx`, `AddFriend.tsx` |
| `usePlans` | YES (`error: string\|null`) | YES (`fetchPlans`) | None — already standard shape | `PlansListScreen.tsx` |
| `useChatRoom` | YES (`error: string\|null`) | NO `refetch` | Expose refetch capability | `ChatRoomScreen.tsx` |
| `useChatList` | YES (`error: string\|null`) | YES (`handleRefresh`) | Add `refetch` alias or use `handleRefresh` | `ChatListScreen.tsx` |
| `useIOUSummary` | YES (`error: string\|null`) | YES (`refetch`) | None — already standard | Used in `HomeScreen` via `HomeWidgetRow` |
| `useUpcomingBirthdays` | YES (`error: string\|null`) | YES (`refetch`) | None — already standard | Used in `HomeScreen` via `HomeWidgetRow` |
| `useStreakData` | YES (`error: string\|null`) | YES (`refetch`) | None — already standard | `squad.tsx` |
| `useAllPlanPhotos` | YES (`error: string\|null`) | YES (`refetch`) | None — already standard | `MemoriesTabContent.tsx`, `RecentMemoriesSection.tsx` |
| `usePlanPhotos` | YES (`error: string\|null`) | YES (`refetch`) | None — already standard | `PlanDashboardScreen.tsx` |
| `useMyWishList` | YES (`error: string\|null`) | YES (`refetch`) | None — already standard | `wish-list.tsx` |
| `useFriendsOfFriend` | YES (`error: string\|null`) | YES (`refetch`) | None — already standard | `squad/birthday/[id].tsx` |
| `useExpenseCreate` | Write hook — `submitError: string\|null` | N/A (not a data-fetch hook) | Skip per D-06 (write hook, different error pattern) | `squad/expenses/create.tsx` |
| `useStatus` | No top-level `error` field exposed | No `refetch` | `useStatus` reads from `effective_status` view on mount only — loading/error not surfaced to callers | Used implicitly via `useStatusStore` |

**Hooks needing changes:**
1. `useHomeScreen.ts`: Return `refetch` (alias for `fetchAllFriends`) for consistency with AUTH-03 standard shape
2. `useFriends.ts`: Add top-level `error: string | null` state — currently errors are returned from `fetchFriends()` call result but not stored at hook level
3. `useChatRoom.ts`: Expose a `refetch` function to allow callers to retry message loading

**Screens needing ErrorDisplay added:**
- `HomeScreen.tsx` — has inline error text; upgrade to `ErrorDisplay mode='screen'`
- `FriendsList.tsx` — no error display (silent)
- `FriendRequests.tsx` — no error display (silent)
- `AddFriend.tsx` — no error display (silent; write+read hybrid)
- `ChatListScreen.tsx` — no error display
- `ChatRoomScreen.tsx` — has error state but unclear if shown; verify
- `PlansListScreen.tsx` — check if error state is shown
- `squad.tsx` (StreakData consumer) — verify error shown
- `wish-list.tsx` — verify error shown
- `squad/birthday/[id].tsx` — has `friendsError` — verify shown
- `MemoriesTabContent.tsx` — verify error shown
- `PlanDashboardScreen.tsx` — has bespoke error view (text-only), upgrade to `ErrorDisplay`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser URL opening | Custom in-app webview | `WebBrowser.openBrowserAsync()` | Already installed, handles system browser correctly across iOS/Android |
| Bottom sheet sliding | Custom View + manual calculations | `Animated.Value` + `Modal` per `StatusPickerSheet.tsx` | The established pattern is concise and already handles iOS/Android differences |
| Password reset email | Custom SMTP integration | `supabase.auth.resetPasswordForEmail()` | Supabase handles rate limiting, email templates, and reset token security |
| Persisted boolean flags | SQLite, Zustand persist | `AsyncStorage` (single key) | Extremely lightweight, already used in project for theme preference |

**Key insight:** This phase is entirely about connecting existing infrastructure, not building new capabilities.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Reset `authMode` on Tab Switch

**What goes wrong:** User switches to "sign up" tab while in reset mode — they see the reset form instead of the sign-up form.
**Why it happens:** `authMode` and `activeTab` are independent state values.
**How to avoid:** In `handleTabChange()`, always reset `authMode` to `'login'` alongside `clearErrors()`.
**Warning signs:** QA tester switches tabs and sees wrong form content.

### Pitfall 2: `useFriends` Error Is Not Surfaced at Hook Level

**What goes wrong:** `FriendsList`, `FriendRequests`, and `AddFriend` cannot conditionally render ErrorDisplay because `useFriends` doesn't expose a top-level `error` field — only `fetchFriends()` returns `{ data, error }`.
**Why it happens:** The hook was designed for imperative call patterns, not declarative error display.
**How to avoid:** Add `const [error, setError] = useState<string | null>(null)` to `useFriends`, set it on `fetchFriends` error, and expose it in the return object.
**Warning signs:** Screens using `useFriends` silently show empty state on network failure.

### Pitfall 3: Onboarding Sheet Shown to Users Who Had Friends Before (Re-open Race)

**What goes wrong:** User already has friends but the AsyncStorage flag is missing (e.g., app reinstall) — sheet shows incorrectly.
**Why it happens:** AsyncStorage data is wiped on app reinstall.
**How to avoid:** The flag check is AND both conditions: flag absent AND `friends.length === 0`. The friends length check is the safety net — existing users will have friends loaded before or shortly after mount.
**Warning signs:** Onboarding sheet appears for users who already have friends.

### Pitfall 4: `resetPasswordForEmail` Called Without `redirectTo` on Production

**What goes wrong:** Supabase sends reset email with default redirect URL which may differ from expectations.
**Why it happens:** Default `redirectTo` is the Supabase project URL.
**How to avoid:** Per D-02, the Supabase-hosted browser page is acceptable — no `redirectTo` override needed for this phase. The email just needs to reach the user.
**Warning signs:** This is a pre-submission concern, not a code concern for this phase.

### Pitfall 5: Wrapping ErrorDisplay in Non-flex-1 Container

**What goes wrong:** `ErrorDisplay mode='screen'` uses `flex: 1` to center content, but if the parent container has no flex constraint, it collapses to zero height.
**Why it happens:** `ErrorDisplay` screen mode relies on `flex: 1` to fill available space.
**How to avoid:** Always wrap with `<View style={{ flex: 1, backgroundColor: colors.surface.base }}>`.
**Warning signs:** ErrorDisplay renders as a zero-height invisible element.

### Pitfall 6: `useChatRoom` Has No `refetch` — Chat Error Has No Retry Path

**What goes wrong:** `ChatRoomScreen` shows an error but user cannot retry because `useChatRoom` doesn't expose a standalone `refetch` function.
**Why it happens:** Chat uses realtime subscriptions — "refetch" means re-fetching history, which is distinct from subscription management.
**How to avoid:** Extract the `fetchMessages` logic (already internal) and expose it as `refetch` in the return object. The screen calls `refetch` when `ErrorDisplay`'s retry button is pressed.
**Warning signs:** Error state renders but retry button is a no-op.

---

## Code Examples

Verified patterns from codebase:

### Supabase Auth Client Usage (established in AuthScreen.tsx)

```typescript
// Source: [VERIFIED: src/screens/auth/AuthScreen.tsx lines 94-99]
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  setGeneralError(mapAuthError(error.message));
}
// Pattern: same client, same error mapping — resetPasswordForEmail follows identical shape
```

### AsyncStorage Flag Read/Write (established in ThemeContext.tsx)

```typescript
// Source: [VERIFIED: src/theme/ThemeContext.tsx lines 22-30]
AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setThemeState(stored);
    }
  })
  .catch(() => {});

AsyncStorage.setItem(STORAGE_KEY, t).catch(() =>
  console.warn('[ThemeProvider] Failed to persist theme preference'),
);
```

### WebBrowser.openBrowserAsync (established in AuthScreen.tsx)

```typescript
// Source: [VERIFIED: src/screens/auth/AuthScreen.tsx lines 128-129 — openAuthSessionAsync used for OAuth]
// For ToS/Privacy: use openBrowserAsync (simpler, no redirect handling needed)
await WebBrowser.openBrowserAsync('https://campfire.app/tos');
```

### ErrorDisplay screen mode (established component)

```typescript
// Source: [VERIFIED: src/components/common/ErrorDisplay.tsx lines 59-71]
// Already renders: icon + message + retry button. Usage pattern:
<ErrorDisplay
  mode="screen"
  message="Couldn't load your friends."
  onRetry={refetch}
/>
```

### Custom Sheet Animation (StatusPickerSheet.tsx pattern)

```typescript
// Source: [VERIFIED: src/components/status/StatusPickerSheet.tsx lines 53-63]
useEffect(() => {
  if (visible) {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  } else {
    translateY.setValue(600); // instant reset
  }
}, [visible, translateY]);
```

### ANIMATION tokens (Phase 24 output, available now)

```typescript
// Source: [VERIFIED: src/theme/animation.ts lines 96-109]
// Use for forgot-password fade toggle:
ANIMATION.duration.fast   // 200ms
ANIMATION.easing.standard // () => _inOut(_ease)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Silent blank screens on fetch error | `ErrorDisplay mode='screen'` with retry | This phase | Users can self-recover from transient errors |
| `@gorhom/bottom-sheet` | Custom `Animated + Modal` | v1.3.5 decision | `@gorhom` broken on Reanimated v4 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `resetPasswordForEmail()` without custom `redirectTo` sends a working email | Pattern 1 | Email arrives but redirect goes to Supabase default — acceptable for this phase per D-02 |
| A2 | `authMode` state machine scoped inside `AuthScreen` (not extracted to a separate component) | Pattern 5 | If a component extraction is preferred, extra refactor needed |
| A3 | Onboarding sheet shown when `friends.length === 0` checked after `useHomeScreen` data load | Pattern 3 | Could briefly flash or never show if friends load async; use `loading` guard |

**Assumption A3 detail:** The HomeScreen mounts and immediately calls `useHomeScreen()`, which is async. At mount time, `friends` is `[]` (initial state) and the onboarding flag may be absent — so the condition `flag absent AND friends.length === 0` would be true even for users who have friends but haven't loaded yet. Mitigation: check the flag first (AsyncStorage is fast), then show sheet only after `loading === false` to let the friends fetch complete.

---

## Open Questions

1. **`useChatRoom` refetch strategy**
   - What we know: `useChatRoom` fetches message history internally via `fetchMessages()`. It sets `error` state. It does not expose a `refetch` in its return signature.
   - What's unclear: Whether extracting and exposing `fetchMessages` as `refetch` would interfere with the realtime subscription setup.
   - Recommendation: Expose `refetch` as an alias for the internal `fetchMessages()` function. The subscription is independent of the initial fetch.

2. **HomeScreen error display placement**
   - What we know: `HomeScreen` shows friends + IOU summary + birthdays + streak + photos — all from different hooks. Each can independently fail.
   - What's unclear: Should there be one top-level ErrorDisplay or per-section error handling?
   - Recommendation: Per D-07, the error from `useHomeScreen` (friends fetch) is the primary one. Show `ErrorDisplay mode='screen'` for `useHomeScreen` errors only. Widget hooks (`useIOUSummary`, `useUpcomingBirthdays`) already have silent-error behaviour per their original design contracts — leave those as-is per scope D-05 (screens that call Supabase-backed hooks).

---

## Environment Availability

Step 2.6: SKIPPED — no new external dependencies. All required libraries are already installed in the project.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not detected (no jest.config, no vitest.config, no test/ directory) |
| Config file | none |
| Quick run command | Not available — manual verification only |
| Full suite command | Not available |

The project has no automated test infrastructure. All validation is manual.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Forgot password toggle shows reset form | manual | N/A | N/A |
| AUTH-01 | Reset email sent via Supabase | manual | N/A | N/A |
| AUTH-01 | Success confirmation shown after send | manual | N/A | N/A |
| AUTH-02 | ToS link opens system browser | manual | N/A | N/A |
| AUTH-02 | Privacy link opens system browser | manual | N/A | N/A |
| AUTH-03 | All 12 screens show ErrorDisplay on error | manual | N/A | N/A |
| AUTH-03 | Retry button calls refetch | manual | N/A | N/A |
| AUTH-04 | Sheet shown on first launch with no friends | manual | N/A | N/A |
| AUTH-04 | Sheet not shown after "Get Started" dismissed | manual | N/A | N/A |
| AUTH-04 | Sheet not shown if flag already set | manual | N/A | N/A |

### Sampling Rate

- **Per task commit:** Manual run on Expo Go / simulator
- **Per wave merge:** Manually verify the feature worked end-to-end
- **Phase gate:** All success criteria verified before `/gsd-verify-work`

### Wave 0 Gaps

None — no test infrastructure to create. All testing is manual.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase `resetPasswordForEmail()` — Supabase handles token security, rate limiting, expiry |
| V3 Session Management | no | Password reset does not create a session in-app |
| V4 Access Control | no | No new resources or permissions |
| V5 Input Validation | yes | Email input for reset — `validateEmail()` already exists in `AuthScreen.tsx` |
| V6 Cryptography | no | Supabase handles reset token crypto server-side |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Password reset email enumeration | Information Disclosure | Supabase returns success even if email not found (already handled by provider) |
| Onboarding sheet flag bypass | Tampering | AsyncStorage is local — no server-side impact; sheet is cosmetic only |

**Security note:** `validateEmail()` is already defined in `AuthScreen.tsx` and must be reused for the reset email input. Do not duplicate validation logic.

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: src/screens/auth/AuthScreen.tsx] — Full login/signup screen; `supabase.auth` usage, `WebBrowser`, `FormField`, `PrimaryButton`, error mapping patterns
- [VERIFIED: src/components/common/ErrorDisplay.tsx] — Component interface and implementation; `mode='screen'` with `onRetry` fully implemented
- [VERIFIED: src/components/status/StatusPickerSheet.tsx] — Custom bottom sheet reference: `Animated + Modal + PanResponder` pattern
- [VERIFIED: src/theme/ThemeContext.tsx] — AsyncStorage flag read/write pattern
- [VERIFIED: src/theme/animation.ts] — `ANIMATION.duration.fast`, `ANIMATION.easing.standard` tokens
- [VERIFIED: src/hooks/useHomeScreen.ts] — `{ friends, loading, error, refreshing, handleRefresh, fetchAllFriends }` — `error` present, `refetch` named `fetchAllFriends`
- [VERIFIED: src/hooks/useFriends.ts] — No top-level `error` state; errors returned from `fetchFriends()` only
- [VERIFIED: src/hooks/useChatRoom.ts] — `{ messages, loading, error, ... }` — no `refetch` in return shape
- [VERIFIED: src/hooks/usePlans.ts] — `{ plans, loading, error, refetch: fetchPlans }` — standard shape
- [VERIFIED: src/hooks/useIOUSummary.ts] — `{ rows, loading, error, refetch }` — standard shape
- [VERIFIED: src/hooks/useUpcomingBirthdays.ts] — `{ entries, loading, error, refetch }` — standard shape
- [VERIFIED: src/hooks/useStreakData.ts] — `{ currentWeeks, bestWeeks, loading, error, refetch }` — standard shape
- [VERIFIED: src/hooks/useAllPlanPhotos.ts] — `{ groups, recentPhotos, isLoading, error, refetch }` — standard shape
- [VERIFIED: src/hooks/usePlanPhotos.ts] — `{ photos, loading, error, uploadPhoto, deletePhoto, refetch }` — standard shape
- [VERIFIED: src/hooks/useMyWishList.ts] — `{ items, loading, error, refetch, addItem, deleteItem }` — standard shape
- [VERIFIED: src/hooks/useFriendsOfFriend.ts] — `{ friends, loading, error, refetch }` — standard shape
- [VERIFIED: src/hooks/useExpenseCreate.ts] — Write/form hook, not a data-fetch hook; skip per D-06
- [VERIFIED: .planning/phases/25-auth-onboarding-errors/25-UI-SPEC.md] — Visual and interaction contract

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase; no new packages needed
- Architecture: HIGH — all patterns verified in running code; decisions locked in CONTEXT.md
- Hook audit: HIGH — all 14 hooks read and current return shapes documented
- Pitfalls: HIGH — all pitfalls identified from direct code inspection, not assumed

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable — no fast-moving dependencies)
