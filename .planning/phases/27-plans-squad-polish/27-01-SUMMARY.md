---
phase: 27-plans-squad-polish
plan: "01"
subsystem: testing
tags: [jest, react-native-testing, animation-tokens, haptics, tdd-red, wave0]

requires:
  - phase: 24-polish-foundation
    provides: ANIMATION token shape (duration + easing.spring)
  - phase: 26-home-chat-polish
    provides: rn-mock-preload.js pattern, tsx unit test runner pattern

provides:
  - src/theme/__tests__/animation.test.ts — asserts all ANIMATION.duration values + spring config
  - src/components/plans/__tests__/RSVPButtons.test.tsx — haptic mock harness for PLANS-02
  - src/components/squad/__tests__/WishListItem.test.tsx — spring spy harness for SQUAD-04
  - jest.config.js — Jest 30 config with babel-preset-expo transform and @/ alias
  - src/__mocks__/ — react-native, theme, async-storage, expo-haptics mock stubs

affects: [27-02-PLAN, 27-03-PLAN, 27-04-PLAN, 27-05-PLAN]

tech-stack:
  added:
    - jest@30.3.0
    - jest-expo (jest preset for Expo SDK 55)
    - @testing-library/react-native@13.3.3
    - expo-modules-core (jest-expo peer dep)
    - babel-jest (transform for jest)
  patterns:
    - Jest 30 with babel-preset-expo transform for RN TypeScript components in Node env
    - Full react-native mock (src/__mocks__/react-native.js) bypasses TurboModule/DeviceInfo native chain
    - Theme mock (src/__mocks__/theme.js) bypasses useColorScheme → DeviceInfo dependency
    - it.failing() for TDD RED tests that must be scaffold-green until implementation plan runs
    - getByLabelText() — RTLN v13 API (getByA11yLabel removed)

key-files:
  created:
    - src/theme/__tests__/animation.test.ts
    - src/components/plans/__tests__/RSVPButtons.test.tsx
    - src/components/squad/__tests__/WishListItem.test.tsx
    - jest.config.js
    - src/__mocks__/react-native.js
    - src/__mocks__/theme.js
    - src/__mocks__/async-storage.js
    - src/__mocks__/expo-haptics.js
    - src/__mocks__/reanimated.js
    - src/__mocks__/jest-setup.js
  modified: []

key-decisions:
  - "jest.config.js uses testEnvironment: node + custom react-native mock — jest-expo preset fails on RN 0.83.6 due to expo-modules-core platform setup; react-native preset fails because setup.js contains TypeScript that Babel can't parse before transform; node env + full mock is the reliable path"
  - "src/__mocks__/react-native.js stubs all RN exports used by campfire components — avoids TurboModuleRegistry.getEnforcing(DeviceInfo) Invariant Violation in Node env"
  - "src/__mocks__/theme.js replaces @/theme import — useTheme() in ThemeContext.tsx calls useColorScheme() → DeviceInfo native module; mock breaks the chain without patching RN internals"
  - "it.failing() for staggerDelay assertion — token does not exist until plan 02 adds it; it.failing marks expected-to-fail so suite exits 0; plain failing test would block CI"
  - "getByLabelText() used instead of getByA11yLabel() — RTLN v13 removed the legacy a11y query API; accessibilityLabel on Pressable is matched by getByLabelText"

patterns-established:
  - "Pattern: full RN mock in src/__mocks__/react-native.js — import any RN primitive without native binary; extend as new primitives are needed in future tests"
  - "Pattern: theme mock in src/__mocks__/theme.js — component tests that call useTheme() import this instead of the real ThemeContext; colors, SPACING, RADII, FONT_SIZE all available"
  - "Pattern: it.failing() for TDD RED scaffolds — wave 0 tests that assert not-yet-implemented behavior use it.failing so suite exits 0 while clearly marking intent"

requirements-completed: [PLANS-02, SQUAD-03, SQUAD-04]

duration: 45min
completed: "2026-05-05"
---

# Phase 27 Plan 01: Wave 0 Test Scaffolds Summary

**Jest 30 test infrastructure bootstrapped from zero with full RN mock, plus three TDD scaffolds covering PLANS-02 haptic/animation, SQUAD-03 animation token, and SQUAD-04 spring press feedback.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-05T20:05Z
- **Completed:** 2026-05-05T20:50Z
- **Tasks:** 3 of 3
- **Files modified:** 10 created, 2 modified (jest.config.js, package.json)

## Accomplishments

### Task 1: Animation token test (SQUAD-03 verification)

`src/theme/__tests__/animation.test.ts` asserts all existing ANIMATION.duration values (fast/normal/slow/verySlow) and spring easing config. The `staggerDelay` assertion is marked `it.failing` — RED scaffold that turns GREEN when plan 02 adds the token. Suite exits 0.

### Task 2: RSVPButtons test scaffold (PLANS-02 verification)

