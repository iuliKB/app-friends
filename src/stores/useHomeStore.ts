import { create } from 'zustand';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface HomeState {
  friends: FriendWithStatus[];
  lastFetchedAt: number | null;
  lastActiveAt: Record<string, string>;
  setFriends: (friends: FriendWithStatus[], lastActiveAt: Record<string, string>) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  friends: [],
  lastFetchedAt: null,
  lastActiveAt: {},
  setFriends: (friends, lastActiveAt) => set({ friends, lastActiveAt, lastFetchedAt: Date.now() }),
}));
