# Architecture: v1.4 Squad Dashboard & Social Tools

**Project:** Campfire v1.4
**Researched:** 2026-04-11
**Scope:** IOU expense splitting, birthday calendar, Squad dashboard redesign

---

## Existing Architecture Baseline

### File-system conventions (established)

- `src/app/(tabs)/` — Expo Router tab screens (one file per tab)
- `src/screens/` — Full screen components rendered by app/ route files
- `src/components/<domain>/` — Domain-bucketed presentational components
- `src/hooks/use<Feature>.ts` — Data hooks; direct Supabase queries, no shared cache layer
- `src/stores/use<Name>Store.ts` — Zustand, ephemeral UI state only (never server data)
- `src/types/app.ts` — All shared TypeScript types

### Existing tables (migrations 0001–0014)

```
profiles          id, username, display_name, avatar_url, created_at, updated_at
friendships       id, requester_id, addressee_id, status, created_at, updated_at
statuses          user_id, status, context_tag, updated_at
plans             id, created_by, title, scheduled_for, location, link_dump,
                  iou_notes, cover_image_url, created_at, updated_at
plan_members      plan_id, user_id, rsvp, joined_at
dm_channels       id, user_a, user_b, created_at
messages          id, plan_id|dm_channel_id, sender_id, body, created_at
push_tokens       (push token lifecycle)
free_notifications_sent  (rate-limit table)
squad_streaks     (streak tracking)
nudges            (nudge tracking)
```

Established patterns (must be followed in new migrations):
- SECURITY DEFINER RPCs for cross-table queries that would cause RLS recursion
- `least()/greatest()` canonical pairs for symmetric relationships
- `update_updated_at()` trigger reused on every table with `updated_at`
- All hooks call Supabase directly — no abstraction layer, no shared cache
- Stores hold only ephemeral UI state, never server data
- RLS enabled on every table immediately after CREATE TABLE
- `(SELECT auth.uid())` — not bare `auth.uid()` — in all policy predicates

---

## Feature 1: Squad Dashboard Redesign

### What changes

The current `squad.tsx` renders a `SquadTabSwitcher` (Friends | Goals tabs) and conditionally mounts `FriendsList` or `StreakCard`. v1.4 replaces the tab switcher with a single scrollable dashboard.

### New layout structure

```
Squad tab (squad.tsx)
  SquadDashboardScreen
    ScrollView (full-screen)
      FriendsBar                (horizontal avatar+name scroll)
      StreakCard                (existing component, unchanged)
      IOUDashboardCard          (new — net balance summary + "View all" tap)
      BirthdayDashboardCard     (new — next birthday + "View all" tap)
```

The tab switcher (`SquadTabSwitcher.tsx`) is removed. The Goals concept dissolves into feature cards within the dashboard.

### Modified files

| File | Change |
|------|--------|
| `src/app/(tabs)/squad.tsx` | Full rewrite: remove tab state, mount `SquadDashboardScreen` |

### Deleted files

| File | Reason |
|------|--------|
| `src/components/squad/SquadTabSwitcher.tsx` | No longer needed |

### New files

| File | Purpose |
|------|---------|
| `src/screens/squad/SquadDashboardScreen.tsx` | Owns scroll + all section hook instances, passes data to cards |
| `src/components/squad/FriendRowCompact.tsx` | Horizontal-scroll avatar+name chip for friends bar |
| `src/components/squad/IOUDashboardCard.tsx` | Summary card: net balance display, taps to IOU list |
| `src/components/squad/BirthdayDashboardCard.tsx` | Summary card: next birthday name+date, taps to birthday list |

### Data ownership

`SquadDashboardScreen` is the single owner of all hooks:
- `useFriends()` — friends bar (existing hook, already written)
- `useStreakData()` — streak card (existing hook, already written)
- `useIOUSummary()` — IOU summary (new hook, see Feature 2)
- `useUpcomingBirthdays()` — birthday card (new hook, see Feature 3)

Data flows down as props. No new Zustand stores needed.

---

## Feature 2: IOU Expense Splitting

### Data model

**New migration: `0015_iou_groups.sql`**

```sql
-- An IOU group represents one expense split event.
-- Not plan-scoped — this is a squad-level feature.
CREATE TABLE public.iou_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount > 0),
  currency     text NOT NULL DEFAULT 'USD',
  split_mode   text NOT NULL DEFAULT 'even'
               CHECK (split_mode IN ('even', 'custom')),
  settled      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.iou_groups ENABLE ROW LEVEL SECURITY;

-- One row per participant.
-- amount_owed = what this person owes to the payer (creator).
-- amount_owed = 0 for the creator (they paid, owe nothing to themselves).
CREATE TABLE public.iou_members (
  iou_group_id  uuid NOT NULL REFERENCES public.iou_groups(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_owed   numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount_owed >= 0),
  settled       boolean NOT NULL DEFAULT false,
  PRIMARY KEY (iou_group_id, user_id)
);
ALTER TABLE public.iou_members ENABLE ROW LEVEL SECURITY;
```

