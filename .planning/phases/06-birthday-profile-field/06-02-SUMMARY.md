---
phase: 06-birthday-profile-field
plan: 02
subsystem: profile-edit
tags: [birthday, profile, supabase, playwright, visual-test]
dependency_graph:
  requires: [06-01-PLAN.md]
  provides: [birthday-profile-edit-integration, birthday-visual-tests]
  affects: [src/app/profile/edit.tsx, tests/visual/birthday-profile.spec.ts]
tech_stack:
  added: []
  patterns: [modal-bottom-sheet, isDirty-tracking, supabase-select-extend, playwright-visual-regression]
key_files:
  created:
    - tests/visual/birthday-profile.spec.ts
  modified:
    - src/app/profile/edit.tsx
decisions:
  - BirthdayPicker placed between charCount Text and buttonWrapper View per D-03 field order spec
  - Feb 29 normalization applied at save time (saveDay = month===2 && day===29 ? 28 : day) — no user-visible indication
  - Partial birthday guard: if exactly one of (month, day) is null at save time, both saved as null
  - isDirty extended with OR clauses for birthdayMonth and birthdayDay — Save enabled when only birthday changes
metrics:
  duration_seconds: 97
  completed_date: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 06 Plan 02: BirthdayPicker Profile Edit Integration Summary

**One-liner:** Wired BirthdayPicker into profile edit screen with full Supabase read/write, Feb 29 normalization, partial birthday guard, and isDirty tracking; added Playwright visual regression test.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend edit.tsx with BirthdayPicker integration | 34a47fa | src/app/profile/edit.tsx |
| 2 | Create Playwright visual test for birthday profile screen | ade1d57 | tests/visual/birthday-profile.spec.ts |

## What Was Built

### Task 1: BirthdayPicker integration in edit.tsx

- Added `import { BirthdayPicker }` after existing component imports
- Added 4 state variables: `birthdayMonth`, `birthdayDay`, `originalBirthdayMonth`, `originalBirthdayDay`
- Extended Supabase SELECT to `'display_name, avatar_url, birthday_month, birthday_day'`
- Populated all 4 state vars in the `if (data && !error)` block of useEffect
- Extended `isDirty` with `birthdayMonth !== originalBirthdayMonth || birthdayDay !== originalBirthdayDay`
- Added Feb 29 normalization before UPDATE: `saveDay = birthdayMonth === 2 && birthdayDay === 29 ? 28 : birthdayDay`
- Added partial birthday guard: `finalMonth/finalDay = null` if either saveMonth or saveDay is null
- Extended `.update()` payload with `birthday_month: finalMonth, birthday_day: finalDay`
- Inserted `<Text style={styles.birthdayLabel}>Birthday</Text>` and `<BirthdayPicker ... />` between charCount and buttonWrapper in JSX
- Added `birthdayLabel` style using `FONT_SIZE.md`, `FONT_WEIGHT.regular`, `COLORS.text.secondary`, `SPACING.xl` (marginTop), `SPACING.sm` (marginBottom)

### Task 2: Playwright visual test

Created `tests/visual/birthday-profile.spec.ts` with three tests under `test.describe("Birthday Profile Field — BDAY-01")`:
1. Profile edit screen renders with birthday field (Birthday label, Month/Day visible) + screenshot `profile-edit-birthday.png`
2. Birthday field shows placeholder text when no birthday is set (Month/Day visible)
3. Save button is disabled when no changes made + screenshot `profile-edit-birthday-initial.png`

## Verification

- `npx tsc --noEmit` exits 0 (confirmed)
- `BirthdayPicker` appears in import (line 17) and JSX (line 223) of edit.tsx
- `birthday_month, birthday_day` in SELECT string (line 45)
- `birthdayMonth !== originalBirthdayMonth` in isDirty (line 165)
- `finalMonth` and `finalDay` in handleSave (lines 139-140, 147-148)
- `birthdayDay === 29 ? 28` normalization present (line 136)
- `BDAY-01` in test describe name (line 24 of spec)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — BirthdayPicker is fully wired to Supabase read/write with no placeholder data.

## Threat Surface Scan

No new network endpoints or auth paths introduced. Birthday values flow through the existing profile UPDATE path, protected by:
- RLS UPDATE policy WITH CHECK (id = auth.uid()) from migration 0016
- Controlled dropdown input (no free-text path for injection)
- Partial birthday guard in handleSave normalizes edge cases before write

All threats T-06-04 through T-06-08 mitigated as specified in the plan's threat model.

## Self-Check: PASSED

Files exist:
- src/app/profile/edit.tsx — FOUND
- tests/visual/birthday-profile.spec.ts — FOUND

Commits exist:
- 34a47fa — FOUND
- ade1d57 — FOUND
