---
phase: 17-polls
plan: "04"
subsystem: ui
tags: [react-native, polls, chat, flatlist, bottom-sheet, realtime]

# Dependency graph
requires:
  - phase: 17-01
    provides: useChatRoom sendPoll/lastPollVoteEvent, usePoll hook, Supabase RLS + RPC
  - phase: 17-02
    provides: PollCreationSheet bottom sheet component
  - phase: 17-03
    provides: PollCard component with voting/un-voting UI
provides:
  - MessageBubble isPoll branch — full-width PollCard rendering bypassing bubble layout
  - ChatRoomScreen wired to PollCreationSheet; sendPoll called on sheet submit
  - lastPollVoteEvent threaded from useChatRoom through ChatRoomScreen to MessageBubble to PollCard
  - Context menu gating — Reply and Copy hidden for poll messages; Delete creator-only via existing isOwn gate
affects: [18-stories, any phase touching MessageBubble or ChatRoomScreen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isPoll early-return in MessageBubble before isOwn branch — bypasses 75% maxWidth bubble constraint
    - lastPollVoteEvent bridge — single Realtime signal propagated via prop drilling from hook to leaf component

key-files:
  created: []
  modified:
    - src/components/chat/MessageBubble.tsx
    - src/screens/chat/ChatRoomScreen.tsx
    - src/components/chat/SendBar.tsx
    - src/hooks/useChatRoom.ts
    - src/components/chat/PollCard.tsx

key-decisions:
  - "isPoll early-return placed before isOwn branch to ensure full-width layout bypasses bubble maxWidth: 75% constraint"
  - "onAttachmentAction fires after setMenuVisible(false) in SendBar to avoid iOS modal stacking (two Modals cannot surface simultaneously)"
  - "crypto.randomUUID() replaced with Math.random UUID template — crypto global unavailable in Hermes engine"
  - "poll_id included in UPDATE handler message mapping so sender's optimistic card becomes interactive after RPC resolves"
  - "lastPollVoteEvent gated behind room-membership check to prevent cross-room vote signals"

patterns-established:
  - "isPoll early-return pattern: add before isOwn branch in MessageBubble for any message type needing full-width layout"
  - "Attachment menu modal chain: always fire downstream sheet open in closeMenu callback, never inline, to respect iOS modal lifecycle"

requirements-completed: [CHAT-09, CHAT-10, CHAT-11]

# Metrics
duration: ~40min (tasks) + UAT verification
completed: 2026-04-21
---

# Phase 17 Plan 04: Poll UI Assembly Summary

**Full-width PollCard rendering in MessageBubble plus ChatRoomScreen wire-up to PollCreationSheet — all 8 UAT tests passed after three bug fixes during human verification**

## Performance

- **Duration:** ~40 min (implementation) + human UAT round
- **Started:** 2026-04-21
- **Completed:** 2026-04-21
- **Tasks:** 3 (Task 1: MessageBubble, Task 2: ChatRoomScreen, Task 3: human verification — APPROVED)
- **Files modified:** 5

## Accomplishments

- MessageBubble renders poll messages as full-width PollCard (early-return before isOwn branch), bypassing the 75% maxWidth bubble constraint; Reply and Copy hidden from context menu for poll messages
- ChatRoomScreen wires the "Poll" attachment action to PollCreationSheet; sendPoll called on sheet submit; lastPollVoteEvent threaded to every MessageBubble for live count updates
- Human UAT confirmed all 8 test scenarios: create poll, card rendering, vote, change vote, un-vote, context menu gating, soft-delete, discard

## Task Commits

Each task was committed atomically:

1. **Task 1: MessageBubble isPoll branch** - `cbe7ac8` (feat)
2. **Task 2: ChatRoomScreen wire-up** - `8708086` (feat)
3. **Task 3: Human verification — APPROVED** — no code commit (checkpoint passed)

**Fix commits (UAT bugs):**
- `b90703e` — delay onAttachmentAction until attachment menu closes (iOS modal stacking)
- `d3888f1` — replace crypto.randomUUID with Math.random UUID (Hermes compatibility)
- `f611e40` — CR-01: include poll_id in UPDATE handler; CR-02: scope guard for cross-room votes; WR-02/03: single close path and animated bar reset on un-vote

## Files Created/Modified

- `src/components/chat/MessageBubble.tsx` — isPoll branch: full-width PollCard early-return, context menu gating (Reply/Copy hidden), pollContainer style
- `src/screens/chat/ChatRoomScreen.tsx` — PollCreationSheet import + render, showPollCreationSheet state, handleAttachmentAction 'poll' case, lastPollVoteEvent prop on MessageBubble
- `src/components/chat/SendBar.tsx` — onAttachmentAction now fires after setMenuVisible(false) via closeMenu callback (iOS modal fix)
- `src/hooks/useChatRoom.ts` — Math.random UUID in sendPoll; poll_id in UPDATE handler; lastPollVoteEvent gated behind room-membership check
- `src/components/chat/PollCard.tsx` — animated bar width reset to 0 on un-vote instead of hard setValue

## Decisions Made

- isPoll early-return placed before the isOwn branch so the poll layout bypasses `maxWidth: '75%'` bubble constraints entirely
- onAttachmentAction delayed until after the attachment menu closes in SendBar — two Modals cannot stack simultaneously on iOS; the menu's 200ms close animation blocked PollCreationSheet from surfacing
- `crypto.randomUUID()` replaced with the Math.random UUID template already in use for sendMessage and sendImage — Hermes engine does not expose the `crypto` global
- `poll_id` added to the UPDATE handler message mapping so a poll creator's optimistic card becomes interactive after the `create_poll()` RPC resolves and the INSERT lands
- `lastPollVoteEvent` now checked against the current room before calling setLastPollVoteEvent to prevent votes in other rooms from triggering spurious usePoll re-fetches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] iOS modal stacking — PollCreationSheet never surfaced after attachment menu tap**
- **Found during:** Task 3 (human UAT)
- **Issue:** Tapping "Poll" in the attachment menu opened the creation sheet correctly in theory, but on iOS the sheet never appeared because the attachment menu Modal was still in its 200ms close animation when PollCreationSheet tried to mount
- **Fix:** Moved the `onAttachmentAction(action)` call into the `closeMenu` callback in `SendBar.tsx` so it fires only after `setMenuVisible(false)` is committed
- **Files modified:** `src/components/chat/SendBar.tsx`
- **Committed in:** `b90703e`

