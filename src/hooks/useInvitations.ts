// Phase 31 Plan 06 — Migrated to TanStack Query.
//
// Public shape preserved verbatim:
//   { invitations, loading, count, refetch, accept, decline }
//
// Pattern: useQuery for the 4-step join (plan_members → plans → plan_members →
// profiles) + two canonical Pattern 5 useMutation calls (accept / decline).
// Each mutation invalidates queryKeys.status.invitations(userId) AND
// queryKeys.home.invitationCount(userId) on settle (Pitfall 10 fan-out — the
// home invitation-count widget stays in sync).
//
// Analog: useFriends.ts (Wave 5) — non-optimistic-on-write pattern is here, but
// the public-shape's local removal of accepted/declined rows is implemented
// optimistically via setQueryData in onMutate so the UI flips instantly.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface InvitedMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface PlanInvitation {
  plan_id: string;
  title: string;
  scheduled_for: string | null;
  location: string | null;
  created_by: string;
  creator_name: string;
  creator_avatar: string | null;
  other_members: InvitedMember[];
}

export function useInvitations(): {
  invitations: PlanInvitation[];
  loading: boolean;
  count: number;
  refetch: () => Promise<unknown>;
  accept: (planId: string) => Promise<{ error: Error | null }>;
  decline: (planId: string) => Promise<{ error: Error | null }>;
} {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  // Cache key: queryKeys.status.invitations(userId) — plan invitations live in
  // the status taxonomy because the home invitation-count widget aggregates them.
  const invitationsKey = queryKeys.status.invitations(userId ?? '');

  const query = useQuery({
    queryKey: invitationsKey,
    queryFn: async (): Promise<PlanInvitation[]> => {
      if (!userId) return [];
      // Step 1: get plan_ids where user is invited
      const { data: memberRows, error: memberError } = await supabase
        .from('plan_members')
        .select('plan_id')
        .eq('user_id', userId)
        .eq('rsvp', 'invited');
      if (memberError) throw memberError;
      if (!memberRows || memberRows.length === 0) return [];

      const planIds = (memberRows as { plan_id: string }[]).map((r) => r.plan_id);

      // Step 2: get plan details
      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('id, title, scheduled_for, location, created_by')
        .in('id', planIds)
        .order('scheduled_for', { ascending: true, nullsFirst: false });
      if (plansError) throw plansError;
      if (!plans) return [];

      // Step 3: get all members for these plans
      const { data: allMembers } = await supabase
        .from('plan_members')
        .select('plan_id, user_id')
        .in('plan_id', planIds);

      // Step 4: get profiles for all involved users (creators + members)
      const allUserIds = new Set<string>();
      for (const p of plans as { created_by: string }[]) allUserIds.add(p.created_by);
      for (const m of ((allMembers ?? []) as { user_id: string }[])) {
        allUserIds.add(m.user_id);
      }

      let profileMap = new Map<
        string,
        { display_name: string; avatar_url: string | null }
      >();

      if (allUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', [...allUserIds]);

        profileMap = new Map(
          ((profiles ?? []) as { id: string; display_name: string; avatar_url: string | null }[]).map(
            (p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }],
          ),
        );
      }

      // Step 5: group members by plan (exclude current user)
      const membersByPlan = new Map<string, InvitedMember[]>();
      for (const m of ((allMembers ?? []) as { plan_id: string; user_id: string }[])) {
        if (m.user_id === userId) continue;
        if (!membersByPlan.has(m.plan_id)) membersByPlan.set(m.plan_id, []);
        const profile = profileMap.get(m.user_id);
        membersByPlan.get(m.plan_id)!.push({
          user_id: m.user_id,
          display_name: profile?.display_name ?? 'Unknown',
          avatar_url: profile?.avatar_url ?? null,
        });
      }

      return (plans as {
        id: string;
        title: string;
        scheduled_for: string | null;
        location: string | null;
        created_by: string;
      }[]).map((p) => {
        const creatorProfile = profileMap.get(p.created_by);
        return {
          plan_id: p.id,
          title: p.title,
          scheduled_for: p.scheduled_for,
          location: p.location,
          created_by: p.created_by,
          creator_name: creatorProfile?.display_name ?? 'Someone',
          creator_avatar: creatorProfile?.avatar_url ?? null,
          other_members: membersByPlan.get(p.id) ?? [],
        };
      });
    },
    enabled: !!userId,
  });

  // accept — flip rsvp to 'going'; optimistically remove the row from the cache
  // so the invitations list shrinks immediately. Canonical Pattern 5.
  const acceptMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('plan_members')
        .update({ rsvp: 'going' })
        .eq('plan_id', planId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (planId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.status.invitations(userId ?? '') });
      const previous = queryClient.getQueryData<PlanInvitation[]>(
        queryKeys.status.invitations(userId ?? ''),
      );
      queryClient.setQueryData<PlanInvitation[]>(
        queryKeys.status.invitations(userId ?? ''),
        (old) => (old ?? []).filter((inv) => inv.plan_id !== planId),
      );
      return { previous };
    },
    onError: (_err, _planId, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.status.invitations(userId ?? ''), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.status.invitations(userId ?? ''),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.home.invitationCount(userId ?? ''),
      });
    },
  });

  // decline — flip rsvp to 'out'; optimistically remove. Same shape as accept.
  const declineMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('plan_members')
        .update({ rsvp: 'out' })
        .eq('plan_id', planId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (planId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.status.invitations(userId ?? '') });
      const previous = queryClient.getQueryData<PlanInvitation[]>(
        queryKeys.status.invitations(userId ?? ''),
      );
      queryClient.setQueryData<PlanInvitation[]>(
        queryKeys.status.invitations(userId ?? ''),
        (old) => (old ?? []).filter((inv) => inv.plan_id !== planId),
      );
      return { previous };
    },
    onError: (_err, _planId, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.status.invitations(userId ?? ''), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.status.invitations(userId ?? ''),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.home.invitationCount(userId ?? ''),
      });
    },
  });

  const invitations = query.data ?? [];

  return {
    invitations,
    loading: query.isLoading,
    count: invitations.length,
    refetch: async () => query.refetch(),
    accept: async (planId: string) => {
      try {
        await acceptMutation.mutateAsync(planId);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('accept failed') };
      }
    },
    decline: async (planId: string) => {
      try {
        await declineMutation.mutateAsync(planId);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('decline failed') };
      }
    },
  };
}