**RLS policies:**

```
iou_groups  SELECT: EXISTS (iou_members where iou_group_id = id AND user_id = auth.uid())
iou_groups  INSERT: created_by = (SELECT auth.uid())
iou_groups  UPDATE: created_by = (SELECT auth.uid())  -- only creator edits title/amount/settled
iou_members SELECT: EXISTS (same subquery as above — any member sees all members of their groups)
iou_members UPDATE: user_id = (SELECT auth.uid())     -- own settled flag only
```

**Triggers:**
- `update_updated_at` on `iou_groups` (reuse existing function — no new function needed)
- No auto-settle trigger: mark `iou_groups.settled` manually (creator action). Automatic settling adds trigger complexity for marginal UX gain.

**RPC: `get_iou_summary()`** — SECURITY DEFINER required because the SELECT policy on `iou_groups` uses an `iou_members` subquery, and a view would cause RLS recursion in the same way `get_friends()` was needed.

```sql
-- Returns one row per group the caller is a member of.
-- net_balance > 0: caller is owed money (they are the creator/payer).
-- net_balance < 0: caller owes money.
-- net_balance = 0: caller's row has amount_owed = 0 and they are the payer.
CREATE OR REPLACE FUNCTION public.get_iou_summary()
RETURNS TABLE (
  iou_group_id  uuid,
  title         text,
  total_amount  numeric,
  currency      text,
  net_balance   numeric,
  settled       boolean,
  created_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    g.id AS iou_group_id,
    g.title,
    g.total_amount,
    g.currency,
    -- If caller is creator: what others owe them (sum of others' amounts_owed)
    -- If caller is participant: negative of their own amount_owed
    CASE
      WHEN g.created_by = (SELECT auth.uid()) THEN
        COALESCE((
          SELECT SUM(m2.amount_owed)
          FROM public.iou_members m2
          WHERE m2.iou_group_id = g.id
            AND m2.user_id <> (SELECT auth.uid())
            AND NOT m2.settled
        ), 0)
      ELSE
        -m.amount_owed
    END AS net_balance,
    g.settled,
    g.created_at
  FROM public.iou_groups g
  JOIN public.iou_members m ON m.iou_group_id = g.id AND m.user_id = (SELECT auth.uid())
  ORDER BY g.created_at DESC;
$$;
```

**Indexes:**
```sql
CREATE INDEX idx_iou_members_user ON public.iou_members(user_id);
CREATE INDEX idx_iou_members_group ON public.iou_members(iou_group_id);
CREATE INDEX idx_iou_groups_created_by ON public.iou_groups(created_by);
```

### Hooks: new

| Hook | Returns | Source |
|------|---------|--------|
| `useIOUSummary()` | `{ totalOwed, totalOwing, groups[], loading, error, refetch }` | `get_iou_summary()` RPC |
| `useIOUDetail(groupId: string)` | `{ group, members[], loading, error, refetch }` | Direct table + join query |

`useIOUSummary` is consumed by `SquadDashboardScreen` for `IOUDashboardCard`.
`useIOUDetail` is consumed by the IOU detail screen.

Neither hook uses Realtime — IOU writes are low-frequency, pull-to-refresh is sufficient.

### Screens: new

| Route | File | Purpose |
|-------|------|---------|
| `/squad/ious` | `src/app/squad/ious/index.tsx` | FlatList of all IOUs with net balance per group |
| `/squad/ious/[id]` | `src/app/squad/ious/[id].tsx` | Group detail: members, amounts, settle actions |
| `/squad/ious/create` | `src/app/squad/ious/create.tsx` | Create IOU: title, amount, split mode, members |

These are stack routes under `src/app/squad/` — same pattern as `src/app/friends/`.

```
src/app/squad/
  ious/
    _layout.tsx    (Stack layout)
    index.tsx
    [id].tsx
    create.tsx
```

### Components: new

