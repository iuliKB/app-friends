# Phase 5: Database Migrations - Research

**Researched:** 2026-04-12
**Domain:** PostgreSQL / Supabase — schema migrations, RLS policies, SECURITY DEFINER RPCs
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Rename `plans.iou_notes` to `general_notes` in migration 0015. Update all client code references (~10 files: IOUNotesField.tsx, usePlanDetail.ts, usePlans.ts, database.ts, plans.ts, PlanDashboardScreen.tsx, seed.sql, etc.) in this phase to avoid broken references.
- **D-02:** The free-text field and structured IOU feature coexist — they serve different purposes (plan-scoped notes vs. squad-level expense tracking). The rename eliminates naming confusion.
- **D-03:** Tables named `iou_groups` and `iou_members` per roadmap convention.
- **D-04:** `create_expense()` atomic RPC creates both the `iou_groups` row and all `iou_members` rows in a single transaction.
- **D-05:** `get_iou_summary()` RPC returns per-friend net balances across all unsettled expenses.
- **D-06:** `iou_members` includes both `settled_at` (timestamptz, NULL = unsettled) and `settled_by` (uuid, FK to auth.users) columns.
- **D-07:** RLS UPDATE policy on `iou_members` restricts settlement to the expense creator only (`settled_by` must equal `iou_groups.created_by`). A debtor cannot self-certify payment.
- **D-08:** All monetary amounts stored as INTEGER cents. No float arithmetic.
- **D-09:** Even split uses largest-remainder method in `create_expense()` RPC.
- **D-10:** `profiles.birthday_month` (smallint, 1-12) and `profiles.birthday_day` (smallint, 1-31) columns. Both nullable.
- **D-11:** `get_upcoming_birthdays()` RPC returns friends sorted by next occurrence with year-wrap arithmetic.
- **D-12:** CHECK constraints enforce valid month (1-12) and day (1-31) ranges at the database level.
- **D-13:** Extend existing `seed.sql` with IOU expenses and birthday values for existing test users.
- **D-14:** Migration 0015: IOU tables, RLS policies, `create_expense()` RPC, `get_iou_summary()` RPC, and `plans.iou_notes` rename.
- **D-15:** Migration 0016: Birthday columns on `profiles`, CHECK constraints, `get_upcoming_birthdays()` RPC.

### Claude's Discretion

- Exact index strategy on `iou_groups`/`iou_members` (beyond what RLS queries require)
- RPC parameter naming and return type shapes
- Specific RLS policy naming conventions (follow existing patterns)
- CHECK constraint for valid day-in-month combinations (e.g., Feb 30)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOU-01 | User can create an expense with title, amount, and select friends to split with | `iou_groups` + `iou_members` tables + `create_expense()` atomic RPC (D-04) |
| IOU-02 | User can split an expense evenly or set custom amounts per person | `create_expense()` RPC supports both modes; even split uses largest-remainder (D-09) |
| IOU-03 | User can view net balance per friend across all expenses | `get_iou_summary()` RPC with per-friend net calculation (D-05) |
| IOU-04 | User can mark a debt as settled (manual "mark as paid") | `iou_members.settled_at` + `settled_by` columns + RLS UPDATE policy (D-06, D-07) |
| IOU-05 | User can view expense history (list of past expenses with payer, participants, amounts) | `iou_groups` rows + `iou_members` rows readable by any participant via RLS |
| BDAY-01 | User can add their birthday (month + day) to their profile, visible to friends | `profiles.birthday_month` + `profiles.birthday_day` smallint columns (D-10) |
| BDAY-02 | User can view a list of friends' birthdays sorted by next occurrence | `get_upcoming_birthdays()` RPC with year-wrap arithmetic (D-11) |
| BDAY-03 | Squad dashboard shows an upcoming birthdays card with count and nearest birthday | `get_upcoming_birthdays()` RPC — same RPC serves dashboard card and full list |

**Note:** Requirements IOU-01 through IOU-05 and BDAY-01 through BDAY-03 are the schema foundation for client features delivered in Phases 6-9. Phase 5 creates the objects; client phases wire the UI.

</phase_requirements>

---

## Summary

Phase 5 creates the Supabase schema foundation that all subsequent v1.4 client phases depend on. The work breaks into two migrations:

**Migration 0015** adds `iou_groups` and `iou_members` tables with full RLS, two SECURITY DEFINER RPCs (`create_expense()` and `get_iou_summary()`), and renames `plans.iou_notes` to `general_notes`. The column rename is done here so client code referencing the old name is updated atomically — downstream phases never see `iou_notes`.

