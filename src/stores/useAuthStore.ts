import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  loading: boolean;
  needsProfileSetup: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setNeedsProfileSetup: (needs: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  needsProfileSetup: false,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setNeedsProfileSetup: (needs) => set({ needsProfileSetup: needs }),
}));
