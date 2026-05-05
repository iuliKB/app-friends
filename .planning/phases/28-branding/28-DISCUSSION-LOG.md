# Phase 28: Branding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 28-branding
**Areas discussed:** Icon visual design, Splash screen content, Dark mode splash treatment, Asset creation approach

---

## Icon Visual Design

| Option | Description | Selected |
|--------|-------------|----------|
| Flame / campfire motif | Stylized flame or campfire — communicates app name, works with #ff6b35 | |
| Lettermark "C" | Bold stylized C on colored background | |
| Abstract geometric | Abstract shape on orange palette | |
| I'll provide the asset | User has a design ready — just wire it into app.config.ts | ✓ |

**User's choice:** User will provide the asset

---

## Icon Format

| Option | Description | Selected |
|--------|-------------|----------|
| 1024×1024 PNG | Drop at assets/images/icon.png — already pointed to by app.config.ts | ✓ |
| SVG source file | Provide SVG, generate PNGs via Node script | |

**User's choice:** 1024×1024 PNG

---

## Icon Background

| Option | Description | Selected |
|--------|-------------|----------|
| Solid background baked in | iOS requires opaque icon; Android adaptive uses config background color | ✓ |
| Transparent foreground + separate background | Two files — more flexible | |

**User's choice:** Solid background baked in (single PNG)

---

## Splash Screen Content

| Option | Description | Selected |
|--------|-------------|----------|
| Centered icon/logo mark only | Reuse app icon centered on background — standard pattern | ✓ |
| Icon + wordmark "Campfire" | Logo + text — more onboarding-friendly but adds complexity | |
| Just background color | Pure color, no image — current behavior | |

**User's choice:** Centered icon/logo mark only

---

## Splash Image Source

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse the app icon PNG | Point splash.image at assets/images/icon.png — no extra asset | ✓ |
| Provide a separate splash image | Dedicated splash PNG (1284×2778 for iPhone max) | |

**User's choice:** Reuse the app icon PNG

---

## Dark Mode Splash Background

| Option | Description | Selected |
|--------|-------------|----------|
| Deep charcoal #0E0F11 | Matches app dark surface.base — no contrast shock on launch | ✓ |
| Keep #ff6b35 orange | Same both modes — simpler but jarring in dark mode | |
| Dark orange #cc4a1a | Darker brand orange — compromise | |

**User's choice:** #0E0F11 (deep charcoal)

---

## Fade Transition Duration

| Option | Description | Selected |
|--------|-------------|----------|
| Standard ~400ms fade | expo-splash-screen fadeDuration 400 — smooth, industry standard | ✓ |
| Longer ~800ms fade | Slower, more deliberate | |
| Claude's discretion | Sensible default | |

**User's choice:** Standard ~400ms fade

---

## Claude's Discretion

- Android adaptive icon safe-zone padding (follow Google Material 66% safe zone guideline)
- Exact fadeDuration value (400ms)

## Deferred Ideas

None.
