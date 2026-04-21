---
phase: 15-message-reactions
verified: 2026-04-21T11:00:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Long-press a message bubble in the simulator — verify the context menu shows a row of 6 emoji (❤️ 😂 😮 😢 👍 🔥) above the Reply/Copy/Delete pill"
    expected: "Emoji strip appears above the action pill with 8pt gap; tapping an emoji closes the menu and shows a count badge below the bubble"
    why_human: "React Native Modal positioning and layout can only be confirmed visually in a running app"
  - test: "Tap an emoji. Then long-press the same message — the tapped emoji should appear with an orange-tinted highlight in the strip"
    expected: "emojiButtonActive style (rgba(249,115,22,0.20) background) applied to the already-reacted emoji in the strip"
    why_human: "Conditional style application requires visual confirmation"
  - test: "Tap a reaction badge pill below a bubble — verify the ReactionsSheet slides up showing who reacted. As the own user, tap your own row to remove the reaction"
    expected: "Sheet slides in; own row shows 'You' label and 'Tap to remove' hint; tapping it removes the badge and closes the sheet"
    why_human: "Sheet slide animation and remove-from-sheet UX need live interaction to confirm; toggle behaviour through ReactionsSheet deviates from plan spec"
  - test: "Have a second account react to a message — verify the count badge updates in real time without reloading the screen"
    expected: "Realtime INSERT on message_reactions increments the badge count (or adds a new pill); own-user dedup guard prevents double-count"
    why_human: "Realtime multi-user synchronisation requires two running sessions"
---

# Phase 15: Message Reactions Verification Report

