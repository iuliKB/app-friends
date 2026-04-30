# Phase 22: Gallery UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 22-gallery-ui
**Areas discussed:** Attribution display, Lightbox & swipe, Delete UX, Upload entry point

---

## Attribution Display

| Option | Description | Selected |
|--------|-------------|----------|
| Viewer bar only | Nothing on thumbnails — clean grid. Full-screen viewer shows avatar + name in overlay bar. | ✓ |
| Avatar overlay on grid + viewer bar | Small circular avatar badge in thumbnail corner + viewer bar. Richer but busier grid. | |

**User's choice:** Viewer bar only
**Notes:** Grid stays clean. Attribution (avatar + display name) in viewer bottom overlay bar, left side.

---

## Lightbox & Swipe

| Option | Description | Selected |
|--------|-------------|----------|
| New GalleryViewerModal | Horizontal FlatList with pagingEnabled for swipe navigation. Per-page ScrollView for pinch-to-zoom. New component in src/components/plans/. | ✓ |
| Extend ImageViewerModal | Add index prop + prev/next arrow buttons to existing modal. No swipe gesture — tap arrows to navigate. | |

**User's choice:** New GalleryViewerModal
**Notes:** Build new component rather than extend existing chat-specific ImageViewerModal. Swipe + pinch-to-zoom both work correctly with FlatList + per-page ScrollView approach.

---

## Delete UX

| Option | Description | Selected |
|--------|-------------|----------|
| Viewer bar only | Delete button in overlay bar of full-screen viewer, next to Save. Visible only on own photos. Grid stays clean. | ✓ |
| Viewer bar + grid long-press | Long-pressing thumbnail shows context menu with Delete for own photos. Also available in viewer bar. | |

**User's choice:** Viewer bar only
**Notes:** No delete affordance on thumbnails. Viewer shows [Save] [Delete] for own photos, [Save] only for others'.

---

## Upload Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| Section header '+' button | Camera icon in top-right of Photos section header. | |
| Camera FAB above the grid | Dedicated "Add Photo" button row above the grid. Scrolls with content. | ✓ |
| Empty slot in the grid | '+' placeholder cell in next available grid position, disappears at 10-photo cap. | |

**User's choice:** Camera FAB above the grid (dedicated "Add Photo" button row)
**Notes:** Button scrolls with plan content — not floating. Tapping opens ActionSheet with Photo Library + Camera options (chat pattern). Button hidden when user has uploaded 10 photos.

---

## Claude's Discretion

- ActionSheet implementation (library vs Alert.alert)
- Thumbnail aspect ratio and cell gap tokens
- Whether Photos section header uses SectionHeader component or styled Text
- GalleryViewerModal file location

## Deferred Ideas

- GALL-F01: Photo count badge on plan cards — V2
- GALL-F02: Upload progress indicator — V2
- Multi-photo picker — deferred from Phase 21, still out of Phase 22 scope
