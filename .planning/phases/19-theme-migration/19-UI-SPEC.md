# Phase 19: Theme Migration — UI Design Contract

**Generated:** 2026-04-28
**Stack:** React Native
**Status:** Ready for planning

---

## 1. Design Context

Phase 19 is not a new UI phase — it is a **correctness migration**. Every component and screen that currently renders colors from the static `COLORS` (DARK palette only) must switch to reading colors through `useTheme()` so that the existing DARK and LIGHT palettes take effect. The visual design of the app does not change. The deliverable is that the UI **looks correct in both modes**.

No new components, layouts, or design tokens are introduced. The design contract below defines what "correct" means for each mode so the implementor and verifier share a common visual target.

---

## 2. Color Token Design Contract

### Dark Mode (DARK palette — current behavior preserved)

| Token | Value | Usage |
|-------|-------|-------|
| `text.primary` | `#F5F5F5` | All body text, headings, labels |
| `text.secondary` | `#9CA3AF` | Subtitles, placeholders, secondary labels |
| `surface.base` | `#0E0F11` | Screen backgrounds, root view |
| `surface.card` | `#1D2027` | Cards, sheets, modals |
| `surface.overlay` | `rgba(255,255,255,0.08)` | Overlay surfaces |
| `interactive.accent` | `#B9FF3B` | Primary CTAs, active tab indicators, accent icons |
| `interactive.destructive` | `#F87171` | Delete, error, destructive actions |
| `border` | `#1E2128` | Dividers, card borders |
| `status.free` | `#4ADE80` | Availability indicator — free |
| `status.busy` | `#F87171` | Availability indicator — busy |
| `status.maybe` | `#FACC15` | Availability indicator — maybe |
| `feedback.info` | `#3B82F6` | Info banners, links |
| `feedback.error` | `#F87171` | Error states |
| `offline.bg` | `#1A2E05` | Offline banner background |
| `offline.text` | `#D9F99D` | Offline banner text |

### Light Mode (LIGHT palette — newly activated by this migration)

| Token | Value | Usage |
|-------|-------|-------|
| `text.primary` | `#111827` | All body text, headings, labels |
| `text.secondary` | `#6B7280` | Subtitles, placeholders, secondary labels |
| `surface.base` | `#FAFAFA` | Screen backgrounds, root view |
| `surface.card` | `#FFFFFF` | Cards, sheets, modals |
| `surface.overlay` | `rgba(0,0,0,0.08)` | Overlay surfaces |
| `interactive.accent` | `#B9FF3B` | Primary CTAs, active tab indicators *(same in both modes)* |
| `interactive.destructive` | `#DC2626` | Delete, error, destructive actions |
| `border` | `#E5E7EB` | Dividers, card borders |
| `status.free` | `#16A34A` | Availability indicator — free |
| `status.busy` | `#DC2626` | Availability indicator — busy |
| `status.maybe` | `#D97706` | Availability indicator — maybe |
| `feedback.info` | `#2563EB` | Info banners, links |
| `feedback.error` | `#DC2626` | Error states |
| `offline.bg` | `#F0FDF4` | Offline banner background |
| `offline.text` | `#166534` | Offline banner text |

---

## 3. Accessibility Contract

All migrated components must satisfy WCAG AA contrast (4.5:1 for normal text, 3:1 for large text):

| Mode | Text | Background | Contrast Ratio | Pass |
|------|------|------------|----------------|------|
| Dark | `#F5F5F5` (primary) | `#0E0F11` (base) | ~18:1 | ✅ |
| Dark | `#9CA3AF` (secondary) | `#1D2027` (card) | ~4.7:1 | ✅ |
| Light | `#111827` (primary) | `#FAFAFA` (base) | ~19:1 | ✅ |
| Light | `#6B7280` (secondary) | `#FFFFFF` (card) | ~5.7:1 | ✅ |
| Light | `#B9FF3B` (accent) | `#FFFFFF` (card) | ~1.6:1 | ⚠️ accent on white — used for icons/indicators only, not text |

> **Note:** `#B9FF3B` accent is not used as text — it appears as icon colors, active tab indicators, and button fills. The contrast requirement applies to text only.

---

## 4. Visual Acceptance Criteria Per Screen Area

### Tab Bar (CustomTabBar.tsx — Plan A)
- **Dark:** Active tab icon `#B9FF3B`, inactive `#9CA3AF`, background `#0E0F11`
- **Light:** Active tab icon `#B9FF3B`, inactive `#6B7280`, background `#FAFAFA`

