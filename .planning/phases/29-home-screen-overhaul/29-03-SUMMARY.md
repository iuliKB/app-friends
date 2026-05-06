---
phase: 29-home-screen-overhaul
plan: "03"
subsystem: ui
tags: [react-native, expo-router, home-screen, empty-state, onboarding]

# Dependency graph
requires:
  - phase: 29-01
    provides: RadarView, CardStackView, EventCard, useHomeScreen hook
  - phase: 29-02
    provides: HomeWidgetRow, RecentMemoriesSection, UpcomingEventsSection components
provides:
  - HomeScreen zero-friends EmptyState showing "Invite your crew" heading and "Invite friends" CTA routing to /friends/add
  - Complete removal of OnboardingHintSheet and all associated state/effects from HomeScreen
affects: [33-welcome-onboarding, any screens that reference OnboardingHintSheet]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/screens/home/HomeScreen.tsx

key-decisions:
  - "OnboardingHintSheet removed from HomeScreen only — it will be fully deleted when Phase 33 removes it entirely; no other screen references it"
  - "EmptyState CTA navigates to /friends/add (root-level route) not /(tabs)/squad — direct path to the Add Friend form per D-06/D-07"

patterns-established: []

requirements-completed: [HOME-07]

# Metrics
duration: 5min
completed: 2026-05-06
---

# Phase 29 Plan 03: Home Screen - Remove OnboardingHintSheet + Update EmptyState Summary

**Removed legacy OnboardingHintSheet (D-08) and its AsyncStorage state from HomeScreen; zero-friends EmptyState now shows emoji icon, "Invite your crew" heading, and "Invite friends" CTA routing to /friends/add**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-06T20:07:40Z
- **Completed:** 2026-05-06T20:09:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed `OnboardingHintSheet` import, JSX render, `onboardingVisible` state, `ONBOARDING_FLAG_KEY` constant, `handleOnboardingDismiss` function, and the `useEffect` that read AsyncStorage
- Removed `AsyncStorage` import (now unused)
- Removed `handleNavigateToSquad` function (replaced by inline arrow in EmptyState CTA)
- Updated zero-friends `EmptyState` props: `icon="👥"` (`iconType="emoji"`), `heading="Invite your crew"`, `body="Add friends to see who's free and make plans"`, `ctaLabel="Invite friends"`, `onCta` routes to `/friends/add`

## Task Commits

1. **Task 1: Remove OnboardingHintSheet + update EmptyState props (HOME-07, D-06/D-07/D-08)** - `97a9f3a` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `src/screens/home/HomeScreen.tsx` - Removed all onboarding code (7 sites), updated EmptyState with new copy and emoji icon routing to /friends/add

## Decisions Made
- EmptyState CTA navigates to `/friends/add` (root-level route) not `/(tabs)/squad` — directly opens the Add Friend form, matching D-06/D-07 spec
- `OnboardingHintSheet` component file itself is left untouched — only its usage in HomeScreen is removed here; Phase 33 will delete the component when the Welcome flow is built

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- HomeScreen now has zero onboarding-related code; EmptyState is ready for visual verification
- Plan 29-04 (EventCard + UpcomingEventsSection) can proceed independently
- OnboardingHintSheet component can be deleted in Phase 33 when Welcome flow is introduced

---
*Phase: 29-home-screen-overhaul*
*Completed: 2026-05-06*