**Phase Goal:** Users can express quick reactions to any message using a curated 6-emoji tapback strip, with live counts visible to all participants.
**Verified:** 2026-04-21T11:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Long-pressing a message bubble opens the context menu with a row of 6 emoji choices (❤️ 😂 😮 😢 👍 🔥) above the action list | VERIFIED | `PRESET_EMOJIS = ['❤️','😂','😮','😢','👍','🔥'] as const` at `MessageBubble.tsx:33`; `EmojiStripRow` rendered inside Modal above `contextPill` at line 235; `handleLongPress` triggers `setMenuVisible(true)` at line 189 |
| 2 | Tapping an emoji adds the user's reaction and immediately shows the count badge below the message bubble without a full reload | VERIFIED | Emoji strip `onPress` calls `onReact(message.id, emoji)` → `addReaction` in hook → optimistic `setMessages` at `useChatRoom.ts:454` before any DB await; `ReactionBadgeRow` renders when `(message.reactions?.length ?? 0) > 0` at `MessageBubble.tsx:311` |
| 3 | Tapping the same emoji a second time removes the reaction and the count badge disappears if the count reaches zero | VERIFIED | `addReaction` checks `isSameEmoji` at `useChatRoom.ts:448` and delegates to `removeReaction`; `removeReaction` optimistically decrements and filters `count <= 0` at lines 505–512; `ReactionBadgeRow` is conditionally hidden when array is empty |
| 4 | Reactions from all chat participants are visible and update in real time without page refresh | VERIFIED | Realtime channel subscribes to `message_reactions` INSERT and DELETE events at `useChatRoom.ts:342–343`; `handleReactionInsert` and `handleReactionDelete` apply incremental state updates; own-user dedup guard (`if incomingUserId === currentUserId return`) prevents double-count |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/aggregateReactions.ts` | Exported `aggregateReactions()` function | VERIFIED | Exists, exports `aggregateReactions`, correct signature `(rawReactions: {emoji,user_id}[], currentUserId: string): MessageReaction[]` |
| `tests/unit/aggregateReactions.test.ts` | Unit tests (6 cases) | VERIFIED | Exists at adapted path `tests/unit/` (project uses tsx runner, not Jest); 6/6 tests pass |
| `src/components/chat/MessageBubble.tsx` | Contains `PRESET_EMOJIS`, `onReact` prop, EmojiStripRow, ReactionBadgeRow | VERIFIED | All elements present; `PRESET_EMOJIS` at line 33; `onReact` in interface at line 29 (made optional with default `() => {}`); styles `emojiStrip`, `emojiButton`, `emojiButtonActive`, `reactionBadgeRow`, `reactionBadgeOwn` all in StyleSheet |
| `src/hooks/useChatRoom.ts` | `addReaction`, `removeReaction`, hydrated reactions on messages | VERIFIED | Both functions implemented with auth guard + optimistic update + rollback; `aggregateReactions` called in `enrichMessage` mapping at line 167; returned at line 532 |
| `tests/unit/useChatRoom.reactions.test.ts` | Unit tests covering optimistic update and rollback | VERIFIED | Exists at `tests/unit/` (adapted path); 12/12 tests pass including dedup guard tests |
| `src/screens/chat/ChatRoomScreen.tsx` | `onReact` prop wired to `MessageBubble` | VERIFIED | `addReaction` destructured at line 51; `onReact={(messageId, emoji) => addReaction(messageId, emoji)}` at line 181; `currentUserId` also threaded at line 182 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `fetchMessages` | `message_reactions` table | PostgREST nested select | WIRED | `.select('*, reactions:message_reactions(emoji, user_id)')` at `useChatRoom.ts:141` |
| `aggregateReactions` | `useChatRoom.ts` enrichMessage | import + call | WIRED | `import { aggregateReactions } from '@/utils/aggregateReactions'` at line 5; called at line 167 |
| `addReaction` | `supabase.from('message_reactions').insert` | direct supabase call | WIRED | Insert call at `useChatRoom.ts:485` |
| `removeReaction` | `supabase.from('message_reactions').delete` | direct supabase call | WIRED | Delete call at `useChatRoom.ts:516` |
| Realtime channel | `handleReactionInsert` / `handleReactionDelete` | `.on()` chain | WIRED | Two `.on('postgres_changes', ..., table: 'message_reactions')` calls at lines 342–343 |
| `ChatRoomScreen` | `useChatRoom` | destructured `addReaction` | WIRED | Line 51: `const { ..., addReaction } = useChatRoom(...)` |
| `ChatRoomScreen` | `MessageBubble` | `onReact` prop | WIRED | Line 181: `onReact={(messageId, emoji) => addReaction(messageId, emoji)}` |
| `EmojiStripRow` | `onReact` prop | `TouchableOpacity onPress` | WIRED | `onPress={() => { closeMenu(); onReact(message.id, emoji); }}` at `MessageBubble.tsx:241` |
| `ReactionBadgeRow` | `ReactionsSheet` → `onReact` | badge tap opens sheet | WIRED (deviation) | Badge tap calls `setReactionsSheetVisible(true)` → `ReactionsSheet` calls `onReact` on own row press — see Notable Deviation below |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `MessageBubble` — ReactionBadgeRow | `message.reactions` | `useChatRoom` → `fetchMessages` → `aggregateReactions(row.reactions, currentUserId)` | Yes — PostgREST nested select on `message_reactions` table; optimistic updates keep state current | FLOWING |
| `ReactionsSheet` | `rows` (ReactionRow[]) | `supabase.from('message_reactions').select('emoji, user_id').eq('message_id', messageId)` + profiles join | Yes — live DB query on open | FLOWING |
| `useChatRoom` — realtime | `messages[].reactions` | Postgres Changes subscription on `message_reactions` INSERT/DELETE | Yes — incremental state update from Supabase Realtime | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `aggregateReactions` tests | `npx tsx tests/unit/aggregateReactions.test.ts` | 6 passed, 0 failed | PASS |
| `useChatRoom` reaction logic tests | `npx tsx tests/unit/useChatRoom.reactions.test.ts` | 12 passed, 0 failed | PASS |
| TypeScript compilation | `npx tsc --noEmit` | 3 errors in `src/app/friends/[id].tsx` (pre-existing, unrelated to this phase); 0 errors in any reaction files | PASS |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAT-01 | 15-02, 15-03, 15-04 | User can react to any message with one of 6 preset emojis (tapback style) | SATISFIED | `PRESET_EMOJIS` typed const; EmojiStripRow in context menu; `addReaction` writes to DB; `onReact` threaded end-to-end |
| CHAT-02 | 15-02, 15-03, 15-04 | User can remove their own reaction by tapping it again (toggle off) | SATISFIED (with deviation) | Toggle-remove implemented in `addReaction` via `isSameEmoji` check; badge taps open ReactionsSheet where own-reaction rows call `onReact` to remove — see Notable Deviation |
| CHAT-03 | 15-01, 15-02, 15-03, 15-04 | Reaction counts display inline below the message bubble, grouped by emoji | SATISFIED | `ReactionBadgeRow` renders below bubble body showing `r.count` per emoji; `aggregateReactions` groups correctly |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `MessageBubble.tsx` | 29 | `onReact` is declared optional (`onReact?`) with empty default `= () => {}` | Info | The plan required a required prop so TypeScript would enforce wiring. The implementation made it optional with a no-op default. TypeScript will not error if a caller omits `onReact`. This is a deliberate choice — the component degrades gracefully — but it means the compile-time enforcement contract described in Plan 02 is not enforced. |
| `MessageBubble.tsx` | 316, 390 | Badge taps call `setReactionsSheetVisible(true)` instead of `onReact(messageId, emoji)` | Info | See Notable Deviation below. |

---

### Notable Deviation: ReactionsSheet and Badge Tap Behaviour

**Plan 02 spec:** Badge pill `onPress` calls `onReact(message.id, r.emoji)` directly — tapping a pill is the toggle-remove gesture.

**Actual implementation:** Badge pill `onPress` calls `setReactionsSheetVisible(true)`, which opens a `ReactionsSheet` bottom sheet. The sheet lists who reacted (with profile lookup), and only own-user rows are tappable to remove.

**Functional impact on CHAT-02:** The toggle-remove flow still works end-to-end — it just requires an extra step (open sheet → tap "Tap to remove"). Tapping the same emoji in the context menu strip still triggers the same-emoji toggle-off in `addReaction`. So the requirement is satisfied, but through a richer UX path than the original plan specified.

**This deviation appears intentional.** The ReactionsSheet is a fully implemented component (not a stub) with real DB queries, profile lookups, and tabs. This is an enhancement, not a regression. No override is needed unless the product owner has a specific objection to the two-step remove UX.

---

### Human Verification Required

The automated checks all pass (18/18 unit tests, TypeScript clean on reaction files). The following require simulator or device testing:

#### 1. Emoji Strip Visual Layout

**Test:** Long-press any message bubble. Observe the context menu.
**Expected:** A row of 6 emoji (❤️ 😂 😮 😢 👍 🔥) appears visibly above the Reply/Copy/Delete pill. The strip has a rounded card background. The emoji strip and action pill have an 8pt visual gap. The strip does not render under the status bar.
**Why human:** React Native Modal absolute positioning and `emojiStripTop` clamping can only be confirmed in a live layout pass.

#### 2. Own-Reaction Highlight in Strip

**Test:** React with ❤️. Long-press the same message again.
**Expected:** The ❤️ emoji in the strip has a visible orange-tinted background (`rgba(249,115,22,0.20)`).
**Why human:** Conditional `styles.emojiButtonActive` requires visual confirmation.

#### 3. ReactionsSheet Remove Flow

**Test:** Tap a reaction badge pill below any message bubble.
**Expected:** A bottom sheet slides up showing all reactors. Own reaction row shows "You" and "Tap to remove". Tapping it removes the badge and closes the sheet.
**Why human:** Sheet animation, profile lookup, and remove-via-sheet interaction require live testing. This is a deviation from the plan spec (where badge taps directly called `onReact`); needs product owner sign-off that the richer UX is acceptable for CHAT-02.

#### 4. Real-Time Cross-User Reaction Sync

**Test:** Open the same chat room in two accounts. React from one account and observe the other account's view.
**Expected:** The count badge appears (or increments) on the second account's view within 1–2 seconds without any reload. The own-user dedup guard is in place so the reacting user's count does not double.
**Why human:** Realtime multi-user synchronisation requires two concurrent sessions.

---

### Gaps Summary

No blocking gaps found. All 4 roadmap success criteria are implemented end-to-end. All 18 unit tests pass. TypeScript compiles cleanly across all reaction-related files.

The `human_needed` status reflects the 4 simulator verification items above — visual/interactive/realtime behaviours that cannot be confirmed programmatically. The ReactionsSheet deviation from Plan 02 (badge tap opens sheet instead of direct toggle-remove) should be acknowledged by the product owner; it is an enhancement rather than a regression.

---

_Verified: 2026-04-21T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
