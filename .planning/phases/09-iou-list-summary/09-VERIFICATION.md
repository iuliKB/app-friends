---
phase: 09-iou-list-summary
verified: 2026-04-13T12:00:00Z
status: human_needed
score: 9/9 automated must-haves verified
human_verification:
  - test: "Open Expo Go, navigate to Squad tab → Goals tab. Confirm IOUCard appears between StreakCard and BirthdayCard."
    expected: "IOUCard renders with correct aggregate balance (green 'You're owed $X' or red 'You owe $X' or 'All settled up!') and unsettled count sub-label."
    why_human: "Visual layout order and color rendering cannot be verified without a running device."
  - test: "Tap IOUCard. Confirm navigation to /squad/expenses Balances screen."
    expected: "Balances screen appears with ScreenHeader title 'Balances' and per-friend rows (avatar + name + signed amount in green/red) or empty state 'All settled up!'."
    why_human: "Navigation and live RPC data from get_iou_summary() require a running device with auth session."
  - test: "Tap a friend row on the Balances screen."
    expected: "Per-friend history screen appears with title 'Expenses with {name}', 48px net balance strip at top, expense list newest-first, settled rows dimmed."
    why_human: "Real data from useExpensesWithFriend multi-step queries and settled row opacity require device + auth."
  - test: "Pull down to refresh on both Balances and per-friend history screens."
    expected: "Spinner appears; rows reload after release."
    why_human: "RefreshControl behavior requires real device interaction."
  - test: "Tap an expense row on the per-friend history screen."
    expected: "Navigates to existing Phase 8 expense detail screen (/squad/expenses/[id])."
    why_human: "Cross-screen navigation with real expense IDs requires a running session."
---

# Phase 9: IOU List & Summary Verification Report

**Phase Goal:** Users can see net balances per friend across all expenses and browse expense history — the IOU feature is fully usable without requiring the dashboard
**Verified:** 2026-04-13T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | get_iou_summary RPC has a typed return row in database.ts Functions section | VERIFIED | `src/types/database.ts` line 589: `get_iou_summary:` entry with all 5 required fields (`friend_id`, `display_name`, `avatar_url`, `net_amount_cents`, `unsettled_count`) |
| 2 | useIOUSummary hook returns { rows, netCents, unsettledCount, loading, error, refetch } with correct types | VERIFIED | `src/hooks/useIOUSummary.ts`: exports `useIOUSummary`, `IOUSummaryRow`, `IOUSummaryData`; `netCents` and `unsettledCount` computed via `.reduce()` at lines 58-59; `userId` null guard at line 36 |
| 3 | useExpensesWithFriend(friendId) returns { expenses, loading, error, refetch } using multi-step queries | VERIFIED | `src/hooks/useExpensesWithFriend.ts`: 3-step approach — step 1 caller memberships (line 45), step 2 friend memberships (line 66), `Promise.all` for groups + members at line 88; `isFullySettled` computed via `groupMembers.every((m) => m.settled_at !== null)` at line 134 |
| 4 | BalanceRow renders avatar + name + signed amount label (green positive, red negative) and is tappable | VERIFIED | `src/components/iou/BalanceRow.tsx`: `COLORS.status.free` (positive) and `COLORS.interactive.destructive` (negative) at line 28; `→ you` and `← you` labels at line 29; `AvatarCircle size={36}` at line 38; Pressable with `onPress` |
| 5 | ExpenseHistoryRow renders title + amount + payer/date meta and dims settled rows at opacity 0.45 | VERIFIED | `src/components/iou/ExpenseHistoryRow.tsx`: `<View style={isFullySettled ? { opacity: 0.45 } : undefined}>` at line 35; `Intl.DateTimeFormat` at line 19; `Paid by {payerName} · {date}` meta at line 47 |
| 6 | IOUCard renders aggregate net position in green or red with unsettled count, or 'All settled up!' empty state | VERIFIED | `src/components/squad/IOUCard.tsx`: "You're owed $X" (green) / "You owe $X" (red) at lines 30-31; "All settled up!" empty state at line 48; `COLORS.status.free` / `COLORS.interactive.destructive` at line 29 |
| 7 | IOUCard tap navigates to /squad/expenses | VERIFIED | `src/components/squad/IOUCard.tsx` line 37: `router.push('/squad/expenses' as never)` |
| 8 | Balance index screen shows per-friend rows from useIOUSummary with FlatList, empty state, pull-to-refresh | VERIFIED | `src/app/squad/expenses/index.tsx`: imports and calls `useIOUSummary` (line 18); `FlatList` with `BalanceRow` renderItem (lines 80-92); `EmptyState` "All settled up!" (line 104); `RefreshControl` with `onRefresh={refetch}` (line 99) |
| 9 | Per-friend history screen shows all shared expenses newest first, settled rows dimmed, pull-to-refresh | VERIFIED | `src/app/squad/expenses/friend/[id].tsx`: calls `useExpensesWithFriend(id)` (line 34); `ExpenseHistoryRow` renders `isFullySettled` prop which triggers opacity 0.45; `RefreshControl` with `onRefresh={refetch}`; expenses ordered newest-first by hook's `.order('created_at', { ascending: false })` |
| 10 | Both new routes registered in _layout.tsx Stack navigator | VERIFIED | `src/app/squad/_layout.tsx` lines 15-16: `Stack.Screen name="expenses/index"` and `Stack.Screen name="expenses/friend/[id]"` |
| 11 | IOUCard appears in Goals tab between StreakCard and BirthdayCard | VERIFIED (automated) | `src/app/(tabs)/squad.tsx` lines 74-76: `<StreakCard streak={streak} />`, `<IOUCard summary={iouSummary} />`, `<BirthdayCard birthdays={birthdays} />` in that exact order |
| 12 | squad.tsx imports IOUCard and useIOUSummary; hook result passed as prop | VERIFIED | Lines 15-16: imports; line 25: `const iouSummary = useIOUSummary()`; line 75: `<IOUCard summary={iouSummary} />` |

