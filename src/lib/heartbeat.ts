// Phase 2 v1.3 — Heartbeat client utility (D-15, D-29, OVR-01, OVR-10).
// Mirrors the SQL logic in supabase/migrations/0009_status_liveness_v1_3.sql:
//   ALIVE  = status_expires_at > now AND last_active_at > now - 4h
//   FADING = status_expires_at > now AND last_active_at ∈ [now-8h, now-4h]
//   DEAD   = status_expires_at < now OR  last_active_at < now - 8h
// FADING is client-only — the server view encodes only ALIVE vs DEAD (D-16).

import type { HeartbeatState } from '@/types/app';

export const HEARTBEAT_FADING_MS = 4 * 60 * 60 * 1000; // 4 hours
export const HEARTBEAT_DEAD_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Pure function: given an expiry timestamp and a last-active timestamp,
 * return the heartbeat state at `now` (defaults to Date.now()).
 *
 * Inputs may be null/undefined — returns 'dead' in that case so the UI
 * defaults to the DEAD presentation (move to Everyone Else).
 */
export function computeHeartbeatState(
  statusExpiresAt: string | null | undefined,
  lastActiveAt: string | null | undefined,
  now: Date = new Date()
): HeartbeatState {
  if (!statusExpiresAt || !lastActiveAt) return 'dead';

  const nowMs = now.getTime();
  const expiresMs = new Date(statusExpiresAt).getTime();
  const activeMs = new Date(lastActiveAt).getTime();

  // Expired or > 8h stale = DEAD
  if (expiresMs < nowMs || activeMs < nowMs - HEARTBEAT_DEAD_MS) {
    return 'dead';
  }
  // Between 4h and 8h stale = FADING
  if (activeMs < nowMs - HEARTBEAT_FADING_MS) {
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
