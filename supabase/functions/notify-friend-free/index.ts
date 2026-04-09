// Phase 3 v1.3 — notify-friend-free Edge Function.
// Consumes the dispatch_free_transition webhook payload, runs the rate-limit gauntlet
// per candidate, sends Expo pushes, and logs every decision to friend_free_pushes.
// Mirrors supabase/functions/notify-plan-invite/index.ts structure; see
// .planning/phases/03-friend-went-free-loop/03-CONTEXT.md D-10..D-16 and
// .planning/phases/03-friend-went-free-loop/03-RESEARCH.md Pattern 2.
import { createClient } from 'npm:@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT';
  table: 'free_transitions';
  schema: 'public';
  record: {
    id: number;
    sender_id: string;
    occurred_at: string;
    context_tag: string | null;
    sent_at: string | null;
    attempts: number;
    last_error: string | null;
  };
  old_record: null;
}

type SuppressionReason =
  | 'pair_15min'
  | 'recipient_5min'
  | 'daily_cap'
  | 'quiet_hours'
  | 'recipient_busy'
  | 'recipient_disabled_pref'
  | 'recipient_invalidated_token'
  | 'self';

interface Candidate {
  recipient_id: string;
  notify_friend_free: boolean;
  effective_status: 'free' | 'busy' | 'maybe' | null;
  local_hour: number | null;
  push_tokens: string[];
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function logDecision(
  recipient_id: string,
  sender_id: string,
  suppressed: boolean,
  reason: SuppressionReason | null
): Promise<void> {
  await supabase.from('friend_free_pushes').insert({
    recipient_id,
    sender_id,
    sent_at: new Date().toISOString(),
    suppressed,
    suppression_reason: reason,
  });
}

Deno.serve(async (req) => {
  const payload = (await req.json()) as WebhookPayload;
  const { record } = payload;
  const senderId = record.sender_id;

  try {
    // 1. Fetch sender display name (for push body)
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', senderId)
      .single();
    const senderName = sender?.display_name ?? 'Someone';

    // 2. Fetch all candidate recipients via RPC
    const { data: candidatesRaw, error: rpcError } = await supabase.rpc(
      'get_friend_free_candidates',
      { p_sender: senderId }
    );
    if (rpcError) throw rpcError;
    const candidates = (candidatesRaw ?? []) as Candidate[];

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    for (const c of candidates) {
      // --- Rate-limit gauntlet (D-10..D-16 order) ---

      // self (shouldn't happen since RPC filters p.id <> p_sender, but defense-in-depth)
      if (c.recipient_id === senderId) {
        await logDecision(c.recipient_id, senderId, true, 'self');
        continue;
      }

      // recipient disabled the preference (FREE-07)
      if (!c.notify_friend_free) {
        await logDecision(c.recipient_id, senderId, true, 'recipient_disabled_pref');
        continue;
      }

      // recipient is Busy OR DEAD (effective_status=null) (FREE-02)
      // 'maybe' and 'free' are allowed; 'busy' blocks; null (DEAD heartbeat) blocks
      //
      // NOTE (CONTEXT D-11): effective_status === null means either literal 'busy' OR DEAD heartbeat.
      // The D-11 suppression_reason enum does not distinguish these two states — both are logged
      // as 'recipient_busy'. This conflation is accepted for v1.3; a dedicated 'recipient_dead'
      // enum value may be added in v1.4 if operators need the distinction for "why didn't I get
      // notified?" debugging. Until then, the 03-MONITORING.md suppression table documents this.
      if (c.effective_status === 'busy' || c.effective_status === null) {
        await logDecision(c.recipient_id, senderId, true, 'recipient_busy');
        continue;
      }

      // quiet hours 22:00-08:00 local (FREE-06) — fail-open when local_hour is null
      if (c.local_hour !== null && (c.local_hour >= 22 || c.local_hour < 8)) {
        await logDecision(c.recipient_id, senderId, true, 'quiet_hours');
        continue;
      }

      // pair 15-min cap (FREE-03)
      const { count: pairCt } = await supabase
        .from('friend_free_pushes')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', c.recipient_id)
        .eq('sender_id', senderId)
        .eq('suppressed', false)
        .gt('sent_at', fifteenMinAgo);
      if ((pairCt ?? 0) > 0) {
        await logDecision(c.recipient_id, senderId, true, 'pair_15min');
        continue;
      }

      // recipient 5-min throttle (FREE-04)
      const { count: recentCt } = await supabase
        .from('friend_free_pushes')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', c.recipient_id)
        .eq('suppressed', false)
        .gt('sent_at', fiveMinAgo);
      if ((recentCt ?? 0) > 0) {
        await logDecision(c.recipient_id, senderId, true, 'recipient_5min');
        continue;
      }

      // daily rolling 24h cap (FREE-05)
      const { count: dayCt } = await supabase
        .from('friend_free_pushes')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', c.recipient_id)
        .eq('suppressed', false)
        .gt('sent_at', dayAgo);
      if ((dayCt ?? 0) >= 3) {
        await logDecision(c.recipient_id, senderId, true, 'daily_cap');
        continue;
      }

      // No valid push tokens (all invalidated) (PUSH-09)
      if (!c.push_tokens || c.push_tokens.length === 0) {
        await logDecision(c.recipient_id, senderId, true, 'recipient_invalidated_token');
        continue;
      }

      // --- SEND ---
      const bodyText = record.context_tag
        ? `${senderName} is Free • ${record.context_tag}`
        : `${senderName} is Free`;

      const messages = c.push_tokens.map((token) => ({
        to: token,
        sound: 'default' as const,
        title: 'Friend is Free',
        body: bodyText,
        channelId: 'friend_free',
        categoryId: 'friend_free',
        data: { kind: 'friend_free', senderId, senderName },
      }));

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
        },
        body: JSON.stringify(messages),
      });
      const body = (await res.json()) as { data?: ExpoTicket[] };

      // Parse tickets for DeviceNotRegistered (copy Phase 1 D-22 pattern)
      if (body.data) {
        const invalidatedTokens: string[] = [];
        body.data.forEach((ticket, idx) => {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            invalidatedTokens.push(c.push_tokens[idx]);
          }
        });
        if (invalidatedTokens.length > 0) {
          await supabase
            .from('push_tokens')
            .update({ invalidated_at: new Date().toISOString() })
            .in('token', invalidatedTokens);
        }
      }

      await logDecision(c.recipient_id, senderId, false, null);
    }

    // Mark outbox row sent
    await supabase
      .from('free_transitions')
      .update({ sent_at: new Date().toISOString(), attempts: record.attempts + 1 })
      .eq('id', record.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    await supabase
      .from('free_transitions')
      .update({ attempts: record.attempts + 1, last_error: String(e) })
      .eq('id', record.id);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
