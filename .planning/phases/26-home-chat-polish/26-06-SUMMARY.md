---
phase: 26-home-chat-polish
plan: "06"
subsystem: chat
tags: [animation, haptics, react-native, chat]
dependency_graph:
  requires: [26-05]
  provides: [CHAT-04]
  affects: [src/components/chat/MessageBubble.tsx]
tech_stack:
  added: []
  patterns: [Animated.spring scale compress-and-hold, useNativeDriver: true for scale transforms]
key_files:
  created: []
  modified:
    - src/components/chat/MessageBubble.tsx
decisions:
  - bubbleScaleAnim wraps own and others TouchableOpacity independently — poll branch left unwrapped as scale fires only for poll owners who get the context menu
metrics:
  duration_minutes: 5
  completed_date: "2026-05-05"
  tasks_completed: 1
  files_modified: 1
---

# Phase 26 Plan 06: CHAT-04 Long-press Bubble Scale Animation Summary

**One-liner:** Spring compress-and-hold animation (scale 1→0.96→1) on message bubble long-press using bubbleScaleAnim Animated.Value with useNativeDriver.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CHAT-04 — Long-press bubble scale animation | ac5ef9e | src/components/chat/MessageBubble.tsx |

## What Was Built

Added tactile scale feedback to message bubbles on long-press:

- `bubbleScaleAnim = useRef(new Animated.Value(1)).current` added alongside existing `fadeAnim` and `highlightAnim` refs
- `handleLongPress` springs to `toValue: 0.96` after all guard checks pass (pending, deleted, isPoll&&!isOwn guards) — scale fires only when the context menu will actually open
- `closeMenu` springs back to `toValue: 1.0` when the menu dismisses
- Both own-message and others-message `TouchableOpacity` wrapped in `Animated.View style={{ transform: [{ scale: bubbleScaleAnim }] }}`
- `useNativeDriver: true` on both spring calls (scale/transform is native-thread compatible)
- Spring config: `damping: 15, stiffness: 120` from `ANIMATION.easing.spring` tokens, `isInteraction: false`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

```
grep -n "bubbleScaleAnim\|toValue: 0.96\|toValue: 1.0\|transform.*scale" src/components/chat/MessageBubble.tsx
```
Output: ref declaration (line 422), spring to 0.96 (lines 461-463), spring to 1.0 (lines 474-476), Animated.View wrappers (lines 606, 720).

Unit tests: 6/6 passed (`npx tsx tests/unit/useChatRoom.send.test.ts`).

Plan 05 work verified preserved: `pendingBubble`, `failedBubble` styles, `void Haptics.selectionAsync()`.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Animation is entirely client-side render transform.

## Self-Check: PASSED

- `src/components/chat/MessageBubble.tsx` — modified and committed
- Commit `ac5ef9e` exists in git log
- All acceptance criteria met
