# Phase 5: Hardware Verification Gate - Research

**Researched:** 2026-04-10
**Domain:** Manual device smoke-test orchestration — Expo Go + EAS dev build
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phase 5 runs in two tracks: **expo_go** (11 tests, runnable now) and **eas_build** (22 tests, deferred until Apple Dev account acquired).
- **D-02:** Expo Go track covers Phase 2 UI behavioral checks (10 tests) + DM-01 HomeFriendCard tap (1 test). These require no push infrastructure.
- **D-03:** EAS build track covers Phase 1 PUSH checks (10 tests), Phase 3 notification checks (9 tests), Phase 4 morning prompt checks (3 tests). All require real push delivery on native builds.
- **D-04:** Fix-and-retest inline. When a check fails, fix the issue on the spot, re-run that specific check, then continue. Gap-closure plans authored and executed within the same session.
- **D-05:** No shipping with known failures for the expo_go track. Every check must pass before the track is considered complete.
- **D-06:** Feature walkthrough for v1.0-v1.2 regression. Each core feature tested with 2-3 scenarios including edge cases (empty states, error recovery). Estimated ~30 min.
- **D-07:** Regression covers: login (email + OAuth), status set (all 3 moods), plan create + RSVP, chat send (DM + group), friend add + accept, squad view (friends tab + goals tab).

### Claude's Discretion

- Test execution sequencing within each track
- SUMMARY.md format and level of detail
- Whether to group expo_go checks by phase origin or by device screen

### Deferred Ideas (OUT OF SCOPE)

- **EAS build track (22 tests)** — deferred until Apple Developer account is acquired. Tests tagged `eas_build` in the consolidated checklist. Includes all push notification, iOS action button, Android channel, and morning prompt delivery tests.
- **Automated test infrastructure** — all v1.3 testing is manual per zero-new-deps rule. Automated E2E testing is a v1.4+ consideration.

</user_constraints>

---

## Summary

Phase 5 is a manual sign-off gate, not a code-delivery phase. Its single purpose is to run accumulated hardware/device smoke tests from Phases 1–4 in one consolidated session so v1.3 can be marked shipped. All source checklists have already been authored by the preceding phases; the planner's job is to sequence them into an executable session plan, not to design new tests.

The phase divides cleanly into three sequential activities: (1) expo_go track — 11 checks on Expo Go app, runnable now, no EAS build needed; (2) v1.0–v1.2 feature walkthrough regression covering 6 core features with ~30 min budget; (3) eas_build track — 22 tests tagged deferred until Apple Developer account is acquired, formally scoped out of the current execution session. The planner should produce one consolidated checklist document and a SUMMARY.md template.

The source test content is complete and verified. Phase 1 SMOKE-TEST.md, Phase 2 HUMAN-UAT.md, Phase 3 SMOKE-TEST.md, and Phase 4 VALIDATION.md Manual-Only table all exist and have step-by-step instructions. The planner need only restructure, sequence, and annotate by track — no new test-step authoring is required.

**Primary recommendation:** Structure the plan as two plans — Plan 01 runs the expo_go track + regression walkthrough; Plan 02 is a deferred placeholder for the eas_build track. Produce a single `05-CHECKLIST.md` consolidating all 11 expo_go checks and a `05-SUMMARY.md` template. No code is touched unless a fix-and-retest inline repair is needed.

---

## Standard Stack

This phase has no software dependencies beyond what's already installed. The test environment is:

| Tool | Version | Purpose | Source |
|------|---------|---------|--------|
| Expo Go | app-store current | expo_go track test runner | [VERIFIED: environment check] |
| expo CLI | 55.0.16 | `npx expo start` to serve the dev bundle | [VERIFIED: `npx expo --version`] |
| eas-cli | 18.3.0 | For eas_build track (deferred) — `eas build:list` | [VERIFIED: `eas --version`] |
| Node.js | 22.4.1 | Runtime for expo CLI | [VERIFIED: `node --version`] |
| Supabase SQL editor | hosted | Spot-check queries during testing | [ASSUMED] |

No new installations required. Zero-new-deps rule is not at risk — this phase installs nothing.

---

## Architecture Patterns

### Phase 5 Structure

