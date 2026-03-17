import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export function usePendingRequestsCount(): { count: number; refetch: () => void } {
  const session = useAuthStore((s) => s.session);
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!session?.user) {
      setCount(0);
      return;
    }
    const { count: result } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('addressee_id', session.user.id)
      .eq('status', 'pending');

    setCount(result ?? 0);
  }, [session]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { count, refetch };
}
