---
phase: 28-branding
reviewed: 2026-05-06T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - app.config.ts
  - src/app/_layout.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-05-06
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Two files were reviewed: `app.config.ts` (Expo app configuration) and `src/app/_layout.tsx` (root layout with font loading, auth orchestration, and notification routing). The branding changes introduce two new font families (BricolageGrotesque and PlusJakartaSans) and update splash/icon assets. The splash fallback UI rendered during font loading hard-codes dark-mode colours and uses an emoji as a visual logo — both worth addressing. One async gap in notification cold-start handling may drop the response on slow devices.

---

## Warnings

### WR-01: Cold-start notification response is silently dropped when fonts are still loading

**File:** `src/app/_layout.tsx:320-325`

`getLastNotificationResponseAsync` fires during the mount of `RootLayout`, before `fontsLoaded` is true. The 150 ms `setTimeout` guard was designed for navigation-tree readiness, but `router.push` inside `handleNotificationResponse` also depends on the navigation tree being ready. If fonts take longer than 150 ms to load (common on first install on a slow device), the cold-start response fires while the `ready` state is still `false` and the `Stack` is not yet mounted. In that case the `router.push` call inside is a no-op — the notification tap is silently discarded.

```ts
// Current — races against font load + auth session resolution
Notifications.getLastNotificationResponseAsync().then((response) => {
  if (!response) return;
  setTimeout(() => {
    handleNotificationResponse(response, router).catch(() => {});
  }, 150);
});
```

**Fix:** Store the pending cold-start response in a ref and dispatch it inside the existing `useEffect` that watches `ready && fontsLoaded`:

```ts
const pendingColdStartRef = useRef<Notifications.NotificationResponse | null>(null);

// In the notification useEffect:
Notifications.getLastNotificationResponseAsync().then((response) => {
  if (!response) return;
  pendingColdStartRef.current = response;
});

// In the splash-hide useEffect:
useEffect(() => {
  if (ready && fontsLoaded) {
    SplashScreen.hideAsync();
    if (pendingColdStartRef.current) {
      const r = pendingColdStartRef.current;
      pendingColdStartRef.current = null;
      handleNotificationResponse(r, router).catch(() => {});
    }
  }
}, [ready, fontsLoaded]);
```

---

### WR-02: Fallback splash UI hard-codes dark-mode colours, breaks light-mode system theme

**File:** `src/app/_layout.tsx:338-346`

The pre-font fallback `LinearGradient` block uses `DARK.splash.*` constants directly. The app sets `userInterfaceStyle: 'automatic'` in `app.config.ts` (line 11), which means users who prefer light mode will see a correctly-themed app after fonts load but a dark splash before. This produces a jarring flash. The `LIGHT.splash.*` palette exists and has the same gradient values, but is never consulted here.

```tsx
// Current — always dark regardless of user preference
<LinearGradient
  colors={[DARK.splash.gradientStart, DARK.splash.gradientEnd]}
  ...
>
  <Text style={styles.splashTitle}>Campfire</Text>
```

**Fix:** Read the colour scheme at render time (this component runs before `ThemeProvider` so `useTheme` is unavailable, but `useColorScheme` from `react-native` is safe here):

```tsx
import { useColorScheme } from 'react-native';

// Inside RootLayout, before the early return:
const colorScheme = useColorScheme();
const splashPalette = colorScheme === 'light' ? LIGHT.splash : DARK.splash;

// Then in JSX:
<LinearGradient colors={[splashPalette.gradientStart, splashPalette.gradientEnd]} ...>
  <Text style={[styles.splashTitle, { color: splashPalette.text }]}>Campfire</Text>
  <ActivityIndicator color={splashPalette.text} ... />
```

---

### WR-03: `GestureHandlerRootView` background bypasses theme system

**File:** `src/app/_layout.tsx:350`

After fonts load the outer `GestureHandlerRootView` sets `backgroundColor: DARK.surface.base` directly, hard-coding the dark surface. If the device is in light mode this produces a brief black background flash while `ThemeProvider` renders its children. The `ThemeProvider` is the immediate child, so the mismatch only lasts one frame, but it is observable on low-end devices.

```tsx
// Current
<GestureHandlerRootView style={{ flex: 1, backgroundColor: DARK.surface.base }}>
```

**Fix:** Use `useColorScheme` (already imported for WR-02) to pick the correct base:

```tsx
const surfaceBase = colorScheme === 'light' ? LIGHT.surface.base : DARK.surface.base;

<GestureHandlerRootView style={{ flex: 1, backgroundColor: surfaceBase }}>
```

---

## Info

### IN-01: Emoji used as app logo in fallback splash UI

**File:** `src/app/_layout.tsx:342`

The skill guidelines for this project (ui-ux-pro-max) explicitly call out "No emoji icons — use SVG icons, not emojis." The `🔥` emoji is rendered as the visual brand mark in the loading fallback. Emoji rendering differs between Android and iOS and is not brand-controlled, meaning the flame glyph looks different per platform and OS version.

```tsx
<Text style={styles.splashEmoji}>🔥</Text>
```

**Fix:** Replace with the branded icon asset (`./assets/images/icon.png`) via `<Image>` from `react-native`, which is already loaded synchronously from the bundle:

```tsx
import { Image } from 'react-native';

<Image
  source={require('../../assets/images/icon.png')}
  style={{ width: 80, height: 80, marginBottom: SPACING.sm }}
  resizeMode="contain"
/>
```

---

### IN-02: Placeholder EAS project ID left in production config

**File:** `app.config.ts:72`

The `eas.projectId` falls back to the string literal `'YOUR_EAS_PROJECT_UUID'` when `EAS_PROJECT_ID` is not set. This placeholder will be embedded in any local build that does not have the environment variable configured, potentially causing silent OTA update misrouting.

```ts
projectId: process.env.EAS_PROJECT_ID ?? 'YOUR_EAS_PROJECT_UUID',
```

**Fix:** Fail loudly in non-CI environments instead of falling back silently:

```ts
projectId: process.env.EAS_PROJECT_ID ?? (() => {
  if (process.env.CI) throw new Error('EAS_PROJECT_ID must be set in CI');
  return 'YOUR_EAS_PROJECT_UUID'; // local dev only — OTA updates won't work
})(),
```

Or, if the project ID is now stable and known, hard-code the real UUID directly (acceptable practice — it is not a secret).

---

### IN-03: `splashEmoji` and `splashTitle` font size are magic numbers with ESLint suppress comments

**File:** `src/app/_layout.tsx:367-373`

Both `fontSize: 64` and `fontSize: 28` carry `// eslint-disable-next-line campfire/no-hardcoded-styles` suppressions. The splash screen is a one-off context (no `ThemeProvider` available), so the suppressions are understandable, but the values could be hoisted to named constants to communicate intent and survive a future FONT_SIZE scale update.

```ts
splashEmoji: {
  // eslint-disable-next-line campfire/no-hardcoded-styles
  fontSize: 64,   // no named constant
```

**Fix:** Define them as named constants near the styles block:

```ts
const SPLASH_ICON_SIZE = 64;
const SPLASH_TITLE_FONT_SIZE = 28; // approx FONT_SIZE.xxl — verify after typography token update
```

---

_Reviewed: 2026-05-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
