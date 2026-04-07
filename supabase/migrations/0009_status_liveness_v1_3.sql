-- Phase 2 v1.3: Mood + Context + Window + Heartbeat layer.
-- Implements D-13..D-21 from .planning/phases/02-status-liveness-ttl/02-CONTEXT.md
-- Honors OVR-05 (no rollup/GC in v1.3), OVR-08 (security_invoker view), OVR-09 (IS DISTINCT FROM guard)
-- Consumed by:
--   - src/hooks/useStatus.ts (rewrite, Plan 05) — commits status + tag + window + last_active_at
--   - src/stores/useStatusStore.ts (Plan 04) — owns shared currentStatus
--   - src/hooks/useHomeScreen.ts + src/hooks/useFriends.ts (Plan 06) — read effective_status view
--   - src/lib/heartbeat.ts (Plan 02) — client mirror of view logic; FADING is client-only (D-16)

-- ============================================================================
-- Step 1: add columns nullable so existing rows are not rejected
-- ============================================================================
ALTER TABLE public.statuses
  ADD COLUMN status_expires_at TIMESTAMPTZ,
  ADD COLUMN last_active_at    TIMESTAMPTZ;

-- ============================================================================
-- Step 2: backfill legacy rows (D-17)
-- Legacy rows get a generous 24h expiry from their last update so no one
-- loses a mid-week status on deploy. last_active_at falls back to updated_at
-- then now() for absolute safety.
-- ============================================================================
UPDATE public.statuses
   SET status_expires_at = updated_at + interval '24 hours',
       last_active_at    = COALESCE(last_active_at, updated_at, now())
 WHERE status_expires_at IS NULL;

-- ============================================================================
-- Step 3: enforce NOT NULL + DEFAULT
-- ============================================================================
ALTER TABLE public.statuses
  ALTER COLUMN status_expires_at SET NOT NULL,
  ALTER COLUMN last_active_at    SET NOT NULL,
  ALTER COLUMN last_active_at    SET DEFAULT now();

-- ============================================================================
-- Step 4: status_history table (TTL-07, D-18)
-- ============================================================================
CREATE TABLE public.status_history (
  id                BIGSERIAL PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            public.availability_status NOT NULL,
  context_tag       text,
  status_expires_at timestamptz,
  occurred_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_user_occurred
  ON public.status_history (user_id, occurred_at DESC);

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 5: RLS — SELECT own OR friend (D-19)
-- No INSERT/UPDATE/DELETE policies — clients never write directly.
-- The trigger below runs as SECURITY DEFINER and bypasses RLS for INSERT.
-- ============================================================================
CREATE POLICY "status_history_select_own_or_friend"
  ON public.status_history FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_friend_of(user_id)
  );

-- ============================================================================
-- Step 6: SECURITY DEFINER trigger to append on mood transitions only (D-21, OVR-09)
-- IS DISTINCT FROM correctly handles NULL→value cases and prevents context-tag-only
-- and window-only updates from logging noise.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_status_transition()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.status_history (user_id, status, context_tag, status_expires_at)
    VALUES (NEW.user_id, NEW.status, NEW.context_tag, NEW.status_expires_at);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_status_transition
  AFTER UPDATE ON public.statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.on_status_transition();

-- ============================================================================
-- Step 7: effective_status view with security_invoker (OVR-08)
-- Source of truth for friend-facing reads (D-16, TTL-04).
-- Encodes ALIVE vs DEAD only — FADING is purely a client-side UX state.
-- security_invoker = true means reads inherit the caller's RLS context.
-- Requires Postgres 15+ (Supabase free-tier ships PG15+ since 2023).
-- ============================================================================
CREATE OR REPLACE VIEW public.effective_status
WITH (security_invoker = true)
AS
  SELECT
    user_id,
    CASE
      WHEN status_expires_at < now()
        OR last_active_at  < now() - interval '8 hours'
      THEN NULL
      ELSE status
    END AS effective_status,
    status_expires_at,
    last_active_at,
    context_tag,
    updated_at
  FROM public.statuses;

-- Note: views cannot be published to supabase_realtime (PITFALLS Pitfall 12).
-- Clients subscribe to public.statuses but READ from public.effective_status.

-- ============================================================================
-- Retention (TTL-08): DEFERRED to v1.4 per OVR-05.
-- Scheduled GC is not in scope for v1.3: no scheduled-job infrastructure is
-- enabled on this project, the "no new infra" stance applies, and at the
-- target scale (3-15 friend squads, ~120 rows/user/month worst case) the
-- table will not accumulate enough rows to need active management. Operator
-- can prune manually if needed before v1.4 ships the rollup function.
-- ============================================================================
