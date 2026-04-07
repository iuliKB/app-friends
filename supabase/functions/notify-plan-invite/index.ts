import { createClient } from 'npm:@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    plan_id: string;
    user_id: string;
    invited_by: string;
    rsvp_status: string;
  };
  schema: 'public';
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoSendResponse {
  data?: ExpoTicket[];
  errors?: unknown[];
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  const { record } = payload;

  // Skip self-invite (plan creator adding themselves)
  if (record.user_id === record.invited_by) {
    return new Response('self-invite skipped', { status: 200 });
  }

  const [inviterResult, planResult, tokensResult] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', record.invited_by).single(),
    supabase.from('plans').select('title').eq('id', record.plan_id).single(),
    // PUSH-09 consumer side: skip invalidated tokens (Plan 02 schema)
    supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', record.user_id)
      .is('invalidated_at', null),
  ]);

  const inviterName = inviterResult.data?.display_name ?? 'Someone';
  const planTitle = planResult.data?.title ?? 'a plan';
  const tokens = (tokensResult.data ?? []).map((r) => r.token);

  if (tokens.length === 0) {
    return new Response('no tokens', { status: 200 });
  }

  // D-19: target the dedicated plan_invites Android channel for new installs.
  // Legacy installs (using the dormant 'default' channel) ignore an unknown channelId.
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default' as const,
    title: 'Plan invite',
    body: `${inviterName} invited you to ${planTitle}`,
    data: { planId: record.plan_id },
    channelId: 'plan_invites',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify(messages),
  });

  // D-22 / PUSH-09 producer side: parse ticket-level errors.
  // Expo returns errors inside HTTP 200, in body.data[]. Order matches submitted messages.
  const body = (await res.json()) as ExpoSendResponse;

  if (body.data) {
    const invalidatedTokens: string[] = [];
    body.data.forEach((ticket, idx) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        invalidatedTokens.push(tokens[idx]);
      }
    });
    if (invalidatedTokens.length > 0) {
      await supabase
        .from('push_tokens')
        .update({ invalidated_at: new Date().toISOString() })
        .in('token', invalidatedTokens);
    }
  }

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
});
