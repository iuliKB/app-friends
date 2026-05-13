// Returns `paddingBottom` for tab-screen scroll containers. Composes the
// safe-area inset + tab-bar geometry + breathing room when the bar is visible;
// returns inset only when a full-screen surface (chat/plan/modal/auth) has
// hidden the bar.

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP } from '@/components/common/CustomTabBar';
import { useNavigationStore } from '@/stores/useNavigationStore';

const BREATHING_ROOM = 24;

export function useTabBarSpacing(): number {
  const insets = useSafeAreaInsets();
  const surface = useNavigationStore((s) => s.currentSurface);
  if (surface !== 'tabs') {
    return insets.bottom;
  }
  return insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + BREATHING_ROOM;
}
