---
phase: 15-message-reactions
plan: "02"
subsystem: chat-ui
tags: [reactions, emoji, ui, MessageBubble]
dependency_graph:
  requires: []
  provides: [MessageBubble.onReact-prop, EmojiStripRow, ReactionBadgeRow, PRESET_EMOJIS]
  affects: [src/screens/chat/ChatRoomScreen.tsx]
tech_stack:
  added: []
  patterns: [inline-JSX-variable, StyleSheet-sibling-pattern, PRESET_EMOJIS-typed-const]
key_files:
  created: []
  modified:
    - src/components/chat/MessageBubble.tsx
decisions:
  - "PRESET_EMOJIS typed as const tuple — only 6 known string literals can be passed to onReact; prevents user-supplied emoji tampering (T-15-02-02)"
  - "emojiStripTop uses Math.max clamping to prevent strip rendering under status bar"
  - "ReactionBadgeRow placed as sibling to bubble View (not inside it) to avoid layout distortion (Pitfall 5)"
  - "borderColor: 'transparent' on inactive badge avoids layout shift when own-reaction state activates border"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-21"
  tasks_completed: 2
  files_modified: 1
---

# Phase 15 Plan 02: MessageBubble Reactions UI Summary

EmojiStripRow (6-emoji tapback above context menu) and ReactionBadgeRow (count pills below bubble) added to MessageBubble.tsx with full design-token styling and accessibility labels.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add onReact prop, PRESET_EMOJIS, EmojiStripRow, emojiStripTop | 4e67fe1 | src/components/chat/MessageBubble.tsx |
| 2 | Add ReactionBadgeRow for own and others' messages | 2f34b7e | src/components/chat/MessageBubble.tsx |

## What Was Built

- `onReact: (messageId: string, emoji: string) => void` added to `MessageBubbleProps` interface
- `PRESET_EMOJIS` typed `as const` tuple: `['❤️', '😂', '😮', '😢', '👍', '🔥']`
- `STRIP_HEIGHT = 52` and `emojiStripTop` clamping: `Math.max(SPACING.xl + STRIP_HEIGHT + SPACING.sm, pillY - STRIP_HEIGHT - SPACING.sm)`
- `EMOJI_NAMES` map and `getEmojiName()` helper for accessibility labels
- `EmojiStripRow` rendered as `View` with `styles.emojiStrip` above `contextPill` inside the existing Modal
- Already-reacted emoji highlighted with `rgba(249, 115, 22, 0.20)` background via `styles.emojiButtonActive`
- `ReactionBadgeRow` rendered conditionally in both own and others' message branches when `(message.reactions?.length ?? 0) > 0`
- Own-reaction badge: `rgba(249, 115, 22, 0.20)` background + `COLORS.interactive.accent` border
- Badge alignment: `alignSelf: 'flex-end'` for own, `alignSelf: 'flex-start'` for others via `reactionBadgeRowOthers`
- All accessibility labels per UI-SPEC copywriting contract

## New Styles Added

`emojiStrip`, `emojiButton`, `emojiButtonActive`, `reactionBadgeRow`, `reactionBadgeRowOthers`, `reactionBadge`, `reactionBadgeOwn`, `reactionBadgeCount`

## TypeScript Status

`npx tsc --noEmit` — 0 errors in `MessageBubble.tsx`. Expected call-site error in `ChatRoomScreen.tsx` (missing `onReact` prop) will be resolved in Plan 04. Pre-existing errors in `friends/[id].tsx` are unrelated.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. `onReact` prop is declared and wired in the UI but the hook backing it does not yet exist. This is by design for Wave 1; Plan 03 adds the Supabase mutation hook and Plan 04 wires it to `ChatRoomScreen`. The prop is required (non-optional) so TypeScript enforces wiring before the app compiles cleanly.

## Threat Surface

No new network endpoints or auth paths introduced. UI-only changes. PRESET_EMOJIS typed const prevents arbitrary emoji injection (T-15-02-02 mitigated). onReact callback validated at hook level (Plans 03/04).

## Self-Check

- [x] `src/components/chat/MessageBubble.tsx` exists and modified
- [x] Commit 4e67fe1 exists (Task 1)
- [x] Commit 2f34b7e exists (Task 2)
- [x] `PRESET_EMOJIS` present at module level
- [x] `onReact` in interface, destructuring, and all 3 call sites
- [x] `reactionBadgeRow` in StyleSheet and both render branches
- [x] `emojiStrip`, `emojiButton`, `emojiButtonActive` in StyleSheet

## Self-Check: PASSED
