# Project Research Summary

**Project:** Campfire v1.4 — Squad Dashboard & Social Tools
**Domain:** Social coordination app — group expense splitting (IOU), birthday calendar, Squad dashboard redesign
**Researched:** 2026-04-11
**Confidence:** MEDIUM-HIGH

## Executive Summary

Campfire v1.4 adds three features to an existing React Native + Expo + Supabase stack: a Squad dashboard redesign, a structured IOU expense-splitting system, and a birthday calendar. Zero new npm dependencies are required — the existing stack handles all three through new Supabase migrations, new Zustand store slices, and layout changes using existing components. The complexity is concentrated in the database layer, not the client layer: IOU requires three new tables with carefully designed RLS policies, a SECURITY DEFINER RPC for balance computation, and an atomic create-expense PostgreSQL function. Birthday requires a single column addition to profiles and one RPC with year-wrap arithmetic.

The recommended build order is database-first, features-second, dashboard-last. Migrations must be applied before any client code is written because column types and RLS policies cannot be changed without destructive migrations once data exists. Each feature (birthday, then IOU) should be built and tested in isolation before being wired into the Squad dashboard. The dashboard is assembled last from pre-built, independently verified cards — minimizing integration risk.

The top risks are concentrated in the IOU layer: storing amounts as floats (permanent cent drift), non-atomic expense creation (orphan records on network failure), and under-restricted RLS that allows debtors to self-certify settlement. Birthday has one critical schema risk: TIMESTAMPTZ instead of DATE causes off-by-one-day errors for users in negative-UTC timezones. The dashboard has one structural risk: nesting FlatList inside ScrollView kills Android scroll. All are preventable at schema/architecture-design time and unrecoverable after data is written.

## Key Findings

### Recommended Stack

All v1.4 features build on the locked stack (React Native 0.83.2, Expo SDK 55, Supabase, Zustand 5, TypeScript strict, Reanimated 4.2.1). No new npm dependencies are required. `@react-native-community/datetimepicker` (already at 8.6.0) handles birthday date entry. `Intl.NumberFormat` (built into Hermes on Expo SDK 55) handles currency display. Expense split math belongs in Postgres RPC functions, not a library — no mature Expo Go-compatible expense-splitting library exists.

The only conditional new dependency is `@marceloterreiro/flash-calendar` (`^1.3.0`) — pure-JS, Expo Go-compatible — but only if the birthday list screen requires a month-grid layout. A sorted FlatList of upcoming birthdays is simpler and likely better UX for groups of 3–15.

**Core technologies:**
- `@supabase/supabase-js ^2.99.2`: All IOU and birthday data via new tables and SECURITY DEFINER RPCs — existing client, no changes
- `zustand ^5.0.12`: Two new store slices (`useIouStore`, `useBirthdayStore`) following existing slice patterns
- `@react-native-community/datetimepicker 8.6.0`: Birthday date picker in profile edit — already installed
- `expo-haptics ~55.0.9`: Settle confirmation haptic feedback — already installed
- `Intl.NumberFormat` (Hermes built-in): Currency display with no library needed

### Expected Features

**Must have (table stakes):**
- IOU: Add expense with amount, description, payer, even split among selected friends
- IOU: Custom split by exact amount (per-person override)
- IOU: Per-person net balance view (owed vs. owed-to per friend pair)
- IOU: Mark as settled (manual, creator-only confirmation)
- IOU: Expense history list (chronological audit trail)
- Birthday: Optional birthday field on profile (month + day only, no year)
- Birthday: Upcoming birthdays card on Squad dashboard (next 30 days)
- Birthday: Birthday list screen (sorted by days-remaining, today highlighted)
- Birthday: Push notification on friend's birthday (on-device scheduled)
- Dashboard: FriendsList at top, Streaks + IOUs + Birthdays feature cards below; removes underline tab switcher

**Should have (differentiators):**
- IOU: Consolidated net balance between friend pairs (not raw per-expense rows)
- IOU: IOU card on Squad dashboard showing aggregate balance ("You're owed $34")
- Birthday: Push notification with DM deep-link (one-tap "Happy birthday")
- Birthday: "Days away" label ("Today", "Tomorrow", "3 days") instead of raw dates
- Dashboard: Feature cards as progressive disclosure — summary without drilling in

**Defer (v1.5+):**
- IOU tied to a Plan (pre-populate participants from plan attendees)
- Settlement push notification to creditor
- Birthday notification "send a wish" action button with pre-composed DM

**Out of scope (v2+):**
- In-app payment processing (Venmo/Apple Pay)
- Debt simplification graph algorithm
- Recurring expenses
- Contact sync for birthdays
- Multi-currency support

### Architecture Approach

