---
phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-
plan: 01
subsystem: api
tags: [chat, supabase, tanstack-query, last-entry-preview, message-types]

requires:
  - phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre
    provides: useChatList migrated to useQuery; queryKeys.chat.list(userId) cache key; ChatListItem already in src/types/chat.ts

provides:
  - "ChatListItem.lastMessageKind: MessageType (REQUIRED) — discriminator for UI per-kind preview"
  - "ChatListItem.lastMessageSenderName: string | null (REQUIRED) — 'You' for self, derived first-name token for others, null when chat has no messages"
  - "useChatList queryFn widened to SELECT message_type/image_url/poll_id from messages in all 3 branches (plan/dm/group)"
  - "Batched profiles fetch (1 SELECT keyed by sender_ids) for first-name resolution"
  - "Batched polls fetch (1 SELECT keyed by latest poll_ids) for 'Poll: <question>' previews"
  - "Per-kind preview formatter: 'Photo' / 'Poll: <q>' / 'To-do: <body>' / 'Message deleted'"

affects: [32-02-last-entry-preview-ui, 32-03-chat-list-reactivity, 32-04-send-reliability]

tech-stack:
  added: []
  patterns:
    - "Per-kind discriminator + formatter at the data layer; UI renders via switch on lastMessageKind (Plan 32-02)"
    - "Batched lookup map (sender_id Set + first-name Map; poll_id Set + question Map) avoids N+1 and respects RLS via in('id', [...])"
    - "(supabase as any) cast for tables not yet in generated database.ts types — same convention used by usePoll.ts and Phase 29.1 hooks"

key-files:
  created: []
  modified:
    - src/types/chat.ts
    - src/hooks/useChatList.ts
    - src/hooks/__tests__/useChatList.test.ts

key-decisions:
  - "first_name derived from display_name (split on first whitespace) — schema lacks dedicated first_name column"
  - "polls follow-up SELECT keyed by latest-message poll_id Set — avoids over-fetching unrelated polls"
  - "(supabase as any) cast used for the polls table — generated database.ts does not yet include polls; same pattern as usePoll.ts:61"
  - "lastMessageKind + lastMessageSenderName are REQUIRED fields (not optional) — null is a legitimate value in the no-messages branch; avoids consumer 'forgot to check' bugs"

patterns-established:
  - "Per-kind preview text contract owned by the hook (data layer); icon mapping owned by Plan 32-02 (UI layer)"
  - "Batch-fetch maps for cross-row joins inside a queryFn — use Set<string> collectors then one .in('id', [...]) SELECT each"

requirements-completed: []

duration: ~10min
completed: 2026-05-13
---

# Phase 32 Plan 01: Last-entry preview data layer Summary

**Extended useChatList to SELECT message_type/image_url/poll_id, batch-join polls(question) + profiles(display_name), and emit lastMessageKind + lastMessageSenderName for every chat row across plan/dm/group scopes.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-13T13:04:14Z (precursor docs commit 47c24c3)
- **Completed:** 2026-05-13T13:13:21Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `ChatListItem` extended with two new required fields (`lastMessageKind`, `lastMessageSenderName`) — Plan 32-02 has the contract it needs to render kind-aware previews
- Three `messages` SELECTs widened to carry the discriminator columns; non-text rows no longer flatten to blank `body`
- One batched `profiles` SELECT and one batched `polls` SELECT added — avoids N+1 across N chat rows
- 7 new tests cover all 6 message kinds (text, image, poll, todo, deleted, system fallback) plus the no-messages group branch and the "You" sender attribution

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ChatListItem type** — `66e20d3` (feat)
2. **Task 2: Widen useChatList queryFn** — `def1ad5` (feat)
3. **Task 3: Extend useChatList tests** — `6e63450` (test)

(Plan metadata commit will be added by the orchestrator after this Summary lands.)

