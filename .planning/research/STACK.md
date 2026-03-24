# Stack Research

**Domain:** Social coordination mobile app (React Native + Expo + Supabase)
**Researched:** 2026-03-17 (v1 core stack), 2026-03-24 (v1.1 design system additions)
**Confidence:** HIGH (core stack), MEDIUM (supporting libraries), HIGH (Expo Go compatibility flags), HIGH (design system patterns)

---

## v1.1 Design System Additions

This section covers the new patterns and (zero new) dependencies added in the v1.1 design system milestone. The existing v1 stack is unchanged. Everything below is pure TypeScript code organization — no new packages required.

### Core Principle: No New Libraries

The design system is implemented as structured TypeScript files inside the codebase. No styling utility library (Tamagui, Unistyles, NativeWind, styled-components) is added. Every pattern below uses `React.createContext`, `useContext`, `StyleSheet.create`, and TypeScript `const` objects — all already available.

---

### Design Token Files

Tokens are plain TypeScript `const` objects exported from a `src/theme/` directory. No framework, no runtime dependency.

**Recommended token file structure:**

```
src/
  theme/
    colors.ts       ← raw palette + semantic color maps (light + dark)
    spacing.ts      ← 8-point spacing scale
    typography.ts   ← font sizes, line heights, weights, families
    radii.ts        ← border radius scale
    shadows.ts      ← shadow presets (iOS + Android)
    index.ts        ← re-exports everything, assembles Theme type
  hooks/
    useTheme.ts     ← single hook — consumers import this, nothing else
  components/
    ui/             ← shared reusable components
      Button.tsx
      Input.tsx
      FAB.tsx
      EmptyState.tsx
      LoadingSpinner.tsx
      ErrorMessage.tsx
      ScreenHeader.tsx
```

**Why this structure:** Components import from `hooks/useTheme`, not from individual token files. Token files are implementation details; the hook is the public API. This means you can refactor token file internals without touching component imports.

---

### Spacing Scale (8-point)

```typescript
// src/theme/spacing.ts
export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

export type SpacingKey = keyof typeof spacing;
```

**Why 8-point:** Base-8 scales produce values that are divisible by both 4 and 8, which maps cleanly to device pixel grids on both iOS and Android. Arbitrary spacing values (e.g., 13, 17) cause sub-pixel rendering inconsistencies. All screen padding, section gaps, and component margins must use `spacing.*` values.

**Screen padding convention:** `spacing.md` (16) on all sides. Plans and Chats use this — it becomes the standard.

---

### Color Tokens

```typescript
// src/theme/colors.ts

// Raw palette — never use these in components directly
const palette = {
  orange400:  '#F97316',
  orange500:  '#EA580C',
  gray50:     '#FAFAFA',
  gray100:    '#F4F4F5',
  gray200:    '#E4E4E7',
  gray500:    '#71717A',
  gray700:    '#3F3F46',
  gray900:    '#18181B',
  white:      '#FFFFFF',
  black:      '#000000',
  red500:     '#EF4444',
  green500:   '#22C55E',
  yellow500:  '#EAB308',
} as const;

// Semantic tokens — components use these
export const lightColors = {
  // Primary brand
  primary:          palette.orange500,
  primaryLight:     palette.orange400,

  // Backgrounds
  background:       palette.white,
  backgroundSecondary: palette.gray50,
  surface:          palette.gray100,

  // Text
  text:             palette.gray900,
  textSecondary:    palette.gray500,
  textDisabled:     palette.gray200,
  textOnPrimary:    palette.white,

  // Borders
  border:           palette.gray200,
  borderFocus:      palette.orange500,

  // Status (Free/Busy/Maybe)
  statusFree:       palette.green500,
  statusBusy:       palette.red500,
  statusMaybe:      palette.yellow500,

  // Semantic
  error:            palette.red500,
  success:          palette.green500,
} as const;

export const darkColors: typeof lightColors = {
  primary:          palette.orange400,
  primaryLight:     palette.orange500,
  background:       palette.gray900,
  backgroundSecondary: palette.gray700,
  surface:          palette.gray700,
  text:             palette.gray50,
  textSecondary:    palette.gray500,
  textDisabled:     palette.gray700,
  textOnPrimary:    palette.white,
  border:           palette.gray700,
  borderFocus:      palette.orange400,
  statusFree:       palette.green500,
  statusBusy:       palette.red500,
  statusMaybe:      palette.yellow500,
  error:            palette.red500,
  success:          palette.green500,
} as const;

export type Colors = typeof lightColors;
```

