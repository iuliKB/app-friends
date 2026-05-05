---
phase: 26-home-chat-polish
plan: "02"
subsystem: ui
tags: [react-native, animation, radar, heartbeat, pulse-ring, amber, test-infrastructure]

# Dependency graph
requires:
  - phase: 26-home-chat-polish
    provides: RadarBubble.tsx with existing PulseRing sub-component and heartbeatState logic
provides:
  - FADING_PULSE_COLOR = '#F59E0B' exported constant from RadarBubble.tsx
  - PulseRing variant prop (alive | fading) with independent animation config
  - FADING ring render condition heartbeatState === 'fading' in RadarBubble
  - React Native mock preload infrastructure (rn-mock-preload.js) for tsx unit tests
affects: [26-home-chat-polish, tests/unit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PulseRing variant pattern: parameterize animation config via variant prop rather than duplicate component"
    - "tsx unit test mock: NODE_OPTIONS --require preload redirects RN ecosystem imports to CJS stubs"
    - "eslint-disable-next-line campfire/no-hardcoded-styles for animation timing values with no exact token"

key-files:
  created:
    - tests/unit/rn-mock-preload.js
    - tests/unit/.rn-stub-module.js
    - .npmrc
  modified:
    - src/components/home/RadarBubble.tsx

key-decisions:
  - "FADING_PULSE_COLOR exported as module-level const (not inside component) so tests/unit/fadingPulse.test.ts can verify the hex value"
  - "variant prop approach chosen over separate FadingPulseRing component — avoids code duplication, single Animated.loop structure"
  - ".npmrc node-options approach enables bare npx tsx test commands without wrapper scripts"
  - "rn-mock-preload.js patches Module._resolveFilename to redirect react-native, expo-*, and @supabase to CJS stubs without affecting Metro bundler"

patterns-established:
  - "PulseRing variant: new animation variants should add a variant prop and derive config (duration, scaleTarget, delay) from it inline"
  - "tsx RN test mocking: component files requiring react-native can be tested via rn-mock-preload.js preload"

requirements-completed: [HOME-03]

# Metrics
duration: 90min
completed: 2026-05-05
---

# Phase 26 Plan 02: FADING Pulse Ring Summary

**RadarBubble PulseRing parameterized with alive/fading variant — amber (#F59E0B) ring at 2000ms cycle signals FADING heartbeat state visually**

## Performance

- **Duration:** ~90 min (including test infrastructure setup)
- **Started:** 2026-05-05T10:55:00Z
- **Completed:** 2026-05-05T14:30:00Z
- **Tasks:** 1
- **Files modified:** 4 (RadarBubble.tsx + 3 test infrastructure files)

## Accomplishments
- `FADING_PULSE_COLOR = '#F59E0B'` exported from `RadarBubble.tsx` with eslint-disable comment
- `PulseRing` parameterized with `variant?: 'alive' | 'fading'` — ALIVE ring behavior unchanged
- FADING ring uses slower 2000ms cycle, 800ms delay, scale 1.0→1.5 (languid feel vs ALIVE 1.2s/1.7x)
- FADING render condition `heartbeatState === 'fading'` mutually exclusive with ALIVE (`isAlive`)
- All 3 tests in `tests/unit/fadingPulse.test.ts` pass GREEN
- `animationTokens.test.ts` still passes (no regressions)
- Created tsx test infrastructure (rn-mock-preload.js) enabling component files with RN dependencies to be tested

## Task Commits

Each task was committed atomically:

1. **Task 1: Parameterize PulseRing with variant prop + FADING_PULSE_COLOR export** - `e869887` (feat)

**Plan metadata:** (docs commit will follow)

## Files Created/Modified
- `src/components/home/RadarBubble.tsx` - Added FADING_PULSE_COLOR export, variant prop on PulseRing, FADING render condition
- `tests/unit/rn-mock-preload.js` - Node.js --require preload that stubs react-native/expo-*/supabase for tsx unit tests
- `tests/unit/.rn-stub-module.js` - CJS stub module returned for all intercepted RN ecosystem imports
- `.npmrc` - Project-level `node-options=--require ./tests/unit/rn-mock-preload.js` enabling bare `npx tsx` test commands

## Decisions Made
- **variant prop over separate component:** Avoids code duplication — both rings share the same `Animated.loop` structure, only duration/delay/scaleTarget differ. A variant prop is 3 extra lines vs. ~50 for a separate component.
- **FADING_PULSE_COLOR as module-level export:** The test imports it directly. Had it been a `const` inside the component function, the test's `require()` approach couldn't verify it.
- **.npmrc `node-options` approach:** tsx v4/esbuild cannot parse React Native's Flow-typed `index.js`. The preload intercepts `Module._resolveFilename` before the file reaches esbuild, redirecting problematic modules to plain CJS stubs. The `.npmrc` approach makes this transparent to `npx tsx` without requiring a wrapper script. Metro bundler uses its own resolver and is unaffected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created tsx test infrastructure for React Native component testing**
- **Found during:** Task 1 (test verification)
- **Issue:** `npx tsx tests/unit/fadingPulse.test.ts` failed because tsx/esbuild cannot parse `react-native/index.js` (uses Flow type syntax `typeof * as`). The test's `require('../../src/components/home/RadarBubble')` silently set `FADING_PULSE_COLOR = undefined`, failing all 3 assertions.
- **Fix:** Created `tests/unit/rn-mock-preload.js` (Node.js `--require` preload that patches `Module._resolveFilename`), `tests/unit/.rn-stub-module.js` (minimal CJS stubs for RN/Expo/Supabase), and `.npmrc` with `node-options` to apply the preload for all `npx tsx` commands. Verified `.npmrc` node-options does not break `expo --version` or `expo lint`.
- **Files modified:** tests/unit/rn-mock-preload.js (new), tests/unit/.rn-stub-module.js (new), .npmrc (new)
- **Verification:** `npx tsx tests/unit/fadingPulse.test.ts` passes 3/3; `npx tsx tests/unit/animationTokens.test.ts` passes 10/10
- **Committed in:** e869887 (same task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test infrastructure gap required fixing — the mock preload is a necessary correctness fix for the test environment, not scope creep.

## Issues Encountered
- System `/tmp` disk filled during debugging iterations (npm cache cleaning freed ~4.6 GB)
- tsx/esbuild incompatibility with React Native's Flow syntax — resolved via `Module._resolveFilename` patching rather than tsx config (which doesn't support per-module transform skipping)

## Next Phase Readiness
- FADING ring is live — any future plans modifying RadarBubble or heartbeat states can rely on `FADING_PULSE_COLOR` being exported for import/testing
- The rn-mock-preload.js infrastructure is available for any future tsx unit tests that require component files with RN dependencies
- Plan 26-03 can proceed (next plan in phase)

---
*Phase: 26-home-chat-polish*
*Completed: 2026-05-05*

## Self-Check: PASSED
