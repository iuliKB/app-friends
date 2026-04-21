# Phase 16: Media Sharing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 16-media-sharing
**Areas discussed:** Photo send entry point, Inline bubble & display, Full-screen viewer, Send flow & upload state

---

## Photo Send Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| Two rows in attachment sheet | Photo Library + Camera as separate rows above Poll in + menu | |
| Single 'Photo' row → sub-choice | One menu row, sub-ActionSheet for library vs camera | |
| Inline toolbar icons | Camera/gallery icons in the SendBar row itself | ✓ |

**User's choice:** Single photo icon inline in the SendBar row (noted: one icon, not two)

**Follow-up — what does tapping the icon do:**

| Option | Description | Selected |
|--------|-------------|----------|
| Alert/ActionSheet: Library or Camera | Native ActionSheet with two options | ✓ |
| Goes straight to photo library | Opens picker directly | |
| Opens the attachment sheet | Reuses + menu | |

**Notes:** User confirmed single icon with ActionSheet for library/camera choice. The + attachment menu stays unchanged (Poll, Split Expenses, To-Do).

---

## Inline Bubble & Display

| Option | Description | Selected |
|--------|-------------|----------|
| Aspect-ratio-preserving, capped width | Max ~240pt wide, height scales with aspect ratio up to ~320pt | ✓ |
| Fixed square thumbnail | Always 200×200pt, center-cropped | |

**User's choice:** Aspect-ratio-preserving

**Reactions on image messages:**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, reactions work on images | Same emoji strip + context menu as text messages | ✓ |
| No, skip reactions on images | Image messages have no context menu | |

**Caption support:**

| Option | Description | Selected |
|--------|-------------|----------|
| Image-only, no caption | body = NULL, clean iMessage-style bubble | ✓ |
| Optional text caption | body can be non-null for image messages | |

---

## Full-Screen Viewer

| Option | Description | Selected |
|--------|-------------|----------|
| Close button only, no zoom | X button, tap anywhere to close | |
| Close + pinch-to-zoom | ScrollView with maximumZoomScale + tap-anywhere close | ✓ |

**Save to camera roll:**

| Option | Description | Selected |
|--------|-------------|----------|
| No, close only | Minimal V1 — no save button | |
| Yes, save to camera roll | Download icon via expo-media-library | ✓ |

**Notes:** `expo-media-library` is not yet installed; planner must add it. Save icon in top-left of viewer.

---

## Send Flow & Upload State

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic placeholder bubble with spinner | Bubble appears immediately with spinner overlay; updates on success | ✓ |
| Block send bar, then appear | Chat frozen during upload, progress bar at top | |

**Upload failure handling:**

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + remove placeholder | Error toast, placeholder removed, no retry UI | ✓ |
| Retry button on placeholder | Placeholder stays with retry affordance | |

---

## Claude's Discretion

- Ionicons icon name for the photo button in SendBar
- Whether `ImageViewerModal` is a separate file or inline in `MessageBubble`
- Exact toast implementation for upload failure
- Whether optimistic placeholder uses local file URI or base64 preview as Image source
- Spinner overlay implementation details

## Deferred Ideas

- Photo captions — separate text message is the pattern; captions out of scope
- Video sharing — V2
- Share-to-external-app from viewer — V2
- Retry UI on upload failure — V2
- Multiple photo selection — V2
