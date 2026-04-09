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
import { scheduleExpiryNotification, cancelExpiryNotification } from '@/lib/expiryScheduler';

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
      // Phase 3 EXPIRY-01 — tear down scheduled expiry notification on signout
      cancelExpiryNotification().catch(() => {});
    }
  });
}

// ---------------------------------------------------------------------------
// Phase 3 FREE-06 / D-14, D-15 — timezone sync with Hermes iOS guard.
// Called from the hydrate effect on session change. Fire-and-forget; silent on error.
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

  // Only write if value differs from what's stored
  const { data: existing } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();
  if (existing?.timezone === tz) return;

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
    // Phase 3 — timezone sync (D-15). Fire-and-forget, does not gate loading state.
    syncDeviceTimezone(session.user.id).catch(() => {});
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
            window_id: null, // Server doesn't store window_id; re-derived only on client setStatus
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
          window_id: windowId, // Phase 3 — carry for Keep-it action (CONTEXT D-03)
        });
        // Phase 3 EXPIRY-01 — schedule 30-min-before-expiry local notification (D-01, D-02)
        scheduleExpiryNotification(expiry, mood).catch(() => {});
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
