// Phase 30 — Navigation source-of-truth store.
// Replaces the nested-navigator-state inspection in CustomTabBar.tsx:123-129
// (which keyed off navigator topology, not what was on screen — causing the
// bottom bar to leak through to ChatRoomScreen when entered from a non-canonical
// entry path such as PlanDashboard's "Open Chat" pill).
//
// Owns: the current navigation surface — a string union describing what the user
// is presently looking at. Plan 04 wires CustomTabBar as a reader and ChatRoomScreen
// as a writer (useFocusEffect: set('chat') on focus, set('tabs') on blur).
//
// Not retained across cold launches — defaults to 'tabs' on every fresh mount.

import { create } from 'zustand';

/** Canonical surfaces the user can be looking at. The bottom tab bar is hidden
 * for any surface other than 'tabs'. Add new surfaces here as new full-screen
 * presentation types are introduced.
 */
export type NavigationSurface = 'tabs' | 'chat' | 'plan' | 'modal' | 'auth';

interface NavigationState {
  /** The surface currently on screen. Read by CustomTabBar to decide visibility. */
  currentSurface: NavigationSurface;
  /** Replace the current surface (called by screens via useFocusEffect on focus/blur). */
  setSurface: (next: NavigationSurface) => void;
  /** Restore the default surface ('tabs'). Useful for logout / hard resets. */
  reset: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentSurface: 'tabs',
  setSurface: (next) => set({ currentSurface: next }),
  reset: () => set({ currentSurface: 'tabs' }),
}));
