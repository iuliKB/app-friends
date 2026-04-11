# Technology Stack — v1.4 Squad Dashboard & Social Tools

**Project:** Campfire
**Milestone:** v1.4 — Squad dashboard redesign, IOU expense splitting, birthday calendar
**Researched:** 2026-04-11
**Scope:** ONLY additions/changes for v1.4. Existing stack (React Native 0.83.2, Expo SDK 55, Supabase, Zustand, TypeScript strict, Reanimated 4.2.1, Gesture Handler ~2.30.0) is locked and NOT re-researched.

---

## TL;DR

**Zero new npm dependencies required.** All three v1.4 features are buildable with the existing stack:

- **Squad dashboard redesign** — pure layout change using existing `FlatList`, `ScrollView`, design tokens, and `Animated.View`. No new libraries.
- **IOU expense splitting** — all logic lives in Supabase (new tables + Postgres RPC functions for balance computation). Client-side is forms + lists using existing components. Currency formatting via `Intl.NumberFormat` (built into Hermes, no library needed).
- **Birthday calendar** — birthday field is a `date` column in Postgres + `@react-native-community/datetimepicker` (already installed at `8.6.0`) for the date picker in profile editing. Upcoming birthdays list is a SQL query sorted by day-of-year offset — no calendar UI component needed.

If a scrollable calendar grid is wanted for the birthday list screen (not confirmed by PRD), `@marceloterreiro/flash-calendar` (`^1.3.0`) is the correct choice — pure JS, no native modules, Expo Go compatible, Expo-endorsed. Add it only if the birthday list screen requires a month-grid view.

---

## Already Installed — Use These

Verified from `/Users/iulian/Develop/campfire/package.json` (Expo SDK 55):

| Package | Version | v1.4 Usage |
|---------|---------|------------|
| `@react-native-community/datetimepicker` | `8.6.0` | Birthday date picker in profile edit — already installed, no new dependency |
| `react-native-reanimated` | `4.2.1` | Feature card entrance animations on dashboard (optional polish) |
| `@supabase/supabase-js` | `^2.99.2` | All IOU and birthday data — new tables queried via existing client |
| `zustand` | `^5.0.12` | IOU store slice (expenses list, balances, loading/error state) |
| `expo-haptics` | `~55.0.9` | Settle confirmation feedback |

---

## New Dependencies

**None required.** See rationale below for each feature.

### If Birthday List Screen Needs a Month-Grid Calendar View (Conditional)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@marceloterreiro/flash-calendar` | `^1.3.0` | Month-grid calendar with marked birthday dates | Pure JS — no native modules. Works in Expo Go. Ships with only one tiny event-emitter dependency. Expo-endorsed (blog post on expo.dev). Better performance than `react-native-calendars` (Flash List based rendering vs full re-renders). Last published March 2026 — actively maintained. |

**Only install this if the birthday list screen has a month-grid layout.** A sorted list of upcoming birthdays (simpler and arguably better UX for a small friend group of 3–15) needs no calendar library at all — a `FlatList` with date headers is sufficient.

```bash
npx expo install @marceloterreiro/flash-calendar
```

**Confidence: MEDIUM** — Expo Go compatibility confirmed via Expo blog and library author (pure JS, no native code). Version 1.3.0 confirmed active as of March 2026. Hermes `Intl` requirement noted — app already runs on Hermes (Expo SDK 55 default), so this is a non-issue.

---

## The Non-Decisions That Matter

### No dedicated IOU/expense library

There is no mature, Expo Go-compatible library for expense splitting logic. Nor is one needed. The splitting math is simple arithmetic:

- **Even split:** `amount / participant_count` (round to 2 decimal places; assign remainder to payer)
- **Custom split:** UI collects per-person amounts; validate they sum to total before saving

This logic belongs in a Postgres RPC function (`calculate_balances`) and in a ~40-line TypeScript utility for client-side validation. A library would add a dependency with no reduction in code complexity.

### No currency formatting library

`Intl.NumberFormat` is built into Hermes (Expo SDK 55 default JS engine). Currency display is:

```typescript
const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
```

No library needed. HIGH confidence — Hermes has shipped `Intl` support since RN 0.70.

### No calendar sync / device calendar

`expo-calendar` requires permissions and native code — it is for reading/writing the device system calendar. This feature is explicitly out of scope for v1.4. Birthday calendar is an in-app list only.

### No debt simplification algorithm

Splitwise-style "minimize number of transactions" is algorithmically complex (NP-hard in the general case) and confusing for small groups. For 3–15 friends, show raw pairwise balances. "Settle up" records a manual payment and updates the balance. This is a deliberate product decision — do not over-engineer.

---

## Supabase Schema Additions (v1.4)

These are the database changes needed. No new npm packages. All query via existing `@supabase/supabase-js`.

### IOU Tables

