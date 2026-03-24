---
phase: 04-plans
plan: 01
subsystem: ui
tags: [react-native, expo-router, supabase, zustand, datetimepicker, plans]

# Dependency graph
requires:
  - phase: 03-home-screen
    provides: HomeScreen, HomeFriendCard, FAB, useHomeStore Zustand pattern
  - phase: 02-friends-status
    provides: useFriends hook, FriendWithStatus type, StatusPill component
  - phase: 01-foundation-auth
    provides: Supabase client, useAuthStore, schema with plans/plan_members tables

provides:
  - Plan, PlanMember, PlanWithMembers types in src/types/plans.ts
  - usePlansStore Zustand cache store
  - usePlans hook with fetchPlans and createPlan
  - usePlanDetail hook with updateRsvp, updatePlanDetails, deletePlan
  - useInvitationCount hook for tab badge
  - PlanCreateModal full-screen creation form
  - /plan-create Expo Router modal route
  - DELETE RLS policy migration for plans table

affects:
  - 04-02: PlanListScreen, PlanCard, PlanDashboardScreen all use types/hooks from this plan
  - 04-03: PlanDashboardScreen uses usePlanDetail

# Tech tracking
tech-stack:
  added:
    - "@react-native-community/datetimepicker — native datetime picker for iOS/Android"
  patterns:
    - "Two-query plan fetch: plan_members → plan IDs → plans + members with profiles join"
    - "useFocusEffect for badge counts (same as usePendingRequestsCount)"
    - "Zustand plans cache mirrors useHomeStore setPlans pattern"
    - "createPlan: insert plan row then bulk-insert plan_members in one call"

key-files:
  created:
    - src/types/plans.ts
    - src/stores/usePlansStore.ts
    - src/hooks/usePlans.ts
    - src/hooks/usePlanDetail.ts
    - src/hooks/useInvitationCount.ts
    - src/screens/plans/PlanCreateModal.tsx
    - src/app/plan-create.tsx
    - supabase/migrations/0002_plans_delete_policy.sql
  modified:
    - src/app/_layout.tsx
    - src/screens/home/HomeScreen.tsx
    - app.config.ts

key-decisions:
  - "DateTimePicker plugin added to app.config.ts plugins array — expo install requires this for native module config"
  - "usePlans uses useFocusEffect to refetch on tab focus, matching usePendingRequestsCount pattern"
  - "PlanCreateModal fetches friends via useFriends().fetchFriends() on mount and pre-checks free friends"
  - "router.back() + router.push(/plans/planId) on create success — back dismisses modal before pushing dashboard"

patterns-established:
  - "Plan creation: insert plan → insert plan_members (creator as going + invitees as invited)"
  - "Invitation count badge: plan_members WHERE rsvp = invited with useFocusEffect"
  - "Modal time picker: inline on iOS (spinner), dialog on Android — toggle via state"

requirements-completed: [PLAN-01, PLAN-02]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 4 Plan 01: Quick Plan Creation Foundation Summary

**Plan types, Zustand store, data hooks (usePlans, usePlanDetail, useInvitationCount), DELETE migration, and full-screen Quick Plan modal accessible from Home FAB with smart title pre-fill, native DateTimePicker, and free-friend pre-selection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T17:19:45Z
- **Completed:** 2026-03-18T17:24:08Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Complete data layer: Plan/PlanMember/PlanWithMembers types, usePlansStore Zustand cache, usePlans (list + create), usePlanDetail (RSVP + edit + delete), useInvitationCount badge
- Full-screen Quick Plan creation modal with smart title pre-fill ("Tonight"/"Tomorrow"), native DateTimePicker defaulting to next round hour, friend selector with free friends pre-checked
- Home FAB now opens /plan-create modal instead of navigating to Plans tab

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, store, hooks, migration, DateTimePicker** - `5a4aa8b` (feat)
2. **Task 2: Quick Plan creation modal and Home FAB update** - `d2fee2d` (feat)

## Files Created/Modified
- `src/types/plans.ts` - Plan, PlanMember, PlanWithMembers interfaces
- `src/stores/usePlansStore.ts` - Zustand plans cache with setPlans action
- `src/hooks/usePlans.ts` - fetchPlans (two-query), createPlan, useFocusEffect refetch
- `src/hooks/usePlanDetail.ts` - refetch, updateRsvp, updatePlanDetails, deletePlan
- `src/hooks/useInvitationCount.ts` - invited RSVP count with useFocusEffect
- `src/screens/plans/PlanCreateModal.tsx` - full-screen modal form (ScrollView + FlatList friend selector)
- `src/app/plan-create.tsx` - Expo Router modal route wrapping PlanCreateModal
- `src/app/_layout.tsx` - plan-create registered as presentation:modal in Stack.Protected block
- `src/screens/home/HomeScreen.tsx` - FAB onPress changed to router.push('/plan-create')
- `supabase/migrations/0002_plans_delete_policy.sql` - plans_delete_creator DELETE RLS policy
- `app.config.ts` - @react-native-community/datetimepicker added to plugins array

## Decisions Made
- DateTimePicker plugin added to app.config.ts — required by expo install for native module configuration
- usePlans uses useFocusEffect matching usePendingRequestsCount pattern for badge-style refetch
- PlanCreateModal fetches friends on mount and pre-checks only those with status === 'free'
- On create success: router.back() dismisses modal first, then router.push to dashboard route

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added @react-native-community/datetimepicker plugin to app.config.ts**
- **Found during:** Task 1 (DateTimePicker install)
- **Issue:** expo install warned that the plugin must be added to app.config.ts plugins array for native build support
- **Fix:** Added '@react-native-community/datetimepicker' to plugins array in app.config.ts
- **Files modified:** app.config.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 5a4aa8b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for native DateTimePicker functionality on iOS/Android. No scope creep.

## Issues Encountered
None beyond the app.config.ts plugin registration above.

## User Setup Required
None - no external service configuration required beyond what was already in place.

## Next Phase Readiness
- All plan data types and hooks ready for Plan 02 (PlanListScreen, PlanCard, PlanDashboardScreen)
- usePlanDetail hook ready for Plan 03 (PlanDashboard with RSVP, edit, delete)
- useInvitationCount ready to wire into Plans tab badge in Plan 02
- DELETE RLS policy migration file ready to apply to Supabase

---
*Phase: 04-plans*
*Completed: 2026-03-18*
