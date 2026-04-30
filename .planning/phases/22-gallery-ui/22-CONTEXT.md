# Phase 22: Gallery UI - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Photo grid section in PlanDashboardScreen (3-column, scrollable), full-screen photo viewer with swipe navigation, uploader attribution in the viewer, delete-own photos (viewer only), save any photo to camera roll, upload entry point ("Add Photo" button row above grid), and PlanDashboardScreen ScrollView→FlatList refactor.

Video, photo comments, and upload progress indicators are V2 per REQUIREMENTS.md and out of scope.

</domain>

<decisions>
## Implementation Decisions

### Attribution Display
- **D-01:** Uploader attribution is shown **only in the full-screen viewer** — not on grid thumbnails. The grid stays clean (no overlays). The viewer's bottom overlay bar shows the uploader's circular avatar and display name on the left side.
- **D-02:** The viewer bar layout: `[avatar] [display name]` on the left, `[Save] [Delete]` actions on the right. Delete is conditionally rendered — only visible when `photo.uploaderId === currentUserId`.

### Full-Screen Lightbox (GalleryViewerModal)
- **D-03:** Build a **new `GalleryViewerModal` component** (separate from the existing `ImageViewerModal` in `src/components/chat/`). `ImageViewerModal` remains untouched — it handles the single-image chat use case.
- **D-04:** Navigation mechanism: horizontal `FlatList` with `pagingEnabled` — one photo per page. Swipe left/right to browse photos in upload order (ASC).
- **D-05:** Pinch-to-zoom: per-page `ScrollView` with `maximumZoomScale={4}` wrapping each `expo-image` — same pattern as `ImageViewerModal`. Pinch is scoped to the active page so it doesn't conflict with swipe.
- **D-06:** Save-to-camera-roll logic: copy the `handleSave` function pattern from `ImageViewerModal` (uses `expo-media-library`, same permissions flow).
- **D-07:** The modal opens to the tapped photo's index. Tapping a thumbnail passes `initialIndex` and the full `photos` array.

### Delete UX
- **D-08:** Delete button lives **only in the full-screen viewer overlay bar** — no delete affordance on thumbnails (no long-press in the grid).
- **D-09:** The delete button is visible only on photos where `photo.uploaderId === currentUserId`. Other users' photos show Save only.
- **D-10:** After `deletePhoto()` resolves successfully, close the viewer and the grid refetches. No optimistic removal needed given small photo counts.

### Upload Entry Point
- **D-11:** A dedicated "Add Photo" button row sits **above the photo grid** inside the Photos section. It does not float — it scrolls with the rest of the plan content.
- **D-12:** Tapping "Add Photo" opens a native `ActionSheet` (or `Alert.alert` with options) presenting: **Photo Library** and **Camera** — matching the chat attachment sheet pattern.
- **D-13:** When the current user has already uploaded **10 photos** for this plan, the "Add Photo" button is **hidden** entirely (not greyed out). The per-user count is derived from `photos.filter(p => p.uploaderId === currentUserId).length`.
- **D-14:** Upload uses the existing `usePlanPhotos.uploadPhoto(localUri)` which returns `{ error: 'photo_cap_exceeded' | 'upload_failed' | null }`. The server-enforced cap is the authoritative guard; hiding the button at 10 is a UI-only shortcut.

### FlatList Refactor
- **D-15:** PlanDashboardScreen is refactored from a single outer `ScrollView` to a single outer `FlatList`. All existing plan content (cover, details, map, members, links, IOU, chat button) is placed inside `ListHeaderComponent`. The Photos section (add button + grid) is the only item in the FlatList `data` — or also placed in `ListFooterComponent` if the grid is non-scrollable. Either is acceptable; planner chooses based on nesting constraints.
- **D-16:** The photo grid itself renders inside the FlatList — either as a numColumns FlatList nested item, or as a fixed-layout grid using `flexWrap: 'wrap'` on a `View` inside `ListFooterComponent`. No ScrollView-inside-FlatList nesting is allowed.

### Empty State
- **D-17:** When `photos.length === 0`, the Photos section shows an "Add the first photo" empty state using the existing `EmptyState` component pattern. Non-members (invited-but-not-accepted) see the same empty state message but without the "Add Photo" button.

