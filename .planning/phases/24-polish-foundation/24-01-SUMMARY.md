---
phase: 24-polish-foundation
plan: 01
subsystem: ui
tags: [animation, theme-tokens, react-native, easing, bezier]

# Dependency graph
requires: []
provides:
  - "ANIMATION const in src/theme/animation.ts with duration and easing presets"
  - "Barrel export of ANIMATION from src/theme/index.ts"
  - "10-case unit test suite for ANIMATION token shape"
affects: [25-auth-onboarding-errors, 26-home-chat-polish, 27-plans-squad-polish, 24-02-skeleton-pulse]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Animation token as plain const object with lazy easing functions — no react-native import in token file"
    - "Inline cubic bezier implementation for Node.js-testable easing presets"
    - "TDD with npx tsx runner: test first (RED), then implementation (GREEN)"

key-files:
  created:
    - src/theme/animation.ts
    - tests/unit/animationTokens.test.ts
  modified:
    - src/theme/index.ts

key-decisions:
  - "Easing implemented with inline bezier math instead of react-native import — makes animation.ts testable in Node.js/tsx runner without RN mock infrastructure"
  - "Lazy function pattern preserved (standard: () => fn, not standard: fn) — call-site evaluation avoids import-time side effects"
  - "spring config is plain data {damping:15, stiffness:120} — no Reanimated import needed in token file"

patterns-established:
  - "Animation token shape: ANIMATION.duration.{fast|normal|slow|verySlow} as numbers, ANIMATION.easing.{standard|decelerate|accelerate}() as lazy functions, ANIMATION.easing.spring as plain data"
  - "Theme token test pattern: npx tsx tests/unit/*.test.ts runner with node:assert/strict, no jest/vitest"

requirements-completed: [POLISH-02]

# Metrics
duration: 5min
completed: 2026-05-05
---

# Phase 24 Plan 01: Animation Tokens Summary

**ANIMATION theme token const with duration presets (200/300/700/1200ms) and node-testable inline-bezier easing functions, barrel-exported from src/theme**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-05T00:47:14Z
- **Completed:** 2026-05-05T00:52:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `src/theme/animation.ts` with ANIMATION const covering 4 duration values and 3 lazy easing presets + spring config
- Added `export { ANIMATION } from './animation'` to the theme barrel without disturbing any existing exports
- Wrote 10-case unit test file that passes with `npx tsx tests/unit/animationTokens.test.ts` (exits 0)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing animationTokens.test.ts** - `44ea1e9` (test)
2. **Task 1 GREEN: Create animation.ts + update index.ts** - `a84ec2c` (feat)

_Task 2 (write test file) was completed as part of the TDD RED phase in Task 1._

## Files Created/Modified

- `src/theme/animation.ts` — ANIMATION const with duration and easing presets; inline bezier math; no react-native import
- `src/theme/index.ts` — One-line addition: `export { ANIMATION } from './animation'`
- `tests/unit/animationTokens.test.ts` — 10 assertions for ANIMATION shape, duration values, easing types, spring config

## Decisions Made

- Used inline cubic-bezier math instead of `import { Easing } from 'react-native'` to make animation.ts testable in Node.js/tsx. React Native's `index.js` uses `import typeof` (Flow syntax) which esbuild/tsx cannot parse, making the test runner fail with a TransformError. The inline implementation is mathematically equivalent — `Easing.ease = bezier(0.42, 0, 1.0, 1.0)` — and the lazy easing functions return the same `(t: number) => number` type that `Animated.timing`'s `easing` prop accepts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced `import { Easing } from 'react-native'` with inline bezier math**
- **Found during:** Task 1 GREEN (running `npx tsx tests/unit/animationTokens.test.ts`)
- **Issue:** React Native's `index.js` contains `import typeof * as ReactNativePublicAPI` (Flow syntax) which esbuild/tsx cannot transform. Running the test produced `Error: Transform failed with 1 error: Unexpected "typeof"`. All 10 test cases failed immediately at import resolution.
- **Fix:** Implemented the cubic-bezier algorithm inline in `animation.ts` (matching RN's `Easing.bezier(0.42, 0, 1.0, 1.0)` for the `ease` curve). No `react-native` import needed. All easing functions are still lazy `() => EasingFn` closures, spring is still plain data, `as const` preserved.
- **Files modified:** `src/theme/animation.ts`
- **Verification:** `npx tsx tests/unit/animationTokens.test.ts` — 10 passed, 0 failed
- **Committed in:** `a84ec2c` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in approach that prevented test runner from working)
**Impact on plan:** Fix required for correctness — the test verify command (`npx tsx`) cannot import react-native. All plan behavioral requirements (duration values, lazy easing functions, spring data shape, `as const`) are fully preserved. Downstream components can import `ANIMATION` from `@/theme` identically to the plan spec.

## Issues Encountered

None beyond the react-native/tsx incompatibility documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `ANIMATION` is now importable via `import { ANIMATION } from '@/theme'` in all components
- Duration values (fast/normal/slow/verySlow) and easing presets ready for use in Phase 24-02 (SkeletonPulse) and Phases 25–27
- Full unit test suite green (54 tests across 7 test files, all passing)

---
*Phase: 24-polish-foundation*
*Completed: 2026-05-05*
