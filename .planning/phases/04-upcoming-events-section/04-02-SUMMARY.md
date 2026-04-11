---
phase: 04-upcoming-events-section
plan: "02"
subsystem: ui
tags: [react-native, expo-image, flatlist, horizontal-scroll, event-card, pastel-colors]

# Dependency graph
requires:
  - phase: 04-01
    provides: "useUpcomingEvents hook, formatEventCardDate utility, cover_image_url on Plan type"

provides:
  - "EventCard: 200x140px landscape card with pastel/image background, title, date label, AvatarStack, time icon"
  - "UpcomingEventsSection: section wrapper with SectionHeader, horizontal FlatList, empty placeholder card"

affects:
  - 04-03-homescreen-wiring

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "expo-image for cover images (caching, progressive decode) rather than react-native Image"
    - "Deterministic pastel color via charCodeAt(0) % palette.length on plan UUID"
    - "explicit height on horizontal FlatList style to prevent height-collapse in ScrollView"
    - "ItemSeparatorComponent for clean card gaps without per-item margins"
    - "snapToInterval = CARD_WIDTH + CARD_GAP for precise card-boundary snapping"

key-files:
  created:
    - src/components/home/EventCard.tsx
    - src/components/home/UpcomingEventsSection.tsx
  modified: []

key-decisions:
  - "expo-image used instead of react-native Image for cover_image_url to get native caching and graceful fallback on invalid URIs"
  - "height: 140 explicitly set on FlatList style (not contentContainerStyle) to prevent height-collapse inside ScrollView"
  - "ItemSeparatorComponent renders card gaps rather than marginRight on EventCard — keeps EventCard self-contained"
  - "Pastel background color derived from plan.id.charCodeAt(0) % 5 — stable hash, no runtime randomness"

patterns-established:
  - "Landscape card pattern: absoluteFill background + absoluteFill overlay + content View justifyContent:flex-end"
  - "Horizontal section pattern: SectionHeader in padded wrapper, FlatList with explicit height and paddingLeft alignment"

requirements-completed: [EVT-01, EVT-02, EVT-03, EVT-04, EVT-05, EVT-06]

# Metrics
duration: 2min
completed: 2026-04-11
---

# Phase 04 Plan 02: Upcoming Events Section — UI Components Summary

**EventCard (200x140px landscape) and UpcomingEventsSection (header + horizontal FlatList + empty state) built from theme tokens with pastel fallback backgrounds and expo-image cover photo support**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-11T18:52:46Z
- **Completed:** 2026-04-11T18:54:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- EventCard renders 200x140px cards with deterministic pastel backgrounds (5-color palette via UUID charCode hash) or expo-image cover photos with 40% dark overlay for legibility; taps navigate to `/plans/:id`
- UpcomingEventsSection wraps SectionHeader ("Upcoming events") with accent-colored "See all" link, horizontal snapping FlatList (explicit height:140 prevents ScrollView height-collapse), and a placeholder card with calendar icon when no events exist
- TypeScript strict mode passes clean across both components

## Task Commits

Each task was committed atomically:

1. **Task 1: EventCard component** - `d289418` (feat)
2. **Task 2: UpcomingEventsSection component** - `e34c52d` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/components/home/EventCard.tsx` - 200x140 landscape card: pastel/image bg, title, date, AvatarStack size=24, time icon, router.push to plan detail
- `src/components/home/UpcomingEventsSection.tsx` - Section wrapper: SectionHeader, horizontal FlatList with snap, empty placeholder card

## Decisions Made

- Used `expo-image` (not RN `Image`) for cover images — caching + graceful fallback on invalid URIs (T-04-03 threat mitigation)
- Set `height: 140` on FlatList `style` (not `contentContainerStyle`) to prevent height-collapse inside ScrollView — addresses RESEARCH.md Pitfall 1
- `ItemSeparatorComponent` for card gaps — cleaner than per-card `marginRight`, keeps EventCard self-contained

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both components ready for consumption by Plan 03 (HomeScreen wiring)
- `import { UpcomingEventsSection } from '@/components/home/UpcomingEventsSection'` works cleanly
- No blockers

---
*Phase: 04-upcoming-events-section*
*Completed: 2026-04-11*
