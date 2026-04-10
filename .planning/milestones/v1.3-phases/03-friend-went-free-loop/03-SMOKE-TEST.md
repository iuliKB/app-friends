# Phase 3 — Hardware Gate Smoke Tests

**Phase 5 input.** Per project memory `project_hardware_gate_deferral.md`, all manual
iOS/Android hardware checks for Phase 3 defer to Phase 5 "Hardware Verification Gate"
and execute once, at milestone end.

**Prerequisites:** EAS dev build installed on a real iPhone (iOS 15+) AND an Android
device / emulator with Play Services. Two test accounts signed in on two devices
(sender + recipient). Both accounts are friends.

---

## SMOKE-01 — FREE-01: Push arrives within ~5s of transition

1. On the recipient device, ensure heartbeat is ALIVE and status is `maybe` or `free`.
2. Ensure recipient is NOT in quiet hours (22:00–08:00 local).
3. Ensure `profiles.notify_friend_free = true` for the recipient.
4. On the sender device, open MoodPicker and set status to **Free**.
5. Start a stopwatch when the commit completes. Expect the push on the recipient device within 5 seconds.

**Pass:** notification arrives in < 5s.
**Fail path:** check `free_transitions` for unsent rows (see 03-MONITORING.md); check Edge Function logs.

---

## SMOKE-02 — FREE-08: Push body format

On SMOKE-01 success, verify the recipient's notification body matches:
- With context tag: `<display_name> is Free • <tag>` (e.g., "Ana is Free • 🍕")
- Without tag: `<display_name> is Free`

**Pass:** exact string match.

---

## SMOKE-03 — FREE-09 warm start: Tap opens DM

1. With app backgrounded, tap the notification from SMOKE-01.
2. Expect the app to foreground and navigate to `/chat/room?dm_channel_id=<uuid>&friend_name=<name>`.

**Pass:** DM with the correct friend opens; messages visible.

---

## SMOKE-04 — FREE-09 cold start: Tap opens DM after kill

1. Force-kill the app on the recipient device.
2. Trigger another friend_free push (wait ≥15 min due to pair cap OR use a different sender).
3. Tap the notification without first opening the app.
4. Expect the app to cold-start and land on the DM after the 150ms timeout.

**Pass:** DM opens after cold start, auth is preserved.

---

## SMOKE-05 — FREE-03/04/05 rate limits

1. Sender flips status Free → Busy → Free rapidly, 4 times within 10 minutes.
2. Recipient should receive exactly ONE push (the first flip) in the pair window.
3. Verify in SQL:
   ```sql
   SELECT suppressed, suppression_reason, count(*)
   FROM public.friend_free_pushes
   WHERE recipient_id = '<uuid>' AND sender_id = '<uuid>'
     AND sent_at > now() - interval '15 minutes'
   GROUP BY 1,2;
   ```
4. Expect: 1 row `(false, null, 1)` and 3 rows `(true, 'pair_15min', 3)` (or similar depending on order).

**Pass:** rate-limit suppressions logged per spec.

---

## SMOKE-06 — FREE-06 quiet hours

1. Set recipient `profiles.timezone` to a zone where current local time is in [22:00, 08:00)
   (e.g., if running at 14:00 UTC, set timezone to `Pacific/Auckland` where it's ~03:00 next day).
2. Sender flips to Free.
3. Expect NO push on the recipient device.
4. Verify `friend_free_pushes` has a row with `suppression_reason = 'quiet_hours'`.

**Pass:** push suppressed, SQL row present.

---

## SMOKE-07 — EXPIRY-01 local notification fires

1. Set recipient status with a **1h** window.
2. Wait 30 minutes (set a timer; grab coffee).
3. Expect a local notification titled "Still Free?" with body "Your status expires in 30 minutes".
4. Notification should show **Keep it** / **Heads down** action buttons (long-press on iOS, expand on Android).

**Pass:** notification fires within 1 minute of the expected time (iOS reliable, Android up to +15 min in Doze mode per D-04).

---

## SMOKE-08 — EXPIRY-01 [Keep it] extends window

1. On SMOKE-07's notification, tap **Keep it**.
2. App foregrounds.
3. Check MoodPicker — the window should now show the next-larger window (e.g., "1h" → "3h").
4. Verify in Supabase: `SELECT status_expires_at FROM public.statuses WHERE user_id = '<uuid>'`. The new expiry should be ~3 hours from now.

**Pass:** window extended; setStatus upsert landed.

---

## SMOKE-09 — EXPIRY-01 [Heads down] flips to busy

1. Repeat SMOKE-07 (1h window → 30 min wait).
2. Tap **Heads down**.
3. MoodPicker should show **Busy** with a 3h window.

**Pass:** mood flipped to busy, window = 3h.

---

**Total checks: 9**
**Estimated execution time: ~2 hours** (SMOKE-07/08/09 dominate via the 30-min waits)
