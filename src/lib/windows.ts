// Phase 2 v1.3 — Window options + expiry computation (D-08, D-09, D-11, D-12, OVR-01).
// All "local time" math uses the device's local timezone via native Date.
// No timezone column on the server — heartbeat eliminates that need.

import type { WindowId } from '@/types/app';

export interface WindowOption {
  id: WindowId;
  label: string; // chip label, e.g., "1h", "Until 6pm", "Rest of day"
  ownLabel: string; // own-status display, e.g., "for 1h", "until 6pm", "rest of day" (D-12)
  expiresAt: Date; // pre-computed expiry for this option at the given `now`
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * ONE_HOUR_MS;

// "Rest of day" treats the social day as ending at 3am, not midnight, so a
// status set late at night carries into the early morning (e.g. 23:00 → 03:00)
// instead of dying at the midnight boundary.
const DAY_END_HOUR = 3;

/**
 * The next local wall-clock occurrence of `hour:minute`, today if it's still
 * ahead of `now`, otherwise tomorrow. Mirrors MoodPicker's `ensureFuture`
 * roll-forward so clock-anchored windows never land in the past or get capped
 * at midnight. The old `new Date(now); setHours(...)` form stayed on today's
 * calendar date, which is the bug this replaces.
 */
function nextLocalTime(now: Date, hour: number, minute = 0, second = 0): Date {
  const d = new Date(now);
  d.setHours(hour, minute, second, 0);
  if (d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Returns the visible window options at `now` per D-08 + D-09.
 *
 * - `1h` and `3h` are always visible.
 * - `until_6pm` is hidden when local time is ≥17:30 (less than 30min until target).
 * - `until_10pm` is hidden when local time is ≥21:30.
 * - `rest_of_day` is always visible (target = today 23:59:59 local).
 */
export function getWindowOptions(now: Date = new Date()): WindowOption[] {
  const options: WindowOption[] = [];

  options.push({
    id: '1h',
    label: '1h',
    ownLabel: 'for 1h',
    expiresAt: new Date(now.getTime() + ONE_HOUR_MS),
  });
  options.push({
    id: '3h',
    label: '3h',
    ownLabel: 'for 3h',
    expiresAt: new Date(now.getTime() + THREE_HOURS_MS),
  });

  const localHour = now.getHours();
  const localMinute = now.getMinutes();
  const past1730 = localHour > 17 || (localHour === 17 && localMinute >= 30);
  const past2130 = localHour > 21 || (localHour === 21 && localMinute >= 30);

  if (!past1730) {
    options.push({
      id: 'until_6pm',
      label: 'Until 6pm',
      ownLabel: 'until 6pm',
      expiresAt: nextLocalTime(now, 18),
    });
  }

  if (!past2130) {
    options.push({
      id: 'until_10pm',
      label: 'Until 10pm',
      ownLabel: 'until 10pm',
      expiresAt: nextLocalTime(now, 22),
    });
  }

  options.push({
    id: 'rest_of_day',
    label: 'Rest of day',
    ownLabel: 'rest of day',
    expiresAt: nextLocalTime(now, DAY_END_HOUR),
  });

  return options;
}

/**
 * Single-shot expiry computation for the commit path. Mirrors getWindowOptions
 * but doesn't allocate the full array — used by useStatus.setStatus.
 */
export function computeWindowExpiry(windowId: WindowId, now: Date = new Date()): Date {
  switch (windowId) {
    case '1h':
      return new Date(now.getTime() + ONE_HOUR_MS);
    case '3h':
      return new Date(now.getTime() + THREE_HOURS_MS);
    case 'until_6pm':
      return nextLocalTime(now, 18);
    case 'until_10pm':
      return nextLocalTime(now, 22);
    case 'rest_of_day':
      return nextLocalTime(now, DAY_END_HOUR);
  }
}

/**
 * Display string for a stored expiry — used by HomeFriendCard / StatusPill (D-12).
 * Best-effort reverse lookup: matches the expiry against the canonical window
 * targets to derive a friendly label. Falls back to a clock string if no match.
 */
export function formatWindowLabel(expiresAt: string | Date, now: Date = new Date()): string {
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const diffMs = exp.getTime() - now.getTime();

  if (diffMs <= 0) return '';

  // Recognize 1h / 3h within ±5min tolerance
  const tolerance = 5 * 60 * 1000;
  if (Math.abs(diffMs - ONE_HOUR_MS) < tolerance) return 'for 1h';
  if (Math.abs(diffMs - THREE_HOURS_MS) < tolerance) return 'for 3h';

  // Recognize until_6pm / until_10pm / rest_of_day by exact local-hour match
  if (exp.getHours() === 18 && exp.getMinutes() === 0) return 'until 6pm';
  if (exp.getHours() === 22 && exp.getMinutes() === 0) return 'until 10pm';
  if (exp.getHours() === DAY_END_HOUR && exp.getMinutes() === 0) return 'rest of day';

  // Fallback: clock string
  const h = exp.getHours();
  const m = exp.getMinutes().toString().padStart(2, '0');
  const suffix = h >= 12 ? 'pm' : 'am';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `until ${display}:${m}${suffix}`;
}

/**
 * Phase 3 — "Keep it" action helper (EXPIRY-01, D-03).
 * Given the current window, returns the next-larger window for extending
 * the status. Mapping:
 *   '1h'          -> '3h'
 *   '3h'          -> 'until_6pm'   (falls back to 'rest_of_day' when past 5:30pm via callers)
 *   'until_6pm'   -> 'until_10pm'
 *   'until_10pm'  -> 'rest_of_day'
 *   'rest_of_day' -> 'rest_of_day' (already the largest — re-anchor)
 * Unknown / null → '3h' (safe default consistent with [Heads down] fallback).
 *
 * Callers that hit the boundary between 'until_6pm' and 'until_10pm' based on
 * time-of-day should use getWindowOptions(now) to check visibility and fall
 * back to '3h' if neither 'until_*' option is visible.
 */
export function nextLargerWindow(current: WindowId | null): WindowId {
  switch (current) {
    case '1h':
      return '3h';
    case '3h':
      return 'until_6pm';
    case 'until_6pm':
      return 'until_10pm';
    case 'until_10pm':
      return 'rest_of_day';
    case 'rest_of_day':
      return 'rest_of_day';
    default:
      return '3h';
  }
}
