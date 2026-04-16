import { create } from 'zustand';
import type { ChatListItem } from '@/types/chat';

interface ChatState {
  chatList: ChatListItem[];
  lastFetchedAt: number | null;
  setChatList: (items: ChatListItem[]) => void;
  invalidateChatList: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chatList: [],
  lastFetchedAt: null,
  setChatList: (chatList) => set({ chatList, lastFetchedAt: Date.now() }),
  invalidateChatList: () => set({ lastFetchedAt: null }),
}));
