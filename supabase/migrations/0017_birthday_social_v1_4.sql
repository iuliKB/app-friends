-- Phase v1.4 Migration 0017 — Birthday social layer: wish lists, wish list claims,
-- group channels, group channel members, updated messages RLS, and new RPCs.
-- Implements Phase 11 schema foundation per 11-CONTEXT.md D-01..D-17.
-- Decisions: D-01 birthday_year nullable, D-03 no NOT NULL, D-04..D-11 wish list schema,
--            D-14 get_friends_of RPC, D-15..D-17 group channels + create_birthday_group RPC.

-- =============================================================
-- SECTION 1 — birthday_year column on profiles (D-01, D-03)
-- Nullable smallint — no NOT NULL, no DEFAULT (birthday year is optional, Pitfall 1).
-- Existing profile rows with NULL birthday_year are unaffected (no backfill needed).
-- RLS inheritance: existing profiles_update_own WITH CHECK covers this new column.
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN birthday_year smallint
    CHECK (birthday_year BETWEEN 1900 AND 2100);

-- =============================================================
-- SECTION 2 — wish_list_items table (D-04, D-07)
-- =============================================================

CREATE TABLE public.wish_list_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  url        text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wish_list_items ENABLE ROW LEVEL SECURITY;

-- Owner can do all CRUD on their own items
CREATE POLICY "wish_list_items_all_owner"
  ON public.wish_list_items FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Accepted friends can SELECT items
CREATE POLICY "wish_list_items_select_friends"
  ON public.wish_list_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (
        (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = wish_list_items.user_id)
        OR (f.addressee_id = (SELECT auth.uid()) AND f.requester_id = wish_list_items.user_id)
      )
      AND f.status = 'accepted'
    )
  );

-- =============================================================
-- SECTION 3 — SECURITY DEFINER helper: is_not_wish_list_owner (D-10, D-11, Pitfall 2)
-- Must be created BEFORE wish_list_claims to avoid forward reference.
-- Owner exclusion enforced at DB level — cross-table JOIN inside helper bypasses RLS recursion.
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_not_wish_list_owner(p_item_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.wish_list_items
    WHERE id = p_item_id
      AND user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_not_wish_list_owner(uuid) TO authenticated;

-- =============================================================
-- SECTION 4 — wish_list_claims table (D-08, D-09, D-10, D-11)
-- Composite PK: (item_id, claimer_id) — no separate id column.
-- SELECT blocked for item owner via SECURITY DEFINER helper (T-11-P01-01).
-- =============================================================

CREATE TABLE public.wish_list_claims (
  item_id    uuid NOT NULL REFERENCES public.wish_list_items(id) ON DELETE CASCADE,
  claimer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, claimer_id)
);
ALTER TABLE public.wish_list_claims ENABLE ROW LEVEL SECURITY;

-- Friends can see claims (owner excluded via is_not_wish_list_owner)
CREATE POLICY "wish_list_claims_select_non_owner"
  ON public.wish_list_claims FOR SELECT TO authenticated
  USING (public.is_not_wish_list_owner(item_id));

-- Claimer can insert own claim only
CREATE POLICY "wish_list_claims_insert_own"
  ON public.wish_list_claims FOR INSERT TO authenticated
  WITH CHECK (claimer_id = (SELECT auth.uid()));

-- Claimer can delete own claim only
CREATE POLICY "wish_list_claims_delete_own"
  ON public.wish_list_claims FOR DELETE TO authenticated
  USING (claimer_id = (SELECT auth.uid()));

-- =============================================================
-- SECTION 5 — group_channels + group_channel_members tables (D-15, D-17)
-- =============================================================

CREATE TABLE public.group_channels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_channel_members (
  group_channel_id uuid NOT NULL REFERENCES public.group_channels(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_channel_id, user_id)
);
ALTER TABLE public.group_channel_members ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- SECTION 6 — SECURITY DEFINER helper: is_group_channel_member
-- Used for messages RLS OR-branch (T-11-P01-03).
-- Must be created BEFORE the messages policy update.
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_group_channel_member(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_channel_members
    WHERE group_channel_id = p_channel_id
      AND user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_channel_member(uuid) TO authenticated;

-- =============================================================
-- SECTION 7 — group_channels + group_channel_members RLS policies
-- =============================================================

-- group_channels: members can SELECT; creator can INSERT
CREATE POLICY "group_channels_select_member"
  ON public.group_channels FOR SELECT TO authenticated
  USING (public.is_group_channel_member(id));

CREATE POLICY "group_channels_insert_creator"
  ON public.group_channels FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- group_channel_members: members can see other members; only creator can add members
-- (create_birthday_group RPC is SECURITY DEFINER and bypasses this policy)
CREATE POLICY "group_channel_members_select_member"
  ON public.group_channel_members FOR SELECT TO authenticated
  USING (public.is_group_channel_member(group_channel_id));

CREATE POLICY "group_channel_members_insert_creator"
  ON public.group_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_channels
      WHERE id = group_channel_id
        AND created_by = (SELECT auth.uid())
    )
  );

-- =============================================================
-- SECTION 8 — ALTER messages to add group_channel_id (D-17, Pitfall 6)
-- Drop the strict one-channel constraint first, then add group_channel_id.
-- Recreate constraint to allow exactly one of: plan_id, dm_channel_id, or group_channel_id.
-- Drop and recreate messages RLS policies to add group channel OR-branch (T-11-P01-03).
-- =============================================================

