---
phase: 18-theme-foundation
plan: 02
subsystem: ui
tags: [theme, ThemeProvider, layout, app-config, userInterfaceStyle]

# Dependency graph
requires:
  - 18-01 (ThemeProvider + useTheme exported from @/theme)
provides:
  - ThemeProvider wired into root navigation tree in _layout.tsx
  - userInterfaceStyle: 'automatic' in app.config.ts (OS chrome tracks active theme)
affects:
  - 18-03 (Profile APPEARANCE section + ThemeSegmentedControl — ThemeProvider now in tree)
  - 19-theme-migration (all screen migrations can now call useTheme())

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ThemeProvider placed inside GestureHandlerRootView but above OfflineBanner and Stack
    - Splash early-return intentionally excluded from ThemeProvider (renders with static COLORS)

key-files:
  created: []
  modified:
    - src/app/_layout.tsx
    - app.config.ts

key-decisions:
  - "ThemeProvider is inside GestureHandlerRootView (not outside) — GestureHandlerRootView remains outermost"
  - "Splash early-return (if !ready || !fontsLoaded) left unwrapped — renders before context is relevant"
  - "GestureHandlerRootView style prop still uses static COLORS.surface.base — not migrated in Phase 18"

# Metrics
duration: 3min
completed: 2026-04-28
---

# Phase 18 Plan 02: ThemeProvider Wired into Root Layout + userInterfaceStyle Automatic

**ThemeProvider wraps the navigation tree in _layout.tsx (inside GestureHandlerRootView) and app.config.ts updated to userInterfaceStyle: 'automatic' so OS chrome tracks the active theme**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-28T18:16:37Z
- **Completed:** 2026-04-28T18:20:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `ThemeProvider` to the `@/theme` import in `src/app/_layout.tsx`
- Wrapped `<OfflineBanner />` and `<Stack>` inside `<ThemeProvider>` within `GestureHandlerRootView` in the main authenticated return block
- The splash early-return (`if (!ready || !fontsLoaded)`) remains unwrapped — it renders with static `COLORS` directly, before context is relevant
- Changed `userInterfaceStyle` from `'dark'` to `'automatic'` in `app.config.ts` — iOS status bar and Android system chrome will now track the active theme on next build

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap navigation tree with ThemeProvider in _layout.tsx** - `b37627a` (feat)
2. **Task 2: Set userInterfaceStyle to automatic in app.config.ts** - `257a81d` (feat)

## Files Modified

- `src/app/_layout.tsx` — ThemeProvider imported and wraps OfflineBanner + Stack inside GestureHandlerRootView
- `app.config.ts` — userInterfaceStyle changed from 'dark' to 'automatic'

## Decisions Made

- ThemeProvider is placed INSIDE `GestureHandlerRootView`, not outside — GestureHandlerRootView remains the outermost element per RESEARCH.md anti-pattern guidance
- Splash early-return intentionally excluded from ThemeProvider — that path renders with static COLORS before context initialization is relevant
- `GestureHandlerRootView` style prop continues to use static `COLORS.surface.base` — the layout file is not migrated in Phase 18 (D-09 compat shim)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `src/app/_layout.tsx` contains `ThemeProvider` in import and JSX — confirmed via grep
- `app.config.ts` contains `userInterfaceStyle: 'automatic'` — confirmed via grep
- Commit `b37627a` exists in git log
- Commit `257a81d` exists in git log
- No new TypeScript errors (pre-existing errors in profile.tsx, friends/[id].tsx, SendBar.tsx unchanged)

## Next Phase Readiness

- `useTheme()` is now callable from any screen component in the navigation hierarchy
- ThemeProvider context available to all children of the root Stack (all tabs, modals, auth screens)
- Plan 18-03 can proceed: Profile APPEARANCE section + ThemeSegmentedControl will have full context access

---
*Phase: 18-theme-foundation*
*Completed: 2026-04-28*