**Migration 0016** adds `birthday_month` and `birthday_day` smallint columns to `profiles` with CHECK constraints, and a `get_upcoming_birthdays()` SECURITY DEFINER RPC that handles year-wrap arithmetic.

Both migrations follow the established project conventions exactly: SECURITY DEFINER + `SET search_path = ''`, `(SELECT auth.uid())` in all policy predicates, `gen_random_uuid()` PKs, `created_at`/`updated_at` on every table, and RLS enabled immediately after CREATE TABLE.

**Primary recommendation:** Write the migrations first against local Supabase, verify RLS smoke tests pass, then apply to remote with `supabase db push`. Update `src/types/database.ts` and all `iou_notes` references in the same plan as the migration — never leave client types out of sync with the live schema.

---

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Supabase CLI | 2.81.1 (in node_modules) | `supabase db push`, local dev | Project already uses it; `npx supabase` works |
| PostgreSQL (via Supabase) | 15.x (Supabase managed) | Schema, RLS, RPCs | No choice — Supabase backend |
| supabase-js | Project-installed | Client queries, RPC calls | Already in use across all hooks |

[VERIFIED: `npm list supabase` — version 2.81.1 installed as dev dependency]

### Key SQL Features Used
| Feature | Purpose | Confidence |
|---------|---------|------------|
| `SECURITY DEFINER` + `SET search_path = ''` | All RPCs that join across tables / bypass RLS | HIGH [VERIFIED: existing migrations 0010, 0011, 0012] |
| `(SELECT auth.uid())` in RLS predicates | Optimizer-safe constant evaluation per policy | HIGH [VERIFIED: PITFALLS.md Pitfall 3, 0001_init.sql] |
| `gen_random_uuid()` | UUID primary keys | HIGH [VERIFIED: all existing migrations] |
| `CREATE INDEX idx_{table}_{purpose}` | Index naming convention | HIGH [VERIFIED: existing migrations] |
| `GRANT EXECUTE ON FUNCTION ... TO authenticated` | Enable RPC from client | HIGH [VERIFIED: 0011_squad_streak_v1_3.sql] |
| `make_date(year, month, day)` | Year-wrap birthday arithmetic | HIGH [VERIFIED: ARCHITECTURE.md RPC example] |
| Largest-remainder integer division | Even split without cent drift | HIGH [VERIFIED: PITFALLS.md Pitfall 1 + D-09] |

---

## Architecture Patterns

### Existing Conventions (mandatory — follow exactly)

**Table creation pattern:**
```sql
-- Source: supabase/migrations/0001_init.sql
CREATE TABLE public.some_table (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.some_table ENABLE ROW LEVEL SECURITY;
```

**RLS policy predicate pattern (never bare `auth.uid()`):**
```sql
-- Source: supabase/migrations/0001_init.sql §189+
USING (created_by = (SELECT auth.uid()))
WITH CHECK (created_by = (SELECT auth.uid()))
```

**SECURITY DEFINER RPC pattern:**
```sql
-- Source: supabase/migrations/0011_squad_streak_v1_3.sql
CREATE OR REPLACE FUNCTION public.some_rpc(p_arg uuid)
RETURNS TABLE (...)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL OR v_caller <> p_arg THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  -- ... logic
END;
$$;

GRANT EXECUTE ON FUNCTION public.some_rpc(uuid) TO authenticated;
```

**Updated_at trigger reuse:**
```sql
-- Source: supabase/migrations/0001_init.sql §436-450
-- The public.update_updated_at() function already exists — just wire the trigger:
CREATE TRIGGER iou_groups_updated_at
  BEFORE UPDATE ON public.iou_groups
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
```

**Index naming:**
```sql
-- Source: supabase/migrations/0010_friend_went_free_v1_3.sql
CREATE INDEX idx_iou_members_user_id ON public.iou_members(user_id);
CREATE INDEX idx_iou_groups_created_by ON public.iou_groups(created_by);
```

---

### Pattern 1: iou_groups + iou_members Table Design