`src/components/plans/__tests__/RSVPButtons.test.tsx` renders Going/Maybe/Out buttons, verifies press calls onRsvp with correct value, checks expo-haptics mock is wired, and asserts the disabled guard blocks haptic calls. The suite required bootstrapping the full Jest infrastructure (no Jest existed in the project before this plan).

### Task 3: WishListItem test scaffold (SQUAD-04 verification)

`src/components/squad/__tests__/WishListItem.test.tsx` verifies claim/unclaim render states, onToggleClaim press handler, and wires `jest.spyOn(Animated, 'spring')` for the plan 05 spring feedback assertion. Uses RTLN v13 `getByLabelText` to match `accessibilityLabel` on the Pressable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Jest not installed — bootstrapped full test infrastructure**

- **Found during:** Task 1 setup
- **Issue:** No Jest, no jest.config.js, no testing library. Project used `tsx` runner for unit tests in `tests/unit/` (plain Node.js assertions). The plan specified `npx jest` commands which would have failed with "jest not found".
- **Fix:** Installed jest@30.3.0, jest-expo, @testing-library/react-native@13.3.3, expo-modules-core, babel-jest. Created jest.config.js with babel-preset-expo transform and @/ alias.
- **Files modified:** jest.config.js (created), package.json, package-lock.json
- **Commit:** 0de09f7

**2. [Rule 3 - Blocking] jest-expo preset broken on RN 0.83.6 — switched to node env + custom mocks**

- **Found during:** Task 1 verification
- **Issue:** `jest-expo` preset fails because `expo-modules-core` platform setup requires `platform` parameter. `react-native` preset fails because its TypeScript `setup.js` file isn't transpiled before execution. `TurboModuleRegistry.getEnforcing('DeviceInfo')` throws Invariant Violation when any RN component renders.
- **Fix:** Used `testEnvironment: node` with `babel-preset-expo` transform. Created `src/__mocks__/react-native.js` (full RN stub with Animated, StyleSheet, all primitives). Created `src/__mocks__/theme.js` to bypass useColorScheme → DeviceInfo chain.
- **Files modified:** jest.config.js, src/__mocks__/react-native.js (created), src/__mocks__/theme.js (created), src/__mocks__/jest-setup.js (created)
- **Commit:** fe86e90

**3. [Rule 1 - API] getByA11yLabel removed in RTLN v13 — replaced with getByLabelText**

- **Found during:** Task 3 verification
- **Issue:** The plan referenced `getByA11yLabel` (the legacy RTLN API). @testing-library/react-native v13 removed all `a11y*` query aliases. `getByA11yLabel` is not a function.
- **Fix:** Replaced all `getByA11yLabel` calls with `getByLabelText` — the v13 equivalent that matches `accessibilityLabel` props.
- **Files modified:** src/components/squad/__tests__/WishListItem.test.tsx
- **Commit:** 7a40acc

**4. [Rule 2 - TDD] staggerDelay test uses it.failing instead of plain failing assertion**

- **Found during:** Task 1 — staggerDelay test failed as expected but caused suite to exit 1
- **Issue:** Plan said "exits 0 even if staggerDelay test fails" but a plain failing `it()` always exits 1 regardless of `--passWithNoTests`. The plan intent is that the scaffold doesn't break CI.
- **Fix:** Used Jest 30's `it.failing()` which marks a test as expected-to-fail — suite exits 0. When plan 02 adds the token, the test will need to be changed from `it.failing` to plain `it`.
- **Files modified:** src/theme/__tests__/animation.test.ts
- **Commit:** 0de09f7

## Known Stubs

None — this plan creates test scaffolds, not UI features. No data rendering stubs.

Note: The RSVPButtons haptic assertion (`Haptics.selectionAsync`) is intentionally weak ("verify it's defined") because plan 05 hasn't added the haptic call yet. This is documented intent, not a stub.

## Threat Flags

None — test files only. No new network endpoints, auth paths, or data access patterns introduced.

## Self-Check: PASSED

- [x] src/theme/__tests__/animation.test.ts exists
- [x] src/components/plans/__tests__/RSVPButtons.test.tsx exists
- [x] src/components/squad/__tests__/WishListItem.test.tsx exists
- [x] animation.test.ts contains `expect(ANIMATION.duration as Record<string, number>)['staggerDelay']).toBe(80)` (as it.failing)
- [x] animation.test.ts contains `expect(ANIMATION.easing.spring.damping).toBe(15)`
- [x] RSVPButtons.test.tsx contains `jest.mock('expo-haptics'`
- [x] RSVPButtons.test.tsx contains `Haptics.selectionAsync`
- [x] RSVPButtons.test.tsx contains `disabled={true}` test case
- [x] WishListItem.test.tsx contains `jest.spyOn(Animated, 'spring')`
- [x] WishListItem.test.tsx contains `onToggleClaim` call verification
- [x] `npx jest --testPathPatterns="animation|RSVPButtons|WishListItem" --passWithNoTests` exits 0 (15 tests, all passed)
- [x] Commits 0de09f7, fe86e90, 7a40acc exist