| Component | File | Purpose |
|-----------|------|---------|
| `IOUDashboardCard` | `src/components/squad/IOUDashboardCard.tsx` | Summary on dashboard: "You're owed $X / You owe $Y" |
| `IOUGroupRow` | `src/components/squad/IOUGroupRow.tsx` | FlatList row: title, net balance, settled badge |
| `IOUMemberRow` | `src/components/squad/IOUMemberRow.tsx` | Detail row: avatar, name, amount, settle toggle |
| `IOUSplitField` | `src/components/squad/IOUSplitField.tsx` | Amount input + split mode toggle (even/custom) during create |

### Interaction patterns

**Creating an IOU:**
1. Creator picks friends from `useFriends()` result (checkbox list — reuse `AvatarCircle`)
2. Enters total amount and title
3. Chooses split mode (even or custom per-person)
4. On submit: INSERT `iou_groups`, then INSERT `iou_members` for each person in a single transaction (wrap in RPC or sequential inserts with error handling)
5. Dashboard refetches on screen focus via `useCallback` + `useFocusEffect` (same pattern as existing screens)

**Even split calculation:** `total_amount / participant_count`, rounded to 2 decimal places. Any cent remainder (from rounding) is absorbed by the creator's own row (displayed as $0.00 owed since they paid). Calculate on client, store computed values in `amount_owed`.

**Custom split:** Creator enters each person's amount. Client validates that the sum equals `total_amount` before submit. Show inline error if mismatch.

**Settling:** Each member can mark their own `iou_members.settled = true` (UPDATE on own row). Creator can mark `iou_groups.settled = true` to close the whole group. No payment processing — manual acknowledgment only.

### IOU and existing `iou_notes` field

The current `plans.iou_notes` free-text field in `PlanDashboardScreen` is not replaced. It remains as-is. Structured IOUs are squad-level, not plan-scoped. Both coexist; no migration to `iou_notes` is needed.

---

## Feature 3: Birthday Calendar

### Data model

**New migration: `0016_birthdays.sql`**

```sql
-- Birthday stored as month + day only.
-- Year is optional and private (not exposed to friends — no age disclosure).
ALTER TABLE public.profiles
  ADD COLUMN birthday_month smallint CHECK (birthday_month BETWEEN 1 AND 12),
  ADD COLUMN birthday_day   smallint CHECK (birthday_day BETWEEN 1 AND 31),
  ADD COLUMN birthday_year  smallint;  -- optional, private
```

No new table. Birthday lives in `profiles`.

**Existing RLS coverage (no new policies needed):**
- `profiles_select_authenticated`: any authenticated user can read all profiles — already covers the new columns.
- `profiles_update_own`: user can only update own row — birthday columns are protected automatically.
- `birthday_year` is readable by friends (same policy), but the UI never displays it to them — it is for potential future "age" features. If privacy is a concern, `birthday_year` can be excluded from any RPC that fans data to friends.

**RPC: `get_upcoming_birthdays(days_ahead int DEFAULT 30)`** — SECURITY DEFINER because it joins `profiles` (public, fine) with `friendships` (would cause RLS recursion if done in a view).

```sql
-- Returns friends whose birthday (month+day only) falls within the next N days.
-- Handles year wrap-around (Dec 25 to Jan 3 is 9 days, not 351 days).
CREATE OR REPLACE FUNCTION public.get_upcoming_birthdays(days_ahead int DEFAULT 30)
RETURNS TABLE (
  friend_id      uuid,
  display_name   text,
  avatar_url     text,
  birthday_month smallint,
  birthday_day   smallint,
  days_until     int
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH friends AS (
    SELECT
      CASE WHEN f.requester_id = (SELECT auth.uid()) THEN f.addressee_id
           ELSE f.requester_id END AS friend_id
    FROM public.friendships f
    WHERE (f.requester_id = (SELECT auth.uid()) OR f.addressee_id = (SELECT auth.uid()))
      AND f.status = 'accepted'
  ),
  birthday_dates AS (
    SELECT
      p.id AS friend_id,
      p.display_name,
      p.avatar_url,
      p.birthday_month,
      p.birthday_day,
      -- This year's birthday
      make_date(EXTRACT(YEAR FROM now())::int, p.birthday_month, p.birthday_day) AS this_year_bday
    FROM public.profiles p
    JOIN friends f ON f.friend_id = p.id
    WHERE p.birthday_month IS NOT NULL AND p.birthday_day IS NOT NULL
  )
  SELECT
    friend_id,
    display_name,
    avatar_url,
    birthday_month,
    birthday_day,
    -- If this year's birthday already passed, use next year's
    CASE
      WHEN this_year_bday >= CURRENT_DATE THEN (this_year_bday - CURRENT_DATE)
      ELSE (make_date(EXTRACT(YEAR FROM now())::int + 1, birthday_month, birthday_day) - CURRENT_DATE)
    END AS days_until
  FROM birthday_dates
  WHERE
    CASE
      WHEN this_year_bday >= CURRENT_DATE THEN (this_year_bday - CURRENT_DATE)
      ELSE (make_date(EXTRACT(YEAR FROM now())::int + 1, birthday_month, birthday_day) - CURRENT_DATE)
    END <= days_ahead
  ORDER BY days_until ASC;
$$;
```

