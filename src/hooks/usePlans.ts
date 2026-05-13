// Phase 31 Plan 04 — Migrated to TanStack Query.
//
// Public shape (UsePlansResult) verbatim-preserved so callsites don't change:
//   { plans, loading, error, refreshing, fetchPlans, handleRefresh, createPlan, rsvp }
//
// The pre-migration hook drove a 3-step join (plan_members -> plans -> members + profiles)
// from a useFocusEffect-triggered fetcher. Migrated shape: ONE useQuery wrapping the
// 3-step join verbatim, plus TWO useMutation blocks:
//   1. rsvp — canonical Pattern 5 (optimistic flip of own member row); invalidates
//      queryKeys.plans.list(userId), queryKeys.plans.detail(planId), and
//      queryKeys.home.upcomingEvents(userId).
//   2. createPlan — `// @mutationShape: no-optimistic` exemption marker (server-side
//      side-effect-heavy: inserts plans row + plan_members rows). Invalidates
//      queryKeys.plans.list(userId) and queryKeys.home.upcomingEvents(userId) on success.
//
// usePlansStore.plans + usePlansStore.lastFetchedAt are stripped in the same commit
// (server-data mirror is replaced by the React Query cache). UI-only field removePlan
// is preserved as a thin cache splice utility on top of queryKeys.plans.list.
//
// Pitfall 10 mitigation: every mutator invalidates queryKeys.home.upcomingEvents(userId)
// (and rsvp also invalidates queryKeys.plans.detail) so cross-screen reactivity
// (home Bento Events tile, plan list, plan detail) all stay in sync.

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import type { PlanWithMembers, PlanMember } from '@/types/plans';

interface CreatePlanInput {
  title: string;
  scheduledFor: Date;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  invitedFriendIds: string[];
  coverImageUrl?: string;
}

export interface UsePlansResult {
  plans: PlanWithMembers[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  fetchPlans: () => Promise<unknown>;
  handleRefresh: () => Promise<unknown>;
  createPlan: (
    input: CreatePlanInput
  ) => Promise<{ planId: string | null; error: Error | null }>;
  rsvp: (
    planId: string,
    status: 'going' | 'maybe' | 'out'
  ) => Promise<{ error: string | null }>;
}

export function usePlans(): UsePlansResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const listKey = queryKeys.plans.list(userId ?? '');

