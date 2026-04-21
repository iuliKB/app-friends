---
phase: 17-polls
plan: "01"
subsystem: api
tags: [supabase, realtime, hooks, optimistic-updates, polls, typescript]

# Dependency graph
requires:
  - phase: 12-schema-foundation
    provides: polls/poll_options/poll_votes tables, create_poll() SECURITY DEFINER RPC
  - phase: 16-media-sharing
    provides: useChatRoom sendImage pattern, body:null as any cast, WR-03 stale closure fix
provides:
  - usePoll hook: fetch poll data, vote/change-vote/un-vote with optimistic updates and WR-03 fix
  - useChatRoom.sendPoll(): two-step message insert + create_poll() RPC
  - useChatRoom.lastPollVoteEvent: bridge state for Realtime count refresh to PollCard
  - poll_votes INSERT/DELETE Realtime listeners on existing channel
affects: [17-02, 17-03, 17-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WR-03 pre-snapshot inside setPollState updater (mirrors addReaction stale closure fix)"
    - "lastPollVoteEvent bridge: useChatRoom Realtime event signals usePoll to re-fetch without separate subscription"
    - "Two-step sendPoll: messages.insert FIRST then create_poll() RPC (enforced by Pitfall 1 order)"
    - "Client-side scope guard for poll_votes: findIndex(m => m.poll_id === incomingPollId)"

key-files:
  created:
    - src/hooks/usePoll.ts
  modified:
    - src/hooks/useChatRoom.ts

key-decisions:
  - "poll_votes Realtime via postgres_changes on existing channel (D-14) — no new subscription created"
  - "vote() handles both first-vote and change-vote; tap-same-option delegates to unVote()"
  - "Scope guard for poll_votes events uses messages.poll_id lookup (T-17-06 client filter)"

patterns-established:
  - "lastPollVoteEvent pattern: Realtime event in useChatRoom signals child hook to re-fetch without duplicate subscription"

requirements-completed: [CHAT-09, CHAT-10, CHAT-11]

# Metrics
duration: 25min
completed: 2026-04-21
---

# Phase 17 Plan 01: Polls Data Layer Summary

**usePoll hook (fetch + optimistic vote/change/un-vote with WR-03 fix) and useChatRoom extended with sendPoll() two-step RPC and poll_votes Realtime listeners bridged via lastPollVoteEvent**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-21T20:30:00Z
- **Completed:** 2026-04-21T20:55:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `usePoll.ts` with `PollState`/`PollOption` types, `fetchPollData` aggregating all three poll tables, and `vote()`/`unVote()` with WR-03 pre-snapshot pattern for stale closure safety
- Extended `useChatRoom` with `sendPoll()` following the `sendImage()` two-step shape: message row insert first, then `create_poll()` RPC
- Added `handlePollVoteInsert`/`handlePollVoteDelete` handlers chained on the existing Realtime channel with dedup (own-event skip) and cross-room scope guard
- Established `lastPollVoteEvent` bridge: Realtime events in `useChatRoom` signal `usePoll` to re-fetch without creating a second subscription per poll

## Task Commits

1. **Task 1: Create usePoll hook** - `62a5851` (feat)
2. **Task 2: Extend useChatRoom — sendPoll + poll_votes Realtime** - `7e4f392` (feat)

## Files Created/Modified

- `src/hooks/usePoll.ts` — New hook: PollState/PollOption types, fetch + optimistic vote/unVote with WR-03 fix, lastPollVoteEvent bridge effect
- `src/hooks/useChatRoom.ts` — Extended: sendPoll(), lastPollVoteEvent state, handlePollVoteInsert/Delete, UseChatRoomResult interface additions

## Decisions Made

- poll_votes Realtime uses postgres_changes on the existing channel (D-14) — no second subscription created per poll card
- `vote()` handles first-vote, change-vote, and delegates same-option tap to `unVote()` — callers always call `vote(optionId)`
- Client-side scope guard for poll_votes events: `messages.findIndex(m => m.poll_id === incomingPollId)` (T-17-06 accept disposition)
- `lastPollVoteEvent` bridges Realtime → usePoll: only re-fetches when `lastPollVoteEvent.pollId === pollId`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Prettier auto-fixed trailing comma in `usePoll.ts` function signature and multi-line formatting in `useChatRoom.ts` return object — both corrected via `npx expo lint --fix` with zero logic changes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Data contracts established: `PollState`, `PollOption`, `usePoll`, `sendPoll`, `lastPollVoteEvent` all exported and typed
- Plans 02–04 can proceed as pure UI work: `PollCreationSheet`, `PollCard`, `MessageBubble` poll branch, `ChatRoomScreen` wire-up
- No blockers

---
*Phase: 17-polls*
*Completed: 2026-04-21*
