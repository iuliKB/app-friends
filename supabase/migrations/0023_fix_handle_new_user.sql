-- Fix signup failure introduced by 0009_status_liveness_v1_3.sql.
--
-- 0009 set public.statuses.status_expires_at to NOT NULL with no default,
-- but handle_new_user() from 0001_init.sql still only inserts user_id into
-- public.statuses. Every signup after 0009 was applied hit a NOT NULL
-- violation inside the SECURITY DEFINER trigger, which rolled back the
-- auth.users INSERT and surfaced as a generic auth error in the client.
--
-- This patch replaces the function so the new status row gets a fresh
-- 24h expiry — matching the backfill semantics chosen in 0009 (line 24).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );

  INSERT INTO public.statuses (user_id, status_expires_at, last_active_at)
  VALUES (
    new.id,
    now() + interval '24 hours',
    now()
  );

  RETURN new;
END;
$$;
