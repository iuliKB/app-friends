---
phase: 16-media-sharing
plan: "04"
subsystem: chat-media
tags: [integration, chat, photo-picker, compression, modal]
dependency_graph:
  requires:
    - sendImage (src/hooks/useChatRoom.ts — Plan 02)
    - ImageViewerModal (src/components/chat/ImageViewerModal.tsx — Plan 03)
    - onPhotoPress in SendBar (src/components/chat/SendBar.tsx — Plan 03)
    - onImagePress in MessageBubble (src/components/chat/MessageBubble.tsx — Plan 03)
  provides:
    - End-to-end photo send flow: picker → compress → upload → inline bubble → full-screen viewer
  affects:
    - src/screens/chat/ChatRoomScreen.tsx
tech_stack:
  added: []
  patterns:
    - Alert.alert ActionSheet for photo source selection (matches profile.tsx avatar pattern)
    - manipulateAsync({resize:{width:1280}}, {compress:0.75, format:SaveFormat.JPEG}) mandatory before sendImage
    - showToast(message?) optional-param extension with reset-to-default on dismiss
    - viewerImageUrl: string | null state driving ImageViewerModal visibility
key_files:
  created: []
  modified:
    - src/screens/chat/ChatRoomScreen.tsx (all Phase 16 wiring: imports, state, handlers, component props, modal mount)
decisions:
  - showToast extended with optional message param that resets to default on animation end — preserves existing scroll-to-original toast behaviour without duplicating animation logic
  - handlePhotoSelected always calls setReplyContext(null) whether upload succeeds or fails — prevents stale reply bar
  - Camera permission denial shows explanation Alert with Open Settings (T-16-14 mitigation)
  - manipulateAsync called in handlePhotoSelected before every sendImage call — compression is mandatory per T-16-13 and STATE.md D-04
metrics:
  duration: "~10 minutes"
  completed: "2026-04-21"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 16 Plan 04: Integration Wiring Summary

**One-liner:** Wired expo-image-picker ActionSheet, manipulateAsync compression (1280px / 0.75 JPEG), sendImage, and ImageViewerModal into ChatRoomScreen — completing the end-to-end photo send flow across all chat types.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Wire photo picker, compression, sendImage, and ImageViewerModal in ChatRoomScreen | fbb3465 | src/screens/chat/ChatRoomScreen.tsx |
| 2 | Human verification checkpoint | — | (awaiting human approval) |

## Verification Results

- `npx tsc --noEmit` → 3 pre-existing errors in `friends/[id].tsx` only (out-of-scope); no new errors
- `npx tsx tests/unit/useChatRoom.imageUpload.test.ts` → 4 passed, 0 failed
- `npx tsx tests/unit/aggregateReactions.test.ts` → 6 passed, 0 failed
- `npx tsx tests/unit/birthdayFormatters.test.ts` → 3 passed, 0 failed
- `npx tsx tests/unit/useChatRoom.reactions.test.ts` → 12 passed, 0 failed
- Total: 25 passed, 0 failed

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

All threats in the plan's threat model were mitigated as specified:

| T-ID | Mitigation | Verified |
|------|-----------|---------|
| T-16-13 | `manipulateAsync` called before every `sendImage` in `handlePhotoSelected` — compression is not optional | Yes |
| T-16-14 | `requestCameraPermissionsAsync()` before `launchCameraAsync()`; denial shows Camera Access Needed alert with Open Settings | Yes |
| T-16-15 | `ImageViewerModal` mounted outside FlatList; `visible={viewerImageUrl !== null}` is the only render-affecting condition | Yes (accepted) |
| T-16-16 | Toast shows only "Photo could not be sent" — no stack trace or internal error details exposed | Yes (accepted) |

No new unplanned threat surface introduced.

## Self-Check: PASSED

- [x] src/screens/chat/ChatRoomScreen.tsx contains `sendImage` in useChatRoom destructure
- [x] src/screens/chat/ChatRoomScreen.tsx contains `handlePhotoPress` with `Alert.alert('Send Photo', ...)`
- [x] src/screens/chat/ChatRoomScreen.tsx contains `handlePhotoSelected` with `manipulateAsync(localUri, [{resize:{width:1280}}], {compress:0.75,format:SaveFormat.JPEG})`
- [x] src/screens/chat/ChatRoomScreen.tsx contains `onPhotoPress={handlePhotoPress}` on SendBar
- [x] src/screens/chat/ChatRoomScreen.tsx contains `onImagePress={(url) => setViewerImageUrl(url)}` on MessageBubble
- [x] src/screens/chat/ChatRoomScreen.tsx contains `<ImageViewerModal visible={viewerImageUrl !== null}` mount
- [x] Commit fbb3465 exists
- [x] 25 unit tests pass, exit 0
- [x] No new TypeScript errors
