---
phase: 15-message-reactions
fixed_at: 2026-04-21T00:00:00Z
review_path: .planning/phases/15-message-reactions/15-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-04-21
**Source review:** .planning/phases/15-message-reactions/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical, 4 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Reaction swap leaves DB emoji-less if insert fails after successful delete

**Files modified:** `src/hooks/useChatRoom.ts`
**Commit:** 012a106
**Applied fix:** In `addReaction`, the fire-and-forget `delete` call was replaced with a captured `deleteError` check that rolls back the optimistic update and returns early if the delete fails. On a failed insert (after a successful delete), the code now re-inserts the old reaction emoji to restore DB consistency before rolling back the UI.

---

### WR-01: Stale closure — snapshot captured outside setMessages callback

**Files modified:** `src/hooks/useChatRoom.ts`
**Commit:** 1e6eb10
**Applied fix:** In both `addReaction` and `removeReaction`, the direct `messages.find(...)` snapshot reads were replaced with a no-op `setMessages(prev => { ... return prev; })` updater pattern that captures `preSnapshot` (and `isSameEmoji` in `addReaction`) from the guaranteed-latest state. Added `MessageReaction` to the import from `@/types/chat` to type the snapshot variables.
**Status:** fixed: requires human verification (logic change to async state capture pattern)

---

### WR-02: ReactionsSheet silently swallows Supabase query errors

**Files modified:** `src/components/chat/ReactionsSheet.tsx`
**Commit:** 073a511
**Applied fix:** Both Supabase queries in `fetchRows` now destructure the `error` field. If `reactionsFetchError` is non-null the function logs a warning and returns early with `setLoading(false)`. If `profilesFetchError` is non-null the same early-return pattern is applied. This prevents the sheet from silently showing empty results on network or RLS errors.

---

### WR-03: database.ts messages Row type is materially out of sync with actual schema

**Files modified:** `src/types/database.ts`
**Commit:** bd694a6
**Applied fix:** Updated the `messages` table `Row`, `Insert`, and `Update` shapes to match the schema after migration 0018: `body` is now `string | null`, and `image_url`, `reply_to_message_id`, `message_type`, and `poll_id` are added to all three shapes. Also added `export type MessageReactionRow = Tables<'message_reactions'>` at the bottom of the file alongside the existing row-type aliases.

---

### WR-04: ReactionsSheet tab counts can drift out of sync with displayed rows

**Files modified:** `src/components/chat/ReactionsSheet.tsx`
**Commit:** 747f295
**Applied fix:** Tabs and per-emoji counts are now derived exclusively from the fetched `rows` array rather than the `reactions` prop. While loading, the tab list falls back to the prop so the sheet doesn't flash empty tabs. Once loaded, `emojiSet` is computed from `rows` and counts use `rows.filter(r => r.emoji === tab).length`, keeping both the tab list and the row list in sync with the same data source.

---

_Fixed: 2026-04-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
