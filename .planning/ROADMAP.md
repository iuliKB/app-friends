# Roadmap: Campfire

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 UI/UX Design System** — Phases 7-9 (shipped 2026-03-25)
- ✅ **v1.2 Squad & Navigation** — Phases 10-12 (shipped 2026-04-04)
- ✅ **v1.3 Liveness & Notifications** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v1.3.5 Homescreen Redesign** — Phases 1-4 (shipped 2026-04-11)
- 🔄 **v1.4 Squad Dashboard & Social Tools** — Phases 5-10 (in progress)

## Archived Milestones

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-24</summary>

- [x] Phase 1: Foundation + Auth (4/4 plans) — completed 2026-03-17
- [x] Phase 2: Friends + Status (3/3 plans) — completed 2026-03-17
- [x] Phase 3: Home Screen (2/2 plans) — completed 2026-03-18
- [x] Phase 4: Plans (3/3 plans) — completed 2026-03-18
- [x] Phase 5: Chat (2/2 plans) — completed 2026-03-18
- [x] Phase 6: Notifications + Polish (3/3 plans) — completed 2026-03-19

</details>

<details>
<summary>✅ v1.1 UI/UX Design System (Phases 7-9) — SHIPPED 2026-03-25</summary>

- [x] Phase 7: Design Tokens (2/2 plans) — completed 2026-03-24
- [x] Phase 8: Shared Components (3/3 plans) — completed 2026-03-24
- [x] Phase 9: Screen Consistency Sweep (6/6 plans) — completed 2026-03-25

</details>

<details>
<summary>✅ v1.2 Squad & Navigation (Phases 10-12) — SHIPPED 2026-04-04</summary>

- [x] Phase 10: Squad Tab (2/2 plans) — completed 2026-04-04
- [x] Phase 11: Navigation Restructure (2/2 plans) — completed 2026-04-04
- [x] Phase 12: Profile Simplification (1/1 plan) — completed 2026-04-04

</details>

<details>
<summary>✅ v1.3 Liveness & Notifications (Phases 1-5) — SHIPPED 2026-04-10</summary>

- [x] Phase 1: Push Infrastructure & DM Entry Point (10/10 plans) — completed 2026-04-07
- [x] Phase 2: Status Liveness & TTL (6/6 plans) — completed 2026-04-08
- [x] Phase 3: Friend Went Free Loop (8/8 plans) — completed 2026-04-09
- [x] Phase 4: Morning Prompt + Squad Goals Streak (6/6 plans) — completed 2026-04-10
- [x] Phase 5: Hardware Verification Gate (2/2 plans) — completed 2026-04-10

</details>

<details>
<summary>✅ v1.3.5 Homescreen Redesign (Phases 1-4) — SHIPPED 2026-04-11</summary>

- [x] Phase 1: Status Pill & Bottom Sheet (3/3 plans) — completed 2026-04-10
- [x] Phase 2: Radar View & View Toggle (4/4 plans) — completed 2026-04-11
- [x] Phase 3: Card Stack View (4/4 plans) — completed 2026-04-11
- [x] Phase 4: Upcoming Events Section (4/4 plans) — completed 2026-04-11

</details>

---

## v1.4 Squad Dashboard & Social Tools — Active Phases

- [x] **Phase 5: Database Migrations** - IOU tables + birthday columns + RPCs; schema foundation for all v1.4 client work (completed 2026-04-11)
- [ ] **Phase 6: Birthday Profile Field** - Birthday month/day input in profile edit; save/load round-trip verified
- [x] **Phase 7: Birthday Calendar Feature** - Upcoming birthdays hook, list screen, and dashboard card (completed 2026-04-12)
- [x] **Phase 8: IOU Create & Detail** - Atomic expense creation, even/custom split, per-expense detail, settle action (completed 2026-04-12)
- [ ] **Phase 9: IOU List & Summary** - Net balance view, expense history screen, IOU dashboard card
- [ ] **Phase 10: Squad Dashboard** - Scrollable dashboard with friends list + feature cards replaces tab switcher

