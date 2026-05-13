// Phase 31 Plan 06 — Migrated to hybrid TanStack Query + useStatusStore mirror.
//
// HYBRID PATTERN (research Open Q #3; 31-PATTERNS.md line 430):
//   - useStatusStore.currentStatus STAYS — _layout.tsx:106-111 (notification
//     dispatcher) reads it synchronously from OUTSIDE the React tree. That read
//     path is the load-bearing constraint that keeps the store alive.
//   - FETCHING moves into useQuery(queryKeys.status.own(userId)).
//   - The query result is mirrored into useStatusStore via a useEffect so the
//     dispatcher always sees the freshest value.
//   - setMutation onMutate writes BOTH setQueryData AND
//     useStatusStore.getState().setCurrentStatus — they stay in sync during the
//     optimistic window. onError restores BOTH from ctx.previous.
//   - The auth listener that previously cleared useStatusStore on SIGNED_OUT in
//     this file MOVED to authBridge.ts (Task 4). The notification-side cleanup
//     halves (cancelExpiryNotification / cancelMorningPrompt) STAY here as a
//     dedicated module-scope listener.
//
// Public shape (UseStatusResult) verbatim-preserved so the 5 consumers (
// _layout.tsx, (tabs)/_layout.tsx, MoodPicker, ReEngagementBanner, OwnStatusPill,
// HomeScreen, OwnStatusCard) need zero edits.

import { useEffect, useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStatusStore } from '@/stores/useStatusStore';
import { queryKeys } from '@/lib/queryKeys';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { computeWindowExpiry } from '@/lib/windows';
import type { StatusValue, WindowId, CurrentStatus, HeartbeatState } from '@/types/app';
import { markPushPromptEligible } from '@/hooks/usePushNotifications';
import { scheduleExpiryNotification, cancelExpiryNotification } from '@/lib/expiryScheduler';
import { cancelMorningPrompt } from '@/lib/morningPrompt';

// ---------------------------------------------------------------------------
// Notification-side cleanup on sign-out — kept here because notifications are
// status-domain side effects, not generic cache concerns. The store-clear half
// moved to authBridge.ts (Task 4) so cache + status-store reset together.
// ---------------------------------------------------------------------------
let notificationListenerInstalled = false;
function installNotificationCleanupOnce() {
  if (notificationListenerInstalled) return;
  notificationListenerInstalled = true;
  useAuthStore.subscribe((state, prev) => {
    if (prev?.session && !state.session) {
      cancelExpiryNotification().catch(() => {});
      cancelMorningPrompt().catch(() => {});
    }
  });
}
installNotificationCleanupOnce();

// ---------------------------------------------------------------------------
// Phase 3 FREE-06 / D-14, D-15 — timezone sync with Hermes iOS guard.
// Called fire-and-forget on session change. Silent on error.
// ---------------------------------------------------------------------------
async function syncDeviceTimezone(userId: string): Promise<void> {
  let tz: string | null = null;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    tz = null;
  }
  // Hermes iOS fallback: if we got 'UTC' but the device offset is non-zero, it's lying.
  // See RESEARCH Pitfall 1 + github.com/facebook/hermes/issues/1172.
  if (tz === 'UTC' && new Date().getTimezoneOffset() !== 0) {
    tz = null;
  }
  if (!tz) return; // Fail-open per D-16 — Edge Function falls back to UTC

  const { data: existing } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();
  if ((existing as { timezone?: string | null } | null)?.timezone === tz) return;

  await supabase.from('profiles').update({ timezone: tz }).eq('id', userId);
}

// ---------------------------------------------------------------------------
// touch() debounce state (module scope) — 60s per D-34.
// Mitigates T-02-15: prevents touch spam during rapid background/foreground
// cycling by short-circuiting writes within the debounce window.
// ---------------------------------------------------------------------------
const TOUCH_DEBOUNCE_MS = 60_000;
let lastTouchAt = 0;

export interface UseStatusResult {
  currentStatus: CurrentStatus | null;
  loading: boolean;
  saving: boolean;
  heartbeatState: HeartbeatState;
  setStatus: (
    mood: StatusValue,
    tag: string | null,
    windowId: WindowId,
    customExpiry?: Date
  ) => Promise<{ error: string | null }>;
  touch: () => Promise<void>;
}

interface SetStatusInput {
  mood: StatusValue;
  tag: string | null;
  windowId: WindowId;
  customExpiry?: Date;
}

