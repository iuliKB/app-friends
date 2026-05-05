# Phase 27: Plans & Squad Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 27-plans-squad-polish
**Areas discussed:** Plans list skeleton, RSVP animation & haptic, Map empty state, Squad stagger & wish list spring

---

## Plans List Skeleton

| Option | Description | Selected |
|--------|-------------|----------|
| Cover + title + meta | Image placeholder block (~140px) + title bar + two metadata lines. Mirrors full PlanCard shape. | ✓ |
| Title + meta only | Shorter card without image block. More layout shift on reveal. | |
| You decide | Claude mirrors PlanCard shape. | |

**User's choice:** Cover + title + meta

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 cards, My Plans tab only | 3 skeleton cards in My Plans tab only. Invitations tab gets spinner/nothing. | ✓ |
| 3 cards, both tabs | Skeleton in both My Plans and Invitations tabs. | |
| 2 cards, My Plans only | 2 cards, slightly lighter. | |

**User's choice:** 3 cards, My Plans tab only

---

## RSVP Animation & Haptic

| Option | Description | Selected |
|--------|-------------|----------|
| Selected button bounces | Only tapped button springs: 1.0→0.92→1.05→1.0 overshoot. Unselected don't animate. | ✓ |
| All buttons compress on press | Standard 1.0→0.96 compress on the pressed button. | |
| You decide | Claude picks the spring. | |

**User's choice:** Selected button bounces (overshoot)

---

| Option | Description | Selected |
|--------|-------------|----------|
| selectionAsync | Subtle selection tick. Same as reaction emoji tap in Phase 26. | ✓ |
| impactAsync(Light) | Slightly stronger physical tap. | |

**User's choice:** selectionAsync

---

## Map Empty State

| Option | Description | Selected |
|--------|-------------|----------|
| Card overlay on map | Centered card floats over map tiles. Map remains visible underneath. | ✓ |
| Full-screen empty state | Map hidden; standard EmptyState fills screen. | |
| You decide | Claude picks based on ExploreMapView layout. | |

**User's choice:** Card overlay on map

---

## Squad Stagger & Wish List Spring

| Option | Description | Selected |
|--------|-------------|----------|
| Add stagger token, update squad.tsx | Add ANIMATION.duration.staggerDelay = 80, update squad.tsx. | ✓ |
| Leave raw 80 in squad.tsx | One-off layout detail, not worth tokenizing. | |

**User's choice:** Add stagger token, update squad.tsx

---

| Option | Description | Selected |
|--------|-------------|----------|
| Opacity-only is fine | Existing AnimatedCard opacity fade-in. Already done. | ✓ |
| Slide + fade (translateY 12→0) | Cards rise up as they appear. More polished, more work. | |

**User's choice:** Opacity-only is fine

---

| Option | Description | Selected |
|--------|-------------|----------|
| 1.0→0.96 compress | Consistent with HOME-04 all other tappable elements. | ✓ |
| Overshoot bounce 1.0→0.92→1.05 | More celebratory. Matches RSVP button bounce. | |

**User's choice:** 1.0→0.96 compress

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — fix to notificationAsync(Success) | Correct the haptic. Success notification fits "debt cleared". | ✓ |
| Leave impactAsync(Medium) | Existing haptic is intentional. | |

**User's choice:** Yes — fix to notificationAsync(Success)

---

## Claude's Discretion

- Exact SkeletonPulse sizing proportions within the PlanCard skeleton
- Exact copy for map empty state one-liner
- Whether plan creation haptic fires before or after modal dismisses

## Deferred Ideas

None.
