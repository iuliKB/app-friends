# Phase 5: Hardware Verification Gate - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Execute all accumulated manual hardware/device smoke tests for v1.3 in a single consolidated session. This phase is the ship gate for v1.3. Split into two tracks: Expo Go tests (runnable now) and EAS-build tests (deferred until Apple Developer account is acquired).

</domain>

<decisions>
## Implementation Decisions

### Test split
- **D-01:** Phase 5 runs in two tracks: **expo_go** (11 tests, runnable now) and **eas_build** (22 tests, deferred until Apple Dev account acquired).
- **D-02:** Expo Go track covers Phase 2 UI behavioral checks (10 tests) + DM-01 HomeFriendCard tap (1 test). These require no push infrastructure.
- **D-03:** EAS build track covers Phase 1 PUSH checks (10 tests), Phase 3 notification checks (9 tests), Phase 4 morning prompt checks (3 tests). All require real push delivery on native builds.

### Failure handling
- **D-04:** Fix-and-retest inline. When a check fails, fix the issue on the spot, re-run that specific check, then continue. Gap-closure plans authored and executed within the same session.
- **D-05:** No shipping with known failures for the expo_go track. Every check must pass before the track is considered complete.

### Regression scope
- **D-06:** Feature walkthrough for v1.0-v1.2 regression. Each core feature tested with 2-3 scenarios including edge cases (empty states, error recovery). Estimated ~30 min.
- **D-07:** Regression covers: login (email + OAuth), status set (all 3 moods), plan create + RSVP, chat send (DM + group), friend add + accept, squad view (friends tab + goals tab).

### Claude's Discretion
- Test execution sequencing within each track
- SUMMARY.md format and level of detail
- Whether to group expo_go checks by phase origin or by device screen

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 smoke tests
- `.planning/phases/01-push-infrastructure-dm-entry-point/SMOKE-TEST.md` -- 11 checks (PUSH-01..10 + DM-01); DM-01 is expo_go, rest are eas_build

### Phase 2 smoke tests
- `.planning/phases/02-status-liveness-ttl/02-HUMAN-UAT.md` -- 10 UI behavioral checks; all expo_go track

### Phase 3 smoke tests
- `.planning/phases/03-friend-went-free-loop/03-SMOKE-TEST.md` -- 9 checks; all eas_build track

### Phase 4 smoke tests
- `.planning/phases/04-morning-prompt-squad-goals-streak/04-VALIDATION.md` -- "Manual-Only Verifications" section, 3 checks (MORN-01/02, MORN-03/04, MORN-05); all eas_build track

### Phase verifications (for cross-reference)
- `.planning/phases/02-status-liveness-ttl/02-VERIFICATION.md` -- "Human Verification Required" section lists the 10 Phase 2 items
- `.planning/phases/04-morning-prompt-squad-goals-streak/04-VERIFICATION.md` -- "Deferred Items" section

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- All smoke test checklists already authored by Phases 1-4 with step-by-step instructions
- Phase 1 SMOKE-TEST.md includes SQL verification queries for each PUSH check
- Phase 3 SMOKE-TEST.md includes SQL queries for rate-limit verification

### Established Patterns
- Each phase's smoke test follows a consistent format: prerequisites, per-requirement checks with expected outcomes, sign-off section
- Phase 1 includes a "If a check fails" section pointing to `/gsd:plan-phase 1 --gaps`

### Integration Points
- Expo Go app running on device (for expo_go track)
- Supabase SQL editor for spot-checks during testing
- Two test user accounts (User A + User B), already friends

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- follow the existing smoke test checklists as authored by each phase.

</specifics>

<deferred>
## Deferred Ideas

- **EAS build track (22 tests)** -- deferred until Apple Developer account is acquired. Tests tagged `eas_build` in the consolidated checklist. Includes all push notification, iOS action button, Android channel, and morning prompt delivery tests.
- **Automated test infrastructure** -- all v1.3 testing is manual per zero-new-deps rule. Automated E2E testing is a v1.4+ consideration.

</deferred>

---

*Phase: 05-hardware-verification-gate*
*Context gathered: 2026-04-10*
