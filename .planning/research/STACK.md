# Stack Research

**Domain:** Social coordination mobile app (React Native + Expo + Supabase)
**Researched:** 2026-03-17
**Confidence:** HIGH (core stack), MEDIUM (supporting libraries), HIGH (Expo Go compatibility flags)

---

## Context

Campfire is a "friendship OS" for close groups of 3–15 people. The stack is non-negotiable (see PROJECT.md). This document focuses on:

1. Precise version numbers for the chosen stack
2. Supporting libraries that are Expo Go-compatible
3. Verified incompatibilities to avoid
4. Development tooling

All libraries must work in **Expo Go managed workflow** — no `expo prebuild`, no custom native modules, no `expo eject`.

---

## Current Baseline

| Component | Current Version | Notes |
|-----------|----------------|-------|
| Expo SDK | **55.0.x** | Released Feb 2026. Current stable. |
| React Native | **0.83** | Bundled with SDK 55. |
| React | **19.2** | Bundled with SDK 55. |
| Expo Router | **v7** (versioned as `expo-router@55.x`) | Bundled with SDK 55. File-based routing. |
| TypeScript | **~5.8.x** | SDK 55 bumped from 5.3 to 5.8. |
| Node.js (dev) | **>=20** | Node 18 EOL as of SDK 53. |

**Critical SDK 55 note:** Legacy Architecture is dropped entirely in SDK 55. New Architecture (Fabric + JSI) is the only option. This has no practical impact on Campfire since no legacy-only libraries are in scope, but verifying new library compatibility against New Architecture is still required.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| expo | `~55.0.0` | SDK runtime, module resolution, Expo Go host | Current stable. All `npx expo install` commands auto-pin to SDK-compatible versions. |
| react-native | `0.83.x` (managed by Expo) | Mobile rendering layer | Do not pin manually — Expo manages this. |
| react | `19.2.x` (managed by Expo) | UI component model | Do not pin manually. |
| typescript | `~5.8.3` | Type checking, strict mode | SDK 55 ships 5.8.3. Matches `expo/tsconfig.base`. |
| expo-router | `~4.0.x` (installed as `expo-router`) | File-based navigation (tabs, stacks, modals) | Built on React Navigation. First-class Expo support. Named versioning is internal to SDK; install via `npx expo install expo-router`. |
| @supabase/supabase-js | `^2.99.x` | DB, Auth, Realtime, Storage client | v2 stable, actively maintained. Latest is 2.99.2 as of March 2026. |
| zustand | `^5.0.12` | Ephemeral UI state (statuses, user cache, draft forms) | 2.7KB gzipped. No boilerplate. v5.0.4+ fixed RN module resolution. |

### Supabase Integration Packages

| Library | Version | Purpose | Expo Go Compatible | Notes |
|---------|---------|---------|-------------------|-------|
| `@react-native-async-storage/async-storage` | `^2.x` (via `npx expo install`) | Auth session persistence | YES | Required by Supabase client as storage adapter. Use `npx expo install` to get SDK-matched version. |
| `react-native-url-polyfill` | `^2.0.0` | URL/URLSearchParams polyfill (not in Hermes) | YES | Import as `import 'react-native-url-polyfill/auto'` at app entry. Required for supabase-js URL parsing. Do NOT use on Expo Web (punycode conflict) — gate with `if (Platform.OS !== 'web')` or use conditional import. |
| `expo-secure-store` | `~55.0.x` | Encrypted token storage for auth keys | YES | Expo SDK package. Use for storing AES key that encrypts the AsyncStorage session value. SecureStore is limited to 2048-byte values — do not store the full session token directly. |
| `aes-js` | `^3.1.2` | AES-256 encryption for session data | YES (pure JS) | Used with expo-secure-store to encrypt AsyncStorage session data. Pure JS, no native modules. |
| `react-native-get-random-values` | `^1.11.x` | `crypto.getRandomValues` polyfill (needed by aes-js) | YES | Import before aes-js. Required in React Native for random values. |

