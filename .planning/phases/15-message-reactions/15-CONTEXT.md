# Phase 15: Message Reactions - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver emoji tapback reactions for any message: a 6-emoji strip in the existing context menu, live reaction count badges below bubbles, real-time sync for all participants, and toggle-to-remove behavior. One emoji per user per message (iMessage tapback model).

**In scope:** Emoji strip row above the existing Phase 14 context menu pill; `MessageReaction` type hydration in `useChatRoom`; `addReaction` / `removeReaction` RPC or direct DB calls; reaction badge row below `MessageBubble`; realtime subscription extension; optimistic updates.

**Out of scope:** Custom emoji or emoji picker beyond the 6 preset. Media messages (Phase 16). Polls (Phase 17).

</domain>

<decisions>
## Implementation Decisions

### Context menu — emoji strip placement (D-01, D-02)
- **D-01:** The emoji tapback strip renders as a **separate floating row above** the existing Reply/Copy/Delete pill — two distinct visual elements within the same Modal. The pill from Phase 14 is not modified structurally; the emoji row is a new sibling positioned above it.
- **D-02:** When the context menu opens, already-reacted emojis in the strip appear **highlighted** (filled/tinted background) so the user can see which one they've reacted with at a glance. Tapping the highlighted emoji removes the reaction (toggle off). Tapping a different emoji removes the old reaction and adds the new one.

### Multi-emoji per user (D-03)
- **D-03:** **One emoji per message per user** — iMessage tapback model. Tapping a new emoji removes the previous reaction and adds the new one atomically. The schema allows multiple rows per user per message (composite PK includes emoji), but the UI enforces the single-reaction rule: before inserting a new reaction, delete any existing reaction for that user on that message.

### Reaction badge display (D-04, D-05)
- **D-04:** Each reacted emoji gets its own **rounded pill** showing emoji + count (e.g. ❤️ 2). The user's own reaction pill gets a filled/tinted background (accent tint) to match the highlighted strip state. Badges render as a horizontal row.
- **D-05:** The badge row appears **below the bubble body as an inline sibling row**, slightly offset to the bubble's side (right-aligned for own messages, left-aligned for others). No negative-margin overlap. Only rendered when at least one reaction exists on the message.

### Realtime + optimistic updates (D-06, D-07)
- **D-06:** **Extend the existing Supabase realtime channel** in `useChatRoom` to also listen for `message_reactions` INSERT and DELETE events. No separate subscription. On a reaction event, update the affected message's `reactions` array in local state.
- **D-07:** Reaction add/remove uses **optimistic updates** — the badge count updates immediately on tap, with a silent revert if the DB write fails. Matches the existing optimistic send pattern for messages.

### Claude's Discretion
- Exact tint color for highlighted emoji in strip and own-reaction badge (e.g., `COLORS.interactive.accent` with low opacity background, or `COLORS.surface.elevated` with accent border).
- Pill padding, font size, and spacing for the reaction badge row.
- Whether `addReaction`/`removeReaction` use direct `supabase.from('message_reactions')` calls or an RPC — prefer direct calls (no new SQL function needed).
- Exact realtime filter for `message_reactions` events (filter on channel via JOIN or store `dm_channel_id`/`group_channel_id` on the reactions table — prefer querying via the message's channel membership in the existing subscription filter).
- How to load initial reactions with messages: a separate aggregated query on mount, or include in the existing messages select (e.g., `reactions:message_reactions(emoji, user_id, count)` via PostgREST). Prefer whatever avoids N+1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files being modified
- `src/components/chat/MessageBubble.tsx` — add emoji strip to context menu Modal, add reaction badge row below bubble, pass `onReact` callback
- `src/hooks/useChatRoom.ts` — add `addReaction`/`removeReaction` functions, extend realtime subscription for `message_reactions`, hydrate `reactions` field on messages
- `src/types/chat.ts` — `MessageReaction { emoji, count, reacted_by_me }` already typed; verify it matches query shape

### Schema (already exists — no migration needed)
- `supabase/migrations/0018_chat_v1_5.sql` §SECTION 3 — `message_reactions` table, composite PK `(message_id, user_id, emoji)`, RLS policies (select: channel member, insert: own, delete: own)
- `src/types/chat.ts` — `MessageReaction` type, `Message.reactions?: MessageReaction[]` placeholder

### Prior context decisions that apply
- Phase 14 D-01: context menu is a Modal with transparent backdrop + absolute-positioned pill — emoji strip is a new sibling View inside the same Modal
- Phase 14 D-04: Modal dismisses on tap-outside — same dismiss behavior applies when emoji strip is present
- Phase 12 schema intent: `message_reactions` composite PK `(message_id, user_id, emoji)` — delete-then-insert pattern for reaction swap

### Project constraints
- `.planning/PROJECT.md` §Constraints — Expo managed workflow, no UI libraries, TypeScript strict, design tokens required, Ionicons only (emojis are plain Unicode text, not Ionicons)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MessageBubble.tsx` context menu Modal — emoji strip is a new `View` row rendered above `styles.contextPill` inside the same Modal
- `COLORS.interactive.accent` (#f97316) — use for own-reaction tint on badge pills and highlighted strip emoji
- `COLORS.surface.card` / `COLORS.surface.elevated` — background for reaction badge pills
- `RADII.full` or `RADII.md` — rounded corners for badge pills
- `isOwn` flag in `MessageBubble` — determines badge row alignment (flex-end vs flex-start)

### Established Patterns
- Optimistic send: `pending: true` flag pattern in `useChatRoom` → carry same approach for optimistic reaction state
- Realtime subscription: `supabase.channel(channelName).on('postgres_changes', ...)` in `useChatRoom` — add second `.on(...)` call for `message_reactions` table on the same channel object
- Design tokens required — no raw hex values, no raw pixel values for spacing

### Integration Points
- `useChatRoom` returns `messages: MessageWithProfile[]` — `reactions` array needs to be populated per message, either via initial load query or populated on mount + updated via realtime
- `ChatRoomScreen` passes message list to `FlatList` → passes individual messages to `MessageBubble` → `MessageBubble` needs `onReact(messageId, emoji)` callback prop
- `message_reactions` RLS: insert policy requires `user_id = auth.uid()` and user is channel member — direct insert is safe; no RPC needed

</code_context>

<specifics>
## Specific Ideas

- Emoji strip: horizontal row of 6 `TouchableOpacity` emoji buttons, each ~36×36pt tap target. Already-reacted emoji: rounded background fill using accent tint. Gap between strip and pill: ~8pt.
- Badge pill: `<Text>emoji count</Text>` inside a `View` with `borderRadius: RADII.full`, `paddingHorizontal: SPACING.xs`, `paddingVertical: SPACING.xxs`. Own reaction: accent tint background + accent border.
- One-emoji-per-user enforcement: on tap, call `removeReaction(messageId, existingEmoji)` then `addReaction(messageId, newEmoji)` — or a single upsert-style approach using DELETE + INSERT. The optimistic update applies the net result immediately.

</specifics>

<deferred>
## Deferred Ideas

- Custom emoji / extended picker — not in scope; 6 preset emojis only for this phase
- Reaction details sheet (tap badge to see who reacted) — could be a future Phase
- Multiple emojis per user (WhatsApp-style) — deliberately excluded; one emoji per user is the tapback model

</deferred>

---

*Phase: 15-message-reactions*
*Context gathered: 2026-04-21*