**Score:** 12/12 automated truths verified

### ROADMAP Success Criteria

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | IOU index screen shows a per-friend net balance list: each row indicates who owes whom and the net amount, computed from all unsettled expenses | VERIFIED | `expenses/index.tsx` consumes `useIOUSummary` (backed by `get_iou_summary()` RPC) and renders `BalanceRow` per friend with signed net amounts |
| 2 | Expense history screen shows a chronological list of all past expenses the user is involved in (as payer or participant), with title, payer, total amount, and date | VERIFIED | `expenses/friend/[id].tsx` consumes `useExpensesWithFriend` which orders by `created_at DESC`; `ExpenseHistoryRow` renders title, `formatCentsDisplay(totalCents)`, "Paid by {payerName} · {date}" |
| 3 | The IOU dashboard card shows an aggregate balance summary ("You're owed $34" or "You owe $12") with a count of unsettled items | VERIFIED | `IOUCard.tsx` lines 30-32: `balanceLabel` ("You're owed X" / "You owe X") + `unsettledLabel` ("N unsettled"); both rendered in JSX lines 51-54 |
| 4 | The IOU dashboard card shows an appropriate empty state when no expenses exist | VERIFIED | `IOUCard.tsx` line 48: renders "All settled up!" when `unsettledCount === 0` (`hasActivity` is false) |

