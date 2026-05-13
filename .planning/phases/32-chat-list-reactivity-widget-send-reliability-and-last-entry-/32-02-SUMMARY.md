---
phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-
plan: 02
subsystem: ui
tags: [chat, react-native, ionicons, preview, chat-list]

requires:
  - phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-
    provides: "ChatListItem.lastMessageKind (MessageType) + lastMessageSenderName (string|null) — data contracts consumed by this plan's render refactor"

provides:
  - "ChatListRow.tsx refactored preview line: optional Ionicon (image-outline/stats-chart-outline/checkbox-outline) + sender prefix (You:/FirstName:) + per-kind text"
  - "getPreviewIcon(kind: MessageType) helper — maps kind to Ionicons glyph name or null"
  - "previewItalic style — fontStyle:'italic' applied only to deleted-kind body; sender prefix stays upright"
  - "5 new ChatListRow tests covering image/poll/todo/deleted/text-null-sender rendering contracts"

affects: []

tech-stack:
  added: []
  patterns:
    - "IIFE inside JSX for scoped icon-name derivation (matches file's existing inline-conditional style)"
    - "Nested <Text> for mixed-style runs (sender prefix upright + deleted body italic) — React Native supports nested Text for mixed styles"
    - "UNSAFE_getAllByType('Text') + children prop inspection for asserting inline mixed-children Text nodes in RNTL tests"
    - "findTextNodeWithChildren helper to locate leaf nodes by children value rather than full subtree text"

key-files:
  created:
    - src/components/chat/__tests__/ChatListRow.test.tsx
  modified:
    - src/components/chat/ChatListRow.tsx

key-decisions:
  - "IIFE (() => { ... })() keeps icon-name derivation scoped without a local const outside JSX — matches the file's own inline-conditional style for the avatar block"
  - "previewWrap View takes the flex:1 + marginRight that the old single preview Text carried — outer Text now only carries font/color styles"
  - "UNSAFE_queryAllByType (not UNSAFE_getAllByType) used for the no-icon assertion in tests — queryAll returns [] while getAll throws when zero matches"
  - "Test assertions use UNSAFE_getAllByType('Text') children inspection rather than getByText() — getByText concatenates all descendant text, which fails to distinguish sender prefix from body in mixed-children Text nodes"

patterns-established:
  - "Icon + sender prefix + per-kind text composition pattern for chat list preview rows — reusable if other list rows need similar treatment"
  - "RNTL mixed-children Text assertion: use UNSAFE_getAllByType('Text') and inspect .props.children directly; avoid getByText() on nodes with multiple string children"

requirements-completed: []

duration: ~4min
completed: 2026-05-13
---

# Phase 32 Plan 02: Last-entry preview UI Summary

**Refactored ChatListRow preview line to render Ionicon + sender prefix + per-kind text with italic styling for deleted messages, consuming the lastMessageKind/lastMessageSenderName data from Plan 32-01.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-13T14:09:51Z
- **Completed:** 2026-05-13T14:13:45Z
- **Tasks:** 2 (TDD: RED + GREEN each committed)
- **Files modified:** 2

## Accomplishments

- `getPreviewIcon(kind: MessageType)` helper maps `image` → `image-outline`, `poll` → `stats-chart-outline`, `todo` → `checkbox-outline`, and returns `null` for `text`/`system`/`deleted`
- Preview line composition changed from a single flat `<Text>` to `<View previewWrap> + optional Ionicon + <Text>` containing sender prefix string + body (or nested italic `<Text>` for deleted)
- Sender prefix `"<FirstName>: "` or `"You: "` renders upright in all cases; `"Message deleted"` renders italic only when `lastMessageKind === 'deleted'`
- 5 new `ChatListRow.test.tsx` cases cover image/poll/todo/deleted-italic/text-null-sender contracts
- All 16 chat tests (5 suites) stay green; zero new TypeScript errors in source files

## Task Commits

Each task was committed atomically:

1. **RED gate (TDD):** `abb4d57` (test) — failing ChatListRow preview rendering tests
2. **Task 1: getPreviewIcon + preview composition + italic-for-deleted:** `aa3a05e` (feat) — implementation + fixed test assertions

(Plan metadata commit added separately after this Summary.)

## Files Created/Modified

- `src/components/chat/ChatListRow.tsx` — Added `MessageType` import, `getPreviewIcon` helper, `previewWrap`/`previewIcon`/`previewItalic` styles, refactored `row2` JSX; dropped `flex:1`/`marginRight` from `preview` style onto `previewWrap`
- `src/components/chat/__tests__/ChatListRow.test.tsx` — New file: 5 test cases, `findTextNodeWithChildren` helper, mocks for `@expo/vector-icons`, `react-native-gesture-handler`, `@/components/common/AvatarCircle`

## Per-kind preview icon mapping (verbatim from CONTEXT.md §2)

