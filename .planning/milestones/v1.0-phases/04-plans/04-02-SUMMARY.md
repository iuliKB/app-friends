---
phase: 04-plans
plan: 02
subsystem: ui
tags: [react-native, expo-router, plans, rsvp, avatar-stack, flatlist]

# Dependency graph
requires:
  - phase: 04-01
    provides: Plan types, usePlans hook, usePlanDetail hook, useInvitationCount hook, plan-create modal

provides:
  - Plans list screen (FlatList of PlanCards with smart time, RSVP summary, AvatarStack)
  - AvatarStack component (overlapping avatars with overflow badge)
  - PlanCard component (plan list item with formatPlanTime utility)
  - PlansListScreen with empty/error states and FAB to open plan-create modal
  - Plans tab invitation badge (invitationCount from useInvitationCount)
  - Plan dashboard route /plans/[id]
  - PlanDashboardScreen with Details (view/edit) and Who's Going sections
  - RSVPButtons (Going/Maybe/Out with server confirmation and per-button loading)
  - MemberList grouped by RSVP with Creator badge and dimmed Out members
  - Delete plan flow (creator only, confirmation alert)

affects: [05-chat, 04-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - as never cast for forward-reference Expo Router paths (same pattern as qr-code in Phase 02)
    - formatPlanTime exported from PlanCard.tsx for reuse in PlanDashboardScreen
    - useNavigation.setOptions in useEffect to set header title + conditional trash button

key-files:
  created:
    - src/components/plans/AvatarStack.tsx
    - src/components/plans/PlanCard.tsx
    - src/components/plans/RSVPButtons.tsx
    - src/components/plans/MemberList.tsx
    - src/screens/plans/PlansListScreen.tsx
    - src/screens/plans/PlanDashboardScreen.tsx
    - src/app/plans/_layout.tsx
    - src/app/plans/[id].tsx
  modified:
    - src/app/(tabs)/plans.tsx
    - src/app/(tabs)/_layout.tsx
    - src/app/_layout.tsx

key-decisions:
  - "router.push as never cast used for /plans/[id] forward-reference (Expo Router type system)"
  - "formatPlanTime exported from PlanCard.tsx so PlanDashboardScreen can reuse it"
  - "useNavigation.setOptions in useEffect for setting plan title and conditional trash icon header"
  - "RSVPButtons track savingRsvp per-button (not globally) so only the pressed button shows ActivityIndicator"
  - "MemberList uses simple map+View (not FlatList) as plan member lists are small (<50 items)"

patterns-established:
  - "PlanCard.tsx: smart time label formatPlanTime handles past/minutes/hours/today/tomorrow/date"
  - "RSVPButtons: server confirmation pattern — await onRsvp(), update local state only on success"
  - "AvatarStack: zIndex stacking with marginLeft -8 per subsequent avatar"

requirements-completed: [PLAN-03, PLAN-04, PLAN-05, PLAN-06]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 4 Plan 02: Plans List and Dashboard Summary

**Plans list with PlanCard/AvatarStack FAB/badge, plus Plan Dashboard with Details edit mode, RSVP buttons, and grouped MemberList**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T17:27:38Z
- **Completed:** 2026-03-18T17:31:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Plans list screen replaces stub tab with FlatList of PlanCards showing title, smart time, location, RSVP summary, and avatar stacks
- Plans tab badge shows invitation count from useInvitationCount hook
- Plan dashboard accessible at /plans/[id] with Details section (view/edit toggle) and Who's Going section (RSVP + grouped members)
- Delete plan flow with confirmation alert visible only to plan creator

## Task Commits

1. **Task 1: Plans list screen with PlanCard, AvatarStack, FAB, and tab badge** - `ab8393e` (feat)
2. **Task 2: Plan dashboard route, RSVP buttons, member list, and edit mode** - `08df848` (feat)

## Files Created/Modified
- `src/components/plans/AvatarStack.tsx` - Overlapping avatar row with +N overflow badge
- `src/components/plans/PlanCard.tsx` - Plan list card with formatPlanTime utility (exported)
- `src/components/plans/RSVPButtons.tsx` - Going/Maybe/Out 3-button row with server confirmation
- `src/components/plans/MemberList.tsx` - Grouped member list by RSVP with Creator badge
- `src/screens/plans/PlansListScreen.tsx` - Plans list with FlatList, refresh, empty/error states, FAB
- `src/screens/plans/PlanDashboardScreen.tsx` - Dashboard with Details + Who's Going sections
- `src/app/plans/_layout.tsx` - Plans stack navigator layout
- `src/app/plans/[id].tsx` - Plan dashboard route
- `src/app/(tabs)/plans.tsx` - Replaced stub with PlansListScreen
- `src/app/(tabs)/_layout.tsx` - Added invitation badge on Plans tab
- `src/app/_layout.tsx` - Registered plans stack in root layout

## Decisions Made
- `router.push('/plans/${id}' as never)` — Expo Router type system doesn't know about forward-reference routes, using `as never` cast matches existing pattern (same as qr-code route in Phase 02)
- `formatPlanTime` exported from PlanCard.tsx so PlanDashboardScreen can import and reuse it without duplication
- `useNavigation.setOptions` called in `useEffect` with plan dependency to set header title and conditionally add trash icon for creators

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Expo Router TypeScript type error on `/plans/${id}` template literal — fixed with `as never` cast (Rule 3, blocking issue during Task 1 verification). Same pattern already established in Phase 02 for qr-code route.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans list and dashboard fully functional; Plan 03 can add Links, IOU Notes sections, and Open Chat button between Who's Going and bottom of dashboard
- Phase 05 chat routes can reference /plans/[id] for Open Chat navigation target

---
*Phase: 04-plans*
*Completed: 2026-03-18*
