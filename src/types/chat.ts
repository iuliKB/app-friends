export interface Message {
  id: string;
  plan_id: string | null;
  dm_channel_id: string | null;
  group_channel_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
  pending?: boolean;
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
  birthdayPersonId?: string | null; // group chats only — whose wish list to show
}
