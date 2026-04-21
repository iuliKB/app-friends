---
phase: 16-media-sharing
plan: "03"
subsystem: chat-media
tags: [components, ui, image-bubble, sendbar, modal]
dependency_graph:
  requires:
    - sendImage (src/hooks/useChatRoom.ts — Plan 02)
    - uploadChatMedia (src/lib/uploadChatMedia.ts — Plan 01)
  provides:
    - onPhotoPress prop in SendBar (entry point for Plan 04 ActionSheet)
    - image bubble variant in MessageBubble (inline display + pending overlay)
    - onImagePress prop in MessageBubble (wired in Plan 04 ChatRoomScreen)
    - ImageViewerModal component (mounted in Plan 04 ChatRoomScreen)
  affects:
    - src/components/chat/SendBar.tsx
    - src/components/chat/MessageBubble.tsx
    - src/components/chat/ImageViewerModal.tsx
tech_stack:
  added: []
  patterns:
    - expo-image Image with recyclingKey for FlatList recycling
    - ScrollView pinch-to-zoom (maximumZoomScale=4, bouncesZoom, centerContent)
    - MediaLibrary.requestPermissionsAsync(true) writeOnly before save
    - isImage branch in bubble render — hides Copy, zero-pads container, renders inline image
key_files:
  created:
    - src/components/chat/ImageViewerModal.tsx
  modified:
    - src/components/chat/SendBar.tsx (onPhotoPress prop + image-outline icon)
    - src/components/chat/MessageBubble.tsx (onImagePress prop, isImage branch, Copy hidden, styles)
decisions:
  - requestPermissionsAsync(true) not ({writeOnly:true}) — actual SDK signature takes boolean not object
  - "#000" hardcoded in ImageViewerModal container — approved deviation per UI-SPEC (no token for pure black modal bg)
  - "rgba(0,0,0,0.3)" hardcoded in spinnerOverlay — no token for semi-transparent overlay on image
  - Fixed aspectRatio 4/3 for image bubble — V1 acceptable per RESEARCH.md A1; dynamic aspect ratio deferred
metrics:
  duration: "3 minutes"
  completed: "2026-04-21"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 16 Plan 03: UI Components Summary

**One-liner:** Photo icon in SendBar (onPhotoPress), image bubble variant in MessageBubble (expo-image, pending spinner, Copy hidden), and ImageViewerModal (ScrollView pinch-to-zoom 1-4x, MediaLibrary save, backdrop dismiss).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add photo icon to SendBar (onPhotoPress prop) | 68aa33c | src/components/chat/SendBar.tsx |
| 2 | Add image bubble variant to MessageBubble + create ImageViewerModal | d390a41 | src/components/chat/MessageBubble.tsx, src/components/chat/ImageViewerModal.tsx |

## Verification Results

- `npx tsc --noEmit` → 3 pre-existing errors in `friends/[id].tsx` only (out-of-scope); no new errors
- `npx tsx tests/unit/useChatRoom.imageUpload.test.ts` → 4 passed, 0 failed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed requestPermissionsAsync call signature**
- **Found during:** Task 2 — TypeScript compile
- **Issue:** Plan specified `MediaLibrary.requestPermissionsAsync({ writeOnly: true })` but actual SDK signature is `requestPermissionsAsync(writeOnly?: boolean)` — object form is not valid
- **Fix:** Changed to `MediaLibrary.requestPermissionsAsync(true)` matching actual types
- **Files modified:** src/components/chat/ImageViewerModal.tsx
- **Commit:** d390a41

## Threat Surface Scan

All threats in the plan's threat register were mitigated as specified:

| T-ID | Mitigation | Verified |
|------|-----------|---------|
| T-16-10 | `requestPermissionsAsync(true)` called before every save; denied → Alert shown, save aborted | Yes |
| T-16-11 | `{!isImage && ...}` wraps Copy action — prevents copying null body to clipboard | Yes |
| T-16-12 | expo-image with `recyclingKey={message.id}`, fixed 240pt width | Yes |
| T-16-09 | CDN URL accepted — UUID-namespaced, public-read bucket per design | Accepted |

No new unplanned threat surface introduced.

## Self-Check: PASSED

- [x] src/components/chat/SendBar.tsx contains `onPhotoPress?: () => void` in interface
- [x] src/components/chat/SendBar.tsx contains `name="image-outline"` Ionicons
- [x] src/components/chat/SendBar.tsx contains `accessibilityLabel="Attach photo"`
- [x] src/components/chat/MessageBubble.tsx contains `onImagePress` in interface
- [x] src/components/chat/MessageBubble.tsx contains `isImage` constant
- [x] src/components/chat/MessageBubble.tsx contains image bubble JSX with expo-image Image
- [x] src/components/chat/MessageBubble.tsx Copy action wrapped in `{!isImage && ...}`
- [x] src/components/chat/ImageViewerModal.tsx exists and exports `ImageViewerModal`
- [x] src/components/chat/ImageViewerModal.tsx contains `maximumZoomScale={4}` and `minimumZoomScale={1}`
- [x] src/components/chat/ImageViewerModal.tsx contains `saveToLibraryAsync`
- [x] Commit 68aa33c exists (SendBar)
- [x] Commit d390a41 exists (MessageBubble + ImageViewerModal)
- [x] 4 unit tests pass, exit 0
- [x] No new TypeScript errors
