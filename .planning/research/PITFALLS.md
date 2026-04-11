# Domain Pitfalls

**Domain:** Adding group expense splitting (IOU), birthday calendar, and Squad dashboard redesign to an existing React Native + Expo + Supabase social app
**Researched:** 2026-04-11
**Confidence:** HIGH for RLS and money storage (verified via official Supabase docs + Postgres documentation); MEDIUM for navigation structure and dashboard scroll architecture (based on React Navigation documented patterns + community-confirmed issues).

---

## Critical Pitfalls

### Pitfall 1: Storing IOU Amounts as FLOAT — Guaranteed Cent Drift

**What goes wrong:**
`FLOAT` / `DOUBLE PRECISION` cannot represent most decimal values exactly in binary. A $10 bill split three ways stored as `float8` produces `3.3333333333333335` per person. Summed back: `10.000000000000002`. When balances are recalculated from sums across many expenses, errors compound. Users will see balances like "$0.01 owed" that never go away, or total-group-owed ≠ total-group-paid by a cent.

**Why it happens:**
Developers reach for JavaScript's `number` type (which is IEEE 754 double), store the value directly, and the column type defaults to `float8` or `numeric` depending on how the ORM infers it. The bug is invisible until a specific combination of amounts and participants triggers the remainder.

**Consequences:**
- Permanent phantom debts that cannot be settled
- `settled = true` in DB but computed balance shows non-zero owed — UI inconsistency
- Users lose trust in the feature even when the underlying amounts are correct

**Prevention:**
- Store all amounts as **integer cents** (`integer NOT NULL` — e.g., `1000` = $10.00). Never store as float.
- Use `NUMERIC(12,2)` only if the app must support sub-cent currencies (not needed here).
- All division (even splits) must use the **largest-remainder method**: divide total cents by participant count using integer division, then assign the leftover cents one-at-a-time to the first N participants. This ensures the sum of shares always equals the exact total.
- Enforce in TypeScript: the `amount` field in all IOU-related types is `number` typed as whole cents. Add a runtime assertion `assert(Number.isInteger(amount))` at the RPC call boundary.
- Never do split math in JavaScript first and then store results — do it in the PostgreSQL RPC function where integer arithmetic is guaranteed.

**Detection:**
- Query: `SELECT SUM(share_amount_cents) FROM iou_participants WHERE expense_id = $1` — result must equal `expenses.amount_cents` exactly. Add this as a DB `CHECK` constraint or a test after every insert.
- If the sum diverges by even 1 cent, float arithmetic is leaking somewhere.

**Phase to address:** IOU schema migration (Phase 1 of IOU feature). Column type must be correct before any data is written. Cannot be migrated after.

---

### Pitfall 2: IOU RLS Allows a Participant to Settle Their Own Share Unilaterally

**What goes wrong:**
If the `iou_settlements` (or equivalent) table has an INSERT policy of `auth.uid() = user_id`, any participant can mark their own share as settled without the payer confirming receipt. The app shows "fully settled" to the payer but no money has moved. In a friend group, this creates social friction — one person believes they owe nothing; the other sees a discrepancy.

**Why it happens:**
Single-user RLS patterns (self-ownership) are the standard template copied from auth examples. Expense settlement requires two-party consent: the debtor initiates, but the creditor confirms. This is a domain-specific access control requirement that the default Supabase RLS pattern does not cover.

**Consequences:**
- One user marks their debt settled; payer's balance view still shows owed; inconsistent state
- No mechanism to dispute or revert — data is already committed
- Worse: if the policy is too permissive, any group member (not just the payer) could mark anyone else's debt settled

**Prevention:**
- Model settlement as an event with a `confirmed_by` field, not a `settled` boolean. The debtor creates a settlement record; the payer confirms it.
- Alternatively, restrict the INSERT policy on settlements to the payer only (`created_by = auth.uid()` where `created_by` is the expense creator). The payer marks a participant's share as settled after receiving payment.
- The simplest safe model for a friend app: **only the expense creator can mark shares as settled**. Debtors cannot self-certify. This matches the social norm in close friend groups where one person pays and collects.
- Write the RLS policy as: `WITH CHECK (expense_id IN (SELECT id FROM expenses WHERE created_by = auth.uid()))`. Use a `SECURITY DEFINER` helper function to avoid subquery-per-row performance issues (see Pitfall 5).

