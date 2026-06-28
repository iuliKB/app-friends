-- Migration 0028 — Group chat admin: rename + remove-members.
-- Context: the group-info/settings screen lets a group's creator rename the
-- group and remove other members. Migration 0017 only created SELECT/INSERT
-- policies for group_channels / group_channel_members, and 0022 added a
-- self-leave DELETE. There is no UPDATE policy on group_channels and no way to
-- remove anyone but yourself. Both new policies are scoped to created_by so a
-- non-creator can still only view, mute (chat_preferences) and leave (0022).

-- Creator can rename their group (and edit any other group_channels column).
CREATE POLICY "group_channels_update_creator"
  ON public.group_channels FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

-- Creator can remove other members. Self-leave stays covered by 0022's
-- group_channel_members_delete_self; multiple permissive DELETE policies are
-- OR'd, so a creator removing themselves still works too.
CREATE POLICY "group_channel_members_delete_creator"
  ON public.group_channel_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_channels
      WHERE id = group_channel_id
        AND created_by = (SELECT auth.uid())
    )
  );
