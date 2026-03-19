import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PlanWithMembers, PlanMember } from '@/types/plans';

export function usePlanDetail(planId: string): {
  plan: PlanWithMembers | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateRsvp: (newRsvp: 'going' | 'maybe' | 'out') => Promise<{ error: Error | null }>;
  updatePlanDetails: (updates: {
    title?: string;
    scheduled_for?: string;
    location?: string;
  }) => Promise<{ error: Error | null }>;
  deletePlan: () => Promise<{ error: Error | null }>;
} {
  const session = useAuthStore((s) => s.session);
  const [plan, setPlan] = useState<PlanWithMembers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refetch(): Promise<void> {
    if (!session?.user || !planId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: planRow, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) {
        setError(planError.message);
        setLoading(false);
        return;
      }

      const { data: members, error: membersError } = await supabase
        .from('plan_members')
        .select('plan_id, user_id, rsvp, joined_at, profiles ( id, display_name, avatar_url )')
        .eq('plan_id', planId);

      if (membersError) {
        setError(membersError.message);
        setLoading(false);
        return;
      }

      const result: PlanWithMembers = {
        id: planRow.id as string,
        created_by: planRow.created_by as string,
        title: planRow.title as string,
        scheduled_for: planRow.scheduled_for as string | null,
        location: planRow.location as string | null,
        link_dump: planRow.link_dump as string | null,
        iou_notes: planRow.iou_notes as string | null,
        created_at: planRow.created_at as string,
        updated_at: planRow.updated_at as string,
        members: (members ?? []) as unknown as PlanMember[],
      };

      setPlan(result);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoading(false);
    }
  }

  async function updateRsvp(newRsvp: 'going' | 'maybe' | 'out'): Promise<{ error: Error | null }> {
    if (!session?.user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('plan_members')
      .update({ rsvp: newRsvp })
      .eq('plan_id', planId)
      .eq('user_id', session.user.id);

    if (error) return { error };
    return { error: null };
  }

  async function updatePlanDetails(updates: {
    title?: string;
    scheduled_for?: string;
    location?: string;
  }): Promise<{ error: Error | null }> {
    if (!session?.user) return { error: new Error('Not authenticated') };

    const { error } = await supabase.from('plans').update(updates).eq('id', planId);

    if (error) return { error };
    return { error: null };
  }

  async function deletePlan(): Promise<{ error: Error | null }> {
    if (!session?.user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId)
      .eq('created_by', session.user.id);

    if (error) return { error };
    return { error: null };
  }

  useEffect(() => {
    refetch();
  }, [planId, session?.user?.id]);

  return {
    plan,
    loading,
    error,
    refetch,
    updateRsvp,
    updatePlanDetails,
    deletePlan,
  };
}
