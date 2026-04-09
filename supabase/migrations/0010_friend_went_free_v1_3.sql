-- Phase 3 v1.3: Friend Went Free loop — outbox, rate-limit log, timezone + toggle, trigger, RPC, webhook dispatcher.
-- Implements FREE-02..07, FREE-10, FREE-11 per .planning/phases/03-friend-went-free-loop/03-CONTEXT.md D-07..D-20.
-- Hardening: all SECURITY DEFINER functions pin SET search_path = '' (Phase 2 T-02-09 pattern).
-- Zero client policies on free_transitions / friend_free_pushes — service-role / SECURITY DEFINER only.

-- ============================================================================
-- Step 1: Enable pg_net (required for net.http_post webhook dispatch)
-- Orchestrator verified pg_net 0.20.0 AVAILABLE on project zqmaauaopyolutfoizgq (not yet installed).
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- Step 2: profiles additions (D-14, D-20)
-- Both nullable or defaulted, so no backfill needed. timezone is NULL until first client write.
-- RLS inheritance: existing UPDATE policy `WITH CHECK (id = auth.uid())` covers any column
--   the user writes including these new ones. No policy change required. [VERIFIED: 0001 §198-215]
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN timezone text,
  ADD COLUMN notify_friend_free boolean NOT NULL DEFAULT true;

-- ============================================================================
-- Step 3: free_transitions outbox table (D-09, FREE-10)
-- INSERT-only happy path; Edge Function UPDATEs sent_at on success or attempts/last_error on failure.
-- ============================================================================
CREATE TABLE public.free_transitions (
  id          bigserial PRIMARY KEY,
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  context_tag text,
  sent_at     timestamptz,
  attempts    smallint NOT NULL DEFAULT 0,
  last_error  text
);

CREATE INDEX idx_free_transitions_unsent
  ON public.free_transitions (occurred_at)
  WHERE sent_at IS NULL;

ALTER TABLE public.free_transitions ENABLE ROW LEVEL SECURITY;
-- Intentional: no client policies. Writes via SECURITY DEFINER trigger; reads via service-role Edge Function.

-- ============================================================================
-- Step 4: friend_free_pushes log table (D-10..D-13, FREE-02..07)
-- Every decision logged — sent or suppressed — with enum-style suppression_reason.
-- Suppression reasons (enforced in Edge Function code, stored as text):
--   'pair_15min' | 'recipient_5min' | 'daily_cap' | 'quiet_hours'
--   | 'recipient_busy' | 'recipient_disabled_pref' | 'recipient_invalidated_token' | 'self'
-- ============================================================================
CREATE TABLE public.friend_free_pushes (
  id                 bigserial PRIMARY KEY,
  recipient_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at            timestamptz NOT NULL DEFAULT now(),
  suppressed         boolean NOT NULL,
  suppression_reason text
);

CREATE INDEX idx_ffp_recipient_recent
  ON public.friend_free_pushes (recipient_id, sent_at DESC);
CREATE INDEX idx_ffp_pair_recent
  ON public.friend_free_pushes (recipient_id, sender_id, sent_at DESC);

ALTER TABLE public.friend_free_pushes ENABLE ROW LEVEL SECURITY;
-- Intentional: no client policies. Edge Function writes with service role.

-- ============================================================================
-- Step 5: Business trigger — statuses → free_transitions (D-07, D-08)
-- Guard: NEW.status = 'free' AND OLD.status IS DISTINCT FROM 'free' (literal CONTEXT D-07 wording)
--   IS DISTINCT FROM handles NULL→'free' correctly (Pitfall 5 / Phase 2 OVR-09).
-- Function is SECURITY DEFINER with search_path='' (Phase 2 T-02-09 hardening).
-- Single responsibility: insert one outbox row. Does NOT touch Phase 2's on_status_transition trigger.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_status_went_free()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'free' AND OLD.status IS DISTINCT FROM 'free' THEN
    INSERT INTO public.free_transitions (sender_id, context_tag)
    VALUES (NEW.user_id, NEW.context_tag);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_status_went_free
  AFTER UPDATE ON public.statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.on_status_went_free();

-- ============================================================================
-- Step 6: get_friend_free_candidates RPC (FREE-02, FREE-06, FREE-07)
-- One query returns the full candidate set joined to effective_status, push_tokens,
-- timezone-derived local_hour, and notify_friend_free preference. Edge Function
-- iterates this result rather than fanning to N round-trips.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_friend_free_candidates(p_sender uuid)
RETURNS TABLE (
  recipient_id       uuid,
  notify_friend_free boolean,
  effective_status   public.availability_status,
  local_hour         int,
  push_tokens        text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.notify_friend_free,
    es.effective_status,
    CASE
      WHEN p.timezone IS NULL THEN NULL
      ELSE EXTRACT(hour FROM (now() AT TIME ZONE p.timezone))::int
    END,
    COALESCE(
      (SELECT array_agg(t.token)
         FROM public.push_tokens t
        WHERE t.user_id = p.id AND t.invalidated_at IS NULL),
      ARRAY[]::text[]
    )
  FROM public.profiles p
  JOIN public.friendships f
    ON f.status = 'accepted'
   AND ((f.requester_id = p_sender AND f.addressee_id = p.id)
        OR (f.addressee_id = p_sender AND f.requester_id = p.id))
  LEFT JOIN public.effective_status es ON es.user_id = p.id
  WHERE p.id <> p_sender;
$$;

-- Only service-role / SECURITY DEFINER callers. Revoke from public anon/authenticated roles.
REVOKE ALL ON FUNCTION public.get_friend_free_candidates(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_friend_free_candidates(uuid) FROM anon, authenticated;

-- ============================================================================
-- Step 7: Webhook dispatcher — free_transitions INSERT → net.http_post to Edge Function
-- We author the webhook trigger in SQL rather than Dashboard to:
--   (a) keep fan-out version-controlled in migrations, and
--   (b) sidestep GH #38848 where Dashboard edits drop the Authorization header.
-- The Edge Function URL and service-role key are read from vault-backed GUCs set in Plan 03-02
-- ("app.edge_functions_url" and "app.service_role_key"). If GUCs are unset at INSERT time,
-- the net.http_post call still fires but returns an auth error — the outbox row stays unsent
-- and the documented monitoring query surfaces it (D-19).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_free_transition()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edge_url text := current_setting('app.edge_functions_url', true);
  v_srv_key  text := current_setting('app.service_role_key', true);
  v_url      text;
BEGIN
  IF v_edge_url IS NULL OR v_srv_key IS NULL THEN
    -- Fail-soft: leave the row unsent so the monitoring query picks it up.
    RETURN NEW;
  END IF;
  v_url := v_edge_url || '/notify-friend-free';
  PERFORM extensions.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_srv_key
               ),
    body    := jsonb_build_object(
                 'type',   'INSERT',
                 'table',  'free_transitions',
                 'schema', 'public',
                 'record', to_jsonb(NEW),
                 'old_record', NULL
               )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER dispatch_free_transition
  AFTER INSERT ON public.free_transitions
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_free_transition();

-- ============================================================================
-- Step 8: v1.4 deferred — no retention rollup on friend_free_pushes.
-- At v1.3 scale (3-15 friend squads, ~3 sends/recipient/day worst case) the table
-- will not accumulate enough rows in 30 days to need active management.
-- See .planning/phases/03-friend-went-free-loop/03-CONTEXT.md D-13.
-- ============================================================================
