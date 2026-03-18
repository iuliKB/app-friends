import { create } from 'zustand';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface HomeState {
  friends: FriendWithStatus[];
  lastFetchedAt: number | null;
  statusUpdatedAt: Record<string, string>;
  setFriends: (friends: FriendWithStatus[], statusUpdatedAt: Record<string, string>) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  friends: [],
  lastFetchedAt: null,
  statusUpdatedAt: {},
  setFriends: (friends, statusUpdatedAt) =>
    set({ friends, statusUpdatedAt, lastFetchedAt: Date.now() }),
}));