| `lastMessageKind` | Ionicon name | Italic preview? |
|---|---|---|
| `text` | (none — null) | no |
| `image` | `image-outline` | no |
| `poll` | `stats-chart-outline` | no |
| `todo` | `checkbox-outline` | no |
| `system` | (none — null) | no |
| `deleted` | (none — null) | YES |

## Italic-for-deleted approach

The outer `<Text style={[styles.preview, ...]}>` carries the sender prefix as a plain string (`"Alice: "`). For `deleted` kind, the body is wrapped in a nested `<Text style={[...styles.preview..., styles.previewItalic]}>` child. For all other kinds, the body is an inline string child. React Native's nested `<Text>` for mixed-style runs is a native platform feature — the italic span renders correctly on both iOS and Android.

## Test count delta

- Pre-change: **0** `ChatListRow` tests (file did not exist)
- Post-change: **5** tests in `src/components/chat/__tests__/ChatListRow.test.tsx`
- Delta: **+5** (matches plan AC: net test count delta on chat preview rendering >= +5)

## Decisions Made

- `UNSAFE_queryAllByType` (not `UNSAFE_getAllByType`) used for the deleted-kind no-icon assertion — `queryAll` returns `[]` when no instances found, whereas `getAll` throws. This matches the Phase 29-home-screen-overhaul decision recorded in STATE.md for `UNSAFE_queryAllByType(Pressable)`.
- `findTextNodeWithChildren` helper introduced in the test file to locate `<Text>` nodes by their direct `.children` prop value, not by concatenated subtree text content. `getByText` in RNTL concatenates all descendant text across a mixed-children node, making it impossible to distinguish `"Photo"` from `"Alice: Photo"` when both reside in the same outer `<Text>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion strategy for mixed-children Text nodes**
- **Found during:** Task 2 (GREEN phase — running tests after implementation)
- **Issue:** Tests written for the RED phase used `getByText('Photo')`, `getByText('Poll: Pizza?')`, and `getByText('To-do: Buy milk')`, which all failed at GREEN because RNTL's `getByText` concatenates children across the outer `<Text>` node (so the actual matched text is `"Alice: Photo"`, not `"Photo"`). Also `UNSAFE_getAllByType('Ionicons')` throws when no icons present (deleted-kind test), whereas the test expected an empty-array check.
- **Fix:** Replaced `getByText(exact)` assertions with `UNSAFE_getAllByType('Text')` + `findTextNodeWithChildren` helper that inspects `.props.children` directly; replaced `UNSAFE_getAllByType` with `UNSAFE_queryAllByType` for the deleted-kind no-icon guard.
- **Files modified:** `src/components/chat/__tests__/ChatListRow.test.tsx`
- **Verification:** All 5 tests pass; `npx jest src/components/chat/ src/screens/chat/ --runInBand --no-coverage` exits 0 (16/16).
- **Committed in:** `aa3a05e` (Task 1 GREEN commit — test file updated alongside implementation)

---

**Total deviations:** 1 auto-fixed (Rule 1 — test assertion bug)
**Impact on plan:** Fix was required to achieve GREEN. No scope creep. Implementation is correct; only the test query strategy needed adjustment to match RNTL's mixed-children Text behavior.

## Issues Encountered

- `getByText` in RNTL resolves the full concatenated text content of a node's subtree — when a `<Text>` has children `["Alice: ", "Photo"]`, the query text must be `"Alice: Photo"` (or a regex spanning both). The `findTextNodeWithChildren` helper pattern is the idiomatic workaround for mixed-children inline `<Text>` runs.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Chat list preview UI is fully wired: data (Plan 32-01) + rendering (Plan 32-02) are both shipped. Users opening the chat list now see icon + sender prefix + per-kind text for every last entry.
- Plans 32-03 (incoming message subscription) and 32-04 (send reliability) are independent of this plan and can run in parallel or sequentially.

## Known Stubs

None — no stubs or hardcoded placeholder values introduced. All data flows through `item.lastMessageKind` and `item.lastMessageSenderName` from the live `useChatList` query.

## Threat Flags

No new threat surface introduced. `item.lastMessage` and `item.lastMessageSenderName` are rendered inside React Native `<Text>` components — no HTML parsing, no `dangerouslySetInnerHTML`. Matches T-32-04 and T-32-05 accepted dispositions in the plan's threat model.

## Self-Check: PASSED

- `src/components/chat/ChatListRow.tsx` — exists, contains `getPreviewIcon`, `previewWrap`, `previewItalic`, `lastMessageSenderName`, `lastMessageKind === 'deleted'`
- `src/components/chat/__tests__/ChatListRow.test.tsx` — exists, 5 test cases, all pass
- Commit `abb4d57` (RED) — present in `git log`
- Commit `aa3a05e` (GREEN / feat) — present in `git log`
- `npx jest src/components/chat/ src/screens/chat/ --runInBand --no-coverage` — 16/16 pass

---
*Phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-*
*Plan: 02 — Last-entry preview UI*
*Completed: 2026-05-13*
