---
status: partial
phase: 06-birthday-profile-field
source: [06-VERIFICATION.md]
started: 2026-04-12
updated: 2026-04-12
---

## Current Test

[awaiting human testing]

## Tests

### 1. Save round-trip
expected: Select month/day, save, reopen edit screen — verify previously saved month and day are pre-filled
result: [pending]

### 2. Feb 29 normalization
expected: Select Feb 29, save, reopen edit — verify it shows Feb 28
result: [pending]

### 3. Partial birthday guard
expected: Select only month (no day), save, reopen — verify both dropdowns show placeholder (Month/Day)
result: [pending]

### 4. Blank birthday saves without error
expected: Leave birthday blank, tap Save Changes — no error shown, profile saves successfully
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
