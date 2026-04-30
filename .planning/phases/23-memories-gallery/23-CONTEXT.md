# Phase 23: Memories Gallery - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a "Recent Memories" widget on the Home screen showing the latest photos from all plans the user is part of, plus a full-screen `/memories` gallery screen where all photos are grouped by plan (newest plan first). Tapping "See all" on the widget navigates to the gallery. Tapping any photo opens the existing `GalleryViewerModal` viewer.

This phase does NOT add photo upload, delete, or any per-plan modification — those live in Phase 22.

</domain>

<decisions>
## Implementation Decisions

### Home Widget Layout
- **D-01:** The widget uses a **horizontal scrolling thumbnail strip** — 3–4 square photo thumbnails in a `FlatList` with `horizontal={true}`, followed by a "See all" link in the section header. Pattern matches `UpcomingEventsSection` exactly.
- **D-02:** Each thumbnail shows the **plan name as a small caption below** the photo (e.g. "Summer BBQ"). Users can identify which plan a photo belongs to directly from the widget.
- **D-03:** When no photos exist across the user's plans, the widget is **hidden entirely**. It only renders once at least 1 photo exists. No empty state placeholder in the widget.

### Full Gallery Screen Layout
- **D-04:** The Memories screen uses a **`SectionList`** where each section = one plan. Section header = plan title. Sections ordered newest plan first (by the most recent photo's `created_at` within that plan).
- **D-05:** Photo grid within each section uses **3 columns** — matches the per-plan gallery established in Phase 22. Use the same `CELL_SIZE` formula (`(Dimensions.get('window').width - SPACING.lg * 2 - SPACING.sm * 2) / 3`) and square aspect ratio.
- **D-06:** The screen is a **root-level route** at `src/app/memories.tsx` (not inside a tab folder). Same pattern as `src/app/friends/[id].tsx`. Back arrow returns to whichever screen opened it.

### Full-Screen Viewer
- **D-07:** Tapping any thumbnail in the Memories screen opens the **existing `GalleryViewerModal`** component. Pass the full photos array for that plan section and the tapped index. Viewer shows save + conditional delete (user's own photos only) — same behaviour as Phase 22.

### Data Hook
- **D-08:** Create a new **`useAllPlanPhotos`** hook that:
  1. Fetches all `plan_photos` rows the current user can see (joined with plan title via `plan_id`)
  2. Generates signed URLs in a single batch call (same pattern as `usePlanPhotos`)
  3. Returns photos grouped by plan: `{ planId, planTitle, photos: PlanPhotoWithUploader[] }[]`, sorted newest-plan-first
- **D-09:** The hook performs a **fresh fetch on mount** — no cached/store data. Same pattern as all other data hooks in the app. Loading state while fetching.
- **D-10:** The widget on the Home screen calls `useAllPlanPhotos` and renders the flat list of the most recent 6 photos across all plans (sorted by `created_at DESC`).

### Navigation
- **D-11:** The widget "See all" link navigates to `/memories` using `useRouter().push('/memories')`.
- **D-12:** Tapping a thumbnail in the **widget** also navigates to `/memories` (does not open the viewer inline — the gallery screen is the destination).

### Claude's Discretion
- How to handle signed URL expiry in the widget (1-hour TTL) — refetch on re-focus is acceptable
- Whether to show a `SectionHeader` component or a plain `Text` for plan section titles in the gallery screen
- Pull-to-refresh on the gallery screen (standard pattern, Claude decides)
- Skeleton loading implementation (placeholder shimmer or simple ActivityIndicator)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing gallery foundation
- `.planning/phases/21-gallery-foundation/21-CONTEXT.md` — bucket model, signed URLs, hook shape, upload pattern
- `.planning/phases/22-gallery-ui/22-CONTEXT.md` — CELL_SIZE formula, GalleryViewerModal props, per-plan grid decisions

### Closest widget analog
- `src/components/home/UpcomingEventsSection.tsx` — horizontal FlatList widget pattern, SectionHeader + "See all" wiring, height constraint for horizontal list inside ScrollView

### Viewer component (reuse as-is)
- `src/components/plans/GalleryViewerModal.tsx` — props: `visible`, `photos: PlanPhotoWithUploader[]`, `initialIndex`, `deletePhoto`, `onClose`

### Data type
- `src/types/database.ts` — `PlanPhotoWithUploader` type (lines ~868–882); `plan_photos` table schema

### Existing cross-plan hook pattern reference
- `src/hooks/usePlans.ts` — how cross-plan Supabase queries are structured
- `src/hooks/useUpcomingEvents.ts` — how plans store is consumed for derived data

### Navigation pattern
- `src/app/friends/[id].tsx` — root-level route pattern (not tab-nested), back navigation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UpcomingEventsSection` — direct structural template for the Home widget (horizontal FlatList, SectionHeader, "See all" CTA, height: 140 constraint)
- `GalleryViewerModal` — reuse directly for full-screen photo viewing; no modifications needed
- `SectionHeader` component — for the plan title headers in the gallery SectionList
- `CELL_SIZE` formula from Phase 22 — copy for the 3-column grid in the gallery screen
- `usePlanPhotos` — reference for signed URL batch generation pattern

### Established Patterns
- All hooks: fresh fetch on mount, `useState` + `useEffect` + `supabase` query, no global store
- Styling: `useMemo([colors])` wrapping `StyleSheet.create` for all themed styles
- No ScrollView nesting inside FlatList/SectionList — enforced project constraint
- Horizontal FlatList inside a vertical ScrollView requires explicit `height` on the FlatList style

### Integration Points
- `src/screens/home/HomeScreen.tsx` — add `RecentMemoriesSection` component after `UpcomingEventsSection`
- `src/app/memories.tsx` — new root-level route (create alongside `src/app/friends/[id].tsx`)
- `src/hooks/useAllPlanPhotos.ts` — new hook (create alongside `usePlanPhotos.ts`)

</code_context>

<specifics>
## Specific Ideas

- Widget thumbnail strip visually matches the UpcomingEventsSection horizontal card strip — consistent Home screen rhythm
- Plan name caption below each widget thumbnail (small, secondary text color)
- Gallery sections ordered newest-first by most recent photo in each plan — feels like a living timeline

</specifics>

<deferred>
## Deferred Ideas

- Promote Memories to a dedicated tab — future phase, trigger: when gallery usage warrants a nav slot
- Search/filter photos by plan or date — new capability, V2
- "On this day" memories surfacing — new capability, V2

</deferred>

---

*Phase: 23-memories-gallery*
*Context gathered: 2026-04-30*
