---
phase: 11-navigation-restructure
plan: "01"
subsystem: ui
tags: [expo-router, tabs, ionicons, navigation, react-native]

# Dependency graph
requires: []
provides:
  - "Bottom nav order: Home | Squad | Explore | Chats | Profile"
  - "Plans tab renamed to Explore with compass icon (route segment unchanged)"
  - "Chat tab renamed to Chats with chatbubbles icon (directory unchanged)"
  - "Badges preserved: invitationCount on Explore, pendingCount on Squad"
affects: [12-playwright-tests, any phase using tab bar screenshots]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Expo Router: name prop = route identity, title = display label (change one without the other)"
    - "Tab reorder: move entire Tabs.Screen block to preserve badge co-location"

key-files:
  created: []
  modified:
    - src/app/(tabs)/_layout.tsx

key-decisions:
  - "Title-only rename approach: change title and icon only, do not rename files or directories — zero risk of breaking router.push call sites"
  - "plans.tsx stays as plans.tsx (route segment /plans unchanged); chat/ stays as chat/ (route segment /chat unchanged)"
  - "invitationCount badge moves with entire plans/Explore Tabs.Screen block to position 3"
  - "pendingCount badge moves with entire squad Tabs.Screen block to position 2"

patterns-established:
  - "Tab reorder pattern: move entire Tabs.Screen block (do not reconstruct options piecemeal) to avoid dropping badge props"

requirements-completed: [NAV-01, NAV-02, NAV-03, NAV-04]

# Metrics
duration: 1min
completed: 2026-04-04
---

# Phase 11 Plan 01: Tab Reorder and Rename Summary

**Bottom nav reordered to Home|Squad|Explore|Chats|Profile — Plans renamed to Explore (compass icon), Chat renamed to Chats (chatbubbles icon), route segments and all deep-route push calls unchanged.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-04T07:57:25Z
- **Completed:** 2026-04-04T07:58:13Z
- **Tasks:** 2 (1 code change + 1 read-and-verify)
- **Files modified:** 1

## Accomplishments

- Reordered five `Tabs.Screen` declarations: index → squad → plans → chat → profile
- Renamed Plans tab: title "Explore", icon `compass`/`compass-outline` (was calendar)
- Renamed Chat tab: title "Chats", icon `chatbubbles`/`chatbubbles-outline` (was chatbubble)
- Confirmed all 7 router.push call sites unchanged — `/plans/` and `/chat/` deep routes unaffected
- TypeScript compiles with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Reorder tabs and update titles and icons** - `92a6442` (feat)
2. **Task 2: Verify route references are unaffected** - no code changes (read-and-verify, NAV-04 confirmed)

## Files Created/Modified

- `src/app/(tabs)/_layout.tsx` — Reordered Tabs.Screen declarations; updated titles and icons for plans (Explore) and chat (Chats) screens

## Decisions Made

- Title-only rename (no file/directory renames) is the safest approach — zero impact on route segments and all 6 push call sites
- Moved entire Tabs.Screen blocks when reordering to ensure badge props travel with their screens

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tab bar now shows correct order and labels; ready for Phase 11 Plan 02 (Playwright test updates and snapshot regeneration)
- Known concern from STATE.md: Playwright tests are coupled to old tab labels (Plans, Chat) — these will fail until updated in the next plan

---
*Phase: 11-navigation-restructure*
*Completed: 2026-04-04*
