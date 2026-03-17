---
phase: 01-foundation-auth
plan: 04
subsystem: auth
tags: [expo-router, supabase, google-oauth, apple-sign-in, expo-image-picker, expo-web-browser, zustand]

# Dependency graph
requires:
  - phase: 01-foundation-auth plan 01
    provides: supabase client, useAuthStore, colors constants, config constants
  - phase: 01-foundation-auth plan 03
    provides: AuthTabSwitcher, FormField, OAuthButton, UsernameField, PrimaryButton, AvatarCircle, OfflineBanner, generateUsername
provides:
  - Root layout with session bootstrap, splash screen, and Stack.Protected route guards
  - Auth screen with email/password login+signup, Google OAuth (web browser redirect), Apple Sign-In (iOS)
  - Profile setup screen with avatar upload, username availability check, display name pre-fill from OAuth metadata
  - (auth) route group with _layout, index, profile-setup route files
affects: [all phases — session guards and auth flow are the entry point to the entire app]

# Tech tracking
tech-stack:
  added:
    - expo-web-browser (Google OAuth browser redirect flow)
    - expo-auth-session (makeRedirectUri for OAuth)
    - expo-apple-authentication (native Apple Sign-In on iOS)
    - expo-image-picker (avatar selection from device gallery)
    - base64-arraybuffer (avatar upload encoding for Supabase Storage)
    - expo-linear-gradient (splash screen gradient)
    - expo-splash-screen (preventAutoHideAsync, hideAsync)
  patterns:
    - Stack.Protected guards route access based on session + needsProfileSetup state
    - onAuthStateChange drives needsProfileSetup detection for new vs returning users
    - WebBrowser.maybeCompleteAuthSession() at module level required for Google OAuth redirect completion
    - Avatar upload uses base64 → decode → supabase.storage.from('avatars').upload with upsert:true

key-files:
  created:
    - src/app/(auth)/_layout.tsx
    - src/app/(auth)/index.tsx
    - src/app/(auth)/profile-setup.tsx
    - src/screens/auth/AuthScreen.tsx
    - src/screens/auth/ProfileSetup.tsx
  modified:
    - src/app/_layout.tsx

key-decisions:
  - "Stack.Protected with guard={!!session && !needsProfileSetup} correctly routes fully-set-up users to (tabs), guards (auth)/profile-setup for users who signed up but have no username yet"
  - "SIGNED_OUT event in onAuthStateChange resets needsProfileSetup to false — prevents stale state after logout"
  - "Apple Sign-In ERR_REQUEST_CANCELED silently ignored — user tapped cancel, not an error"
  - "Google OAuth uses skipBrowserRedirect:true + WebBrowser.openAuthSessionAsync + manual setSession from URL params — required for Expo Go managed workflow (PITFALLS.md Pitfall 3)"

patterns-established:
  - "Pattern: Auth route group (auth) as Stack.Protected child — unauthenticated users land here automatically"
  - "Pattern: Route files in src/app/ are thin shells that re-export screen components from src/screens/"
  - "Pattern: OAuth full name captured with supabase.auth.updateUser on first Apple sign-in"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, PROF-01, PROF-02]

# Metrics
duration: 15min
completed: 2026-03-17
---

# Phase 1 Plan 04: Auth Screens, Profile Setup, and Session Guards Summary

**Email+Google+Apple auth flow with Stack.Protected session guards, splash screen, and profile creation with avatar upload**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-17T15:03:19Z
- **Completed:** 2026-03-17T15:18:00Z
- **Tasks:** 1 auto completed, 1 checkpoint:human-verify awaiting
- **Files modified:** 6

## Accomplishments
- Root layout bootstraps session on cold start, shows campfire gradient splash, then routes via Stack.Protected based on session + needsProfileSetup state
- AuthScreen.tsx combines email/password login+signup with Google OAuth (browser redirect, Expo Go compatible) and Apple Sign-In (iOS only) with client-side validation and error mapping
- ProfileSetup.tsx pre-fills username (generated) and display name from OAuth metadata, real-time username availability check, optional avatar upload to Supabase Storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Build auth screens, profile setup, and root layout with session guards** - `4453d70` (feat)

**Plan metadata:** pending (will be added after checkpoint verification)

## Files Created/Modified
- `src/app/_layout.tsx` - Root layout with session bootstrap, splash screen, Stack.Protected guards
- `src/app/(auth)/_layout.tsx` - Auth group Stack navigator (headerShown false)
- `src/app/(auth)/index.tsx` - Thin shell re-exporting AuthScreen
- `src/app/(auth)/profile-setup.tsx` - Thin shell re-exporting ProfileSetup
- `src/screens/auth/AuthScreen.tsx` - Combined login/signup + Google OAuth + Apple Sign-In
- `src/screens/auth/ProfileSetup.tsx` - Avatar upload, username availability, display name, save profile

## Decisions Made
- `Stack.Protected` with `guard={!!session && !needsProfileSetup}` for tabs, `guard={!!session && needsProfileSetup}` for profile-setup — cleanly separates the three auth states
- `SIGNED_OUT` event handler explicitly resets `needsProfileSetup` to false to avoid stale state
- Apple Sign-In `ERR_REQUEST_CANCELED` is silently swallowed — not an error, user cancelled the native sheet
- Google OAuth uses `skipBrowserRedirect: true` + `WebBrowser.openAuthSessionAsync` + manual `setSession` from URL params — required for Expo Go managed workflow per PITFALLS.md Pitfall 3

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Prettier formatting in AuthScreen.tsx and ProfileSetup.tsx needed `expo lint --fix` to auto-correct multi-line import formatting — resolved immediately.

## User Setup Required
Prerequisites for testing (Supabase configuration required before checkpoint verification):
- Supabase project created with migration applied (from plan 01-02)
- Google OAuth provider enabled in Supabase Auth dashboard with `campfire://auth/callback` redirect URL
- Apple Sign-In enabled in Supabase Auth dashboard
- `.env.local` populated with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Next Phase Readiness
- Complete Phase 1 auth flow ready for physical device verification (checkpoint Task 2)
- Once checkpoint passes, all Phase 1 requirements satisfied: AUTH-01 through AUTH-04, PROF-01, PROF-02
- Phase 2 can proceed with home screen realtime statuses, building on the session/profile foundation

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-17*
