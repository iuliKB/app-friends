---
phase: 16-media-sharing
fixed_at: 2026-04-21T00:00:00Z
review_path: .planning/phases/16-media-sharing/16-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-04-21
**Source review:** .planning/phases/16-media-sharing/16-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 3
- Skipped: 1

## Fixed Issues

### WR-02: Photo library launched without requesting permissions (iOS)

**Files modified:** `src/screens/chat/ChatRoomScreen.tsx`
**Commit:** c09b9ca
**Applied fix:** Added `ImagePicker.requestMediaLibraryPermissionsAsync()` check at the start of the `Photo Library` action path in `handlePhotoPress`. If permission is not granted, shows an Alert with an "Open Settings" option and returns early, mirroring the existing camera path pattern.

---

### WR-03: Stale closure read in `deleteMessage` rollback

**Files modified:** `src/hooks/useChatRoom.ts`
**Commit:** 02aa7f0
**Applied fix:** Collapsed the snapshot-capture and the optimistic update into a single `setMessages(prev => ...)` call. `originalBody` and `originalMessageType` are now captured inside the updater from `prev` (the current state being mutated) rather than from the stale closure variable `messages`. Matches the pattern already used by `addReaction`.

---

### WR-04: Text message dedup can produce false negatives for identical concurrent messages

**Files modified:** `src/hooks/useChatRoom.ts`
**Commit:** 264faed
**Applied fix:** Two coordinated changes:
1. `sendMessage` now generates a client-side UUID (same pattern as `sendImage`) and passes it as `id` in the Supabase insert.
2. The realtime INSERT dedup guard now uses `id`-based matching as the primary strategy (`m.pending && m.id === incoming.id`). The existing body+sender+5s window guard is retained as a secondary fallback with an added `m.body !== null` guard to prevent false matches on image messages. This eliminates the false-negative dedup scenario when the same text is sent twice within 5 seconds.

## Skipped Issues

### WR-01: Save button stays permanently disabled after permission denial

**File:** `src/components/chat/ImageViewerModal.tsx:47`
**Reason:** Bug does not exist in current code. The actual implementation wraps the entire save flow in a `try/catch/finally` block where `setSaving(false)` is in the `finally` clause (line 51). JavaScript's `finally` executes unconditionally even when `return` is called inside `try`, so the permission-denial early return on line 46 correctly resets the saving state via `finally`. The reviewer's concern was valid against the snippet shown but the full context shows the code is already correct.
**Original issue:** Permission denial path returns without calling `setSaving(false)`, leaving the save button permanently disabled.

---

_Fixed: 2026-04-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
