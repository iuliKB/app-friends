---
status: partial
phase: 07-birthday-calendar-feature
source: [07-VERIFICATION.md]
started: 2026-04-12
updated: 2026-04-12
---

## Current Test

[awaiting human testing]

## Tests

### 1. Birthday list screen shows friends sorted by days_until
expected: Navigating to /squad/birthdays shows a list of friends with birthdays, ordered by "Today" first, "Tomorrow" second, then "In N days" ascending. Avatar, name, and date label visible per row.
result: [pending]

### 2. BirthdayCard appears in Goals tab below StreakCard
expected: After tapping "Goals" in the Squad tab switcher, a card titled "Birthdays 🎂" is visible below the StreakCard. If friends have birthdays in the next 30 days, the count line and nearest friend row with avatar are visible. If no friends have birthdays, "No upcoming birthdays" copy is shown.
result: [pending]

### 3. Tapping BirthdayCard navigates to birthday list screen with back button
expected: Tapping the Birthdays card navigates to a new screen titled "Birthdays" with a native back button that returns to the Squad goals tab.
result: [pending]

### 4. Pull-to-refresh works on birthday list screen
expected: Pulling down on the birthday list screen shows a refresh control and re-fetches data without error or crash.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
