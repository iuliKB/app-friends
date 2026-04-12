# Phase 8: IOU Create & Detail - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create a group expense (even or custom split), view its detail, and mark shares as settled. The core IOU write path works end-to-end with real data. Does NOT include expense list, net balances, or dashboard card (Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Expense creation flow
- **D-01:** Currency-formatted amount input with live formatting as user types (e.g. "$42.50"), decimal enforcement. Converted to integer cents on submit.
- **D-02:** Inline "Remaining: $X.XX" validation for custom splits — updates live as user edits per-person amounts. Submit disabled until remaining is $0.00. Red when mismatch.

### Expense detail screen
- **D-03:** Card-based layout — title + amount in a hero card at top, participant rows below with avatar + name + share amount + settled badge. Settle button per row.
- **D-04:** Color-coded badges for settled/unsettled status — green "Settled" badge or red/neutral "Unsettled" badge next to each participant's share amount.
- **D-05:** Detail screen shows payer name, creation date, total amount, and split type (even/custom) prominently.
- **D-06:** All-settled banner — when every participant is settled, show a green "All settled!" banner at the top. All badges green, no action buttons.

### Haptic feedback
- **D-07:** Haptic feedback on two key moments: successful expense creation (submit) and settle confirmation. Per success criteria SC-5.

### Loading & states
- **D-08:** Skeleton loading on detail screen. Submit button shows spinner and is disabled during RPC call. Form state preserved on error for retry.

### Navigation & entry points
- **D-09:** Routes under `/squad/expenses/*` pattern — create at `/squad/expenses/create`, detail at `/squad/expenses/[id]`. Uses existing `squad/_layout.tsx` stack from Phase 7.
- **D-10:** Temporary '+' button in Squad screen header bar as interim entry point for expense creation. Will be replaced by IOU dashboard card tap in Phase 9/10.
- **D-11:** Final entry point is a button inside the IOU dashboard card (Phase 9/10 scope). This phase ships the screens; the card provides the permanent navigation later.

### Claude's Discretion
- Expense creation screen structure (single screen vs two-step) — pick what fits codebase patterns
- Friend picker approach (inline checkboxes vs separate picker screen)
- Split mode toggle UI (segmented control vs toggle switch)
- Custom amount editing approach (inline fields vs modal)
- Submit behavior (navigate to detail vs navigate back)
- Settle action gesture (tap button vs swipe vs long press)
- Debtor view experience (same view without settle button vs simplified)
- Error handling approach for RPC failures
- Per-person amount field formatting in custom split mode

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### IOU schema
- `supabase/migrations/0015_iou_v1_4.sql` — IOU tables, `create_expense()` RPC (atomic, largest-remainder), `get_iou_summary()` RPC, RLS policies, settlement columns
- `.planning/phases/05-database-migrations/05-CONTEXT.md` — D-03 through D-09: table naming, atomic RPC, settlement audit columns, integer cents, largest-remainder split

### Requirements
- `.planning/REQUIREMENTS.md` §IOU Expense Splitting — IOU-01 (create), IOU-02 (split modes), IOU-04 (settle)

### Roadmap
- `.planning/ROADMAP.md` §Phase 8 — Success criteria, depends-on chain

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/common/FormField.tsx` — Standard form field component for title input
- `src/components/common/PrimaryButton.tsx` — Submit button with loading state
- `src/components/common/AvatarCircle.tsx` — Friend avatars in participant rows
- `src/components/common/EmptyState.tsx` — Empty state patterns
- `src/components/common/ScreenHeader.tsx` — Screen header with optional right action button
- `src/components/common/FAB.tsx` — Floating action button pattern (not used here, but reference)
- `src/app/squad/_layout.tsx` — Stack navigator for /squad/* sub-routes (created in Phase 7)

### Established Patterns
- `src/hooks/useUpcomingBirthdays.ts` — Hook pattern: Supabase RPC call, userId guard, loading/error state
- `src/hooks/useStreakData.ts` — Another hook pattern with refresh callback
- `src/components/squad/BirthdayCard.tsx` — Card component pattern with Pressable navigation
- `src/components/friends/FriendCard.tsx` — Row layout with avatar + name + info

### Integration Points
- `supabase/migrations/0015_iou_v1_4.sql` — `create_expense()` and `get_iou_summary()` RPCs
- `src/types/database.ts` — Already has iou_groups/iou_members types from Phase 5
- `src/app/squad/_layout.tsx` — Stack navigator needs new screens registered
- `src/app/(tabs)/squad.tsx` — Needs temporary '+' header button for Phase 8 entry point

</code_context>

<specifics>
## Specific Ideas

- Currency input should format live as user types, not just on blur
- "Remaining" indicator for custom split should feel like a running total — red when amounts don't add up, neutral/green when they match
- Settle action should feel decisive — haptic confirmation makes it feel like a real-world action
- Detail screen hero card should give a clear overview at a glance before scrolling to participants

</specifics>

<deferred>
## Deferred Ideas

- IOU dashboard card on Squad tab — Phase 9/10
- Net balance per friend — Phase 9 (IOU List & Summary)
- Expense history list — Phase 9
- Linking expense to a plan — IOU-06, backlog

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-iou-create-detail*
*Context gathered: 2026-04-12*
