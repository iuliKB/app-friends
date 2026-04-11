# Phase 3: Card Stack View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 03-card-stack-view
**Areas discussed:** Card visual design, Swipe & animation, Deck behavior, Nudge vs Skip actions

---

## Card Visual Design

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width tall card | Card fills most of the screen width, shows avatar prominently | |
| Compact centered card | Smaller card centered (~80% width), more breathing room | ✓ |
| You decide | Claude picks based on design tokens | |

**User's choice:** Compact centered card

| Option | Description | Selected |
|--------|-------------|----------|
| Status-colored gradient | Full card gradient matching friend status color | ✓ |
| Dark card surface | Standard COLORS.surface.card, status via accent elements | |
| You decide | Claude picks based on consistency | |

**User's choice:** Status-colored gradient

| Option | Description | Selected |
|--------|-------------|----------|
| Visible stack | 1-2 cards peeking behind front card, offset and scaled down | ✓ |
| Single card only | Only current card visible, counter shows remaining | |

**User's choice:** Visible stack

| Option | Description | Selected |
|--------|-------------|----------|
| Large centered avatar | Big avatar (96-120px) centered near top of card | |
| Medium avatar with side info | Medium avatar (64px) on left, details stacked right | ✓ |
| You decide | Claude picks | |

**User's choice:** Medium avatar with side info

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, as secondary text | Show '2h ago' below mood/context tag | ✓ |
| Only for FADING friends | Show time only when fading | |
| No | Skip time info | |

**User's choice:** Yes, as secondary text for all friends

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, rounded (RADII.lg) | Consistent with app style | |
| Extra rounded (RADII.xl or 20px) | More playful, dating-app feel | ✓ |
| You decide | Claude picks | |

**User's choice:** Extra rounded (RADII.xl or 20px)

| Option | Description | Selected |
|--------|-------------|----------|
| Full card gradient | Entire card has status-colored gradient (15-20% opacity) | ✓ |
| Top accent strip | Colored strip at top only | |
| Border glow | Dark card with status-colored border/shadow | |

**User's choice:** Full card gradient

---

## Swipe & Animation

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal swipe (left=skip, right=nudge) | Tinder-style gesture-based | * |
| Vertical swipe (up=skip) | Swipe up to dismiss, nudge via button only | |
| Buttons only, no swipe | No gesture handling needed | |

**User's choice:** Horizontal swipe (later refined: both directions = skip, nudge is button-only)

| Option | Description | Selected |
|--------|-------------|----------|
| React Native Gesture Handler + Reanimated | Industry standard, new dependency | ✓ |
| Animated API (built-in) | Already used, no new deps, less fluid | |
| You decide | Claude picks | |

**User's choice:** React Native Gesture Handler + Reanimated

| Option | Description | Selected |
|--------|-------------|----------|
| Fly off + rotate | Card flies off with slight rotation (Tinder-style) | ✓ |
| Slide off clean | Clean horizontal slide, no rotation | |
| Fade + scale down | Card fades and shrinks | |

**User's choice:** Fly off + rotate

---

## Deck Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Empty state message | "You've seen everyone!" with reshuffle option | |
| Auto-loop back to start | Deck loops to first card automatically | ✓ |
| Collapse to summary | Summary of nudged vs skipped | |

**User's choice:** Auto-loop back to start

| Option | Description | Selected |
|--------|-------------|----------|
| No undo | Once swiped, gone. Keeps momentum | |
| Swipe down to undo last | Brings back last dismissed card | ✓ |

**User's choice:** Swipe down to undo last

| Option | Description | Selected |
|--------|-------------|----------|
| On the card itself | Counter on current card | |
| Above the deck | Counter above card stack, always visible | ✓ |
| Below the deck | Counter near action buttons | |

**User's choice:** Above the deck

---

## Nudge vs Skip Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Opens DM directly | Same as radar bubble tap, navigate to DM | ✓ |
| Opens DM with pre-filled message | Pre-fills "Hey, want to hang?" | |
| Sends quick nudge notification | Push notification without opening DM | |

**User's choice:** Opens DM directly

| Option | Description | Selected |
|--------|-------------|----------|
| Icon buttons below card | Two circular icon buttons (X and chat bubble) | |
| Text buttons on the card | "Skip" and "Nudge" text on the card itself | |
| Icon + text combo | Icon buttons with small labels underneath | ✓ |

**User's choice:** Icon + text combo

| Option | Description | Selected |
|--------|-------------|----------|
| Swipe right = Nudge | Right swipe opens DM, consistent with Tinder model | |
| Swipe right = Skip right | Both directions skip, nudge is button-only | ✓ |

**User's choice:** Both directions skip — Nudge is button-only to prevent accidental DM opens

---

## Claude's Discretion

- Stack card offset and scale values
- Swipe threshold distance
- Rotation angle during fly-off
- Undo animation style
- Button icon choices and sizing
- Counter text formatting

## Deferred Ideas

- Nudge push notification instead of DM open
- Pre-filled nudge message
- End-of-deck summary of nudged vs skipped