**Why two layers (palette → semantic):** Prevents components from encoding magic hex values. If the brand orange changes, only `palette.orange500` changes. Semantic names (`primary`, `background`, `border`) survive color scheme switches — a component that uses `colors.border` works in both light and dark without any change. Restricting components to semantic tokens is the rule that makes the design system enforceable.

---

### Typography Scale

```typescript
// src/theme/typography.ts
export const fontSizes = {
  xs:   11,
  sm:   13,
  md:   15,   // body default
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,
} as const;

export const lineHeights = {
  tight:   1.2,
  normal:  1.4,
  relaxed: 1.6,
} as const;

export const fontWeights = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
} as const;

// Pre-composed text variants — use these in StyleSheet.create
export const textVariants = {
  screenTitle: {
    fontSize:   fontSizes.xl,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.xl * 1.2,
  },
  sectionHeader: {
    fontSize:   fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.lg * 1.3,
  },
  body: {
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.md * 1.4,
  },
  bodyBold: {
    fontSize:   fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.md * 1.4,
  },
  caption: {
    fontSize:   fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.sm * 1.4,
  },
  label: {
    fontSize:   fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.sm * 1.3,
  },
} as const;
```

**Why pre-composed variants:** Prevents "font size soup" where every screen makes ad-hoc decisions. Components spread a variant (`...textVariants.body`) and the typography is consistent everywhere. Adding a new variant is one change in one file.

---

### Theme Object + Type

```typescript
// src/theme/index.ts
import { lightColors, darkColors, Colors } from './colors';
import { spacing } from './spacing';
import { fontSizes, fontWeights, lineHeights, textVariants } from './typography';
import { radii } from './radii';

export const lightTheme = {
  colors:       lightColors,
  spacing,
  fontSizes,
  fontWeights,
  lineHeights,
  textVariants,
  radii,
} as const;

export const darkTheme = {
  ...lightTheme,
  colors: darkColors,
} as const;

export type Theme = typeof lightTheme;
```

**Why `as const` everywhere:** Locks TypeScript to literal types (`spacing.md` is `16`, not `number`). This enables exhaustive autocomplete and prevents assigning arbitrary numbers where a token is expected.

---

### Theme Provider (Context API)

```typescript
// src/hooks/useTheme.ts
import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme } from '../theme';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
```

**Why Context API, not Zustand:** Theme is read-only at component render time, changes only on system color scheme change (rare). Context re-renders the whole tree on theme switch — acceptable because theme switches happen once per session at most, not on user interaction. Zustand's subscription model is valuable for frequently updated state (statuses, messages), not for values that change once a session. Adding theme to Zustand would require either polluting the UI store or creating a second store; Context is the React-idiomatic solution for ambient read-only config.

**Why `useColorScheme` not Zustand persist:** v1.1 follows the system preference automatically. No user-override toggle is in scope. If a user-override preference is added in a future milestone, extend to: Zustand `persist` store with `'light' | 'dark' | 'system'` field + AsyncStorage adapter. Override Zustand value takes precedence over `useColorScheme()` result. This is a one-file change when needed.

**app.json requirement:**
```json
{
  "expo": {
    "userInterfaceStyle": "automatic"
  }
}
```
Without this, `useColorScheme()` returns `null` on Android in Expo managed workflow.

---

### StyleSheet Factory Pattern

Components do not call `useTheme()` for every individual property. Instead, they use a `useMemo`-wrapped `StyleSheet.create()` call tied to the current theme:

```typescript
// Pattern used inside every component that needs theme-aware styles
function MyComponent() {
  const theme = useTheme();
  const styles = useStyles(theme);
  // ...
}

function useStyles(theme: Theme) {
  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md,
        },
        title: {
          ...theme.textVariants.screenTitle,
          color: theme.colors.text,
        },
      }),
    [theme]
  );
}
```

**Why `useMemo` with `StyleSheet.create`:** `StyleSheet.create()` registers styles with the native layer once and returns integer IDs (not style objects). On re-render, passing the same integer ID to a component is a no-op — no layout recalculation. Without `useMemo`, every render creates new style objects, invalidating the StyleSheet optimization. The `useMemo` dependency is `[theme]`, which only changes on system color scheme change — so in practice `StyleSheet.create` runs once per theme, not per render.

**Inline styles for truly dynamic values:** Values that change on every render (e.g., an animated opacity, a width derived from screen dimensions, a conditional color based on component state) should be inline style objects or `Animated.Value`, not `StyleSheet.create`. The rule is: static layout and color goes in `StyleSheet.create`; truly dynamic per-render values go inline.

---

### Shared Component Patterns

#### Button

