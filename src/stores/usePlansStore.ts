import { create } from 'zustand';
import type { PlanWithMembers } from '@/types/plans';

interface PlansState {
  plans: PlanWithMembers[];
  lastFetchedAt: number | null;
  setPlans: (plans: PlanWithMembers[]) => void;
}

export const usePlansStore = create<PlansState>((set) => ({
  plans: [],
  lastFetchedAt: null,
  setPlans: (plans) => set({ plans, lastFetchedAt: Date.now() }),
}));
