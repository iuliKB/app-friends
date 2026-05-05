# Phase 28: Branding - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace every Expo placeholder asset with final Campfire branded identity — the app icon visible on the OS home screen and the splash screen shown on launch. Covers BRAND-01, BRAND-02, and BRAND-03 only. No new screens, no new data models, no runtime UI changes.

</domain>

<decisions>
## Implementation Decisions

### App Icon (BRAND-01)
- **D-01:** User will provide the final icon as a **1024×1024 PNG with a solid background baked in**, placed at `assets/images/icon.png` before planning. The plan should assume the file is present and focus on wiring it up correctly.
- **D-02:** iOS icon: use the single PNG at `assets/images/icon.png` (already referenced in `app.config.ts`). No transparency required.
- **D-03:** Android adaptive icon: keep the **existing `#ff6b35` orange `backgroundColor`** and update `foregroundImage` to use the same icon PNG (or a transparent crop if provided separately — default to reusing the same file with background handled by the config color).

### Splash Screen (BRAND-02)
- **D-04:** Splash image: **reuse `assets/images/icon.png`** — no separate splash asset needed. Point `splash.image` at the same file as the icon.
- **D-05:** Splash resize mode: **`contain`** — icon centered on the colored background, no cropping.
- **D-06:** Fade transition: **~400ms** — configure via `expo-splash-screen` plugin in `app.config.ts`. Standard, polished, not slow.
- **D-07:** Light mode splash background: keep existing **`#ff6b35`** orange.

### Dark Mode Splash (BRAND-03)
- **D-08:** Dark mode splash background: **`#0E0F11`** (the app's `colors.surface.base` dark value). No contrast shock when the app opens into its dark UI — icon glows warm against the dark background.
- **D-09:** Implementation: use `expo-splash-screen` plugin's `dark` variant support in `app.config.ts` to set separate `backgroundColor` values for light and dark OS mode.

### Claude's Discretion
- Android adaptive icon foreground crop (how much padding around the flame within the safe zone) — Claude can follow Google Material adaptive icon guidelines (66% safe zone).
- Exact `fadeDuration` value within the ~400ms target — use 400.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Expo Configuration
- `app.config.ts` — current icon, splash, and Android adaptive icon config; the file to update

### Asset Files (check existence before referencing in plan)
- `assets/images/icon.png` — final user-provided 1024×1024 PNG (replaces Expo default)
- `assets/images/android-icon-foreground.png` — Android adaptive foreground (may reuse icon.png)
- `assets/images/android-icon-background.png` — Android adaptive background (currently Expo default)

### Theme Reference
- `src/theme/colors.ts` — `surface.base: '#0E0F11'` is the canonical dark background value used for dark splash

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/images/icon.png` — already referenced in `app.config.ts` as both icon and notification icon; updating this file automatically applies everywhere
- `expo-splash-screen ~55.0.19` — already installed; no new dependencies needed

### Established Patterns
- `app.config.ts` is the single source of truth for asset paths and Expo plugin config — all changes go here
- `userInterfaceStyle: 'automatic'` already set — the app respects OS dark/light mode, making dark splash support consistent

### Integration Points
- `app.config.ts` splash section needs `image`, `resizeMode`, and dark variant `backgroundColor` added
- `expo-splash-screen` plugin config in the `plugins` array is where `fadeDuration` is set
- Android `adaptiveIcon.foregroundImage` may need updating if a separate foreground PNG is provided

</code_context>

<specifics>
## Specific Ideas

- User confirmed they will drop the icon PNG in place before planning — the plan does NOT need a "replace placeholder" manual task.
- The icon PNG has a solid background baked in (no transparency) — iOS icon is straightforward; Android adaptive icon uses the config `backgroundColor` for the background layer.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 28-branding*
*Context gathered: 2026-05-06*
