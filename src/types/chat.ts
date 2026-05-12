export type MessageType = 'text' | 'image' | 'poll' | 'deleted';

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface Message {
  id: string;
  plan_id: string | null;
  dm_channel_id: string | null;
  group_channel_id: string | null;
  sender_id: string;
  body: string | null;                    // nullable since 0018 (D-01): image/poll messages have no body
  created_at: string;
  // v1.5 Phase 12 — new columns from migration 0018
  image_url: string | null;
  reply_to_message_id: string | null;
  message_type: MessageType;
  poll_id: string | null;
  reactions?: MessageReaction[];          // Phase 15 placeholder — not returned by existing queries
  pending?: boolean;
  failed?: boolean;    // Phase 26, CHAT-03: optimistic send failure state
  tempId?: string;
}

export interface MessageWithProfile extends Message {
  sender_display_name: string;
  sender_avatar_url: string | null;
}

export interface ChatListItem {
  id: string; // plan_id, dm_channel_id, or group_channel_id
  type: 'plan' | 'dm' | 'group';
  title: string; // plan title, friend name, or group channel name
  avatarUrl?: string | null; // for DMs
  lastMessage: string; // truncated body
  lastMessageAt: string; // ISO timestamp for sorting
  hasUnread: boolean;
  unreadCount: number; // messages from others after last_read
  isMuted: boolean;
  birthdayPersonId?: string | null; // group chats only — whose wish list to show
}
