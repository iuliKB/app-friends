# Phase 1: Foundation + Auth - Research

**Researched:** 2026-03-17
**Domain:** Expo SDK 55 scaffold, Supabase cloud schema + RLS, email/password + Google OAuth + Apple Sign-In, session persistence, Expo Router v7 protected routes, profile creation, 5-tab navigation shell
**Confidence:** HIGH (all critical areas verified from official docs or project-level research)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Combined auth screen with Login / Sign Up tabs above the email form
- Email form on top, Google + Apple OAuth buttons below with divider ("or continue with")
- Branded header: Campfire logo + campfire emoji + tagline ("Your friends, one app" or similar)
- Password requirements: min 8 chars, at least one number + one letter — validated client-side before submit
- Auth errors shown inline below the relevant field (red text, standard form validation)
- Splash screen (Campfire logo, warm background) shown while checking for existing session on cold start
- No email verification in V1 — skip entirely
- Forgot password flow deferred to Phase 6
- Email signup users: mandatory profile creation screen immediately after signup (username + display name + optional avatar)
- OAuth users (Google/Apple): auto-create display name from OAuth data, auto-generate username from display name (e.g. "john_smith_42"), user can change later in settings
- Username: real-time availability check as user types (debounced Supabase query)
- Display name: minimal validation (non-empty, up to ~50 chars)
- Avatar: initials circle by default + optional "Add photo" button that opens device gallery → uploads to Supabase Storage
- Plain AsyncStorage as specified in the original spec — Supabase's anon key + RLS is the security layer
- If session dies offline, user re-logs in (simple retry, no complex recovery)
- Offline banner: small bar at top "No connection — some features may not work" when network unavailable
- AppState listener: pause Supabase auto-refresh when app backgrounds, resume on foreground
- Supabase cloud project only (no local CLI setup)
- Single initial migration file with all V1 schema (enums, tables, triggers, RLS, RPC functions)
- Existing seed.sql at project root — use as-is, move to supabase/seed.sql directory
- .env.local + .env.example pattern (template committed with placeholders, .env.local gitignored)
- TypeScript: strict: true, noUncheckedIndexedAccess: true, standard Expo tsconfig
- ESLint + Prettier configured from day one in Phase 1 scaffold

### Claude's Discretion

