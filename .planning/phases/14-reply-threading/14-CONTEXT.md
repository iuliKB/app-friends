# Phase 14: Reply Threading - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver reply threading in the chat room: long-press context menu on any bubble, inline quoted reply composition, quoted block in the sent reply bubble, and scroll-to-original with highlight. Also includes Copy text and Delete own message from the context menu.

**In scope:** `MessageBubble` long-press overlay, reply preview bar in `SendBar`, quoted block rendering in bubbles, scroll-to-original with highlight flash, message delete (soft placeholder), copy to clipboard. Hook changes to `useChatRoom` (`sendMessage` signature, delete RPC).

**Out of scope:** Reactions (Phase 15), image/media messages (Phase 16), nested thread views (flat quoted-reply only), pagination/message loading beyond current window.

</domain>

<decisions>
## Implementation Decisions

### Context menu — trigger and presentation (D-01 through D-04)
- **D-01:** Long-press on any `MessageBubble` opens an inline overlay — a floating pill/toolbar that appears directly above the tapped bubble, like iMessage. Implemented as an absolutely-positioned `View` overlaid on the bubble via a `Modal` or in-place conditional render with `zIndex`.
- **D-02:** Short tap behavior is unchanged — tap still shows the timestamp (2.5s fade). Both gestures coexist on the `TouchableOpacity`. Long-press adds `onLongPress` prop alongside existing `onPress`.
- **D-03:** Context menu actions: **Reply** + **Copy text** + **Delete** (own messages only). Delete is gated: only visible when `isOwn === true`. Copy and Delete are in scope for this phase despite adding scope — user confirmed.
- **D-04:** Context menu dismisses on tap-outside (backdrop overlay or `onBlur`).

