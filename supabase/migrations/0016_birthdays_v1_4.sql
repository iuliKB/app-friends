-- Phase v1.4 Migration 0016 — Birthday columns on profiles and get_upcoming_birthdays() RPC.
-- Implements BDAY-01..BDAY-03 schema foundation per 05-CONTEXT.md D-10..D-12, D-15.
-- Decisions: D-10 smallint columns nullable, D-11 year-wrap RPC, D-12 compound CHECK.

-- ============================================================================
-- Section 1: Birthday columns on profiles (D-10, D-12)
-- Both columns nullable (no DEFAULT, no NOT NULL — birthday is optional per D-10).
-- Existing profiles rows with NULL birthday columns are unaffected (no backfill needed).
-- RLS inheritance: existing UPDATE policy WITH CHECK (id = auth.uid()) covers these new
-- columns — any authenticated user can write their own birthday. No policy change required.
-- ============================================================================
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

-- ============================================================================
-- Section 2: get_upcoming_birthdays() RPC (D-11)
-- SECURITY DEFINER with SET search_path = '' — cannot trust search_path at runtime.
-- Scoped to accepted friends only (T-05-08): callers with no accepted friends get zero rows.
-- Feb 29 leap-year guard (T-05-10): CASE substitutes Feb 28 before calling make_date()
-- in non-leap years, applied in both the this-year and next-year branches.
-- ============================================================================
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
      p.id           AS friend_id,
      p.display_name,
      p.avatar_url,
      p.birthday_month,
      p.birthday_day,
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
      THEN (this_year_bday - CURRENT_DATE)::int
      ELSE (
        CASE
          WHEN birthday_month = 2 AND birthday_day = 29
               AND ((EXTRACT(year FROM now())::int + 1) % 4 <> 0)
          THEN (make_date(EXTRACT(year FROM now())::int + 1, 2, 28) - CURRENT_DATE)::int
          ELSE (make_date(EXTRACT(year FROM now())::int + 1, birthday_month, birthday_day) - CURRENT_DATE)::int
        END
      )
    END AS days_until
  FROM bdays
  ORDER BY days_until ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_upcoming_birthdays() TO authenticated;