Note: `make_date` with Feb 29 birthdays in non-leap years will error. Handle this with a `EXCEPTION WHEN` block or by normalizing Feb 29 → Feb 28 at insert time (simpler: restrict `birthday_day` to 28 if `birthday_month = 2` in client validation).

### Hooks: new

| Hook | Returns | Source |
|------|---------|--------|
| `useUpcomingBirthdays(daysAhead?: number)` | `{ birthdays[], loading, error, refetch }` | `get_upcoming_birthdays()` RPC |

### Screens: new

| Route | File | Purpose |
|-------|------|---------|
| `/squad/birthdays` | `src/app/squad/birthdays/index.tsx` | Full birthday list, chronological (days until) |

### Components: new

| Component | File | Purpose |
|-----------|------|---------|
| `BirthdayDashboardCard` | `src/components/squad/BirthdayDashboardCard.tsx` | Shows next 1–2 birthdays on dashboard |
| `BirthdayRow` | `src/components/squad/BirthdayRow.tsx` | FlatList row: avatar, name, "Month Day" or "Today!" |

### Profile edit integration

Birthday is added to `src/app/profile/edit.tsx`:
- Month (1–12) and Day (1–31) number inputs, clearly labeled
- Optional — user can clear by setting both to null
- No birth year field in the UI (omit to avoid age disclosure)
- Save writes `birthday_month` and `birthday_day` to `profiles` alongside existing `display_name` + `avatar_url` updates
- `FormField` from `src/components/common/FormField.tsx` handles the input wrapper

**Modified file:** `src/app/profile/edit.tsx` — add birthday month/day fields below display name section. No new component needed.

---

## Navigation Integration

### New route directories

Expo Router file-based routing. Follows the same pattern as `src/app/friends/`.

```
src/app/squad/
  ious/
    _layout.tsx      Stack layout for IOU sub-routes
    index.tsx        IOU list
    [id].tsx         IOU detail
    create.tsx       Create IOU
  birthdays/
    index.tsx        Birthday list
```

### Tab badge

The Squad tab badge currently shows pending friend request count via `usePendingRequestsCount`. No new badge is needed for IOUs or birthdays. These are passive information features, not action items requiring a badge.

---

## Build Order

Dependencies drive order. Each stage produces something the next can consume.

**Stage 1: Database migrations (prerequisite for all client work)**

1. `0015_iou_groups.sql` — IOU tables, RLS, indexes, `get_iou_summary()` RPC
2. `0016_birthdays.sql` — Add birthday columns to profiles, `get_upcoming_birthdays()` RPC

Apply both before any client code changes. No client code depends on the other migration's order.

**Stage 2: Birthday field in Profile Edit**

- `0016_birthdays.sql` already applied (Stage 1)
- Add month/day inputs to `src/app/profile/edit.tsx`
- Verify save/load round-trip in isolation

No hooks, screens, or navigation changes required. Validates the column works before building the calendar view.

**Stage 3: Birthday calendar feature**

- `useUpcomingBirthdays()` hook
- `BirthdayRow` component
- `src/app/squad/birthdays/index.tsx` screen
- `BirthdayDashboardCard` component

**Stage 4: IOU detail and create**

- `useIOUDetail()` hook
- `IOUMemberRow`, `IOUSplitField` components
- `src/app/squad/ious/create.tsx` screen
- `src/app/squad/ious/[id].tsx` screen and `src/app/squad/ious/_layout.tsx`

**Stage 5: IOU list and summary**

- `useIOUSummary()` hook
- `IOUGroupRow` component
- `src/app/squad/ious/index.tsx` screen
- `IOUDashboardCard` component

**Stage 6: Squad Dashboard**

- `FriendRowCompact` component
- `SquadDashboardScreen`
- Rewrite `src/app/(tabs)/squad.tsx` to mount `SquadDashboardScreen`
- Delete `SquadTabSwitcher.tsx`

The dashboard is assembled last from pre-built, independently tested cards. This minimises integration risk: every card works standalone before the dashboard wires them together.

---

## Component Boundaries Summary