### Message delete behavior (D-05, D-06)
- **D-05:** Deleting a message performs a **soft delete**: body is set to `NULL` and a new field (or existing convention) marks it as deleted. The bubble remains visible to all participants with body replaced by greyed "Message deleted" placeholder text.
- **D-06:** Replies that quote a deleted message (where `reply_to_message_id` is non-null but the original is soft-deleted) show "Original message deleted" in the quoted block. This is consistent with Phase 12 D-07 (`ON DELETE SET NULL` schema behavior — if hard delete were used, FK would null the reply's `reply_to_message_id`; soft delete keeps it intact but marks the body as deleted).

### Quoted block in reply bubble (D-07 through D-09)
- **D-07:** Quoted block visual style: **left accent border** (Telegram/WhatsApp pattern). A colored vertical bar on the left edge of the block, sender name above truncated preview text. Sits above the reply body text inside the same bubble.
- **D-08:** Accent bar color is **sender-tinted** — Claude's discretion on exact mapping (e.g., own messages → orange accent, others → secondary/muted; or per-sender color from a small palette). Goal: visual distinction between "I'm quoting myself" vs "I'm quoting someone else."
- **D-09:** Quoted block content: **sender name + truncated first line** of body. Image messages (no body) show "📷 Photo" as the preview text. Deleted messages show "Message deleted."

### Scroll-to-original (CHAT-08) (D-10, D-11)
- **D-10:** Tapping a quoted block scrolls to the original message using `FlatList.scrollToIndex()`. Since the list is **inverted**, Claude must compute the correct index (position in the `data` array, not visual position).
- **D-11:** If the original message is **not in the currently loaded window** (not found in `messages` array by id): show a brief toast/snackbar — "Scroll up to see original message". No network fetch, no loading state — matches roadmap "within loaded window only" constraint.
- **D-12:** After scrolling to the original, **flash-highlight** the target bubble for ~1 second (Telegram pattern). Implemented via an `Animated.Value` background color interpolation or opacity pulse on the bubble.

### Reply bar above SendBar (D-13 through D-15)
- **D-13:** When user taps Reply in the context menu, a **reply preview bar** appears between the message list and the `SendBar`. Shows: "↩ Replying to [sender name]" on line 1, truncated first line of the quoted message on line 2, and a **× dismiss button** on the right.
- **D-14:** Dismiss options: **× button** and **swipe down** gesture. Sending the reply also clears the bar. Both gestures call the same `clearReply()` handler.
- **D-15:** The `SendBar` component receives `replyContext` as an optional prop (or the reply state lives in `ChatRoomScreen` and the bar renders as a sibling above `SendBar`). `onSend` passes `replyToId` to `sendMessage` in `useChatRoom`.

### sendMessage signature change (D-16)
- **D-16:** `sendMessage` in `useChatRoom` signature extends to `sendMessage(body: string, replyToId?: string): Promise<{ error: Error | null }>`. The `reply_to_message_id` column already exists in the `messages` table (Phase 12 D-03) — no migration needed.

### Claude's Discretion
- Exact implementation of the inline overlay: `Modal` with transparent background vs. in-place absolute positioning with `zIndex` — choose whichever avoids keyboard interaction issues on iOS.
- Sender-tinted accent bar color mapping (own vs. others; or a 2-color palette for others).
- Truncation length for quoted preview (1 line, ~50-60 chars).
- Toast implementation (short-lived `Animated.View` vs. a simple `Alert` — prefer non-blocking).
- Highlight flash animation specifics (color interpolation, 1-second duration).
- Whether `replyContext` state lives in `ChatRoomScreen` or inside a refactored `SendBar`.
- Soft-delete implementation detail: whether `body = NULL` is the marker or a dedicated `deleted_at` column. Prefer `body = NULL` (no migration — Phase 12 already allows nullable body per D-01).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files being modified
- `src/screens/chat/ChatRoomScreen.tsx` — add reply state, wire reply bar, pass replyToId to sendMessage
- `src/components/chat/MessageBubble.tsx` — add onLongPress, inline overlay render, quoted block render, highlight flash, deleted placeholder
- `src/components/chat/SendBar.tsx` — add optional replyContext prop and reply bar UI
- `src/hooks/useChatRoom.ts` — extend sendMessage signature (replyToId), add deleteMessage function

### Schema (already exists — no migration needed)
- `supabase/migrations/0018_chat_v1_5.sql` — `messages.reply_to_message_id` FK, `messages.body` nullable, Phase 12 D-07 (ON DELETE SET NULL)
- `src/types/chat.ts` — `Message.reply_to_message_id`, `Message.body` nullable — already typed

### Prior context decisions that apply
- Phase 12 D-03: reply is NOT a distinct message_type — it's any message where `reply_to_message_id IS NOT NULL`
- Phase 12 D-07: `ON DELETE SET NULL` on `reply_to_message_id` — hard deletes null out the FK; soft delete (body=NULL) keeps FK intact

### Project constraints
- `.planning/PROJECT.md` §Constraints — Expo managed workflow, no UI libraries, TypeScript strict, design tokens required, Ionicons only

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MessageBubble` — already `TouchableOpacity`; add `onLongPress` prop. Both `isOwn` (right) and others (left) variants need the overlay.
- `SendBar` — already uses a `translateY` animated sheet; reply bar can use same animation pattern or be a static conditional render above the `SendBar` container.
- `COLORS.interactive.accent` (#f97316) — use for own-message quote bar. A secondary color (e.g., `COLORS.text.secondary` or a muted tint) for others' quote bars — Claude's discretion.
- `RADII.xs` — small radius for accent bar left edge rounding.
- FlatList `ref` in `ChatRoomScreen` — needed for `scrollToIndex`. Confirm ref is created or add one.

### Established Patterns
- Bottom sheet animation: `translateY` Animated.Value + timing (see `SendBar`, `StatusPickerSheet`)
- Tap for timestamp: `onPress` + `Animated` fadeAnim — existing pattern in `MessageBubble`; long-press adds `onLongPress` alongside without conflict
- `isOwn` flag already available in `MessageBubble` — use to gate Delete action in context menu
- Optimistic send: `pending: true` flag on `MessageWithProfile` — carry forward for reply messages

### Integration Points
- `ChatRoomScreen` owns `messages` array — the scroll-to-original lookup (`messages.findIndex(m => m.id === replyToId)`) happens here
- `FlatList` inverted — `scrollToIndex` index is position in `data` array (0 = newest). Must map message id → array index correctly for inverted list
- `sendMessage` in `useChatRoom` — extend to accept `replyToId?` without breaking existing callers (optional param, defaults to undefined)
- Quoted block data: the quoted message's sender name and body come from the `messages` array in memory — no separate fetch. If not found → "Original message deleted" fallback.

</code_context>

<specifics>
## Specific Ideas

- Inline overlay: floating pill above the bubble with `↩ Reply`, `📋 Copy`, and (own only) `🗑 Delete` — icon + label format matching the SendBar action rows
- Reply bar: "↩ Replying to [Name]" + truncated preview + × button; swipe-down gesture also dismisses
- Quoted block: left border (4px wide, `RADII.xs` rounded), sender name in accent/tinted color (sm, semibold), preview text in secondary color (sm, regular), max 1 line each
- Highlight flash: brief background color pulse on the target bubble after scroll (1 second, Animated timing)
- Toast for not-in-window: simple fade-in/out View at bottom of screen, "Scroll up to see original message"

</specifics>

<deferred>
## Deferred Ideas

- Reactions on messages (Phase 15) — context menu is the entry point; Phase 15 adds emoji reactions as another action
- Message editing — not requested; would need a separate `edited_at` column
- Nested thread view (Discord-style threads) — flat quoted-reply is the scope; nested threads are a much larger feature
- Pagination / loading older messages to find out-of-window originals — CHAT-08 explicitly scopes to "within loaded window only"

</deferred>

---

*Phase: 14-reply-threading*
*Context gathered: 2026-04-20*
