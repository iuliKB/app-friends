import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import type { PlaceMarker } from '@/lib/placeDisplay';

const MAX_PLAN_LOCATIONS = 20;

// Two pinned plans within ~50 m collapse to one marker — good enough to dedup
// "the same coffee shop" without a real clustering pass.
function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Distinct map points drawn from the user's plans (past + future) that have
 * coordinates. Powers the "Recent" chip alongside searched-place recents.
 * Read-only, cached by React Query — no billing, separate from usePlans (which
 * only holds upcoming going/maybe plans).
 */
export function useRecentPlanLocations(): PlaceMarker[] {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.plans.recentLocations(userId ?? ''),
    queryFn: async (): Promise<PlaceMarker[]> => {
      if (!userId) return [];

      // Plans the user is a member of (any rsvp), most recent first.
      const { data: memberRows, error: memberError } = await supabase
        .from('plan_members')
        .select('plan_id')
        .eq('user_id', userId);
      if (memberError) throw new Error(`plan_members query: ${memberError.message}`);

      const planIds = [...new Set((memberRows ?? []).map((r) => r.plan_id as string))];
      if (planIds.length === 0) return [];

      const { data: planRows, error: plansError } = await supabase
        .from('plans')
        .select('id, title, location, latitude, longitude, scheduled_for')
        .in('id', planIds)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('scheduled_for', { ascending: false, nullsFirst: false });
      if (plansError) throw new Error(`plans query: ${plansError.message}`);

      const seen = new Set<string>();
      const markers: PlaceMarker[] = [];
      for (const p of planRows ?? []) {
        const lat = p.latitude as number;
        const lng = p.longitude as number;
        const key = coordKey(lat, lng);
        if (seen.has(key)) continue;
        seen.add(key);
        markers.push({
          placeId: `plan:${p.id}`,
          primaryText: (p.location as string | null) ?? (p.title as string),
          secondaryText: p.location ? (p.title as string) : '',
          latitude: lat,
          longitude: lng,
        });
        if (markers.length >= MAX_PLAN_LOCATIONS) break;
      }
      return markers;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return query.data ?? [];
}
