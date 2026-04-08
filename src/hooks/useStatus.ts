// Phase 2 v1.3 — Heartbeat-aware status hook (D-33, D-34, OVR-02, OVR-03).
//
// Reads: public.effective_status view (D-16 view is source of truth).
// Writes: public.statuses table (views are not writable).
// Cross-screen sync: Zustand useStatusStore (replaces D-25 react-query plan).
// Debounce: module-scope lastTouchAt ref, 60s floor (D-34, T-02-15 mitigation).
// Signout: module-scope useAuthStore.subscribe clears store (T-02-16 mitigation).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStatusStore } from '@/stores/useStatusStore';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { computeWindowExpiry } from '@/lib/windows';
import type { StatusValue, WindowId, CurrentStatus, HeartbeatState } from '@/types/app';
import { markPushPromptEligible } from '@/hooks/usePushNotifications';

// ---------------------------------------------------------------------------
// Auth listener (module scope) — clears cached status on signout.
// Mitigates T-02-16: cached currentStatus must not bleed across sessions.
// Subscribed exactly once per JS module load (not per hook render).
// ---------------------------------------------------------------------------
let authListenerInstalled = false;
function installAuthListenerOnce() {
  if (authListenerInstalled) return;
  authListenerInstalled = true;
  useAuthStore.subscribe((state, prev) => {
    if (prev?.session && !state.session) {
      useStatusStore.getState().clear();
    }
  });
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
    windowId: WindowId
  ) => Promise<{ error: string | null }>;
  touch: () => Promise<void>;
}

export function useStatus(): UseStatusResult {
  installAuthListenerOnce();

  const session = useAuthStore((s) => s.session);
  const currentStatus = useStatusStore((s) => s.currentStatus);
  const setCurrentStatus = useStatusStore((s) => s.setCurrentStatus);
  const updateLastActive = useStatusStore((s) => s.updateLastActive);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Hydrate from effective_status view on session change (OVR-03).
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('effective_status')
      .select('effective_status, context_tag, status_expires_at, last_active_at')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data && data.effective_status) {
          setCurrentStatus({
            status: data.effective_status as StatusValue,
            context_tag: (data.context_tag as string | null) ?? null,
            status_expires_at: data.status_expires_at as string,
            last_active_at: data.last_active_at as string,
          });
        } else {
          setCurrentStatus(null);
        }
        setLoading(false);
      });
  }, [session, setCurrentStatus]);

  const setStatus = useCallback(
    async (
      mood: StatusValue,
      tag: string | null,
      windowId: WindowId
    ): Promise<{ error: string | null }> => {
      if (!session) return { error: 'Not ready' };
      setSaving(true);

      const now = new Date();
      const expiry = computeWindowExpiry(windowId, now);
      const nowIso = now.toISOString();
      const expiryIso = expiry.toISOString();

      const { error } = await supabase.from('statuses').upsert(
        {
          user_id: session.user.id,
          status: mood,
          context_tag: tag,
          status_expires_at: expiryIso,
          last_active_at: nowIso,
        },
        { onConflict: 'user_id' }
      );

      if (!error) {
        setCurrentStatus({
          status: mood,
          context_tag: tag,
          status_expires_at: expiryIso,
          last_active_at: nowIso,
        });
        // PUSH-08 (Plan 01): mark push-prompt eligibility on first meaningful action.
        markPushPromptEligible().catch(() => {});
        // Reset touch debounce — we just wrote last_active_at.
        lastTouchAt = Date.now();
      }
      setSaving(false);
      return { error: error?.message ?? null };
    },
    [session, setCurrentStatus]
  );

  const touch = useCallback(async (): Promise<void> => {
    if (!session) return;
    const nowMs = Date.now();
    if (nowMs - lastTouchAt < TOUCH_DEBOUNCE_MS) return; // D-34
    lastTouchAt = nowMs;

    const nowIso = new Date(nowMs).toISOString();
    const { error } = await supabase
      .from('statuses')
      .update({ last_active_at: nowIso })
      .eq('user_id', session.user.id);
    if (!error) {
      updateLastActive(nowIso);
    }
  }, [session, updateLastActive]);

  const heartbeatState = useMemo<HeartbeatState>(
    () =>
      computeHeartbeatState(
        currentStatus?.status_expires_at ?? null,
        currentStatus?.last_active_at ?? null
      ),
    [currentStatus?.status_expires_at, currentStatus?.last_active_at]
  );

  return {
    currentStatus,
    loading,
    saving,
    heartbeatState,
    setStatus,
    touch,
  };
}
