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
