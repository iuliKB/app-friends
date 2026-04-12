---
phase: "06"
plan: "01"
subsystem: profile
tags: [birthday, types, component, ui]
dependency_graph:
  requires: []
  provides:
    - birthday_month/birthday_day in profiles Row/Insert/Update types
    - BirthdayPicker component (two-dropdown animated picker)
  affects:
    - src/app/profile/edit.tsx (Plan 02 will wire BirthdayPicker here)
tech_stack:
  added: []
  patterns:
    - FriendActionSheet Modal + Animated.timing bottom-sheet pattern
    - Controlled component with nullable month/day props
key_files:
  created:
    - src/components/common/BirthdayPicker.tsx
  modified:
    - src/types/database.ts
decisions:
  - BirthdayPicker uses same animated Modal pattern as FriendActionSheet (translateY 300→0, 250ms, useNativeDriver true)
  - getDaysInMonth returns 29 for Feb; Feb 29 normalization deferred to handleSave in Plan 02
  - Day reset to null (not clamp) when month change makes current day invalid — forces explicit re-selection
  - Keyboard.dismiss() called before opening any dropdown to prevent Android z-order issue
  - No new npm dependencies; all RN core APIs
metrics:
  duration: "~2 minutes"
  completed: "2026-04-12"
  tasks_completed: 2
  files_changed: 2
---

# Phase 6 Plan 01: Birthday Types and Picker Component Summary

Birthday_month/birthday_day TypeScript types added to profiles Row/Insert/Update, and a self-contained two-dropdown BirthdayPicker component created following the FriendActionSheet animated Modal pattern.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add birthday fields to database.ts profiles types | 8beea18 | src/types/database.ts |
| 2 | Create BirthdayPicker component | 7d8ff40 | src/components/common/BirthdayPicker.tsx |

## What Was Built

**Task 1 — database.ts birthday types:**
- Added `birthday_month: number | null` and `birthday_day: number | null` to `profiles.Row`
- Added `birthday_month?: number | null` and `birthday_day?: number | null` to `profiles.Insert`
- Added `birthday_month?: number | null` and `birthday_day?: number | null` to `profiles.Update`
- Matches migration 0016 (smallint nullable columns, phase comment added)

**Task 2 — BirthdayPicker component:**
- Two side-by-side TouchableOpacity triggers, each `height: 52` matching edit.tsx textInput height
- Row uses `gap: SPACING.md` (12px) to visually pair the two dropdowns
- Trigger styling matches edit.tsx token set: `COLORS.surface.card`, `RADII.lg`, `SPACING.lg` padding
- Placeholder text in `COLORS.text.secondary`; selected values in `COLORS.text.primary`
- Modal + `TouchableWithoutFeedback` backdrop + `Animated.View` sheet — identical to FriendActionSheet pattern
- `translateY` animates from 300 to 0 (250ms, `useNativeDriver: true`); resets to 300 on close
- `getDaysInMonth()` provides dynamic day list per selected month (Feb = 29 max)
- Month change side effect: if current day > max days in new month, calls `onChange(newMonth, null)` — resets day
- "Clear Birthday" text link shown only when both month and day are non-null; calls `onChange(null, null)`
- `Keyboard.dismiss()` called before setting `openDropdown` (Android z-order fix)
- Accessibility labels on both triggers with full month names and current value
- `eslint-disable-next-line campfire/no-hardcoded-styles` on modal scrim rgba (no exact token)
- `disabled` prop sets `opacity: 0.5` and prevents interaction

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — BirthdayPicker is fully implemented. edit.tsx integration happens in Plan 02.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. BirthdayPicker is a pure UI component. Threat register items T-06-01 and T-06-02 are mitigated:
- T-06-01: `getDaysInMonth()` ensures the day list never offers invalid days for the selected month
- T-06-02: Component never calls `onChange` with a day exceeding `getDaysInMonth(newMonth)` — resets to null instead

## Self-Check: PASSED

- src/types/database.ts — FOUND, birthday fields in Row/Insert/Update confirmed
- src/components/common/BirthdayPicker.tsx — FOUND, all acceptance criteria met
- Commit 8beea18 — FOUND (feat(06-01): add birthday_month and birthday_day to profiles types)
- Commit 7d8ff40 — FOUND (feat(06-01): create BirthdayPicker component)
- npx tsc --noEmit — exits 0