All 4 ROADMAP success criteria verified programmatically. Human verification required for 5 behavioral checks (navigation, live RPC data, device rendering, pull-to-refresh feel).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/database.ts` | `get_iou_summary` Function type | VERIFIED | Lines 588-598: complete entry with correct return shape |
| `src/hooks/useIOUSummary.ts` | RPC hook with 3 exports | VERIFIED | Exports `useIOUSummary`, `IOUSummaryRow`, `IOUSummaryData` |
| `src/hooks/useExpensesWithFriend.ts` | Multi-step query hook | VERIFIED | Exports `useExpensesWithFriend`, `ExpenseWithFriend`, `ExpensesWithFriendData` |
| `src/components/iou/BalanceRow.tsx` | Pressable balance row | VERIFIED | Exports `BalanceRow`; correct tokens, avatar, signed labels |
| `src/components/iou/ExpenseHistoryRow.tsx` | History row with settled dimming | VERIFIED | Exports `ExpenseHistoryRow`; opacity 0.45, Intl.DateTimeFormat |
| `src/components/squad/IOUCard.tsx` | Dashboard card | VERIFIED | Exports `IOUCard`; accepts `IOUSummaryData` prop; navigates to /squad/expenses |
| `src/app/squad/expenses/index.tsx` | Balance index screen | VERIFIED | Default export; uses useIOUSummary; FlatList + BalanceRow |
| `src/app/squad/expenses/friend/[id].tsx` | Per-friend history screen | VERIFIED | Default export; uses useExpensesWithFriend; FlatList + ExpenseHistoryRow; net balance strip |
| `src/app/squad/_layout.tsx` | Stack registrations | VERIFIED | `expenses/index` and `expenses/friend/[id]` both registered |
| `src/app/(tabs)/squad.tsx` | IOUCard wired in Goals tab | VERIFIED | IOUCard between StreakCard and BirthdayCard; hook call present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useIOUSummary.ts` | `supabase.rpc('get_iou_summary')` | RPC call | WIRED | Line 43: `await supabase.rpc('get_iou_summary')` |
| `useExpensesWithFriend.ts` | `iou_members` table | `.from('iou_members')` | WIRED | Lines 45 and 66: two sequential `.from('iou_members')` queries |
| `BalanceRow.tsx` | `formatCentsDisplay` | import from currencyFormat | WIRED | Line 8: `import { formatCentsDisplay } from '@/utils/currencyFormat'`; called at line 27 |
| `expenses/index.tsx` | `useIOUSummary` | import + hook call | WIRED | Lines 13-14 import; line 18 hook call; `rows` rendered in FlatList |
| `expenses/friend/[id].tsx` | `useExpensesWithFriend` | import + hook call | WIRED | Line 14 import; line 34 hook call; `expenses` rendered in FlatList |
| `IOUCard.tsx` | `/squad/expenses` | router.push on Pressable | WIRED | Line 37: `router.push('/squad/expenses' as never)` |
| `expenses/index.tsx` | `/squad/expenses/friend/[id]` | BalanceRow onPress router.push | WIRED | Lines 24-31: `handleRowPress` calls `router.push` with `pathname: '/squad/expenses/friend/[id]'` and params |
| `expenses/friend/[id].tsx` | `/squad/expenses/[id]` | ExpenseHistoryRow onPress router.push | WIRED | Line 37: `router.push('/squad/expenses/${expense.id}' as never)` |
| `squad.tsx` | `IOUCard` | import + JSX render | WIRED | Lines 15, 25, 75: import, hook, JSX |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `IOUCard.tsx` | `netCents`, `unsettledCount` | `IOUSummaryData` prop → `useIOUSummary` → `supabase.rpc('get_iou_summary')` | Yes — authenticated RPC backed by migration 0015 DB function | FLOWING |
| `expenses/index.tsx` | `rows` (filtered to `unsettledRows`) | `useIOUSummary()` → `supabase.rpc('get_iou_summary')` | Yes — same RPC; filter `unsettled_count > 0` applied client-side | FLOWING |
| `expenses/friend/[id].tsx` | `expenses` | `useExpensesWithFriend(id)` → 3-step iou_members + iou_groups + profiles queries | Yes — multi-step queries against real tables with RLS | FLOWING |
| `BalanceRow.tsx` | `netAmountCents`, `displayName`, `avatarUrl` | Props from parent expenses/index screen | Data flows from RPC rows | FLOWING |
| `ExpenseHistoryRow.tsx` | `isFullySettled`, `title`, `totalCents`, `payerName`, `createdAt` | Props from parent friend/[id] screen | Data flows from multi-step query results | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compile — zero errors | `npx tsc --noEmit` | Exit code 0 | PASS |
| `useIOUSummary` calls get_iou_summary RPC | grep pattern in hook file | `supabase.rpc('get_iou_summary')` found at line 43 | PASS |
| `useExpensesWithFriend` uses Promise.all | grep pattern in hook file | `Promise.all([` found at line 88 | PASS |
| `isFullySettled` computed correctly | grep `every` pattern | `groupMembers.every((m) => m.settled_at !== null)` found at line 134 | PASS |
| Settled rows opacity wrapper present | grep `opacity: 0.45` | Found at line 35 of `ExpenseHistoryRow.tsx` | PASS |
| IOUCard navigates to correct route | grep `push.*squad/expenses` | `router.push('/squad/expenses' as never)` at line 37 | PASS |
| BalanceRow has min touch target | grep `minHeight: 44` | Found at line 59 with eslint-disable comment | PASS |
| Squad tab card order | read squad.tsx JSX order | StreakCard (74) → IOUCard (75) → BirthdayCard (76) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| IOU-03 | 09-01, 09-02, 09-03 | Net balance view per friend | SATISFIED | `useIOUSummary` RPC hook + `BalanceRow` + `expenses/index.tsx` + `IOUCard` all deliver per-friend net balance display |
| IOU-05 | 09-01, 09-02 | Expense history screen per friend | SATISFIED | `useExpensesWithFriend` multi-step hook + `ExpenseHistoryRow` + `expenses/friend/[id].tsx` deliver chronological history with settled dimming |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `BalanceRow.tsx` | 43 | `{unsettledCount} {unsettledCount === 1 ? 'unsettled' : 'unsettled'}` — ternary is a no-op; both branches return `'unsettled'` | Info | Cosmetic only; no functional impact. Should probably be `'expense'` vs `'expenses'` or similar pluralization. Does not affect correctness. |

