// Phase 9 v1.4 — useIOUSummary hook (IOU-03, IOU-05).
// Wraps get_iou_summary() RPC (migration 0015 Section 9).
// Returns per-friend rows for the balance index screen AND
// aggregated netCents + unsettledCount for IOUCard.
// Errors are silent: fall back to empty state, warn to console.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface IOUSummaryRow {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  net_amount_cents: number;
  unsettled_count: number;
}

export interface IOUSummaryData {
  rows: IOUSummaryRow[];       // per-friend rows (balance index screen)
  netCents: number;             // aggregate: sum of all net_amount_cents (IOUCard)
  unsettledCount: number;       // aggregate: sum of all unsettled_count (IOUCard)
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useIOUSummary(): IOUSummaryData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [rows, setRows] = useState<IOUSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_iou_summary');
    if (rpcErr) {
      console.warn('get_iou_summary failed', rpcErr);
      setError(rpcErr.message);
      setRows([]);
    } else {
      setRows((data ?? []) as IOUSummaryRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const netCents = rows.reduce((sum, r) => sum + r.net_amount_cents, 0);
  const unsettledCount = rows.reduce((sum, r) => sum + r.unsettled_count, 0);

  return { rows, netCents, unsettledCount, loading, error, refetch };
}
