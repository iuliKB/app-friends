# Phase 23: Memories Gallery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 23-memories-gallery
**Areas discussed:** Home widget layout, Plan attribution in widget, Gallery screen grid density, Data freshness / loading feel

---

## Home Widget Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal strip | 3–4 square thumbnails in a scrollable horizontal row with "See all" — matches UpcomingEventsSection | ✓ |
| 2×2 compact grid | Four photos in a 2-col, 2-row grid with "See all" button below — more photos visible, more vertical space | |

**User's choice:** Horizontal strip
**Notes:** Consistent with UpcomingEventsSection pattern already on Home screen

**Empty state follow-up:**

| Option | Description | Selected |
|--------|-------------|----------|
| Hide widget entirely | Widget only appears once ≥1 photo exists | ✓ |
| Empty state placeholder | Show dashed-border placeholder card with message | |

**User's choice:** Hide widget entirely

---

## Plan Attribution in Widget

| Option | Description | Selected |
|--------|-------------|----------|
| Plan name as caption below | Small plan name label under each thumbnail | ✓ |
| Photos only, no label | Clean thumbnail strip, plan context only in gallery | |

**User's choice:** Plan name caption below each thumbnail

---

## Gallery Screen Grid Density

| Option | Description | Selected |
|--------|-------------|----------|
| 3 columns | Matches Phase 22 per-plan gallery — consistent throughout app | ✓ |
| 2 columns | Larger thumbnails, more editorial feel, different from per-plan grid | |

**User's choice:** 3 columns — matches Phase 22 pattern

---

## Data Freshness / Loading Feel

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh fetch on mount | Always fetches latest, brief loading state | ✓ |
| Cached from plans store | Instant display, potentially slightly stale | |

**User's choice:** Fresh fetch on mount — consistent with all other hooks in the app

---

## Claude's Discretion

- Signed URL expiry handling in widget (1-hour TTL refresh strategy)
- SectionHeader vs plain Text for plan section titles in gallery
- Pull-to-refresh on gallery screen
- Skeleton loading implementation

## Deferred Ideas

- Promote Memories to dedicated tab — future phase
- Search/filter by plan or date — V2
- "On this day" memories — V2
