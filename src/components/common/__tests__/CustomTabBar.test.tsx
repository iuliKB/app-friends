/**
 * CustomTabBar test — Phase 30, Plan 04 (Task 1).
 *
 * Verifies the visibility-decision refactor: the tab bar now reads its
 * `currentSurface` from `useNavigationStore` instead of inspecting nested
 * navigator state. The old `nestedRoute?.name === 'room'` check is gone.
 *
 * Tests:
 *   1. When `currentSurface === 'tabs'`, the bar renders the 5 tabs.
 *   2. When `currentSurface === 'chat'`, the component returns null (bar hidden).
 *   3. When `currentSurface === 'plan'` / 'modal' / 'auth', the bar is hidden too
 *      (visibility condition is `surface !== 'tabs'`, future-proofing new
 *      surfaces).
 *
 * Run: npx jest --testPathPatterns="CustomTabBar" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CustomTabBar } from '../CustomTabBar';
import { useNavigationStore } from '@/stores/useNavigationStore';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/hooks/usePendingRequestsCount', () => ({
  usePendingRequestsCount: () => ({ count: 0, refetch: jest.fn() }),
}));

jest.mock('@/hooks/useInvitationCount', () => ({
  useInvitationCount: () => ({ count: 0, refetch: jest.fn() }),
}));

function makeProps() {
  // BottomTabBarProps stub — only `state` and `navigation` are read.
  const state = {
    index: 0,
    routes: [
      { key: 'index-1', name: 'index' },
      { key: 'squad-1', name: 'squad' },
      { key: 'plans-1', name: 'plans' },
      { key: 'chat-1', name: 'chat' },
      { key: 'profile-1', name: 'profile' },
    ],
  };
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  return { state, navigation } as never;
}

describe('CustomTabBar visibility (Phase 30 Plan 04 — Task 1)', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset();
  });

  it("renders the tab pill when currentSurface === 'tabs'", () => {
    useNavigationStore.getState().setSurface('tabs');
    const { toJSON } = render(<CustomTabBar {...makeProps()} />);
    // Non-null tree = bar rendered.
    expect(toJSON()).not.toBeNull();
  });

  it("returns null when currentSurface === 'chat' (bar hidden)", () => {
    useNavigationStore.getState().setSurface('chat');
    const { toJSON } = render(<CustomTabBar {...makeProps()} />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when currentSurface === 'plan' (any non-tabs surface hides bar)", () => {
    useNavigationStore.getState().setSurface('plan');
    const { toJSON } = render(<CustomTabBar {...makeProps()} />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when currentSurface === 'modal'", () => {
    useNavigationStore.getState().setSurface('modal');
    const { toJSON } = render(<CustomTabBar {...makeProps()} />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when currentSurface === 'auth'", () => {
    useNavigationStore.getState().setSurface('auth');
    const { toJSON } = render(<CustomTabBar {...makeProps()} />);
    expect(toJSON()).toBeNull();
  });
});
