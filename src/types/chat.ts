export interface Message {
  id: string;
  plan_id: string | null;
  dm_channel_id: string | null;
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
  id: string;               // plan_id or dm_channel_id
  type: 'plan' | 'dm';
  title: string;            // plan title or friend name
  avatarUrl?: string | null; // for DMs
  lastMessage: string;      // truncated body
  lastMessageAt: string;    // ISO timestamp for sorting
  hasUnread: boolean;
}