### Screen Backgrounds
- **Dark:** All screens have `#0E0F11` background — no white flash on navigation
- **Light:** All screens have `#FAFAFA` background — no dark background visible anywhere

### Cards & Sheets
- **Dark:** Card surface `#1D2027` — visually distinct from base (`#0E0F11`)
- **Light:** Card surface `#FFFFFF` — white cards on light grey base (`#FAFAFA`)

### Text
- **Dark:** Primary text near-white (`#F5F5F5`), secondary medium grey (`#9CA3AF`)
- **Light:** Primary text near-black (`#111827`), secondary medium grey (`#6B7280`)

### Borders & Dividers
- **Dark:** Subtle dark border `#1E2128` — visible but not prominent
- **Light:** Light grey border `#E5E7EB` — visible against white card backgrounds

### Status Indicators
- **Dark:** Free green `#4ADE80`, busy red `#F87171`, maybe yellow `#FACC15`
- **Light:** Free green `#16A34A`, busy red `#DC2626`, maybe amber `#D97706`

### Offline Banner
- **Dark:** Dark olive green background (`#1A2E05`), light lime text (`#D9F99D`)
- **Light:** Light mint background (`#F0FDF4`), dark green text (`#166534`)

---

## 5. Special Cases (Design Contract)

### Splash Screen (`_layout.tsx`)
Renders **before** ThemeProvider mounts. Must use static values — never `useTheme()`.

| Element | Value | Reason |
|---------|-------|--------|
| Gradient start | `#B9FF3B` | Identical in both palettes — static safe |
| Gradient end | `#8DFF2F` | Identical in both palettes — static safe |
| Text | `#0E0F11` | Identical in both palettes — static safe |
| Root background | `#0E0F11` | Static dark — acceptable for app load |

### ThemeSegmentedControl Active Colors
Active segment uses hardcoded `#B9FF3B` (background) and `#0E0F11` (text) — intentional per STATE.md D-07. These are the same in both palettes and must **not** be migrated to `colors.interactive.accent`.

### LoadingIndicator Default Color
Default spinner color resolves to `colors.text.secondary` at runtime (via `useTheme()` inside component body), not at parameter default time.

---

## 6. Migration Completeness Visual Gate (Plan C)

After compat shim removal, the following visual checks confirm migration is complete:

1. **Light mode — no dark backgrounds:** Navigate to Home, Squad, Explore, Chats, Profile. Every screen background must be light (`#FAFAFA` / `#FFFFFF`), not dark (`#0E0F11` / `#1D2027`).
2. **Dark mode — no white backgrounds:** Same screens must show dark backgrounds.
3. **Instant theme switch:** Tapping Light → Dark in Profile → APPEARANCE switches the entire visible UI within one render cycle — no partial or stale dark/light mixing.
4. **No unmigrated elements:** Any component still using the static DARK palette will appear incorrect in light mode (e.g., dark card on light background, or light text on light background). Treat any such element as a migration miss.

---

## 7. React Native Implementation Rules (from ui-ux-pro-max)

| Rule | Requirement |
|------|-------------|
| Touch targets | Minimum 44×44pt for all tappable elements |
| Gesture handling | Use `react-native-gesture-handler` (already installed) |
| Animations | Use `react-native-reanimated` for complex animations |
| `prefers-reduced-motion` | Check `AccessibilityInfo.isReduceMotionEnabled()` for motion-sensitive animations |
| StyleSheet memoization | `useMemo([colors], () => StyleSheet.create({...}))` — prevents re-creation on every render |
| No module-level COLORS | After migration, zero `StyleSheet.create` calls at module scope may reference color tokens |

---

## 8. Anti-Patterns (Must Not Appear After Migration)

| Anti-Pattern | Why Forbidden |
|---|---|
| `import { COLORS } from '@/theme'` in any non-theme source file | Shim is removed in Plan C; import will fail |
| `StyleSheet.create({ color: COLORS.x })` at module scope | Freezes style to initial palette; theme toggle has no effect |
| `useTheme()` called outside a React component (module scope, default params) | Hook rules violation; will throw at runtime |
| `color={COLORS.x}` in JSX props (inline) after migration | Stale static value; won't update on theme switch |
| White/light background in dark mode | Unmigrated surface token |
| Dark background in light mode | Unmigrated surface token |

---

*Phase: 19-theme-migration*
*UI spec generated: 2026-04-28 via ui-ux-pro-max*
