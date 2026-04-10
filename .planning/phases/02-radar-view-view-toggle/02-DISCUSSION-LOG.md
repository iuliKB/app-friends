# Phase 2: Radar View & View Toggle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 02-radar-view-view-toggle
**Areas discussed:** Bubble layout, Radar visual style, Toggle & transition, Bubble interactions

---

## Bubble Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Center + ring | Your avatar in center, friends in a circle around it | |
| Organic scatter | Semi-random non-overlapping positions, feels alive/dynamic | ✓ |
| Weighted cluster | Free friends closer to center, Busy/Maybe at edges | |

**User's choice:** Organic scatter
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3-tier sizing | Free=64px, Maybe=48px, Busy/DEAD=36px | ✓ |
| 2-tier sizing | Free=64px, everything else=40px | |
| Continuous scaling | Size scales with heartbeat freshness | |

**User's choice:** 3-tier sizing

---

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic | Seed from friend_id hash, spatial memory | |
| Randomized on mount | New layout each time | ✓ |
| Seeded + jitter | Base from friend_id with small offset | |

**User's choice:** Randomized on mount

---

| Option | Description | Selected |
|--------|-------------|----------|
| Own avatar in center | You're the hub, friends orbit | |
| No self avatar | Just friends, status shown in OwnStatusCard | ✓ |

**User's choice:** No self avatar

---

| Option | Description | Selected |
|--------|-------------|----------|
| Animate resize | Smooth scale transition on status change | ✓ |
| Snap resize | Instant size change | |
| You decide | Claude picks | |

**User's choice:** Animate resize

---

| Option | Description | Selected |
|--------|-------------|----------|
| Grid cells + offset | Divide container into grid, offset within cells | ✓ |
| Collision avoidance | Place one by one, check overlap | |
| You decide | Claude picks | |

**User's choice:** Grid cells + offset

---

| Option | Description | Selected |
|--------|-------------|----------|
| Flat scatter | All bubbles same visual plane | |
| Subtle depth | Higher = slightly smaller/muted | ✓ |
| You decide | Claude picks | |

**User's choice:** Subtle depth

---

## Radar Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Concentric rings | Subtle dark circles like actual radar | |
| Plain dark | Base background color, bubbles stand out | ✓ |
| Gradient glow | Subtle radial gradient from center | |

**User's choice:** Plain dark

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single pulse ring | One ring expanding and fading | ✓ |
| Double concentric rings | Two staggered rings pulsing | |
| Gradient border glow | Border itself pulses/glows | |

**User's choice:** Single pulse ring

---

| Option | Description | Selected |
|--------|-------------|----------|
| Gradient background | Green-to-transparent gradient behind avatar | ✓ |
| Colored border only | Thick green border ring | |
| Both | Gradient + border | |

**User's choice:** Gradient background for Free bubbles

---

| Option | Description | Selected |
|--------|-------------|----------|
| Always show name | Small text below each bubble | ✓ |
| Name + status | Name + status label below | |
| No labels | Just avatars | |

**User's choice:** Always show name

---

| Option | Description | Selected |
|--------|-------------|----------|
| Status color | Green/yellow/red matching heartbeat | ✓ |
| White/neutral | Same color regardless of status | |
| You decide | Claude picks | |

**User's choice:** Status color for pulse rings

---

## Toggle & Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Below OwnStatusCard | Between status card and friend view | ✓ |
| Inside ScreenHeader | In the header area | |
| Floating bottom | Near FAB at bottom | |

**User's choice:** Below OwnStatusCard

---

| Option | Description | Selected |
|--------|-------------|----------|
| Crossfade | Old fades out, new fades in (200-300ms) | ✓ |
| Instant swap | No animation | |
| Slide horizontal | Slide like tabs | |

**User's choice:** Crossfade

---

| Option | Description | Selected |
|--------|-------------|----------|
| Match SegmentedControl | Same dark background, rounded segments | ✓ |
| Minimal pill toggle | Text labels with underline/highlight | |
| You decide | Claude picks | |

**User's choice:** Match SegmentedControl

---

## Bubble Interactions

| Option | Description | Selected |
|--------|-------------|----------|
| Same actions (long press) | View profile + Plan with... | ✓ |
| No long press | Just tap to DM | |
| Different actions | Custom action sheet | |

**User's choice:** Same long-press actions as HomeFriendCard

---

| Option | Description | Selected |
|--------|-------------|----------|
| Small avatar chips | Horizontal scroll with name | |
| Avatar + status dot | Small avatars with colored dot | ✓ |
| Count badge only | +3 more badge | |

**User's choice:** Avatar + status dot for overflow

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same as bubble — DM | Consistent tap behavior | ✓ |
| Go to profile | Overflow taps go to profile | |

**User's choice:** Overflow tap opens DM (same as bubble)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed height | 300-350px, predictable | ✓ |
| Fill available space | Expands to fill screen | |
| You decide | Claude picks | |

**User's choice:** Fixed height for radar container

---

## Claude's Discretion

- Exact grid cell dimensions and offset ranges
- Pulse ring animation timing
- Gradient background opacity
- Depth effect scaling factor
- Crossfade easing curve
- Overflow chip size (32-36px)
- Exact container height (300-350px)

## Deferred Ideas

- Cards view implementation — Phase 3
- Nudge button on bubbles — v1.4
- Stat strip below radar — v1.4
