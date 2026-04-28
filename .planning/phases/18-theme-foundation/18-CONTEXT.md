# Phase 18: Theme Foundation - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the theme infrastructure only — ThemeProvider, DARK and LIGHT color palettes, `useTheme()` hook, AsyncStorage persistence, `app.config.ts` system chrome (`userInterfaceStyle: 'automatic'`), and a COLORS compat shim. **No screen migrations in this phase** — that is Phase 19's job.

</domain>

<decisions>
## Implementation Decisions

### Light Mode Palette (ui-ux-pro-max validated — Vibrant & Block-based, WCAG AA)

Full semantic token set for the LIGHT palette. DARK palette stays as-is in `src/theme/colors.ts`.

| Token | Light Value | Dark Value | Notes |
|-------|------------|-----------|-------|
| `text.primary` | `#111827` | `#F5F5F5` | 16:1 contrast on white |
| `text.secondary` | `#6B7280` | `#9CA3AF` | 4.6:1 on white — WCAG AA |
| `surface.base` | `#FAFAFA` | `#0E0F11` | Near-white, not harsh |
| `surface.card` | `#FFFFFF` | `#1D2027` | Cards pop on off-white base |
| `surface.overlay` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | |
| `interactive.accent` | `#B9FF3B` | `#B9FF3B` | ⚠ fills/backgrounds only — dark text on top; NEVER as text on white |
| `interactive.destructive` | `#DC2626` | `#F87171` | Red-600 passes contrast on white |
| `feedback.info` | `#2563EB` | `#3b82f6` | Blue-600, 4.6:1 |
| `status.free` | `#16A34A` | `#4ADE80` | Darker green for light bg |
| `status.busy` | `#DC2626` | `#F87171` | Same as destructive |
| `status.maybe` | `#D97706` | `#FACC15` | Amber-600, 4.5:1 |
| `border` | `#E5E7EB` | `#1E2128` | Subtle on white |
| `overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.5)` | Modal overlays |
| `shadow` | `#000000` | `#000000` | Same |
| `offline.bg` | `#F0FDF4` | `#1a2e05` | |
| `offline.text` | `#166534` | `#d9f99d` | |

Splash colors remain unchanged (branded moment, same in both themes):
- `splash.gradientStart: '#B9FF3B'`
- `splash.gradientEnd: '#8DFF2F'`
- `splash.text: '#0E0F11'`

- **D-01:** Both DARK and LIGHT palettes share the same semantic structure as the existing `COLORS` object (`text`, `surface`, `interactive`, `feedback`, `status`, `border`, `overlay`, `shadow`, `offline`, `splash`).

### Default Theme

- **D-02:** First install default is **System** — reads iOS/Android system appearance via `useColorScheme()` synchronously. If stored preference exists in AsyncStorage, that takes precedence. This satisfies THEME-03 (no startup flash) because the system setting is known before render.

### Theme Persistence

- **D-03:** Use AsyncStorage key `campfire:theme` with values `'light' | 'dark' | 'system'`. Default (no key stored) = `'system'`. Pattern mirrors `useViewPreference.ts`.
- **D-04:** `useTheme()` context pattern (pre-decided from v1.6 planning) — returns `{ colors, isDark, theme, setTheme }`. `theme` is the stored preference (`'light' | 'dark' | 'system'`). `colors` is the resolved palette (DARK or LIGHT) based on the effective scheme.
- **D-05:** `StyleSheet.create` must be inside the component body wrapped in `useMemo([colors])` for all new themed components. Non-migrated screens continue importing static `COLORS` and are unaffected.

### Theme Picker UI in Profile

- **D-06:** New **APPEARANCE section** above NOTIFICATIONS in the Profile screen. Section header label: "APPEARANCE".
- **D-07:** Custom segmented control: 3 equal-width buttons in a row — **Light | Dark | System**. Active button gets `#B9FF3B` background with `#0E0F11` text. Inactive buttons use `surface.card` background with `text.secondary` text. 44px minimum height per ui-ux-pro-max touch target requirement. 8px gaps between segments (ui-ux-pro-max spacing rule). Border radius matches existing card radius from `RADII` tokens.
- **D-08:** Theme applies instantly on segment tap (THEME-05) — no save button. Haptic feedback on selection (ui-ux-pro-max: haptics for confirmations).

### Compat Shim Architecture

- **D-09:** `COLORS` in `src/theme/colors.ts` remains the **static DARK palette** unchanged. Non-migrated screens import `COLORS` directly and remain in dark mode until Phase 19 migrates them. This is the "compat shim" — backward compatibility via unchanged export.
- **D-10:** `src/theme/index.ts` barrel export continues to re-export `COLORS` as before. New exports added: `DARK` (alias for `COLORS`), `LIGHT` (the new light palette), and `ThemeProvider`/`useTheme` from a new `src/theme/ThemeContext.tsx`.

### app.config.ts

- **D-11:** Change `userInterfaceStyle` from `'dark'` to `'automatic'` so OS status bar and system chrome track the active theme.

### Claude's Discretion

- ThemeContext implementation details (useState vs useRef for synchronous hydration, exact async loading strategy to prevent flash)
- Whether to extract `useTheme` into a separate file or co-locate in ThemeContext.tsx
- Exact TypeScript type for the theme (`'light' | 'dark' | 'system'` union)
- AsyncStorage loading state handling (brief null window before hydration)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Key source files to read before planning
- `src/theme/colors.ts` — existing DARK palette structure to replicate for LIGHT
- `src/theme/index.ts` — barrel export to extend
- `src/hooks/useViewPreference.ts` — AsyncStorage persistence pattern to replicate
- `src/app/_layout.tsx` — root layout where ThemeProvider wraps the tree
- `src/app/(tabs)/profile.tsx` — where APPEARANCE section + segmented control are added
- `app.config.ts` — `userInterfaceStyle` field to change

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useViewPreference.ts`: AsyncStorage key/default/load/set pattern — replicate exactly for `campfire:theme`
- `src/theme/colors.ts`: DARK palette as-is — shape defines the LIGHT palette structure
- `src/components/common/` — no existing segmented control component; ThemeSegmentedControl will be new

### Established Patterns
- AsyncStorage keys use `campfire:` prefix namespace
- Barrel exports in `src/theme/index.ts` — extend, do not replace
- All styling via `@/theme` tokens — new ThemeContext exports must be importable from `@/theme`
- `useViewPreference` shows the established pattern: `useState` initial value → `useEffect` AsyncStorage hydration → fire-and-forget persist on change

### Integration Points
- `src/app/_layout.tsx`: ThemeProvider wraps below `GestureHandlerRootView` (existing outermost wrapper), above `Stack`
- `src/app/(tabs)/profile.tsx`: APPEARANCE section inserts above the existing NOTIFICATIONS section

</code_context>

<specifics>
## Specific Ideas

- Segmented control design: active segment = `#B9FF3B` bg + `#0E0F11` text (same as primary button style); inactive = card surface + secondary text. Consistent with existing accent usage.
- The `useColorScheme()` from `react-native` (already re-exported from `src/theme/use-color-scheme.ts`) is the system signal — no additional dependency needed.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-theme-foundation*
*Context gathered: 2026-04-28*
