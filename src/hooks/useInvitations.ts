import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface PlanInvitation {
  plan_id: string;
  title: string;
  scheduled_for: string | null;
  location: string | null;
  created_by: string;
  creator_name: string;
}

export function useInvitations(): {
  invitations: PlanInvitation[];
  loading: boolean;
  count: number;
  refetch: () => Promise<void>;
  accept: (planId: string) => Promise<{ error: Error | null }>;
  decline: (planId: string) => Promise<{ error: Error | null }>;
} {
  const session = useAuthStore((s) => s.session);
  const [invitations, setInvitations] = useState<PlanInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  async function refetch(): Promise<void> {
    if (!session?.user) return;

    setLoading(true);

    // Step 1: get plan_ids where user is invited
    const { data: memberRows, error: memberError } = await supabase
      .from('plan_members')
      .select('plan_id')
      .eq('user_id', session.user.id)
      .eq('rsvp', 'invited');

    if (memberError || !memberRows || memberRows.length === 0) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    const planIds = memberRows.map((r) => r.plan_id as string);

    // Step 2: get plan details
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('id, title, scheduled_for, location, created_by')
      .in('id', planIds)
      .order('scheduled_for', { ascending: true, nullsFirst: false });

    if (plansError || !plans) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    // Step 3: get creator profiles
    const creatorIds = [...new Set(plans.map((p) => p.created_by as string))];
    let creatorMap = new Map<string, string>();

    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', creatorIds);

      creatorMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    }

    const result: PlanInvitation[] = plans.map((p) => ({
      plan_id: p.id as string,
      title: p.title as string,
      scheduled_for: p.scheduled_for as string | null,
      location: p.location as string | null,
      created_by: p.created_by as string,
      creator_name: creatorMap.get(p.created_by as string) ?? 'Someone',
    }));

    setInvitations(result);
    setLoading(false);
  }

  async function accept(planId: string): Promise<{ error: Error | null }> {
    if (!session?.user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('plan_members')
      .update({ rsvp: 'going' })
      .eq('plan_id', planId)
      .eq('user_id', session.user.id);

    if (error) return { error };

    // Remove from local state
    setInvitations((prev) => prev.filter((inv) => inv.plan_id !== planId));
    return { error: null };
  }

  async function decline(planId: string): Promise<{ error: Error | null }> {
    if (!session?.user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('plan_members')
      .update({ rsvp: 'out' })
      .eq('plan_id', planId)
      .eq('user_id', session.user.id);

    if (error) return { error };

    // Remove from local state
    setInvitations((prev) => prev.filter((inv) => inv.plan_id !== planId));
    return { error: null };
  }

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [session?.user?.id])
  );

  return {
    invitations,
    loading,
    count: invitations.length,
    refetch,
    accept,
    decline,
  };
}