**2. [Rule 1 - Bug] crypto.randomUUID() not available in Hermes engine — sendPoll crashed**
- **Found during:** Task 3 (human UAT, poll creation)
- **Issue:** `crypto.randomUUID()` was used in `sendPoll` to generate the optimistic message UUID; Hermes does not expose the `crypto` global, causing a runtime crash
- **Fix:** Replaced with the Math.random-based UUID template already used by `sendMessage` and `sendImage`
- **Files modified:** `src/hooks/useChatRoom.ts`
- **Committed in:** `d3888f1`

**3. [Rule 1 - Bug] CR-01: poll_id missing from UPDATE handler — sender's poll card not interactive**
- **Found during:** Task 3 (code review during UAT)
- **Issue:** The INSERT→UPDATE message reconciliation handler omitted `poll_id`, so the optimistic poll message remained type `'text'` on the sender side after the RPC resolved
- **Fix:** Added `poll_id: payload.new.poll_id` to the UPDATE handler mapping in `useChatRoom.ts`
- **Files modified:** `src/hooks/useChatRoom.ts`
- **Committed in:** `f611e40`

**4. [Rule 1 - Bug] CR-02: lastPollVoteEvent fired for votes in other rooms**
- **Found during:** Task 3 (code review during UAT)
- **Issue:** The `poll_votes` Realtime subscription had no room-membership guard; a vote in any room triggered `setLastPollVoteEvent`, causing spurious usePoll re-fetches in unrelated chat rooms
- **Fix:** Added a room-membership check before calling `setLastPollVoteEvent` in the Realtime handler
- **Files modified:** `src/hooks/useChatRoom.ts`
- **Committed in:** `f611e40`

---

**Total deviations:** 4 auto-fixed (4x Rule 1 bugs)
**Impact on plan:** All four bugs surfaced during UAT and were essential to fix for correct end-to-end behavior. No scope creep.

## Issues Encountered

- iOS modal stacking is a known React Native limitation: two Modals cannot be visible simultaneously; the attachment menu's close animation must complete before a second Modal can surface. Pattern documented for future bottom-sheet-from-menu flows.
- Hermes does not expose `crypto.randomUUID()` — always use the Math.random UUID template for optimistic IDs in this codebase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 17 (Polls) is fully complete: data layer (17-01), PollCreationSheet (17-02), PollCard (17-03), and UI assembly (17-04) all done
- Requirements CHAT-09, CHAT-10, CHAT-11 satisfied and human-verified
- All 6 poll-related files lint clean
- No open stubs; no deferred items

---
*Phase: 17-polls*
*Completed: 2026-04-21*
