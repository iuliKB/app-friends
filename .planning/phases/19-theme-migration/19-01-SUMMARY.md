---
phase: 19-theme-migration
plan: 01
subsystem: ui
tags: [react-native, theme, useTheme, StyleSheet, useMemo, colors]

requires:
  - phase: 18-theme-foundation
    provides: ThemeProvider, useTheme hook, DARK/LIGHT color palettes, ThemeContext

provides:
  - All 30 shared/status/friends/auth/notifications components read colors from useTheme()
  - Zero COLORS. occurrences in src/components/common/, status/, friends/, auth/, notifications/
  - LoadingIndicator nullable-default pattern (color ?? colors.text.secondary)
  - ThemeSegmentedControl retains hardcoded '#B9FF3B'/'#0E0F11' per D-07

affects:
  - 19-02-screens-migration (screens import these components; migrating them first ensures correct light/dark colors immediately)
  - 19-03-cleanup (compat shim removal depends on all consumers migrated)

tech-stack:
  added: []
  patterns:
    - "useTheme() hook call as first line in component body: const { colors } = useTheme()"
    - "StyleSheet.create wrapped in useMemo([colors]) for all color-dependent styles"
    - "Nullable default pattern for optional color props: const resolvedColor = color ?? colors.text.secondary"
    - "Module-level COLORS constant arrays moved inside component body when they reference colors.*"

key-files:
  created: []
  modified:
    - src/components/common/AvatarCircle.tsx
    - src/components/common/BirthdayPicker.tsx
    - src/components/common/CustomTabBar.tsx
    - src/components/common/EmptyState.tsx
    - src/components/common/ErrorDisplay.tsx
    - src/components/common/FAB.tsx
    - src/components/common/FormField.tsx
    - src/components/common/LoadingIndicator.tsx
    - src/components/common/OfflineBanner.tsx
    - src/components/common/PrimaryButton.tsx
    - src/components/common/ScreenHeader.tsx
    - src/components/common/SectionHeader.tsx
    - src/components/common/ThemeSegmentedControl.tsx
    - src/components/status/EmojiTagPicker.tsx
    - src/components/status/MoodPicker.tsx
    - src/components/status/OwnStatusCard.tsx
    - src/components/status/OwnStatusPill.tsx
    - src/components/status/SegmentedControl.tsx
    - src/components/status/StatusPickerSheet.tsx
    - src/components/friends/FriendActionSheet.tsx
    - src/components/friends/FriendCard.tsx
    - src/components/friends/QRCodeDisplay.tsx
    - src/components/friends/QRScanView.tsx
    - src/components/friends/RequestCard.tsx
    - src/components/friends/SearchResultCard.tsx
    - src/components/friends/StatusPill.tsx
    - src/components/auth/AuthTabSwitcher.tsx
    - src/components/auth/OAuthButton.tsx
    - src/components/auth/UsernameField.tsx
    - src/components/notifications/PrePromptModal.tsx

key-decisions:
  - "Module-level constant arrays referencing COLORS (MOOD_ROWS, STATUS_DOT_COLOR, DOT_COLOR, SEGMENTS) moved inside component body and wrapped in useMemo([colors]) to maintain reactivity on theme changes"
  - "LoadingIndicator: removed COLORS default from prop signature, resolved inside body with color ?? colors.text.secondary per Pattern 4"
  - "ThemeSegmentedControl: '#B9FF3B' and '#0E0F11' hardcoded literals preserved per D-07; only COLORS.surface.card and COLORS.text.secondary replaced with colors.* equivalents"
  - "CustomTabBar: added noUncheckedIndexedAccess guards for state.routes[state.index] and TAB_CONFIG[route.name] — pre-existing issues surfaced by migration"

patterns-established:
  - "Pattern 4 (LoadingIndicator): remove COLORS from default parameter value; call useTheme() first; resolve inside body: const resolvedColor = prop ?? colors.fallback"
  - "Pattern 6 (ThemeSegmentedControl): partial migration preserving intentionally hardcoded literals"

