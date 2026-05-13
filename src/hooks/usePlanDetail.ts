// Phase 31 Plan 04 — Migrated to TanStack Query.
//
// Public shape verbatim-preserved:
//   { plan, loading, error, refetch, updateRsvp, updatePlanDetails, deletePlan }
//
// Migration delta:
//   - 5 useState slots collapse into one useQuery({ queryKey: queryKeys.plans.detail(planId) })
//     whose queryFn performs Promise.all over the independent reads (plan row +
//     members + profiles) followed by an O(N) profile-merge.
//   - Mutators (updateRsvp, updatePlanDetails, deletePlan) stay as plain async
//     functions matching the pre-migration signature; on success they invalidate
//     the plans.detail / plans.list / home.upcomingEvents keys so cross-screen
//     reactivity is preserved without a callsite change.
//
// Mirrors the Wave 2 useHabitDetail.ts pattern: single useQuery + parallel reads
// inside the queryFn; composite return unpacked at the hook exit.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import type { PlanWithMembers, PlanMember } from '@/types/plans';

export function usePlanDetail(planId: string): {
  plan: PlanWithMembers | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  updateRsvp: (newRsvp: 'going' | 'maybe' | 'out') => Promise<{ error: Error | null }>;
  updatePlanDetails: (updates: {
    title?: string;
    scheduled_for?: string;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    cover_image_url?: string | null;
  }) => Promise<{ error: Error | null }>;
  deletePlan: () => Promise<{ error: Error | null }>;
} {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const detailKey = queryKeys.plans.detail(planId);

  const query = useQuery({
    queryKey: detailKey,
    queryFn: async (): Promise<PlanWithMembers | null> => {
      if (!planId) return null;

      // Parallel reads of plan row + member rows. The profile join is sequenced
      // after these complete because it depends on memberRows.user_id values.
      const [
        { data: planRow, error: planError },
        { data: memberRows, error: membersError },
      ] = await Promise.all([
        supabase.from('plans').select('*').eq('id', planId).single(),
        supabase
          .from('plan_members')
          .select('plan_id, user_id, rsvp, joined_at')
          .eq('plan_id', planId),
      ]);

      if (planError) throw new Error(planError.message);
      if (membersError) throw new Error(membersError.message);

      const memberUserIds = (memberRows ?? []).map((m) => m.user_id as string);
      let profileMap = new Map<
        string,
        { id: string; display_name: string; avatar_url: string | null }
      >();
      if (memberUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', memberUserIds);
        if (profilesError) throw new Error(profilesError.message);
        profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      }

      const assembledMembers: PlanMember[] = (memberRows ?? []).map((m) => {
        const mUserId = m.user_id as string;
        const profile = profileMap.get(mUserId);
        return {
          plan_id: m.plan_id as string,
          user_id: mUserId,
          rsvp: m.rsvp,
          joined_at: m.joined_at,
          profiles: profile ?? { id: mUserId, display_name: 'Unknown', avatar_url: null },
        } as PlanMember;
      });

      const result: PlanWithMembers = {
        id: planRow.id as string,
        created_by: planRow.created_by as string,
        title: planRow.title as string,
        scheduled_for: planRow.scheduled_for as string | null,
        location: planRow.location as string | null,
        link_dump: planRow.link_dump as string | null,
        general_notes: planRow.general_notes as string | null,
        created_at: planRow.created_at as string,
        updated_at: planRow.updated_at as string,
        cover_image_url: planRow.cover_image_url as string | null,
        latitude: planRow.latitude as number | null,
        longitude: planRow.longitude as number | null,
        members: assembledMembers,
      };
      return result;
    },
    enabled: !!userId && !!planId,
  });

  const updateRsvp = useCallback(
    async (newRsvp: 'going' | 'maybe' | 'out'): Promise<{ error: Error | null }> => {
      if (!userId) return { error: new Error('Not authenticated') };
      const { error } = await supabase
        .from('plan_members')
        .update({ rsvp: newRsvp })
        .eq('plan_id', planId)
        .eq('user_id', userId);
      if (error) return { error: new Error(error.message) };
      // Cross-screen reactivity: refresh detail + list + home tile.
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.list(userId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.home.upcomingEvents(userId),
      });
      return { error: null };
    },
    [planId, userId, queryClient, detailKey],
  );

  const updatePlanDetails = useCallback(
    async (updates: {
      title?: string;
      scheduled_for?: string;
      location?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      cover_image_url?: string | null;
    }): Promise<{ error: Error | null }> => {
      if (!userId) return { error: new Error('Not authenticated') };
      // (supabase as any) cast: PostgREST .select('cols', {count}) overload not
      // typed in current database.ts (Phase 29.1 decision in STATE.md —
      // database.ts regeneration deferred). Same pattern as Wave 3 hooks.
      const { error, count } = await (supabase as any)
        .from('plans')
        .update(updates)
        .eq('id', planId)
        .select('id', { count: 'exact' });
      if (error) return { error: new Error(error.message) };
      if (count === 0) return { error: new Error('Update blocked — check RLS policies') };
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.list(userId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.home.upcomingEvents(userId),
      });
      return { error: null };
    },
    [planId, userId, queryClient, detailKey],
  );

  const deletePlan = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!userId) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId)
      .eq('created_by', userId);
    if (error) return { error: new Error(error.message) };
    void queryClient.invalidateQueries({ queryKey: detailKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.plans.list(userId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.home.upcomingEvents(userId),
    });
    return { error: null };
  }, [planId, userId, queryClient, detailKey]);

  return {
    plan: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    updateRsvp,
    updatePlanDetails,
    deletePlan,
  };
}