## Files Created/Modified
- `src/types/chat.ts` — added `lastMessageKind: MessageType` and `lastMessageSenderName: string | null` to `ChatListItem`
- `src/hooks/useChatList.ts` — widened `MsgEntry`, widened all 3 messages SELECTs, added Step F1 (batched profiles) + Step F2 (batched polls), added `previewForLatest` + `senderNameForLatest` helpers, rewrote all 3 item-push sites
- `src/hooks/__tests__/useChatList.test.ts` — added `setupRouting()` helper plus a new `describe` block with 7 cases covering the per-kind preview contract

## Per-kind preview text mapping (verbatim from CONTEXT.md §2)

| `message_type` | `lastMessage` value emitted by the queryFn |
|---|---|
| `text` | `body` as-is |
| `image` | `"Photo"` |
| `poll` | `"Poll: <polls.question>"` (or `"Poll"` if the join misses) |
| `todo` | `"To-do: <body>"` (or `"To-do"` if body is empty) |
| `system` | `body` as-is |
| `deleted` | `"Message deleted"` |
| _(no messages — group branch only)_ | `"No messages yet"` with `lastMessageKind: 'text'`, `lastMessageSenderName: null` |

## Sender attribution

- `latest.sender_id === currentUserId` → `lastMessageSenderName: 'You'`
- otherwise → `lastMessageSenderName: <first-name token>` (derived from `profiles.display_name`)
- chat has no messages → `lastMessageSenderName: null`

The hook emits a NAME ONLY — it does NOT prepend `"You: "` or `"<FirstName>: "` to `lastMessage`. That composition lives in Plan 32-02's UI refactor.

## Profile / poll batch-fetch strategy

- **Profiles (Step F1):** Collect every `latest.sender_id` from the three message maps into `Set<string>`, drop `currentUserId` (own messages are formatted to `"You"` without a fetch), then ONE `.from('profiles').select('id, display_name').in('id', [...])` SELECT.
- **Polls (Step F2):** Collect every `latest.poll_id` whose `latest.message_type === 'poll'` into `Set<string>`, then ONE `.from('polls').select('id, question').in('id', [...])` SELECT.
- Both lookups respect RLS — `.in('id', [...])` cannot reach rows the user is not allowed to read, and the IDs collected are sourced from `messages` rows the user already filtered to.

## Decisions Made

- Required (not optional) fields on `ChatListItem` — `null` is a legitimate value in the no-messages branch, so a `string | null` required field is the type-safe representation; an optional `?:` would let consumers forget to check.
- Hook emits `lastMessageSenderName` as a NAME (no colon, no prefix) — Plan 32-02 owns the `"<FirstName>: "` composition.
- Batched profiles/polls fetches over per-row joins — one SELECT each, scales to any number of chats without N+1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] / [Rule 3 - Blocking] `profiles.first_name` column does not exist in schema**
- **Found during:** Task 2 (widening Step F1 batch fetch)
- **Issue:** Plan locked decisions and PATTERNS.md both reference `.select('id, first_name')` against `profiles`, but migrations 0001 + 0017 + 0023 ship only `display_name` (full name). The acceptance criterion `grep -n "select('id, first_name')"` was therefore unachievable, and the literal query would have been a runtime no-op (returning rows with `undefined` first_name) plus a compile-time `SelectQueryError` from the typed Supabase client.
- **Fix:** Switched to `.select('id, display_name')` and derived a first-name token client-side via `displayName.trim().split(/\s+/)[0]` — honours CONTEXT.md §3's "<FirstName>: " UX intent against the live schema. Empty / whitespace-only display_name maps to `null` (consumer treats as "no sender info").
- **Files modified:** `src/hooks/useChatList.ts` (Step F1 block)
- **Verification:** `npx tsc --noEmit -p .` reports zero errors in `useChatList.ts`; the 7 new tests assert `lastMessageSenderName` matches the expected first token (Alice, Bob, Charlie, Dana, Eve).
- **Committed in:** `def1ad5` (Task 2 commit)
- **AC impact:** The plan AC line `grep -n "select('id, first_name')"` returns **zero matches** (not "exactly one"). This is the only AC that did not pass literally; the spirit of the requirement (one batched profile SELECT for sender attribution) is met by `.select('id, display_name')` instead.