requirements-completed:
  - THEME-04

duration: 20min
completed: 2026-04-28
---

# Phase 19 Plan 01: Theme Migration — Shared Components Summary

**30 shared components migrated from static COLORS import to useTheme() hook with useMemo([colors])-wrapped StyleSheets, establishing the themed component foundation for light/dark mode**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-28T20:24:00Z
- **Completed:** 2026-04-28T20:44:57Z
- **Tasks:** 2
- **Files modified:** 30

## Accomplishments

- All 13 src/components/common/ files migrated: AvatarCircle, BirthdayPicker, CustomTabBar, EmptyState, ErrorDisplay, FAB, FormField, LoadingIndicator, OfflineBanner, PrimaryButton, ScreenHeader, SectionHeader, ThemeSegmentedControl
- All 17 status/friends/auth/notifications files migrated: EmojiTagPicker, MoodPicker, OwnStatusCard, OwnStatusPill, SegmentedControl, StatusPickerSheet, FriendActionSheet, FriendCard, QRCodeDisplay, QRScanView, RequestCard, SearchResultCard, StatusPill, AuthTabSwitcher, OAuthButton, UsernameField, PrePromptModal
- Zero COLORS imports or COLORS. references remain in any of the 30 files
- tsc --noEmit passes with zero errors in all migrated files

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate 13 common components** - `ae95377` (feat)
2. **Fix: noUncheckedIndexedAccess errors in CustomTabBar** - `3af37b6` (fix)
3. **Task 2: Migrate 17 status/friends/auth/notifications components** - `264022d` (feat)

## Files Created/Modified

All 30 component files listed in frontmatter `key-files.modified`.

## Decisions Made

- Module-level constant arrays referencing colors (MOOD_ROWS in MoodPicker, STATUS_DOT_COLOR in OwnStatusCard, DOT_COLOR in OwnStatusPill, SEGMENTS in SegmentedControl) moved inside component body wrapped in useMemo([colors])
- LoadingIndicator nullable-default pattern: signature uses `color?: string` (no default), body resolves `const resolvedColor = color ?? colors.text.secondary`
- ThemeSegmentedControl `'#B9FF3B'` and `'#0E0F11'` literals preserved exactly per D-07

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed noUncheckedIndexedAccess TypeScript errors in CustomTabBar**
- **Found during:** Task 2 (tsc gate)
- **Issue:** `state.routes[state.index]` and `TAB_CONFIG[route.name]` are indexed accesses returning T | undefined under noUncheckedIndexedAccess. Original file had same patterns but was untracked by git, so errors only surfaced in tsc output after migration.
- **Fix:** Added optional chain `focusedRoute?.state` and early return `if (!config) return null` guard
- **Files modified:** src/components/common/CustomTabBar.tsx
- **Verification:** `tsc --noEmit` reports zero errors for CustomTabBar
- **Committed in:** 3af37b6

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Correctness fix, no scope creep. CustomTabBar behavior unchanged — guard only prevents crash on unknown route names.

## Issues Encountered

- Pre-existing tsc errors in src/hooks/usePoll.ts, src/hooks/usePushNotifications.ts, src/app/(tabs)/profile.tsx, src/app/friends/[id].tsx, src/components/chat/SendBar.tsx, src/components/home/RadarBubble.tsx, src/hooks/useChatRoom.ts — all unrelated to this plan's migration work. These are out-of-scope pre-existing issues.

## Known Stubs

None — all 30 files are fully migrated with live theme data.

## Next Phase Readiness

- Shared component layer is fully themed — any screen that renders these components now gets correct light/dark colors
- Plan 19-02 can begin migrating screen-level files
- The compat shim in src/theme/index.ts remains in place until Plan 19-03

---
*Phase: 19-theme-migration*
*Completed: 2026-04-28*
