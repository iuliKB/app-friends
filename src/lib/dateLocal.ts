/**
 * dateLocal — Phase 29.1 Plan 03.
 *
 * Returns today's date as YYYY-MM-DD in the *device local* timezone.
 *
 * Why this exists: `new Date().toISOString().slice(0, 10)` returns the UTC
 * date, which is off-by-one for users in negative-UTC time zones. Habit /
 * to-do RPCs from migration 0024 accept a client-supplied `p_date_local`
 * parameter so the client's tz wins (Pitfall 5 in RESEARCH.md).
 *
 * We use the 'en-CA' locale because it natively formats as YYYY-MM-DD; the
 * explicit `{year:'numeric',month:'2-digit',day:'2-digit'}` options guard
 * against locale-extension quirks that could otherwise pad/strip leading
 * zeros.
 */
export function todayLocal(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
