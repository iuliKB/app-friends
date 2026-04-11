---
status: partial
phase: 05-database-migrations
source: [05-VERIFICATION.md]
started: 2026-04-12T00:00:00Z
updated: 2026-04-12T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. RLS smoke-test: non-member cannot see iou_groups
expected: As a non-member user, `SELECT * FROM iou_groups` returns zero rows
result: [pending]

### 2. RLS smoke-test: non-creator cannot settle debts
expected: As a non-creator member, `UPDATE iou_members SET settled_at = now()` is rejected by RLS policy
result: [pending]

### 3. RLS smoke-test: no-friends user gets empty birthdays
expected: As a user with no accepted friends, `SELECT * FROM get_upcoming_birthdays()` returns zero rows
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
