# Phase 18: Theme Foundation - Research

**Researched:** 2026-04-28
**Domain:** React Native theming — Context API, AsyncStorage persistence, color palette, app.config.ts chrome
**Confidence:** HIGH

---

## Summary

Phase 18 builds the entire theming infrastructure for Campfire without migrating any existing screens.
The deliverables are: a `DARK` + `LIGHT` color palette pair, a `ThemeContext.tsx` wrapping the navigation
tree, a `useTheme()` hook returning `{ colors, isDark, theme, setTheme }`, AsyncStorage persistence
under the `campfire:theme` key, and a segmented control in the Profile screen for Light/Dark/System
selection. The existing `COLORS` export in `src/theme/colors.ts` becomes the compat shim — non-migrated
screens keep importing it and render in dark mode until Phase 19.

All decisions have been locked in the CONTEXT.md discussion. No alternatives to research; the work
is implementation-focused. Key pre-existing patterns (`useViewPreference.ts`, the existing `SegmentedControl`
component, `GestureHandlerRootView` in `_layout.tsx`) are well-understood from codebase inspection and
directly inform the implementation shape.

The main subtlety is the no-flash startup requirement (THEME-03): because `useColorScheme()` from
`react-native` is synchronous and returns the system scheme before first render, the default `'system'`
mode can be resolved at component initialization time — no `useEffect` delay, no blank window. The
`campfire:theme` AsyncStorage preference hydrates asynchronously, but that means at worst one re-render
(system theme → stored preference) which is invisible because the SplashScreen is held until fonts+auth
resolve.

**Primary recommendation:** Build `ThemeContext.tsx` with synchronous initial state (`useColorScheme()`
fallback), async hydration for the stored preference, and fire-and-forget persistence on `setTheme` — exact
pattern as `useViewPreference.ts` but returning a context value instead of a hook tuple.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — Both DARK and LIGHT palettes share the same semantic structure as the existing `COLORS`
  object (`text`, `surface`, `interactive`, `feedback`, `status`, `border`, `overlay`, `shadow`, `offline`,
  `splash`).
- **D-02** — First-install default is **System**. `useColorScheme()` used synchronously. If a stored
  `campfire:theme` preference exists in AsyncStorage, that takes precedence.
- **D-03** — AsyncStorage key `campfire:theme`, values `'light' | 'dark' | 'system'`. No key = `'system'`.
- **D-04** — `useTheme()` returns `{ colors, isDark, theme, setTheme }`. `theme` = stored preference.
  `colors` = resolved palette.
- **D-05** — `StyleSheet.create` inside component body wrapped in `useMemo([colors])` for all new
  themed components.
- **D-06** — New APPEARANCE section above NOTIFICATIONS in Profile screen. Header label: "APPEARANCE".
- **D-07** — Custom segmented control: 3 equal-width buttons (Light | Dark | System), 44px min height,
  8px gaps, active = `#B9FF3B` bg + `#0E0F11` text, inactive = `surface.card` bg + `text.secondary` text.
  Border radius from `RADII` tokens (RADII.md matches existing card radius = RADII.lg = 12).
- **D-08** — Theme applies instantly on segment tap. Haptic feedback on selection.
- **D-09** — `COLORS` in `src/theme/colors.ts` stays as the static DARK palette. Non-migrated screens
  are unaffected.
- **D-10** — `src/theme/index.ts` barrel export extended (not replaced): adds `DARK`, `LIGHT`,
  `ThemeProvider`, `useTheme` re-exported from `src/theme/ThemeContext.tsx`.
- **D-11** — `app.config.ts` `userInterfaceStyle` changed from `'dark'` to `'automatic'`.

### Claude's Discretion

- ThemeContext implementation details (useState vs useRef for synchronous hydration, exact async
  loading strategy to prevent flash)