**Detection:**
- In Supabase SQL editor, run as a non-creator participant and attempt to INSERT into the settlements table. The insert must be rejected.
- Unit test: authenticated as user B, attempt to settle user B's share on an expense created by user A. Expect RLS error.

**Phase to address:** IOU RLS design (first phase touching settlement). Must be locked before any settlement UI is built.

---

### Pitfall 3: RLS on IOU Tables Recursively Queries Friendships — Silent N×M Slowdown

**What goes wrong:**
The most natural RLS policy for who can see an expense is: "you must be a participant OR a friend of the creator." This requires a subquery into `friendships`. For a group expense with 5 participants, Postgres evaluates that subquery for every row returned. With 200 expenses and 5 participants each = 1,000 rows × 1 subquery each = 1,000 friendship lookups per single SELECT. The query runs in under 50ms with 20 expenses but degrades to 800ms+ with 200 — exactly when the feature starts feeling real.

This project has already fixed a version of this problem for `plan_members` (see migration `0004_fix_plan_members_rls_recursion.sql`). The IOU tables will reproduce the same pattern if not designed carefully from the start.

**Why it happens:**
The join direction matters critically. A policy written as:
```sql
-- SLOW: subquery references the current row's column
USING (id IN (SELECT expense_id FROM iou_participants WHERE user_id = auth.uid()))
```
forces Postgres to evaluate `SELECT expense_id FROM iou_participants WHERE user_id = auth.uid()` for every candidate row in `expenses`. Because the subquery result does not depend on the row, Postgres should cache it — but only does so when the function is wrapped in `(SELECT ...)` or uses a `SECURITY DEFINER` function, signaling to the optimizer it is safe to treat as a constant.

**Consequences:**
- IOU list loads fast in dev (5 expenses, 2 users)
- Degrades linearly as the group splits bills over months
- Cannot fix without rewriting RLS policies + migrating live data

**Prevention:**
- Always write the subquery so `auth.uid()` is the filter and the result set is the constraint:
  ```sql
  -- FAST: build the set of accessible expense IDs once, filter against it
  USING (id IN (SELECT expense_id FROM iou_participants WHERE user_id = (SELECT auth.uid())))
  ```
  The `(SELECT auth.uid())` wrapper tells Postgres to evaluate it once and cache per statement.
- Wrap the participant membership check in a `SECURITY DEFINER` function (same pattern as `is_plan_creator`). This becomes an `initPlan` in the query plan — evaluated once, cached for all rows.
- Add a `CREATE INDEX idx_iou_participants_user_id ON iou_participants(user_id)` so the membership subquery is an index scan, not a table scan.
- Test with `EXPLAIN ANALYZE` on the expense SELECT query after adding the RLS policy. Confirm the plan shows `Index Scan` not `Seq Scan` on `iou_participants`.

**Detection:**
- `EXPLAIN ANALYZE SELECT * FROM expenses` as an authenticated user. If the query plan shows `Seq Scan` on `iou_participants` inside a subplan, the policy is unoptimized.
- Response time > 100ms on a table with 50 rows is a red flag.

**Phase to address:** IOU schema + RLS phase. The project has a prior precedent in `0004_fix_plan_members_rls_recursion.sql` — use the same `SECURITY DEFINER` helper pattern from the start.

---

### Pitfall 4: Squad Dashboard FlatList-Inside-ScrollView Kills Virtualization

**What goes wrong:**
The Squad dashboard layout is a vertical scroll containing: (1) friends list, (2) feature cards (Streaks, IOUs, Birthdays). The natural implementation wraps everything in a `ScrollView` and maps over the friends list. When the friend list is a `FlatList` nested inside that `ScrollView`, React Native prints: `"VirtualizedLists should never be nested inside plain ScrollViews"` and silently renders all friends at once. With 15 friends, this is fine. But the virtualization benefit is gone, and the warning signals an architectural mistake that will matter if friends lists grow.

