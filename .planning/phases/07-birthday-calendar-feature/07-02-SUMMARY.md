---
phase: 07-birthday-calendar-feature
plan: "02"
subsystem: birthday-calendar
tags: [birthday, ui, squad, navigation, dashboard-card, list-screen]
dependency_graph:
  requires:
    - 07-01-PLAN.md (useUpcomingBirthdays hook, birthdayFormatters utilities)
  provides:
    - squad/_layout.tsx (Stack navigator for /squad/* sub-routes)
    - BirthdayCard.tsx (dashboard card component)
    - birthdays.tsx (BirthdaysScreen list screen)
  affects:
    - squad.tsx (Plan 03 will wire BirthdayCard into Goals tab)
tech_stack:
  added: []
  patterns:
    - Stack navigator with dark header (mirrors friends/_layout.tsx pattern)
    - Pressable card with skeleton loading state (mirrors StreakCard pattern)
    - FlatList list screen with pull-to-refresh and empty state
    - Client-side 30-day filter on RPC result for dashboard count
key_files:
  created:
    - src/app/squad/_layout.tsx
    - src/components/squad/BirthdayCard.tsx
    - src/app/squad/birthdays.tsx
  modified: []
decisions:
  - BirthdayCard receives UpcomingBirthdaysData prop from parent (same as StreakCard data-ownership pattern)
  - Skeleton widths (120, 180, 100, 60) and avatar fixed size (32px) use eslint-disable per project convention
  - BirthdaysScreen fetches its own useUpcomingBirthdays instance — T-07-06 mitigated: no route params contain birthday data
  - TODAY_BG defined at module scope with eslint-disable; minHeight:64 inline with eslint-disable comment
metrics:
  duration_seconds: 123
  completed_date: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 7 Plan 02: Birthday UI Components Summary

**One-liner:** Stack navigator, BirthdayCard dashboard component with 30-day filter + skeleton, and BirthdaysScreen FlatList with today-accent highlight and pull-to-refresh — all type-check clean.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | squad/_layout.tsx + BirthdayCard component | e0e75ba | src/app/squad/_layout.tsx, src/components/squad/BirthdayCard.tsx |
| 2 | BirthdaysScreen — birthday list screen | f05de25 | src/app/squad/birthdays.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — BirthdayCard and BirthdaysScreen consume real useUpcomingBirthdays hook data. Plan 03 will wire BirthdayCard into squad.tsx Goals tab.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. BirthdaysScreen calls useUpcomingBirthdays independently on mount (T-07-05 mitigated). No birthday data passed through route params (T-07-06 mitigated).

## Self-Check: PASSED

- FOUND: src/app/squad/_layout.tsx
- FOUND: src/components/squad/BirthdayCard.tsx
- FOUND: src/app/squad/birthdays.tsx
- FOUND: commit e0e75ba (Task 1)
- FOUND: commit f05de25 (Task 2)