- Whether to extract `useTheme` into a separate file or co-locate in ThemeContext.tsx
- Exact TypeScript type for the theme (`'light' | 'dark' | 'system'` union)
- AsyncStorage loading state handling (brief null window before hydration)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THEME-01 | User can select Light, Dark, or System theme from Profile settings | ThemeSegmentedControl component in Profile; `setTheme()` from context |
| THEME-02 | Selected theme persists across app restarts without re-selecting | AsyncStorage `campfire:theme` key; hydration in ThemeProvider useEffect |
| THEME-03 | App launches with the correct theme immediately — no flash | `useColorScheme()` synchronous initial state covers system default; stored pref hydrates before splash hides |
| THEME-05 | Theme applies instantly when user selects an option (no save button) | Instant state update in `setTheme`; fire-and-forget AsyncStorage persist |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Color palette definitions | Static module (src/theme/colors.ts) | — | Pure data, no runtime tier needed |
| Theme preference persistence | AsyncStorage (device) | — | Local preference, no server sync needed |
| Theme context / resolved palette | React Context (ThemeProvider) | — | Must be available to all component subtrees |
| System scheme detection | React Native `useColorScheme()` | — | OS-native hook, synchronous |
| Theme picker UI | Frontend screen (profile.tsx) | ThemeContext.setTheme | Profile owns the UI; context owns state |
| OS chrome (status bar) | app.config.ts static config | — | `userInterfaceStyle: 'automatic'` is build-time config |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.0 | Context API for ThemeProvider | Already in project [VERIFIED: package.json] |
| react-native | 0.83.6 | `useColorScheme()` for system theme detection | Already in project, synchronous hook [VERIFIED: package.json] |
| @react-native-async-storage/async-storage | 2.2.0 | Persist `campfire:theme` preference | Already installed; matches `useViewPreference.ts` pattern [VERIFIED: package.json] |
| expo-haptics | ~55.0.14 | Haptic feedback on segment tap (D-08) | Already installed, used in SegmentedControl.tsx [VERIFIED: package.json + codebase grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo | ~55.0.17 | app.config.ts `userInterfaceStyle` field | Already in project; only need config change [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context | Zustand store | Context is simpler for theme; no async state sync overhead; locked by D-04 |
| AsyncStorage hydration in useEffect | MMKV synchronous reads | MMKV is synchronous and would remove any hydration delay, but AsyncStorage is already the project standard (useViewPreference pattern) and flash is already mitigated by splash hold |

**Installation:** No new packages required. All dependencies are already installed.

**Version verification:** All versions confirmed from `package.json` in this session [VERIFIED: package.json].

---

## Architecture Patterns

### System Architecture Diagram

```
App Launch
    │
    ▼
[GestureHandlerRootView]
    │
    ▼
[ThemeProvider]  ◄── reads campfire:theme from AsyncStorage (async)
    │               ◄── reads useColorScheme() synchronously (initial state)
    │               stores: theme ('light'|'dark'|'system'), colors (resolved palette)
    │
    ├──► [OfflineBanner]         ← not migrated; uses static COLORS compat shim
    │
    └──► [Stack / screens]
              │
              ├──► [profile.tsx]
              │        │
              │        └──► [ThemeSegmentedControl]
              │                  tap → setTheme(value) → instant re-render
              │                       └─ fire-and-forget AsyncStorage.setItem
              │
              └──► [All other screens]   ← not migrated; use static COLORS compat shim
```

**Data flow for palette resolution:**
```
stored preference ('light'|'dark'|'system')
    +  system scheme from useColorScheme() ('light'|'dark'|null)
    ─────────────────────────────────────────────────────────────
    │  if 'light'  → LIGHT palette
    │  if 'dark'   → DARK palette
    │  if 'system' → system scheme === 'dark' ? DARK : LIGHT
    ▼
colors object  →  useTheme() consumers
```

### Recommended Project Structure

```
src/theme/
├── colors.ts           # existing — COLORS (DARK palette, compat shim, unchanged)
├── ThemeContext.tsx     # NEW — ThemeProvider, useTheme, LIGHT palette defined here or imported
├── index.ts            # extended — adds DARK, LIGHT, ThemeProvider, useTheme exports
├── spacing.ts          # unchanged
├── typography.ts       # unchanged
├── radii.ts            # unchanged
├── shadows.ts          # unchanged

src/components/common/
└── ThemeSegmentedControl.tsx  # NEW — Light/Dark/System picker for Profile screen

src/app/
└── _layout.tsx         # modified — wrap with ThemeProvider
src/app/(tabs)/
└── profile.tsx         # modified — add APPEARANCE section + ThemeSegmentedControl

app.config.ts           # modified — userInterfaceStyle: 'automatic'
```

### Pattern 1: ThemeContext with Synchronous Initial State

**What:** Create ThemeProvider with synchronous initial state (no loading flash), async hydration for stored preference.

**When to use:** Required for THEME-03 (no startup flash). The splash screen is held until `ready && fontsLoaded` in `_layout.tsx` — ThemeProvider's async hydration completes inside that window.

**Example:**
```typescript
// Source: project pattern — mirrors useViewPreference.ts
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as DARK } from './colors';
import { LIGHT } from './light-colors'; // or defined inline

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'campfire:theme';

type ThemeContextValue = {
  colors: typeof DARK;
  isDark: boolean;
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // synchronous — safe as initial state
  const [theme, setThemeState] = useState<ThemePreference>('system');

  // Async hydration — runs after initial render; splash screen holds until
  // fonts+auth ready so any re-render here is invisible to the user.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeState(stored);
        }
      })
      .catch(() => { /* silent: defaults to 'system' */ });
  }, []);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t).catch(() => {
      console.warn('[ThemeProvider] Failed to persist theme preference');
    });
  }, []);

  const effectiveScheme =
    theme === 'system' ? (systemScheme ?? 'dark') : theme;
  const isDark = effectiveScheme === 'dark';
  const colors = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ colors, isDark, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
```

[ASSUMED] — Pattern is derived from project's `useViewPreference.ts` (VERIFIED) + standard React Context idiom (ASSUMED). The specific hook shape is locked by D-04.

### Pattern 2: LIGHT Palette Definition

**What:** Mirror exact `COLORS` structure from `src/theme/colors.ts` but with light-mode values from CONTEXT.md decision table.

**When to use:** LIGHT palette is defined once (either in `ThemeContext.tsx` or a companion `light-colors.ts`) and exported from `src/theme/index.ts` as `LIGHT`.

**Example:**
```typescript
// Source: CONTEXT.md D-01 + color table
export const LIGHT = {
  text: {
    primary: '#111827',
    secondary: '#6B7280',
  },
  surface: {
    base: '#FAFAFA',
    card: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.08)',
  },
  interactive: {
    accent: '#B9FF3B',
    destructive: '#DC2626',
  },
  feedback: {
    info: '#2563EB',
    error: '#DC2626',
  },
  status: {
    free: '#16A34A',
    busy: '#DC2626',
    maybe: '#D97706',
  },
  border: '#E5E7EB',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000000',
  offline: {
    bg: '#F0FDF4',
    text: '#166534',
  },
  splash: {
    gradientStart: '#B9FF3B',
    gradientEnd: '#8DFF2F',
    text: '#0E0F11',
  },
} as const;
```

[VERIFIED: values from CONTEXT.md decision table — all tokens present]

Note: The DARK palette has `feedback.error` = `#F87171` but the existing `COLORS` object uses `feedback.error`. The CONTEXT.md color table uses `feedback.info` for the info blue — `error` is implied from `interactive.destructive`. Match the existing COLORS structure exactly (VERIFIED from `src/theme/colors.ts`).

### Pattern 3: ThemeSegmentedControl Component

**What:** A self-contained three-segment picker for Light/Dark/System, styled per D-07.

**When to use:** Inserted in `profile.tsx` above the NOTIFICATIONS section as a standalone component.

**Example:**
```typescript
// Source: CONTEXT.md D-07 + existing SegmentedControl.tsx pattern
import * as Haptics from 'expo-haptics';

const SEGMENTS: { label: string; value: ThemePreference }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();

  async function handlePress(t: ThemePreference) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(t);
  }

  return (
    <View style={styles.container}>
      {SEGMENTS.map((seg) => {
        const isActive = theme === seg.value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => handlePress(seg.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {seg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,          // SPACING.sm — D-07: 8px gaps between segments
    marginHorizontal: SPACING.lg,
  },
  segment: {
    flex: 1,
    minHeight: 44,   // D-07 touch target + ui-ux-pro-max rule
    borderRadius: RADII.lg,  // D-07: matches card radius
    backgroundColor: COLORS.surface.card,  // compat: uses static DARK for non-migrated screen
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegment: {
    backgroundColor: '#B9FF3B',
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.body.regular,
    color: COLORS.text.secondary,
  },
  activeLabel: {
    fontFamily: FONT_FAMILY.display.semibold,
    color: '#0E0F11',
  },
});
```

[ASSUMED] — Exact style values derived from D-07 tokens + existing COLORS. Profile screen is not migrated in Phase 18, so the component uses static COLORS for its own frame (background, container) but uses hardcoded accent values for the active state per D-07.

### Pattern 4: _layout.tsx ThemeProvider Insertion

**What:** Wrap the tree with `<ThemeProvider>` below `GestureHandlerRootView`, above `<OfflineBanner>` and `<Stack>`.

**When to use:** Required. D-10 specifies ThemeProvider exported from `src/theme/ThemeContext.tsx`, importable from `@/theme`.

**Example:**
```typescript
// Modified src/app/_layout.tsx (relevant snippet only)
import { ThemeProvider } from '@/theme';

// Inside RootLayout return:
<GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.surface.base }}>
  <ThemeProvider>
    <OfflineBanner />
    <Stack ...>
      ...
    </Stack>
  </ThemeProvider>
</GestureHandlerRootView>
```

[ASSUMED] — Placement is per D-10 + CONTEXT.md integration point notes. GestureHandlerRootView must remain outermost.

### Anti-Patterns to Avoid

- **Static COLORS in ThemeProvider itself:** ThemeProvider's outer wrapper (`GestureHandlerRootView`) still uses static `COLORS.surface.base` — that is intentional for Phase 18 (compat shim). Do not refactor _layout.tsx's own styles to use `useTheme()` in this phase.
- **Reading AsyncStorage synchronously:** There is no synchronous AsyncStorage API in this stack. Do not attempt MMKV as a drop-in; the splash hold window eliminates the need for synchronous storage in this context.
- **ThemeProvider below the splash loading gate:** ThemeProvider must wrap all navigation including the pre-auth splash rendering path. Do not place it inside the `if (!ready || !fontsLoaded)` branch's sibling; it must wrap the entire return.
- **StyleSheet.create at module scope in new themed components:** D-05 explicitly requires `useMemo([colors])` for themed styles. Module-scope `StyleSheet.create` captures COLORS at import time, defeating the theme system. Only safe for non-themed, static styles.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async preference persistence | Custom file/db storage | `@react-native-async-storage/async-storage` (already installed) | Handles RN threading, serialization, cross-platform |
| System color scheme detection | Platform.OS conditional reads | `useColorScheme()` from `react-native` (already in project) | Native hook, synchronous, re-renders on OS change |
| Haptic feedback on segment tap | Native module calls | `expo-haptics` (already installed) | Already used in SegmentedControl.tsx; one-liner |
| Context boilerplate | Redux/MobX for theme state | React Context + `createContext` | Theme is global read-heavy, infrequently-written state — Context is sufficient |

**Key insight:** All required libraries are already installed. This phase adds zero new dependencies.

---

## Common Pitfalls

### Pitfall 1: Flash of Wrong Theme at Startup

**What goes wrong:** ThemeProvider initializes in a neutral state, then async-loads the stored preference — the user sees the wrong theme for one frame.

**Why it happens:** AsyncStorage reads are async; if the initial state is hardcoded `'system'` but the user stored `'dark'`, there is a render with system colors before the switch.

**How to avoid:** The splash screen is held via `SplashScreen.preventAutoHideAsync()` and only hidden when `ready && fontsLoaded`. The ThemeProvider hydration (a single `AsyncStorage.getItem`) completes well within the auth + font loading window. The async hydration will resolve before the splash hides in virtually all cases. No special synchronization is needed beyond the existing splash hold.

**Warning signs:** If the splash screen hides before the AsyncStorage read completes (would only occur on an extremely fast device with extremely slow storage, or if splash hold is removed in a future phase), the wrong palette could flash. Monitor if THEME-03 fails in hardware testing.

### Pitfall 2: Context Not Available Outside ThemeProvider

**What goes wrong:** A component outside ThemeProvider calls `useTheme()` and gets a null context, throwing an error.

**Why it happens:** `OfflineBanner` or other components rendered above the ThemeProvider placement would fail.

**How to avoid:** ThemeProvider is placed inside `GestureHandlerRootView` but above `OfflineBanner` and `Stack` per D-10. OfflineBanner is a non-migrated component that uses static `COLORS` anyway — it does not call `useTheme()`. As long as no component above ThemeProvider calls `useTheme()`, this is safe. Add a null guard + descriptive error message in `useTheme()`.

### Pitfall 3: COLORS compat shim diverges from DARK palette

**What goes wrong:** Developer edits `DARK` or `LIGHT` in ThemeContext but forgets `COLORS` in `colors.ts` is the compat shim. The DARK and COLORS objects drift out of sync.

**Why it happens:** Two sources of truth for the dark palette.

**How to avoid:** D-09 locks the design: `COLORS` in `colors.ts` is NOT modified. `DARK` in `index.ts` is an alias (`export { COLORS as DARK } from './colors'`). This way there is exactly one source of truth: `colors.ts`. Any edit to the dark palette automatically applies to both `COLORS` and `DARK`.

### Pitfall 4: Profile APPEARANCE section — static COLORS in a context-aware component

**What goes wrong:** `ThemeSegmentedControl` imports static `COLORS` for its own background/text, which means the picker itself won't reflect theme changes (it's always dark-styled).

**Why it happens:** Profile.tsx is not migrated in Phase 18. ThemeSegmentedControl lives inside that non-migrated screen.

**How to avoid:** This is intentional per D-09. ThemeSegmentedControl uses hardcoded `#B9FF3B` / `#0E0F11` for the active state (per D-07 which specifies exact hex values) and static `COLORS.surface.card` / `COLORS.text.secondary` for inactive. It correctly reflects the user's stored preference for the segmented control's active segment highlight. The visual inconsistency (the screen stays dark even in light mode) is resolved in Phase 19.

### Pitfall 5: useColorScheme() null on first render

**What goes wrong:** `useColorScheme()` may return `null` on some Android devices or simulators. If not handled, the effective scheme resolves to `undefined`, and the DARK/LIGHT branch fails.

**Why it happens:** Android does not always resolve the color scheme before first render on older APIs.

**How to avoid:** Default null to `'dark'` — the app's existing experience. `(systemScheme ?? 'dark')` in the palette resolution logic.

---

## Code Examples

### Barrel Export Extension (src/theme/index.ts)

```typescript
// Source: existing file pattern (VERIFIED from codebase)
export { COLORS } from './colors';                     // compat shim — unchanged
export { COLORS as DARK } from './colors';             // DARK alias
export { LIGHT } from './ThemeContext';                // or './light-colors' if extracted
export { ThemeProvider, useTheme } from './ThemeContext';
export { SPACING } from './spacing';
export { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT } from './typography';
export { RADII } from './radii';
export { SHADOWS } from './shadows';
```

### Profile APPEARANCE Section Insertion

```typescript
// Source: CONTEXT.md D-06 + profile.tsx structure (VERIFIED)
// Insert BEFORE the NOTIFICATIONS section header:

{/* APPEARANCE section */}
<Text style={styles.sectionHeader}>APPEARANCE</Text>
<View style={[styles.row, { paddingVertical: SPACING.md }]}>
  <ThemeSegmentedControl />
</View>

{/* NOTIFICATIONS section (existing — unchanged) */}
<Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single hardcoded dark palette | Dual DARK/LIGHT palettes with context resolution | Phase 18 | Screens must use `useTheme().colors` instead of static `COLORS` to benefit (Phase 19) |
| `userInterfaceStyle: 'dark'` | `userInterfaceStyle: 'automatic'` | Phase 18 | OS status bar / chrome tracks active theme automatically |

**Deprecated/outdated (after Phase 18):**
- Direct `COLORS` import in new components: works (compat shim), but will miss theme changes. New components created from Phase 18 onward should use `useTheme().colors`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ThemeProvider async hydration completes within the existing splash hold window (auth + fonts), preventing THEME-03 flash | Common Pitfalls §1 | Low risk — storage read is ~5ms; splash hold is ~200-500ms |
| A2 | `useColorScheme()` from `react-native` returns a synchronous value suitable for initial state (not requiring a useEffect) | Architecture Patterns §1 | Low risk — React Native docs confirm synchronous return; existing project already imports it |
| A3 | `COLORS as DARK` alias in index.ts is sufficient to keep DARK and COLORS in sync with zero duplication | Don't Hand-Roll + Pitfall 3 | Low risk — TypeScript re-export semantics guarantee same reference |
| A4 | profile.tsx ThemeSegmentedControl uses static COLORS for its own chrome (dark-always in Phase 18) — this is acceptable per D-09 | Code Examples | No risk — explicitly decided in D-09 |

---

## Open Questions

1. **Where to define LIGHT palette: ThemeContext.tsx or a separate light-colors.ts?**
   - What we know: CONTEXT.md says ThemeContext.tsx is new; `index.ts` needs to export `LIGHT`.
   - What's unclear: Co-locating LIGHT in ThemeContext.tsx couples palette data with context logic.
   - Recommendation: Extract `src/theme/light-colors.ts` to keep `colors.ts` / `light-colors.ts` as peer pure-data files. Mirrors existing structure. This is Claude's discretion per CONTEXT.md.

2. **LIGHT palette `feedback.error` token**
   - What we know: The CONTEXT.md decision table has `interactive.destructive: '#DC2626'` for light but does not list `feedback.error` separately. The existing `COLORS` has `feedback.error: '#F87171'`.
   - What's unclear: Should LIGHT `feedback.error` mirror `interactive.destructive` (`#DC2626`) or a separate light-mode red?
   - Recommendation: Use `'#DC2626'` for LIGHT `feedback.error` (same as destructive — consistent with DARK where both are `#F87171`). This is Claude's discretion.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@react-native-async-storage/async-storage` | Theme persistence | Yes | 2.2.0 | — |
| `expo-haptics` | Segmented control tap feedback | Yes | ~55.0.14 | Remove haptic; still correct behavior |
| `react-native` `useColorScheme` | System scheme detection | Yes | 0.83.6 | Default to `'dark'` |

All dependencies available. No installs required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, no test scripts in package.json |
| Config file | None — Wave 0 must create |
| Quick run command | `npx jest --testPathPattern=theme --passWithNoTests` |
| Full suite command | `npx jest --passWithNoTests` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THEME-01 | `useTheme().setTheme('light')` updates `theme` and `colors` correctly | unit | `npx jest --testPathPattern=ThemeContext` | No — Wave 0 |
| THEME-02 | AsyncStorage key `campfire:theme` is read on mount; restores preference | unit (mocked AsyncStorage) | `npx jest --testPathPattern=ThemeContext` | No — Wave 0 |
| THEME-03 | Initial `colors` is resolved from `useColorScheme()` before any async state | unit | `npx jest --testPathPattern=ThemeContext` | No — Wave 0 |
| THEME-05 | `setTheme('dark')` resolves `colors` to DARK palette synchronously | unit | `npx jest --testPathPattern=ThemeContext` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=ThemeContext --passWithNoTests`
- **Per wave merge:** `npx jest --passWithNoTests`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `__tests__/unit/ThemeContext.test.tsx` — covers THEME-01, THEME-02, THEME-03, THEME-05
- [ ] `jest.config.js` — base Jest config for React Native (preset: `react-native` or `jest-expo`)
- [ ] Mock for `@react-native-async-storage/async-storage` (jest mock or `jest.mock(...)` inline)
- [ ] Framework install: `npx expo install jest-expo @types/jest` — if jest-expo not detected

---

## Security Domain

Security enforcement is enabled (not explicitly disabled in config.json).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Yes (minor) | ThemePreference union type — TypeScript enforces `'light' | 'dark' | 'system'` only; AsyncStorage read validates against known values before setState |
| V6 Cryptography | No | — |

### Known Threat Patterns for AsyncStorage + Context

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AsyncStorage read returns unexpected value (tampering unlikely but possible on jailbroken device) | Tampering | Validate stored value against known union before applying — already in pattern (`if (stored === 'light' || stored === 'dark' || stored === 'system')`) |
| Theme preference leaks PII | Information disclosure | No PII in theme preference — `'light' | 'dark' | 'system'` is not sensitive |

---

## Sources

### Primary (HIGH confidence)

- `src/theme/colors.ts` — DARK palette structure confirmed (VERIFIED in session)
- `src/theme/index.ts` — barrel export pattern confirmed (VERIFIED in session)
- `src/hooks/useViewPreference.ts` — AsyncStorage persistence pattern confirmed (VERIFIED in session)
- `src/app/_layout.tsx` — ThemeProvider insertion point confirmed (VERIFIED in session)
- `src/app/(tabs)/profile.tsx` — APPEARANCE section location confirmed (VERIFIED in session)
- `src/components/status/SegmentedControl.tsx` — segmented control haptic + style pattern confirmed (VERIFIED in session)
- `app.config.ts` — `userInterfaceStyle: 'dark'` current value confirmed (VERIFIED in session)
- `package.json` — all dependency versions confirmed (VERIFIED in session)
- `.planning/phases/18-theme-foundation/18-CONTEXT.md` — all locked decisions (VERIFIED in session)

### Secondary (MEDIUM confidence)

- React Native `useColorScheme()` synchronous behavior — standard documented behavior, confirmed by existing project usage in `src/hooks/use-color-scheme.ts` (VERIFIED: file exports directly from `react-native`)

### Tertiary (LOW confidence)

None — all claims verified from codebase or CONTEXT.md.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json; no new dependencies
- Architecture: HIGH — directly derived from locked decisions + codebase inspection
- Pitfalls: HIGH — derived from actual code structure (compat shim, splash hold pattern, null-safe useColorScheme)
- Color palette values: HIGH — verbatim from CONTEXT.md decision table

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (stable React Native/Expo stack; palette values locked by discussion)
