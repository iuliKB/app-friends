// Phase 31 Plan 05 — Migrated to TanStack Query.
// Wraps get_iou_summary() RPC (migration 0015 Section 9).
// Public shape preserved verbatim: { rows, netCents, unsettledCount, loading, error, refetch }.
// netCents + unsettledCount are derived from query.data via .reduce in the return block
// (same as pre-migration; cheap, runs on every render).
// Errors are silent: fall back to empty state.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

export interface IOUSummaryRow {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  net_amount_cents: number;
  unsettled_count: number;
}

export interface IOUSummaryData {
  rows: IOUSummaryRow[]; // per-friend rows (balance index screen)
  netCents: number; // aggregate: sum of all net_amount_cents (IOUCard)
  unsettledCount: number; // aggregate: sum of all unsettled_count (IOUCard)
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export function useIOUSummary(): IOUSummaryData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.expenses.iouSummary(userId ?? ''),
    queryFn: async (): Promise<IOUSummaryRow[]> => {
      const { data, error } = await supabase.rpc('get_iou_summary');
      if (error) throw error;
      return ((data ?? []) as unknown) as IOUSummaryRow[];
    },
    enabled: !!userId,
  });

  const rows = query.data ?? [];
  const netCents = rows.reduce((sum, r) => sum + r.net_amount_cents, 0);
  const unsettledCount = rows.reduce((sum, r) => sum + r.unsettled_count, 0);

  return {
    rows,
    netCents,
    unsettledCount,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
