-- =============================================================
-- Campfire V1 — Complete Database Schema
-- Migration: 0001_init.sql
-- =============================================================
-- Run this migration against a fresh Supabase project to create
-- all tables, enums, indexes, RLS policies, triggers, RPC functions,
-- and storage configuration.
-- =============================================================


-- =============================================================
-- SECTION 1: Enums
-- =============================================================

CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE public.availability_status AS ENUM ('free', 'busy', 'maybe');
CREATE TYPE public.rsvp_status AS ENUM ('invited', 'going', 'maybe', 'out');


-- =============================================================
-- SECTION 2: Tables
-- Each CREATE TABLE is immediately followed by ENABLE ROW LEVEL SECURITY
-- per PITFALLS.md Pitfall 1 convention to prevent silent data exposure.
-- =============================================================

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      text UNIQUE,  -- NULL until profile setup complete
  display_name  text NOT NULL DEFAULT '',
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- statuses
-- ---------------------------------------------------------------
CREATE TABLE public.statuses (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status      public.availability_status NOT NULL DEFAULT 'maybe',
  context_tag text,  -- nullable emoji tag
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- friendships
-- Canonical pair stored as least()/greatest() to prevent duplicates.
-- ---------------------------------------------------------------
CREATE TABLE public.friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        public.friendship_status NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Unique index on canonical pair to prevent duplicate friendships regardless of direction
CREATE UNIQUE INDEX idx_friendships_canonical_pair ON public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

-- ---------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------
CREATE TABLE public.plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  scheduled_for timestamptz,
  location      text,
  link_dump     text,
  iou_notes     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- plan_members
-- ---------------------------------------------------------------
CREATE TABLE public.plan_members (
  plan_id   uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsvp      public.rsvp_status NOT NULL DEFAULT 'invited',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, user_id)
);

ALTER TABLE public.plan_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- dm_channels
-- Canonical pair stored as least()/greatest() to prevent duplicates.
-- ---------------------------------------------------------------
CREATE TABLE public.dm_channels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_channels_no_self CHECK (user_a <> user_b)
);

ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;

-- Unique index on canonical pair to prevent duplicate DM channels regardless of direction
CREATE UNIQUE INDEX idx_dm_channels_canonical_pair ON public.dm_channels (
  least(user_a, user_b),
  greatest(user_a, user_b)
);

-- ---------------------------------------------------------------
-- messages
-- Exactly one of plan_id or dm_channel_id must be non-null.
-- ---------------------------------------------------------------
CREATE TABLE public.messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        uuid REFERENCES public.plans(id) ON DELETE CASCADE,       -- NULL for DMs
  dm_channel_id  uuid REFERENCES public.dm_channels(id) ON DELETE CASCADE, -- NULL for plan chat
  sender_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_exactly_one_channel CHECK (
    (plan_id IS NOT NULL AND dm_channel_id IS NULL)
    OR (plan_id IS NULL AND dm_channel_id IS NOT NULL)
  )
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- SECTION 3: Indexes
-- Indexes on RLS policy columns prevent sequential scans.
-- =============================================================

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_pair ON public.friendships(
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);
CREATE INDEX idx_statuses_status ON public.statuses(status) WHERE status = 'free';
CREATE INDEX idx_messages_plan ON public.messages(plan_id, created_at) WHERE plan_id IS NOT NULL;
CREATE INDEX idx_messages_dm ON public.messages(dm_channel_id, created_at) WHERE dm_channel_id IS NOT NULL;
CREATE INDEX idx_plan_members_user ON public.plan_members(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;


-- =============================================================
-- SECTION 4: SECURITY DEFINER helper function
-- Prevents RLS infinite recursion when checking friendships
-- from within other tables' policies (PITFALLS.md Pitfall 2).
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_friend_of(target_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = (SELECT auth.uid()) AND addressee_id = target_user)
        OR (addressee_id = (SELECT auth.uid()) AND requester_id = target_user)
      )
  );
$$;


-- =============================================================
-- SECTION 5: RLS Policies
-- All policies use (SELECT auth.uid()) not bare auth.uid()
-- for query plan caching performance (PITFALLS.md Performance Traps).
-- All INSERT/UPDATE policies include WITH CHECK for ownership
-- (PITFALLS.md Security Mistakes).
-- =============================================================

-- ---------------------------------------------------------------
-- profiles policies
-- SELECT: any authenticated user can read all profiles.
-- This is safe because profiles only contain public info
-- (username, display_name, avatar_url). Required for friend search.
-- ---------------------------------------------------------------
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------
-- statuses policies
-- SELECT: own status OR friend's status via SECURITY DEFINER helper.
-- ---------------------------------------------------------------
CREATE POLICY "statuses_select_own_or_friend"
  ON public.statuses FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_friend_of(user_id)
  );

CREATE POLICY "statuses_insert_own"
  ON public.statuses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "statuses_update_own"
  ON public.statuses FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------
-- friendships policies
-- SELECT: either party can see the row.
-- INSERT: only requester can create (requester_id must be own id).
-- UPDATE: only addressee can update status (accept/reject).
-- DELETE: either party can remove.
-- ---------------------------------------------------------------
CREATE POLICY "friendships_select_participant"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

CREATE POLICY "friendships_insert_as_requester"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = (SELECT auth.uid()));

CREATE POLICY "friendships_update_as_addressee"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (addressee_id = (SELECT auth.uid()))
  WITH CHECK (addressee_id = (SELECT auth.uid()));

CREATE POLICY "friendships_delete_participant"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

