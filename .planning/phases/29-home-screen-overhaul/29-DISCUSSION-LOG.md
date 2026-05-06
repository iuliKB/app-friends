# Phase 29: Home Screen Overhaul - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 29-home-screen-overhaul
**Areas discussed:** Radar DEAD state, Zero-friends CTA, Events section polish, Design approach

---

## Radar DEAD state

| Option | Description | Selected |
|--------|-------------|----------|
| Greyscale + dimmed, in-place | Keep bubble in radar scatter; desaturate to greyscale and reduce opacity to ~40%. No pulse ring. | ✓ |
| Greyscale + move to bottom row | Show DEAD friends below ALIVE/FADING with a 'gone quiet' label. More complex layout. | |
| Hide from radar entirely | Remove DEAD friends from radar (like CardStackView already does). | |

**User's choice:** Greyscale + dimmed, in-place
**Notes:** Non-interactive — DEAD bubbles have no tap/long-press response.

---

## Radar FADING state

| Option | Description | Selected |
|--------|-------------|----------|
| Keep FADING as-is | Amber PulseRing is clear enough; no additional dimming needed. | ✓ |
| Also dim FADING slightly | Add ~70% opacity to FADING bubbles on top of amber pulse. | |

**User's choice:** Keep FADING as-is

---

## Zero-friends CTA

| Option | Description | Selected |
|--------|-------------|----------|
| Update existing EmptyState | Update copy + routing; retire OnboardingHintSheet. | ✓ |
| Prominent banner card | Large hero card with branding and CTA. | |
| Keep both — update copy only | Minimal change: just update button label and routing. | |

**User's choice:** Update existing EmptyState
**Notes:** CTA routes directly to Add Friend screen (not Squad tab root). OnboardingHintSheet retired.

---

## Events section polish

| Option | Description | Selected |
|--------|-------------|----------|
| Loading skeleton | 2–3 shimmer skeleton cards while loading, using existing SkeletonPulse. | ✓ |
| Larger cards | Increase card size for better readability. | ✓ |
| Date/time prominence | Make date the most visually prominent element on the card. | ✓ |
| Participant avatars upgrade | Larger avatars, show more, add overflow count chip. | ✓ |

**User's choice:** All four improvements selected.
**Notes:** Card size: 240×160px. Date: pill anchored top-left. Avatars: 28–30px, up to 4–5 visible, overflow chip.

---

## Design approach

| Option | Description | Selected |
|--------|-------------|----------|
| Run /gsd-ui-phase first | Generate UI-SPEC.md design contract before planning. | ✓ |
| Skip UI-SPEC, go straight to planning | Claude makes visual decisions inline using design tokens. | |

**User's choice:** Run /gsd-ui-phase 29 first.
**Notes:** Must use the `/ui-ux-pro-max` plugin during the design session. User explicitly requested this.

---

## Claude's Discretion

- Date pill color token selection (accent vs muted surface)
- Exact opacity/greyscale values for DEAD bubbles
- Skeleton card shape (mirroring new 240×160px card proportions)
- Greyscale technique for DEAD bubbles (React Native has no `filter: grayscale()` — overlay approach or tintColor)

## Deferred Ideas

None noted during discussion.