**Session storage pattern (Supabase official recommendation for RN):**

AES-256 key stored in SecureStore (encrypted at rest by OS keychain) — the key is small enough to fit in SecureStore's 2048-byte limit. Session data encrypted with that key and stored in AsyncStorage. This handles both the size constraint of SecureStore and the security requirement for session tokens.

### Authentication

| Library | Version | Purpose | Expo Go Compatible | Notes |
|---------|---------|---------|-------------------|-------|
| `expo-auth-session` | `~55.0.x` | OAuth 2.0 PKCE flows via system browser | YES | Built into Expo SDK. Used for Google OAuth via Supabase `signInWithOAuth`. Works in Expo Go. |
| `expo-web-browser` | `~55.0.x` | Opens OAuth URL in in-app browser | YES | Dependency of expo-auth-session. Use `WebBrowser.openAuthSessionAsync()` + `skipBrowserRedirect: true` pattern for Supabase OAuth. |
| `expo-crypto` | `~55.0.x` | PKCE code verifier/challenge generation | YES | Used internally by expo-auth-session. Available separately if needed. |

**Google OAuth architecture for Expo Go:** Use `supabase.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } })`, then open the URL with `WebBrowser.openAuthSessionAsync()`, extract tokens from the redirect URL, and call `supabase.auth.setSession()`. Do NOT use `@react-native-google-signin/google-signin` — it requires native modules and does not work in Expo Go.

### Camera and QR Codes

| Library | Version | Purpose | Expo Go Compatible | Notes |
|---------|---------|---------|-------------------|-------|
| `expo-camera` | `~55.0.x` | Camera preview + QR code scanning | YES | `onBarcodeScanned` callback for QR friend-add flow. Supports QR and other barcode types. Known iOS Expo Go issues pre-SDK 53 are resolved in current versions. |

**Note:** `expo-barcode-scanner` is deprecated since SDK 51 and removed in SDK 53. Use `expo-camera`'s built-in barcode scanning exclusively.

### Media and Storage

| Library | Version | Purpose | Expo Go Compatible | Notes |
|---------|---------|---------|-------------------|-------|
| `expo-image-picker` | `~55.0.x` | Avatar photo selection from library or camera | YES | Handles permissions automatically. Use `requestMediaLibraryPermissionsAsync()` before opening picker on iOS. Upload result directly to Supabase Storage via `supabase.storage`. |
| `expo-file-system` | `~55.0.x` | Local file URI manipulation before upload | YES | Needed for reading file bytes before Supabase Storage upload if required. |

### Notifications

| Library | Version | Purpose | Expo Go Compatible | Notes |
|---------|---------|---------|-------------------|-------|
| `expo-notifications` | `~55.0.x` | Push notification receipt and display | **PARTIAL** | Local/scheduled notifications work in Expo Go. **Remote push notifications do NOT work in Expo Go from SDK 53 onwards on Android. Require a development build.** |

**V1 push notification strategy:** Nudges in V1 can use Supabase Realtime (already in scope for home screen) to deliver in-app nudges without push. True push notifications (for background delivery) require a dev build — this is acceptable for Phase 6 after the Expo Go prototyping phases. Plan to gate push tests behind `eas build --profile development`.

### Utilities

| Library | Version | Purpose | Expo Go Compatible | Notes |
|---------|---------|---------|-------------------|-------|
| `expo-haptics` | `~55.0.x` | Tactile feedback on status toggle, button taps | YES | Native feel for status changes. `impactAsync(ImpactFeedbackStyle.Medium)` on status selection. |
| `expo-linking` | `~55.0.x` | Deep link handling, URL scheme construction | YES | Used for QR code deep links (friend add by username URL). Part of Expo SDK. |
| `expo-linear-gradient` | `~55.0.x` | Gradient backgrounds (warm campfire aesthetic) | YES | Pure native gradient component. |
| `expo-font` | `~55.0.x` | Custom font loading | YES | Only needed if using custom fonts beyond system defaults. Optional — system fonts are fine for V1. |
| `dayjs` | `^1.11.x` | Lightweight date/time formatting | YES (pure JS) | 6KB gzipped. Used for "Posted 2h ago", event time display, relative timestamps. Prefer over `date-fns` (18KB) for mobile bundle size. |

