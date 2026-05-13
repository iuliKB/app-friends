// Phase 31 Plan 08 — server-data mirror stripped.
//
// Before Wave 8 this store cached the chat list and a fetched-at timestamp as a hand-rolled
// 30s TTL mirror of the chat-list query. TanStack Query now owns that cache via
// `queryKeys.chat.list(userId)` (see src/hooks/useChatList.ts). The store stays
// alive only as a scaffold for any future UI-only flags (e.g. an unread-pulse
// timestamp). Server-data fields MUST NOT be reintroduced here — they belong in
// the TanStack Query cache so callers across the app see one source of truth.
//
// The per-chat preference AsyncStorage keys (chat:last_read:*, chat:hidden:*,
// chat:muted:*, chat:rooms:cache) are intentionally NOT migrated to the cache
// — they are local UI preferences, not server state. See src/hooks/README.md.

import { create } from 'zustand';

interface ChatState {
  // Reserved for future UI-only flags. Do NOT add server-data fields here.
  _placeholder?: never;
}

export const useChatStore = create<ChatState>(() => ({}));
