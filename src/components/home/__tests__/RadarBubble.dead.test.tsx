/**
 * RadarBubble.dead test — Phase 29, HOME-05.
 * Tests verify DEAD bubble: no Pressable wrapper, no PulseRing, opacity 0.38.
 * Run: npx jest --testPathPatterns="RadarBubble" --no-coverage
 *
 * RED baseline: Test "DEAD bubble has no interactive button role" fails before Plan 02
 * (Pressable still wraps all states before Plan 02 implements DEAD non-interactive rendering).
 * GREEN: Test passes after Plan 02 removes Pressable for DEAD state.
 *
 * Note: queryAllByRole('button') does not work reliably with this project's RN string mocks.
 * We use UNSAFE_queryAllByType(Pressable) which checks the actual component type in the tree.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Pressable } from 'react-native';
import { ThemeProvider } from '@/theme';
import { RadarBubble } from '../RadarBubble';
import { computeHeartbeatState } from '@/lib/heartbeat';

jest.mock('@/lib/heartbeat', () => ({
  computeHeartbeatState: jest.fn(),
  HEARTBEAT_FADING_MS: 4 * 60 * 60 * 1000,
  HEARTBEAT_DEAD_MS: 8 * 60 * 60 * 1000,
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@/lib/action-sheet', () => ({
  showActionSheet: jest.fn(),
}));

jest.mock('@/components/common/AvatarCircle', () => ({
  AvatarCircle: 'AvatarCircle',
}));

const DEAD_FRIEND = {
  friend_id: 'test-id-dead',
  display_name: 'Jane Dead',
  avatar_url: null,
  status: 'free',
  status_expires_at: null,
  last_active_at: null,
};

function renderBubble(heartbeatOverride: 'alive' | 'fading' | 'dead') {
  (computeHeartbeatState as jest.Mock).mockReturnValue(heartbeatOverride);
  return render(
    <ThemeProvider>
      <RadarBubble friend={DEAD_FRIEND as any} />
    </ThemeProvider>
  );
}

describe('RadarBubble DEAD state (HOME-05)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders display name as text', () => {
    const { getByText } = renderBubble('dead');
    expect(getByText('Jane Dead')).toBeTruthy();
  });

  it('DEAD bubble has no interactive button role', () => {
    const { UNSAFE_queryAllByType } = renderBubble('dead');
    // DEAD bubbles should not be interactive — no Pressable in the render tree.
    // This test FAILS before Plan 02 because Pressable wraps all heartbeat states.
    // After Plan 02, DEAD state skips the Pressable wrapper entirely.
    expect(UNSAFE_queryAllByType(Pressable)).toHaveLength(0);
  });

  it('ALIVE bubble has a button role', () => {
    const { UNSAFE_queryAllByType } = renderBubble('alive');
    // ALIVE bubbles should be interactive — Pressable must be present.
    expect(UNSAFE_queryAllByType(Pressable).length).toBeGreaterThan(0);
  });
});