All three features follow established Campfire conventions: file-based Expo Router routes under `src/app/squad/`, hooks that call Supabase directly with no cache layer, Zustand for ephemeral UI state only, SECURITY DEFINER RPCs for cross-table queries that would cause RLS recursion, and `(SELECT auth.uid())` wrappers in all RLS policy predicates. The Squad dashboard screen owns all hook instances and passes data down as props — no inter-card state sharing. Feature cards are assembled last after each is independently verified.

**Major components:**
1. `SquadDashboardScreen` — owns all hooks; passes data to cards; replaces `SquadTabSwitcher`; single outer FlatList with feature cards in ListFooterComponent
2. IOU screens (`ious/create`, `ious/[id]`, `ious/index`) + `IOUDashboardCard` — backed by `iou_groups` + `iou_members` tables and `get_iou_summary()` + `create_expense()` RPCs
3. `BirthdayListScreen` + `BirthdayDashboardCard` — backed by `birthday_month`/`birthday_day` columns on `profiles` and `get_upcoming_birthdays()` RPC

**Database migrations required (in order):**
- `0015_iou_groups.sql` — `iou_groups`, `iou_members` tables, RLS, indexes, `get_iou_summary()` RPC, `create_expense()` atomic RPC
- `0016_birthdays.sql` — `birthday_month` + `birthday_day` columns on `profiles`, `get_upcoming_birthdays()` RPC

### Critical Pitfalls

1. **IOU amounts stored as FLOAT** — Use `INTEGER` cents (e.g., `1000` = $10.00). Even split uses largest-remainder method in Postgres RPC, not JS. Cannot be fixed after data is written.

2. **Non-atomic IOU creation** — Wrap expense INSERT + participant INSERTs in a single `create_expense()` PostgreSQL RPC. Two chained `supabase.from().insert()` calls are not atomic; network failure between them creates orphan records.

3. **Debtors can self-certify settlement** — Only the expense creator (`iou_groups.created_by`) can mark shares settled. RLS UPDATE policy on `iou_members` must restrict to the creator, not the participant.

4. **Birthday stored as TIMESTAMPTZ instead of DATE** — Use separate `smallint` columns (`birthday_month`, `birthday_day`) as confirmed in ARCHITECTURE.md. Parse as `new Date(year, month-1, day)` on the client, never `new Date(isoString)`. Cannot be fixed without destructive migration.

5. **FlatList inside ScrollView on dashboard** — Single outer `FlatList`; feature cards in `ListFooterComponent`. Nesting FlatList inside ScrollView breaks Android scroll silently — feature cards become unreachable.

## Implications for Roadmap

The dependency chain drives the build order: migrations → birthday profile field → birthday feature → IOU create/detail → IOU list/summary → Squad dashboard.

### Phase 1: Database Migrations
**Rationale:** All client work depends on schema being correct. Column types and RLS cannot be changed after data is written. Both migrations are independent and applied together.
**Delivers:** All new tables, columns, RLS policies, indexes, RPCs (`get_iou_summary`, `get_upcoming_birthdays`, `create_expense`); `plans.iou_notes` renamed to `general_notes`
**Avoids:** Float amounts (use INTEGER cents), self-settlement RLS hole, RLS recursion (SECURITY DEFINER pattern from `0004_fix_plan_members_rls_recursion.sql`), TIMESTAMPTZ birthday, birthday privacy exposure

### Phase 2: Birthday Profile Field
**Rationale:** Lowest-risk entry point; validates new columns work before building dependent screens. One file change (`profile/edit.tsx`), no new hooks or navigation.
**Delivers:** Birthday month/day input in profile edit; save/load round-trip verified; Feb 29 → Feb 28 client normalization in place
**Uses:** Existing `FormField` component; `datetimepicker` already installed

### Phase 3: Birthday Calendar Feature
**Rationale:** Birthday is simpler than IOU (read-only, single RPC, no form validation). Ships first to validate the RPC pattern and on-device notification scheduling before IOU complexity.
**Delivers:** `useUpcomingBirthdays()` hook, `BirthdayRow` component, `BirthdayListScreen`, `BirthdayDashboardCard`, day-of push notification
**Addresses:** Year-wrap arithmetic, "Today"/"Tomorrow"/"N days" label logic, empty state

### Phase 4: IOU Create and Detail
**Rationale:** IOU creation is the most complex single operation in v1.4. Build before the list screen so the feature is testable end-to-end with real data.
**Delivers:** `useIOUDetail()` hook, `IOUSplitField`/`IOUMemberRow` components, `ious/create` screen, `ious/[id]` screen, settle action via `create_expense()` RPC
**Avoids:** Non-atomic write (Pitfall 6), client-side balance calculation (Pitfall 8)

