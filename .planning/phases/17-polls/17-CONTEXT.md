# Phase 17: Polls - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow users to create a single-choice poll in any chat channel (plan group chat, DM, or group DM) via the attachment menu, vote on it, change or remove their vote, and see live per-option vote counts. Polls are a distinct message type — not a text bubble.

**In scope:** Poll creation sheet, `create_poll()` RPC call, `useChatRoom.sendPoll()` function, `PollCard` component, `usePoll` hook for vote/change/un-vote, live counts via Supabase Realtime, soft-delete via existing context menu, MessageBubble branching for `message_type: 'poll'`.

**Out of scope:** Poll expiry/closing, anonymous voting, multi-choice polls, poll results export, replies to polls (no `reply_to_message_id` for poll messages).

</domain>

<decisions>
## Implementation Decisions

### Poll creation flow (D-01 through D-04)
- **D-01:** Tapping "Poll" in the SendBar attachment menu opens a **bottom sheet modal** over the chat — same presentation layer as the attachment action sheet, consistent with the rest of the Phase 15/16 modal overlay pattern. Navigation to a separate screen is NOT used.
- **D-02:** The creation sheet contains: a text input for the question ("Ask the group…" placeholder), and option input rows below (labeled "Option 1", "Option 2", etc.), a "+ Add option" row, and Cancel / Send Poll buttons.
- **D-03:** Option management: **start with 2 pre-filled empty fields**. "+ Add option" appears below as long as fewer than 4 options exist — disappears when the 4th is added. Each option row (3+) shows a × remove button (removes that row, minimum 2 options enforced). Options 1 and 2 cannot be removed.
- **D-04:** Validation: question must be non-empty; all visible option fields must be non-empty before Send Poll is enabled. Send Poll button is disabled (greyed) until validation passes.

### Poll card visual design (D-05 through D-10)
- **D-05:** A poll message renders as a **full-width card** — not a bubble aligned left/right. It spans the full usable chat width (same horizontal extent as the message list container), with consistent horizontal padding from the existing chat layout.
- **D-06:** Card header: 📊 emoji + bold question text. A visual separator (thin divider line) between the header and option rows.
- **D-07:** **Before the user votes:** Options render as tappable rows with unfilled radio circles (○) and label text only. No bars, no counts. Encourages unbiased choice.
- **D-08:** **After the user votes:** Each option shows: radio circle (● filled accent for selected, ○ empty for others), label text, a progress bar, and a vote count (integer). The selected option's bar uses `COLORS.interactive.accent` (or equivalent accent token); unselected options use a muted grey bar. The transition from unvoted → voted state updates optimistically.
- **D-09:** Card footer: "N votes" (total vote count across all options). Sender is already visible via the message timestamp/avatar — no "sent by X" needed.
- **D-10:** Reactions and long-press context menu apply to poll cards the same as other message types. "Copy" is hidden (no text to copy). "Reply" is hidden (polls cannot be quoted). "Delete" is visible only to the poll creator (soft-delete: card becomes "Message deleted" placeholder, same as Phase 14 D-05).

