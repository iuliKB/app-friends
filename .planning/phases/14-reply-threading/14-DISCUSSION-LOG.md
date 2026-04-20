# Phase 14: Reply Threading - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 14-reply-threading
**Areas discussed:** Context Menu, Quoted Block Design, Scroll-to-original (CHAT-08), Reply Bar Above Composer

---

## Context Menu

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet | Same slide-up animation as SendBar attachment menu | |
| Inline overlay above bubble | Floating pill above the held bubble — iMessage style | ✓ |
| Alert / Action Sheet | Native Alert.alert() with options | |

**User's choice:** Inline overlay above bubble

---

| Option | Description | Selected |
|--------|-------------|----------|
| Reply only | Just the Reply action, tight scope | |
| Reply + Copy text | Reply + clipboard copy | |
| Reply + Copy + Delete own | Reply + copy + delete own messages | ✓ |

**User's choice:** Reply + Copy + Delete own messages

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tap still shows timestamp | Long-press → overlay, tap → timestamp | ✓ |
| Tap opens the overlay too | Both tap and long-press open context menu | |
| Tap does nothing | Remove tap-for-timestamp entirely | |

**User's choice:** Tap still shows timestamp (both gestures coexist)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder: "Message deleted" | Bubble stays, body replaced with greyed text | ✓ |
| Remove from UI entirely | Message disappears for all participants | |

**User's choice:** Placeholder "Message deleted" — soft delete, bubble remains

---

## Quoted Block Design

| Option | Description | Selected |
|--------|-------------|----------|
| Left accent border | Telegram/WhatsApp vertical bar + sender name + truncated text | ✓ |
| Shaded card block | Darker rounded rectangle above reply text | |

**User's choice:** Left accent border

---

| Option | Description | Selected |
|--------|-------------|----------|
| Always accent orange | Consistent #f97316 regardless of sender | |
| Sender-tinted (You decide) | Claude decides the color mapping | ✓ |

**User's choice:** Sender-tinted — Claude's discretion

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sender name + truncated text | Name on line 1, truncated body on line 2 | ✓ |
| Sender name only | Just "Replying to Name" | |

**User's choice:** Sender name + truncated text (image messages → "📷 Photo")

---

## Scroll-to-original (CHAT-08)

| Option | Description | Selected |
|--------|-------------|----------|
| Toast: "Scroll up to see original" | Brief non-blocking notification | ✓ |
| Silent no-op | Tap does nothing | |
| Disable tap if not loaded | Remove tappability when origin not in window | |

**User's choice:** Toast — "Scroll up to see original message"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight flash on original | 1-second color pulse after scroll (Telegram style) | ✓ |
| Scroll only, no highlight | Just scroll, no visual feedback | |

**User's choice:** Highlight flash on the original bubble

---

## Reply Bar Above Composer

| Option | Description | Selected |
|--------|-------------|----------|
| Sender name + truncated first line | "↩ Replying to Alex" + preview + × | ✓ |
| Sender name only | Just "Replying to Alex" + × | |

**User's choice:** Sender name + truncated first line

---

| Option | Description | Selected |
|--------|-------------|----------|
| × button only | Explicit dismiss button, send also clears | |
| × button or swipe down | Both gestures dismiss | ✓ |
| Send clears it only | No dismiss button | |

**User's choice:** × button or swipe down (both dismiss)

---

## Claude's Discretion

- Exact implementation of inline overlay (Modal vs. absolute positioned View with zIndex)
- Sender-tinted accent bar color mapping
- Truncation length for quoted preview (~50-60 chars)
- Toast implementation (non-blocking Animated.View preferred)
- Highlight flash animation specifics
- Whether replyContext state lives in ChatRoomScreen or refactored into SendBar
- Soft-delete implementation (body=NULL preferred — no migration needed)

## Deferred Ideas

- Reactions on messages — Phase 15, context menu is the entry point
- Message editing — separate feature, needs schema changes
- Nested thread view (Discord-style) — out of scope for flat quoted-reply
- Loading older messages to find out-of-window originals — CHAT-08 scoped to loaded window only