### Expo System Packages (Already Included)

These are part of the Expo SDK and should not need separate installation if scaffolded with `npx create-expo-app`:

- `expo-status-bar` — Status bar color/style control
- `expo-splash-screen` — Splash screen management
- `expo-constants` — App constants (app version, env vars)
- `expo-asset` — Asset loading

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `npx expo lint` | ESLint + flat config | Generates `eslint.config.js`. SDK 53+ uses flat config format. Run `npx expo lint` to scaffold. |
| `eslint-config-expo` | ESLint rules for Expo (JSX, TS, platform globals) | Auto-included by `npx expo lint`. Handles `.android.js`/`.ios.js` extensions. |
| `prettier` | Code formatting | Add separately. Integrate with ESLint via `eslint-plugin-prettier`. |
| `npx expo-doctor@latest` | Dependency compatibility checker | Run before committing. Validates all deps against React Native Directory + New Architecture compatibility. |
| `npx expo install` | SDK-pinned package installation | Always use instead of `npm install` for Expo SDK packages. Picks correct compatible version. |
| EAS CLI (`eas-cli`) | Dev builds for push notification testing | Not needed for Expo Go phases. Required for Phase 6 push notifications. |
| Supabase CLI | Local DB development, migrations, type generation | `npx supabase gen types typescript` generates TypeScript types from schema. Essential for type safety. |

---

## Installation

```bash
# 1. Scaffold project
npx create-expo-app@latest campfire --template default@sdk-55
cd campfire

# 2. Core Supabase + auth
npx expo install @supabase/supabase-js react-native-url-polyfill
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store expo-auth-session expo-web-browser expo-crypto
npm install aes-js react-native-get-random-values
npm install --save-dev @types/aes-js

# 3. Features
npx expo install expo-camera expo-image-picker expo-file-system
npx expo install expo-notifications expo-haptics expo-linking expo-linear-gradient

# 4. Utilities
npm install zustand dayjs

# 5. Dev tooling
npx expo lint          # scaffolds eslint.config.js
npm install --save-dev prettier eslint-plugin-prettier

# 6. Supabase CLI (for local DB + type gen)
npm install --save-dev supabase
```

**tsconfig.json** (with strict mode as required):

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

## Alternatives Considered

