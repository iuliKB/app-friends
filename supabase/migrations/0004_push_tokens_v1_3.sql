-- Phase 1 v1.3: evolve push_tokens for device-scoped uniqueness + stale-token reaping
-- Implements D-14, D-15 from .planning/phases/01-push-infrastructure-dm-entry-point/01-CONTEXT.md
-- Consumed by:
--   - src/hooks/usePushNotifications.ts (Plan 05) — upserts on (user_id, device_id)
--   - supabase/functions/notify-plan-invite/index.ts (Plan 07) — filters invalidated_at IS NULL

-- Step 1: add columns nullable so existing rows are not rejected
ALTER TABLE public.push_tokens
  ADD COLUMN device_id      TEXT,
  ADD COLUMN last_seen_at   TIMESTAMPTZ,
  ADD COLUMN invalidated_at TIMESTAMPTZ;

-- Step 2: backfill legacy rows
--   device_id = 'legacy:' || id  (stable, unique, identifiable)
--   last_seen_at = created_at    (best available historical signal)
UPDATE public.push_tokens
   SET device_id    = 'legacy:' || id::text,
       last_seen_at = COALESCE(last_seen_at, created_at)
 WHERE device_id IS NULL;

-- Step 3: enforce NOT NULL and add default for last_seen_at
ALTER TABLE public.push_tokens
  ALTER COLUMN device_id    SET NOT NULL,
  ALTER COLUMN last_seen_at SET NOT NULL,
  ALTER COLUMN last_seen_at SET DEFAULT now();

-- Step 4: swap unique constraint from (user_id, token) to (user_id, device_id)
--   Old constraint name follows the PostgreSQL default for the original UNIQUE clause.
ALTER TABLE public.push_tokens
  DROP CONSTRAINT IF EXISTS push_tokens_user_id_token_key;

CREATE UNIQUE INDEX idx_push_tokens_user_device
  ON public.push_tokens (user_id, device_id);

-- Step 5: partial index for active-token reads in fan-out (Plan 07 consumer)
CREATE INDEX idx_push_tokens_active
  ON public.push_tokens (user_id)
  WHERE invalidated_at IS NULL;

-- RLS unchanged — existing "Users manage own push tokens" policy from 0003_push_tokens.sql
-- already covers SELECT/INSERT/UPDATE/DELETE for the new columns (D-15).
