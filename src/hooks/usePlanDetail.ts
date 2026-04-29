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
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    cover_image_url?: string | null;
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

      const { data: memberRows, error: membersError } = await supabase
        .from('plan_members')
        .select('plan_id, user_id, rsvp, joined_at')
        .eq('plan_id', planId);

      if (membersError) {
        setError(membersError.message);
        setLoading(false);
        return;
      }

      // Fetch profiles separately to avoid PostgREST join issues
      const memberUserIds = (memberRows ?? []).map((m) => m.user_id as string);
      let profileMap = new Map<string, { id: string; display_name: string; avatar_url: string | null }>();

      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', memberUserIds);

        profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      }

      const assembledMembers: PlanMember[] = (memberRows ?? []).map((m) => {
        const userId = m.user_id as string;
        const profile = profileMap.get(userId);
        return {
          plan_id: m.plan_id as string,
          user_id: userId,
          rsvp: m.rsvp,
          joined_at: m.joined_at,
          profiles: profile ?? { id: userId, display_name: 'Unknown', avatar_url: null },
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
    location?: string | null;
    latitude?: number | null;     // Phase 20 MAP-01
    longitude?: number | null;    // Phase 20 MAP-01
    cover_image_url?: string | null; // D-14 edit cover image
  }): Promise<{ error: Error | null }> {
    if (!session?.user) return { error: new Error('Not authenticated') };

    const { error, count } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', planId)
      .select();

    if (error) return { error };
    if (count === 0) return { error: new Error('Update blocked — check RLS policies') };
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
