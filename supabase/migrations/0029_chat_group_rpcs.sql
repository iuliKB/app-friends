-- Migration 0029 — Group chat RPCs: create custom group + add members with
-- system messages.
--
-- Context: clients cannot insert message_type='system' (the tighter messages
-- INSERT policy from 0024 only allows text/image/poll). So both creating a
-- group from a DM and inviting members must go through SECURITY DEFINER RPCs
-- that also post the activity system message. Mirrors create_birthday_group
-- (0017 §11) for the membership fan-out and complete_chat_todo (0024) for the
-- system-message insert. add_group_members is gated on membership via the
-- existing is_group_channel_member helper (0017 §6) so ANY member can invite.

-- =============================================================
-- create_group_chat(text, uuid[]) — any authenticated user creates a custom
-- (non-birthday) group. Caller is added as a member; posts a system message.
-- =============================================================
CREATE OR REPLACE FUNCTION public.create_group_chat(
  p_name       text,
  p_member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_group_id    uuid;
  v_member      uuid;
  v_caller_name text;
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

  -- Add selected members (skip caller / duplicates)
  FOREACH v_member IN ARRAY COALESCE(p_member_ids, ARRAY[]::uuid[]) LOOP
    IF v_member <> v_caller THEN
      INSERT INTO public.group_channel_members (group_channel_id, user_id)
      VALUES (v_group_id, v_member)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  SELECT COALESCE(display_name, 'Someone') INTO v_caller_name
  FROM public.profiles WHERE id = v_caller;

  INSERT INTO public.messages (group_channel_id, sender_id, body, message_type)
  VALUES (v_group_id, v_caller, v_caller_name || ' created the group', 'system');

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_chat(text, uuid[]) TO authenticated;

-- =============================================================
-- add_group_members(uuid, uuid[]) — any MEMBER invites others. Inserts members
-- not already present and posts a "X invited A, B to the group" system message.
-- =============================================================
CREATE OR REPLACE FUNCTION public.add_group_members(
  p_group_channel_id uuid,
  p_member_ids       uuid[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_caller_name text;
  v_member      uuid;
  v_added       uuid[] := ARRAY[]::uuid[];
  v_names       text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Gate: caller must be a member of the group (any member can invite).
  IF NOT public.is_group_channel_member(p_group_channel_id) THEN
    RAISE EXCEPTION 'not a group member';
  END IF;

  FOREACH v_member IN ARRAY COALESCE(p_member_ids, ARRAY[]::uuid[]) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.group_channel_members
      WHERE group_channel_id = p_group_channel_id AND user_id = v_member
    ) THEN
      INSERT INTO public.group_channel_members (group_channel_id, user_id)
      VALUES (p_group_channel_id, v_member);
      v_added := array_append(v_added, v_member);
    END IF;
  END LOOP;

  -- Nothing actually added → no system message.
  IF array_length(v_added, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO v_caller_name
  FROM public.profiles WHERE id = v_caller;

  SELECT string_agg(COALESCE(display_name, 'someone'), ', ')
  INTO v_names
  FROM public.profiles
  WHERE id = ANY(v_added);

  INSERT INTO public.messages (group_channel_id, sender_id, body, message_type)
  VALUES (
    p_group_channel_id,
    v_caller,
    v_caller_name || ' invited ' || v_names || ' to the group',
    'system'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_group_members(uuid, uuid[]) TO authenticated;
