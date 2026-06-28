-- Fix: get_iou_summary() omitted avatar_url, so the Balances screen rendered
-- initials instead of friend avatars. The function already joins profiles — it
-- just never projected p.avatar_url. Add it to the return signature, SELECT,
-- and GROUP BY. Client (useIOUSummary.IOUSummaryRow / BalanceRow) already
-- expects avatar_url, so no app changes are needed.
--
-- Adding a column to RETURNS TABLE changes the function's output signature,
-- which CREATE OR REPLACE cannot do ("cannot change return type"), so we DROP
-- and recreate.

DROP FUNCTION IF EXISTS public.get_iou_summary();

CREATE FUNCTION public.get_iou_summary()
RETURNS TABLE (
  friend_id          uuid,
  display_name       text,
  avatar_url         text,
  net_amount_cents   int,
  unsettled_count    int
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH caller AS (
    SELECT (SELECT auth.uid()) AS uid
  ),
  expenses AS (
    -- Expenses where caller is a participant
    SELECT
      g.id             AS group_id,
      g.created_by     AS payer_id,
      m.user_id        AS participant_id,
      m.share_amount_cents,
      m.settled_at
    FROM public.iou_groups g
    JOIN public.iou_members m ON m.iou_group_id = g.id
    WHERE EXISTS (
      SELECT 1 FROM public.iou_members im2
      WHERE im2.iou_group_id = g.id
        AND im2.user_id = (SELECT uid FROM caller)
    )
      AND m.settled_at IS NULL
  ),
  pairwise AS (
    -- Positive: friend owes caller (caller paid, friend is participant)
    SELECT
      participant_id AS friend_id,
      share_amount_cents AS amount
    FROM expenses
    WHERE payer_id = (SELECT uid FROM caller)
      AND participant_id <> (SELECT uid FROM caller)
    UNION ALL
    -- Negative: caller owes friend (friend paid, caller is participant)
    SELECT
      payer_id AS friend_id,
      -share_amount_cents AS amount
    FROM expenses
    WHERE participant_id = (SELECT uid FROM caller)
      AND payer_id <> (SELECT uid FROM caller)
  )
  SELECT
    pw.friend_id,
    p.display_name,
    p.avatar_url,
    SUM(pw.amount)::int          AS net_amount_cents,
    COUNT(*)::int                AS unsettled_count
  FROM pairwise pw
  JOIN public.profiles p ON p.id = pw.friend_id
  GROUP BY pw.friend_id, p.display_name, p.avatar_url
  ORDER BY ABS(SUM(pw.amount)) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_iou_summary() TO authenticated;
