# Phase 26: Home & Chat Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 26-home-chat-polish
**Areas discussed:** Home skeleton layout, FADING pulse visual, Zero-friends empty state, Optimistic send + bubble long-press

---

## Home Skeleton Layout

| Option | Description | Selected |
|--------|-------------|----------|
| View-aware skeletons | Radar: circular blobs; Card stack: rectangular card skeletons | ✓ |
| Generic rows below header | 3–4 horizontal skeleton rows regardless of view | |
| Claude's discretion | Claude chooses what looks best | |

**User's choice:** View-aware skeletons (3 items, initial load only)

**Skeleton count:**

| Option | Description | Selected |
|--------|-------------|----------|
| 3 items | Fills space without over-scaffolding | ✓ |
| 5 items | More screen coverage | |
| Claude's discretion | Claude picks count | |

**Loading trigger:**

| Option | Description | Selected |
|--------|-------------|----------|
| Initial load only | Pull-to-refresh uses RefreshControl spinner | ✓ |
| Both initial and refresh | Skeletons also replace content on refresh | |

**Notes:** Condition is `loading && friends.length === 0` — skeletons only on first open when no cached data.

---

## FADING Pulse Visual

| Option | Description | Selected |
|--------|-------------|----------|
| Amber/orange ring, slower | Same pattern as ALIVE pulse but warm color + ~2000ms cycle | ✓ |
| Dashed or intermittent ring | Pulse with gaps/pauses to signal "flickering out" | |
| Same ring but desaturated | White ring at lower opacity — subtle | |

**Scope:**

| Option | Description | Selected |
|--------|-------------|----------|
| Radar view only | RadarBubble gets FADING ring; card views keep opacity 0.6 | ✓ |
| Both views | HomeFriendCard + FriendSwipeCard also get a ring | |

**Notes:** FADING ring should feel "languid" — slower cycle signals something winding down vs. ALIVE which is crisp and lively.

---

## Zero-Friends Empty State

| Option | Description | Selected |
|--------|-------------|----------|
| Card in scroll area | Inline card where friend content would be; status card + widgets still show | ✓ |
| Full-screen EmptyState | Replaces all home content with centered EmptyState component | |

**CTA navigation:**

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to Squad tab | Switches to Squad tab where Add Friend FAB lives | ✓ |
| Open Add Friend flow directly | Skips Squad and opens username search / QR scanner immediately | |

**Notes:** Separate from the onboarding hint sheet (AUTH-04) — both can coexist. Trigger: `!loading && friends.length === 0`.

---

## Optimistic Send + Bubble Long-Press

**Sending indicator:**

| Option | Description | Selected |
|--------|-------------|----------|
| Reduced opacity + clock icon | ~70% opacity + clock icon next to timestamp; snaps on confirmation | ✓ |
| Reduced opacity only | ~70% opacity, no icon | |
| Inline spinner | ActivityIndicator where timestamp will be | |

**Failure state:**

| Option | Description | Selected |
|--------|-------------|----------|
| Red tint + retry tap | Red border/tint + "Tap to retry" label; tapping re-sends | ✓ |
| Remove bubble + toast error | Optimistic bubble disappears, toast shows error | |
| Claude's discretion | Claude decides failure treatment | |

**Long-press animation:**

| Option | Description | Selected |
|--------|-------------|----------|
| Compress-and-hold | Scales to 0.96 on gesture start, holds while menu open, springs back on close | ✓ |
| Quick compress-release-then-menu | Brief 200ms compress + spring back, then menu appears | |

---

## Claude's Discretion

- Exact amber/orange hex for FADING pulse ring
- Whether FADING PulseRing is a separate component or a parameterized variant of PulseRing
- Exact copy for zero-friends empty state card
- Which specific home screen widgets get press feedback (audit all Pressables)

## Deferred Ideas

None — discussion stayed within phase scope.
