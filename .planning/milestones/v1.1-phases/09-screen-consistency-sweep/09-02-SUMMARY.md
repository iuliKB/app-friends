---
phase: 09-screen-consistency-sweep
plan: 02
subsystem: ui
tags: [react-native, design-tokens, theme, colors, spacing, typography, FAB, ScreenHeader]

# Dependency graph
requires:
  - phase: 09-01
    provides: shared FAB component and ScreenHeader component used by HomeScreen
  - phase: 07-design-tokens
    provides: COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII, SHADOWS token system
  - phase: 08-shared-components
    provides: FAB, ScreenHeader, EmptyState shared components

provides:
  - HomeScreen migrated to design tokens with FAB and ScreenHeader adoption
  - HomeFriendCard migrated to design tokens
  - EmojiTagPicker migrated to design tokens
  - SegmentedControl migrated to design tokens

affects: [10-future-screens, any future home domain changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "eslint-disable-next-line campfire/no-hardcoded-styles for genuinely unmapped values (paddingBottom:100, fontSize:18)"
    - "borderRadius:22 on circular emoji buttons not flagged by lint rule (SPACING_PROPS/FONT_SIZE_PROPS only)"
    - "FAB component handles insets internally — HomeScreen passes only icon, label, onPress, accessibilityLabel"

key-files:
  created: []
  modified:
    - src/screens/home/HomeScreen.tsx
    - src/components/home/HomeFriendCard.tsx
    - src/components/status/EmojiTagPicker.tsx
    - src/components/status/SegmentedControl.tsx

key-decisions:
  - "fontSize:18 (sectionLabel in HomeScreen) has no exact FONT_SIZE token — kept with eslint-disable + comment"
  - "paddingBottom:100 (scrollContent in HomeScreen) has no exact SPACING token — kept with eslint-disable + comment"
  - "borderRadius:22 in EmojiTagPicker not flagged by rule (borderRadius not in SPACING_PROPS) — no disable needed"
  - "THEME alias from Phase 8 removed; all references unified under direct COLORS import from @/theme"

patterns-established:
  - "HomeScreen: ScreenHeader wraps in paddingHorizontal:SPACING.lg container for proper alignment"
  - "FAB component fully handles positioning (insets, right, bottom) — callers do not set position styles"

requirements-completed: [SCRN-01, SCRN-02, SCRN-03, SCRN-05, SCRN-07]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 09 Plan 02: Home Domain Design Token Migration Summary

**HomeScreen, HomeFriendCard, EmojiTagPicker, and SegmentedControl migrated to @/theme tokens with FAB component and ScreenHeader adoption in HomeScreen.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T00:00:00Z
- **Completed:** 2026-03-25T00:05:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- HomeScreen replaces both `@/constants/colors` and `COLORS as THEME` alias with single direct `COLORS` import from `@/theme`
- HomeScreen inline FAB (TouchableOpacity) replaced with shared `<FAB>` component
- HomeScreen adds `<ScreenHeader title="Campfire" />` for consistent screen title treatment
- All 4 files pass ESLint `campfire/no-hardcoded-styles` with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate HomeScreen with FAB and ScreenHeader adoption** - `c8115c2` (feat)
2. **Task 2: Migrate HomeFriendCard, EmojiTagPicker, SegmentedControl** - `de5826f` (feat)

## Files Created/Modified
- `src/screens/home/HomeScreen.tsx` - Token-migrated home screen, inline FAB replaced with FAB component, ScreenHeader added
- `src/components/home/HomeFriendCard.tsx` - Token-migrated friend card (surface.card, RADII.lg, SPACING.lg, FONT_SIZE.sm)
- `src/components/status/EmojiTagPicker.tsx` - Token-migrated emoji picker (text.secondary, surface.card, SPACING tokens, FONT_SIZE.md/xxl)
- `src/components/status/SegmentedControl.tsx` - Token-migrated segmented control (surface.card, RADII.md/sm, FONT_SIZE.md, FONT_WEIGHT)

## Decisions Made
- `fontSize: 18` in sectionLabel (HomeScreen) has no exact FONT_SIZE token (lg=16, xl=20) — kept raw with eslint-disable comment
- `paddingBottom: 100` in scrollContent (HomeScreen) has no SPACING token match — kept raw with eslint-disable comment
- `borderRadius: 22` in EmojiTagPicker emoji buttons not flagged by lint rule (borderRadius is not in SPACING_PROPS) — no disable directive needed, kept with `// no exact token` comment

## Deviations from Plan

None - plan executed exactly as written. Unused eslint-disable directives were cleaned up proactively (Rule 3 prevention, not a deviation).

## Issues Encountered
- Initial write of HomeFriendCard included unnecessary `// eslint-disable-next-line` for `padding: 1` (exempt as value is not > 1) and EmojiTagPicker had unnecessary disable for `borderRadius: 22` (borderRadius not checked by rule). Cleaned up immediately after lint run confirmed they were flagging as "unused directive" warnings.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Home domain (HomeScreen + HomeFriendCard + EmojiTagPicker + SegmentedControl) fully token-migrated with zero lint violations
- HomeScreen now uses both shared FAB and ScreenHeader components — visual consistency with Plans screen established
- Ready for Phase 09-03 (remaining screens sweep if applicable)
- TypeScript compiles clean, no regressions

## Self-Check: PASSED

- src/screens/home/HomeScreen.tsx — FOUND
- src/components/home/HomeFriendCard.tsx — FOUND
- src/components/status/EmojiTagPicker.tsx — FOUND
- src/components/status/SegmentedControl.tsx — FOUND
- .planning/phases/09-screen-consistency-sweep/09-02-SUMMARY.md — FOUND
- Commit c8115c2 — FOUND
- Commit de5826f — FOUND

---
*Phase: 09-screen-consistency-sweep*
*Completed: 2026-03-25*
