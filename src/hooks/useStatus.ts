import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { StatusValue, EmojiTag } from '@/types/app';

export function useStatus() {
  const session = useAuthStore((s) => s.session);
  const [status, setStatus] = useState<StatusValue | null>(null);
  const [contextTag, setContextTag] = useState<EmojiTag>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    }
    setSaving(false);
    return { error: error?.message ?? null };
  }

  return { status, contextTag, loading, saving, updateStatus, updateContextTag };
}