-- ---------------------------------------------------------------
-- plans policies
-- SELECT: any plan member can read.
-- INSERT: any authenticated user (must be creator).
-- UPDATE: any plan member can update (for link_dump, iou_notes, etc.).
-- ---------------------------------------------------------------
CREATE POLICY "plans_select_member"
  ON public.plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_members
      WHERE plan_id = id
        AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plans_insert_own"
  ON public.plans FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "plans_update_member"
  ON public.plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_members
      WHERE plan_id = id
        AND user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_members
      WHERE plan_id = id
        AND user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------
-- plan_members policies
-- SELECT: plan members can see all members of their plans.
-- INSERT: plan creator can add members.
-- UPDATE: own RSVP only.
-- ---------------------------------------------------------------
CREATE POLICY "plan_members_select_member"
  ON public.plan_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_members pm2
      WHERE pm2.plan_id = plan_id
        AND pm2.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_members_insert_creator"
  ON public.plan_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans
      WHERE id = plan_id
        AND created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "plan_members_update_own_rsvp"
  ON public.plan_members FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------
-- dm_channels policies
-- SELECT: participant only.
-- INSERT: participant only (user_a or user_b must be caller).
-- ---------------------------------------------------------------
CREATE POLICY "dm_channels_select_participant"
  ON public.dm_channels FOR SELECT
  TO authenticated
  USING (
    user_a = (SELECT auth.uid())
    OR user_b = (SELECT auth.uid())
  );

CREATE POLICY "dm_channels_insert_participant"
  ON public.dm_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    user_a = (SELECT auth.uid())
    OR user_b = (SELECT auth.uid())
  );

-- ---------------------------------------------------------------
-- messages policies
-- SELECT: plan member OR dm participant.
-- INSERT: sender_id must be own id AND must be member/participant.
-- ---------------------------------------------------------------
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
  );

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
    )
  );


-- =============================================================
-- SECTION 6: Triggers
-- =============================================================

-- ---------------------------------------------------------------
-- update_updated_at — reusable trigger function for all tables
-- with an updated_at column
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER statuses_updated_at
  BEFORE UPDATE ON public.statuses
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ---------------------------------------------------------------
-- handle_new_user — auto-creates profile + status rows on auth.users INSERT
-- SECURITY DEFINER prevents permission issues accessing auth.users data
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  -- Auto-create status row with default 'maybe'
  INSERT INTO public.statuses (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- =============================================================
-- SECTION 7: Realtime
-- REPLICA IDENTITY FULL on statuses enables filtering by
-- non-PK columns in Realtime subscriptions (needed for Phase 3
-- friend status subscriptions).
-- =============================================================

ALTER TABLE public.statuses REPLICA IDENTITY FULL;


-- =============================================================
-- SECTION 8: RPC Functions
-- All use SECURITY DEFINER to bypass RLS where needed and
-- SET search_path = '' for security.
-- =============================================================

-- ---------------------------------------------------------------
-- get_friends() — returns accepted friends of current user with
-- their profile data and friendship metadata
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS TABLE (
  friend_id         uuid,
  username          text,
  display_name      text,
  avatar_url        text,
  friendship_status public.friendship_status,
  created_at        timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    CASE
      WHEN f.requester_id = (SELECT auth.uid()) THEN f.addressee_id
      ELSE f.requester_id
    END AS friend_id,
    p.username,
    p.display_name,
    p.avatar_url,
    f.status AS friendship_status,
    f.created_at
  FROM public.friendships f
  JOIN public.profiles p ON p.id = CASE
    WHEN f.requester_id = (SELECT auth.uid()) THEN f.addressee_id
    ELSE f.requester_id
  END
  WHERE (f.requester_id = (SELECT auth.uid()) OR f.addressee_id = (SELECT auth.uid()))
    AND f.status = 'accepted';
$$;

-- ---------------------------------------------------------------
-- get_free_friends() — returns friends who currently have status 'free'
-- Uses get_friends() to avoid duplicating the friendship logic
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_free_friends()
RETURNS TABLE (
  friend_id         uuid,
  username          text,
  display_name      text,
  avatar_url        text,
  status            public.availability_status,
  context_tag       text,
  status_updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    gf.friend_id,
    gf.username,
    gf.display_name,
    gf.avatar_url,
    s.status,
    s.context_tag,
    s.updated_at AS status_updated_at
  FROM public.get_friends() gf
  JOIN public.statuses s ON s.user_id = gf.friend_id
  WHERE s.status = 'free'
  ORDER BY s.updated_at DESC;
$$;

-- ---------------------------------------------------------------
-- get_or_create_dm_channel(other_user_id) — idempotent DM channel
-- creation. Returns existing channel id or creates a new one.
-- Uses canonical least()/greatest() pair to prevent duplicates.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  channel_id       uuid;
  current_user_id  uuid := (SELECT auth.uid());
BEGIN
  -- Check existing channel using canonical pair ordering
  SELECT id INTO channel_id
  FROM public.dm_channels
  WHERE user_a = least(current_user_id, other_user_id)
    AND user_b = greatest(current_user_id, other_user_id);

  IF channel_id IS NOT NULL THEN
    RETURN channel_id;
  END IF;

  -- Create new channel with canonical ordering
  INSERT INTO public.dm_channels (user_a, user_b)
  VALUES (least(current_user_id, other_user_id), greatest(current_user_id, other_user_id))
  RETURNING id INTO channel_id;

  RETURN channel_id;
END;
$$;


-- =============================================================
-- SECTION 9: Storage
-- Avatars bucket: public read, authenticated write to own path.
-- =============================================================

-- Create avatars bucket (public = true means bucket is publicly readable)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder path
CREATE POLICY "avatar_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Allow authenticated users to update their own avatars
CREATE POLICY "avatar_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Allow public read of all avatars (bucket is already public,
-- but explicit policy ensures storage.objects RLS respects it)
CREATE POLICY "avatar_read_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