| Component | Props In | Navigation Out |
|-----------|----------|----------------|
| `SquadDashboardScreen` | — (owns all hooks) | — |
| `FriendRowCompact` | `friend: FriendWithStatus` | tap → DM (existing pattern) |
| `StreakCard` | `streak: StreakData` (existing shape — unchanged) | tap → /plan-create |
| `IOUDashboardCard` | `totalOwed`, `totalOwing`, `onPress` | tap → /squad/ious |
| `BirthdayDashboardCard` | `birthdays: UpcomingBirthday[]`, `onPress` | tap → /squad/birthdays |
| `IOUGroupRow` | `group`, `netBalance`, `currency`, `settled`, `onPress` | tap → /squad/ious/[id] |
| `IOUMemberRow` | `member`, `amountOwed`, `settled`, `canSettle`, `onSettle` | settle toggle (inline) |
| `IOUSplitField` | `totalAmount`, `splitMode`, `participants`, `onChange` | — |
| `BirthdayRow` | `friendId`, `displayName`, `avatarUrl`, `month`, `day`, `daysUntil` | — |

---

## Modified Files Summary

| File | Change Type | Reason |
|------|-------------|--------|
| `src/app/(tabs)/squad.tsx` | Full rewrite | Replace tab switcher with dashboard screen |
| `src/app/profile/edit.tsx` | Add fields | birthday_month + birthday_day inputs |
| `src/components/squad/SquadTabSwitcher.tsx` | Delete | Superseded by scrollable dashboard |

---

## New Files Summary

**Database migrations**
- `supabase/migrations/0015_iou_groups.sql`
- `supabase/migrations/0016_birthdays.sql`

**Hooks**
- `src/hooks/useIOUSummary.ts`
- `src/hooks/useIOUDetail.ts`
- `src/hooks/useUpcomingBirthdays.ts`

**Screens**
- `src/screens/squad/SquadDashboardScreen.tsx`
- `src/screens/squad/IOUListScreen.tsx`
- `src/screens/squad/IOUDetailScreen.tsx`
- `src/screens/squad/IOUCreateScreen.tsx`
- `src/screens/squad/BirthdayListScreen.tsx`

**App routes (Expo Router)**
- `src/app/squad/ious/_layout.tsx`
- `src/app/squad/ious/index.tsx`
- `src/app/squad/ious/[id].tsx`
- `src/app/squad/ious/create.tsx`
- `src/app/squad/birthdays/index.tsx`

**Components**
- `src/components/squad/FriendRowCompact.tsx`
- `src/components/squad/IOUDashboardCard.tsx`
- `src/components/squad/IOUGroupRow.tsx`
- `src/components/squad/IOUMemberRow.tsx`
- `src/components/squad/IOUSplitField.tsx`
- `src/components/squad/BirthdayDashboardCard.tsx`
- `src/components/squad/BirthdayRow.tsx`

---

## Constraints Adherence

| Constraint | How v1.4 Features Comply |
|------------|--------------------------|
| FlatList for all lists | IOU list, IOU member list, birthday list all use FlatList |
| No UI libraries | All new components use StyleSheet + design tokens only |
| RLS is security | All new tables have RLS enabled; client never relies on client-side filtering |
| UUIDs everywhere | `iou_groups.id` UUID PK; `iou_members` uses composite PK (no integer IDs) |
| SECURITY DEFINER RPCs | `get_iou_summary()` and `get_upcoming_birthdays()` use SECURITY DEFINER to avoid RLS recursion when joining friendships |
| Free tier budget | No new Realtime subscriptions; IOU writes are low-frequency; birthday columns are negligible storage |
| TypeScript strict | New types (`UpcomingBirthday`, `IOUSummaryGroup`, `IOUMember`) added to `src/types/app.ts` before use |
| No Redux / React Query | All new hooks use direct Supabase queries + local useState, same as existing hooks |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Squad Dashboard redesign | HIGH | Existing squad.tsx is simple; StreakCard already card-shaped; clear precedent |
| IOU data model | HIGH | Standard split-bill schema; follows established migration conventions exactly |
| Birthday data model | HIGH | Simple column addition; existing RLS already covers it; verified against 0001_init.sql |
| `get_iou_summary()` RPC | HIGH | Pattern mirrors `get_friends()` exactly; net balance logic is straightforward SQL |
| `get_upcoming_birthdays()` RPC | MEDIUM | Year-wrap-around arithmetic is correct conceptually; Feb 29 edge case needs explicit handling; test with Dec/Jan boundary before shipping |
| IOU even-split rounding | MEDIUM | Client-side; deterministic if rule ("remainder to creator") is documented and consistently applied |
| Navigation (squad/ sub-routes) | HIGH | Follows `src/app/friends/` pattern exactly; no unknowns |
