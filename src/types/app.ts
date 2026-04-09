export type StatusValue = 'free' | 'busy' | 'maybe';

export type EmojiTag = '☕️' | '🎮' | '🏋️' | '🍕' | '🎵' | '🎉' | '🎬' | '😴' | null;

export interface Profile {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStatus {
  user_id: string;
  status: StatusValue;
  context_tag: EmojiTag;
  updated_at: string;
}

// Phase 2 v1.3 — Mood + Context + Window + Heartbeat additions

export type WindowId = '1h' | '3h' | 'until_6pm' | 'until_10pm' | 'rest_of_day';

export type HeartbeatState = 'alive' | 'fading' | 'dead';

export interface CurrentStatus {
  status: StatusValue;
  context_tag: string | null;
  status_expires_at: string; // ISO 8601
  last_active_at: string; // ISO 8601
  // Phase 3 — Carried so the expiry_warning response listener can compute
  // nextLargerWindow without re-deriving from raw timestamps (CONTEXT D-03, A8).
  // Optional for backward compat: legacy rows loaded from effective_status have no
  // window_id column. Plan 03-05 writes the value on every setStatus call.
  // Plan 03-06 normalizes `current.window_id ?? null` at the read site.
  window_id?: WindowId | null;
}

export interface MoodPreset {
  id: string; // lowercase, ≤20 chars (D-05)
  label: string; // human display, same as id in v1.3
}
