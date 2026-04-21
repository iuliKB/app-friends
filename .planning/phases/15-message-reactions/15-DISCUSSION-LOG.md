# Phase 15: Message Reactions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 15-message-reactions
**Areas discussed:** Emoji strip in context menu, Reaction badge style, Multi-emoji per user, Realtime update strategy

---

## Emoji strip in context menu

| Option | Description | Selected |
|--------|-------------|----------|
| Separate row above the pill | Two distinct elements in the same Modal — emoji strip above, existing pill below. Doesn't touch Phase 14 pill code. | ✓ |
| Integrated top section of pill | Emoji row merged into existing pill with a divider. More cohesive, requires modifying Phase 14's layout. | |

**User's choice:** Separate row above the existing Reply/Copy/Delete pill (iMessage style)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight already-reacted emoji | Tinted background on the emoji you've already reacted with, visible in the strip | ✓ |
| No distinction in strip | All 6 emojis appear flat regardless of current reaction state | |

**User's choice:** Highlight already-reacted emoji in the strip

---

## Reaction badge style

| Option | Description | Selected |
|--------|-------------|----------|
| Rounded pill: emoji + count | Each emoji gets its own pill (❤️ 2). Own reaction has filled/tinted background. | ✓ |
| Emoji-only chips with superscript count | Emoji with overlaid count badge — compact but less readable | |
| Compact inline: emoji×count pairs | Plain text row, no pill styling | |

**User's choice:** Rounded pill with emoji + count

---

| Option | Description | Selected |
|--------|-------------|----------|
| Below the bubble, inline | Badge row as sibling below bubble — right-aligned for own, left-aligned for others | ✓ |
| Overlapping bubble bottom (iMessage) | Negative margin overlap — more visual depth but trickier with inverted FlatList | |

**User's choice:** Inline below bubble (no overlap)

---

## Multi-emoji per user

| Option | Description | Selected |
|--------|-------------|----------|
| One emoji per message per user | Tapping new emoji replaces old one — iMessage tapback model | ✓ |
| Multiple emojis allowed | Each emoji toggles independently — WhatsApp style | |

**User's choice:** One emoji per user — tapback replacement model

---

## Realtime update strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing channel subscription | Add message_reactions to existing useChatRoom realtime channel — one subscription | ✓ |
| Separate reactions subscription | Dedicated realtime channel for message_reactions — doubles subscriptions per room | |

**User's choice:** Extend existing channel

---

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic update | Count updates immediately on tap, silent revert on failure | ✓ |
| Wait for DB confirmation | Count updates only after Supabase write completes | |

**User's choice:** Optimistic update

---

## Claude's Discretion

- Exact tint color/style for own-reaction badge pills and highlighted strip emoji
- Badge pill sizing, padding, spacing
- Whether to use direct DB calls or RPC for add/remove reaction
- Initial reactions loading strategy (JOIN in messages query vs separate fetch)
- Realtime filter approach for message_reactions events

## Deferred Ideas

- Custom emoji / extended picker — future phase
- Reaction details sheet (tap badge → see who reacted) — future phase
- Multiple emojis per user (WhatsApp-style) — explicitly excluded
