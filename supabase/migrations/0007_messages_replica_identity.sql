-- Enable REPLICA IDENTITY FULL on messages table.
-- Required for Supabase Realtime to filter by plan_id or dm_channel_id
-- on postgres_changes subscriptions.
-- Without this, the filter silently drops all events.

ALTER TABLE public.messages REPLICA IDENTITY FULL;
