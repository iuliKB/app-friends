import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { StatusValue, EmojiTag, CurrentStatus, HeartbeatState, WindowId } from '@/types/app';
import { markPushPromptEligible } from '@/hooks/usePushNotifications';

export function useStatus() {
  const session = useAuthStore((s) => s.session);
  const [status, setStatus] = useState<StatusValue | null>(null);
  const [contextTag, setContextTag] = useState<EmojiTag>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Phase 2 v1.3 — forward-compat surface consumed by MoodPicker / ReEngagementBanner.
  // Plan 02-04 will replace the entire hook body with the real heartbeat-aware
  // implementation; these placeholders exist solely so Wave 2 components compile.
  const [currentStatus] = useState<CurrentStatus | null>(null);
  const [heartbeatState] = useState<HeartbeatState>('alive');
  async function setStatusV2(
    _mood: StatusValue,
    _tag: string | null,
    _windowId: WindowId
  ): Promise<{ error: string | null }> {
    return { error: 'not implemented — replaced by Plan 02-04' };
  }
  async function touch(): Promise<void> {
    // Plan 02-04 will write last_active_at; no-op stub.
  }

  // Fetch on mount
  useEffect(() => {
    if (!session) return;
    supabase
      .from('statuses')
      .select('status, context_tag')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setStatus(data.status as StatusValue);
          setContextTag((data.context_tag as EmojiTag) ?? null);
        }
        setLoading(false);
      });
  }, [session]);

  async function updateStatus(newStatus: StatusValue): Promise<{ error: string | null }> {
    if (!session || saving) return { error: 'Not ready' };
    setSaving(true);
    const { error } = await supabase
      .from('statuses')
      .update({ status: newStatus })
      .eq('user_id', session.user.id);
    if (!error) {
      setStatus(newStatus);
      // PUSH-08 (D-01): mark eligibility on first meaningful action.
      // Idempotent — safe to call on every successful update.
      markPushPromptEligible().catch(() => {});
    }
    setSaving(false);
    return { error: error?.message ?? null };
  }

  async function updateContextTag(emoji: EmojiTag): Promise<{ error: string | null }> {
    if (!session || saving) return { error: 'Not ready' };
    const nextTag = contextTag === emoji ? null : emoji; // toggle off if same
    setSaving(true);
    const { error } = await supabase
      .from('statuses')
      .update({ context_tag: nextTag })
      .eq('user_id', session.user.id);
    if (!error) {
      setContextTag(nextTag);
      // PUSH-08 (D-01): mark eligibility on first meaningful action.
      markPushPromptEligible().catch(() => {});
    }
    setSaving(false);
    return { error: error?.message ?? null };
  }

  return {
    status,
    contextTag,
    loading,
    saving,
    updateStatus,
    updateContextTag,
    // Phase 2 v1.3 forward-compat surface (Plan 02-04 replaces these stubs)
    currentStatus,
    heartbeatState,
    setStatus: setStatusV2,
    touch,
  };
}