| Category | Chosen | Alternative | Why Not |
|----------|--------|-------------|---------|
| State management | Zustand | Redux Toolkit | Excessive boilerplate for 3–15 person social app. Redux is overkill when Supabase handles server state. Explicitly excluded in constraints. |
| State management | Zustand | React Query / TanStack Query | Explicitly excluded in constraints. Pattern for Campfire is: Supabase query directly in hooks, Zustand for UI state cache. |
| Date formatting | dayjs | date-fns | date-fns is 3x larger (18KB vs 6KB gzipped) for equivalent functionality needed. |
| Google OAuth | expo-auth-session + expo-web-browser | @react-native-google-signin/google-signin | Native SDK requires custom native modules — incompatible with Expo Go managed workflow. Native approach is better UX but is a V2 optimization after dev build adoption. |
| UI components | React Native StyleSheet | NativeBase / Tamagui / Gluestack | Explicitly excluded in constraints. External UI libs add dependency surface, bundle size, and styling conflicts. Campfire's warm aesthetic is better served by hand-rolled components. |
| Navigation | Expo Router | React Navigation (bare) | Expo Router is built on React Navigation but adds file-based routing, deep linking, and typed routes. No reason to use bare React Navigation when Expo Router is the Expo-native choice. |
| Push notifications (V1) | Supabase Realtime for in-app nudges | OneSignal / FCM direct | Push requires dev build. Realtime handles in-app nudges in Expo Go. FCM direct push is Phase 6+. |
| Barcode scanning | expo-camera (built-in) | expo-barcode-scanner | Deprecated since SDK 51, removed in SDK 53. expo-camera is the official replacement. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@react-native-google-signin/google-signin` | Requires native modules. Incompatible with Expo Go managed workflow. | `expo-auth-session` + `expo-web-browser` for Expo Go phases |
| `expo-barcode-scanner` | Deprecated since SDK 51. Removed from Expo Go in SDK 53. | `expo-camera` with `onBarcodeScanned` |
| `expo-av` | Removed from Expo Go in SDK 55. No longer receives patches. | `expo-audio` (audio) or `expo-video` (video). Not needed for V1 Campfire. |
| `react-native-maps` | Requires native code config. Not in Expo Go. | Out of scope for V1 per PROJECT.md. |
| `react-native-reanimated` | Requires native module config. Works via Expo config plugin (not Expo Go bare). Expo Go has a bundled version but complex animations may behave differently. | Use sparingly. Expo Go includes a version but avoid complex worklets. For simple animations use `Animated` from React Native core. |
| `react-native-gesture-handler` | Requires wrapping root with `GestureHandlerRootView` and has Expo Go quirks. | Included with Expo Router — use correctly (wrap root). Avoid bare usage. |
| `redux` / `@reduxjs/toolkit` | Explicitly excluded in constraints. Boilerplate-heavy. | Zustand |
| `@tanstack/react-query` | Explicitly excluded in constraints. | Direct Supabase queries in custom hooks + Zustand for UI cache |
| `axios` | No benefit over `fetch` in React Native. Supabase SDK uses fetch internally. | Use Supabase client SDK or native `fetch`. |
| `npm install` for Expo SDK packages | Will install latest version, which may not be compatible with current Expo SDK. | Always `npx expo install <package>` for SDK packages. |

---

## Version Compatibility

| Package | SDK 55 Compatible Version | Expo Go | New Architecture | Notes |
|---------|--------------------------|---------|-----------------|-------|
| expo | `~55.0.0` | Host app | N/A | SDK runtime |
| @supabase/supabase-js | `^2.99.x` | YES | YES | Pure JS. No native modules. |
| zustand | `^5.0.12` | YES | YES | Pure JS. 2.7KB. |
| react-native-url-polyfill | `^2.0.0` | YES | YES | Pure JS polyfill. |
| @react-native-async-storage/async-storage | `^2.x` | YES | YES | Via Expo config plugin. |
| expo-secure-store | `~55.0.x` | YES | YES | `requireAuthentication` not available in Expo Go. |
| aes-js | `^3.1.2` | YES | YES | Pure JS encryption. |
| react-native-get-random-values | `^1.11.x` | YES | YES | Polyfill, pure JS. |
| expo-auth-session | `~55.0.x` | YES | YES | Part of Expo SDK. |
| expo-web-browser | `~55.0.x` | YES | YES | Part of Expo SDK. |
| expo-camera | `~55.0.x` | YES | YES | Barcode scanning included. |
| expo-image-picker | `~55.0.x` | YES | YES | Part of Expo SDK. |
| expo-notifications | `~55.0.x` | PARTIAL | YES | Local: YES. Remote push on Android: NO (SDK 53+). |
| expo-haptics | `~55.0.x` | YES | YES | Part of Expo SDK. |
| expo-linking | `~55.0.x` | YES | YES | Part of Expo SDK. |
| expo-linear-gradient | `~55.0.x` | YES | YES | Part of Expo SDK. |
| dayjs | `^1.11.x` | YES | YES | Pure JS. |
| expo-router | `~55.0.x` | YES | YES | Built into SDK 55 as v7. |

---

## Expo Go Compatibility Summary

**Works fully in Expo Go:**
- All Supabase SDK operations (DB, Realtime, Storage, Auth email/password, Auth OAuth via web browser)
- Zustand state management
- Expo Router navigation
- expo-camera QR scanning
- expo-image-picker avatar selection
- expo-haptics tactile feedback
- expo-secure-store token storage (except biometric auth)
- expo-auth-session / expo-web-browser Google OAuth
- Local notifications via expo-notifications

**Requires development build (EAS) — not Expo Go:**
- Remote push notifications on Android (SDK 53+)
- `@react-native-google-signin/google-signin` native SDK

**V1 strategy:** All V1 features are testable in Expo Go. Push notifications are in scope for Phase 6 and will require a dev build at that point. This is acceptable — Expo Go is the development target for Phases 1–5.

---

## Supabase Free Tier Constraints

Relevant to library choices and usage patterns:

| Limit | Value | Implication |
|-------|-------|-------------|
| DB storage | 500MB | No `SELECT *`. Always select specific columns. |
| Realtime messages | 2M/month | Filter channels to friend ID list. Unsubscribe on unmount. |
| MAU | 50K | Not a concern for V1. |
| Storage | 1GB | Avatar images only. Resize before upload. |
| Edge functions | 500K invocations | Avoid unless necessary. Use RPC for server logic. |

**Library implication:** No bulk data fetching libraries that issue `SELECT *`. Supabase SDK's `.select('col1, col2')` pattern is sufficient and enforces column selection discipline.

---

## Sources

- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55) — HIGH confidence. Official release notes.
- [Expo SDK 55 Beta Announcement](https://expo.dev/changelog/sdk-55-beta) — HIGH confidence.
- [Expo Router v55 Blog](https://expo.dev/blog/expo-router-v55-more-native-navigation-more-powerful-web) — HIGH confidence.
- [Expo TypeScript Guide](https://docs.expo.dev/guides/typescript/) — HIGH confidence. Official docs.
- [Expo using-supabase Guide](https://docs.expo.dev/guides/using-supabase/) — HIGH confidence. Official Expo docs.
- [Supabase Expo Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — HIGH confidence. Official Supabase docs.
- [Supabase Auth React Native Guide](https://supabase.com/docs/guides/auth/quickstarts/react-native) — HIGH confidence. Official Supabase docs.
- [Supabase User Management Expo Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) — HIGH confidence. Official Supabase docs.
- [Supabase Google Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google) — HIGH confidence. Official Supabase docs.
- [expo-notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/) — HIGH confidence. Official Expo docs.
- [expo-camera Docs](https://docs.expo.dev/versions/latest/sdk/camera/) — HIGH confidence. Official Expo docs.
- [expo-auth-session Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/) — HIGH confidence. Official Expo docs.
- [expo-secure-store Docs](https://docs.expo.dev/versions/latest/sdk/securestore/) — HIGH confidence. Official Expo docs.
- [Expo ESLint Guide](https://docs.expo.dev/guides/using-eslint/) — HIGH confidence. Official Expo docs.
- [React Native Google Sign-In Expo Setup](https://react-native-google-signin.github.io/docs/setting-up/expo) — HIGH confidence. Official library docs confirming Expo Go incompatibility.
- [Zustand Releases (GitHub)](https://github.com/pmndrs/zustand/releases) — HIGH confidence. Version 5.0.12 confirmed current.
- [supabase-js v2.99.2 npm](https://www.npmjs.com/package/@supabase/supabase-js) — HIGH confidence. Current stable version confirmed.
- [Bundlephobia: zustand v5.0.10](https://bundlephobia.com/package/zustand) — MEDIUM confidence. Bundle size reference.
- [expo-barcode-scanner deprecation (Expo FYI)](https://github.com/expo/fyi/blob/main/barcode-scanner-to-expo-camera.md) — HIGH confidence. Official deprecation notice.
- [Expo Google Authentication Guide](https://docs.expo.dev/guides/google-authentication/) — HIGH confidence. Official Expo docs confirming expo-auth-session approach.
