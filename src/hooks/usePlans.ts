import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePlansStore } from '@/stores/usePlansStore';
import type { PlanWithMembers, PlanMember } from '@/types/plans';

interface CreatePlanInput {
  title: string;
  scheduledFor: Date;
  location: string;
  invitedFriendIds: string[];
}

export function usePlans(): {
  plans: PlanWithMembers[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  fetchPlans: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  createPlan: (input: CreatePlanInput) => Promise<{ planId: string | null; error: Error | null }>;
} {
  const session = useAuthStore((s) => s.session);
  const { plans, setPlans } = usePlansStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchPlans(): Promise<void> {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: get plan_ids the user is a member of
      const { data: memberRows, error: memberError } = await supabase
        .from('plan_members')
        .select('plan_id')
        .eq('user_id', session.user.id);

      if (memberError) {
        setError(memberError.message);
        setLoading(false);
        return;
      }

      const planIds = (memberRows ?? []).map((r) => r.plan_id as string);

      if (planIds.length === 0) {
        setPlans([]);
        setLoading(false);
        return;
      }

      // Step 2: get future plans
      const { data: planRows, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .in('id', planIds)
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true });

      if (plansError) {
        setError(plansError.message);
        setLoading(false);
        return;
      }

      const fetchedPlanIds = (planRows ?? []).map((p) => p.id as string);

      if (fetchedPlanIds.length === 0) {
        setPlans([]);
        setLoading(false);
        return;
      }

      // Step 3: get all members for those plans with profiles
      const { data: allMembers, error: membersError } = await supabase
        .from('plan_members')
        .select('plan_id, user_id, rsvp, joined_at, profiles ( id, display_name, avatar_url )')
        .in('plan_id', fetchedPlanIds);

      if (membersError) {
        setError(membersError.message);
        setLoading(false);
        return;
      }

      // Step 4: assemble PlanWithMembers[]
      const membersMap = new Map<string, PlanMember[]>();
      for (const m of allMembers ?? []) {
        const planId = m.plan_id as string;
        if (!membersMap.has(planId)) membersMap.set(planId, []);
        membersMap.get(planId)!.push(m as unknown as PlanMember);
      }

      const result: PlanWithMembers[] = (planRows ?? []).map((p) => ({
        id: p.id as string,
        created_by: p.created_by as string,
        title: p.title as string,
        scheduled_for: p.scheduled_for as string | null,
        location: p.location as string | null,
        link_dump: p.link_dump as string | null,
        iou_notes: p.iou_notes as string | null,
        created_at: p.created_at as string,
        updated_at: p.updated_at as string,
        members: membersMap.get(p.id as string) ?? [],
      }));

      setPlans(result);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoading(false);
    }
  }

  async function createPlan(
    input: CreatePlanInput
  ): Promise<{ planId: string | null; error: Error | null }> {
    if (!session?.user) return { planId: null, error: new Error('Not authenticated') };

    // Step 1: insert plan row
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert({
        title: input.title,
        scheduled_for: input.scheduledFor.toISOString(),
        location: input.location || null,
        created_by: session.user.id,
      })
      .select('id')
      .single();

    if (planError) return { planId: null, error: planError };

    const planId = plan.id as string;

    // Step 2: insert plan_members rows
    const memberRows = [
      { plan_id: planId, user_id: session.user.id, rsvp: 'going' as const },
      ...input.invitedFriendIds.map((friendId) => ({
        plan_id: planId,
        user_id: friendId,
        rsvp: 'invited' as const,
      })),
    ];

    const { error: membersError } = await supabase.from('plan_members').insert(memberRows);

    if (membersError) return { planId: null, error: membersError };

    return { planId, error: null };
  }

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [session?.user?.id])
  );

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    await fetchPlans();
    setRefreshing(false);
  }

  return {
    plans,
    loading,
    error,
    refreshing,
    fetchPlans,
    handleRefresh,
    createPlan,
  };
}