### Phase 5: IOU List and Summary
**Rationale:** IOU list depends on data that Phase 4 creates; `IOUDashboardCard` is only meaningful after expenses exist.
**Delivers:** `useIOUSummary()` hook, `IOUGroupRow` component, `ious/index` screen, `IOUDashboardCard` with aggregate balance display

### Phase 6: Squad Dashboard Redesign
**Rationale:** Dashboard is assembled last from pre-built, independently verified cards. Layout integration phase — lowest implementation risk, highest navigation risk.
**Delivers:** `SquadDashboardScreen`, `FriendRowCompact`, full rewrite of `squad.tsx`, deletion of `SquadTabSwitcher.tsx`, all squad sub-routes wired
**Avoids:** FlatList/ScrollView nesting (Pitfall 4), tab file restructure breaking badge (Pitfall 7 — audit all `router.push('/squad')` first), parallel fetch hooks (use consolidated `useSquadDashboard()` with `Promise.all()`)

### Phase Ordering Rationale

- Migrations are the hard prerequisite: schema decisions are irreversible
- Birthday before IOU: simpler read-only feature validates the RPC pattern with less risk
- IOU create/detail before IOU list: cannot display a list without data; testing requires the create flow
- Dashboard last: depends on all cards existing and working independently; minimizes integration blast radius
- Each feature ships its own screen before its dashboard card is added — incremental, verifiable progress

### Research Flags

Phases with standard patterns (skip deep research):
- **Phase 1 (Migrations):** RLS patterns, SECURITY DEFINER RPCs, integer-cents storage all documented in codebase precedent and PITFALLS.md
- **Phase 2 (Birthday profile field):** Single file edit, existing form patterns
- **Phase 3 (Birthday calendar):** Read-only feature; on-device notification scheduling already done in v1.3
- **Phase 5 (IOU list/summary):** Follows existing list screen patterns exactly
- **Phase 6 (Squad dashboard):** Layout reorganization; patterns established

Phases warranting deeper planning attention:
- **Phase 4 (IOU create/detail):** Most complex business logic in v1.4. The `create_expense()` RPC, even/custom split UX, and settlement RLS interaction deserve careful spec review before implementation. Write a PLAN doc before executing.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct read of `package.json`; Hermes Intl confirmed for Expo SDK 55; flash-calendar Expo compatibility verified via Expo blog |
| Features | MEDIUM | IOU and birthday patterns stable across Splitwise/Venmo; Campfire-specific tradeoffs (no payment, small groups) derived from first principles |
| Architecture | HIGH | Follows existing codebase conventions exactly; RPC patterns mirror `get_friends()`; navigation follows `src/app/friends/` precedent |
| Pitfalls | HIGH | Float/money storage verified via official Postgres docs; RLS recursion is a known project precedent with an existing fix; FlatList/ScrollView is a documented React Native warning |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Feb 29 birthday handling:** `make_date` errors for leap-day birthdays in non-leap years. Normalize Feb 29 → Feb 28 at insert time in client validation. Needs explicit test case during Phase 2.
- **`plans.iou_notes` field disposition:** PITFALLS.md recommends renaming to `general_notes`; must happen in Phase 1 migration. Decide and document before writing `0015_iou_groups.sql`.
- **IOU settlement UX copy:** Settlement is manual (no money moves). Copy must set correct expectation. Flag for UI spec in Phase 4.
- **Dashboard scroll architecture:** ARCHITECTURE.md proposes horizontal friends bar + vertical card stack. PITFALLS.md mandates single outer FlatList. These are compatible but the exact structure needs explicit layout decision in the Phase 6 PLAN.

## Sources

### Primary (HIGH confidence)
- Direct read of `/Users/iulian/Develop/campfire/package.json` — installed dependencies confirmed
- Supabase official docs — RLS performance, `(SELECT auth.uid())` optimization
- PostgreSQL docs — `DATE` vs `TIMESTAMPTZ` semantics
- Crunchy Data blog — working with money in Postgres (integer cents)
- Campfire codebase `0004_fix_plan_members_rls_recursion.sql` — SECURITY DEFINER precedent
- Expo blog — flash-calendar Expo Go compatibility confirmed

### Secondary (MEDIUM confidence)
- Splitwise Wikipedia / system design articles — IOU data model
- React Native community — FlatList-inside-ScrollView Android behavior
- Expo Router docs — file-based routing, nested navigators
- Marmelab blog (Dec 2025) — supabase-js has no transaction support
- Modern Treasury blog — floats don't work for storing cents

### Tertiary (MEDIUM — community consensus)
- npm search — confirmed no mature Expo Go-compatible expense-splitting library exists
- Birthday UX case studies — month+day only (no year) is the correct UX pattern

---
*Research completed: 2026-04-11*
*Ready for roadmap: yes*
