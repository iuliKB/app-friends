# Phase 4: Upcoming Events Section - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 04-upcoming-events-section
**Areas discussed:** Card visual style, Data source & filtering, Section placement & header, Empty & edge states, Image upload flow, Card tap behavior, Date formatting

---

## Card Visual Style

### Image support
| Option | Description | Selected |
|--------|-------------|----------|
| Colorful cards, no images | Solid pastel/gradient backgrounds with title + date text overlay | |
| Cards with images | Optional cover image per plan, falls back to colored card | ✓ |
| Color-coded by status | Card background color based on RSVP status | |

**User's choice:** Cards with images

### Card info density
| Option | Description | Selected |
|--------|-------------|----------|
| Full info | Title, date, avatar stack, member count, relative time | ✓ |
| Minimal info | Just title and date | |
| Title + time + location | Title, relative time, location | |

**User's choice:** Full info (Recommended)

### Card shape
| Option | Description | Selected |
|--------|-------------|----------|
| Wide landscape cards | ~200px wide, ~140px tall, shows 1.5 cards | ✓ |
| Square cards | ~160x160px | |
| Tall portrait cards | ~160px wide, ~200px tall | |

**User's choice:** Wide landscape cards

### Fallback background
| Option | Description | Selected |
|--------|-------------|----------|
| Random pastel color | Soft pastel from fixed palette based on plan ID hash | ✓ |
| Gradient from accent | App accent color gradient | |
| Category-based color | Color mapped to plan category | |

**User's choice:** Random pastel color

---

## Data Source & Filtering

### Which plans to show
| Option | Description | Selected |
|--------|-------------|----------|
| All future plans I'm part of | Any plan where you're a member with future scheduled_for | |
| Only 'going' or 'maybe' | Exclude unresponded/declined plans | |
| All future + today's past | Future plus today's past plans | |

**User's choice:** Plans where user is creator OR RSVP is "going" (custom)
**Notes:** User specified: only plans they created or are going to

### Sort & limit
| Option | Description | Selected |
|--------|-------------|----------|
| Next 5, soonest first | Up to 5 events sorted ascending | ✓ |
| Next 3, soonest first | Only 3 most imminent | |
| All upcoming, soonest first | No limit | |

**User's choice:** Next 5, soonest first

---

## Section Placement & Header

### Placement
| Option | Description | Selected |
|--------|-------------|----------|
| Below OwnStatusCard, above toggle | Between status card and Radar/Cards toggle | |
| Below Radar/Cards view | After friends section at the bottom | ✓ |
| Above OwnStatusCard | Very top of content | |

**User's choice:** Below Radar/Cards view

### Header style
| Option | Description | Selected |
|--------|-------------|----------|
| Title + 'See all' link | 'Upcoming events' with See all navigation | |
| Title only | Just section header, no nav | |
| Title + sparkle emoji | 'Upcoming events ✨' decorative | |

**User's choice:** Title with sparkle emoji + 'See all' link (custom combo)

---

## Empty & Edge States

### No events
| Option | Description | Selected |
|--------|-------------|----------|
| Hide the entire section | Don't show header or content | |
| Show section with CTA | Header + placeholder card linking to plan creation | ✓ |
| Subtle inline message | Header + small text | |

**User's choice:** Show section with CTA

---

## Image Upload Flow

### When to add image
| Option | Description | Selected |
|--------|-------------|----------|
| During plan creation | Optional picker on creation form | |
| Edit after creation | Add cover button on plan detail | |
| Both creation and edit | Available in both places | ✓ |

**User's choice:** Both creation and edit

### Image source
| Option | Description | Selected |
|--------|-------------|----------|
| Camera roll only | expo-image-picker gallery | ✓ |
| Camera roll + take photo | Gallery + camera capture | |
| Camera roll + Unsplash | Gallery + stock photo search | |

**User's choice:** Camera roll only

---

## Card Tap Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to plan detail | Direct navigation via router.push | ✓ |
| Bottom sheet preview | Mini-preview sheet | |
| Expand card in-place | Inline expansion animation | |

**User's choice:** Navigate to plan detail

---

## Date Formatting

| Option | Description | Selected |
|--------|-------------|----------|
| Short date like reference | 'Mon 15, Aug' style | |
| Relative time | 'In 2 days', 'Tomorrow' | |
| Date + relative combo | 'Mon 15, Aug · in 2 days' | ✓ |

**User's choice:** Date + relative combo

---

## Claude's Discretion

- Card shadow/elevation styling
- Horizontal scroll snap behavior and paging
- Avatar stack sizing on event cards
- Image compression/resize before upload
- Placeholder card visual design
- Dark overlay opacity on image cards

## Deferred Ideas

None — discussion stayed within phase scope
