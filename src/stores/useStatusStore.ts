// Phase 2 v1.3 — Shared current-status store for cross-screen sync (OVR-02).
// Replaces the original React Query plan from D-25 because the project has
// zero @tanstack/react-query (verified via grep against package.json).
//
// Owns: the authenticated user's own current status row.
// Consumers (Plan 04+): src/hooks/useStatus.ts (writer) and
// src/components/status/MoodPicker.tsx (reader, mounted on Home + Profile).

import { create } from 'zustand';
import type { CurrentStatus } from '@/types/app';

interface StatusState {
  /** Authenticated user's own current status row, or null when not loaded / not set. */
  currentStatus: CurrentStatus | null;
  /** Replace the cached status (called by useStatus.setStatus + useStatus refetch). */
  setCurrentStatus: (next: CurrentStatus | null) => void;
  /** Update last_active_at only — used by useStatus.touch (HEART-02). */
  updateLastActive: (lastActiveAt: string) => void;
  /** Wipe on logout (T-02-11 mitigation; wired by Plan 04 in the auth listener). */
  clear: () => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  currentStatus: null,
  setCurrentStatus: (next) => set({ currentStatus: next }),
  updateLastActive: (lastActiveAt) =>
    set((state) =>
      state.currentStatus
        ? { currentStatus: { ...state.currentStatus, last_active_at: lastActiveAt } }
        : state
    ),
  clear: () => set({ currentStatus: null }),
}));
