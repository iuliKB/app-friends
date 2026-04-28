---
phase: 18-theme-foundation
reviewed: 2026-04-28T18:23:27Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/theme/light-colors.ts
  - src/theme/ThemeContext.tsx
  - src/theme/index.ts
  - src/app/_layout.tsx
  - app.config.ts
  - src/components/common/ThemeSegmentedControl.tsx
  - src/app/(tabs)/profile.tsx
findings:
  critical: 3
  warning: 2
  info: 3
  total: 8
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-04-28T18:23:27Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This phase introduces the theme foundation: a `LIGHT` color palette, a `ThemeProvider`/`useTheme` context, a `ThemeSegmentedControl` UI component, and wires the control into the Profile screen. The architecture is sound — `ThemeContext` correctly persists preference to AsyncStorage, hydrates on mount, and resolves the effective scheme against the system default.

However, **three critical issues** mean Light mode does not actually render in Light mode anywhere in the app today. The core problem is that `ThemeProvider` is used in `_layout.tsx` but nothing reads back from it — screens (including `profile.tsx`) and the layout shell itself continue to consume the static `COLORS` import (the dark palette) directly, bypassing `useTheme()` entirely. The `ThemeSegmentedControl` itself has the same bug: it calls `useTheme()` but only reads `theme`/`setTheme`, discarding `colors`, and its stylesheet uses the static dark `COLORS`.

These three issues should be resolved before the feature is considered functional.

---

## Critical Issues

### CR-01: Navigation shell always renders with dark palette — ignores ThemeProvider

**File:** `src/app/_layout.tsx:312-319`
**Issue:** `GestureHandlerRootView` and the `Stack`'s `contentStyle` are both set to `COLORS.surface.base`, which is the statically-imported dark value `#0E0F11`. This code runs inside `ThemeProvider` but never calls `useTheme()`, so the navigation container background is always dark regardless of the user's theme preference or what `ThemeProvider` resolves.

**Fix:**
Extract the inner content into a child component that can call `useTheme()`, or move the background logic into a wrapper:

```tsx
// Create a small inner component that can consume the hook
function AppShell({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface.base }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface.base },
        }}
      >
        {children}
      </Stack>
    </GestureHandlerRootView>
  );
}

// In RootLayout render:
return (
  <ThemeProvider>
    <AppShell>
      <Stack.Protected guard={!!session && !needsProfileSetup}>
        ...
      </Stack.Protected>
      ...
    </AppShell>
  </ThemeProvider>
);
```

---

### CR-02: ThemeSegmentedControl stylesheet always uses dark palette

**File:** `src/components/common/ThemeSegmentedControl.tsx:48`
**Issue:** The `container` style sets `backgroundColor: COLORS.surface.card`. `COLORS` is the static dark import (`#1D2027`). The component calls `useTheme()` but only destructures `theme` and `setTheme` — `colors` is never used. In Light mode the control sits on a dark card background against a light screen, making it look broken.

**Fix:**
Use `colors` from `useTheme()` for all dynamic tokens, and move those properties out of `StyleSheet.create` (which is static) into inline styles:

```tsx
export function ThemeSegmentedControl() {
  const { theme, setTheme, colors } = useTheme();

  // ...

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.card }]}>
      {SEGMENTS.map((seg) => {
        const isActive = theme === seg.value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => handlePress(seg.value)}
            // ...
          >
            <Text style={[styles.label, { color: colors.text.secondary }, isActive && styles.activeLabel]}>
              {seg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
```

The `activeSegment` background (`#B9FF3B`) and `activeLabel` color (`#0E0F11`) are intentionally hardcoded per spec (D-07) and are correct as-is.

---

### CR-03: ProfileScreen always renders with dark palette — ignores ThemeProvider

**File:** `src/app/(tabs)/profile.tsx:24`
**Issue:** The entire profile screen imports `COLORS` from `@/theme` (the static dark object) and uses it throughout all 125+ lines of `StyleSheet.create`. It never calls `useTheme()`. In Light mode the profile screen — including the APPEARANCE section that hosts the theme control — will render with dark backgrounds and light-on-dark text, contradicting the user's choice.

**Fix:**
Import `useTheme` and replace `COLORS` references in dynamic styles with `colors` from the hook. Since `StyleSheet.create` is static, theme-sensitive values must move to inline styles. A clean pattern is to compute a `themedStyles` object inside the component:

```tsx
import { useTheme } from '@/theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  // ... rest of state ...

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.base }]}>
      <ScrollView ...>
        {/* Use colors.text.primary, colors.border, etc. inline */}
      </ScrollView>
    </View>
  );
}
```

