---
phase: 17-polls
verified: 2026-04-21T23:00:00Z
status: passed
score: 15/15
overrides_applied: 0
re_verification: false
human_verification:
  - test: "End-to-end poll flow on device/simulator"
    expected: "Create poll, vote, change vote, un-vote, context menu gating, soft-delete, discard all work correctly"
    why_human: "Requires running iOS simulator — all 8 UAT scenarios confirmed approved by human in 17-04-SUMMARY.md Task 3"
    resolution: "APPROVED — human UAT passed during Plan 04 execution (all 8 test scenarios confirmed)"
---

# Phase 17: Polls — Verification Report

**Phase Goal:** Add native polls to campfire chat — users can create a poll from the attachment menu, vote/change/un-vote with optimistic updates, and see live vote counts update via Realtime. Covers requirements CHAT-09, CHAT-10, CHAT-11.
**Verified:** 2026-04-21T23:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `sendPoll(question, options)` inserted into useChatRoom — optimistic message prepended, `create_poll()` RPC called, rollback on failure | VERIFIED | `useChatRoom.ts` lines 553-615: Math.random UUID, optimistic MessageWithProfile prepended, message INSERT then `rpc('create_poll')`, filter rollback on both errors |
| 2 | `usePoll` hook fetches poll data on mount, manages `myVotedOptionId`, exposes `vote`/`unVote` with optimistic update and silent revert | VERIFIED | `usePoll.ts` lines 35-201: `fetchPollData` aggregates polls+poll_options+poll_votes, WR-03 pre-snapshot pattern in both `vote()` and `unVote()`, silent revert on error |
| 3 | `useChatRoom` Realtime channel extended with `poll_votes` INSERT and DELETE handlers; `lastPollVoteEvent` state bridges counts to PollCard | VERIFIED | `useChatRoom.ts` lines 412-422: INSERT+DELETE chained on existing channel; `lastPollVoteEvent` state declared at line 45, set in handlers; cross-room scope guard confirmed (f611e40 fix) |
| 4 | `UseChatRoomResult` interface exports `sendPoll` and `lastPollVoteEvent` | VERIFIED | `useChatRoom.ts` lines 15-26: both fields in interface; lines 780, 784: both in return object |
| 5 | `PollCreationSheet` renders as a bottom sheet modal using Modal + Animated translateY (no @gorhom/bottom-sheet) | VERIFIED | `PollCreationSheet.tsx` line 31: `useRef(new Animated.Value(300))`, Modal with `transparent animationType="none"` |
| 6 | Sheet contains correct elements: header, question input, 2–4 option TextInputs, `+ Add option` row (hidden at 4), × remove for options 3+, Discard Poll + Send Poll buttons | VERIFIED | `PollCreationSheet.tsx` lines 96-162: all elements present; `idx >= 2` gate for remove; `options.length < 4` gate for add-option row |
| 7 | Send Poll button disabled until question non-empty AND all options non-empty (D-04) | VERIFIED | `PollCreationSheet.tsx` line 33: `canSendPoll = question.trim().length > 0 && options.every(o => o.text.trim().length > 0)`; disabled prop at line 148 |
| 8 | `onSend(question, options)` prop called on valid Send Poll tap; `onDismiss` on Discard or backdrop tap | VERIFIED | `PollCreationSheet.tsx` lines 67-70: `handleSend` calls `onSend` then `close()`; backdrop TouchableWithoutFeedback calls `close()` |
| 9 | `PollCard` renders full-width card with correct styling, header (📊 + question), divider, option rows; unvoted state hides bars/counts (D-07); voted state shows animated bars + counts (D-08) | VERIFIED | `PollCard.tsx` lines 66-79: bars and `voteCount` only rendered when `hasVoted`; radio circles always present; `width: '100%'` in card style |
| 10 | Tapping own selected option un-votes; tapping different option changes vote (D-11, D-12, D-13) | VERIFIED | `PollCard.tsx` lines 104-110: `handleOptionTap` calls `unVote()` when `myVotedOptionId === optionId`; calls `vote(optionId)` otherwise; `usePoll.vote()` handles change-vote (delete old + insert new) |
| 11 | `PollCard` handles null `pollId` and `pending=true` with loading skeleton (Pitfall 5) | VERIFIED | `PollCard.tsx` lines 88-94: `!message.poll_id \|\| message.pending` returns `ActivityIndicator` guard |
| 12 | `lastPollVoteEvent` prop passed to `usePoll` to trigger count refresh for other participants (D-14) | VERIFIED | `PollCard.tsx` line 85: `usePoll(message.poll_id, lastPollVoteEvent)`; `usePoll.ts` lines 95-99: re-fetch effect keyed on `lastPollVoteEvent` when `pollId` matches |
| 13 | `MessageBubble` renders `PollCard` (full-width, not bubble-aligned) when `message_type === 'poll'`; context menu hides Reply and Copy for poll messages | VERIFIED | `MessageBubble.tsx` lines 236, 268, 278, 310-327: `isPoll` flag; Reply gated behind `!isPoll`; Copy gated behind `!isImage && !isPoll`; early-return before `isOwn` branch bypasses 75% maxWidth bubble |
| 14 | `ChatRoomScreen`: `handleAttachmentAction('poll')` opens `PollCreationSheet`; `sendPoll` and `lastPollVoteEvent` destructured from `useChatRoom` and threaded to `MessageBubble` | VERIFIED | `ChatRoomScreen.tsx` lines 61, 64, 80, 137-138, 286, 322-327: all wiring present |
| 15 | Human verification confirms end-to-end flow: create poll → poll appears in chat → vote → see counts → change vote → un-vote | VERIFIED (human) | 17-04-SUMMARY.md Task 3: human checkpoint APPROVED — all 8 UAT scenarios passed on simulator |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/usePoll.ts` | Poll fetch + optimistic vote/change-vote/un-vote + PollState type | VERIFIED | 201 lines; exports `usePoll`, `PollState`, `PollOption`; WR-03 pattern confirmed; 4x `from('poll_votes')` calls |
| `src/hooks/useChatRoom.ts` | `sendPoll()`, `lastPollVoteEvent`, poll_votes Realtime listeners | VERIFIED | 787 lines; `sendPoll` at line 553; `lastPollVoteEvent` state + return; INSERT/DELETE listeners chained at lines 413-422 |
| `src/components/chat/PollCreationSheet.tsx` | Poll creation bottom sheet modal | VERIFIED | 191 lines; exports `PollCreationSheet`; Modal+Animated pattern; full option management |
| `src/components/chat/PollCard.tsx` | Full-width poll card with voted/unvoted states and animated progress bars | VERIFIED | 215 lines; exports `PollCard`; `OptionRow` declared before `PollCard`; Animated.timing progress bars; null guard; footer pluralisation |
| `src/components/chat/MessageBubble.tsx` | `isPoll` branch — full-width PollCard rendering with context menu gating | VERIFIED | 24KB; `isPoll` declared, early-return renders `PollCard`, Reply+Copy gated, `pollContainer` style at line 744 |
| `src/screens/chat/ChatRoomScreen.tsx` | Poll creation sheet wire-up; `sendPoll` + `lastPollVoteEvent` wired to FlatList items | VERIFIED | 12KB; all 5 required changes present; `showPollCreationSheet` state; `action === 'poll'` handler |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `useChatRoom.ts` | `supabase.rpc('create_poll')` | `sendPoll()` Step 2 after message insert | VERIFIED | Line 601: `supabase.rpc('create_poll', { p_message_id, p_question, p_options })` |
| `useChatRoom.ts` | `poll_votes` table | `postgres_changes` INSERT/DELETE on existing Realtime channel | VERIFIED | Lines 415, 420: chained before `.subscribe()` on existing channel — no new channel created |
| `usePoll.ts` | `supabase poll_votes` | insert + delete for vote/change/un-vote | VERIFIED | 4x `from('poll_votes')`: fetch (line 56), delete in unVote (line 127), delete in vote (line 177), insert in vote (line 189) |
| `PollCreationSheet.tsx` | `ChatRoomScreen.tsx` | `onSend(question, options[])` prop — caller invokes `sendPoll()` | VERIFIED | `ChatRoomScreen.tsx` line 326: `sendPoll(question, options).then(...)` in `onSend` callback |
| `PollCard.tsx` | `usePoll.ts` | `usePoll(message.poll_id, lastPollVoteEvent)` hook call | VERIFIED | `PollCard.tsx` line 85: direct hook invocation |
| `PollCard.tsx` | vote state | `pollState.myVotedOptionId` controls render path | VERIFIED | `PollCard.tsx` lines 66, 79, 104-109: `hasVoted` and `isSelected` derived from `myVotedOptionId` |
| `ChatRoomScreen.tsx` | `MessageBubble.tsx` | `lastPollVoteEvent` prop on every MessageBubble | VERIFIED | `ChatRoomScreen.tsx` line 286: `lastPollVoteEvent={lastPollVoteEvent}` on every rendered bubble |
| `MessageBubble.tsx` | `PollCard.tsx` | `isPoll` early-return renders `<PollCard>` | VERIFIED | `MessageBubble.tsx` lines 310-327: early-return before `isOwn` branch, passes all three required props |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `PollCard.tsx` | `pollState` | `usePoll` → Supabase queries on `polls`, `poll_options`, `poll_votes` | Yes — three sequential queries aggregate real DB rows | FLOWING |
| `usePoll.ts` | `pollState` | `fetchPollData()` → `supabase.from('polls')`, `from('poll_options')`, `from('poll_votes')` | Yes — no static returns; data aggregated from live DB tables | FLOWING |
| `useChatRoom.ts` | `messages` (poll entries) | `fetchMessages()` + Realtime INSERT/UPDATE handlers; `sendPoll()` prepends optimistic then reconciles via UPDATE | Yes — INSERT→UPDATE reconciliation with `poll_id` field (f611e40 fix) | FLOWING |

---

### Behavioral Spot-Checks

Spot-checks requiring a running simulator are covered by the human UAT checkpoint in Plan 04 (all 8 scenarios approved). Module-level checks:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `usePoll` exports 3 symbols | `grep -c "export function usePoll\|export interface PollState\|export interface PollOption" usePoll.ts` | 3 | PASS |
| `PollCard` export present | `grep -c "export function PollCard"` | 1 | PASS |
| `PollCreationSheet` export present | `grep -c "export function PollCreationSheet"` | 1 | PASS |
| `sendPoll` in interface + return | `grep -c "sendPoll" useChatRoom.ts` | 9 matches | PASS |
| `poll_votes` Realtime listeners (2 events) | `grep -c "table: 'poll_votes'"` | 2 | PASS |
| Commit hashes documented in summaries | `git log --oneline <hashes>` | All 9 hashes resolve | PASS |

**Step 7b: Simulator-dependent tests SKIPPED** — covered by human UAT approval in 17-04-SUMMARY.md.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CHAT-09 | Plans 01, 02, 04 | User can create a poll (2–4 options, single-choice) via the chat attachment menu | SATISFIED | `PollCreationSheet` (Plan 02): bottom sheet with 2–4 option inputs, validation gate; `ChatRoomScreen` (Plan 04): `action === 'poll'` opens sheet; `sendPoll()` (Plan 01): two-step message insert + RPC |
| CHAT-10 | Plans 01, 03, 04 | User can vote on a poll; their selection is shown; they can change their vote | SATISFIED | `usePoll.vote()` (Plan 01): optimistic update + DB write + change-vote delete-then-insert; `PollCard` (Plan 03): `●`/`○` radio visual, `handleOptionTap` delegates to `vote()`/`unVote()`; human UAT verified |
| CHAT-11 | Plans 01, 03, 04 | Poll shows live vote counts visible to all participants | SATISFIED | `poll_votes` Realtime INSERT/DELETE in `useChatRoom` (Plan 01) fires `setLastPollVoteEvent`; bridged via prop drill to `usePoll` (Plan 03) which re-fetches counts; human UAT verified |

All three requirement IDs from PLANS match REQUIREMENTS.md Phase 17 assignment. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ChatRoomScreen.tsx` | 140 | `Alert.alert('Coming Soon', ...)` | Info | Fallback for future attachment actions other than 'poll' and 'split'; not triggered for polls — not a stub |
| `PollCreationSheet.tsx` | 102-116 | `placeholder="Ask the group…"` / `placeholder={\`Option ${idx+1}\`}` | Info | Valid TextInput UI placeholders — not stub indicators |