More critically: `FlatList` inside `ScrollView` without `scrollEnabled={false}` creates a dual-scroll zone. On Android, the inner list intercepts all scroll events and the outer scroll never triggers. The user cannot scroll past the friends list to see the feature cards.

**Why it happens:**
The existing Squad screen uses `ScrollView` for the Goals tab (wrapping the `StreakCard`). The refactor to a dashboard naturally extends that wrapper to also contain the friends list component (`FriendsList`) which internally uses `FlatList`. Two levels of scroll are now competing.

**Consequences:**
- Feature cards (Streaks, IOUs, Birthdays) are unreachable on Android if the friends list is tall
- All friends render simultaneously — no lazy loading
- The warning in dev becomes a real bug on Android devices

**Prevention:**
- Use a single outer `FlatList` for the entire dashboard. The friends list becomes the `data` prop. Feature cards go into `ListHeaderComponent` or `ListFooterComponent`.
- Alternatively: friends list at the top with `scrollEnabled={false}` (fixed height, no inner scroll), outer `ScrollView` handles all scrolling. Only valid if the group size cap of 15 makes the fixed height bounded.
- Recommended: `FlatList` as the outer container, feature cards in `ListFooterComponent`. The project constraint says "FlatList for all lists" — this enforces that constraint at the dashboard level.
- Do not render the friends list as a `ScrollView + map` workaround to avoid the nesting warning. That has worse performance than properly structured `FlatList`.

**Detection:**
- Yellow warning box in dev: `"VirtualizedLists should never be nested inside plain ScrollViews"`
- On Android: scroll the friends list then release — outer content does not scroll
- On Android: feature cards below the friends list are not reachable by scrolling

**Phase to address:** Squad Dashboard phase (first phase of v1.4). The scroll architecture must be decided before any dashboard component is built.

---

### Pitfall 5: Birthday Stored as TIMESTAMPTZ — Breaks Every Year on Daylight Saving

**What goes wrong:**
If the `birthday` column is `TIMESTAMPTZ` (timestamp with time zone), a birthday stored as `1990-03-10T00:00:00Z` renders as March 9 in UTC-5 timezones. "Upcoming birthdays" queries that compute `WHERE EXTRACT(month FROM birthday) = EXTRACT(month FROM NOW())` will produce wrong results for users in timezones behind UTC. Worse: a birthday query that calculates "days until birthday" using timestamp arithmetic will be off by ±1 day for half the user base.

**Why it happens:**
Developers default to `TIMESTAMPTZ` for all date fields because it stores timezone-correctly. But a birthday is not a moment in time — it is a calendar date. The year is irrelevant; the month and day are what matter. TIMESTAMPTZ forces an absolute moment interpretation.

**Consequences:**
- Birthdays appear one day early/late depending on user timezone
- "Today's birthdays" query misses or double-counts users around midnight in offset timezones
- Cannot fix by changing query logic — the problem is at the storage level

**Prevention:**
- Store birthday as `DATE` (no time, no timezone) in Postgres. `DATE` stores year-month-day only and has no timezone semantics.
- Migration column definition: `birthday DATE`. Not `TIMESTAMPTZ`, not `TEXT`.
- Upcoming birthdays query: compare `(EXTRACT(month FROM birthday), EXTRACT(day FROM birthday))` to the current date using the app's local date — not server UTC. Pass the user's current date as a parameter to the RPC function rather than using `NOW()` inside Postgres.
- Display formatting: send the `DATE` value to the client as an ISO string (`'YYYY-MM-DD'`), parse in JavaScript as `new Date(year, month-1, day)` (local constructor, not `new Date(isoString)` which parses as UTC).

**Detection:**
- Test with a simulated timezone of UTC-5: set a birthday to tomorrow in UTC-5. Query "upcoming birthdays". If the birthday does not appear, the storage is timezone-contaminated.
- Check migration: `\d profiles` in psql — birthday column type must be `date` not `timestamptz`.

**Phase to address:** Birthday schema migration. The `DATE` type must be set in the `ALTER TABLE profiles ADD COLUMN birthday DATE` migration. Cannot be changed after data is stored without a destructive migration.