### Claude's Discretion
- Whether to use `ActionSheet` from `@expo/react-native-action-sheet` (if available) or `Alert.alert` with button options for the photo picker choice sheet
- Thumbnail aspect ratio: square (1:1) using absolute positioning inside equal-width cells, or `aspectRatio: 1` flex approach
- Gap between thumbnail cells: Claude picks a token value consistent with existing grid patterns
- Whether the Photos section header uses `SectionHeader` component or a styled `Text` — match the existing section headers in PlanDashboardScreen
- `GalleryViewerModal` file path: `src/components/plans/GalleryViewerModal.tsx`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Gallery — GALL-04, GALL-05, GALL-06, GALL-07, GALL-08 (Phase 22 scope)

### Phase 21 Foundation (must be read — Phase 22 consumes all of it)
- `.planning/phases/21-gallery-foundation/21-CONTEXT.md` — all Phase 21 decisions; especially D-01 through D-16 (bucket model, signed URLs, hook shape, upload pattern)

### Existing Viewer to Reference (not extend)
- `src/components/chat/ImageViewerModal.tsx` — reference for: Modal setup, ScrollView pinch-to-zoom pattern, `expo-media-library` save flow, overlay button positions. Build `GalleryViewerModal` with similar structure.

### Existing Upload Pattern
- `src/screens/plans/PlanDashboardScreen.tsx` — current file being refactored (ScrollView → FlatList); also reference for `expo-image-picker` usage (cover image flow lines ~14, 56-57)

### Design System
- `src/theme/index.ts` — spacing, color, font tokens; all new styles must use these
- `src/components/common/EmptyState.tsx` — component for the no-photos empty state

### No external ADRs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/usePlanPhotos.ts` — already built in Phase 21; provides `photos`, `uploadPhoto`, `deletePhoto`, `refetch`; no changes needed to the hook
- `src/components/chat/ImageViewerModal.tsx` — reference implementation for GalleryViewerModal; copy the Modal wrapper, ScrollView zoom, save logic, and overlay button layout
- `src/components/common/EmptyState.tsx` — use for the no-photos empty state in the grid section
- `src/components/common/AvatarCircle.tsx` — use for uploader avatar in the viewer overlay bar
- `expo-image-picker` — already imported in PlanDashboardScreen; reuse for the gallery upload flow
- `expo-media-library` — already used in ImageViewerModal; import for save-to-camera-roll in GalleryViewerModal

### Established Patterns
- `StyleSheet.create` inside `useMemo([colors])` + `useTheme()` — required for all new styled components
- `fetch(uri).arrayBuffer()` → Supabase upload — do not use FormData; already handled inside `uploadPlanPhoto.ts`
- ActionSheet for multi-option pickers: check if `@expo/react-native-action-sheet` is available; otherwise use `Alert.alert` with buttons
- Section layout in PlanDashboardScreen: `<View style={styles.section}>` with `sectionTitle` text — match this for the Photos section header

### Integration Points
- `src/screens/plans/PlanDashboardScreen.tsx` — primary file; ScrollView→FlatList refactor + add Photos section
- `src/components/plans/GalleryViewerModal.tsx` — new file to create
- No new hooks or lib functions needed — all infra exists from Phase 21

</code_context>

<specifics>
## Specific Ideas

- The "Add Photo" button row should look similar to a section action row, not a floating button — it scrolls with the content
- Viewer bar overlay: semi-transparent dark background so avatar/name/actions are readable over any photo color
- When the viewer is open and the user deletes the current photo, close the viewer (don't try to advance to the next photo)

</specifics>

<deferred>
## Deferred Ideas

- Photo count badge on plan cards (GALL-F01) — V2 per REQUIREMENTS.md
- Upload progress indicator per photo (GALL-F02) — V2 per REQUIREMENTS.md
- Multi-photo picker (select N at once) — deferred from Phase 21 discussion; still out of scope for Phase 22

</deferred>

---

*Phase: 22-gallery-ui*
*Context gathered: 2026-04-30*
