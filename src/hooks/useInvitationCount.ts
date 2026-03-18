import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export function useInvitationCount(): { count: number; refetch: () => void } {
  const session = useAuthStore((s) => s.session);
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!session?.user) {
      setCount(0);
      return;
    }
    const { count: result } = await supabase
      .from('plan_members')
      .select('plan_id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('rsvp', 'invited');

    setCount(result ?? 0);
  }, [session]);

  // Refetch every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return { count, refetch };
}