## Phase Details

### Phase 5: Database Migrations
**Goal**: All new schema objects exist in Supabase so client code can be written against correct column types, RLS policies, and RPCs — no destructive re-migrations needed later
**Depends on**: Phase 4 (v1.3.5 Upcoming Events Section — migrations 0012-0014 already applied)
**Requirements**: IOU-01, IOU-02, IOU-03, IOU-04, IOU-05, BDAY-01, BDAY-02, BDAY-03
**Success Criteria** (what must be TRUE):
  1. Migration 0015 applies cleanly: `iou_groups`, `iou_members` tables exist with INTEGER cents amounts, correct RLS (only expense creator can mark settled), `create_expense()` atomic RPC, and `get_iou_summary()` RPC
  2. Migration 0016 applies cleanly: `birthday_month` and `birthday_day` smallint columns exist on `profiles`, `get_upcoming_birthdays()` RPC returns friends sorted by next occurrence with year-wrap arithmetic
  3. All RLS policies on new tables pass smoke-test queries (owner reads own data, friends read friend data, non-friends get no rows)
  4. `supabase db push` completes without errors and migration history shows 0015 and 0016 applied
**Plans**: 3 plans
Plans:
- [x] 05-01-PLAN.md — Migration 0015 SQL (IOU tables, RPCs, iou_notes rename) + 7 client file updates
- [x] 05-02-PLAN.md — Migration 0016 SQL (birthday columns + get_upcoming_birthdays RPC)
- [x] 05-03-PLAN.md — supabase db push [BLOCKING] + seed.sql extension

### Phase 6: Birthday Profile Field
**Goal**: Users can add their birthday (month + day) to their profile and friends can see it — the new columns are exercised by real client code before dependent screens are built
**Depends on**: Phase 5
**Requirements**: BDAY-01
**Success Criteria** (what must be TRUE):
  1. Profile edit screen shows a birthday date picker field; user can select a month and day (no year) and save successfully
  2. Saved birthday round-trips correctly: reopening profile edit shows the previously saved month and day
  3. Feb 29 input is normalized to Feb 28 at save time so the value is valid in non-leap years
  4. Leaving birthday blank is valid; no error is shown for users who skip it
**Plans**: 2 plans
Plans:
- [x] 06-01-PLAN.md — database.ts birthday types + BirthdayPicker component
- [x] 06-02-PLAN.md — Wire BirthdayPicker into edit.tsx + visual test

### Phase 7: Birthday Calendar Feature
**Goal**: Users can view a sorted list of friends' upcoming birthdays and the Squad dashboard shows a glanceable birthdays card
**Depends on**: Phase 6
**Requirements**: BDAY-02, BDAY-03
**Success Criteria** (what must be TRUE):
  1. A birthday list screen shows all friends who have set a birthday, sorted by days until next occurrence, with "Today", "Tomorrow", or "N days" labels
  2. Friends with no birthday set are omitted from the list; an appropriate empty state is shown when no friends have birthdays
  3. The Squad dashboard displays an upcoming birthdays card showing the count of birthdays in the next 30 days and the name + days-remaining for the nearest one
  4. The birthdays card shows an empty state copy when no friends have upcoming birthdays rather than disappearing
**Plans**: 3 plans
Plans:
- [x] 07-01-PLAN.md — useUpcomingBirthdays hook + birthday formatters + Playwright test scaffold
- [x] 07-02-PLAN.md — squad/_layout.tsx + BirthdayCard component + BirthdaysScreen
- [x] 07-03-PLAN.md — Wire BirthdayCard into squad.tsx + human verify checkpoint