- Exact splash screen design and animation
- ESLint/Prettier rule configuration specifics
- Exact auto-generated username algorithm (as long as it's lowercase, URL-safe, and unique)
- Offline banner styling and positioning
- Keyboard handling patterns in auth forms

### Deferred Ideas (OUT OF SCOPE)

- Forgot password flow — Phase 6 (polish)
- Email verification — not in V1
- SecureStore hybrid session storage — consider for V2 if security audit needed
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | Supabase project created with all migration SQL applied | Single migration file pattern; Supabase cloud project; `supabase gen types` |
| INFR-02 | RLS enabled on every table with policies as specified | Convention: every CREATE TABLE followed immediately by ENABLE RLS + policies; SECURITY DEFINER friendship helper |
| INFR-03 | TypeScript types generated from Supabase schema | `npx supabase gen types typescript --project-id <id> > src/types/database.ts` |
| INFR-04 | Seed data (test users, friendships, sample plans) in supabase/seed.sql | Existing seed.sql at project root; move to supabase/seed.sql |
| INFR-05 | Environment variables configured (.env.local with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY) | .env.local + .env.example pattern; app.config.ts extra field for OTA safety |
| INFR-06 | Supabase RPC functions: get_free_friends(), get_friends(), get_or_create_dm_channel() | Postgres functions with SECURITY DEFINER; defined in migration file |
| AUTH-01 | User can create account with email and password | supabase.auth.signUp(); no email verification; profile creation screen immediately after |
| AUTH-02 | User can log in with Google OAuth (browser-redirect for Expo Go) | supabase.auth.signInWithOAuth + skipBrowserRedirect + WebBrowser.openAuthSessionAsync; campfire:// scheme |
| AUTH-03 | User can log in with Apple Sign-In | expo-apple-authentication works in Expo Go iOS; signInWithIdToken provider:'apple'; capture fullName on first sign-in only |
| AUTH-04 | User session persists across app restarts (reopens to home if session exists) | Plain AsyncStorage adapter; INITIAL_SESSION fires on cold start; Stack.Protected guard evaluates session |
| AUTH-05 | User can log out from settings | supabase.auth.signOut(); Stack.Protected guard reroutes to (auth) group automatically |
| PROF-01 | User can create profile with username, display name, and avatar | Profile creation screen post-signup; username availability check debounced; handle_new_user trigger for OAuth path |
| PROF-02 | User can upload avatar image to Supabase Storage | expo-image-picker + supabase.storage.from('avatars').upload(); decode(base64) or FormData approach |
| NAV-01 | Bottom tab navigator with 5 tabs: Home, Plans, Chat, Squad, Profile | Expo Router (tabs)/_layout.tsx with Tabs component; 5 named screens |
| NAV-02 | Squad Goals tab shows "Coming soon" card with lock icon and brief description | squad.tsx stub screen; no logic |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire foundation: Expo scaffold, Supabase schema with full RLS, three auth methods, session persistence, profile creation with avatar upload, and a 5-tab navigation shell. All research areas have been resolved from official documentation and the project-level research files.

The most important finding is that **Apple Sign-In (`expo-apple-authentication`) does work in Expo Go on iOS** and does not require a development build for Phase 1 testing. This resolves the blocker noted in STATE.md. The identifiers received in Expo Go will differ from production, but the flow is testable end-to-end. Android does not support Apple Sign-In (expected behavior).

The **Google OAuth flow** is confirmed: use `supabase.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } })` to get the OAuth URL, then open it with `WebBrowser.openAuthSessionAsync()`, and handle the callback via `supabase.auth.setSession()` or `supabase.auth.exchangeCodeForSession()`. The app scheme `campfire://` must be registered in both `app.json` and Supabase's allowed redirect URLs.

The **new vs returning OAuth user** detection pattern is: after `SIGNED_IN` fires, query `profiles` table for the user's `auth.uid()`. If no row exists, redirect to profile creation. If a row exists, proceed to the app. A database trigger (`handle_new_user`) provides a safety net but is not sufficient alone because OAuth users need an interactive profile creation step (username choice).

**Primary recommendation:** Implement the three plans in order (01-01 scaffold → 01-02 schema → 01-03 auth) with no shortcuts on RLS. Every table must have `ENABLE ROW LEVEL SECURITY` immediately after creation.

---

## Standard Stack

### Core (Phase 1 subset)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | `~55.0.0` | SDK runtime | Current stable; manages all SDK package versions |
| expo-router | `~55.0.x` (v7) | File-based navigation; Stack.Protected guard | Built into SDK 55; official Expo navigation solution |
| @supabase/supabase-js | `^2.99.x` | Auth, DB, Storage client | v2 stable; 2.99.2 current as of March 2026 |
| @react-native-async-storage/async-storage | `^2.x` | Session persistence adapter (plain AsyncStorage per spec) | Expo SDK managed; spec-mandated for V1 |
| react-native-url-polyfill | `^2.0.0` | URL polyfill required by supabase-js in RN | Required; import at app entry |
| expo-auth-session | `~55.0.x` | OAuth 2.0 PKCE flow; makeRedirectUri | Expo SDK; Expo Go compatible |
| expo-web-browser | `~55.0.x` | openAuthSessionAsync for Google OAuth redirect | Expo SDK; required by OAuth flow |
| expo-apple-authentication | `~55.0.x` | Apple Sign-In (iOS only) | Expo Go compatible on iOS; confirmed in official docs |
| zustand | `^5.0.12` | Auth session store + UI state | Project-mandated; 2.7KB; no boilerplate |
| expo-image-picker | `~55.0.x` | Avatar photo selection | Expo SDK; Expo Go compatible |
| expo-splash-screen | `~55.0.x` | Splash screen while session checks | Included in Expo SDK; use SplashScreen.preventAutoHide() |
| typescript | `~5.8.3` | Type checking with strict mode | SDK 55 ships 5.8.3 |

### Supporting (Phase 1)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-linking | `~55.0.x` | makeRedirectUri + deep link handling | Required for OAuth redirect URI construction |
| expo-constants | `~55.0.x` | Access EXPO_PUBLIC_ env vars in app.config.ts | OTA-safe env var access |
| eslint-config-expo | (auto via `npx expo lint`) | ESLint flat config for Expo + TypeScript | Run `npx expo lint` to scaffold |
| prettier | latest | Code formatting | Install with eslint-plugin-prettier |
| eslint-plugin-prettier | latest | ESLint + Prettier integration | eslintPluginPrettierRecommended in eslint.config.js |
| supabase CLI | latest | Type generation from schema | `npx supabase gen types typescript` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain AsyncStorage | SecureStore + AES-256 LargeSecureStore | LargeSecureStore is more secure but more complex; spec mandates plain AsyncStorage for V1 |
| expo-apple-authentication | Manual PKCE Apple OAuth | expo-apple-authentication is the official Expo solution; works in Expo Go; no reason to use manual approach |
| expo-auth-session (Google) | @react-native-google-signin | Native SDK requires custom native modules; incompatible with Expo Go |

**Installation (Phase 1):**

```bash
# Scaffold
npx create-expo-app@latest campfire --template default@sdk-55
cd campfire

# Supabase + auth
npx expo install @supabase/supabase-js react-native-url-polyfill
npx expo install @react-native-async-storage/async-storage
npx expo install expo-auth-session expo-web-browser expo-apple-authentication expo-linking
npx expo install expo-image-picker expo-splash-screen

# State + utilities
npm install zustand

# Dev tooling
npx expo lint
npm install --save-dev prettier eslint-plugin-prettier eslint-config-prettier
npm install --save-dev supabase

# Verify
npx expo-doctor@latest
```

**Verified versions (npm registry, March 2026):**
- `@supabase/supabase-js`: 2.99.2
- `zustand`: 5.0.12
- Expo SDK packages: auto-pinned by `npx expo install`

---

## Architecture Patterns

### Recommended Project Structure

```
campfire/
├── app.json / app.config.ts    # scheme: "campfire", extra: { supabaseUrl, supabaseAnonKey }
├── .env.local                  # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (gitignored)
├── .env.example                # placeholder values (committed)
├── tsconfig.json               # extends expo/tsconfig.base, strict: true, noUncheckedIndexedAccess: true
├── eslint.config.js            # flat config with expo + prettier
├── .prettierrc                 # formatting rules
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql       # ALL V1 schema in single file
│   └── seed.sql                # moved from project root
├── src/
│   ├── app/                    # ROUTES ONLY
│   │   ├── _layout.tsx         # Root layout: session bootstrap, splash screen, Stack.Protected
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx     # Stack navigator for auth group
│   │   │   └── index.tsx       # Combined sign-in / sign-up screen
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx     # Tab navigator (5 tabs)
│   │   │   ├── index.tsx       # Home (stub for Phase 2)
│   │   │   ├── plans.tsx       # Plans (stub)
│   │   │   ├── chat.tsx        # Chat (stub)
│   │   │   ├── squad.tsx       # "Coming soon" stub
│   │   │   └── profile.tsx     # Profile tab (stub)
│   │   └── profile-setup.tsx   # Profile creation screen (post-signup)
│   ├── screens/
│   │   └── auth/
│   │       ├── AuthScreen.tsx      # Combined login/signup UI
│   │       └── ProfileSetup.tsx    # Profile creation screen component
│   ├── components/
│   │   ├── Avatar.tsx          # Initials circle + optional photo
│   │   ├── Button.tsx          # Primary / secondary variants
│   │   ├── OfflineBanner.tsx   # "No connection" bar
│   │   └── TabBarIcon.tsx      # Tab bar icon helper
│   ├── hooks/
│   │   └── useSession.ts       # Session from Supabase auth state
│   ├── stores/
│   │   └── useAuthStore.ts     # session, loading, setSession
│   ├── lib/
│   │   └── supabase.ts         # Supabase singleton with AsyncStorage + AppState
│   ├── types/
│   │   ├── database.ts         # Generated by supabase gen types
│   │   └── app.ts              # Status, Profile, etc.
│   └── constants/
│       ├── colors.ts           # Status colors + brand palette
│       └── config.ts           # App-wide constants
└── assets/
    └── images/                 # Campfire logo + splash assets
```

### Pattern 1: Supabase Client Singleton with AsyncStorage + AppState

**What:** Single Supabase client using plain AsyncStorage as the session storage adapter. AppState listener pauses auto-refresh when app backgrounds to prevent offline session-clearing.

**Per spec:** Plain AsyncStorage (no SecureStore complexity in V1).

```typescript
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// AppState listener: pause auto-refresh in background, resume on foreground
// This prevents the offline-logout pitfall (Pitfall 4 in PITFALLS.md)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

Source: Official Supabase React Native tutorial + STACK.md research.

### Pattern 2: Expo Router Stack.Protected Auth Guard

**What:** Root `_layout.tsx` bootstraps the session and uses `Stack.Protected` to gate route groups. No per-screen redirect logic needed.

```tsx
// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Session } from '@supabase/supabase-js';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, setSession } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check stored session on cold start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
      SplashScreen.hideAsync();
    });

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  // Hold splash screen until session check completes
  if (!ready) return null;

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
```

Source: Expo Router authentication docs (official), ARCHITECTURE.md Pattern 1.

### Pattern 3: Google OAuth — Browser Redirect Flow for Expo Go

**What:** Use `supabase.auth.signInWithOAuth` with `skipBrowserRedirect: true` to get the OAuth URL, then open it with `WebBrowser.openAuthSessionAsync()`. Handle the callback URL by extracting tokens and calling `supabase.auth.setSession()`.

**Critical:** App scheme `campfire` must be registered in `app.json` and added to Supabase Auth allowed redirect URLs as `campfire://**`.