No blockers. No warnings. The "Coming Soon" alert is intentional scaffolding for future attachment types (photo, etc. are handled via separate props; this is the unrecognised-action fallback).

---

### Notable Fixes Applied During Execution

Four bugs surfaced during human UAT and fixed atomically:

1. **iOS modal stacking** (b90703e) — `SendBar.tsx` now fires `onAttachmentAction` inside `closeMenu()` callback, after the attachment sheet's 200ms close animation. Documents a pattern for future bottom-sheet-from-menu flows.
2. **Hermes `crypto.randomUUID()` unavailable** (d3888f1) — `sendPoll` uses Math.random UUID template consistent with `sendMessage`/`sendImage`.
3. **`poll_id` missing from UPDATE reconciliation handler** (f611e40) — sender's optimistic poll card now becomes interactive after `create_poll()` RPC resolves.
4. **Cross-room `lastPollVoteEvent` signals** (f611e40) — room-membership check added before `setLastPollVoteEvent`; votes in unrelated rooms no longer trigger spurious re-fetches.

All fixes are committed. No open issues remain.

---

### Human Verification Required

Human UAT was completed during Plan 04 execution. All 8 test scenarios were approved on iOS simulator:

1. Poll creation sheet opens from attachment menu (CHAT-09)
2. Poll card renders correctly in unvoted state (CHAT-09, CHAT-10)
3. Voting updates card to voted state with animated bars (CHAT-10)
4. Change vote works (D-12)
5. Un-vote returns card to unvoted state (D-13)
6. Context menu: Reply and Copy hidden; Delete visible to creator (D-10)
7. Soft-delete replaces poll card with "Message deleted." (D-16)
8. Discard Poll closes sheet without creating a poll; fresh state on reopen (D-02)

**This phase requires no further human verification.** UAT gate was met during execution.

---

## Gaps Summary

No gaps. All 15 must-have truths verified, all 6 artifacts exist and are substantive, all 8 key links wired and data-flowing. Requirements CHAT-09, CHAT-10, and CHAT-11 are fully satisfied. Human UAT approved during Plan 04 execution.

---

_Verified: 2026-04-21T23:00:00Z_
_Verifier: Claude (gsd-verifier)_
