// Phase 33 — Bio-only mutation hook (D-14 / REQ-FP-03).
//
// Scoped to a single column so the existing /profile/edit display_name + birthday
// raw-write path (src/app/profile/edit.tsx:79-88) stays untouched — Phase 31 "no
// scope creep" convention. Bio is the ONLY write that needs Pattern 5 here because
// it's the only field the friend profile screen reads via TanStack Query (Plan 02
// useFriendProfile shares the queryKeys.friends.detail(userId) cache slot).
//
// Pattern 5 verbatim: optimistic flip on profiles.bio, rollback on error,
// invalidate on settle. mutationShape regression gate at
// src/hooks/__tests__/mutationShape.test.ts will pass WITHOUT an exemption marker.

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';

// Cache-slot shape this hook flips — matches the shape useFriendProfile (Plan 02)
// will publish into queryKeys.friends.detail(userId). The optimistic write only
// has to mutate the .profile.bio field; the rest of the slot stays untouched.
interface FriendProfileSlot {
  profile: { bio: string | null; [k: string]: unknown } | null;
  [k: string]: unknown;
}

export interface UseUpdateMyBioResult {
  updateBio: (bio: string | null) => Promise<{ error: string | null }>;
  saving: boolean;
}

export function useUpdateMyBio(): UseUpdateMyBioResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { bio: string | null }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ bio: input.bio, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      return input.bio;
    },
    onMutate: async (input: { bio: string | null }) => {
      if (!userId) return { previous: undefined };
      const key = queryKeys.friends.detail(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FriendProfileSlot | null>(key);
      queryClient.setQueryData<FriendProfileSlot | null>(key, (old) =>
        old && old.profile ? { ...old, profile: { ...old.profile, bio: input.bio } } : old
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (!userId) return;
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.friends.detail(userId), ctx.previous);
      }
    },
    onSettled: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends.detail(userId) });
    },
  });

  const updateBio = useCallback(
    async (bio: string | null): Promise<{ error: string | null }> => {
      if (!session) return { error: 'Not ready' };
      try {
        await mutation.mutateAsync({ bio });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'updateBio failed' };
      }
    },
    [session, mutation]
  );

  return { updateBio, saving: mutation.isPending };
}
