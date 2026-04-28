# Phase 18: Theme Foundation — UI Design Contract

**Generated:** 2026-04-28
**Phase:** 18 — Theme Foundation
**Stack:** React Native (Expo 55) — react-native stack guidelines applied
**Design Tool:** ui-ux-pro-max (Vibrant & Block-based style)
**Status:** Ready for planning

---

## Scope

This phase introduces one new UI component: **ThemeSegmentedControl** — a three-segment picker (Light | Dark | System) inserted into the Profile screen's new APPEARANCE section. All other UI surfaces in this phase are infrastructure (ThemeProvider, color palettes, AsyncStorage persistence) with no user-visible rendering changes.

**In scope:**
- `ThemeSegmentedControl` component visual spec
- APPEARANCE section layout in `profile.tsx`
- Active / inactive / pressed segment states

**Out of scope (Phase 19):**
- Migrating existing screens to `useTheme().colors`
- The Profile screen's own dark/light adaptation
- System chrome adaptation (handled by `userInterfaceStyle: 'automatic'` config change — no visual spec needed)

---

## Design System

### Style
**Vibrant & Block-based** — Bold, high-contrast, geometric. Consistent with the app's existing accent (`#B9FF3B`) usage on primary buttons and status indicators.

### Color Tokens (Phase 18 canonical values)

| Token | Dark (existing COLORS) | Light (new LIGHT palette) |
|-------|------------------------|--------------------------|
| `surface.base` | `#0E0F11` | `#FAFAFA` |
| `surface.card` | `#1D2027` | `#FFFFFF` |
| `text.primary` | `#F5F5F5` | `#111827` |
| `text.secondary` | `#9CA3AF` | `#6B7280` |
| `interactive.accent` | `#B9FF3B` | `#B9FF3B` |
| `border` | `#1E2128` | `#E5E7EB` |

**Accent rule:** `#B9FF3B` is fills/backgrounds only. Never use as text on white. Dark text (`#0E0F11`) must sit on top of accent backgrounds.

### Typography
| Role | Family | Size | Weight |
|------|--------|------|--------|
| Segment label (inactive) | `FONT_FAMILY.display.regular` | `FONT_SIZE.md` | Regular |
| Segment label (active) | `FONT_FAMILY.display.semibold` | `FONT_SIZE.md` | Semibold |
| Section header | (existing `styles.sectionHeader` — unchanged) | — | — |

### Spacing & Shape
| Token | Value | Usage |
|-------|-------|-------|
| `SPACING.xs` | (existing) | Segment container internal padding |
| `SPACING.sm` | 8px | Gap between segments (D-07) |
| `SPACING.lg` | (existing) | Horizontal margin matching profile rows |
| `SPACING.md` | (existing) | Vertical padding on the APPEARANCE row wrapper |
| `RADII.md` | (existing) | Container border radius |
| `RADII.sm` | (existing) | Individual segment border radius |

---

## Component: ThemeSegmentedControl

**File:** `src/components/common/ThemeSegmentedControl.tsx`

### Visual Anatomy

```
┌─────────────────────────────────────────┐
│  [  Light  ]  [  Dark  ]  [  System  ]  │  ← 44px min height (touch target rule)
└─────────────────────────────────────────┘
     ↑                ↑
  inactive         active
  surface.card     #B9FF3B bg
  text.secondary   #0E0F11 text
  RADII.sm         RADII.sm
```

- 3 equal-width segments (`flex: 1` each)
- `gap: 8` (SPACING.sm) between segments
- Container background: `COLORS.surface.card` (static COLORS — Phase 18 compat shim; profile screen is not migrated)
- Container borderRadius: `RADII.md`
- Container padding: `SPACING.xs` (matches existing SegmentedControl)
- Container height: 44px minimum (ui-ux-pro-max touch-target-size rule: 44×44px)
- `marginHorizontal: SPACING.lg` (aligns with profile row content)

### State Specs

| State | Background | Text Color | Font Weight |
|-------|-----------|-----------|-------------|
| Inactive | `COLORS.surface.card` | `COLORS.text.secondary` | Regular |
| Active | `#B9FF3B` | `#0E0F11` | Semibold |
| Pressed | `activeOpacity: 0.8` | (same as inactive/active) | — |

> The profile screen itself is not migrated in Phase 18. ThemeSegmentedControl uses static `COLORS` for its own frame chrome (container background, inactive states). The active segment's `#B9FF3B` / `#0E0F11` are hardcoded per D-07 — these same values exist in both DARK and LIGHT palettes so no visual regression occurs when the screen migrates in Phase 19.

### Interaction Spec