```typescript
// src/screens/auth/AuthScreen.tsx (Google OAuth handler)
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession(); // Required — clears browser session on redirect

async function signInWithGoogle() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'campfire',
    path: 'auth/callback',
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true, // We open the browser manually
    },
  });

  if (error || !data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (result.type === 'success' && result.url) {
    // Extract tokens from redirect URL and set session
    const url = new URL(result.url);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
    // Alternatively, for PKCE flow: supabase.auth.exchangeCodeForSession(code)
  }
}
```

Source: PITFALLS.md Pitfall 3 + STACK.md Google OAuth architecture section + official Expo docs.

**app.json/app.config.ts configuration required:**

```json
{
  "expo": {
    "scheme": "campfire",
    "extra": {
      "supabaseUrl": "...",
      "supabaseAnonKey": "..."
    }
  }
}
```

**Supabase dashboard:** Add `campfire://**` to Authentication > URL Configuration > Additional Redirect URLs.

**Google Cloud Console:** Add `campfire://auth/callback` (or the Expo Go exp:// URI for testing) to the OAuth consent screen's authorized redirect URIs.

### Pattern 4: Apple Sign-In with Supabase

**What:** `expo-apple-authentication` works in Expo Go on iOS. Use `signInAsync` to get an identity token, pass it to `supabase.auth.signInWithIdToken`. Capture `fullName` immediately — Apple only provides it on first sign-in.

**Android:** Apple Sign-In is not available on Android. Show Google OAuth only on Android. Conditionally render Apple button using `AppleAuthentication.isAvailableAsync()`.

```typescript
// src/screens/auth/AuthScreen.tsx (Apple Sign-In handler)
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) throw new Error('No identity token from Apple');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;

  // Capture full name — Apple only provides it on FIRST sign-in
  // Store immediately; will be null on subsequent logins
  if (credential.fullName?.givenName || credential.fullName?.familyName) {
    const fullName = [credential.fullName.givenName, credential.fullName.familyName]
      .filter(Boolean)
      .join(' ');
    await supabase.auth.updateUser({ data: { full_name: fullName } });
  }
}
```

Source: Official Supabase Apple Sign-In docs + expo-apple-authentication official docs.

**Supabase Apple provider configuration:** Add the following Client IDs in Supabase Auth > Providers > Apple:
- For Expo Go testing: `host.exp.Exponent`
- For production (when using EAS Build): your app's bundle ID (e.g., `com.yourcompany.campfire`)

### Pattern 5: New vs Returning OAuth User Detection

**What:** After `onAuthStateChange` fires `SIGNED_IN`, query the `profiles` table. If no row exists for the user's ID, navigate to `profile-setup`. This handles both Google and Apple OAuth new users.

**Database trigger provides a safety net** for edge cases but is not the primary routing mechanism.

```typescript
// src/app/_layout.tsx — detect new vs returning user after OAuth
supabase.auth.onAuthStateChange(async (event, session) => {
  setSession(session);

  if (event === 'SIGNED_IN' && session) {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!profile) {
      // New user — navigate to profile creation
      // router.push('/profile-setup'); — call from within component
      setNeedsProfileSetup(true);
    }
  }
});
```

Email/password signups use `supabase.auth.signUp()` which returns a session immediately (no email verification). Navigate to `/profile-setup` directly from the signup handler.

### Pattern 6: Avatar Upload to Supabase Storage

**What:** Use `expo-image-picker` to select an image, convert it to base64 or FormData, upload to Supabase Storage `avatars` bucket.

```typescript
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer'; // npm install base64-arraybuffer

async function uploadAvatar(userId: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true, // Request base64 for direct upload
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const fileExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, decode(asset.base64!), {
      contentType: `image/${fileExt}`,
      upsert: true, // Replace existing avatar
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return publicUrl;
}
```

Source: Supabase Storage docs + STACK.md media section.

**Storage bucket configuration (in migration or Supabase dashboard):**
- Bucket: `avatars`
- Public: true (profile images are public by design)
- RLS: Authenticated users can upload to their own path; public read

### Pattern 7: Database Trigger for New User Profile (Safety Net)

**What:** SQL trigger that auto-creates a minimal profile row when a new `auth.users` row is inserted. This handles edge cases where the app crashes during profile creation. The profile row starts empty (no username) — the app detects missing username and redirects to profile-setup.

```sql
-- In 0001_init.sql migration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR each ROW EXECUTE PROCEDURE public.handle_new_user();
```

The profile row is created with `display_name` pre-filled from OAuth metadata or email prefix, but `username` is NULL. The app checks for NULL username to determine if profile setup is needed.

### Pattern 8: ESLint + Prettier Setup (SDK 55 Flat Config)

```bash
npx expo lint  # scaffolds eslint.config.js with flat config format
npm install --save-dev prettier eslint-plugin-prettier eslint-config-prettier
```

```javascript
// eslint.config.js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*'] },
]);
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

Source: Official Expo ESLint guide (SDK 53+ flat config format applies to SDK 55).

### Anti-Patterns to Avoid

- **SecureStore with full session token:** SecureStore has a 2048-byte limit; the session JWT exceeds this. Use AsyncStorage directly as per spec.
- **`exp://` scheme for OAuth redirects:** Register `campfire://` scheme. Never rely on `exp://` for production OAuth flows.
- **Calling `startAutoRefresh()` without AppState gate:** Without the AppState listener, the Supabase client will attempt token refresh whenever the app foregrounds, which fails offline and can clear the session. The AppState listener pattern must be in `supabase.ts`.
- **Using SQL Editor to test RLS policies:** SQL Editor runs as postgres superuser and bypasses RLS. Test via the Supabase REST API or via the app client.
- **Apple full name captured only on first sign-in:** If you don't capture `credential.fullName` immediately during `signInAsync`, it will be `null` on every subsequent login. Must persist to Supabase immediately.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth 2.0 PKCE code challenge/verifier | Custom crypto + URL encoding | `expo-auth-session` | PKCE has subtle security requirements; expo-auth-session handles all edge cases |
| Apple Sign-In native UI | Manual OIDC flow | `expo-apple-authentication` | Apple requires their native UI; no alternative accepted in App Store review |
| Session refresh on token expiry | Manual JWT expiry check + refresh | Supabase `autoRefreshToken: true` | Supabase SDK handles PKCE rotation, refresh timing, race conditions |
| File system reading before upload | Custom FileSystem + Buffer conversion | `base64: true` in ImagePicker + `base64-arraybuffer` `decode()` | Avoids file URI permission issues across iOS/Android versions |
| Deep link URL parsing | Manual URLSearchParams | Supabase `exchangeCodeForSession()` or `setSession()` | Handles OAuth code + state validation, prevents replay attacks |
| Username uniqueness check | Client-side deduplication | Postgres UNIQUE constraint + Supabase `.maybeSingle()` debounced query | Race conditions impossible to avoid client-side; DB constraint is the authoritative check |

---

## Common Pitfalls

### Pitfall 1: Apple Sign-In Identifiers Differ Between Expo Go and Production

**What goes wrong:** In Expo Go, Apple returns a different `sub` (user identifier) than in a production/EAS build. This means dev seed data or test accounts will not match production auth records.
**Why it happens:** Expo Go uses its own bundle ID (`host.exp.Exponent`) which changes the opaque user identifier Apple provides.
**How to avoid:** Register `host.exp.Exponent` as a Client ID in Supabase's Apple provider config for development. Expect auth records created in Expo Go to be separate from production.
**Warning signs:** Users who signed in via Apple in Expo Go are not found in production auth.users.

### Pitfall 2: Google OAuth Redirect Falls Through to Browser (No App Reopen)

**What goes wrong:** After Google auth completes, the browser does not redirect back to the app. The user is stuck in the browser.
**Why it happens:** The `campfire://` scheme is not registered in Google Cloud Console's OAuth consent screen, or `WebBrowser.maybeCompleteAuthSession()` is not called at the top of the auth screen component.
**How to avoid:** Call `WebBrowser.maybeCompleteAuthSession()` immediately in the auth screen component (outside any function). Register `campfire://auth/callback` in Google Cloud Console and `campfire://**` in Supabase Auth.
**Warning signs:** Testing on physical device; browser shows "success" page but app does not come to foreground.

### Pitfall 3: Session Lost on Offline App Launch

**What goes wrong:** App launch with no network logs the user out.
**Why it happens:** `startAutoRefresh()` is called on every foreground event; it fails offline and clears the stored session.
**How to avoid:** Use `stopAutoRefresh()` in the AppState listener when app backgrounds; `startAutoRefresh()` only on `'active'`. The stored session remains intact. Failed refresh is non-fatal if token is not yet expired.
**Warning signs:** Users in areas with poor connectivity (airplane, underground) report frequent logouts.

### Pitfall 4: RLS Not Enabled on a Table

**What goes wrong:** A table is accessible by any authenticated or anon user via the REST API.
**Why it happens:** RLS is opt-in; CREATE TABLE does not enable it.
**How to avoid:** Migration convention: every `CREATE TABLE` is immediately followed by `ALTER TABLE x ENABLE ROW LEVEL SECURITY` and at least one policy. Verify by checking `pg_tables.rowsecurity`.
**Warning signs:** Can read another user's data from the Supabase client without authentication.

### Pitfall 5: INSERT/UPDATE Policy Without WITH CHECK

**What goes wrong:** Users can insert rows with any `user_id`, spoofing ownership.
**Why it happens:** `USING` clause gates SELECTs/DELETEs; INSERT/UPDATE also need a `WITH CHECK` clause.
**How to avoid:** Every INSERT and UPDATE policy must include `WITH CHECK (auth.uid() = user_id)` or equivalent ownership check.

### Pitfall 6: env vars undefined after OTA Update

**What goes wrong:** After `eas update`, EXPO_PUBLIC_ vars resolve as `undefined` in the JS bundle.
**Why it happens:** env vars must be threaded through `app.config.ts` `extra` field for OTA persistence.
**How to avoid:** In `app.config.ts`, set `extra: { supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL }`. Access via `Constants.expoConfig?.extra?.supabaseUrl`. Add an assertion in `supabase.ts` that throws immediately if values are missing.
**Warning signs:** After OTA update, all API calls fail with 404 or "Invalid URL".

### Pitfall 7: Profile Creation Screen Skipped on OAuth New User

**What goes wrong:** New OAuth users land directly in the app without a username, breaking username-dependent features in later phases.
**Why it happens:** `onAuthStateChange` fires `SIGNED_IN` for both new and returning OAuth users; without an explicit profile check, there is no redirect to profile-setup.
**How to avoid:** After `SIGNED_IN`, always query `profiles` for `username IS NOT NULL`. Redirect to `/profile-setup` if username is missing. The `handle_new_user` trigger creates the row with a NULL username as a signal.

---

## Code Examples

### Username Availability Check (Debounced)

```typescript
// src/screens/auth/ProfileSetup.tsx
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function useUsernameAvailability(username: string) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (value: string) => {
    if (value.length < 3) { setAvailable(null); return; }
    setChecking(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value.toLowerCase())
      .maybeSingle();
    setAvailable(data === null); // null = no row found = available
    setChecking(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => check(username), 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [username, check]);

  return { available, checking };
}
```

### Auto-Generate Username from Display Name

```typescript
// src/lib/username.ts
function generateUsername(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')    // replace non-alphanumeric with underscore
    .replace(/_+/g, '_')            // collapse consecutive underscores
    .replace(/^_|_$/g, '')          // trim leading/trailing underscores
    .slice(0, 20);                  // max 20 chars for base

  const suffix = Math.floor(Math.random() * 9000) + 1000; // 4-digit suffix
  return `${base}_${suffix}`;
}
```

Then uniqueness is verified against the DB with the availability check hook above.

### Tabs Layout (5-tab Navigation Shell)

```tsx
// src/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.brand.primary,
        tabBarInactiveTintColor: COLORS.neutral[400],
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="flame" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Squad',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Status Constants (define in Phase 1 for all phases)

```typescript
// src/constants/colors.ts
export const COLORS = {
  status: {
    free: '#22c55e',
    busy: '#ef4444',
    maybe: '#eab308',
  },
  brand: {
    primary: '#f97316',   // warm orange — Claude's discretion
    background: '#1c1917', // warm dark
  },
  neutral: {
    400: '#a8a29e',
  },
} as const;
```

### Migration Structure: RLS Convention

```sql
-- 0001_init.sql (excerpt — RLS convention)

-- ALWAYS follow this pattern for every table:
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text UNIQUE,                    -- NULL until profile setup complete
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: immediately after CREATE TABLE, no exceptions
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies: every table gets at minimum SELECT + INSERT + UPDATE
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-barcode-scanner` | `expo-camera` with `onBarcodeScanned` | SDK 51 deprecated, SDK 53 removed | Must use expo-camera; not relevant to Phase 1 |
| `expo-av` | `expo-audio` / `expo-video` | SDK 55 removed from Expo Go | Not relevant to Phase 1 |
| ESLint legacy `.eslintrc` | ESLint flat config `eslint.config.js` | SDK 53+ | `npx expo lint` scaffolds flat config automatically |
| `process.env.X` for env vars | `Constants.expoConfig.extra.x` | Always been recommended for OTA safety | Must use app.config.ts extra field for OTA-safe env vars |
| `@react-native-google-signin` | `expo-auth-session` + `expo-web-browser` | Expo Go compatibility constraint | `@react-native-google-signin` requires native modules; incompatible with Expo Go |
| SecureStore direct session storage | AsyncStorage (per spec) OR LargeSecureStore pattern | Supabase tutorial updated after SecureStore 2048 byte limit was discovered | V1 uses plain AsyncStorage per locked decision; LargeSecureStore deferred to V2 |
| New Architecture opt-in | New Architecture only (Legacy Architecture removed) | SDK 55 | No practical impact; none of Phase 1's libraries use legacy-only APIs |

**Deprecated/outdated:**
- `expo-google-app-auth`: Deprecated package — do not use. Use `expo-auth-session` with `supabase.auth.signInWithOAuth`.
- `expo-app-auth`: Same; deprecated. No replacement needed for Supabase OAuth flow.

---

## Open Questions

1. **Google Cloud Console redirect URI for Expo Go**
   - What we know: Expo Go uses `exp://` schemes dynamically, making it hard to pre-register. The `campfire://` scheme works in production.
   - What's unclear: Whether `exp://` needs to be explicitly added to Google Console for Expo Go testing on a physical device.
   - Recommendation: Add both `campfire://auth/callback` AND `exp://` (wildcard if permitted) to Google Console for development. In practice, test on physical device with `campfire://` scheme; Expo Go dev testing can use the Supabase magic link as a workaround if Google blocks `exp://`.

2. **Apple Sign-In on Android**
   - What we know: `expo-apple-authentication` explicitly does not support Android.
   - What's unclear: Whether to show a disabled "Sign in with Apple" button on Android or hide it entirely.
   - Recommendation: Use `AppleAuthentication.isAvailableAsync()` to conditionally render the button. On Android this returns `false`, so the button simply does not appear. Show only Google OAuth on Android.

3. **Supabase Apple provider configuration for Expo Go**
   - What we know: Must add `host.exp.Exponent` as a Client ID in Supabase Apple provider settings for Expo Go testing.
   - What's unclear: Whether this requires a Service Key or just the bundle ID registration.
   - Recommendation: In Supabase Auth > Providers > Apple, add `host.exp.Exponent` as a Client ID. The identityToken flow does not require a service key from Apple — just the Supabase configuration. Verify during Plan 01-03 implementation.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — Phase 1 establishes scaffold only |
| Config file | None yet — Wave 0 gap |
| Quick run command | `npx expo lint` (linting as validation proxy for Phase 1) |
| Full suite command | `npx tsc --noEmit` (type checking) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-01 | Migration applied to Supabase project | manual-only | Supabase dashboard confirms tables exist | N/A |
| INFR-02 | RLS enabled on all tables | manual-only | Query `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'` in dashboard | N/A |
| INFR-03 | TypeScript types generated and compile | type-check | `npx tsc --noEmit` | ❌ Wave 0 |
| INFR-04 | Seed data in supabase/seed.sql | manual-only | Verify file exists at `supabase/seed.sql` | ❌ Wave 0 |
| INFR-05 | env vars accessible | type-check | `npx tsc --noEmit` (supabase.ts throws if undefined) | ❌ Wave 0 |
| INFR-06 | RPC functions exist | manual-only | Query `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace` in dashboard | N/A |
| AUTH-01 | Email/password signup creates user | manual-only | Test on device: create account, verify in Supabase Auth dashboard | N/A |
| AUTH-02 | Google OAuth completes on physical device | manual-only | Test on iOS + Android physical devices via Expo Go | N/A |
| AUTH-03 | Apple Sign-In works on iOS device | manual-only | Test on iOS physical device via Expo Go | N/A |
| AUTH-04 | Session persists across restarts | manual-only | Close and reopen app; verify user stays logged in | N/A |
| AUTH-05 | Logout from profile tab | manual-only | Tap logout, verify redirect to auth screen | N/A |
| PROF-01 | Profile creation screen works | manual-only | Complete profile after signup; verify in profiles table | N/A |
| PROF-02 | Avatar uploads to Storage | manual-only | Select photo in profile setup; verify in Supabase Storage dashboard | N/A |
| NAV-01 | 5 tabs visible and navigable | manual-only | Visual inspection on device | N/A |
| NAV-02 | Squad tab shows "coming soon" | manual-only | Visual inspection | N/A |

**Note on testing approach:** Phase 1 is infrastructure + auth. Automated unit tests for auth flows in React Native require significant test harness setup (mocking Supabase, expo-apple-authentication, etc.) that is out of scope for a foundation phase. The validation model is: lint clean (`npx expo lint`), TypeScript clean (`npx tsc --noEmit`), and manual smoke tests on physical device.

### Sampling Rate

- **Per task commit:** `npx expo lint && npx tsc --noEmit`
- **Per wave merge:** `npx expo lint && npx tsc --noEmit` + manual smoke test on device
- **Phase gate:** All 3 plans complete + physical device smoke test of full auth flow before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tsconfig.json` — `strict: true, noUncheckedIndexedAccess: true` (created in Plan 01-01)
- [ ] `eslint.config.js` — created by `npx expo lint` in Plan 01-01
- [ ] `src/types/database.ts` — generated by `npx supabase gen types typescript` in Plan 01-02
- [ ] `supabase/seed.sql` — moved from project root in Plan 01-02

*(No dedicated test file infrastructure needed for Phase 1; all validation is lint + typecheck + manual)*

---

## Sources

### Primary (HIGH confidence)

- Official Expo docs — `expo-apple-authentication` page: Expo Go compatible on iOS, works without dev build
- Official Expo docs — Expo Router authentication: `Stack.Protected` guard API verified
- Official Expo docs — ESLint guide: flat config format, `npx expo lint`, Prettier integration
- Official Expo docs — `expo-auth-session`: `makeRedirectUri` signature and OAuth flow
- Official Expo docs — `create-expo-app`: `--template default@sdk-55` command verified
- Official Supabase docs — managing user data: `handle_new_user` trigger pattern
- Official Supabase docs — Apple Sign-In: `signInWithIdToken` pattern, fullName first-sign-in caveat, `host.exp.Exponent` Client ID requirement
- Official Supabase docs — `onAuthStateChange` events: all 6 events documented; SIGNED_IN fires for both new and returning users
- Project-level STACK.md — version table, Expo Go compatibility, Google OAuth architecture
- Project-level ARCHITECTURE.md — project structure, all core patterns
- Project-level PITFALLS.md — RLS pitfalls, offline session pitfall, Google OAuth Expo Go pitfall

### Secondary (MEDIUM confidence)

- Supabase React Native tutorial (WebFetch): LargeSecureStore pattern documented; confirms plain AsyncStorage is also valid
- Supabase Apple Auth guide (WebFetch): confirmed `signInWithIdToken` code pattern

### Tertiary (LOW confidence)

- None — no unverified claims in this research.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from STACK.md (project-level research from official sources)
- Architecture patterns: HIGH — Expo Router Stack.Protected verified from official docs; Supabase patterns from official docs
- Apple Sign-In Expo Go: HIGH — confirmed from official expo-apple-authentication docs (resolves STATE.md blocker)
- Google OAuth flow: HIGH — verified across STACK.md, PITFALLS.md, and official Expo docs
- New user detection: MEDIUM — inferred from onAuthStateChange events docs + handle_new_user trigger pattern; no single authoritative example
- Avatar upload: MEDIUM — base64 pattern inferred from STACK.md + Supabase Storage docs; exact React Native code not in official quickstart

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable stack; 30-day validity)
