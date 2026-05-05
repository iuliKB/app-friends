---
phase: 28
slug: branding
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-06
---

# Phase 28 — UI Design Contract

> Visual and interaction contract for the Campfire branding phase. Covers app icon wiring and splash screen configuration only — no new screens, no runtime UI changes.

---

## Scope

This phase touches two surfaces only:

| Surface | File Modified | What Changes |
|---------|--------------|--------------|
| App icon (iOS + Android) | `app.config.ts`, `assets/images/icon.png` | Replace Expo placeholder with final 1024×1024 Campfire PNG |
| Splash screen (light + dark) | `app.config.ts` | Add branded background, contain resize, 400ms fade, dark variant |

No React Native components, no in-app screens, no runtime UI code.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (native Expo asset pipeline) |
| Preset | not applicable |
| Component library | none |
| Icon library | not applicable (asset phase only) |
| Font | not applicable (asset phase only) |
| Stack | React Native / Expo SDK (`expo-splash-screen ~55.0.19`) |

---

## Brand Identity

### Primary Brand Color

| Token | Hex | Usage |
|-------|-----|-------|
| `brand.orange` | `#ff6b35` | Splash background (light mode), Android adaptive icon `backgroundColor` |
| `brand.dark` | `#0E0F11` | Splash background (dark mode) — matches `colors.surface.base` in `src/theme/colors.ts` |

**Contrast audit (ui-ux-pro-max rule: color-contrast, WCAG 4.5:1):**

The splash screen contains no text — only the icon image on a solid background. No contrast ratio requirement applies. However:
- Light mode: white/cream icon on `#ff6b35` — warm, high-visibility launch
- Dark mode: warm-toned icon on `#0E0F11` — no contrast shock; avoids jarring bright-to-dark transition when app opens into dark UI

---

## Spacing Scale

Not applicable — no spacing tokens used in this phase. Asset configuration only.

---

## Typography

Not applicable — no typography introduced in this phase.

---

## Color Contract

| Role | Value | Usage |
|------|-------|-------|
| Splash background (light, 60%) | `#ff6b35` | `splash.backgroundColor` in `app.config.ts` |
| Splash background (dark, 60%) | `#0E0F11` | `splash.dark.backgroundColor` in `app.config.ts` |
| Android adaptive background | `#ff6b35` | `android.adaptiveIcon.backgroundColor` in `app.config.ts` |
| Splash image | `assets/images/icon.png` | `splash.image` — reuses icon asset, no separate file |

---

## Animation Contract

### Splash Fade Transition

| Property | Value | Source |
|----------|-------|--------|
| Duration | `400ms` | D-06 (CONTEXT.md) — polished, not slow |
| Timing function | default (linear or ease-out per `expo-splash-screen`) | Platform default |
| Plugin | `expo-splash-screen` plugin block in `app.config.ts` `plugins` array | D-06 |

**ui-ux-pro-max rule (Reduced Motion, severity: HIGH):** The splash fade is a system-level transition managed by `expo-splash-screen` — it runs before the JS bundle loads, so `prefers-reduced-motion` cannot be queried at that point. This is a known platform constraint. If a future polish phase adds in-app animated transitions, reduced-motion support must be added then.

**ui-ux-pro-max rule (Animation duration):** 150–300ms is the micro-interaction sweet spot; 400ms is appropriate for a launch splash (longer perceivable surface, one-time per cold start). Within acceptable range for this context.

---

## Asset Specification

### App Icon

| Property | Value |
|----------|-------|
| Source file | `assets/images/icon.png` |
| Dimensions | 1024×1024 px |
| Format | PNG, solid background baked in (no transparency) |
| iOS config | `icon: "./assets/images/icon.png"` in `app.config.ts` |
| Android foreground | `android.adaptiveIcon.foregroundImage: "./assets/images/icon.png"` (or separate foreground crop if provided) |
| Android background color | `#ff6b35` (D-03) — solid color layer, not a PNG background |
| Android safe zone | Follow Google Material adaptive icon guideline: icon visible content within 66% of canvas (safe zone) |

### Splash Screen

| Property | Value |
|----------|-------|
| Image | `assets/images/icon.png` (reused — D-04) |
| Resize mode | `contain` — icon centered, no cropping (D-05) |
| Light background | `#ff6b35` (D-07) |
| Dark background | `#0E0F11` (D-08) |
| Fade duration | `400` ms (D-06) |
| Plugin location | `plugins` array in `app.config.ts` |

---

## Copywriting Contract

Not applicable — this phase introduces no user-visible copy, labels, or strings.

---

## Registry Safety

| Registry | Items | Safety Gate |
|----------|-------|-------------|
| `expo-splash-screen` | Plugin config only | Already installed — no new install required |
| `assets/images/` | `icon.png` (user-provided) | User confirms file placed before execution |

---

## Implementation Notes for Planner

> These notes ensure the executor has full visual context without re-reading CONTEXT.md.

1. **`app.config.ts` is the only source of truth** — all icon and splash changes go here.
2. **Splash plugin config** must be added to the `plugins` array, not the top-level `splash` key, to enable `fadeDuration` and dark variant support.
3. **Dark variant syntax** uses `expo-splash-screen` plugin object form:
   ```ts
   ["expo-splash-screen", {
     "image": "./assets/images/icon.png",
     "resizeMode": "contain",
     "backgroundColor": "#ff6b35",
     "dark": {
       "backgroundColor": "#0E0F11"
     },
     "fadeDuration": 400
   }]
   ```
4. **No new asset files required** unless user provides a separate Android foreground crop — default reuses `icon.png`.
5. **Verify `userInterfaceStyle: "automatic"`** remains set in `app.config.ts` so dark splash triggers correctly on dark-mode devices.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (N/A — no copy introduced)
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS (N/A — no typography introduced)
- [ ] Dimension 5 Spacing: PASS (N/A — no spacing introduced)
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-06

---

*Phase: 28-branding*
*UI contract generated: 2026-05-06 via ui-ux-pro-max*
