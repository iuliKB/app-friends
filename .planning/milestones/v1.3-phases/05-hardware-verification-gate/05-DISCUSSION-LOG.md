# Phase 5: Hardware Verification Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 05-hardware-verification-gate
**Areas discussed:** Failure handling, Regression scope

---

## Test Split (pre-discussion clarification)

User confirmed Phase 5 should split into two tracks since Apple Dev account is not being acquired now:

| Option | Description | Selected |
|--------|-------------|----------|
| Run Expo Go tests now | 11 UI behavioral tests runnable without EAS build | Y |
| Defer everything | Wait for Apple Dev account for all 33 tests | |
| Just organize and tag | Create checklist but don't run anything | |

**User's choice:** Run Expo Go tests now; defer 22 EAS-dependent tests.

---

## Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fix-and-retest inline | Fix issues on the spot, re-run check, continue | Y |
| Log all, batch-fix after | Run all checks first, then batch-fix failures | |
| Ship with known gaps | Only block on critical failures, document the rest | |

**User's choice:** Fix-and-retest inline
**Notes:** Applies to the expo_go track running now.

---

## Regression Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Quick happy-path smoke | One pass each core feature, ~10 min | |
| Feature walkthrough | 2-3 scenarios per feature including edge cases, ~30 min | Y |
| Skip regression | Trust prior milestones, only test v1.3 | |

**User's choice:** Feature walkthrough

---

## Claude's Discretion

- Test execution sequencing within each track
- SUMMARY.md format and level of detail
- Grouping strategy for expo_go checks

## Deferred Ideas

- EAS build track (22 tests) deferred until Apple Dev account acquired
- Automated E2E testing deferred to v1.4+
