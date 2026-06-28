// Heartbeat client utility (intent-first model — see migration
// 0030_status_intent_first_expiry.sql).
//   DEAD   = status_expires_at < now                      (expiry is the ONLY kill)
//   FADING = not expired AND last_active_at < now - 4h     (stale → dim, never delete)
//   ALIVE  = not expired AND last_active_at ≥ now - 4h
//
// Intent-first: the user's chosen expiry decides liveness. Inactivity only
// DIMS a status (FADING); it never removes it. FADING is client-only — the
// server view encodes only ALIVE vs DEAD.

import type { HeartbeatState } from '@/types/app';

export const HEARTBEAT_FADING_MS = 4 * 60 * 60 * 1000; // 4 hours — inactivity → dim

/**
 * Pure function: given an expiry timestamp and a last-active timestamp,
 * return the heartbeat state at `now` (defaults to Date.now()).
 *
 * Only an expired (or missing) `statusExpiresAt` yields 'dead'. Inactivity
 * downgrades a live status to 'fading' but never to 'dead' — honoring the
 * duration the user explicitly chose.
 */
export function computeHeartbeatState(
  statusExpiresAt: string | null | undefined,
  lastActiveAt: string | null | undefined,
  now: Date = new Date()
): HeartbeatState {
  // No expiry to honor → nothing to show.
  if (!statusExpiresAt) return 'dead';

  const nowMs = now.getTime();
  const expiresMs = new Date(statusExpiresAt).getTime();

  // Expired = DEAD. This is the ONLY thing that kills a status now.
  if (expiresMs < nowMs) return 'dead';

  // Not expired but stale (>4h since last app open) = FADING (dim, still shown).
  if (lastActiveAt && new Date(lastActiveAt).getTime() < nowMs - HEARTBEAT_FADING_MS) {
    return 'fading';
  }
  return 'alive';
}

/**
 * Whole-hour distance formatter for FADING friend cards (D-29).
 * - <1h → "now"
 * - 1h-23h → "Xh ago"
 * - null/undefined → ""
 *
 * Avoids pulling in date-fns (zero-new-deps rule).
 */
export function formatDistanceToNow(
  iso: string | null | undefined,
  now: Date = new Date()
): string {
  if (!iso) return '';
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (diffMs < 60 * 60 * 1000) return 'now';
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  return `${hours}h ago`;
}
