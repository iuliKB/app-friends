import { usePlansStore } from '@/stores/usePlansStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PlanWithMembers } from '@/types/plans';

/**
 * Returns upcoming plans the current user is creator of or RSVP'd as going.
 * D-06: creator OR going (excludes invited-only and declined)
 * D-07: future plans only (scheduled_for > now)
 * D-08: capped at 5, sorted by scheduled_for ascending (soonest first)
 *
 * Filters usePlansStore client-side — no additional network round-trip.
 * Returns [] when store is empty (cold launch). UpcomingEventsSection renders
 * a placeholder card during this window.
 */
export function useUpcomingEvents(): PlanWithMembers[] {
  const plans = usePlansStore((s) => s.plans);
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  if (!userId) return [];

  return plans
    .filter((p) => {
      if (!p.scheduled_for) return false;
      if (new Date(p.scheduled_for) <= new Date()) return false; // D-07
      const isCreator = p.created_by === userId; // D-06
      const isGoing = p.members.some((m) => m.user_id === userId && m.rsvp === 'going');
      return isCreator || isGoing;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime()
    )
    .slice(0, 5); // D-08
}
