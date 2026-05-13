// Phase 31 Plan 04 — server-data mirror stripped.
//
// Previously this store mirrored the `plans` list from `usePlans` and tracked a
// fetched-at timestamp. With TanStack Query owning the server cache
// (queryKeys.plans.list, queryKeys.plans.detail), the mirror is removed.
//
// This file is intentionally kept as an empty scaffold so future UI-only flags
// (e.g., "selectedPlanFilter") can land here without re-introducing the
// zustand-shaped boilerplate. All previous consumers of `setPlans` /
// `removePlan` / `plans` were migrated to read/write the React Query cache
// directly (PlanDashboardScreen via queryClient.invalidateQueries; PlanCreateModal
// via queryClient.invalidateQueries after the cover-image update).

import { create } from 'zustand';

interface PlansState {
  // UI-only flags would live here. None defined yet.
  _placeholder?: never;
}

export const usePlansStore = create<PlansState>(() => ({}));
