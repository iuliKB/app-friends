# Phase 18: Theme Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 18-theme-foundation
**Areas discussed:** Light palette colors, Default theme on first install, Theme picker UI in Profile, Compat shim architecture

---

## Light palette colors

| Option | Description | Selected |
|--------|-------------|----------|
| Clean white / near-white | Base #FAFAFA, card #FFFFFF — standard iOS light feel, high contrast | ✓ |
| Warm cream / off-white | Base #FFF9F0 — softer, warmer tone | |
| You decide | Claude picks values | |

**User's choice:** Clean white / near-white

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep #B9FF3B (neon green) | Brand consistency across both modes | ✓ |
| Shift to darker green | e.g. #5CB800 — better contrast ratio on white | |
| You decide | Claude picks accent | |

**User's choice:** Keep #B9FF3B

**Notes:** ui-ux-pro-max confirmed Vibrant & Block-based style match. Constraint noted: #B9FF3B must be used as fill/background only in light mode (never as text on white — contrast ratio is 1.3:1). Status and destructive colors shifted darker for WCAG AA compliance.

---

## Default theme on first install

| Option | Description | Selected |
|--------|-------------|----------|
| System (follow the OS) | Reads iOS/Android system appearance synchronously — zero startup flash | ✓ |
| Dark (current behavior) | New installs default to dark, ignores OS preference | |

**User's choice:** System

**Notes:** Satisfies THEME-03 (no flash) because `useColorScheme()` is synchronous at launch.

---

## Theme picker UI in Profile

| Option | Description | Selected |
|--------|-------------|----------|
| Custom segmented control (3 buttons) | Light \| Dark \| System — 44px height, 8px gaps, accent highlight | ✓ |
| Tappable row with chevron | Opens bottom sheet, extra tap | |
| You decide | Claude decides | |

**User's choice:** Custom segmented control

---

| Option | Description | Selected |
|--------|-------------|----------|
| New APPEARANCE section, above NOTIFICATIONS | Mirrors iOS Settings conventions | ✓ |
| Inside NOTIFICATIONS section | Simpler, no new header | |
| You decide | Claude places it | |

**User's choice:** New APPEARANCE section above NOTIFICATIONS

---

## Compat shim architecture

| Option | Description | Selected |
|--------|-------------|----------|
| COLORS stays as static dark palette | Non-migrated screens always dark, zero risk | ✓ |
| COLORS becomes a live proxy | Auto-themes without code changes but StyleSheet.create caches at import time | |

**User's choice:** COLORS stays as static dark palette

**Notes:** StyleSheet.create() caches values at module evaluation time — a live proxy would not re-render existing screens anyway, so static is the correct and safe approach.

---

## Claude's Discretion

- ThemeContext internal implementation (async hydration strategy)
- TypeScript union type shape for theme preference
- File structure (one ThemeContext.tsx vs split files)
- AsyncStorage loading null-window handling

## Deferred Ideas

None