-- Drop the strict two-channel constraint to allow three-way channel
ALTER TABLE public.messages
  DROP CONSTRAINT messages_exactly_one_channel;

-- Add group_channel_id column (nullable — existing rows unaffected)
ALTER TABLE public.messages
  ADD COLUMN group_channel_id uuid REFERENCES public.group_channels(id) ON DELETE CASCADE;

-- Recreate constraint: exactly one of plan_id, dm_channel_id, group_channel_id must be non-null
ALTER TABLE public.messages
  ADD CONSTRAINT messages_exactly_one_channel CHECK (
    (
      (plan_id IS NOT NULL)::int
      + (dm_channel_id IS NOT NULL)::int
      + (group_channel_id IS NOT NULL)::int
    ) = 1
  );

-- Drop and recreate messages SELECT policy to add group channel branch
DROP POLICY IF EXISTS "messages_select_member_or_participant" ON public.messages;

CREATE POLICY "messages_select_member_or_participant"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    (
      plan_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.plan_members
        WHERE plan_id = messages.plan_id
          AND user_id = (SELECT auth.uid())
      )
    )
    OR (
      dm_channel_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.dm_channels
        WHERE id = messages.dm_channel_id
          AND (user_a = (SELECT auth.uid()) OR user_b = (SELECT auth.uid()))
      )
    )
    OR (
      group_channel_id IS NOT NULL
      AND public.is_group_channel_member(group_channel_id)
    )
  );

-- Drop and recreate messages INSERT policy to add group channel branch
DROP POLICY IF EXISTS "messages_insert_member_or_participant" ON public.messages;

CREATE POLICY "messages_insert_member_or_participant"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (
      (
        plan_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.plan_members
          WHERE plan_id = messages.plan_id
            AND user_id = (SELECT auth.uid())
        )
      )
      OR (
        dm_channel_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.dm_channels
          WHERE id = messages.dm_channel_id
            AND (user_a = (SELECT auth.uid()) OR user_b = (SELECT auth.uid()))
        )
      )
      OR (
        group_channel_id IS NOT NULL
        AND public.is_group_channel_member(group_channel_id)
      )
    )
  );

-- =============================================================
-- SECTION 9 — Drop and recreate get_upcoming_birthdays with birthday_year (D-02)
-- Verbatim body from 0016_birthdays_v1_4.sql with birthday_year added.
-- =============================================================

DROP FUNCTION IF EXISTS public.get_upcoming_birthdays();

CREATE OR REPLACE FUNCTION public.get_upcoming_birthdays()
RETURNS TABLE (
  friend_id      uuid,
  display_name   text,
  avatar_url     text,
  birthday_month smallint,
  birthday_day   smallint,
  birthday_year  smallint,
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
      p.birthday_year,
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
    birthday_year,
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

-- =============================================================
-- SECTION 10 — get_friends_of(uuid) RPC (D-14)
-- Returns all friends of a target user visible to the caller.
-- Excludes the current user from results (Pitfall 3).
-- SECURITY DEFINER — caller can look up any user's friend list
-- (scoped to accepted friendships; caller sees full list for group selection UX).
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_friends_of(p_target_user uuid)
RETURNS TABLE (
  friend_id    uuid,
  display_name text,
  avatar_url   text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    CASE WHEN f.requester_id = p_target_user THEN f.addressee_id
         ELSE f.requester_id END AS friend_id,
    p.display_name,
    p.avatar_url
  FROM public.friendships f
  JOIN public.profiles p ON p.id = (
    CASE WHEN f.requester_id = p_target_user THEN f.addressee_id
         ELSE f.requester_id END
  )
  WHERE (f.requester_id = p_target_user OR f.addressee_id = p_target_user)
    AND f.status = 'accepted'
    AND (
      CASE WHEN f.requester_id = p_target_user THEN f.addressee_id
           ELSE f.requester_id END
    ) <> (SELECT auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_friends_of(uuid) TO authenticated;

-- =============================================================
-- SECTION 11 — create_birthday_group(text, uuid[]) atomic RPC (D-15, D-16)
-- Atomically creates a group_channels row + inserts all members.
-- Caller is always added as a member; duplicates (caller in p_member_ids) are skipped.
-- SECURITY DEFINER — bypasses group_channel_members INSERT policy so RPC can add members.
-- =============================================================

CREATE OR REPLACE FUNCTION public.create_birthday_group(
  p_name       text,
  p_member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_group_id uuid;
  v_member   uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.group_channels (name, created_by)
  VALUES (p_name, v_caller)
  RETURNING id INTO v_group_id;

  -- Always add the caller as a member
  INSERT INTO public.group_channel_members (group_channel_id, user_id)
  VALUES (v_group_id, v_caller);

  -- Add selected members (skip if caller accidentally included)
  FOREACH v_member IN ARRAY p_member_ids LOOP
    IF v_member <> v_caller THEN
      INSERT INTO public.group_channel_members (group_channel_id, user_id)
      VALUES (v_group_id, v_member);
    END IF;
  END LOOP;

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_birthday_group(text, uuid[]) TO authenticated;
