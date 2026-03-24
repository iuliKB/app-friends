---
phase: 09-screen-consistency-sweep
plan: 03
subsystem: ui
tags: [react-native, design-tokens, eslint, plans-domain, FAB, ScreenHeader]

# Dependency graph
requires:
  - phase: 09-01
    provides: FAB component, ScreenHeader component, no-hardcoded-styles rule at error severity

provides:
  - 9 plans domain files fully migrated to @/theme design tokens (zero no-hardcoded-styles violations)
  - PlansListScreen uses shared FAB component and ScreenHeader
  - Plans domain is the reference view for token migration pattern

affects:
  - 09-04
  - 09-05
  - future dark mode work

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "eslint-disable-next-line campfire/no-hardcoded-styles with comment for genuinely unmapped values (paddingBottom:100, paddingVertical:14, gap:10, fontSize:18, marginRight:-6)"
    - "Shared FAB component replaces inline TouchableOpacity FAB — eliminates duplicate shadow/positioning logic"
    - "ScreenHeader replaces inline heading text — ensures consistent title typography across screens"

key-files:
  created: []
  modified:
    - src/screens/plans/PlansListScreen.tsx
    - src/screens/plans/PlanDashboardScreen.tsx
    - src/screens/plans/PlanCreateModal.tsx
    - src/components/plans/PlanCard.tsx
    - src/components/plans/AvatarStack.tsx
    - src/components/plans/IOUNotesField.tsx
    - src/components/plans/LinkDumpField.tsx
    - src/components/plans/MemberList.tsx
    - src/components/plans/RSVPButtons.tsx

key-decisions:
  - "eslint-disable-next-line campfire/no-hardcoded-styles used for 5 unmapped values: paddingBottom:100 (FAB clearance), paddingBottom:40 (modal scroll), paddingVertical:14 (invite banner), gap:10 (creator row), fontSize:18 (invite title), marginRight:-6 (avatar overlap)"
  - "AvatarStack.overflowBadge backgroundColor replaced hardcoded #2a2a2a with COLORS.surface.card (semantically correct)"
  - "PlanCard.card backgroundColor replaced hardcoded #2a2a2a with COLORS.surface.card"

patterns-established:
  - "Plans domain token migration: all 9 files are the canonical reference for how screens + components should look after migration"
  - "FAB usage pattern: <FAB icon={<Ionicons name='add' size={24} color={COLORS.surface.base} />} onPress={handler} accessibilityLabel='Create a new plan' />"

requirements-completed: [SCRN-01, SCRN-02, SCRN-03, SCRN-05, SCRN-07]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 09 Plan 03: Plans Domain Token Migration Summary

**9 plans domain files migrated from hardcoded values to @/theme tokens — PlansListScreen now uses shared FAB and ScreenHeader components, eliminating 140 no-hardcoded-styles violations**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-24T23:16:01Z
- **Completed:** 2026-03-24T23:21:01Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- PlansListScreen refactored: inline FAB replaced with `<FAB>` component, inline heading replaced with `<ScreenHeader>`, both legacy COLORS imports removed
- PlanDashboardScreen (40 violations) and PlanCreateModal (24 violations) fully migrated to semantic token paths
- All 6 plan components (PlanCard, AvatarStack, IOUNotesField, LinkDumpField, MemberList, RSVPButtons) migrated — 37 component-level violations cleared
- Zero TypeScript errors after migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate PlansListScreen, PlanDashboardScreen, PlanCreateModal** - `0f527a3` (feat)
2. **Task 2: Migrate plan components** - `d45ec26` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `src/screens/plans/PlansListScreen.tsx` - FAB + ScreenHeader adoption, full token migration (39 violations cleared)
- `src/screens/plans/PlanDashboardScreen.tsx` - Full token migration, 40 violations cleared
- `src/screens/plans/PlanCreateModal.tsx` - Full token migration, 24 violations cleared
- `src/components/plans/PlanCard.tsx` - Replaced hardcoded `#2a2a2a` with COLORS.surface.card, 11 violations cleared
- `src/components/plans/AvatarStack.tsx` - Replaced hardcoded `#2a2a2a` with COLORS.surface.card, 2 violations cleared
- `src/components/plans/IOUNotesField.tsx` - 5 violations cleared
- `src/components/plans/LinkDumpField.tsx` - 8 violations cleared (COLORS.interactive.accent for URL links)
- `src/components/plans/MemberList.tsx` - 9 violations cleared
- `src/components/plans/RSVPButtons.tsx` - 2 violations cleared

## Decisions Made

- Used `eslint-disable-next-line campfire/no-hardcoded-styles` for 6 genuinely unmapped values: `paddingBottom:100` (FAB clearance), `paddingBottom:40` (modal scroll clearance), `paddingVertical:14` (invite banner — between md/lg), `gap:10` (creator row — between sm/md), `fontSize:18` (invite title — between lg/xl), `marginRight:-6` (avatar overlap — negative, no token)
- `#2a2a2a` in PlanCard and AvatarStack mapped to `COLORS.surface.card` (semantically correct — they are card-surface elements)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans domain fully migrated; serves as the canonical reference view for remaining domains
- Ready to continue with 09-04 (Home, Auth, Friends screens) and 09-05 (Chat domain)
- No blockers

## Self-Check: PASSED

All files present, both task commits verified (0f527a3, d45ec26).

---
*Phase: 09-screen-consistency-sweep*
*Completed: 2026-03-24*