---

## Moderate Pitfalls

### Pitfall 6: Multi-Step IOU Operations Are Not Atomic — supabase-js Has No Transaction Support

**What goes wrong:**
Creating a group expense requires at minimum two writes: (1) INSERT into `expenses`, (2) INSERT N rows into `iou_participants` (one per person). Using `supabase-js` client, these are two separate PostgREST calls. If the app crashes, the network drops, or an RLS check fails between the two calls, `expenses` has a row but `iou_participants` is empty. The expense appears in the payer's list but no one owes anything. There is no orphan cleanup.

**Why it happens:**
`supabase-js` is built on PostgREST, which does not support multi-statement transactions. Developers chain `.insert()` calls and assume they are atomic because they happen sequentially.

**Prevention:**
- Wrap all IOU creation logic in a **PostgreSQL RPC function** (`create_expense(...)` called via `supabase.rpc()`). The entire operation runs inside a single transaction in Postgres. If the participant inserts fail, the expense insert is rolled back automatically.
- The RPC function signature: `(p_description TEXT, p_amount_cents INTEGER, p_participant_ids UUID[], p_split_type TEXT)` — returns the new expense ID or raises an exception.
- Do NOT use Supabase Edge Functions for this specific operation unless a direct Postgres connection is used. Edge Functions via supabase-js client also lack transaction support (as documented in the December 2025 marmelab article).
- Settlement operations (marking a share as paid) follow the same rule: a single RPC that updates `iou_participants.settled_at` and potentially logs to a `settlement_events` table.

**Detection:**
- Simulate a network drop (airplane mode) after the expense INSERT fires but before the participants INSERT. Verify no orphan expense exists on reconnect.
- Read the final implementation: if there are two separate `.insert()` calls for expense + participants, the implementation is wrong.

**Phase to address:** IOU creation RPC function (same phase as the IOU schema).

---

### Pitfall 7: Squad Tab File-System Navigation — Replacing squad.tsx With a Folder Breaks Existing Routes

**What goes wrong:**
The current Squad tab is `src/app/(tabs)/squad.tsx` — a single file. The v1.4 dashboard redesign likely needs sub-routes (e.g., `/squad/iou`, `/squad/birthdays`). The natural refactor is to convert `squad.tsx` into a `squad/` directory with `_layout.tsx` and `index.tsx`. In Expo Router, this directory-to-file conversion has a known edge case: any existing deep links, push notification payloads, or programmatic `router.push('/squad')` calls may break if the new `index.tsx` does not render the same route.

Additionally, adding a nested `_layout.tsx` inside the squad folder introduces a new Stack navigator. If the existing Squad screen had a tab press that reset navigation state (double-tap to scroll to top), the new nested layout changes how that gesture behaves.

**Why it happens:**
Expo Router's file-system convention maps directories to route segments. A file `squad.tsx` and a directory `squad/index.tsx` resolve to the same URL (`/squad`) but have different navigator nesting semantics. The `_layout.tsx` you add controls whether inner screens push as modals, stacks, or flat routes.

**Prevention:**
- Audit every `router.push('/squad')`, `router.replace('/squad')`, and every push notification payload that includes a screen path before starting the refactor.
- Decide whether the IOU and birthday screens live under `/squad/iou` or as top-level modals (e.g., `/(tabs)/iou.tsx` with `tabBarButton: () => null`). Modals avoid the layout nesting problem entirely and keep the Squad file flat.
- The v1.3 decision note: "Title-only tab rename (no file renames). Expo Router `name` = file, `title` = label. Preserves all deep routes." Follow the same philosophy: add new screens as separate route files, not by restructuring the existing tab file.
- If the folder approach is used, write the `squad/index.tsx` as the dashboard and confirm `npx expo start` still resolves `/squad` to the dashboard with no 404.

**Detection:**
- After any Squad file restructure: tap the Squad tab from every other tab. Confirm the dashboard loads.
- Test any existing deep link or notification that navigated to `/squad` previously.

**Phase to address:** Squad Dashboard phase. Architecture decision (flat file vs. nested folder) must be made in the planning step, not discovered during implementation.

---

