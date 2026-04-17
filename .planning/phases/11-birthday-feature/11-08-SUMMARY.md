---
phase: 11-birthday-feature
plan: 08
subsystem: ui
tags: [react-native, birthday, wish-list, group-chat, verification, native-picker, chat-ui]

# Dependency graph
requires:
  - phase: 11-06
    provides: birthday year field in profile edit, My Wish List section
  - phase: 11-07
    provides: birthday list "turning N" labels, Friend Birthday Page, group chat creation
provides:
  - Human-verified birthday feature end-to-end
  - Native DateTimePicker for birthday input (replaced custom ScrollView modal)
  - BirthdayWishListPanel redesigned as collapsible birthday info dropdown
  - GroupParticipantsSheet — tap group chat title to see members
  - SendBar attachment menu (Poll, Split Expenses, To-Do List)
  - Split Expenses wired to group participants, HomeWidgetRow (IOU + Birthday tiles)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Native DateTimePicker (display=spinner) inside Modal for iOS, inline for Android
    - Chat header tappable title via navigation.setOptions({ headerTitle }) for group chats
    - group_channel_members query for participant list and expense pre-selection
    - Attachment action sheet pattern (Modal + Animated.timing) in SendBar

key-files:
  created:
    - src/components/chat/GroupParticipantsSheet.tsx
    - src/components/home/HomeWidgetRow.tsx
    - src/components/home/HomeWidgetBanners.tsx
  modified:
    - src/components/common/BirthdayPicker.tsx
    - src/components/chat/BirthdayWishListPanel.tsx
    - src/components/chat/SendBar.tsx
    - src/screens/chat/ChatRoomScreen.tsx
    - src/hooks/useExpenseCreate.ts
    - src/app/squad/expenses/create.tsx
    - src/screens/home/HomeScreen.tsx
    - src/lib/uploadPlanCover.ts

key-decisions:
  - "BirthdayPicker replaced custom ScrollView modal with native DateTimePicker (display=spinner) — all three triggers open the same picker; Done button confirms on iOS, built-in OK/Cancel on Android"
  - "BirthdayWishListPanel starts collapsed, header shows birthday date + turning age at a glance; expanded body shows full birthday info row then wish list section"
  - "Group chat title tap opens GroupParticipantsSheet — navigation.setOptions({ headerTitle }) used in ChatRoomScreen useEffect, only activated when groupChannelId exists"
  - "Split Expenses from chat passes group_channel_id to /squad/expenses/create; useExpenseCreate fetches group members and pre-selects all when groupChannelId provided"
  - "uploadPlanCover fixed: FormData + file:// URI fails in RN (Supabase SDK polyfill can't stream local URIs); replaced with fetch(localUri).arrayBuffer() pattern"
  - "HomeWidgetRow: compact square tiles (maxWidth 140, aspectRatio 1) with shadow + border for IOU and Birthday widgets on home screen"

patterns-established:
  - "Native date picker pattern: fetch → ArrayBuffer for Supabase Storage uploads in React Native"
  - "Group participant query: group_channel_members → profiles two-step for type safety"
  - "Attachment action sheet: AttachmentAction union type + ACTIONS array in SendBar, parent handles routing"

requirements-completed:
  - D-01
  - D-02
  - D-04
  - D-05
  - D-06
  - D-08
  - D-09
  - D-10
  - D-12
  - D-13
  - D-15
  - D-16
  - D-18

# Metrics
duration: session
completed: 2026-04-17
---

# Phase 11 Plan 08: Human Verification + Polish Summary

**Birthday feature verified end-to-end; native date picker, collapsible birthday chat panel, group participant sheet, attachment menu, and home screen IOU/Birthday widgets shipped**

## Performance

- **Duration:** Session
- **Started:** 2026-04-17
- **Completed:** 2026-04-17
- **Tasks:** 3 verification checkpoints + polish
- **Files modified:** 8 modified, 3 created

## Accomplishments

- Human verified all three checkpoints: birthday year + wish list in profile edit, birthday list "turning N" labels + tap navigation, claim toggle + birthday group chat creation
- Replaced custom ScrollView birthday picker with native `DateTimePicker` (spinner mode); centered spinner in modal with Done/Cancel
- Redesigned `BirthdayWishListPanel` as collapsed-by-default dropdown showing birthday date + turning age, with wish list below
- Added `GroupParticipantsSheet` — tapping group chat title opens member list slide-up
- Added `SendBar` attachment menu (📊 Poll, 💸 Split Expenses, ✅ To-Do List); Split Expenses navigates to expense create pre-filtered to group members
- Fixed `uploadPlanCover` "Network request failed" — replaced `FormData` with `fetch().arrayBuffer()` pattern
- Added compact IOU + Birthday square widgets to home screen (`HomeWidgetRow`)

## Decisions Made

- **Native picker centering:** `alignItems: 'center'` wrapper View — DateTimePicker spinner doesn't respect alignSelf natively
- **Panel starts collapsed:** User opens it intentionally; birthday info visible in header subtitle when collapsed
- **Participants via header title tap (not + menu):** More discoverable, matches Messenger pattern; navigation.setOptions headerTitle only set when groupChannelId exists
- **uploadPlanCover fix:** fetch().arrayBuffer() bypasses Supabase SDK's internal fetch polyfill which cannot stream file:// URIs

## Deviations from Plan

None — verification checkpoints all passed. Polish items were user-directed improvements during the verification session.

## Next Phase Readiness

- Phase 11 complete — all birthday feature requirements met and human-verified
- Phase 10 (Squad Dashboard) is next

---
*Phase: 11-birthday-feature*
*Completed: 2026-04-17*
