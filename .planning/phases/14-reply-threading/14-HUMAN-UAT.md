---
status: partial
phase: 14-reply-threading
source: [14-VERIFICATION.md]
started: 2026-04-21T00:00:00Z
updated: 2026-04-21T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Long-press context menu renders and positions correctly
expected: Long-pressing a message shows a Modal pill overlay above the touch point with Reply, Copy, and (own messages only) Delete actions
result: [pending]

### 2. Reply bar appears with correct name/preview after tapping Reply
expected: After tapping Reply in the context menu, the SendBar shows a 48px preview bar with the original sender's name and truncated message body
result: [pending]

### 3. Swipe-down gesture dismisses the reply bar
expected: Swiping down on the reply preview bar (dy>60 or vy>0.5) dismisses it, as does tapping ×
result: [pending]

### 4. Sent reply renders as a bubble with quoted block (requires live Supabase)
expected: After sending a reply, the message bubble shows a QuotedBlock above the body text with left accent bar, sender name, and truncated preview
result: [pending]

### 5. Tapping quoted block scrolls FlatList and flashes highlight on target
expected: Tapping the QuotedBlock calls onScrollToMessage, FlatList scrolls to the original message, which briefly flashes an orange tint highlight
result: [pending]

### 6. Toast appears when original is outside the 50-message window
expected: When the original message is not in the current 50-message window, a "Scroll up to see original" toast appears
result: [pending]

### 7. Soft-delete round-trip propagates via Realtime
expected: Tapping Delete on own message shows tombstone locally immediately; second session on same chat receives the tombstone via Realtime UPDATE within ~1s
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