### Voting behavior (D-11 through D-14)
- **D-11:** Tapping an option row casts the user's vote on that option. **Optimistic update** — local state updates immediately; DB write happens async; silent revert on failure (same pattern as reactions, Phase 15).
- **D-12:** **Changing vote:** Tapping a *different* option while already voted swaps the vote immediately (no confirmation dialog). The old selection un-fills, the new one fills. One DB operation: delete old `poll_votes` row, insert new one (or use `upsert` on the `poll_votes` table if it supports it — planner's discretion).
- **D-13:** **Un-voting:** Tapping the *currently selected* option removes the vote. The card returns to the unvoted display state (no bars, no counts visible to the user). Other participants still see counts based on remaining votes.
- **D-14:** Live vote count updates for other participants use the **existing Supabase Realtime channel** in `useChatRoom` extended to also listen for `poll_votes` INSERT and DELETE events (same channel extension pattern as reactions in Phase 15 D-06). No separate subscription.

### Poll lifecycle (D-15 through D-16)
- **D-15:** Polls are **always open** — no closing or expiry mechanism. Votes can be changed or removed at any time.
- **D-16:** Deletion follows the existing soft-delete pattern (Phase 14 D-05): long-press → Delete (creator only) → `message_type` set to `'deleted'`, body set to NULL. The `PollCard` is replaced by the "Message deleted" greyed placeholder. The `polls`, `poll_options`, and `poll_votes` rows are NOT deleted from the DB — only the message is soft-deleted.

### Claude's Discretion
- Exact progress bar height, corner radius, and animation duration when switching from unvoted → voted state.
- Whether `sendPoll()` calls `create_poll()` RPC directly or uses a thin wrapper in `useChatRoom`.
- Whether the vote count in each option row shows before or after the bar (layout detail).
- Keyboard avoidance behavior in the poll creation sheet.
- Whether the poll creation sheet uses `react-native-modal`, Expo's `Modal`, or `BottomSheetModal` from `@gorhom/bottom-sheet` — use whatever bottom sheet primitive is already installed in the project.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs for this phase.

### Schema
- `src/types/chat.ts` — `MessageType` includes `'poll'`; `Message.poll_id` field already present
- `src/types/database.ts` — `polls`, `poll_options`, `poll_votes` table types from Phase 12 migration

### Existing entry point
- `src/components/chat/SendBar.tsx` — `AttachmentAction = 'poll'` already defined; `onAttachmentAction` prop already wired
- `src/screens/chat/ChatRoomScreen.tsx:112` — `handleAttachmentAction` currently shows "Coming Soon" for `poll` — this is the wire-in point

### Prior phase patterns to follow
- `.planning/phases/15-message-reactions/15-CONTEXT.md` — Realtime channel extension pattern (D-06), optimistic update (D-07)
- `.planning/phases/14-reply-threading/14-CONTEXT.md` — soft-delete (D-05), context menu structure (D-01 through D-04), MessageBubble message_type branching
- `.planning/phases/16-media-sharing/16-CONTEXT.md` — `sendImage()` pattern in `useChatRoom` (D-07), optimistic pending insert

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/chat/SendBar.tsx` — `AttachmentAction = 'poll'` and `onAttachmentAction` prop already defined; no changes needed to SendBar itself
- `src/components/chat/MessageBubble.tsx` — `message_type` branching for `'image'` established in Phase 16; `'poll'` branch is next
- `src/hooks/useChatRoom.ts` — `sendMessage()`, `sendImage()` patterns; Realtime channel extension already done for reactions and image types; `sendPoll()` follows same shape
- `create_poll()` SECURITY DEFINER RPC — exists from Phase 12; takes question + options array, returns poll_id; must be used instead of direct table inserts (RLS enforcement)

### Established Patterns
- Optimistic update: insert placeholder into `messages` state → async DB write → update/revert on result (Phases 15, 16)
- `setMessages(prev => ...)` inside updater for all state mutations — no stale closure reads (WR-03 fix from Phase 16)
- Realtime channel: single `supabase.channel()` per chat room, extended with additional `.on()` listeners per event type
- `message_type: 'deleted'` soft-delete: body = NULL — no migration needed

### Integration Points
- `ChatRoomScreen.tsx:112` `handleAttachmentAction('poll')` → open poll creation sheet
- `MessageBubble.tsx` → `message_type === 'poll'` → render `<PollCard message={message} />`
- `useChatRoom` Realtime channel → add `poll_votes` INSERT/DELETE listeners

</code_context>

<specifics>
## Specific Ideas

- Full-width card (not a bubble) explicitly chosen — distinct visual from text and image messages
- No bars/counts before voting to avoid biasing the group's choices — deliberate product decision
- Tap own option to un-vote — the poll returns to clean unvoted state for that user

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-polls*
*Context gathered: 2026-04-21*