No blockers or warnings found. The no-op ternary is a copy-paste artifact producing correct but non-pluralized output; it does not prevent any goal from being achieved.

### Human Verification Required

#### 1. IOUCard visual rendering in Goals tab

**Test:** Open Expo Go, navigate to Squad tab, tap "Goals" tab switcher. Verify card order and IOUCard appearance.
**Expected:** Three cards in order — StreakCard, IOUCard, BirthdayCard. IOUCard shows aggregate balance in correct color or "All settled up!".
**Why human:** Visual layout ordering and React Native color rendering require a running device.

#### 2. IOUCard navigation to Balances screen

**Test:** Tap IOUCard.
**Expected:** Navigates to /squad/expenses with ScreenHeader "Balances" and per-friend BalanceRow list (or empty state).
**Why human:** Navigation stack behavior and live RPC data from `get_iou_summary()` require auth session on device.

#### 3. Per-friend history screen full flow

**Test:** Tap a friend row on Balances screen.
**Expected:** History screen appears with title "Expenses with {name}", 48px net balance strip at top showing signed amount in green/red, expense rows newest-first, settled expenses visually dimmed.
**Why human:** Multi-step query results, settled row opacity rendering, and dynamic Stack.Screen title require a device.

#### 4. Pull-to-refresh on both screens

**Test:** Pull down on Balances screen and on per-friend history screen.
**Expected:** Spinner appears; data refreshes after release.
**Why human:** RefreshControl behavior and timing require physical gesture on device.

#### 5. Expense detail navigation from history

**Test:** Tap an expense row on the per-friend history screen.
**Expected:** Navigates to Phase 8 expense detail screen (/squad/expenses/[id]).
**Why human:** Correct expense ID routing with real data requires a device with seeded expenses.

### Gaps Summary

No gaps found. All automated must-haves are verified. The phase delivered its complete goal: types, hooks, components, screens, navigation registration, and Goals tab integration are all present, substantive, wired, and data-flowing. The remaining items are human-only verifications of live device behavior.

---

_Verified: 2026-04-13T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
