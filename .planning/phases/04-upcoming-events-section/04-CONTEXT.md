# Phase 4: Upcoming Events Section - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Display upcoming plans/events on the homescreen as a horizontally scrollable card row. Users see at-a-glance what's coming up without navigating to the Explore tab. This phase also adds optional cover image support to plans (image picker during creation + edit, Supabase Storage).

</domain>

<decisions>
## Implementation Decisions

### Card Visual Design
- **D-01:** Wide landscape cards (~200px wide, ~140px tall) in a horizontal FlatList. Shows ~1.5 cards at a time to encourage scrolling
- **D-02:** Cards support optional cover images as background. When an image is set, it fills the card with a dark overlay for text legibility
- **D-03:** When no cover image is set, card background uses a random pastel color from a fixed palette, deterministically assigned via plan ID hash (consistent color per plan)
- **D-04:** Each card shows: title, date (e.g. "Mon 15, Aug · in 2 days"), avatar stack of attendees, member count badge (+12), and relative time indicator
- **D-05:** Extra rounded corners (RADII.xl or 20px) for playful feel, matching card stack cards

### Data Source & Filtering
- **D-06:** Show plans where the current user is the creator OR has RSVP status "going". Exclude plans the user is merely invited to or has declined
- **D-07:** Only future plans (scheduled_for > now). Past plans excluded
- **D-08:** Limit to 5 events, sorted by scheduled_for ascending (soonest first)

### Section Placement & Header
- **D-09:** Section placed below the Radar/Cards view area, at the bottom of the homescreen ScrollView content
- **D-10:** Section header: "Upcoming events ✨" with a "See all" link that navigates to the Explore tab
- **D-11:** Uses SectionHeader component pattern for the title

### Empty & Edge States
- **D-12:** When no upcoming events exist, show the section header + a placeholder card with "No plans yet — start one!" that links to plan creation
- **D-13:** Single event still shows in the horizontal scroll — no special case

### Image Upload Flow
- **D-14:** Optional cover image picker available during plan creation AND editable later from plan detail screen
- **D-15:** Uses expo-image-picker (camera roll only, no camera capture) + Supabase Storage for image hosting
- **D-16:** New `cover_image_url` column on the `plans` table (nullable text)

### Card Tap Behavior
- **D-17:** Tapping an event card navigates to the plan detail screen via `router.push` — same pattern as PlanCard in Explore tab

### Date Formatting
- **D-18:** Date displayed as combo format: "Mon 15, Aug · in 2 days" — short date plus relative context
- **D-19:** Reuse/extend the existing `formatPlanTime` utility from `PlanCard.tsx` for relative time, add short date formatting

### Claude's Discretion
- Card shadow/elevation styling
- Horizontal scroll snap behavior and paging
- Avatar stack sizing on the smaller event cards
- Image compression/resize before upload
- Placeholder card visual design
- Dark overlay opacity on image cards

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Homescreen integration
- `src/screens/home/HomeScreen.tsx` — Current homescreen layout, ScrollView structure, component placement
- `src/components/common/ScreenHeader.tsx` — Header pattern
- `src/components/common/SectionHeader.tsx` — Section header component for title + action

### Plans system
- `src/components/plans/PlanCard.tsx` — Existing plan card component with `formatPlanTime` utility
- `src/components/plans/AvatarStack.tsx` — Avatar stack component for member display
- `src/types/plans.ts` — Plan and PlanMember type definitions
- `src/hooks/usePlans.ts` — Existing plans data hook

### Design system
- `src/theme/` — Design tokens (COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII)

### Reference image
- `Ideas/up_events.png` — Visual reference for card style and layout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlanCard` + `formatPlanTime`: Existing card and time formatting — can extend for new date format
- `AvatarStack`: Already renders overlapping member avatars — reusable on event cards
- `SectionHeader`: Standard section title component with optional right action
- `FAB`: "Start Plan" button already on homescreen — CTA for empty state can use same route

### Established Patterns
- HomeScreen uses ScrollView (not FlatList) for its main content — event section uses a nested horizontal FlatList
- All styling via design tokens from `@/theme` with ESLint enforcement
- Components organized by domain: `src/components/plans/`, `src/components/home/`
- Supabase Storage pattern: not yet used in app — this is the first image upload feature

### Integration Points
- HomeScreen ScrollView: new section added below the Radar/Cards view area
- Plan creation form: add optional cover image picker
- Plan detail screen: add cover image display and edit capability
- Database: new `cover_image_url` column on `plans` table
- Supabase Storage: new bucket for plan cover images

</code_context>

<specifics>
## Specific Ideas

- Reference image (`Ideas/up_events.png`) shows colorful landscape cards with images, title overlay, date, avatar stack, and member count
- "Upcoming events ✨" title with sparkle emoji matches the reference aesthetic
- Pastel color palette for image-less cards should feel warm and inviting (pinks, yellows, light blues, soft greens)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-upcoming-events-section*
*Context gathered: 2026-04-11*
