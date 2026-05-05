# Phase 28: Branding - Research

**Researched:** 2026-05-06
**Domain:** Expo SDK 55 — app icon, splash screen, adaptive icon configuration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**App Icon (BRAND-01)**
- D-01: User provides final icon as 1024×1024 PNG with solid background baked in, placed at `assets/images/icon.png` before planning. Plan assumes file is present.
- D-02: iOS icon: single PNG at `assets/images/icon.png` (already referenced in `app.config.ts`). No transparency required.
- D-03: Android adaptive icon: keep existing `#ff6b35` orange `backgroundColor`; update `foregroundImage` to reuse the same icon PNG (or a transparent crop if provided separately — default reuses same file).

**Splash Screen (BRAND-02)**
- D-04: Splash image: reuse `assets/images/icon.png` — no separate splash asset needed.
- D-05: Splash resize mode: `contain` — icon centered on colored background, no cropping.
- D-06: Fade transition: ~400ms — configure via `expo-splash-screen`. Standard, polished.
- D-07: Light mode splash background: `#ff6b35`.

**Dark Mode Splash (BRAND-03)**
- D-08: Dark mode splash background: `#0E0F11` (the app's `colors.surface.base` dark value).
- D-09: Implementation: `expo-splash-screen` plugin's `dark` variant support in `app.config.ts`.

### Claude's Discretion
- Android adaptive icon foreground crop padding — follow Google Material adaptive icon guidelines (66% safe zone).
- Exact `fadeDuration` value within ~400ms target — use 400.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRAND-01 | App has a final 1024×1024 branded Campfire icon replacing the Expo placeholder | `app.config.ts` `icon` and `android.adaptiveIcon.foregroundImage` already point to `assets/images/icon.png`; replacing that file + verifying android adaptive config is the full implementation |
| BRAND-02 | Splash screen uses branded imagery with a fade transition configured via the expo-splash-screen plugin | Plugin config supports `image`, `resizeMode`, `backgroundColor`; fade controlled via `SplashScreen.setOptions({ duration: 400, fade: true })` called at module scope in `_layout.tsx` |
| BRAND-03 | Splash screen adapts to dark/light OS mode (separate dark and light background treatments) | Plugin's `dark.backgroundColor` object in `app.config.ts` plugins array drives per-mode background; `userInterfaceStyle: "automatic"` already set |
</phase_requirements>

---

## Summary

Phase 28 is a pure configuration and asset phase — no new React Native components, no database changes, no new screens. All three requirements (BRAND-01, BRAND-02, BRAND-03) are satisfied by two files: replacing `assets/images/icon.png` with the user's final 1024×1024 PNG and updating `app.config.ts` with correct splash and adaptive icon configuration.

The critical discovery from code inspection: fade animation is **not** a config plugin option in `expo-splash-screen` SDK 55 — the plugin handles image/resizeMode/backgroundColor/dark only. Fade is configured via `SplashScreen.setOptions({ duration: 400, fade: true })` called at **module scope** in `src/app/_layout.tsx`, above `SplashScreen.preventAutoHideAsync()`. The UI-SPEC's snippet showing `fadeDuration` in the plugin block is incorrect; the planner must use `setOptions` instead.

A secondary concern: `_layout.tsx` currently renders a JS-level in-app "splash" (LinearGradient with emoji + text) while fonts and auth load. This is distinct from the native OS splash screen. The CONTEXT.md decisions are silent on this fallback screen, so the plan should leave it unchanged — it is out of phase scope unless the user explicitly scopes it in.

**Primary recommendation:** Update `app.config.ts` (plugin array splash config + android adaptive icon foreground) and add `SplashScreen.setOptions({ duration: 400, fade: true })` at module scope in `_layout.tsx`, above the existing `preventAutoHideAsync()` call.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| App icon (iOS + Android home screen) | Native build config | — | Icon is baked into the app binary at build time via `app.config.ts`; no runtime component |
| Splash screen appearance (image, background, dark/light) | Native build config | — | Expo splash screen plugin writes native XML/storyboard resources at prebuild time |
| Splash fade animation | JS (module scope, pre-render) | — | `SplashScreen.setOptions` must be called before the first React render; it configures the native dismissal animation |
| Android adaptive icon background color | Native build config | — | Written by Expo's adaptive icon plugin into `mipmap` XML at prebuild time |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-splash-screen | ~55.0.19 (installed: 55.0.19; registry: 55.0.20) | Native splash screen config + JS hide API | Ships with Expo SDK 55; already installed [VERIFIED: node_modules] |

### Supporting

No additional libraries required. All changes use the existing Expo config plugin pipeline.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-splash-screen plugin (dark variant) | ios.splash.dark / android.splash.dark top-level keys in app.config.ts | Both work, but the plugin approach is the documented SDK 55 pattern and required to get `image` + `resizeMode` support alongside dark variant |
| SplashScreen.setOptions for fade | `fadeDuration` plugin key | `fadeDuration` is NOT a valid plugin key in expo-splash-screen SDK 55 (verified by reading installed plugin source); `setOptions` is the correct JS API |

**Installation:** No new packages required.

---

## Architecture Patterns

### System Architecture Diagram

```
User provides icon.png (1024×1024 PNG)
         |
         v
assets/images/icon.png
         |
    app.config.ts
    /           \
iOS config       Android config
(icon key)       (adaptiveIcon.foregroundImage + backgroundColor)
         \           /
          Expo prebuild
          (eas build or expo run:ios/android)
         /           \
    iOS binary       Android APK/AAB
    (LaunchScreen    (mipmap-* adaptive
     storyboard)      icon resources)
         |
    OS splash screen
    (shown at cold start)
         |
    SplashScreen.setOptions()  <-- module scope in _layout.tsx
    { duration: 400, fade: true }
         |
    preventAutoHideAsync()  <-- existing call
         |
    [fonts + auth ready]
         |
    SplashScreen.hideAsync()  <-- existing call with 400ms fade
```

### Recommended Project Structure

No new directories needed. All changes are in existing files:

```
/
├── assets/images/
│   └── icon.png              # Replace with user's final 1024×1024 PNG
├── app.config.ts             # Update: splash plugin + android adaptiveIcon
└── src/app/_layout.tsx       # Update: add SplashScreen.setOptions before preventAutoHideAsync
```

### Pattern 1: expo-splash-screen Plugin Config (SDK 55)

**What:** Plugin configuration in `app.config.ts` that generates native splash resources.
**When to use:** Any time image, resizeMode, backgroundColor, or dark-variant needs to change.

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/splash-screen
// In app.config.ts plugins array:
[
  'expo-splash-screen',
  {
    image: './assets/images/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ff6b35',
    dark: {
      backgroundColor: '#0E0F11',
    },
  },
]
```

Note: `fadeDuration` is NOT a valid key here (verified against installed plugin source). [VERIFIED: node_modules/expo-splash-screen/plugin/build/withSplashScreen.js]

### Pattern 2: SplashScreen.setOptions — Fade Animation

**What:** Module-scope JS call that configures the native dismissal animation.
**When to use:** Must be called at module scope (top of file, outside component), before `preventAutoHideAsync()`.

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/splash-screen
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.setOptions({
  duration: 400,
  fade: true,   // iOS only — Android fade is always on
});
SplashScreen.preventAutoHideAsync();
```

`fade: true` is iOS-only per the SDK docs — it enables the fade-out animation. On Android, fade behavior is always present. [VERIFIED: Context7 / expo_dev_llms_txt]

### Pattern 3: Android Adaptive Icon (SDK 55)

**What:** Two-layer icon system — foreground image over a solid background color.
**When to use:** Android only. Background color in config, foreground image as PNG.

```typescript
// In app.config.ts android section:
android: {
  adaptiveIcon: {
    foregroundImage: './assets/images/icon.png',
    backgroundColor: '#ff6b35',
  },
  // ...
}
```

The foreground image should follow Google Material adaptive icon safe zone: keep visible content within the inner 66% of the 1024×1024 canvas. Expo clips to a circle on most launchers. [ASSUMED — from Google Material guidelines; not verified against Google docs in this session]

### Anti-Patterns to Avoid

- **`fadeDuration` in plugin config:** Not a valid expo-splash-screen SDK 55 plugin option. The plugin only processes `image`, `resizeMode`, `backgroundColor`, `dark`, `imageWidth`, and platform-specific `ios`/`android` sub-objects. Adding unknown keys is silently ignored.
- **`SplashScreen.setOptions` inside a component or useEffect:** Must be called at module scope before the React tree renders. Calling it inside `useEffect` has no effect.
- **Adding `expo-splash-screen` to plugins twice:** The project may already use the top-level `splash` key; the plugin config replaces/supplements it. Do not duplicate.
- **Leaving the top-level `splash` key without `image`:** The current `app.config.ts` has `splash: { backgroundColor: '#ff6b35' }` — this must be updated to also set `image` and `resizeMode`, or replaced entirely by the plugin entry.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native splash screen timing | Custom JS loading screen | `SplashScreen.preventAutoHideAsync()` + `hideAsync()` (already in place) | Native dismissal is frame-perfect; JS screen has render lag |
| Dark/light splash switching | Runtime JS color check | `expo-splash-screen` plugin `dark` config key | OS applies the correct variant before JS bundle loads |
| Adaptive icon generation | Custom imagemagick script | Expo prebuild + `adaptiveIcon.foregroundImage` config | Expo generates all required `mipmap-*` densities automatically |

**Key insight:** Every asset transformation and native resource generation in this phase is handled by Expo's prebuild pipeline — zero hand-rolling needed.

---

## Critical Finding: In-App JS Splash Screen (Out of Phase Scope)

`src/app/_layout.tsx` renders a LinearGradient "splash" with emoji 🔥 and "Campfire" text while `ready && fontsLoaded` is false. This is a **separate, JS-level fallback screen** — not the native OS splash managed by `expo-splash-screen`. It appears during font loading after the native splash has been dismissed.

**Phase 28 scope:** CONTEXT.md decisions cover the native OS splash screen only. The in-app JS fallback screen is **out of scope** for this phase and must not be modified. The planner should NOT include changes to it.

---

## Common Pitfalls

### Pitfall 1: `fadeDuration` plugin key does not exist
**What goes wrong:** Developer adds `fadeDuration: 400` to the plugin config object. Expo silently ignores unknown plugin keys — the splash fade will not activate.
**Why it happens:** The UI-SPEC implementation notes contain this incorrect snippet (based on outdated docs or training knowledge).
**How to avoid:** Use `SplashScreen.setOptions({ duration: 400, fade: true })` at module scope in `_layout.tsx` instead. [VERIFIED: node_modules/expo-splash-screen/plugin/build/withSplashScreen.js — no `fade`/`duration` keys handled]
**Warning signs:** Splash dismisses without fade animation on iOS.

### Pitfall 2: Dark splash variant requires a rebuild, not just Metro restart
**What goes wrong:** Developer changes dark variant in `app.config.ts`, does `expo start`, sees no change.
**Why it happens:** The splash screen config is compiled into native resources (LaunchScreen.storyboard on iOS, XML drawables on Android) at build time via Expo prebuild. Metro (JS bundler) does not trigger prebuild.
**How to avoid:** After changing `app.config.ts` splash config, run `expo prebuild` or `expo run:ios`/`expo run:android` (which triggers prebuild). With EAS, a new build is required.
**Warning signs:** "I updated the config but the splash didn't change."

### Pitfall 3: Top-level `splash` key vs. plugin config — only plugin gets `image`
**What goes wrong:** Developer adds `image` and `resizeMode` to the top-level `splash` key and wires dark via `ios.splash.dark`. This works but bypasses the plugin — `expo-splash-screen` plugin doc pattern is the current recommended path.
**Why it happens:** Expo has two configuration surfaces for splash: top-level `splash` (legacy) and the plugin config (current).
**How to avoid:** Use the plugin config exclusively and remove/replace the top-level `splash` key with just `backgroundColor` (which is still respected) or let the plugin fully own it.
**Warning signs:** Dark mode splash not applying correctly on Android.

### Pitfall 4: Android icon clipped differently per launcher
**What goes wrong:** Icon looks correct in preview but gets clipped to a circle on some Android launchers, cutting off content near edges.
**Why it happens:** Android adaptive icons are cropped to a circle/squircle/square depending on the launcher. Safe zone is 66% of canvas width (approx 672px of 1024px).
**How to avoid:** Verify the user's icon has all visible content within the central 66% of the canvas. Document this for the user — it cannot be enforced by code.
**Warning signs:** Icon appears cut off on Android test devices.

---

## Code Examples

### Final `app.config.ts` plugins array entry

```typescript
// Source: Verified against expo-splash-screen plugin API (SDK 55.0.19 installed)
// Replace or supplement the top-level splash key:
splash: {
  // Keep top-level for any legacy tooling that reads it
  backgroundColor: '#ff6b35',
},
// In plugins array:
[
  'expo-splash-screen',
  {
    image: './assets/images/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ff6b35',
    dark: {
      backgroundColor: '#0E0F11',
    },
  },
],
```

### `_layout.tsx` module-scope additions

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/splash-screen
// Add ABOVE the existing SplashScreen.preventAutoHideAsync() line:
SplashScreen.setOptions({
  duration: 400,
  fade: true,
});
SplashScreen.preventAutoHideAsync(); // already present — do not duplicate
```

### Android adaptive icon config (no change needed if icon.png reused)

```typescript
// Current config in app.config.ts (D-03: keep existing backgroundColor, update foregroundImage):
android: {
  adaptiveIcon: {
    foregroundImage: './assets/images/icon.png',
    backgroundColor: '#ff6b35',
  },
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Top-level `splash` key + ios.splash.dark + android.splash.dark | `expo-splash-screen` plugin config with `dark` object | SDK 50+ | Plugin is the single config surface; handles both platforms from one config block |
| `SplashScreen.hide()` | `SplashScreen.hideAsync()` | SDK 50+ | Async API; already in use in `_layout.tsx` |

**Deprecated/outdated:**
- `fadeDuration` in plugin config: was never a valid plugin key — confirmed against installed source. Use `SplashScreen.setOptions` instead.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Android adaptive icon safe zone is 66% of canvas per Google Material guidelines | Code Examples / Pitfall 4 | Icon content could be clipped on certain launchers — cosmetic issue, not a build failure |

---

## Open Questions

1. **Will the user's `icon.png` need an Android-specific foreground crop?**
   - What we know: D-03 says default is to reuse `icon.png` for Android foreground; a separate crop may be provided.
   - What's unclear: Whether the baked-in solid background in `icon.png` will look correct on Android adaptive icon (which also applies the `backgroundColor` from config as a background layer — resulting in the baked background color visible over the config background).
   - Recommendation: Plan should document this risk and note that if the icon PNG has a baked-in solid background, the Android adaptive icon will show that baked color as the foreground image over the `#ff6b35` config background. For best results, the Android foreground should be a transparent-background PNG (flame only), but D-03 explicitly accepts reusing `icon.png` as a default.

2. **Does `expo run:ios` / `expo run:android` trigger prebuild automatically?**
   - What we know: In Expo SDK 55 managed workflow, `expo run:ios` runs prebuild before building.
   - What's unclear: Exact behavior depends on whether the project has a `/ios` or `/android` native directory checked into git.
   - Recommendation: Verification step should include `npx expo prebuild --clean` or confirm the build command triggers it.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| expo-splash-screen | BRAND-02, BRAND-03 | ✓ | 55.0.19 (installed) | — |
| EAS CLI / native build | Verifying icon/splash on real device | Not verified in this session | — | Use `expo run:ios` Simulator for partial verification |
| iOS Simulator (dark mode toggle) | BRAND-03 dark splash verification | [ASSUMED: available on dev machine] | — | Toggle on real device |

**Missing dependencies with no fallback:**
- Real device with EAS build is required to verify the final icon on the OS home screen (Simulator may show icon but not all adaptive behaviors). Per STATE.md, this is a known deferred constraint (Apple Dev account/hardware gate).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (node env, custom RN mock) |
| Config file | `jest.config.js` |
| Quick run command | `npx jest --testPathPattern="branding" --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-01 | icon.png file exists at correct path | manual-only | N/A | — |
| BRAND-02 | splash plugin config present with image/resizeMode/backgroundColor | manual-only (config inspection) | N/A | — |
| BRAND-03 | dark variant backgroundColor set to #0E0F11 in plugin config | manual-only (config inspection) | N/A | — |

**Rationale for manual-only:** All three requirements are native build-time configuration values. There is no runtime JS behavior to unit test. Validation is:
1. Code inspection: verify `app.config.ts` has correct values
2. Build + device/Simulator verification: confirm native assets render correctly

### Sampling Rate

- **Per task commit:** Config inspection (manual review of `app.config.ts` diff)
- **Per wave merge:** iOS Simulator launch check (dark mode + light mode)
- **Phase gate:** Full native build verification (Simulator minimum; real device preferred)

### Wave 0 Gaps

None — no test files need to be created. This phase has no testable JS logic. Validation is entirely via config inspection and native build observation.

---

## Security Domain

This phase introduces no new authentication, session management, access control, input validation, cryptography, or data persistence. ASVS categories V2-V6 do not apply. The only change is static asset replacement and build-time config — no attack surface introduced.

---

## Sources

### Primary (HIGH confidence)
- `/llmstxt/expo_dev_llms_txt` (Context7) — `SplashScreen.setOptions` API, plugin config structure, dark variant syntax
- `node_modules/expo-splash-screen/plugin/build/withSplashScreen.js` — verified plugin accepted keys (image, resizeMode, backgroundColor, dark, imageWidth, ios, android sub-objects only; no fadeDuration/fade/duration)
- `app.config.ts` (codebase) — current splash config, android adaptive icon config, plugins array
- `src/app/_layout.tsx` (codebase) — existing `preventAutoHideAsync()` + `hideAsync()` + in-app JS splash screen pattern

### Secondary (MEDIUM confidence)
- `https://docs.expo.dev/versions/latest/sdk/splash-screen` (via Context7) — `SplashScreen.setOptions` options table

### Tertiary (LOW confidence)
- Google Material adaptive icon safe zone (66%) — [ASSUMED from training knowledge; not fetched from official source in this session]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — expo-splash-screen installed and plugin source verified
- Plugin config API: HIGH — verified against installed plugin source
- Fade animation API: HIGH — verified via Context7 official docs
- Android adaptive safe zone: LOW — assumed from training knowledge

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (stable SDK; unlikely to change within 30 days)
