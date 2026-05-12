/**
 * dateLocal test — Phase 29.1 Plan 03 (Wave 0).
 *
 * Verifies the device-local YYYY-MM-DD formatter avoids the UTC off-by-one
 * trap (Pitfall 5) that callers of habit/to-do RPCs would otherwise hit.
 *
 * Run: npx jest --testPathPatterns="dateLocal" --no-coverage
 */

import { todayLocal } from '../dateLocal';

describe('todayLocal', () => {
  it('returns a YYYY-MM-DD shaped string for the current moment', () => {
    const result = todayLocal();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats an injected date with two-digit month and day', () => {
    // 2026-03-15 stays the same regardless of tz — we constructed it from
    // local-tz components, so toLocaleDateString('en-CA') round-trips it.
    const fixed = new Date(2026, 2, 15, 12, 0, 0); // local-tz March 15 noon
    const result = todayLocal(fixed);
    expect(result).toBe('2026-03-15');
  });

  it('uses client local tz, not UTC (Pitfall 5 regression)', () => {
    // 2026-01-01 at 23:30 local should still be 2026-01-01, not 2026-01-02
    // (the UTC-slice approach would have flipped to the next day for any
    // user east of UTC).
    const fixed = new Date(2026, 0, 1, 23, 30, 0); // local-tz Jan 1 23:30
    const result = todayLocal(fixed);
    expect(result).toBe('2026-01-01');
  });

  it('preserves leading zeros on single-digit months and days', () => {
    const fixed = new Date(2026, 0, 5, 9, 0, 0); // local-tz Jan 5
    const result = todayLocal(fixed);
    expect(result).toBe('2026-01-05');
  });
});
