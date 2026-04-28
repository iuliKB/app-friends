---
phase: 19
plan: "02"
subsystem: theme-migration
tags: [theme, useTheme, dark-mode, components, chat, home, iou, plans, squad]
dependency_graph:
  requires: [19-01-SUMMARY.md]
  provides: [feature-component theme reactivity for chat/home/iou/plans/squad directories]
  affects: [all screens rendering chat/home/iou/plans/squad components]
tech_stack:
  added: []
  patterns:
    - useTheme() + useMemo([colors]) inside component body for themed StyleSheet
    - Module-level RSVP_OPTIONS/STATUS_COLORS moved into useMemo inside component body
    - Sub-component pattern: pass colors as explicit prop when sub-component is file-scoped
    - Module-level static StyleSheet for sub-components with no color dependencies (quotedBlockStyles)
key_files:
  created: []
  modified:
    - src/components/chat/BirthdayWishListPanel.tsx
    - src/components/chat/ChatListRow.tsx
    - src/components/chat/GroupParticipantsSheet.tsx
    - src/components/chat/ImageViewerModal.tsx
    - src/components/chat/MessageBubble.tsx
    - src/components/chat/PinnedPlanBanner.tsx
    - src/components/chat/PollCard.tsx
    - src/components/chat/PollCreationSheet.tsx
    - src/components/chat/ReactionsSheet.tsx
    - src/components/chat/SendBar.tsx
    - src/components/home/CardStackView.tsx
    - src/components/home/EventCard.tsx
    - src/components/home/FriendSwipeCard.tsx
    - src/components/home/HomeFriendCard.tsx
    - src/components/home/HomeWidgetBanners.tsx
    - src/components/home/HomeWidgetRow.tsx
    - src/components/home/OverflowChip.tsx
    - src/components/home/RadarBubble.tsx
    - src/components/home/RadarView.tsx
    - src/components/home/RadarViewToggle.tsx
    - src/components/home/ReEngagementBanner.tsx
    - src/components/home/UpcomingEventsSection.tsx
    - src/components/iou/BalanceRow.tsx
    - src/components/iou/ExpenseHeroCard.tsx
    - src/components/iou/ExpenseHistoryRow.tsx
    - src/components/iou/ParticipantRow.tsx
    - src/components/iou/RemainingIndicator.tsx
    - src/components/iou/SplitModeControl.tsx
    - src/components/plans/AvatarStack.tsx
    - src/components/plans/IOUNotesField.tsx
    - src/components/plans/LinkDumpField.tsx
    - src/components/plans/MemberList.tsx
    - src/components/plans/PlanCard.tsx
    - src/components/plans/RSVPButtons.tsx
    - src/components/squad/BirthdayCard.tsx
    - src/components/squad/CompactFriendRow.tsx
    - src/components/squad/IOUCard.tsx
    - src/components/squad/StreakCard.tsx
    - src/components/squad/WishListItem.tsx
decisions:
  - "QuotedBlock in MessageBubble: extracted quotedBlockStyles as module-level static StyleSheet for structural styles; colors passed as prop"
  - "RSVPButtons RSVP_OPTIONS array moved from module scope into useMemo([colors]) inside component to make activeColor reactive"
  - "RadarBubble targetSize: use literal 48 for dead state instead of BubbleSizeMap.dead index access (avoids number | undefined under noUncheckedIndexedAccess)"
  - "ExpenseHeroCardSkeleton: second exported function gets its own useTheme + useMemo call (two exports from same file, both must be independent hooks)"
  - "BirthdayCard: inlined BirthdayCardSkeleton render into exported function (skeleton now reads from parent's useMemo styles)"
metrics:
  duration: "~90 min"
  completed_date: "2026-04-29"
  tasks_completed: 2
  files_modified: 39
requirements: []
---

# Phase 19 Plan 02: Feature Component Theme Migration Summary

39 feature components across chat/, home/, iou/, plans/, and squad/ directories migrated from static `COLORS` imports to the `useTheme()` hook pattern.

## What Was Built

Continued Wave 2 of the theme migration. Every component in the five target directories now reads palette tokens at render time from `useTheme().colors`, enabling live dark/light switching without app restart.

**Task 1 — Chat (10) + Home (12):** All 22 components migrated. Sub-components (QuotedBlock in MessageBubble, OptionRow in PollCard) received `colors` as an explicit prop since file-scoped functions cannot call hooks.

**Task 2 — IOU (6) + Plans (6) + Squad (5):** All 17 components migrated. Module-level constant arrays that referenced COLORS tokens (RSVPButtons.RSVP_OPTIONS, OverflowChip/RadarBubble STATUS_COLORS) moved into `useMemo([colors])` inside the component body.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] QuotedBlock in MessageBubble referenced undefined `styles`**
- **Found during:** Task 2 tsc gate
- **Issue:** QuotedBlock (file-scoped function, not a component) referenced `styles` by name, but the static module-level StyleSheet was removed during migration — styles now live in MessageBubble's useMemo and are not accessible from QuotedBlock scope
- **Fix:** Extracted `quotedBlockStyles` as a module-level static StyleSheet containing only structural styles (borderRadius, padding, fonts) with no color references; colors applied inline in QuotedBlock as before
- **Files modified:** src/components/chat/MessageBubble.tsx
- **Commit:** b89d265

**2. [Rule 1 - Bug] RadarBubble targetSize caused `number | undefined` tsc error**
- **Found during:** Task 2 tsc gate
- **Issue:** Accessing `BubbleSizeMap.dead` via string index under `noUncheckedIndexedAccess` returns `number | undefined`, making `targetSize` possibly undefined and causing multiple downstream errors
- **Fix:** Replaced `BubbleSizeMap.dead` with the literal value `48` in the ternary, matching the original pre-migration code behavior
- **Files modified:** src/components/home/RadarBubble.tsx
- **Commit:** b89d265

**3. [Rule 2 - Missing functionality] HomeWidgetBanners + HomeWidgetRow missing React import**
- **Found during:** Task 1
- **Issue:** Both files used JSX but had no `React` import (valid in some React configs but needed here)
- **Fix:** Added `React` import alongside `useMemo`
- **Files modified:** src/components/home/HomeWidgetBanners.tsx, src/components/home/HomeWidgetRow.tsx
- **Commit:** c342db6

## Known Stubs

None — all components are fully wired to real data via their existing props.

## Self-Check