### Pitfall 8: Expense Balance Computation in the Client — Incorrect With Concurrent Updates

**What goes wrong:**
Calculating "you owe $X" by fetching all expenses and computing balances in JavaScript is tempting — it avoids a complex query. The problem: two users opening the IOU screen simultaneously each fetch the expense list, compute balances locally, and may see different totals if one user's write is in-flight during the other's fetch. There is no guarantee of read-after-write consistency with Supabase PostgREST's default connection pool.

**Why it happens:**
Client-side aggregation feels simpler than writing a SQL balance view. It works perfectly in single-user testing. Multi-user concurrent scenarios are not tested locally.

**Prevention:**
- Compute balances in a **PostgreSQL view or RPC function**, not in JavaScript. A `get_squad_balances(p_user_id UUID)` function returns pre-aggregated net balances per person. The function runs inside Postgres where all committed data is visible in a single consistent snapshot.
- The `effective_status` view pattern (already in this codebase) is the right precedent: server-side computation, client fetches the result.
- For v1.4 group sizes (≤15 people, likely ≤50 expenses), a simple SQL SUM with GROUP BY is fast enough. No need for a materialized view.

**Detection:**
- In dev, open IOU screen as user A, simultaneously insert a new expense as user B (Supabase dashboard), and refresh as user A. If the balance differs from what Postgres would compute, client-side logic is wrong.

**Phase to address:** IOU balance display (any phase that shows the balance summary card).

---

### Pitfall 9: Birthday Privacy — Friends Can See Birthday But Profile RLS Exposes Date to Non-Friends

**What goes wrong:**
Adding `birthday DATE` to `profiles` without updating the RLS SELECT policy means any authenticated user can query anyone's birthday (the existing profiles SELECT policy may allow `is_friend_of()` OR `id = auth.uid()` but it might be `TRUE` for all authenticated users). Birthday is personal data — it should only be visible to accepted friends.

**Why it happens:**
The profiles table SELECT policy was designed when profiles only contained display name, username, and avatar — low-sensitivity fields. Birthday is higher sensitivity. Developers add the column to the table without checking whether the existing policy already restricts it appropriately.

**Prevention:**
- Before writing the migration, read the existing `profiles` SELECT policy (in migration `0001_init.sql` and any subsequent migrations). Verify it uses `is_friend_of()` or equivalent, not `FOR ALL USING (true)`.
- If the policy is permissive (allows all authenticated users to read all profiles — common for discovery features), add a **column-level restriction**: use a separate view or function that strips `birthday` for non-friends. Supabase supports `GRANT SELECT (col1, col2) ON TABLE profiles` to restrict column visibility.
- The simplest safe approach: the "upcoming birthdays" feature is implemented as an RPC function (`get_friend_birthdays()`) that only returns birthdays for accepted friends of `auth.uid()`. The `birthday` column on the raw `profiles` table is never directly queried by the client.

**Detection:**
- As user A (not friends with user B), attempt: `supabase.from('profiles').select('birthday').eq('id', userBId)`. If birthday is returned, the policy is too permissive.

**Phase to address:** Birthday schema migration. Column privacy must be specified in the migration planning step, not added later.

---

### Pitfall 10: Dashboard Scroll Performance — Feature Cards Trigger Multiple Parallel Fetches on Mount

**What goes wrong:**
The Squad dashboard renders three feature cards simultaneously: Streaks card (already exists), IOU balance card (new), Birthdays card (new). Each card has its own `useEffect` data fetch hook that fires when the component mounts. All three fire simultaneously on tab focus, creating 3 parallel Supabase queries on every Squad tab visit. On slow connections or Supabase free tier cold-start latency, the user sees three simultaneous loading spinners.

**Why it happens:**
Each card is a self-contained component with its own data hook — good for modularity, but they all mount at the same time in the same render pass. No coordination of fetch timing.