  const query = useQuery({
    queryKey: listKey,
    queryFn: async (): Promise<PlanWithMembers[]> => {
      if (!userId) return [];

      // Step 1: plan_ids the user has accepted (going/maybe only).
      const { data: memberRows, error: memberError } = await supabase
        .from('plan_members')
        .select('plan_id, rsvp')
        .eq('user_id', userId)
        .in('rsvp', ['going', 'maybe']);
      if (memberError) throw new Error(`plan_members query: ${memberError.message}`);

      const planIds = (memberRows ?? []).map((r) => r.plan_id as string);
      if (planIds.length === 0) return [];

      // Step 2: future plans only.
      const { data: planRows, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .in('id', planIds)
        .or(`scheduled_for.gte.${new Date().toISOString()},scheduled_for.is.null`)
        .order('scheduled_for', { ascending: true, nullsFirst: false });
      if (plansError) throw new Error(`plans query: ${plansError.message}`);

      const fetchedPlanIds = (planRows ?? []).map((p) => p.id as string);
      if (fetchedPlanIds.length === 0) return [];

      // Step 3: members for those plans.
      const { data: allMembers, error: membersError } = await supabase
        .from('plan_members')
        .select('plan_id, user_id, rsvp, joined_at')
        .in('plan_id', fetchedPlanIds);
      if (membersError) throw new Error(`members query: ${membersError.message}`);

      // Step 3b: profiles for member user_ids (separate query — PostgREST cannot
      // embed profiles via the auth.users FK).
      const memberUserIds = [...new Set((allMembers ?? []).map((m) => m.user_id as string))];
      let profileMap = new Map<
        string,
        { id: string; display_name: string; avatar_url: string | null }
      >();
      if (memberUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', memberUserIds);
        if (profilesError) throw new Error(`profiles query: ${profilesError.message}`);
        profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      }

      // Step 4: assemble PlanWithMembers[]
      const membersMap = new Map<string, PlanMember[]>();
      for (const m of allMembers ?? []) {
        const planId = m.plan_id as string;
        const memberUserId = m.user_id as string;
        const profile = profileMap.get(memberUserId);
        if (!membersMap.has(planId)) membersMap.set(planId, []);
        membersMap.get(planId)!.push({
          plan_id: planId,
          user_id: memberUserId,
          rsvp: m.rsvp,
          joined_at: m.joined_at,
          profiles: profile ?? { id: memberUserId, display_name: 'Unknown', avatar_url: null },
        } as PlanMember);
      }

      const result: PlanWithMembers[] = (planRows ?? []).map((p) => ({
        id: p.id as string,
        created_by: p.created_by as string,
        title: p.title as string,
        scheduled_for: p.scheduled_for as string | null,
        location: p.location as string | null,
        link_dump: p.link_dump as string | null,
        general_notes: p.general_notes as string | null,
        created_at: p.created_at as string,
        updated_at: p.updated_at as string,
        cover_image_url: p.cover_image_url as string | null,
        latitude: p.latitude as number | null,
        longitude: p.longitude as number | null,
        members: membersMap.get(p.id as string) ?? [],
      }));

      return result;
    },
    enabled: !!userId,
  });

  // rsvp — canonical Pattern 5 mutation (optimistic flip of the caller's own
  // member row). Updates BOTH queryKeys.plans.list(userId) and
  // queryKeys.plans.detail(planId) optimistically; rolls back both on error;
  // invalidates list + detail + home.upcomingEvents on settle.
  const rsvpMutation = useMutation({
    mutationFn: async (input: {
      planId: string;
      status: 'going' | 'maybe' | 'out';
    }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('plan_members')
        .update({ rsvp: input.status })
        .eq('plan_id', input.planId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.plans.list(userId ?? '') });
      await queryClient.cancelQueries({ queryKey: queryKeys.plans.detail(input.planId) });
      const previousList = queryClient.getQueryData<PlanWithMembers[]>(
        queryKeys.plans.list(userId ?? ''),
      );
      const previousDetail = queryClient.getQueryData<PlanWithMembers>(
        queryKeys.plans.detail(input.planId),
      );
      // Defensive: only mutate the caller's own member row (T-31-14).
      queryClient.setQueryData<PlanWithMembers[]>(
        queryKeys.plans.list(userId ?? ''),
        (old) =>
          old?.map((p) =>
            p.id === input.planId
              ? {
                  ...p,
                  members: p.members.map((m) =>
                    m.user_id === userId ? { ...m, rsvp: input.status } : m,
                  ),
                }
              : p,
          ) ?? [],
      );
      queryClient.setQueryData<PlanWithMembers | undefined>(
        queryKeys.plans.detail(input.planId),
        (old) =>
          old
            ? {
                ...old,
                members: old.members.map((m) =>
                  m.user_id === userId ? { ...m, rsvp: input.status } : m,
                ),
              }
            : old,
      );
      return { previousList, previousDetail };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.previousList) {
        queryClient.setQueryData(queryKeys.plans.list(userId ?? ''), ctx.previousList);
      }
      if (ctx?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.plans.detail(input.planId),
          ctx.previousDetail,
        );
      }
    },
    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.list(userId ?? '') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.detail(input.planId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.home.upcomingEvents(userId ?? ''),
      });
    },
  });

  // createPlan — RPC creates `plans` row + `plan_members` rows server-side.
  // Side-effect-heavy: skip optimistic write (the new plan_id is unknown until
  // the server returns). On success invalidate plans.list + home.upcomingEvents.
  // @mutationShape: no-optimistic
  const createMutation = useMutation({
    mutationFn: async (input: CreatePlanInput) => {
      if (!userId) throw new Error('Not authenticated');

      // Step 1: insert plan row
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .insert({
          title: input.title,
          scheduled_for: input.scheduledFor.toISOString(),
          location: input.location || null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          created_by: userId,
          cover_image_url: input.coverImageUrl ?? null,
        })
        .select('id')
        .single();

      if (planError) throw new Error(planError.message);
      const planId = plan.id as string;

      // Step 2: insert plan_members rows (creator going + invitees as invited)
      const memberRows = [
        { plan_id: planId, user_id: userId, rsvp: 'going' as const },
        ...input.invitedFriendIds.map((friendId) => ({
          plan_id: planId,
          user_id: friendId,
          rsvp: 'invited' as const,
        })),
      ];
      const { error: membersError } = await supabase.from('plan_members').insert(memberRows);
      if (membersError) {
        // Plan row was inserted but member rows failed — still return the planId so
        // the caller can surface a partial-failure error.
        const err = new Error(membersError.message);
        (err as Error & { planId?: string }).planId = planId;
        throw err;
      }

      return { planId };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.list(userId ?? '') });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.home.upcomingEvents(userId ?? ''),
      });
    },
  });

  const handleRefresh = useCallback(async () => query.refetch(), [query]);

  return {
    plans: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refreshing: query.isFetching && !query.isLoading,
    fetchPlans: query.refetch,
    handleRefresh,
    createPlan: async (input: CreatePlanInput) => {
      try {
        const { planId } = await createMutation.mutateAsync(input);
        return { planId, error: null };
      } catch (err) {
        const partial = (err as Error & { planId?: string }).planId ?? null;
        return {
          planId: partial,
          error: err instanceof Error ? err : new Error('createPlan failed'),
        };
      }
    },
    rsvp: async (planId: string, status: 'going' | 'maybe' | 'out') => {
      try {
        await rsvpMutation.mutateAsync({ planId, status });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'rsvp failed' };
      }
    },
  };
}