### Phase 8: IOU Create & Detail
**Goal**: Users can create a group expense (even or custom split), view its detail, and mark shares as settled — the core IOU write path works end-to-end with real data
**Depends on**: Phase 5
**Requirements**: IOU-01, IOU-02, IOU-04
**Success Criteria** (what must be TRUE):
  1. User can open an expense creation screen, enter a title and amount, select friends to split with, choose even or custom split, and submit — the expense is created atomically (no orphan records on network failure)
  2. Even split divides the amount correctly using largest-remainder method (integer cents, no floating-point drift); custom split allows per-person amount overrides that must sum to the total
  3. Expense detail screen shows the payer, all participants with their share amounts, and settled/unsettled status per participant
  4. Only the expense creator can mark a participant's share as settled; a debtor cannot self-certify their own payment
  5. Settle action triggers a haptic confirmation and the participant row updates to show settled state immediately
**Plans**: 4 plans
Plans:
- [x] 08-01-PLAN.md — IOU type aliases in database.ts + Playwright test scaffold
- [x] 08-02-PLAN.md — currencyFormat utils + IOU components (ExpenseHeroCard, ParticipantRow, SplitModeControl, RemainingIndicator)
- [x] 08-03-PLAN.md — useExpenseCreate + useExpenseDetail hooks with settle action
- [x] 08-04-PLAN.md — Route screens (create + detail) + squad.tsx '+' button + human verify [BLOCKING]

### Phase 9: IOU List & Summary
**Goal**: Users can see net balances per friend across all expenses and browse expense history — the IOU feature is fully usable without requiring the dashboard
**Depends on**: Phase 8
**Requirements**: IOU-03, IOU-05
**Success Criteria** (what must be TRUE):
  1. IOU index screen shows a per-friend net balance list: each row indicates who owes whom and the net amount, computed from all unsettled expenses
  2. Expense history screen shows a chronological list of all past expenses the user is involved in (as payer or participant), with title, payer, total amount, and date
  3. The IOU dashboard card shows an aggregate balance summary ("You're owed $34" or "You owe $12") with a count of unsettled items
  4. The IOU dashboard card shows an appropriate empty state when no expenses exist
**Plans**: 3 plans
Plans:
- [x] 09-01-PLAN.md — get_iou_summary type + useIOUSummary + useExpensesWithFriend + BalanceRow + ExpenseHistoryRow
- [x] 09-02-PLAN.md — IOUCard + _layout.tsx + balance index screen + per-friend history screen
- [x] 09-03-PLAN.md — squad.tsx IOUCard integration + human verify [BLOCKING]

### Phase 10: Squad Dashboard
**Goal**: The Squad tab is a single scrollable dashboard with a compact friends list at top and feature cards (Streaks, IOUs, Birthdays) below — the underline tab switcher is gone
**Depends on**: Phase 9
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Squad tab renders a single scrollable screen: friends list at the top, followed by Streaks card, IOU card, and Birthdays card — no underline tab switcher or Goals/Friends tabs visible
  2. Each feature card shows a glanceable summary (e.g. "2 unsettled", "birthday in 3 days", streak count) without requiring the user to drill into a sub-screen
  3. Dashboard cards animate in with smooth entrance transitions on first load; the animation does not replay on pull-to-refresh
  4. Existing Streaks card content and data are preserved exactly — streak count and copy are unchanged from v1.3
  5. The outer scroll is a single FlatList with feature cards in ListFooterComponent; no FlatList is nested inside a ScrollView
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Database Migrations | 3/3 | Complete   | 2026-04-11 |
| 6. Birthday Profile Field | 1/2 | In Progress|  |
| 7. Birthday Calendar Feature | 3/3 | Complete   | 2026-04-12 |
| 8. IOU Create & Detail | 4/4 | Complete   | 2026-04-12 |
| 9. IOU List & Summary | 2/3 | In Progress|  |
| 10. Squad Dashboard | 0/TBD | Not started | - |

---
*Roadmap updated: 2026-04-13 — Phase 9 planned (3 plans, 3 waves)*
