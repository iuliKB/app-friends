---
phase: 01-push-infrastructure-dm-entry-point
plan: 01
subsystem: push-infrastructure
tags: [docs, eas, runbook, dev-build, v1.3]
status: awaiting-user-action
requirements:
  - PUSH-10
dependency_graph:
  requires: []
  provides:
    - "EAS development build runbook (iOS + Android) for Phase 1"
    - "Sign-off gate before Plan 02 (push_tokens schema migration) starts"
  affects:
    - "All subsequent Phase 1 plans that require on-device smoke testing"
tech_stack:
  added: []
  patterns:
    - "Phase-scoped runbook stored in .planning/phases/<phase>/ per D-10"
key_files:
  created:
    - .planning/phases/01-push-infrastructure-dm-entry-point/EAS-BUILD-INSTRUCTIONS.md
    - .planning/phases/01-push-infrastructure-dm-entry-point/01-01-SUMMARY.md
  modified: []
decisions:
  - "Runbook lives inside the phase folder (D-10), not docs/ or README.md"
  - "Claude does not run eas commands or modify eas.json (D-09); user runs the build"
  - "EAS dev build is the FIRST deliverable of Phase 1 (D-11), gating all later smoke tests"
metrics:
  duration_minutes: 4
  tasks_completed: 1
  tasks_total: 2
  files_created: 2
  files_modified: 0
  completed_date: "2026-04-07"
---

# Phase 1 Plan 01: EAS Dev Build Documentation Summary

**One-liner:** Authored a phase-scoped EAS development build runbook (iOS + Android) so the user can produce installable dev clients before any Phase 1 client-side smoke testing begins.

## What Shipped

- `.planning/phases/01-push-infrastructure-dm-entry-point/EAS-BUILD-INSTRUCTIONS.md` — full runbook with:
  - Why an EAS dev build is required for v1.3 (action buttons, Android channels, remote-push categories all unreliable in Expo Go)
  - Prerequisites (eas-cli, login, `EAS_PROJECT_ID` env var pattern verified against `app.config.ts`)
  - Exact `eas build --profile development --platform ios` and `--platform android` commands
  - Install instructions for real devices, simulators, and emulators
  - Smoke check covering app launch + login on both platforms
  - Troubleshooting table (Project ID not found, plugin warnings, provisioning, keystore, queue, install-trust)
  - v1.3 constraint reminder block referencing D-09, D-10, D-11
  - Sign-off checklist gating Plan 02

## Task Log

| Task | Name | Status | Commit |
| ---- | --- | --- | --- |
| 1 | Author EAS-BUILD-INSTRUCTIONS.md runbook | done | 7083d66 |
| 2 | User runs EAS dev build and signs off | **awaiting user** (checkpoint) | n/a |

## Verification

Plan-defined automated check (run from worktree root):

```
test -f .planning/phases/01-push-infrastructure-dm-entry-point/EAS-BUILD-INSTRUCTIONS.md \
  && grep -q "eas build --profile development --platform ios" .planning/phases/01-push-infrastructure-dm-entry-point/EAS-BUILD-INSTRUCTIONS.md \
  && grep -q "eas build --profile development --platform android" .planning/phases/01-push-infrastructure-dm-entry-point/EAS-BUILD-INSTRUCTIONS.md \
  && grep -q "Sign-off checklist" .planning/phases/01-push-infrastructure-dm-entry-point/EAS-BUILD-INSTRUCTIONS.md
```

Result: **PASS** (all four assertions satisfied).

Acceptance criteria from PLAN.md:
- File exists at the documented path — yes
- Contains exact iOS command string — yes
- Contains exact Android command string — yes
- Contains `Sign-off checklist` header — yes
- References `D-11` and explains EAS-first ordering — yes (constraint reminder block + "Why" section)
- Troubleshoots "Project ID not found" — yes (first row of troubleshooting table)

## Decisions Made

- Kept the runbook prose tight, table-driven, and copy-pasteable. No reorganisation of `docs/` per D-10.
- Listed the simulator path (`eas build:run -p ios --latest`) alongside real-device install so the user is not blocked by physical device availability.
- Noted that the `expo-notifications` plugin warning is expected (Plan 03 of this phase converts to tuple form) so the user does not waste time chasing it.

## Deviations from Plan

None — plan executed exactly as written. The runbook content matches the section list and ordering specified in `<action>`, with minor wording polish for readability.

## Deferred Issues

None.

## Next Step

**Checkpoint (Task 2 — `human-action`, blocking):** the user must run the runbook end-to-end and reply with `build done` (per the `<resume-signal>` in the plan). Phase 1 Plan 02 is gated on this sign-off.

## Self-Check: PASSED

- EAS-BUILD-INSTRUCTIONS.md present at `.planning/phases/01-push-infrastructure-dm-entry-point/EAS-BUILD-INSTRUCTIONS.md` — confirmed
- Task 1 commit `7083d66` exists in this worktree — confirmed via gsd-tools commit return value
- All plan acceptance criteria satisfied
