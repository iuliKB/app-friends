# Phase 17: Polls - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 17-polls
**Areas discussed:** Poll creation flow, Poll card design, Vote change behavior, Poll lifecycle

---

## Poll creation flow

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet / modal | Sheet slides up over chat, stays in context. Consistent with existing modal pattern. | ✓ |
| Full screen (new route) | Navigate to a dedicated CreatePollScreen. More room, but leaves chat. | |

**User's choice:** Bottom sheet / modal

| Option | Description | Selected |
|--------|-------------|----------|
| Start with 2, tap to add | 2 pre-filled fields, + Add option up to 4, × remove on 3rd+ | ✓ |
| Start with 2, no remove | Add only, no remove button | |
| Start with 4 empty fields | Show all 4 upfront, unused optional | |

**User's choice:** Start with 2, tap to add

---

## Poll card design

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width card | Spans full chat width, clearly distinct from bubbles | ✓ |
| Bubble-width card | Same width as text bubbles, left/right aligned | |

**User's choice:** Full-width card

| Option | Description | Selected |
|--------|-------------|----------|
| Options only before voting | No bars or counts until user votes — unbiased | ✓ |
| Show counts immediately | Always show bars and counts | |

**User's choice:** Options only before voting

| Option | Description | Selected |
|--------|-------------|----------|
| Filled radio + accent bar | ● filled radio + accent color bar for selection, muted grey for others | ✓ |
| Checkmark + bold label | ✓ checkmark, all bars same color | |
| You decide | Claude picks | |

**User's choice:** Filled radio + accent bar

| Option | Description | Selected |
|--------|-------------|----------|
| Vote count only | "5 votes" in footer | ✓ |
| Vote count + sender name | "5 votes · sent by Alex" | |

**User's choice:** Vote count only

---

## Vote change behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Tap another option directly | Immediate swap, no confirmation | ✓ |
| Tap to unvote, then vote again | Two-step explicit | |
| You decide | Claude picks | |

**User's choice:** Tap another option directly

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — tap own vote to un-vote | Toggle off own selection | ✓ |
| No — vote is locked once cast | Can change but not remove | |

**User's choice:** Yes — tap own vote to un-vote

---

## Poll lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Creator only, same soft-delete as texts | Long-press → Delete, becomes "Message deleted" | ✓ |
| No deletion for polls | Once sent, can't delete | |
| You decide | Claude picks | |

**User's choice:** Creator only, same soft-delete

| Option | Description | Selected |
|--------|-------------|----------|
| No closing — always open | Polls stay open indefinitely | ✓ |
| Yes — creator can close | Long-press → Close Poll | |

**User's choice:** No closing — always open

---

## Claude's Discretion

- Progress bar height, corner radius, animation duration
- Whether `sendPoll()` calls `create_poll()` RPC directly or via thin wrapper
- Vote count position relative to progress bar
- Keyboard avoidance in creation sheet
- Which bottom sheet primitive to use (whatever is already installed)

## Deferred Ideas

None.