**Prevention:**
- Consolidate IOU balance and birthday fetches into a single `useSquadDashboard()` hook that fetches both in parallel with `Promise.all()` and returns combined state. Three components, one hook.
- The Streaks hook (`useStreakData`) already exists — it can remain separate since it was built for the Goals tab context. Do not refactor it unnecessarily.
- Use pull-to-refresh on the outer container to refetch all dashboard data at once (already the established pattern in this app per `usePullToRefresh` convention).
- Do not add Supabase Realtime subscriptions to IOU or birthday cards. These are "read when viewed" features — polling on focus is sufficient and avoids the 200-connection Realtime limit.

**Detection:**
- Network tab in Expo devtools: switch to Squad tab, count simultaneous Supabase requests. If > 2 (profiles + one data call), consolidate.
- Loading skeleton flickers for each card independently = separate fetch hooks that are not coordinated.

**Phase to address:** Squad Dashboard phase, during component architecture design.

---

## Minor Pitfalls

### Pitfall 11: The Existing `iou_notes` TEXT Field on Plans Creates Confusion

**What goes wrong:**
`plans.iou_notes` is a freeform text field added in v1.0 as a quick "note who owes what" escape hatch. When the structured IOU feature ships, users will have old plans with text in `iou_notes` and new IOU records in the structured table. The app may show both, or the plans UI may still show the free-text field alongside the new IOU card, creating two parallel systems for the same job.

**Prevention:**
- Decide whether `plans.iou_notes` is deprecated or repurposed. Options:
  1. Rename it to `notes` (general plan notes, not IOU-specific) and remove it from any IOU-related UI.
  2. Keep it as a legacy field but hide it from the plan UI for new plans. Show it only if non-null (migration path).
  3. Remove it — but this is a destructive schema change requiring a migration and any clients with the old field in their queries will error.
- Recommended: rename to `general_notes` in a migration, update all references, remove IOU framing from the plan UI. The structured IOU feature is the canonical expense system.

**Phase to address:** IOU schema migration. Must be decided before the structured IOU tables are designed so naming does not conflict.

---

### Pitfall 12: Supabase Free Tier — 500MB DB Limit, IOU Tables Are Append-Only by Nature

**What goes wrong:**
Expenses are never deleted — that is both a feature (audit trail) and a risk. Each expense record + N participant records + N settlement records = unbounded growth. For a small friend group (5 people, 3 expenses/week), this is ~15 rows/week or ~780 rows/year — trivially small. However, if the feature is used heavily or the group size is larger, the growth rate is meaningful within the 500MB limit shared with all other tables.

**Prevention:**
- Size the IOU tables properly: use `integer` (4 bytes) for cents, `uuid` (16 bytes) for IDs, `timestamptz` (8 bytes) for timestamps. An expense + 5 participants is ~250 bytes total. 10,000 expenses = 2.5MB. This is not a near-term risk.
- Do not add unnecessary columns (e.g., storing the computed split amounts per participant AND a redundant total). Derive what can be derived.
- The 500MB limit is primarily a risk for Storage (images), not for structured relational data at this app's scale. Monitor via Supabase dashboard; do not optimize prematurely.

**Phase to address:** IOU schema design (sizing column types appropriately). No action needed beyond correct initial types.

---

### Pitfall 13: Expo Router Tab Press Badge Reset — Pending Request Badge on Squad Tab

**What goes wrong:**
The Squad tab currently shows a badge for pending friend requests (`usePendingRequestsCount`). When the Squad tab is converted to a dashboard, the badge logic must survive the refactor. If the tab is restructured into a folder (`squad/`) with a new `_layout.tsx`, the badge configuration lives in the tab `_layout.tsx` (`src/app/(tabs)/_layout.tsx`). If the tab file path changes, the badge wiring may silently stop working because the `tabBarBadge` prop looks up the route by file name.

**Prevention:**
- Do not rename the Squad tab file. `squad.tsx` → `squad/index.tsx` changes the internal path. The tab `_layout.tsx` references it as `squad` in both cases, but confirm this with a live test after any restructure.
- If the Squad tab remains `squad.tsx` (dashboard in-place, sub-screens as modals or separate routes), the badge is unaffected.

