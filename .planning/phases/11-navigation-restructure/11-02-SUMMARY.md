---
phase: 11-navigation-restructure
plan: 02
subsystem: testing
tags: [playwright, visual-regression, snapshots, navigation]

# Dependency graph
requires:
  - phase: 11-01
    provides: Renamed tab labels (Explore, Chats) and reordered tab bar (Home|Squad|Explore|Chats|Profile)
provides:
  - Updated Playwright locators matching new tab names (Explore, Chats)
  - Regenerated visual regression baselines for all 7 screens with new tab bar layout
  - Increased waitForTimeout on data-heavy screens for stable snapshot capture
affects: [future UI changes that touch the tab bar or any of the 7 screened views]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Increase waitForTimeout to 2000ms for screens with live network data to avoid baseline flakiness"

key-files:
  created:
    - tests/visual/design-system.spec.ts
    - tests/visual/design-system.spec.ts-snapshots/explore-screen-mobile-darwin.png
    - tests/visual/design-system.spec.ts-snapshots/chats-screen-mobile-darwin.png
    - tests/visual/design-system.spec.ts-snapshots/home-screen-mobile-darwin.png
    - tests/visual/design-system.spec.ts-snapshots/friends-screen-mobile-darwin.png
    - tests/visual/design-system.spec.ts-snapshots/profile-screen-mobile-darwin.png
    - tests/visual/design-system.spec.ts-snapshots/auth-login-mobile-darwin.png
    - tests/visual/design-system.spec.ts-snapshots/auth-signup-mobile-darwin.png
  modified: []

key-decisions:
  - "Increase waitForTimeout from 1000ms to 2000ms for data-heavy tab screens (Explore, Chats, Squad, Profile) to ensure network data loads before screenshot capture — eliminates loading-spinner baseline captures"
  - "Home screen also gets explicit 1000ms wait + networkidle before screenshot to prevent flakiness"

patterns-established:
  - "Pattern: Regenerate snapshots after any tab bar layout change (reorder or icon change stales all 7 baselines)"
  - "Pattern: Data screens need 2s+ wait before toHaveScreenshot to avoid capturing loading states as baselines"

requirements-completed: [NAV-01, NAV-02, NAV-03]

# Metrics
duration: 25min
completed: 2026-04-04
---

# Phase 11 Plan 02: Navigation Restructure — Playwright Test Update Summary

**Playwright visual regression tests updated for renamed tabs (Explore/Chats), all 7 baselines regenerated with new Home|Squad|Explore|Chats|Profile tab bar, suite passes 7/7**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-04T08:00:00Z
- **Completed:** 2026-04-04T08:25:00Z
- **Tasks:** 1 of 2 (Task 2 is human-verify checkpoint, not yet approved)
- **Files modified:** 8 (test spec + 7 snapshot PNGs)

## Accomplishments
- Updated `getByText("Plans")` to `getByText("Explore")` and `getByText("Chat")` to `getByText("Chats")` in Playwright spec
- Renamed test blocks from "plans screen"/"chat screen" to "explore screen"/"chats screen"
- Updated `toHaveScreenshot()` filenames to `explore-screen.png` and `chats-screen.png`
- Deleted orphaned `plans-screen-mobile-darwin.png` and `chat-screen-mobile-darwin.png` baselines
- Regenerated all 7 visual regression baselines showing new tab bar order and icons
- Added 2000ms wait to data-heavy screens to fix snapshot flakiness from loading states
- All 7 Playwright tests pass (7/7 green)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update locators, test names, and regenerate snapshots** - `8b71baf` (feat)

**Plan metadata:** (to be added after checkpoint)

## Files Created/Modified
- `tests/visual/design-system.spec.ts` - Updated locators (Explore, Chats), test names, screenshot filenames, increased timeouts
- `tests/visual/design-system.spec.ts-snapshots/explore-screen-mobile-darwin.png` - New baseline (replaces plans-screen)
- `tests/visual/design-system.spec.ts-snapshots/chats-screen-mobile-darwin.png` - New baseline (replaces chat-screen)
- `tests/visual/design-system.spec.ts-snapshots/home-screen-mobile-darwin.png` - Regenerated with new tab bar
- `tests/visual/design-system.spec.ts-snapshots/friends-screen-mobile-darwin.png` - Regenerated with new tab bar
- `tests/visual/design-system.spec.ts-snapshots/profile-screen-mobile-darwin.png` - Regenerated with new tab bar
- `tests/visual/design-system.spec.ts-snapshots/auth-login-mobile-darwin.png` - Regenerated
- `tests/visual/design-system.spec.ts-snapshots/auth-signup-mobile-darwin.png` - Regenerated

## Decisions Made
- Increased `waitForTimeout` from 1000ms to 2000ms on all data-heavy screens (Explore, Chats, Squad, Profile) — baseline captures were inconsistently catching loading spinners instead of loaded content
- Added explicit 1000ms wait + networkidle to home screen test (was missing any wait, causing flakiness)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Increased waitForTimeout to prevent loading-state baseline captures**
- **Found during:** Task 1 (snapshot regeneration and verification)
- **Issue:** 1000ms timeout insufficient — verification runs captured loading spinner while baselines captured loaded content, causing 93% pixel diff on chats screen and ~4% on others
- **Fix:** Increased waitForTimeout to 2000ms on Explore, Chats, Squad, Profile screens; added 1000ms wait to home screen before screenshot
- **Files modified:** tests/visual/design-system.spec.ts
- **Verification:** 7/7 tests passed consistently across update-snapshots then plain test runs
- **Committed in:** 8b71baf (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug - timing/flakiness)
**Impact on plan:** Fix necessary for test stability. No scope creep.

## Issues Encountered
- Snapshot flakiness on chats screen: baseline captured loading spinner in light mode (from previous --update-snapshots run), verification captured loaded dark mode chat list. Resolved by increasing timeouts and ensuring consistent timing across all test runs.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 2 is a human-verify checkpoint: visual confirmation of the navigation restructure on device is required
- After user approves, plan 11-02 is fully complete
- Tab bar correctly shows Home | Squad | Explore | Chats | Profile — confirmed in Playwright snapshots
- All automated tests green; manual smoke test (NAV-04) pending user verification

---
*Phase: 11-navigation-restructure*
*Completed: 2026-04-04*

## Self-Check: PASSED