```typescript
// src/components/ui/Button.tsx
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}
```

- Use `Pressable` (not `TouchableOpacity`) — provides `pressed` state for visual feedback without requiring Animated API
- `React.memo` the component to avoid re-renders when parent re-renders
- All sizing and color derived from `useTheme()` — no hardcoded values

#### FAB (Floating Action Button)

```typescript
interface FABProps {
  icon: string;       // e.g. '+' or icon component
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}
```

- Position: `position: 'absolute'`, `bottom: spacing.xl`, `right: spacing.md`
- Shadow: platform-specific (`elevation` on Android, `shadowColor/Offset/Radius/Opacity` on iOS)
- Size: `56` × `56` (standard Material FAB size, works on both platforms)

#### Input

```typescript
interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
}
```

- Border highlight on focus using `useState` focus tracking + `onFocus`/`onBlur`
- Error message rendered below input using `textVariants.caption` + `colors.error`
- Label rendered above input using `textVariants.label` + `colors.textSecondary`

#### EmptyState

```typescript
interface EmptyStateProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}
```

#### LoadingSpinner

Wraps `ActivityIndicator` with `colors.primary` and optional fullscreen overlay variant.

#### ScreenHeader

Renders the screen title with `textVariants.screenTitle` + optional subtitle and right-side action slot. Replaces ad-hoc `Text` styling in every screen.

---

### Pull-to-Refresh Pattern

All list views use `FlatList` with `refreshControl` prop (constraint already established in v1):

```typescript
const [refreshing, setRefreshing] = React.useState(false);

const handleRefresh = React.useCallback(async () => {
  setRefreshing(true);
  try {
    await fetchData();
  } finally {
    setRefreshing(false);
  }
}, [fetchData]);

<FlatList
  data={items}
  renderItem={renderItem}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={theme.colors.primary}   // iOS spinner color
      colors={[theme.colors.primary]}     // Android spinner color
    />
  }
/>
```

**Why `useCallback` on `handleRefresh`:** `FlatList` is memoized; passing a new function reference on every render causes unnecessary re-renders of the list. `useCallback` with stable dependencies prevents this.

---

### Integration with Existing Zustand

No changes to Zustand stores are needed for the design system. Theme lives in React Context. Zustand stores continue to hold ephemeral UI state (statuses, draft forms, message cache).

If a future user-override theme preference is needed:
- Add `themePreference: 'light' | 'dark' | 'system'` to a settings store (new or existing)
- Persist with `zustand/middleware/persist` + AsyncStorage adapter
- `ThemeProvider` reads from Zustand store and falls back to `useColorScheme()` when preference is `'system'`

This separation keeps theme-as-config in Context and user-preference-as-state in Zustand — each tool used for what it is designed for.

---

### What NOT to Add

| Avoid | Why | Instead |
|-------|-----|---------|
| NativeWind / Tailwind classes | Adds JSX transform dependency, Babel plugin, incompatible with StyleSheet constraint | Plain `StyleSheet.create` with tokens |
| Tamagui | Requires compiler setup, design-time optimization build step; adds significant build complexity to managed Expo workflow | Plain TypeScript token files |
| react-native-unistyles | Good library but adds a dependency where pure TypeScript achieves the same result | `useTheme` hook + `useMemo` StyleSheet pattern |
| styled-components / emotion | Runtime CSS-in-JS with significant bundle cost; React Native support is secondary | `StyleSheet.create` — same authoring experience, better performance |
| react-native-size-matters | `moderateScale()` compensates for variable screen sizes but adds complexity; RN's flex layout handles most cases without explicit scaling | Flex layout + percentage widths where needed |
| Global StyleSheet objects | Shared `const styles = StyleSheet.create({...})` at module level breaks theme-awareness — light/dark colors are baked in at module load time | Per-component `useStyles(theme)` with `useMemo` |
| Multiple Context providers for tokens | Splitting colors, spacing, typography into separate Contexts causes multiple re-renders on theme switch | Single `ThemeContext` with the full theme object |

---

### No Installation Required

The entire design system is zero-dependency. No `npm install` needed. All patterns use:

- `React.createContext` / `useContext` — built into React (already in project)
- `useColorScheme` — built into React Native (already in project)
- `StyleSheet.create` — built into React Native (already in project)
- `React.useMemo` / `React.useCallback` — built into React (already in project)
- TypeScript `as const`, interfaces — built into TypeScript (already in project)

---

## Context

Campfire is a "friendship OS" for close groups of 3–15 people. The stack is non-negotiable (see PROJECT.md). This document covers:

1. Precise version numbers for the chosen v1 stack
2. Design system patterns for the v1.1 milestone (above)
3. Supporting libraries that are Expo Go-compatible
4. Verified incompatibilities to avoid
5. Development tooling

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

**Note for v1.1 design system:** No additional packages. Create `src/theme/` directory and write token files as pure TypeScript.

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
| Theme state | React Context | Zustand theme store | Theme is read-only ambient config, not interactive state. Context re-render on theme switch (once per session) is acceptable. Zustand adds a second store for a value that never needs selective subscription. |
| Date formatting | dayjs | date-fns | date-fns is 3x larger (18KB vs 6KB gzipped) for equivalent functionality needed. |
| Google OAuth | expo-auth-session + expo-web-browser | @react-native-google-signin/google-signin | Native SDK requires custom native modules — incompatible with Expo Go managed workflow. Native approach is better UX but is a V2 optimization after dev build adoption. |
| UI components | React Native StyleSheet | NativeBase / Tamagui / Gluestack | Explicitly excluded in constraints. External UI libs add dependency surface, bundle size, and styling conflicts. Campfire's warm aesthetic is better served by hand-rolled components. |
| Design system styling | Plain TypeScript token files | NativeWind / Unistyles / styled-components | Zero dependency cost. TypeScript `as const` provides the same autocomplete as any styling library. Managed workflow constraint makes build-time compilers (Tamagui, NativeWind) risky. |
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
| NativeWind | Adds Babel transform + Tailwind config. Incompatible with StyleSheet-only constraint. Build configuration risk in managed Expo. | Plain `StyleSheet.create` with `src/theme/` tokens |
| Tamagui | Design-time compiler, build step, Expo plugin required. High setup cost vs. benefit for an existing codebase refactor. | Plain TypeScript token files |
| Global `StyleSheet.create` at module level | Bakes light/dark colors into styles at import time. Cannot switch themes without re-importing modules. | Per-component `useMemo(() => StyleSheet.create({...}), [theme])` |
| `react-native-size-matters` `moderateScale()` | Adds complexity; RN flex layout handles most responsiveness without pixel scaling. | Flex layout, percentage widths, fixed `spacing.*` tokens |

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
- Full design system (pure TypeScript, zero native dependencies)

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
- [Expo Color Themes Docs](https://docs.expo.dev/develop/user-interface/color-themes/) — HIGH confidence. Official Expo docs confirming `userInterfaceStyle: automatic` requirement and `useColorScheme` pattern.
- [React Native Google Sign-In Expo Setup](https://react-native-google-signin.github.io/docs/setting-up/expo) — HIGH confidence. Official library docs confirming Expo Go incompatibility.
- [Zustand Releases (GitHub)](https://github.com/pmndrs/zustand/releases) — HIGH confidence. Version 5.0.12 confirmed current.
- [supabase-js v2.99.2 npm](https://www.npmjs.com/package/@supabase/supabase-js) — HIGH confidence. Current stable version confirmed.
- [Bundlephobia: zustand v5.0.10](https://bundlephobia.com/package/zustand) — MEDIUM confidence. Bundle size reference.
- [expo-barcode-scanner deprecation (Expo FYI)](https://github.com/expo/fyi/blob/main/barcode-scanner-to-expo-camera.md) — HIGH confidence. Official deprecation notice.
- [Expo Google Authentication Guide](https://docs.expo.dev/guides/google-authentication/) — HIGH confidence. Official Expo docs confirming expo-auth-session approach.
- [DEV: Design System for React Native Projects](https://dev.to/msaadullah/how-i-set-up-design-system-for-my-react-native-projects-for-10x-faster-development-1k8g) — MEDIUM confidence. Community article on token structure and ThemeProvider pattern.
- [React Native Crossroads: Level Up React Native Styles](https://www.reactnativecrossroads.com/posts/level-up-react-native-styles/) — MEDIUM confidence. StyleSheet factory pattern, theme injection via hook.
- [LogRocket: Comprehensive Dark Mode in React Native](https://blog.logrocket.com/comprehensive-guide-dark-mode-react-native/) — MEDIUM confidence. useColorScheme + Context patterns.
- [Zustand and React Context (TkDodo)](https://tkdodo.eu/blog/zustand-and-react-context) — MEDIUM confidence. When to use Context vs Zustand for theme.
- [React Native RefreshControl Docs](https://reactnative.dev/docs/refreshcontrol) — HIGH confidence. Official docs for pull-to-refresh implementation.

---
*Stack research for: Campfire — React Native + Expo friendship OS*
*v1 core stack researched: 2026-03-17 | v1.1 design system additions researched: 2026-03-24*
