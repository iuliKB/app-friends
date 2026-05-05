---
phase: 28-branding
plan: 01
subsystem: ui
tags: [expo, splash-screen, branding, app-icon, expo-splash-screen]

requires: []

provides:
  - expo-splash-screen plugin config with branded image, contain resize, light/dark backgrounds
  - Android adaptiveIcon updated to use icon.png (no separate foreground PNG)
  - SplashScreen.setOptions 400ms fade wired at module scope in _layout.tsx

affects: [eas-build, ios-build, android-build]

tech-stack:
  added: []
  patterns:
    - "expo-splash-screen plugin config as single surface for image/resizeMode/backgroundColor/dark variant"
    - "SplashScreen.setOptions at module scope (above preventAutoHideAsync) for fade animation"

key-files:
  created: []
  modified:
    - app.config.ts
    - src/app/_layout.tsx

key-decisions:
  - "fadeDuration is not a valid expo-splash-screen SDK 55 plugin key — fade configured via SplashScreen.setOptions({ duration: 400, fade: true }) in _layout.tsx"
  - "Top-level splash key retained as legacy fallback; plugin entry is the active splash config surface"
  - "Android adaptiveIcon reuses icon.png as foreground (D-03); backgroundColor #ff6b35 provides background layer"

patterns-established:
  - "Pattern 1: expo-splash-screen plugin config in plugins array owns image/resizeMode/backgroundColor/dark"
  - "Pattern 2: SplashScreen.setOptions called at module scope before preventAutoHideAsync for fade"

requirements-completed: [BRAND-01, BRAND-02, BRAND-03]

duration: 10min
completed: 2026-05-06
---

# Phase 28 Plan 01: Branding Summary

**expo-splash-screen plugin with icon.png, contain resize, #ff6b35 light and #0E0F11 dark backgrounds, plus 400ms fade via SplashScreen.setOptions in _layout.tsx**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-06T00:00:00Z
- **Completed:** 2026-05-06
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Android adaptiveIcon.foregroundImage updated from `android-icon-foreground.png` to `icon.png`
- expo-splash-screen plugin entry added to plugins array with branded image, `contain` resize mode, `#ff6b35` light background, and `#0E0F11` dark variant
- SplashScreen.setOptions({ duration: 400, fade: true }) inserted at module scope in _layout.tsx before preventAutoHideAsync, enabling 400ms iOS fade on splash dismiss

## Task Commits

1. **Task 1: Update app.config.ts — icon wiring + splash plugin + dark variant** - `7dcf530` (feat)
2. **Task 2: Add SplashScreen.setOptions to _layout.tsx — 400ms fade** - `2bbcee1` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `app.config.ts` - Android adaptiveIcon foreground updated to icon.png; expo-splash-screen plugin entry added with image/resizeMode/backgroundColor/dark variant; top-level splash key retained as legacy fallback
- `src/app/_layout.tsx` - SplashScreen.setOptions({ duration: 400, fade: true }) inserted at module scope (line 32) immediately above existing preventAutoHideAsync() call

## Decisions Made

- `fadeDuration` is NOT a valid expo-splash-screen SDK 55 plugin key (verified against installed plugin source). Fade is configured via `SplashScreen.setOptions` in `_layout.tsx` instead — this is the correct API for SDK 55.
- Top-level `splash: { backgroundColor: '#ff6b35' }` retained as a legacy fallback per RESEARCH.md Pitfall 3 / Pattern 1.
- Android adaptiveIcon reuses `icon.png` for the foreground layer per D-03; the `#ff6b35` config backgroundColor provides the background layer (user's icon has a solid baked-in background, so the adaptive icon will show the baked color over the config background — documented risk in RESEARCH.md Open Question 1).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Verification Commands Run

```
grep -n "foregroundImage" app.config.ts
  → 25: foregroundImage: './assets/images/icon.png'  ✓

grep -n "expo-splash-screen" app.config.ts
  → 56: 'expo-splash-screen'  ✓

grep -n "resizeMode" app.config.ts
  → 59: resizeMode: 'contain'  ✓

grep -n "0E0F11" app.config.ts
  → 62: backgroundColor: '#0E0F11'  ✓

grep -c "ff6b35" app.config.ts
  → 4  ✓ (splash + plugin + android + notifications)

grep "fadeDuration" app.config.ts
  → (no output, exit 1)  ✓

grep -n "userInterfaceStyle" app.config.ts
  → 11: userInterfaceStyle: 'automatic'  ✓

grep -n "setOptions\|preventAutoHideAsync" src/app/_layout.tsx
  → 32: SplashScreen.setOptions({
  → 36: SplashScreen.preventAutoHideAsync();  ✓ (correct order)

grep -c "import \* as SplashScreen" src/app/_layout.tsx
  → 1  ✓ (no duplicate import)
```

## Build/Simulator Verification

Deferred — EAS real-device verification requires Apple Developer account (same pattern as v1.3 hardware gate, per STATE.md blocker note). Dark/light splash variants and the branded icon on the OS home screen require a native build (expo run:ios or EAS build); Metro restart alone will NOT apply splash changes.

## User Setup Required

None — no external service configuration required. The user must run a native build (expo prebuild + expo run:ios, or EAS build) to see the branding changes take effect.

## Next Phase Readiness

Phase 28 (Branding) is the final phase of v1.7 Polish & Launch Ready. All three requirements (BRAND-01, BRAND-02, BRAND-03) are satisfied at the config level. Full verification awaits Apple Dev account acquisition and EAS build.

---
*Phase: 28-branding*
*Completed: 2026-05-06*
