# Phase 9: IOU List & Summary - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see net balances per friend across all expenses and browse expense history — the IOU feature is fully usable without requiring the dashboard. Delivers: IOU index screen (net balances per friend), per-friend expense history screen, and IOU dashboard card (placed in Goals tab now, consumed by Phase 10 dashboard). Does NOT include dashboard restructuring (Phase 10).

</domain>

<decisions>
## Implementation Decisions

### Screen structure
- **D-01:** Two separate screens: `/squad/expenses` (net balance index) and `/squad/expenses/friend/[id]` (per-friend expense history). Tap a friend row on the index → navigates to their history.
- **D-02:** Both screens register under existing `src/app/squad/_layout.tsx` stack navigator (same pattern as Phase 8's create + detail screens).

### Net balance index (/squad/expenses)
- **D-03:** Signed amount with directional label — `+$42 → you` in green (friend owes caller), `-$18 ← you` in red (caller owes friend). Compact, numerical, unambiguous direction.
- **D-04:** Each row: avatar + friend name + signed amount label. Tappable → friend expense history.
- **D-05:** Data source: `get_iou_summary()` RPC (returns `friend_id`, `display_name`, `net_amount_cents`, `unsettled_count` for unsettled balances only).
- **D-06:** Empty state when no unsettled balances: friendly illustration + copy ("All settled up!").

### Per-friend expense history (/squad/expenses/friend/[id])
- **D-07:** Shows all shared expenses (settled + unsettled), newest first. Settled rows are visually dimmed (greyed out badge/text). Full audit trail.
- **D-08:** Each row: expense title + total amount + date. Settled rows dimmed. Tappable → existing `/squad/expenses/[id]` detail screen (Phase 8).
- **D-09:** Screen title: "Expenses with [friend display_name]". Net balance summary visible at top of this screen (reinforces context).
- **D-10:** Data source: query `iou_groups` joined with `iou_members` for expenses where both the current user and the friend are participants. Order by `created_at DESC`.

### IOU dashboard card (Goals tab)
- **D-11:** `IOUCard` component in `src/components/squad/IOUCard.tsx`. Matches StreakCard/BirthdayCard pattern (same card container, same Pressable navigation).
- **D-12:** Card shows aggregate net position — "You're owed $34" (green) or "You owe $18" (red) — plus unsettled count ("3 unsettled"). All-settled state: "All settled up!" with neutral styling.
- **D-13:** Card tap → `/squad/expenses` (IOU index screen).
- **D-14:** Card placed in Goals tab in `squad.tsx` alongside StreakCard and BirthdayCard. Order: StreakCard → IOUCard → BirthdayCard (IOUs feel more active/actionable than birthdays).
- **D-15:** Data source: same `get_iou_summary()` RPC, aggregated. New `useIOUSummary` hook.

### Claude's Discretion
- New hooks: `useIOUSummary` (calls `get_iou_summary()`) and `useExpensesWithFriend(friendId)` (queries iou_groups + iou_members)
- Loading skeleton design for both screens and card
- Pull-to-refresh wiring (follow existing hook pattern with `refetch` callback)
- Error states on both screens
- Exact card visual styling (follow StreakCard/BirthdayCard proportions)
- Whether to show zero-balance friends on index (suggested: hide — no unsettled = no row)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### IOU schema + RPCs
- `supabase/migrations/0015_iou_v1_4.sql` — `iou_groups`, `iou_members` tables, `create_expense()` RPC, `get_iou_summary()` RPC (Section 9), RLS policies
- `.planning/phases/05-database-migrations/05-CONTEXT.md` — D-03 through D-09: table naming, integer cents, composite PK on iou_members, settlement columns

### Existing IOU screens (Phase 8)
- `.planning/phases/08-iou-create-detail/08-CONTEXT.md` — D-09 (route pattern), D-10 (temporary '+' entry point), D-11 (Phase 9/10 permanent card), D-03 (card-based layout), D-04 (badge colors)

### Requirements
- `.planning/REQUIREMENTS.md` §IOU Expense Splitting — IOU-03 (net balance view), IOU-05 (expense history)

### Roadmap
- `.planning/ROADMAP.md` §Phase 9 — Goal, success criteria, depends-on chain

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/squad/StreakCard.tsx` — Card pattern: Pressable container, title row, stat display. IOUCard should match structure
- `src/components/squad/BirthdayCard.tsx` — Another card pattern with navigation tap
- `src/components/common/AvatarCircle.tsx` — Friend avatars for balance rows and history rows
- `src/components/common/EmptyState.tsx` — Empty state for index (no unsettled) and history (no shared expenses)
- `src/components/common/ScreenHeader.tsx` — Screen header for both new screens
- `src/hooks/useExpenseDetail.ts` — Hook pattern: Supabase queries, loading/error state, userId guard
- `src/hooks/useStreakData.ts` — Another hook pattern with `refetch` callback
- `src/utils/currencyFormat.ts` — Currency formatting utilities (cents → "$X.XX")

### Established Patterns
- Hook structure: `useAuthStore` for userId, `useCallback` for `refetch`, `useState` for loading/error/data
- Card navigation: `useRouter().push('/squad/expenses')` from card Pressable
- Route registration: new screens added to `src/app/squad/_layout.tsx` Stack
- Design tokens: `COLORS`, `SPACING`, `FONT_SIZE`, `FONT_WEIGHT` from `@/theme`

### Integration Points
- `src/app/squad/_layout.tsx` — Register `/squad/expenses` (index) and `/squad/expenses/friend/[id]` (history)
- `src/app/(tabs)/squad.tsx` — Add `IOUCard` import + `useIOUSummary` hook + render in Goals tab
- `supabase/migrations/0015_iou_v1_4.sql` — `get_iou_summary()` RPC for card and index data
- `src/app/squad/expenses/[id].tsx` — Existing detail screen: history rows tap into this

</code_context>

<specifics>
## Specific Ideas

- Signed amount style: `+$42 → you` / `-$18 ← you` — directional arrows make debt direction scannable at a glance
- Settled rows in history: dimmed (reduced opacity or grey text/badge) rather than hidden — full audit trail matters for friend-group trust
- IOU card order in Goals tab: StreakCard → IOUCard → BirthdayCard (IOUs = most action-oriented, birthdays = most passive)

</specifics>

<deferred>
## Deferred Ideas

- Filter toggle (unsettled only / all) on expense history — unnecessary complexity given dimming approach
- IOU categories/tags — explicitly out of scope per REQUIREMENTS.md
- Link expense to a plan (IOU-06) — backlog
- Debt simplification across group (IOU-07) — backlog

None mentioned during discussion that weren't already roadmap-deferred.

</deferred>

---

*Phase: 09-iou-list-summary*
*Context gathered: 2026-04-13*
