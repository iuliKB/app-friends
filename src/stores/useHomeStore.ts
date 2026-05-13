// Phase 31 Plan 03 — server-data mirror fields removed (replaced by useQuery cache).
// TanStack Query handles staleness; the friends list mirror is gone for good.
// lastActiveAt is KEPT — UI overlay timing (heartbeat tick stability), NOT server data.

import { create } from 'zustand';

interface HomeState {
  lastActiveAt: Record<string, string>;
  setLastActiveAt: (lastActiveAt: Record<string, string>) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  lastActiveAt: {},
  setLastActiveAt: (lastActiveAt) => set({ lastActiveAt }),
}));
