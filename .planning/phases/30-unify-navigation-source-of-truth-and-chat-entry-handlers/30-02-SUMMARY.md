---
phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
plan: 02
subsystem: navigation
tags: [helper, chat-entry, openChat, supabase-rpc, tdd]

# Dependency graph
requires:
  - phase: none
    provides: existing lib-helper pattern (src/lib/heartbeat.ts, src/lib/action-sheet.ts)
provides:
  - openChat async helper consolidating 5 entry shapes (dmChannel, dmFriend, plan, group, group+birthday)
  - OpenChatParams discriminated-union type (kind: 'dmChannel'|'dmFriend'|'plan'|'group')
  - OpenChatOptions interface (silentError, onLoadingChange)
affects: [30-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 30 chat-entry helper pattern — single async function accepts router as first arg, owns the DM create-or-get RPC and default Alert UX, leaves caller-side concerns (Haptics, action-sheet close, group-create RPC) at the callsite"

key-files:
  created:
    - src/lib/openChat.ts
    - src/lib/__tests__/openChat.test.ts
  modified: []

key-decisions:
  - "Helper accepts router as parameter (not useRouter() internally) — preserves usability in non-render contexts (notification dispatcher in _layout.tsx) and avoids forcing callers to hoist a hook call"
  - "kind discriminator (not type/variant) names the entry shape — type would shadow JS reserved word semantics in TS unions and variant is less idiomatic"
  - "Alert literal Alert.alert('Error', \"Couldn't open chat. Try again.\") inlined rather than via constants — required by plan acceptance criterion AC7's exact-string grep gate (this is the verbatim copy already used by 7 of 8 existing inline DM blocks)"
  - "create_birthday_group RPC stays at callsite (birthday/[id].tsx) — has side-effect requirement (invalidateChatList()) that openChat must not own; openChat handles only the post-creation push"

patterns-established:
  - "Phase 30 lib-helper convention: header doc identifies callsite-count being consolidated, named function + named type exports, supabase imported directly (not via hooks), expo-router Router type from package root"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-05-12
---

# Phase 30 Plan 02: openChat Chat-Entry Helper Summary

**New `src/lib/openChat.ts` exports `openChat(router, params, options?)` — a single async helper consolidating 13 inline `router.push('/chat/room?...')` callsites and 8 duplicate `get_or_create_dm_channel` + push pairs behind one discriminated-union signature.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-12T23:48:52Z
- **Completed:** 2026-05-12T23:51:31Z
- **Tasks:** 1 (TDD: RED → GREEN, no REFACTOR needed)
- **Files created:** 2 (1 implementation, 1 test)
- **Tests:** 10 passing (0 failing)

## Accomplishments

- `openChat` async helper handles all 5 canonical entry shapes (`dmChannel`, `dmFriend`, `plan`, `group`, `group` + `birthdayPersonId`) with a `kind` discriminator
- `dmFriend` branch invokes `supabase.rpc('get_or_create_dm_channel', { other_user_id: friendId })` and pushes the returned channel id; alerts on error with the verbatim copy `Alert.alert('Error', "Couldn't open chat. Try again.")` matching 7 of 8 existing callsites
- `silentError: true` option preserves the silent-fail behavior required by the push-notification dispatcher in `src/app/_layout.tsx:61-67`
- `onLoadingChange?: (loading: boolean) => void` option toggles around the RPC for sheet-based callsites (`squad.tsx`, `FriendsList.tsx`) — called exactly twice for the RPC-bearing variant, not called at all for synchronous variants (`dmChannel`, `plan`, `group`)
- URL formats byte-for-byte identical to the inline implementations being replaced:
  - DM: `/chat/room?dm_channel_id=${id}&friend_name=${encodeURIComponent(name)}`
  - Plan: `/chat/room?plan_id=${planId}`
  - Group: `/chat/room?group_channel_id=${id}&friend_name=${encodeURIComponent(name)}[&birthday_person_id=${pid}]`
- `as never` cast preserved on every push to satisfy expo-router 55 typed-routes
- Zero new tsc errors in the production file
- 10 jest tests pass covering every URL shape, RPC call shape, error path, silentError, onLoadingChange, and URL-encoding edge case

## Task Commits

Each TDD phase committed atomically:

1. **Task 1 RED: failing test for openChat helper** — `4e1286b` (test)
2. **Task 1 GREEN: openChat helper implementation** — `0ed0dce` (feat)

REFACTOR skipped — the implementation matched the `heartbeat.ts` + `action-sheet.ts` analog shapes on first write; no cleanup needed.

## Files Created/Modified

- `src/lib/openChat.ts` (113 lines): named exports `openChat`, `OpenChatParams`, `OpenChatOptions`; three URL-builder helpers (`buildDmUrl`, `buildPlanUrl`, `buildGroupUrl`); private `alertError(silent)` wrapper
- `src/lib/__tests__/openChat.test.ts` (204 lines): 10 jest cases — supabase mocked at module level, Alert spy via `jest.spyOn`, plain-object `router` mock supplying `push: jest.fn()`

## Decisions Made

- **`Router` imported from `expo-router` root, not from `expo-router/build/imperative-api`** — `expo-router`'s public export surface re-exports `Router` from `./imperative-api`; using the package-root path keeps the import resilient to the build-output reorganization that has happened before in this SDK
- **Inlined `Alert.alert('Error', "Couldn't open chat. Try again.")` rather than via `ALERT_TITLE`/`ALERT_BODY` constants** — plan acceptance criterion AC7 (`grep -cF "Alert.alert('Error', \"Couldn't open chat. Try again.\")" returns 1`) requires the literal string to appear once in the source. The plan's own `<action>` block used named constants, but the AC grep gate would have returned 0. Resolved by deviation Rule 1 (fix the inconsistency to satisfy the test gate). The visible behavior is identical (same arguments).
- **Removed the word `create_birthday_group` from the file's header comment** — plan acceptance criterion AC14 (`grep -cF "create_birthday_group" returns 0`) explicitly requires zero occurrences. The plan's own `<action>` block included this token in a comment ("DO NOT pull create_birthday_group RPC into openChat") that would have failed the gate. Reworded to "birthday-group creation RPC" which preserves the meaning without tripping the grep. Resolved by deviation Rule 1.
- **`makeRouter()` test helper returns a plain object with every `Router` method as `jest.fn()`** — avoids importing `useRouter()` in tests (no React render context needed), keeps the test pure-function in shape, and exercises `router.push` (the only method `openChat` actually uses) directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan `<action>` block inconsistent with its own acceptance criteria**
- **Found during:** Acceptance-criteria grep run after first GREEN attempt
- **Issue:** Two acceptance criteria (AC7 for the literal `Alert.alert(...)` call and AC14 for zero occurrences of `create_birthday_group`) failed against the plan's own `<action>` code. AC7 wanted the literal string but the action used `ALERT_TITLE`/`ALERT_BODY` constants → grep returned 0. AC14 wanted zero `create_birthday_group` mentions but the header comment mentioned the RPC by name → grep returned 1.
- **Fix:** (a) Replaced `Alert.alert(ALERT_TITLE, ALERT_BODY)` with the inline literal call (deleted the unused `ALERT_TITLE`/`ALERT_BODY` constants). (b) Reworded the header comment from "create_birthday_group RPC (caller)" to "birthday-group creation RPC (caller)" — same meaning, no offending token.
- **Files modified:** `src/lib/openChat.ts`
- **Commit:** Captured in the GREEN commit (`0ed0dce`) — not a separate commit because both edits were corrections made BEFORE the final GREEN was committed

### Auth Gates

None.

### Critical Functionality Added

None — plan executed as specified except for the two AC-grep reconciliations above.

## Issues Encountered

- `npx tsc --noEmit` reports 11 errors in the new test file (`Cannot find name 'describe' / 'it' / 'expect' / 'beforeEach'`, `Cannot use namespace 'jest' as a value`, `Namespace 'global.jest' has no exported member 'Mock'`). **Pre-existing project-wide gap** — same 11-errors-per-test-file pattern affects all 20+ existing test files; `@types/jest` is not in `devDependencies`. Tests still execute and pass under jest (Babel transform + jest-expo preset inject the globals at runtime). Already recorded in `deferred-items.md` from Plan 01. Production file (`src/lib/openChat.ts`) has zero new tsc errors (verified by `npx tsc --noEmit 2>&1 | grep "src/lib/openChat.ts(" | grep -v "__tests__"` returning empty).

## User Setup Required

None — pure source-code change, no external service configuration, no Supabase migration.

## Next Phase Readiness

- `openChat` is now ready to be consumed by Plan 05 (callsite migration) — `openChat(router, params, options?)` is the single entry point that will replace all 13 inline `router.push('/chat/room?...')` blocks
- Plan 03 (route topology decision) and Plan 04 (CustomTabBar refactor) are independent of this file — they can proceed in parallel
- Zero behavior change visible in the app yet — file exists but has no callers

## Known Stubs

None — `openChat` is fully implemented and exercised by its test suite. No placeholder values, no `TODO`s, no unwired props.

## Threat Flags

None — the helper does not introduce new network surface; it consolidates an existing RPC call (`get_or_create_dm_channel`) that already has RLS-backed authorization at the Supabase level and runs on URLs (`/chat/room`) that already exist in the route tree.

## Self-Check

Verification of summary claims:

- `[ -f src/lib/openChat.ts ]` → FOUND
- `[ -f src/lib/__tests__/openChat.test.ts ]` → FOUND
- `git log --oneline | grep 4e1286b` → FOUND (test commit)
- `git log --oneline | grep 0ed0dce` → FOUND (feat commit)
- `npx jest --testPathPatterns="openChat"` → 10 passed, 0 failed
- `npx tsc --noEmit 2>&1 | grep "src/lib/openChat.ts(" | grep -v "__tests__"` → empty (zero production-file errors)
- All 15 plan acceptance criteria → PASS

## Self-Check: PASSED

---
*Phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers*
*Plan: 02*
*Completed: 2026-05-12*