**What:** `iou_groups` is one expense event (title, total_amount_cents, created_by). `iou_members` is one row per participant including the creator (creator's `share_amount_cents` = their own cost, `settled_at` IS NOT NULL on creation because they paid).

**Design decision confirmed by D-08:** `total_amount_cents INTEGER NOT NULL` and `share_amount_cents INTEGER NOT NULL`. No floats anywhere.

**Largest-remainder even split (D-09) in `create_expense()` RPC:**
```sql
-- Source: PITFALLS.md Pitfall 1 (verified pattern)
-- n_people = array_length(p_participant_ids, 1) + 1 (include creator)
-- base_share = p_total_cents / n_people  (integer division, truncates)
-- remainder = p_total_cents - (base_share * n_people)
-- First 'remainder' participants each get base_share + 1
-- Result: SUM of all share_amount_cents == p_total_cents exactly
```

**D-07 settlement RLS — only expense creator can mark settled:**

The key insight: `iou_members` UPDATE policy cannot simply check `user_id = (SELECT auth.uid())` (that would let debtors self-certify). The policy must verify the caller is the expense creator:

```sql
-- Source: PITFALLS.md Pitfall 2 (pattern)
-- Correct pattern: cross-table check via SECURITY DEFINER helper or subquery
CREATE POLICY "iou_members_update_creator_settles"
  ON public.iou_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.iou_groups
      WHERE id = iou_group_id
        AND created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.iou_groups
      WHERE id = iou_group_id
        AND created_by = (SELECT auth.uid())
    )
  );
```

Note: This subquery references `iou_groups`, which itself has an RLS policy. This does NOT cause recursion because the subquery goes from `iou_members` → `iou_groups`, and `iou_groups` RLS goes → `iou_members`. To avoid the circular dependency, the subquery in the `iou_members` UPDATE policy should bypass `iou_groups` RLS by using the already-established `SECURITY DEFINER` helper pattern or by making the check a simple FK walk without a separate SELECT policy check. See Pitfall 3 in the pitfalls section below.

**Recommended approach:** Use a SECURITY DEFINER helper function `is_iou_group_creator(group_id uuid)` — same as the existing `is_friend_of()` pattern — to safely cross the table boundary without recursion.

---

### Pattern 2: Birthday Columns on Profiles

**What:** Two smallint columns added via ALTER TABLE, nullable, with CHECK constraints.

```sql
-- Source: supabase/migrations/0010_friend_went_free_v1_3.sql (ALTER TABLE add column pattern)
ALTER TABLE public.profiles
  ADD COLUMN birthday_month smallint CHECK (birthday_month BETWEEN 1 AND 12),
  ADD COLUMN birthday_day   smallint CHECK (birthday_day BETWEEN 1 AND 31);
```

**Existing RLS coverage:** The `profiles_select_authenticated` policy (0001_init.sql) already allows any authenticated user to read all profile columns. Birthday data will be readable by any authenticated user via direct table query, but the `get_upcoming_birthdays()` RPC restricts to friends only. This is the pattern established by PITFALLS.md Pitfall 9 — "never expose raw birthday column to all authenticated users" via direct query; use the RPC.

**D-12 caveat — day-in-month validation:** `CHECK (birthday_day BETWEEN 1 AND 31)` accepts Feb 30, Apr 31, etc. The CONTEXT.md leaves this to Claude's discretion. Two approaches:

1. Accept 1-31 at DB level; validate correct day-for-month in client + RPC
2. Add a compound CHECK: `CHECK (birthday_day BETWEEN 1 AND CASE WHEN birthday_month IN (4,6,9,11) THEN 30 WHEN birthday_month = 2 THEN 29 ELSE 31 END)`

**Recommendation:** Use approach 2 (DB-level compound CHECK). It catches invalid data at the write boundary regardless of client. Feb 29 is allowed (leap years exist), with the `make_date()` RPC using a `EXCEPTION WHEN invalid_datetime` handler to gracefully handle non-leap-year rendering. [ASSUMED — no official Supabase docs state preference; this is a standard PostgreSQL pattern]

---

### Pattern 3: get_upcoming_birthdays() Year-Wrap Arithmetic

The ARCHITECTURE.md already contains a verified RPC template. Key subtlety: `make_date(year, month, day)` raises `ERROR: date field value out of range` for Feb 29 in a non-leap year. The RPC must handle this:

```sql
-- Source: ARCHITECTURE.md §Feature 3 — verified pattern with caveat noted
-- Wrap make_date in a helper or use CASE to substitute Feb 28 for Feb 29 in non-leap years:
CASE
  WHEN birthday_month = 2 AND birthday_day = 29
       AND NOT (EXTRACT(year FROM now())::int % 4 = 0)
  THEN make_date(EXTRACT(year FROM now())::int, 2, 28)
  ELSE make_date(EXTRACT(year FROM now())::int, birthday_month, birthday_day)
END AS this_year_bday
```

---

### Pattern 4: iou_notes → general_notes Column Rename

PostgreSQL `ALTER TABLE ... RENAME COLUMN` is non-destructive: existing data is preserved, existing rows get the new column name. This is the correct approach (not DROP + ADD which would lose data).

```sql
-- Source: PostgreSQL documentation [VERIFIED via project pattern in 0010]
ALTER TABLE public.plans
  RENAME COLUMN iou_notes TO general_notes;
```

**All 8 client touch points that reference `iou_notes`** (verified by codebase grep):

| File | Change |
|------|--------|
| `supabase/seed.sql` (2 INSERT statements) | `iou_notes` → `general_notes` in column list |
| `src/types/database.ts` (Row, Insert, Update shapes for `plans`) | Field name `iou_notes` → `general_notes` in all 3 shapes |
| `src/types/plans.ts` | `iou_notes: string \| null` → `general_notes: string \| null` in `Plan` interface |
| `src/hooks/usePlanDetail.ts` line 87 | `iou_notes: planRow.iou_notes` → `general_notes: planRow.general_notes` |
| `src/hooks/usePlans.ts` line 135 | `iou_notes: p.iou_notes` → `general_notes: p.general_notes` |
| `src/components/plans/IOUNotesField.tsx` line 34 | `.update({ iou_notes: ... })` → `.update({ general_notes: ... })` |
| `src/screens/plans/PlanDashboardScreen.tsx` line 354 | `initialValue={plan.iou_notes}` → `initialValue={plan.general_notes}` |

[VERIFIED: codebase grep confirmed all 8 locations above]

---

### Recommended Project Structure (Migration Files)

```
supabase/migrations/
├── 0015_iou_v1_4.sql        # iou_groups, iou_members, RPCs, iou_notes rename
└── 0016_birthdays_v1_4.sql  # profiles birthday columns, get_upcoming_birthdays RPC
```

Both migrations are self-contained. 0016 does not depend on 0015 beyond both applying before any client code runs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table insert | Chained `.from().insert()` calls | `create_expense()` PostgreSQL RPC | supabase-js has no transaction support; network drop between two inserts creates orphan iou_groups rows |
| Even-split cent arithmetic | JS `Math.round(total / n)` | Largest-remainder in the RPC | Float rounding in JS produces totals that are ±1 cent; DB integer arithmetic is exact |
| Balance aggregation | Client-side `Array.reduce()` over fetched rows | `get_iou_summary()` RPC | Read-after-write consistency not guaranteed via PostgREST; Postgres snapshot is authoritative |
| Birthday year-wrap logic | Client-side JS date arithmetic | `get_upcoming_birthdays()` RPC | Server computes with consistent `CURRENT_DATE`; client clock can be wrong |
| RLS recursion workaround | `SELECT * FROM iou_groups` inside RLS predicate | SECURITY DEFINER helper or `(SELECT auth.uid())` wrapper | Cross-table subquery in RLS policy causes N×M slowdown — same bug fixed in `0004_fix_plan_members_rls_recursion.sql` |

**Key insight:** The `supabase-js` client has no BEGIN/COMMIT transaction support. Any operation touching more than one table must be wrapped in a PostgreSQL function called via `.rpc()`. This is not a performance optimization — it is a correctness requirement.

---

## Common Pitfalls

### Pitfall 1: Circular RLS on iou_groups ↔ iou_members
**What goes wrong:** `iou_groups` SELECT policy checks `iou_members` membership. `iou_members` UPDATE policy checks `iou_groups.created_by`. When Postgres evaluates `iou_members` UPDATE, it must evaluate the `iou_groups` SELECT policy to read `created_by`, which requires checking `iou_members` again — infinite recursion.
**Why it happens:** Two tables with mutual RLS references.
**How to avoid:** Create a `SECURITY DEFINER` helper function `is_iou_group_creator(group_id uuid)` that reads `iou_groups.created_by` directly without triggering RLS — same pattern as the existing `is_friend_of()` helper in `0001_init.sql`. Use this helper in the `iou_members` UPDATE policy.
**Warning signs:** `ERROR: infinite recursion detected in policy for relation "iou_groups"` when running UPDATE on `iou_members` as a non-creator.

### Pitfall 2: Float Amount Storage
**What goes wrong:** `numeric(10,2)` or `float8` columns produce phantom cent balances that never settle.
**How to avoid:** `total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents > 0)` and `share_amount_cents INTEGER NOT NULL CHECK (share_amount_cents >= 0)`. All values in the DB are whole cents. Conversion to display format (÷ 100) happens only in the client rendering layer.
**Warning signs:** `get_iou_summary()` returns a non-zero balance after all `iou_members.settled_at IS NOT NULL`.

### Pitfall 3: iou_notes Rename — Client Out of Sync
**What goes wrong:** Migration renames the column but TypeScript types (`database.ts`, `plans.ts`) still reference `iou_notes`. The app compiles with no TS errors (type says `iou_notes` is string, supabase-js returns `general_notes` and the field comes back `undefined`). Existing plan notes silently disappear from the UI.
**How to avoid:** Update all 8 client references in the same plan as the migration. Never apply the migration without the client update.
**Warning signs:** `plan.iou_notes` is `undefined` after migration but was non-null before.

### Pitfall 4: make_date() Fails for Feb 29 in Non-Leap Years
**What goes wrong:** `get_upcoming_birthdays()` throws a PostgreSQL error when a friend has birthday_day=29 AND birthday_month=2 AND the current year is not a leap year.
**How to avoid:** Add explicit CASE handling in the RPC to substitute Feb 28 for Feb 29 when the current year is not a leap year.
**Warning signs:** `ERROR: date field value out of range` in Supabase logs when any user with a Feb 29 birthday queries the RPC.

### Pitfall 5: seed.sql Still Uses iou_notes Column Name
**What goes wrong:** After applying migration 0015 (which renames `iou_notes` → `general_notes`), running `supabase db seed` fails with `column "iou_notes" does not exist`. Local dev setup breaks for any developer who seeds after migration.
**How to avoid:** Update both INSERT statements in `supabase/seed.sql` to use `general_notes` in the same plan as the migration.
**Warning signs:** `supabase db seed` exits with error after applying migration 0015.

### Pitfall 6: CHECK Constraint Accepts Invalid Date Combos (e.g., Feb 30)
**What goes wrong:** `CHECK (birthday_day BETWEEN 1 AND 31)` accepts `birthday_month=2, birthday_day=30`. This value later causes `make_date()` in the RPC to throw.
**How to avoid:** Use a compound CHECK that validates day against month boundaries at write time, or restrict Feb to 1-29 in the DB constraint.
**Warning signs:** Supabase logs show `ERROR: date field value out of range` from the birthday RPC for specific users.

---

## Code Examples

### Migration 0015: iou_groups table (project convention)
```sql
-- Source: established pattern from supabase/migrations/0001_init.sql + 0010
-- Phase v1.4 Migration 0015 — IOU tables, RPCs, iou_notes rename
-- Implements IOU-01..IOU-05 schema foundation per 05-CONTEXT.md D-03..D-09, D-14

-- Step 1: IOU Groups table
CREATE TABLE public.iou_groups (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title              text NOT NULL,
  total_amount_cents integer NOT NULL CHECK (total_amount_cents > 0),
  split_mode         text NOT NULL DEFAULT 'even'
                     CHECK (split_mode IN ('even', 'custom')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.iou_groups ENABLE ROW LEVEL SECURITY;

-- Step 2: IOU Members table (one row per participant including creator)
CREATE TABLE public.iou_members (
  iou_group_id       uuid NOT NULL REFERENCES public.iou_groups(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_amount_cents integer NOT NULL CHECK (share_amount_cents >= 0),
  settled_at         timestamptz,                                   -- NULL = unsettled
  settled_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (iou_group_id, user_id)
);
ALTER TABLE public.iou_members ENABLE ROW LEVEL SECURITY;
```

### Migration 0015: create_expense() RPC (largest-remainder even split)
```sql
-- Source: PITFALLS.md Pitfall 1 + PITFALLS.md Pitfall 6 (atomicity)
CREATE OR REPLACE FUNCTION public.create_expense(
  p_title              text,
  p_total_amount_cents integer,
  p_participant_ids    uuid[],
  p_split_mode         text DEFAULT 'even',
  p_custom_cents       integer[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_group_id    uuid;
  v_n_people    int;
  v_base_share  int;
  v_remainder   int;
  v_participant uuid;
  v_idx         int := 0;
  v_share       int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Create the group row
  INSERT INTO public.iou_groups (created_by, title, total_amount_cents, split_mode)
  VALUES (v_caller, p_title, p_total_amount_cents, p_split_mode)
  RETURNING id INTO v_group_id;

  -- All participants (caller included)
  v_n_people := array_length(p_participant_ids, 1);

  IF p_split_mode = 'even' THEN
    v_base_share := p_total_amount_cents / v_n_people;
    v_remainder  := p_total_amount_cents - (v_base_share * v_n_people);
    FOREACH v_participant IN ARRAY p_participant_ids LOOP
      v_idx := v_idx + 1;
      -- First v_remainder participants get one extra cent
      v_share := v_base_share + (CASE WHEN v_idx <= v_remainder THEN 1 ELSE 0 END);
      INSERT INTO public.iou_members (iou_group_id, user_id, share_amount_cents)
      VALUES (v_group_id, v_participant, v_share);
    END LOOP;
  ELSE
    -- Custom split: p_custom_cents[i] corresponds to p_participant_ids[i]
    FOR v_idx IN 1..v_n_people LOOP
      INSERT INTO public.iou_members (iou_group_id, user_id, share_amount_cents)
      VALUES (v_group_id, p_participant_ids[v_idx], p_custom_cents[v_idx]);
    END LOOP;
  END IF;

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_expense(text, integer, uuid[], text, integer[]) TO authenticated;
```

### Migration 0015: RLS on iou_members UPDATE (D-07 creator-only settlement)
```sql
-- Source: PITFALLS.md Pitfall 2 + is_friend_of() pattern from 0001_init.sql
-- Helper avoids RLS recursion between iou_groups ↔ iou_members
CREATE OR REPLACE FUNCTION public.is_iou_group_creator(p_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.iou_groups
    WHERE id = p_group_id
      AND created_by = (SELECT auth.uid())
  );
$$;

CREATE POLICY "iou_groups_select_member"
  ON public.iou_groups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.iou_members
      WHERE iou_group_id = id
        AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "iou_groups_insert_own"
  ON public.iou_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "iou_members_select_participant"
  ON public.iou_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.iou_members im2
      WHERE im2.iou_group_id = iou_group_id
        AND im2.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "iou_members_update_creator_settles"
  ON public.iou_members FOR UPDATE TO authenticated
  USING (public.is_iou_group_creator(iou_group_id))
  WITH CHECK (public.is_iou_group_creator(iou_group_id));
```

### Migration 0016: Birthday columns with compound CHECK
```sql
-- Source: ALTER TABLE pattern from 0010_friend_went_free_v1_3.sql + CONTEXT.md D-10, D-12
ALTER TABLE public.profiles
  ADD COLUMN birthday_month smallint
    CHECK (birthday_month BETWEEN 1 AND 12),
  ADD COLUMN birthday_day   smallint
    CHECK (
      birthday_day BETWEEN 1 AND
      CASE
        WHEN birthday_month IN (4, 6, 9, 11) THEN 30
        WHEN birthday_month = 2             THEN 29
        ELSE 31
      END
    );
```

### Migration 0016: get_upcoming_birthdays() with Feb 29 guard
```sql
-- Source: ARCHITECTURE.md §Feature 3 + Pitfall 4 fix
CREATE OR REPLACE FUNCTION public.get_upcoming_birthdays()
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
  bdays AS (
    SELECT
      p.id         AS friend_id,
      p.display_name,
      p.avatar_url,
      p.birthday_month,
      p.birthday_day,
      -- Feb 29 guard: use Feb 28 in non-leap years
      CASE
        WHEN p.birthday_month = 2 AND p.birthday_day = 29
             AND (EXTRACT(year FROM now())::int % 4 <> 0)
        THEN make_date(EXTRACT(year FROM now())::int, 2, 28)
        ELSE make_date(EXTRACT(year FROM now())::int, p.birthday_month, p.birthday_day)
      END AS this_year_bday
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
    CASE
      WHEN this_year_bday >= CURRENT_DATE
      THEN (this_year_bday - CURRENT_DATE)
      ELSE (
        CASE
          WHEN birthday_month = 2 AND birthday_day = 29
               AND ((EXTRACT(year FROM now())::int + 1) % 4 <> 0)
          THEN make_date(EXTRACT(year FROM now())::int + 1, 2, 28)
          ELSE make_date(EXTRACT(year FROM now())::int + 1, birthday_month, birthday_day)
        END - CURRENT_DATE
      )
    END AS days_until
  FROM bdays
  ORDER BY days_until ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_upcoming_birthdays() TO authenticated;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `numeric(10,2)` for money | `INTEGER` cents | CONTEXT.md D-08 | Eliminates all float rounding errors |
| Single `settled boolean` | `settled_at timestamptz` + `settled_by uuid` | CONTEXT.md D-06 | Full audit trail |
| Separate settlement table | `settled_at`/`settled_by` on `iou_members` | CONTEXT.md D-06 | Simpler schema for v1.4 scale |
| TIMESTAMPTZ birthday | `smallint` month + day | CONTEXT.md D-10 | No timezone offset errors |

**Deprecated/outdated (DO NOT use):**
- `plans.iou_notes`: being renamed to `general_notes` in migration 0015 — do not reference the old name in any new code
- `FLOAT`/`numeric(10,2)` for monetary amounts in this project — INTEGER cents only per D-08

---

## Runtime State Inventory

> This is a schema migration phase (no rename/rebrand). However, the `iou_notes` → `general_notes` column rename creates a runtime state concern: existing data in `plans.iou_notes` must survive intact.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `plans.iou_notes` column: 2 rows in seed.sql have non-null values (`'Jamie paid $60...'` etc.) | ALTER TABLE RENAME COLUMN preserves data — no migration needed. Verify by querying `general_notes` post-migration. |
| Live service config | None — no external services reference the column name | None |
| OS-registered state | None | None |
| Secrets/env vars | None — column name is not a secret or env var | None |
| Build artifacts | `src/types/database.ts` is hand-maintained (not generated) — references `iou_notes` in 3 locations | Update as part of the same plan as migration 0015 |

**Nothing found in other categories** — verified by codebase grep, no references outside the 8 locations identified.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `supabase` CLI (npx) | `supabase db push`, migration apply | Yes | 2.81.1 | — |
| Supabase hosted project | Remote migration | Yes (existing project) | Managed | — |
| TypeScript compiler | Client type updates | Yes (project uses strict TS) | In node_modules | — |
| Local Supabase instance | Local dev smoke testing | Unknown — `supabase start` not tested | — | Run smoke tests against remote project |

[VERIFIED: `npm list supabase` — 2.81.1; Supabase CLI binary not in PATH but `npx supabase` works]

**Missing dependencies with no fallback:** None — all required tools are available.

**Missing dependencies with fallback:**
- Local Supabase dev instance: if `supabase start` is not available (Docker required), smoke tests can be run against the remote hosted project via Supabase SQL editor.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (project uses for visual regression) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx supabase` SQL smoke test queries in Supabase SQL editor |
| Full suite command | `npx playwright test` (visual regression, not DB) |

**Note:** This phase has no client UI changes beyond the `iou_notes` rename. Migration validation is SQL-based, not Playwright-testable. The validation approach is smoke-test queries run in Supabase SQL editor or via psql.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IOU-01..05 | iou_groups + iou_members tables exist with correct schema | SQL smoke | `SELECT * FROM iou_groups LIMIT 1;` in SQL editor | N/A — SQL |
| IOU-01..05 | create_expense() RPC creates group + members atomically | SQL smoke | `SELECT create_expense('Test', 1000, ARRAY[...], 'even')` | N/A — SQL |
| IOU-03 | get_iou_summary() returns rows for authenticated user | SQL smoke | `SELECT * FROM get_iou_summary()` as test user | N/A — SQL |
| IOU-04 | Non-creator cannot mark shares settled | RLS smoke | Attempt UPDATE on iou_members as non-creator, expect error | N/A — SQL |
| BDAY-01 | birthday_month + birthday_day columns exist on profiles | SQL smoke | `SELECT birthday_month, birthday_day FROM profiles LIMIT 1;` | N/A — SQL |
| BDAY-02 | get_upcoming_birthdays() returns sorted results | SQL smoke | `SELECT * FROM get_upcoming_birthdays()` as test user | N/A — SQL |
| BDAY-03 | get_upcoming_birthdays() handles year-wrap | SQL smoke | Set birthday to Dec 31, query in January — verify days_until is small | N/A — SQL |
| Migration | supabase db push completes cleanly | CLI | `npx supabase db push` exits 0 | N/A — CLI |

### Sampling Rate
- **Per task commit:** Run the smoke-test SQL queries for that task's objects
- **Per wave merge:** `npx supabase db push` against remote; verify migration history shows 0015 and 0016 applied
- **Phase gate:** All RLS smoke tests pass; `supabase db push` clean before closing phase

### Wave 0 Gaps
- No test file gaps — this phase is pure SQL migrations with no TypeScript test surface
- The `iou_notes` rename requires a TypeScript compile check: `npx tsc --noEmit` must pass after updating `database.ts` and `plans.ts`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Auth handled by Supabase Auth — not touched in this phase |
| V3 Session Management | No | Not touched |
| V4 Access Control | Yes | RLS policies on all new tables; only expense creator can mark settled (D-07) |
| V5 Input Validation | Yes | CHECK constraints on amount_cents > 0; birthday_month 1-12; birthday_day bounded by month |
| V6 Cryptography | No | No new cryptographic operations |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Self-settle: debtor marks own share settled | Spoofing / Tampering | RLS UPDATE policy restricts to `is_iou_group_creator()` (D-07) |
| Orphan expense: network drop between group + members insert | Tampering (data integrity) | `create_expense()` atomic RPC — both inserts in one transaction |
| Non-friend reads IOU data | Information Disclosure | `iou_groups` SELECT: must be member (via `iou_members` JOIN); non-participant gets no rows |
| Non-friend reads birthday | Information Disclosure | `get_upcoming_birthdays()` RPC filters to accepted friends only via `friendships` JOIN; raw `profiles` table is readable by all authenticated users (existing policy) — client must use RPC, never direct `profiles` query for birthday display |
| SQL injection via RPC params | Tampering | All RPCs use parameterized `DECLARE + $n` or function parameters — no string concatenation |
| Float cent drift | Tampering (financial) | INTEGER cents only; CHECK constraints; largest-remainder RPC |

**Privacy note on birthday columns:** The existing `profiles_select_authenticated` policy (`USING (true)`) exposes `birthday_month` and `birthday_day` to any authenticated user via direct table query. This is a known tradeoff: the project uses open profile reads for friend search / display. Birthday data is low-sensitivity (no year). The RPC is the authoritative access path for birthday features. Downstream client phases must call `get_upcoming_birthdays()`, not `SELECT birthday_month FROM profiles`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Compound CHECK constraint for birthday_day (bounded by birthday_month) is preferable to simple 1-31 check | Architecture Patterns — Pattern 2 | Low risk: simple 1-31 CHECK is also acceptable; client validation covers the gap. make_date() error at RPC time would surface the problem. |
| A2 | `is_iou_group_creator()` SECURITY DEFINER helper is the right approach to avoid RLS recursion between iou_groups ↔ iou_members | Architecture Patterns — Pattern 1 | Medium risk: if the cross-table subquery in UPDATE policy does not actually cause recursion in Postgres 15 (some cases are optimized), the helper is still safe but unnecessary. The helper is always the safer choice. |
| A3 | Local `supabase start` (Docker-based) is not available — smoke tests should be run against remote | Environment Availability | Low risk: if Docker is available, local testing is preferable. The plan should note this as optional. |

---

## Open Questions

1. **Seed data for IOU and birthday test values (D-13)**
   - What we know: existing seed uses 6 test users (alex, jamie, morgan, riley, casey, drew) with UUIDs `000...001` through `000...006`; seed uses a `DO $$ DECLARE ... BEGIN ... END $$` block with named variables
   - What's unclear: which specific IOU expense scenarios and birthday values give the best developer test coverage
   - Recommendation: add 2-3 IOU groups (alex paid for dinner, jamie paid for drinks) and birthdays for all 5 primary users, spread across months for year-wrap testing. Include one Dec/Jan boundary case.

2. **get_iou_summary() return shape — per-group vs. per-friend net**
   - What we know: D-05 says "per-friend net balances"; ARCHITECTURE.md shows a per-group return with `net_balance`
   - What's unclear: should the RPC aggregate to one row per friend-pair or one row per expense group?
   - Recommendation: one row per expense group (matches ARCHITECTURE.md verified template). Per-friend aggregation can be done at the client or in a separate RPC in Phase 9 when the IOU list screen is built.

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0001_init.sql` — All table creation, RLS, trigger, and RPC patterns
- `supabase/migrations/0010_friend_went_free_v1_3.sql` — ALTER TABLE ADD COLUMN pattern, SECURITY DEFINER RPCs
- `supabase/migrations/0011_squad_streak_v1_3.sql` — Complex SECURITY DEFINER plpgsql RPC with auth guard
- `supabase/migrations/0012_nudges_v1_3_5.sql` — Rate-limited RPC pattern, auth guard
- `.planning/research/PITFALLS.md` — IOU float risk, settlement RLS, atomicity, birthday timezone
- `.planning/research/ARCHITECTURE.md` — Data model details, verified RPC templates

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — Feature scope and IOU anti-patterns
- `.planning/phases/05-database-migrations/05-CONTEXT.md` — All locked decisions (D-01 through D-15)
- `src/types/database.ts`, `src/types/plans.ts`, `src/components/plans/IOUNotesField.tsx` — Verified client touch points for iou_notes rename

### Tertiary (LOW confidence)
- [ASSUMED] Compound CHECK constraint for birthday_day — PostgreSQL standard pattern, not verified against Supabase docs

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — Supabase CLI version verified, existing migration patterns fully documented in codebase
- Architecture: HIGH — All patterns directly derived from existing migration files (0001, 0010, 0011, 0012)
- Pitfalls: HIGH — PITFALLS.md is a verified research artifact specifically for this project's v1.4 features
- Code examples: HIGH — Templates mirror existing migrations exactly, with only domain-specific names changed

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain — PostgreSQL/Supabase migration patterns change slowly)