```sql
-- Migration 0015
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  UUID NOT NULL REFERENCES profiles(id),
  title       TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
  split_type  TEXT NOT NULL CHECK (split_type IN ('even', 'custom')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expense_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  owed_amount NUMERIC(10,2) NOT NULL CHECK (owed_amount >= 0),
  is_payer    BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE iou_settlements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user   UUID NOT NULL REFERENCES profiles(id),
  to_user     UUID NOT NULL REFERENCES profiles(id),
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  settled_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Key constraints:
- RLS on all three tables: users see only rows where they are a participant, creator, or friend (consistent with existing friend-system RLS pattern)
- `expense_participants.owed_amount` values must sum to `expenses.total_amount` — enforce via Postgres trigger or RPC validation
- Payer is always a participant with `is_payer = true`; their `owed_amount` represents what others owe them, not what they owe themselves

### Balance Computation

Expose a `get_group_balances(viewer_id UUID)` RPC that returns net balances between the viewer and each friend. Client calls this instead of computing in JS — keeps arithmetic server-side with proper NUMERIC precision.

```sql
-- Returns rows: { friend_id, friend_name, net_amount }
-- Positive = friend owes viewer. Negative = viewer owes friend.
CREATE OR REPLACE FUNCTION get_group_balances(viewer_id UUID)
RETURNS TABLE (friend_id UUID, display_name TEXT, net_amount NUMERIC) ...
```

### Birthday Field

```sql
-- Migration 0016 (or add to 0015)
ALTER TABLE profiles ADD COLUMN birthday DATE;
```

- Type `DATE` (not `TIMESTAMPTZ`) — no time zone ambiguity for birthdays
- Nullable — users opt into sharing
- RLS: friends can read `birthday`; user can read/write their own

### Upcoming Birthdays Query

No library needed. Sort by day-of-year offset from today:

```sql
SELECT id, display_name, avatar_url, birthday,
       date_part('day', birthday - current_date) AS days_until
FROM profiles
WHERE id IN (SELECT friend_id FROM friendships WHERE user_id = $viewer_id)
  AND birthday IS NOT NULL
ORDER BY MOD(
  date_part('doy', birthday)::int - date_part('doy', current_date)::int + 365, 365
);
```

Expose as a `get_upcoming_birthdays(viewer_id UUID)` RPC.

---

## State Management (Zustand)

Add two new store slices — consistent with existing pattern:

| Slice | State | Actions |
|-------|-------|---------|
| `useIouStore` | `expenses`, `balances`, `loading`, `error` | `fetchExpenses`, `createExpense`, `settleUp` |
| `useBirthdayStore` | `upcomingBirthdays`, `loading` | `fetchUpcomingBirthdays` |

Birthday data is read-only on the dashboard card — no optimistic updates needed. IOU `createExpense` can use optimistic update if desired (append to list, rollback on error) but is not required for MVP.

---

## Squad Dashboard Redesign

This is a layout and navigation change — no new libraries:

- Replace underline tab switcher with a vertically scrollable screen (`FlatList` or `ScrollView`)
- Top section: friends list (existing `FriendListItem` components)
- Below: feature cards (Streaks, IOUs, Birthdays) as tappable rows navigating to sub-screens
- Card entrance animations (optional): `Reanimated.FadeInDown` or `withTiming` on mount — existing Reanimated installation covers this

---

## What NOT to Install

| Avoid | Why |
|-------|-----|
| `react-native-calendars` | Heavier than Flash Calendar; historically had Expo Go issues (some native code paths); inferior performance (re-renders full calendar). If a calendar grid is needed, use Flash Calendar. |
| `expo-calendar` | Reads/writes device system calendar — out of scope. Requires permissions popup. |
| Any dedicated "expense splitting" library | None exist that are Expo Go-compatible and mature. Logic is trivial arithmetic that belongs in Postgres. |
| `react-native-format-currency` | Unnecessary when Hermes ships `Intl.NumberFormat`. Adds a dependency to replace a one-liner. |
| `react-native-date-picker` | Requires native code — incompatible with Expo Go managed workflow. `@react-native-community/datetimepicker` (already installed) handles birthday date selection. |
| `moment` / `date-fns` | Overkill for birthday day-of-year offset math. The SQL query handles sorting server-side. Client only formats display strings via `Intl.DateTimeFormat`. |

---

## Installation (if flash-calendar is needed)

```bash
# Only if birthday list screen uses a month-grid calendar view
npx expo install @marceloterreiro/flash-calendar
```

For all other v1.4 features: no `npm install` or `expo install` required.

---

## Sources

| Claim | Source | Confidence |
|-------|--------|------------|
| `@react-native-community/datetimepicker 8.6.0` already installed | Direct read of `/Users/iulian/Develop/campfire/package.json` | HIGH |
| Expo SDK 55 uses Hermes by default; Hermes ships `Intl.NumberFormat` | Training data, confirmed in Expo SDK 53+ changelogs | HIGH |
| `@marceloterreiro/flash-calendar` is pure JS, no native modules, Expo Go compatible | [Expo blog post](https://expo.dev/blog/build-fast-flexible-calendars-in-react-native-with-flash-calendar), WebFetch verification | HIGH |
| Flash Calendar v1.3.0 last published March 2026, actively maintained | npm search result (March 2026) | MEDIUM |
| `react-native-calendars` — historical Expo Go compatibility issues | WebSearch + library docs noting "no native module linking required" but also caveats about Expo Go | MEDIUM — inconsistent claims across sources; Flash Calendar is the safer choice |
| Splitwise data model: expenses table, participants table, settlements table | [System design article](https://medium.com/@riyag283/splitwise-an-lld-approach-c87e149af438) | MEDIUM |
| `MOD(doy_birthday - doy_today + 365, 365)` pattern for upcoming birthday sort | Standard PostgreSQL date arithmetic pattern | HIGH |
| No mature Expo Go-compatible IOU/expense splitting library exists | WebSearch returned no results; npm search confirms no relevant packages | HIGH (absence of evidence is evidence here — the category doesn't exist) |

---

*Stack research for: v1.4 Squad Dashboard & Social Tools*
*Researched: 2026-04-11*
