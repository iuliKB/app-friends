-- v1.x: Intent-first status expiry.
-- Supersedes the liveness logic in 0009_status_liveness_v1_3.sql.
--
-- DECISION (intent-first, "Option A"):
--   The duration a user explicitly picks is the single source of truth for
--   whether a status is live. Inactivity no longer KILLS a status — it only
--   dims it (the client-side FADING state in src/lib/heartbeat.ts).
--
-- Rationale: last_active_at tracks "when did they last open the app", which is
-- a weak proxy for availability. The old `last_active_at < now() - 8h` branch
-- could silently override the user's explicit choice (e.g. "Free until 10pm"
-- wiped at 6pm). Honoring the chosen expiry is more predictable and trustworthy.
-- Staleness is surfaced to friends via the FADING dim + "set Xh ago" label
-- instead of deletion. The chosen expiry itself bounds how long a stale status
-- can linger.
--
-- Consumed by:
--   - src/hooks/useStatus.ts / useHomeScreen.ts / useFriends.ts — read the view
--   - src/lib/heartbeat.ts — client mirror; DEAD is now expiry-only

CREATE OR REPLACE VIEW public.effective_status
WITH (security_invoker = true)
AS
  SELECT
    user_id,
    CASE
      WHEN status_expires_at < now()
      THEN NULL
      ELSE status
    END AS effective_status,
    status_expires_at,
    last_active_at,
    context_tag,
    updated_at
  FROM public.statuses;
