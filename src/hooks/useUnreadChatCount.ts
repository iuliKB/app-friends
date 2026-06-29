// Unread-chat badge source for the Chat tab. Mirrors the Squad badge hooks
// (usePendingRequestsCount / useInvitationCount): a thin `{ count }` shape the
// CustomTabBar can drop into its `badges` map.
//
// Unlike the Squad badges there is NO lightweight server-side COUNT to run —
// "unread" is derived per-chat from the local `chat:last_read:<id>` marker vs the
// latest message, which useChatList already computes. So we reuse that query
// (and its realtime subscription, subscribeChatList) instead of duplicating the
// fetch. Calling useChatList here shares ONE cache entry (queryKeys.chat.list)
// and ONE Supabase channel (ref-counted in the bridge) with the chat list
// screen — no extra network or subscription cost.

import { useChatList } from '@/hooks/useChatList';

export function useUnreadChatCount(): { count: number } {
  const { chatList } = useChatList();

  // Number of conversations with unread messages. Muted chats are already
  // forced to hasUnread=false in useChatList, so they don't count here.
  const count = chatList.reduce((n, chat) => (chat.hasUnread ? n + 1 : n), 0);

  return { count };
}