This is a documentation + execution phase. The artifact set is:

```
.planning/phases/05-hardware-verification-gate/
├── 05-CONTEXT.md          (exists — user decisions)
├── 05-RESEARCH.md         (this file)
├── 05-PLAN-01.md          (expo_go track + regression walkthrough)
├── 05-PLAN-02.md          (eas_build track placeholder — deferred)
├── 05-CHECKLIST.md        (consolidated all-33 test checklist, tagged by track)
└── 05-SUMMARY.md          (sign-off document, authored after execution)
```

### Pattern: Track-Tagged Checklist

The consolidated `05-CHECKLIST.md` should tag each check by track so deferred items are visible but clearly out of scope for now. The planner has discretion to group expo_go checks by device screen (recommended: Home screen → Profile screen → Chat screen) rather than by phase origin, since a device-screen grouping reduces context-switching during execution.

**Recommended expo_go sequencing (Claude's discretion):**

The 11 expo_go tests cover two sources: 10 Phase 2 behavioral checks (UAT-01..10) and 1 Phase 1 check (DM-01). Grouping by screen flow rather than phase origin reduces physical device navigation:

1. **Home screen flow** (UAT-01 MoodPicker commit, UAT-06 DEAD heading, UAT-07 friend card states, UAT-08 60s tick, UAT-02 ReEngagementBanner appear, UAT-03 Keep it, UAT-04 Heads down, UAT-05 Update scroll-to-picker)
2. **Home screen → Chat** (DM-01 HomeFriendCard tap → DM room)
3. **Session boundary** (UAT-09 signout clear, UAT-10 foreground debounce)

### Pattern: Fix-and-Retest Inline (D-04)

When a check fails during execution:
1. Note the failing check ID and observed behavior
2. Apply the fix (code change, config, data patch)
3. Re-run `npx tsc --noEmit && npx expo lint` after any code change
4. Hot-reload in Expo Go and re-run only the failing check
5. Mark as pass and continue

No gap-closure plan documents are required unless the fix is complex enough to warrant a separate commit. Simple one-liner fixes can be committed directly with a note in SUMMARY.md.

### Pattern: Regression Walkthrough (D-06, D-07)

The 6-feature regression covers v1.0–v1.2 features. These have no authored checklists — the planner should provide a lightweight scenario table in Plan 01 as the execution guide:

| Feature | Scenario 1 | Scenario 2 | Scenario 3 |
|---------|-----------|-----------|-----------|
| Login | Email sign-in | OAuth sign-in | Sign-out + re-sign-in |
| Status set | Set Free + tag + window | Set Busy | Set Maybe + no tag |
| Plan create + RSVP | Create plan, invite friend, RSVP going | Create plan, RSVP not going | Empty plan list state |
| Chat send | DM message | Group chat message | Empty chat state |
| Friend add + accept | Send request, accept on User B | Decline request | Pending state view |
| Squad view | Friends tab | Goals tab (streak card) | Goals tab zero state |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test checklist | New test spec format | Direct transcription from source smoke-test files | Source files are already authored with step-by-step instructions and expected outcomes |
| Failure tracking | Bug tracking system | SUMMARY.md inline notes with pass/fail column | Phase is manual; overhead of a tracking system exceeds value |
| Automated test runner | Jest/Playwright for Phase 5 | Manual execution per zero-new-deps rule | Automated E2E explicitly deferred to v1.4 (CONTEXT deferred section) |

---

## Source Test Inventory

This is the authoritative breakdown of which tests go in which track. The planner MUST use this to author `05-CHECKLIST.md`.

### expo_go Track: 11 tests

| Check ID | Source | Description | Source File |
|----------|--------|-------------|-------------|
| UAT-01 | Phase 2 | MoodPicker two-stage commit flow | `02-HUMAN-UAT.md` test 1 |
| UAT-02 | Phase 2 | ReEngagementBanner appears when heartbeat FADING | `02-HUMAN-UAT.md` test 2 |
| UAT-03 | Phase 2 | "Keep it" action on ReEngagementBanner | `02-HUMAN-UAT.md` test 3 |
| UAT-04 | Phase 2 | "Heads down" action on ReEngagementBanner | `02-HUMAN-UAT.md` test 4 |
| UAT-05 | Phase 2 | "Update" scroll-to-picker | `02-HUMAN-UAT.md` test 5 |
| UAT-06 | Phase 2 | Cold launch with DEAD heartbeat shows heading | `02-HUMAN-UAT.md` test 6 |
| UAT-07 | Phase 2 | Friend card FADING opacity + DEAD partition | `02-HUMAN-UAT.md` test 7 |
| UAT-08 | Phase 2 | 60s setInterval re-renders Home on silent expiry | `02-HUMAN-UAT.md` test 8 |
| UAT-09 | Phase 2 | Signout clears useStatusStore cache | `02-HUMAN-UAT.md` test 9 |
| UAT-10 | Phase 2 | touch() 60s debounce on rapid foreground | `02-HUMAN-UAT.md` test 10 |
| DM-01 | Phase 1 | HomeFriendCard tap opens DM; long-press action sheet | `01-SMOKE-TEST.md` DM-01 |

**[VERIFIED: source files read directly]**

### eas_build Track: 22 tests (DEFERRED)

| Check ID | Source | Description | Source File |
|----------|--------|-------------|-------------|
| PUSH-01 | Phase 1 | Token registers on session-ready | `01-SMOKE-TEST.md` PUSH-01 |
| PUSH-02 | Phase 1 | Foreground re-register on AppState 'active' | `01-SMOKE-TEST.md` PUSH-02 |
| PUSH-03 | Phase 1 | Schema columns and composite unique | `01-SMOKE-TEST.md` PUSH-03 |
| PUSH-04 | Phase 1 | Toggle OFF deletes server row, ON re-registers | `01-SMOKE-TEST.md` PUSH-04 |
| PUSH-05 | Phase 1 | Plan invite reaches fresh install | `01-SMOKE-TEST.md` PUSH-05 |
| PUSH-06 | Phase 1 | iOS notification action buttons (morning_prompt) | `01-SMOKE-TEST.md` PUSH-06 |
| PUSH-07 | Phase 1 | Android channels exist | `01-SMOKE-TEST.md` PUSH-07 |
| PUSH-08 | Phase 1 | iOS pre-prompt timing | `01-SMOKE-TEST.md` PUSH-08 |
| PUSH-09 | Phase 1 | DeviceNotRegistered marks invalidated_at | `01-SMOKE-TEST.md` PUSH-09 |
| PUSH-10 | Phase 1 | EAS dev build exists | `01-SMOKE-TEST.md` PUSH-10 |
| SMOKE-01 | Phase 3 | FREE-01: Push arrives within ~5s of transition | `03-SMOKE-TEST.md` SMOKE-01 |
| SMOKE-02 | Phase 3 | FREE-08: Push body format | `03-SMOKE-TEST.md` SMOKE-02 |
| SMOKE-03 | Phase 3 | FREE-09 warm start: Tap opens DM | `03-SMOKE-TEST.md` SMOKE-03 |
| SMOKE-04 | Phase 3 | FREE-09 cold start: Tap opens DM after kill | `03-SMOKE-TEST.md` SMOKE-04 |
| SMOKE-05 | Phase 3 | FREE-03/04/05 rate limits | `03-SMOKE-TEST.md` SMOKE-05 |
| SMOKE-06 | Phase 3 | FREE-06 quiet hours | `03-SMOKE-TEST.md` SMOKE-06 |
| SMOKE-07 | Phase 3 | EXPIRY-01 local notification fires | `03-SMOKE-TEST.md` SMOKE-07 |
| SMOKE-08 | Phase 3 | EXPIRY-01 [Keep it] extends window | `03-SMOKE-TEST.md` SMOKE-08 |
| SMOKE-09 | Phase 3 | EXPIRY-01 [Heads down] flips to busy | `03-SMOKE-TEST.md` SMOKE-09 |
| MORN-01 | Phase 4 | Daily notification fires at configured local time | `04-VALIDATION.md` manual row 1 |
| MORN-02 | Phase 4 | Action button taps from lock screen (cold start) route correctly | `04-VALIDATION.md` manual row 2 |
| MORN-03 | Phase 4 | 12h valid_until guard — tap >12h after fire no-ops | `04-VALIDATION.md` manual row 3 |

**Total: 22 deferred. [VERIFIED: source files read directly]**

---

## Common Pitfalls

### Pitfall 1: Testing expo_go checks that actually require EAS build
**What goes wrong:** Some Phase 2 checks look UI-only but implicitly need notification infrastructure (e.g., UAT-02 expects ReEngagementBanner, which depends on heartbeat — that IS Expo Go compatible). However, PUSH-06 (iOS action buttons) and PUSH-07 (Android channels) silently fail in Expo Go with no error message.
**Why it happens:** Expo Go sandboxes native modules; `setNotificationCategoryAsync` returns success but categories don't register on iOS.
**How to avoid:** The track split in D-01 already handles this. Do not attempt any PUSH-0x check during the expo_go session.
**Warning signs:** If a check requires `eas build:list` in its prerequisites section, it is eas_build track.

**[ASSUMED — confirmed by STATE.md Blockers section which states "setNotificationCategoryAsync almost certainly does not work for remote push in Expo Go on iOS"]**

### Pitfall 2: UAT-08 (60s tick) requires real wall-clock wait
**What goes wrong:** The 60-second setInterval re-render check cannot be compressed. Setting a status and immediately checking friend card state will show stale data — the check requires actually waiting ~60 seconds.
**Why it happens:** The 60s tick is a real setInterval that cannot be mocked in a manual session.
**How to avoid:** Plan the session to include natural wait gaps. UAT-08 can be started and then UAT-09 / UAT-10 can be initiated during the wait.
**Warning signs:** If friend card state doesn't update within 70s of expiry, that IS a bug, not a test error.

**[VERIFIED: `02-HUMAN-UAT.md` test 8 description]**

### Pitfall 3: UAT-02 requires heartbeat to enter FADING state (4-hour aging)
**What goes wrong:** The ReEngagementBanner only appears when `heartbeatState === 'fading'`, which requires `last_active_at` to be between 4h and 8h ago. A fresh login will never see the banner.
**Why it happens:** `computeHeartbeatState` has a 4h FADING threshold (HEART-03).
**How to avoid:** Manipulate `last_active_at` directly in the Supabase SQL editor: `UPDATE public.statuses SET last_active_at = now() - interval '5 hours' WHERE user_id = '<uuid>';` — then foreground the app. The 60s tick will re-compute heartbeat state.
**Warning signs:** If the banner never appears despite the SQL update, check that the effective_status view is returning the updated `last_active_at` (the view may have a propagation delay).

**[VERIFIED: `02-VERIFICATION.md` human_verification section; `computeHeartbeatState` thresholds confirmed in HEART-03 requirement]**

### Pitfall 4: STREAK-08 human review gate is still open
**What goes wrong:** Phase 4 verification is in `human_needed` status because the non-engineer reviewer identity for STREAK-08 couldn't be confirmed programmatically. The Phase 5 session should resolve this.
**Why it happens:** `04-VERIFICATION.md` score is 16/17, with the 1 uncertain item being whether "Approved by project owner" is actually a non-engineer.
**How to avoid:** Include an explicit check in the Plan 01 checklist: confirm the STREAK-08 copy reviewer is distinct from the engineer. If the project owner is the same person as the solo developer, document that explicitly and treat it as owner-approved.
**Warning signs:** The `04-VERIFICATION.md` status field reads `human_needed` — Phase 5 must clear this before v1.3 is marked shipped.

**[VERIFIED: `04-VERIFICATION.md` status frontmatter and human_verification section]**

### Pitfall 5: Two test users must already be friends before the session starts
**What goes wrong:** Several expo_go checks (friend card states, UAT-07) require at least one friend in User A's friend list. If the test environment was reset, these checks will show an empty "Everyone Else" section.
**Why it happens:** The test prerequisites from all source smoke-test files assume "User A and User B are already friends."
**How to avoid:** Verify the friend relationship exists before starting the expo_go track. A quick SQL check: `SELECT * FROM public.friendships WHERE (user_id_1 = '<user-a>' OR user_id_2 = '<user-a>') AND status = 'accepted';`
**Warning signs:** Home screen shows zero friend cards for User A.

**[VERIFIED: Phase 1 SMOKE-TEST.md prerequisites section; Phase 3 SMOKE-TEST.md prerequisites]**

---

## Execution Prerequisites

Before the expo_go track session begins, the following must be true:

| Prerequisite | How to Verify | Track |
|-------------|---------------|-------|
| Expo Go app installed on a physical device (iPhone or Android) | Open app | expo_go |
| Expo dev server running (`npx expo start`) | QR code visible in terminal | expo_go |
| Two test user accounts (User A, User B) exist and are friends | SQL check above | expo_go |
| User A is logged in on the primary test device | Home screen visible | expo_go |
| Supabase SQL editor accessible in browser | Can run SELECT | expo_go + eas_build |
| EAS dev build installed (iOS + Android) | `eas build:list --platform ios` | eas_build only (deferred) |

**[VERIFIED: all source smoke-test prerequisite sections]**

---

## Runtime State Inventory

This section is N/A for this phase — Phase 5 is a test-execution phase with no rename/refactor/migration activity. No runtime state needs to be audited.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Expo CLI | ✓ | 22.4.1 | — |
| npm | Package tooling | ✓ | 10.9.2 | — |
| expo CLI | `npx expo start` | ✓ | 55.0.16 | — |
| eas-cli | eas_build track | ✓ | 18.3.0 | Track deferred anyway |
| Physical device (iOS/Android) | expo_go track | unknown | — | Cannot be tested without device |
| Apple Developer account | EAS builds, eas_build track | ✗ | — | Track deferred (D-01) |

**[VERIFIED: environment probe via bash commands]**

**Missing dependencies with no fallback:**
- Physical device — expo_go track requires a real device or simulator running Expo Go. This is not a tool that can be installed by Claude; it requires the user to have a device ready.

**Missing dependencies with fallback:**
- Apple Developer account — eas_build track is deferred (D-01); the 22 EAS-dependent tests are out of scope for the current session.

---

## Validation Architecture

`nyquist_validation` is `true` in config.json. However, Phase 5 is a manual-only testing phase. There is no automated test suite to run — the phase IS the test execution.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — Phase 5 is manual device testing |
| Config file | N/A |
| Quick run command | `npx tsc --noEmit && npx expo lint` (code health check only, not a Phase 5 verification) |
| Full suite command | N/A — all verification is manual device observation |

### Phase Requirements → Test Map

Phase 5 has no new requirement IDs. It re-verifies requirements claimed as code-complete by Phases 1–4. The test map is the consolidated checklist itself — each row in the checklist maps to a requirement ID from REQUIREMENTS.md.

### Sampling Rate

- **During expo_go session:** Run `npx tsc --noEmit && npx expo lint` after any inline fix before re-testing the failing check.
- **At session end:** All 11 expo_go checks passed; SUMMARY.md completed.
- **Phase gate:** All expo_go checks green + STREAK-08 human gate cleared.

### Wave 0 Gaps

The only documents to author before execution:
- [ ] `05-CHECKLIST.md` — consolidated 33-check list tagged by track (expo_go / eas_build)
- [ ] `05-SUMMARY.md` template — sign-off document with pass/fail table

---

## Security Domain

Phase 5 has no new security controls to implement. All security verifications were completed by the preceding phases:

- Push token invalidation (PUSH-09) — covered by eas_build track (deferred)
- RLS on statuses/status_history — verified in Phase 2 code verification
- Authenticated-session-only status mutation — verified in Phase 4 code verification

The expo_go track tests client-side UI behavior only. No new ASVS controls apply to this phase.

---

## Key Planning Insights for the Planner

### 1. Two plans, not one
Plan 01 = expo_go track execution + v1.0-v1.2 regression walkthrough (runnable now).
Plan 02 = eas_build track placeholder (deferred — creates the checklist section but marks all 22 items as `[DEFERRED: no Apple Dev account]`).

### 2. STREAK-08 gate must be cleared in Plan 01
The `04-VERIFICATION.md` has `status: human_needed` for STREAK-08 reviewer identity. Plan 01 must include an explicit step: "Confirm STREAK-08 copy approver is a non-engineer distinct from the solo developer — or acknowledge that in a solo-dev project the project owner is the approver of record."

### 3. Session duration estimate
- expo_go 11 checks: ~60–90 min (UAT-02 requires 4h DB manipulation, UAT-08 requires 60s wait; everything else is fast)
- Regression walkthrough: ~30 min (per D-06)
- SUMMARY.md authoring: ~10 min
- **Total expo_go session: ~2 hours**

### 4. SQL manipulation shortcut for UAT-02/UAT-06
Both UAT-02 (FADING banner) and UAT-06 (DEAD heading on cold launch) require aged heartbeat state. The session plan should include pre-session SQL commands to set `last_active_at` to the correct age (5h for FADING, 9h+ for DEAD) rather than waiting for organic aging.

### 5. Group expo_go checks by screen, not by phase
Claude's discretion (CONTEXT.md) allows grouping by device screen. Grouping by Home screen → DM → session boundary reduces physical device navigation compared to grouping by phase origin (which would jump between screens repeatedly).

### 6. SUMMARY.md must mark eas_build track as formally deferred
The SUMMARY.md should include a section: "eas_build Track: Formally Deferred — Prerequisites: EAS dev build on real iPhone (iOS 15+) and Android device with Play Services. Execute when Apple Developer account is acquired." This closes the audit trail for the deferred 22 tests.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `setNotificationCategoryAsync` silently fails in Expo Go on iOS | Common Pitfalls #1 | If wrong, some PUSH checks could be attempted in Expo Go — but they're in eas_build track anyway so no planning impact |
| A2 | Physical device (iPhone or Android) is available to the user for the expo_go session | Environment Availability | If no device available, entire expo_go track is blocked; planner cannot work around this |

---

## Open Questions

1. **STREAK-08 non-engineer reviewer identity**
   - What we know: Approval recorded as "Approved by project owner" on 2026-04-10
   - What's unclear: Whether the project owner is a distinct non-engineer person or the same solo developer
   - Recommendation: Plan 01 should include this as an explicit human checkpoint step, not leave it to chance

2. **DM-01 route existence (from STATE.md pending todos)**
   - What we know: STATE.md records a pending todo from Phase 1 planning: "Confirm `/dm/[id]` route existence in src/app/"
   - What's unclear: The SMOKE-TEST.md for DM-01 references `/chat/room?dm_channel_id=...` not `/dm/[id]` — the route naming may have been resolved during Phase 1 execution
   - Recommendation: DM-01 check will surface this at execution time; the smoke-test step itself is the verification

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-push-infrastructure-dm-entry-point/SMOKE-TEST.md` — 11 checks including DM-01 and PUSH-01..10 with full step-by-step instructions
- `.planning/phases/02-status-liveness-ttl/02-HUMAN-UAT.md` — 10 Phase 2 behavioral checks, all expo_go track
- `.planning/phases/03-friend-went-free-loop/03-SMOKE-TEST.md` — 9 Phase 3 checks, all eas_build track
- `.planning/phases/04-morning-prompt-squad-goals-streak/04-VALIDATION.md` — Manual-Only Verifications table, 3 Phase 4 checks, all eas_build track
- `.planning/phases/05-hardware-verification-gate/05-CONTEXT.md` — locked decisions D-01..D-07
- `.planning/phases/02-status-liveness-ttl/02-VERIFICATION.md` — Phase 2 human verification requirements (10 items)
- `.planning/phases/04-morning-prompt-squad-goals-streak/04-VERIFICATION.md` — Phase 4 status `human_needed`, STREAK-08 open gate

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — accumulated decisions, pending todos, blockers/concerns from all phases

---

## Metadata

**Confidence breakdown:**
- Source test content: HIGH — read directly from authored smoke-test files
- Track assignment: HIGH — explicit in CONTEXT.md D-01/D-02/D-03
- Execution sequencing: MEDIUM — Claude's discretion, screen-grouping recommendation is reasoned but not prescribed
- Session duration estimate: MEDIUM — based on Phase 3 estimate (~2h for 9 tests including 30-min waits) extrapolated

**Research date:** 2026-04-10
**Valid until:** Phase 5 execution — content is stable (source docs are complete)