**Phase to address:** Squad Dashboard phase. Verify badge still appears after any navigation restructure.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| IOU schema migration | Float amounts → cent drift | Use `INTEGER` cents column; verify with `CHECK (amount_cents > 0)` |
| IOU schema migration | `iou_notes` naming collision | Rename `plans.iou_notes` to `general_notes` in same migration |
| IOU RLS design | Self-settlement security hole | Only expense creator can mark shares settled; write test |
| IOU RLS design | Recursive friendship subquery | Use `SECURITY DEFINER` helper + `(SELECT auth.uid())` wrapper |
| IOU create operation | Non-atomic two-step write | Single `create_expense()` RPC function; no chained `.insert()` calls |
| IOU balance display | Client-side aggregation inconsistency | `get_squad_balances()` RPC; compute in Postgres, not JavaScript |
| Birthday migration | TIMESTAMPTZ vs DATE | Column type must be `DATE`; test with UTC-5 timezone simulation |
| Birthday migration | Profile RLS too permissive for birthday field | Implement `get_friend_birthdays()` RPC; never expose raw birthday column to all authenticated users |
| Squad Dashboard | FlatList-inside-ScrollView | Single outer FlatList; feature cards in `ListFooterComponent` |
| Squad Dashboard | Multiple parallel fetch hooks | Single `useSquadDashboard()` hook; `Promise.all()` for IOU + birthday |
| Squad Dashboard | Tab file restructure breaks badge | Keep `squad.tsx` flat; add sub-screens as modals or separate non-tab routes |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| IOU amounts + JavaScript | Passing JS `number` (float) to Supabase insert | Pass integers (cents) only; assert `Number.isInteger(amount)` at call site |
| IOU create + RLS | Two chained `.insert()` calls | Single `create_expense()` RPC call |
| IOU RLS + friendships | Subquery per row in policy | `(SELECT auth.uid())` wrapper + `SECURITY DEFINER` function |
| Birthday + timezone | `new Date(isoString)` parses as UTC | Use `new Date(year, month-1, day)` local constructor |
| Birthday + profiles RLS | Adding column without checking SELECT policy | Verify policy uses `is_friend_of()` before writing migration |
| Dashboard + FlatList | `FlatList` inside `ScrollView` | Outer FlatList; feature cards in list header/footer |
| Dashboard + data fetching | One hook per card = 3 parallel queries | Combined `useSquadDashboard()` hook |
| Squad tab refactor | Restructuring file breaks badge/navigation | Audit all `router.push('/squad')` calls before any file moves |
| Settlement UI | Debtor can mark own share settled | RLS: only expense creator can INSERT to settlements |

---

## Sources

- Supabase Realtime limits (200 concurrent connections, 100 messages/sec): https://supabase.com/docs/guides/realtime/limits
- Supabase RLS performance and subquery optimization: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv (archived; see community discussion at https://github.com/orgs/supabase/discussions/14576)
- Supabase RLS performance optimization — `(SELECT auth.uid())` wrapper pattern: https://supaexplorer.com/best-practices/supabase-postgres/security-rls-performance/
- Transactions and RLS in Supabase Edge Functions (supabase-js has no transaction support): https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html
- Floats don't work for storing cents: https://www.moderntreasury.com/journal/floats-dont-work-for-storing-cents
- Working with money in Postgres (NUMERIC vs INTEGER cents): https://www.crunchydata.com/blog/working-with-money-in-postgres
- PostgreSQL DATE type (no timezone semantics): https://www.postgresql.org/docs/current/datatype-datetime.html
- Splitwise debt simplification algorithm (largest-remainder method context): https://medium.com/@mithunmk93/algorithm-behind-splitwises-debt-simplification-feature-8ac485e97688
- React Native nested VirtualizedList warning: https://medium.com/@sivasothytharsa17/solving-the-virtualizedlists-should-never-be-nested-inside-plain-scrollviews-error-in-react-fbd3cb4daeed
- Expo Router nested tabs and file structure: https://docs.expo.dev/router/advanced/nesting-navigators/
- Campfire v1.0 plan_members RLS recursion fix (project precedent): `supabase/migrations/0004_fix_plan_members_rls_recursion.sql`

---
*Pitfalls research for: Campfire v1.4 — IOU expense splitting, birthday calendar, Squad dashboard redesign*
*Researched: 2026-04-11*