**2. [Rule 3 - Blocking] `polls` table not present in generated `src/types/database.ts`**
- **Found during:** Task 2 (Step F2 batch fetch — the polls join)
- **Issue:** The generated Supabase `Database` type union does not include `polls`, so `supabase.from('polls').select('id, question').in('id', [...])` produced `SelectQueryError<"column 'id' does not exist on 'plans'." | ...>` and three TS errors. database.ts regeneration is deferred per Phase 29.1 Plan 05 SUMMARY (still local-only).
- **Fix:** Used `(supabase as any).from('polls')...` cast — same pattern as `src/hooks/usePoll.ts:61` and the Phase 29.1 hooks. Wrapped the result in a typed cast `as Array<{ id: string; question: string }>` for the consumer loop so downstream usage stays type-safe.
- **Files modified:** `src/hooks/useChatList.ts` (Step F2 block)
- **Verification:** `npx tsc --noEmit -p .` reports zero errors in `useChatList.ts`; the poll test case asserts the joined `Pizza?` question is rendered as `"Poll: Pizza?"`.
- **Committed in:** `def1ad5` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 schema-mismatch bug, 1 untyped-table blocker)
**Impact on plan:** Both auto-fixes were necessary to make the plan compile and run. Neither expanded the scope. Plan acceptance for `select('id, first_name')` exact-text grep does not pass; Plan 32-02 should consume `lastMessageSenderName` directly without checking the SELECT shape. All other ACs pass verbatim.

## Issues Encountered

- The shared `makeChain` test mock returns the same row array for every `from()` call, which would have collapsed the multi-table fanout in the new tests. Added a `setupRouting()` helper that routes by table name (`plan_members`, `dm_channels`, `messages`, `profiles`, `group_channel_members`, `group_channels`, `chat_preferences`, `polls`) — kept the existing `makeChain` for the original 3 tests so they stay byte-identical.

## Test count delta

- Pre-change: **3 passing** in `src/hooks/__tests__/useChatList.test.ts`
- Post-change: **10 passing** in `src/hooks/__tests__/useChatList.test.ts`
- Delta: **+7** (matches plan AC: pass count after >= original + 7)

## Test verification (current)

```
$ npx jest src/hooks/__tests__/useChatList.test.ts --runInBand --no-coverage
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

## TypeScript verification (modified files)

```
$ npx tsc --noEmit -p .
# Zero new errors in src/types/chat.ts, src/hooks/useChatList.ts, src/components/chat/ChatListRow.tsx, src/screens/chat/ChatListScreen.tsx
# (Project-wide pre-existing 'Cannot use namespace jest as a value' errors in test files are unrelated to this plan and out of scope per CLAUDE.md guidance.)
```

## Next Phase Readiness

- **Plan 32-02 (UI refactor)** can now consume `chatList[i].lastMessageKind` (typed `MessageType`) and `chatList[i].lastMessageSenderName` (typed `string | null`) directly from `useChatList()`. The data half of "icon + sender prefix + per-kind text" is shipped; Plan 32-02 owns the rendering half.
- **Plans 32-03 (subscription) and 32-04 (send reliability)** are independent of this plan's data shape change — they invalidate `queryKeys.chat.list(userId)` regardless of what columns the queryFn returns.

## Self-Check: PASSED

Verified via `git log --oneline` and `[ -f ... ]`:

- ✓ `src/types/chat.ts` exists and contains both new fields
- ✓ `src/hooks/useChatList.ts` exists with `previewForLatest`, `senderNameForLatest`, `from('polls')`, and 3 widened SELECTs
- ✓ `src/hooks/__tests__/useChatList.test.ts` exists with `setupRouting` helper and 7 new tests
- ✓ Commit `66e20d3` (Task 1) present in `git log`
- ✓ Commit `def1ad5` (Task 2) present in `git log`
- ✓ Commit `6e63450` (Task 3) present in `git log`

---
*Phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-*
*Plan: 01 — Last-entry preview data layer*
*Completed: 2026-05-13*
