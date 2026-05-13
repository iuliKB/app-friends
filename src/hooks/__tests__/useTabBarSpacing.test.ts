/**
 * useTabBarSpacing test — quick 260513-5as.
 *
 * Tests verify the formula:
 *   - surface === 'tabs'  → insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + BREATHING_ROOM
 *                          (== insets.bottom + 100 with TAB_BAR_HEIGHT=64, TAB_BAR_BOTTOM_GAP=12,
 *                           BREATHING_ROOM=24 — numerically identical to HomeScreen's old magic number)
 *   - surface !== 'tabs'  → insets.bottom only (full-screen surfaces hide the bar)
 *
 * Drives the real useNavigationStore via getState().setSurface() — matches the
 * pattern used in src/components/common/__tests__/CustomTabBar.test.tsx.
 *
 * Run: npx jest --testPathPatterns="useTabBarSpacing" --no-coverage
 */

import { renderHook } from '@testing-library/react-native';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { useTabBarSpacing } from '../useTabBarSpacing';

// Hook transitively imports TAB_BAR_HEIGHT/TAB_BAR_BOTTOM_GAP from CustomTabBar.tsx,
// which itself pulls @expo/vector-icons + expo-router (via usePendingRequestsCount /
// useInvitationCount). Mock the same surfaces CustomTabBar.test.tsx mocks so the
// transitive imports resolve in the jest environment.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/hooks/usePendingRequestsCount', () => ({
  usePendingRequestsCount: () => ({ count: 0, refetch: jest.fn() }),
}));

jest.mock('@/hooks/useInvitationCount', () => ({
  useInvitationCount: () => ({ count: 0, refetch: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

describe('useTabBarSpacing (quick 260513-5as)', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset();
  });

  it('returns insets.bottom + 100 (== insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 24) when surface === tabs', () => {
    useNavigationStore.getState().setSurface('tabs');
    const { result } = renderHook(() => useTabBarSpacing());
    expect(result.current).toBe(134);
  });

  it('returns only insets.bottom when surface === chat', () => {
    useNavigationStore.getState().setSurface('chat');
    const { result } = renderHook(() => useTabBarSpacing());
    expect(result.current).toBe(34);
  });

  it('returns only insets.bottom for plan/modal/auth surfaces', () => {
    (['plan', 'modal', 'auth'] as const).forEach((surface) => {
      useNavigationStore.getState().setSurface(surface);
      const { result } = renderHook(() => useTabBarSpacing());
      expect(result.current).toBe(34);
    });
  });
});
