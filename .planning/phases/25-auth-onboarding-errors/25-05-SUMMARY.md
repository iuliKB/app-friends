---
phase: 25-auth-onboarding-errors
plan: "05"
subsystem: onboarding
tags: [onboarding, first-run, async-storage, modal, bottom-sheet]
dependency_graph:
  requires: ["25-02", "25-03"]
  provides: ["AUTH-04"]
  affects: ["src/screens/home/HomeScreen.tsx"]
tech_stack:
  added: []
  patterns:
    - "Animated + Modal bottom sheet (no PanResponder, no tap-to-dismiss)"
    - "AsyncStorage flag check with loading guard"
key_files:
  created:
    - src/components/onboarding/OnboardingHintSheet.tsx
  modified:
    - src/screens/home/HomeScreen.tsx
decisions:
  - "OnboardingHintSheet has no PanResponder and no TouchableWithoutFeedback backdrop — only 'Get Started' dismisses it (D-11)"
  - "AsyncStorage check gated on loading === false to avoid race where friends array is empty during initial load"
  - "ONBOARDING_FLAG_KEY is a constant inside the component — not a module-level export, consistent with ThemeContext pattern"
metrics:
  duration_minutes: 10
  completed_date: "2026-05-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 25 Plan 05: Onboarding Hint Sheet Summary

**One-liner:** First-run bottom sheet using Animated + Modal with AsyncStorage flag guard — appears once for users with zero friends, dismissed only via "Get Started" button.

## What Was Built

Created `OnboardingHintSheet`, a custom bottom sheet component that slides up from the bottom on first app launch for users with no friends. The sheet shows a fire emoji, welcome heading, two guidance lines, and a "Get Started" button. It cannot be dismissed by tapping the backdrop or swiping (D-11 honored). Wired into HomeScreen with an AsyncStorage flag that ensures the sheet appears at most once per device.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create OnboardingHintSheet component | 6df8b4e | src/components/onboarding/OnboardingHintSheet.tsx |
| 2 | Wire onboarding flag check into HomeScreen | e51ddcf | src/screens/home/HomeScreen.tsx |

## Acceptance Criteria Verification

- [x] `src/components/onboarding/OnboardingHintSheet.tsx` created
- [x] Contains `export function OnboardingHintSheet`
- [x] Modal with `transparent` prop and `animationType="none"`
- [x] `Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true })`
- [x] `translateY.setValue(600)` for instant reset
- [x] "Welcome to Campfire!" heading present
- [x] "Tap your status above to let friends know if you're free." present
- [x] "Head to Squad to add friends." present
- [x] `PrimaryButton` with `title="Get Started"` present
- [x] No `PanResponder` (D-11 honored)
- [x] No `TouchableWithoutFeedback` on backdrop (D-11 honored)
- [x] `accessibilityViewIsModal` on Modal element
- [x] Styles inside `useMemo(..., [colors])` block
- [x] All style values use theme tokens
- [x] HomeScreen imports `AsyncStorage` and `OnboardingHintSheet`
- [x] HomeScreen contains `@campfire/onboarding_hint_shown` flag key
- [x] `if (loading) return;` guard inside onboarding useEffect
- [x] `friends.length === 0` in flag check condition
- [x] `AsyncStorage.setItem(ONBOARDING_FLAG_KEY, 'true')` in dismiss handler
- [x] `<OnboardingHintSheet>` in JSX return with `onDismiss={handleOnboardingDismiss}`
- [x] ErrorDisplay guard from Plan 03 (`mode="screen"`) still present

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data paths are fully wired. The sheet's display logic reads live AsyncStorage and live `friends` array from `useHomeScreen`.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. AsyncStorage usage is consistent with existing ThemeContext pattern.

## Self-Check: PASSED

Files exist:
- src/components/onboarding/OnboardingHintSheet.tsx — FOUND
- src/screens/home/HomeScreen.tsx — FOUND (modified)

Commits exist:
- 6df8b4e — FOUND (feat(25-05): add OnboardingHintSheet component)
- e51ddcf — FOUND (feat(25-05): wire onboarding hint sheet into HomeScreen)