export function useStatus(): UseStatusResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const key = queryKeys.status.own(userId ?? '');

  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<CurrentStatus | null> => {
      if (!userId) return null;
      // Fire-and-forget timezone sync alongside the hydrate read.
      syncDeviceTimezone(userId).catch(() => {});
      const { data, error } = await supabase
        .from('effective_status')
        .select('effective_status, context_tag, status_expires_at, last_active_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      const row = data as
        | {
            effective_status: StatusValue | null;
            context_tag: string | null;
            status_expires_at: string;
            last_active_at: string;
          }
        | null;
      if (!row || !row.effective_status) return null;
      return {
        status: row.effective_status,
        context_tag: row.context_tag ?? null,
        status_expires_at: row.status_expires_at,
        last_active_at: row.last_active_at,
        window_id: null,
      };
    },
    enabled: !!userId,
  });

  // Mirror the query result into useStatusStore so the notification dispatcher
  // in _layout.tsx (outside the React tree) keeps reading the freshest value.
  // This is the load-bearing line for the hybrid pattern — research Open Q #3.
  useEffect(() => {
    if (query.data !== undefined) {
      useStatusStore.getState().setCurrentStatus(query.data);
    }
  }, [query.data]);

  const setMutation = useMutation({
    mutationFn: async (input: SetStatusInput) => {
      if (!userId) throw new Error('Not ready');
      const now = new Date();
      const expiry = input.customExpiry ?? computeWindowExpiry(input.windowId, now);
      const nowIso = now.toISOString();
      const expiryIso = expiry.toISOString();

      const { error } = await supabase.from('statuses').upsert(
        {
          user_id: userId,
          status: input.mood,
          context_tag: input.tag,
          status_expires_at: expiryIso,
          last_active_at: nowIso,
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;

      // Schedule the expiry notification on success only.
      scheduleExpiryNotification(expiry, input.mood).catch(() => {});
      markPushPromptEligible().catch(() => {});
      lastTouchAt = Date.now();

      return {
        status: input.mood,
        context_tag: input.tag,
        status_expires_at: expiryIso,
        last_active_at: nowIso,
        window_id: input.customExpiry !== undefined ? null : input.windowId,
      } satisfies CurrentStatus;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.status.own(userId ?? '') });
      const previous = queryClient.getQueryData<CurrentStatus | null>(
        queryKeys.status.own(userId ?? ''),
      );

      const now = new Date();
      const expiry = input.customExpiry ?? computeWindowExpiry(input.windowId, now);
      const optimistic: CurrentStatus = {
        status: input.mood,
        context_tag: input.tag,
        status_expires_at: expiry.toISOString(),
        last_active_at: now.toISOString(),
        window_id: input.customExpiry !== undefined ? null : input.windowId,
      };

      queryClient.setQueryData<CurrentStatus | null>(
        queryKeys.status.own(userId ?? ''),
        optimistic,
      );
      // Mirror to useStatusStore (outside-React read path).
      useStatusStore.getState().setCurrentStatus(optimistic);

      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData<CurrentStatus | null>(
          queryKeys.status.own(userId ?? ''),
          ctx.previous,
        );
        useStatusStore.getState().setCurrentStatus(ctx.previous as CurrentStatus | null);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.status.own(userId ?? '') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.friends(userId ?? '') });
    },
  });

  const setStatus = useCallback(
    async (
      mood: StatusValue,
      tag: string | null,
      windowId: WindowId,
      customExpiry?: Date,
    ): Promise<{ error: string | null }> => {
      if (!session) return { error: 'Not ready' };
      setSaving(true);
      try {
        await setMutation.mutateAsync({ mood, tag, windowId, customExpiry });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'setStatus failed' };
      } finally {
        setSaving(false);
      }
    },
    [session, setMutation],
  );

  const touch = useCallback(async (): Promise<void> => {
    if (!session || !userId) return;
    const nowMs = Date.now();
    if (nowMs - lastTouchAt < TOUCH_DEBOUNCE_MS) return; // D-34
    lastTouchAt = nowMs;

    const nowIso = new Date(nowMs).toISOString();
    const { error } = await supabase
      .from('statuses')
      .update({ last_active_at: nowIso })
      .eq('user_id', userId);
    if (!error) {
      useStatusStore.getState().updateLastActive(nowIso);
      // Also mirror into the cache so the next render reads the fresh value.
      queryClient.setQueryData<CurrentStatus | null>(
        queryKeys.status.own(userId),
        (old) => (old ? { ...old, last_active_at: nowIso } : old),
      );
    }
  }, [session, userId, queryClient]);

  const currentStatus = query.data ?? null;

  const heartbeatState = useMemo<HeartbeatState>(
    () =>
      computeHeartbeatState(
        currentStatus?.status_expires_at ?? null,
        currentStatus?.last_active_at ?? null,
      ),
    [currentStatus?.status_expires_at, currentStatus?.last_active_at],
  );

  return {
    currentStatus,
    loading: query.isLoading,
    saving,
    heartbeatState,
    setStatus,
    touch,
  };
}