| Event | Behavior |
|-------|---------|
| Tap segment | 1. `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` 2. `setTheme(value)` (instant, no save button) |
| Theme change | Colors resolve immediately — app-wide re-render via ThemeContext; no reload required |
| Already-active tap | No-op visually; haptic still fires (matches existing SegmentedControl behavior) |

### Accessibility

| Rule | Implementation |
|------|---------------|
| Touch target ≥ 44×44px | Container `height: 44`, segments `flex: 1` with `minHeight: 44` |
| Screen reader label | Each `TouchableOpacity` gets `accessibilityRole="button"` and `accessibilityLabel={"${seg.label} theme"}` |
| Active state announcement | Active segment gets `accessibilityState={{ selected: true }}` |
| Focus state | React Native handles natively; no additional style needed |

---

## Screen: Profile — APPEARANCE Section

**File:** `src/app/(tabs)/profile.tsx` — insertion point at line ~403, before `NOTIFICATIONS` section

### Layout

```
...ACCOUNT section rows...

APPEARANCE                          ← sectionHeader style (existing, uppercase)
┌─────────────────────────────────┐
│ [  Light  ] [  Dark  ] [System] │ ← ThemeSegmentedControl, marginHorizontal SPACING.lg
└─────────────────────────────────┘
                                    ← paddingVertical: SPACING.md on wrapper View

NOTIFICATIONS                       ← existing, unchanged
  ○ Plan invites          [toggle]
  ○ Friend availability   [toggle]
...
```

### Insertion Code Shape

```tsx
{/* APPEARANCE section */}
<Text style={styles.sectionHeader}>APPEARANCE</Text>
<View style={{ paddingVertical: SPACING.md }}>
  <ThemeSegmentedControl />
</View>

{/* NOTIFICATIONS section (existing — unchanged) */}
<Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
```

> `SPACING.md` vertical padding on the wrapper provides breathing room matching the profile row rhythm. The ThemeSegmentedControl handles its own horizontal margin internally.

---

## Reference: Existing SegmentedControl Pattern

`src/components/status/SegmentedControl.tsx` is the structural analog. ThemeSegmentedControl follows the same:
- `TouchableOpacity` per segment with `activeOpacity={0.8}`
- `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on press
- `FONT_FAMILY.display` for labels
- `StyleSheet.create` at **module scope** (acceptable here because styles are static — the control's own chrome uses static `COLORS` per D-09 compat shim; no `useMemo` needed for ThemeSegmentedControl itself)

> Note: D-05 requires `useMemo([colors])` for **new themed components** that consume `useTheme().colors`. `ThemeSegmentedControl` in Phase 18 uses static `COLORS` for its own frame, so D-05 does not apply. From Phase 19 onward, if this component is migrated, styles must move into `useMemo`.

---

## Anti-Patterns (do NOT implement)

| Anti-pattern | Why Forbidden |
|-------------|--------------|
| Emoji icons (🌙 ☀️ 💻) for segment labels | ui-ux-pro-max: no-emoji-icons rule. Use text labels only: "Light", "Dark", "System" |
| Save button after selection | D-08: theme applies instantly on tap. No save/confirm flow. |
| Loading state on segments during theme switch | Theme switch is synchronous (context state update). No async operation on the UI thread. |
| `#B9FF3B` as text on white background | Accent rule: accent is fills only. Text on accent must be `#0E0F11`. |
| `StyleSheet.create` at module scope in future themed components | D-05: use `useMemo([colors])` for any component consuming `useTheme().colors`. Exception: ThemeSegmentedControl itself (uses static COLORS in Phase 18). |
| Vibrating on every single tap without restraint | ui-ux-pro-max haptic rule: haptic for confirmations/important actions — selection qualifies; keep at `ImpactFeedbackStyle.Light` |

---

## Checker Verification Checklist

- [ ] ThemeSegmentedControl has 3 segments: Light, Dark, System (exact labels, exact order)
- [ ] Active segment background is `#B9FF3B`; active text is `#0E0F11`
- [ ] Inactive segment background is `COLORS.surface.card`; inactive text is `COLORS.text.secondary`
- [ ] Container minimum height is 44px (touch target compliance)
- [ ] Each segment has `accessibilityRole="button"` and `accessibilityLabel`
- [ ] Active segment has `accessibilityState={{ selected: true }}`
- [ ] Haptic fires before `setTheme()` call
- [ ] APPEARANCE section header uses existing `styles.sectionHeader` style
- [ ] APPEARANCE section is positioned above NOTIFICATIONS in profile.tsx
- [ ] No save button or loading spinner on the control
- [ ] No emoji used as segment labels

---

*Phase: 18-theme-foundation*
*UI-SPEC generated: 2026-04-28 via ui-ux-pro-max*