Static layout properties (`flex`, `flexDirection`, `padding`, `height`) can stay in `StyleSheet.create`. Only color/theme tokens need to move to inline styles.

---

## Warnings

### WR-01: AsyncStorage read error silently swallowed on initial theme hydration

**File:** `src/theme/ThemeContext.tsx:31`
**Issue:** The `.catch(() => {})` on the initial `AsyncStorage.getItem` call is entirely silent. If storage is unavailable or returns a corrupted value that fails the guard, the user is left on the `system` default with no diagnostic signal — not even a `console.warn`. The `setTheme` write path (line 36–38) correctly emits `console.warn` on failure; the read path should be consistent.

**Fix:**
```tsx
.catch(() => {
  console.warn('[ThemeProvider] Failed to read stored theme preference');
});
```

---

### WR-02: Palette structural divergence — `destructive` color differs between DARK and LIGHT

**File:** `src/theme/ThemeContext.tsx:12` / `src/theme/light-colors.ts:18` / `src/theme/colors.ts:18`
**Issue:** The `ThemeContextValue` types `colors` as `typeof DARK | typeof LIGHT`. Both palettes share the same shape, but `interactive.destructive` is `#DC2626` in `LIGHT` and `#F87171` in `DARK`. This is intentional for visual contrast tuning, but the union type means any consumer calling `colors.interactive.destructive` will receive different hues per theme with no TypeScript warning. If a component ever does a value-based comparison (`if (colors.interactive.destructive === '#DC2626')`) it will silently fail in Dark mode.

Additionally, if either palette is ever extended with a new token that the other lacks, TypeScript will infer a union of the two shapes and accessing the new key on `colors` without a type guard will be an error — but the current type annotation hides this until accessed.

**Fix:**
Define a shared `ColorPalette` interface and assert both palettes implement it:

```ts
// src/theme/palette.ts
export interface ColorPalette {
  text: { primary: string; secondary: string };
  surface: { base: string; card: string; overlay: string };
  interactive: { accent: string; destructive: string };
  feedback: { info: string; error: string };
  status: { free: string; busy: string; maybe: string };
  border: string;
  overlay: string;
  shadow: string;
  offline: { bg: string; text: string };
  splash: { gradientStart: string; gradientEnd: string; text: string };
}
```

```ts
// In ThemeContext.tsx
import type { ColorPalette } from './palette';

type ThemeContextValue = {
  colors: ColorPalette;   // concrete interface, not a union of typeof
  isDark: boolean;
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
};
```

This also removes the need to cast or type-narrow in consumers.

---

## Info

### IN-01: Duplicate import of `@/theme` in ThemeSegmentedControl

**File:** `src/components/common/ThemeSegmentedControl.tsx:3-4`
**Issue:** `@/theme` is imported twice — once for `COLORS, SPACING, FONT_SIZE, FONT_FAMILY, RADII` and once for `useTheme`. Both can be consolidated into a single import statement.

**Fix:**
```tsx
import { SPACING, FONT_SIZE, FONT_FAMILY, RADII, useTheme } from '@/theme';
import type { ThemePreference } from '@/theme';
```

(Note: once CR-02 is applied, `COLORS` from this file can be removed entirely.)

---

### IN-02: EAS Project ID placeholder will silently reach production

**File:** `app.config.ts:47`
**Issue:** `process.env.EAS_PROJECT_ID ?? 'YOUR_EAS_PROJECT_UUID'` uses a placeholder string as the fallback. If `EAS_PROJECT_ID` is not set in a CI environment, the placeholder string will be embedded in the built app config without any error or warning.

**Fix:**
Fail loudly in non-local builds rather than silently embedding the placeholder:

```ts
extra: {
  eas: {
    projectId: process.env.EAS_PROJECT_ID ?? (
      process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('EAS_PROJECT_ID env var is required for production builds'); })()
        : 'YOUR_EAS_PROJECT_UUID'
    ),
  },
  // ...
},
```

Or simply remove the fallback and let the build fail explicitly if the env var is missing.

---

### IN-03: `loader` style defined but never referenced

**File:** `src/app/(tabs)/profile.tsx:581-583`
**Issue:** `styles.loader` is defined in `StyleSheet.create` with `marginTop: SPACING.xl` but is never referenced anywhere in the component's JSX. This is dead code.

**Fix:**
Remove the unused style:
```ts
// Delete these lines from StyleSheet.create:
loader: {
  marginTop: SPACING.xl,
},
```

---

_Reviewed: 2026-04-28T18:23:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
