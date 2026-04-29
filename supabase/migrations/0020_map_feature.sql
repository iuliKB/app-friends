-- Phase 20 Migration 0020 — Map feature: lat/lng columns on plans table.
-- Implements MAP-01 through MAP-05 per 20-CONTEXT.md D-05, D-06.
-- NULL means "no location set." Existing rows are unaffected.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS latitude  FLOAT8 NULL CHECK (latitude  BETWEEN -90  AND  90),
  ADD COLUMN IF NOT EXISTS longitude FLOAT8 NULL CHECK (longitude BETWEEN -180 AND 180);
