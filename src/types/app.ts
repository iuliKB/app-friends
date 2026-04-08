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
}

export interface MoodPreset {
  id: string; // lowercase, ≤20 chars (D-05)
  label: string; // human display, same as id in v1.3
}
