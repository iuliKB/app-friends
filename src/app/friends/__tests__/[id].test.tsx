/**
 * @jest-environment jsdom
 *
 * Friend profile screen test — Phase 33 Plan 06.
 *
 * Covers:
 *   REQ-FP-07 — Happy path: full profile data renders all sections
 *   REQ-FP-07 — Sparse profile: no bio/birthday/timezone → only Friends since in INFO
 *   REQ-FP-06 — Message button → openChat called with correct params
 *   REQ-FP-06 — More button → showActionSheet with single 'Remove Friend' destructive item
 *   REQ-FP-09 — Avatar tap when avatar_url present → ImageViewerModal visible flips true
 *   REQ-FP-09 — Avatar tap when avatar_url null → no modal opens
 *   REQ-FP-12 — friendsSince === null → renders "No longer friends" view + Back CTA
 *
 * Run: npx jest src/app/friends/__tests__/\[id\].test.tsx --runInBand --no-coverage
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Mock native modules that require native bridges
jest.mock('expo-image', () => ({
  Image: 'Image',
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  saveToLibraryAsync: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock components that pull in native modules
jest.mock('@/components/friends/FriendProfileHeader', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    FriendProfileHeader: ({ onAvatarPress, avatarUrl, displayName }: {
      onAvatarPress?: () => void;
      avatarUrl?: string | null;
      displayName?: string;
    }) => {
      // Render the avatar button if onAvatarPress + avatarUrl provided (REQ-FP-09)
      if (onAvatarPress && avatarUrl) {
        return React.createElement(TouchableOpacity, {
          onPress: onAvatarPress,
          accessibilityLabel: `Show profile photo of ${displayName || ''}`,
          testID: 'header-avatar-button',
        });
      }
      return null;
    },
  };
});
jest.mock('@/components/friends/FriendProfileBlurredWash', () => ({
  FriendProfileBlurredWash: () => null,
}));
jest.mock('@/components/chat/ImageViewerModal', () => {
  const React = require('react');
  const { Modal, TouchableOpacity, Text } = require('react-native');
  return {
    ImageViewerModal: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
      React.createElement(
        Modal,
        { visible, testID: 'image-viewer-modal' },
        React.createElement(TouchableOpacity, { onPress: onClose, accessibilityLabel: 'Close image viewer' },
          React.createElement(Text, null, 'Close'),
        ),
      ),
  };
});
jest.mock('@/components/common/AvatarCircle', () => {
  const React = require('react');
  const { TouchableOpacity, View } = require('react-native');
  return {
    AvatarCircle: ({ onPress, displayName, size }: { onPress?: () => void; displayName: string; size?: number }) => {
      if (onPress) {
        return React.createElement(TouchableOpacity, {
          onPress,
          accessibilityLabel: `Show profile photo of ${displayName}`,
          testID: 'avatar-pressable',
        });
      }
      return React.createElement(View, { testID: 'avatar-view' });
    },
  };
});
jest.mock('@/components/friends/StatusPill', () => ({
  StatusPill: () => null,
}));

// Mock the friends components that render native views with icons/palette
jest.mock('@/components/friends/GroupedInsetSection', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    GroupedInsetSection: ({ title, children }: { title: string; children: React.ReactNode }) =>
      React.createElement(View, { testID: `section-${title}` },
        React.createElement(Text, null, title),
        children,
      ),
  };
});
jest.mock('@/components/friends/ProfileInfoRow', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ProfileInfoRow: ({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) => {
      const content = React.createElement(View, null,
        React.createElement(Text, null, label),
        value ? React.createElement(Text, null, value) : null,
      );
      if (onPress) {
        return React.createElement(TouchableOpacity, { onPress }, content);
      }
      return content;
    },
  };
});
jest.mock('@/components/friends/BioRow', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    BioRow: ({ bio }: { bio: string }) =>
      React.createElement(View, null,
        React.createElement(Text, null, 'Bio'),
        React.createElement(Text, null, bio),
      ),
  };
});
jest.mock('@/components/friends/QuickActionsRow', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    QuickActionsRow: ({ onMessage, onToggleMute, onPhotos, onMore, isMuted, friendFirstName }: {
      onMessage: () => void;
      onToggleMute: () => void;
      onPhotos: () => void;
      onMore: () => void;
      isMuted: boolean;
      friendFirstName: string;
    }) =>
      React.createElement(View, { testID: 'quick-actions-row' },
        React.createElement(TouchableOpacity, { onPress: onMessage, accessibilityLabel: `Message ${friendFirstName}` },
          React.createElement(Text, null, 'Message'),
        ),
        React.createElement(TouchableOpacity, { onPress: onToggleMute, accessibilityLabel: isMuted ? `Unmute ${friendFirstName}` : `Mute ${friendFirstName}` },
          React.createElement(Text, null, isMuted ? 'Unmute' : 'Mute'),
        ),
        React.createElement(TouchableOpacity, { onPress: onPhotos },
          React.createElement(Text, null, 'Photos'),
        ),
        React.createElement(TouchableOpacity, { onPress: onMore },
          React.createElement(Text, null, 'More'),
        ),
      ),
  };
});
jest.mock('@/components/common/SkeletonPulse', () => ({
  SkeletonPulse: () => null,
}));
jest.mock('@/components/common/PrimaryButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    PrimaryButton: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(TouchableOpacity, { onPress },
        React.createElement(Text, null, title),
      ),
  };
});
jest.mock('@/components/squad/WishListItem', () => ({
  WishListItem: () => null,
}));
jest.mock('@/components/common/ErrorDisplay', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    ErrorDisplay: ({ message }: { message: string }) =>
      React.createElement(View, null,
        React.createElement(Text, null, message),
      ),
  };
});

// Mock expo-router
// jest.mock factory is hoisted above const declarations, so we cannot reference outer
// variables inside it. Instead, the factory creates new jest.fn() instances directly,
// and we retrieve them via jest.requireMock in beforeEach.
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'friend-1' }),
  useRouter: () => ({
    back: jest.requireMock('expo-router').router.back,
    push: jest.requireMock('expo-router').router.push,
  }),
  router: { back: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
}));

// Convenience references — populated in beforeEach after module is mocked
let mockBack: jest.Mock;
let mockPush: jest.Mock;

// Mock data hooks
const mockUseFriendProfile = jest.fn();
const mockUseFriendMutuals = jest.fn();
const mockUseFriendWishList = jest.fn();
const mockUseExpensesWithFriend = jest.fn();
const mockUseChatDmPreferences = jest.fn();
const mockUseFriends = jest.fn();
const mockUseFriendsOfFriend = jest.fn();

jest.mock('@/hooks/useFriendProfile', () => ({
  useFriendProfile: (...args: unknown[]) => mockUseFriendProfile(...args),
}));
jest.mock('@/hooks/useFriendMutuals', () => ({
  useFriendMutuals: (...args: unknown[]) => mockUseFriendMutuals(...args),
}));
jest.mock('@/hooks/useFriendWishList', () => ({
  useFriendWishList: (...args: unknown[]) => mockUseFriendWishList(...args),
}));
jest.mock('@/hooks/useExpensesWithFriend', () => ({
  useExpensesWithFriend: (...args: unknown[]) => mockUseExpensesWithFriend(...args),
}));
jest.mock('@/hooks/useChatDmPreferences', () => ({
  useChatDmPreferences: (...args: unknown[]) => mockUseChatDmPreferences(...args),
}));
jest.mock('@/hooks/useFriends', () => ({
  useFriends: (...args: unknown[]) => mockUseFriends(...args),
}));
jest.mock('@/hooks/useFriendsOfFriend', () => ({
  useFriendsOfFriend: (...args: unknown[]) => mockUseFriendsOfFriend(...args),
}));

// Mock openChat and showActionSheet
const mockOpenChat = jest.fn();
const mockShowActionSheet = jest.fn();
jest.mock('@/lib/openChat', () => ({
  openChat: (...args: unknown[]) => mockOpenChat(...args),
}));
jest.mock('@/lib/action-sheet', () => ({
  showActionSheet: (...args: unknown[]) => mockShowActionSheet(...args),
}));

// Mock supabase
const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock auth store
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'u-self' } } }),
}));

// @/theme is auto-mapped to __mocks__/theme.js via jest.config.js moduleNameMapper — no jest.mock needed.

// Mock TanStack Query for mutation
const mockSetQueryData = jest.fn();
const mockCancelQueries = jest.fn();
const mockGetQueryData = jest.fn();
const mockInvalidateQueries = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: mockSetQueryData,
    cancelQueries: mockCancelQueries,
    getQueryData: mockGetQueryData,
    invalidateQueries: mockInvalidateQueries,
  }),
  useMutation: (opts: {
    mutationFn: (...args: unknown[]) => unknown;
    onMutate?: (...args: unknown[]) => unknown;
    onError?: (...args: unknown[]) => unknown;
    onSettled?: (...args: unknown[]) => unknown;
  }) => ({
    mutate: jest.fn(async (vars: unknown) => {
      const snapshot = opts.onMutate ? await opts.onMutate(vars) : undefined;
      try {
        await opts.mutationFn(vars);
        if (opts.onSettled) await opts.onSettled(undefined, null, vars, snapshot);
      } catch (err) {
        if (opts.onError) await opts.onError(err, vars, snapshot);
        if (opts.onSettled) await opts.onSettled(undefined, err, vars, snapshot);
      }
    }),
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

// Note: react-native-reanimated and expo-haptics are auto-mocked via jest.config.js
// moduleNameMapper — no explicit jest.mock() calls needed here.

import FriendProfileScreen from '../[id]';

// ─── Default mock data ────────────────────────────────────────────────────────

const FULL_PROFILE_DATA = {
  profile: {
    display_name: 'Alice Smith',
    username: 'alice',
    avatar_url: 'https://example.com/alice.jpg',
    birthday_month: 8,
    birthday_day: 14,
    birthday_year: 1995,
    timezone: 'Europe/London',
    bio: 'Hey I love camping!',
  },
  friendsSince: '2024-05-12T00:00:00Z',
  status: 'free' as const,
  contextTag: null,
  statusExpiresAt: null,
  lastActiveAt: null,
};

const FULL_MUTUALS_DATA = {
  mutualPlansCount: 3,
  mutualFriendsCount: 2,
  sharedPhotosCount: 5,
  sharedPlanIds: ['plan-1', 'plan-2'],
};

function setupDefaultMocks() {
  mockUseFriendProfile.mockReturnValue({
    data: FULL_PROFILE_DATA,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseFriendMutuals.mockReturnValue({
    data: FULL_MUTUALS_DATA,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseFriendWishList.mockReturnValue({
    items: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
    toggleClaim: jest.fn(),
  });
  mockUseExpensesWithFriend.mockReturnValue({
    expenses: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseChatDmPreferences.mockReturnValue({
    data: { isMuted: false },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseFriends.mockReturnValue({ friends: [], loading: false });
  mockUseFriendsOfFriend.mockReturnValue({ friends: [], isLoading: false });
  mockGetQueryData.mockReturnValue(null);
}

beforeEach(() => {
  // Grab references to the static router.back/push jest.fn() instances
  const routerMock = jest.requireMock('expo-router');
  mockBack = routerMock.router.back as jest.Mock;
  mockPush = routerMock.router.push as jest.Mock;
  jest.clearAllMocks();
  setupDefaultMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test('REQ-FP-07 happy path: renders bio, friends since, birthday, timezone, and all mutual rows', () => {
  render(<FriendProfileScreen />);

  // Bio section
  expect(screen.getByText('Hey I love camping!')).toBeTruthy();
  // Friends since row
  expect(screen.getByText('Friends since')).toBeTruthy();
  // Birthday row
  expect(screen.getByText('Birthday')).toBeTruthy();
  // Timezone row
  expect(screen.getByText('Timezone')).toBeTruthy();
  // MUTUAL section rows
  expect(screen.getByText('Mutual plans')).toBeTruthy();
  expect(screen.getByText('Mutual friends')).toBeTruthy();
  expect(screen.getByText('Shared photos')).toBeTruthy();
  expect(screen.getByText('IOU balance')).toBeTruthy();
  // Count for mutual plans (> 0)
  expect(screen.getByText('3')).toBeTruthy();
  // Section titles
  expect(screen.getByText('INFO')).toBeTruthy();
  expect(screen.getByText('MUTUAL')).toBeTruthy();
  expect(screen.getByText('WISH LIST')).toBeTruthy();
});

test('REQ-FP-07 sparse profile: no bio/birthday/timezone — INFO shows only Friends since; MUTUAL shows None yet', () => {
  mockUseFriendProfile.mockReturnValue({
    data: {
      profile: {
        display_name: 'Bob',
        username: 'bob',
        avatar_url: null,
        birthday_month: null,
        birthday_day: null,
        birthday_year: null,
        timezone: null,
        bio: null,
      },
      friendsSince: '2024-01-01T00:00:00Z',
      status: null,
      contextTag: null,
      statusExpiresAt: null,
      lastActiveAt: null,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseFriendMutuals.mockReturnValue({
    data: { mutualPlansCount: 0, mutualFriendsCount: 0, sharedPhotosCount: 0, sharedPlanIds: [] },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });

  render(<FriendProfileScreen />);

  // Friends since always appears
  expect(screen.getByText('Friends since')).toBeTruthy();
  // Bio row should not appear (null bio)
  expect(screen.queryByText('Bio')).toBeNull();
  // Birthday row should not appear
  expect(screen.queryByText('Birthday')).toBeNull();
  // Timezone row should not appear
  expect(screen.queryByText('Timezone')).toBeNull();
  // MUTUAL rows should show "None yet" for zero counts
  const noneYetInstances = screen.getAllByText('None yet');
  expect(noneYetInstances.length).toBeGreaterThanOrEqual(3); // plans, friends, photos at min
});

test('REQ-FP-06 Message button: calls openChat with dmFriend params', async () => {
  render(<FriendProfileScreen />);

  const messageButton = screen.getByText('Message');
  fireEvent.press(messageButton);

  expect(mockOpenChat).toHaveBeenCalledWith(
    expect.anything(), // router
    expect.objectContaining({
      kind: 'dmFriend',
      friendId: 'friend-1',
      friendName: 'Alice Smith',
    }),
  );
});

test('REQ-FP-06 More button: calls showActionSheet with single Remove Friend destructive item', () => {
  render(<FriendProfileScreen />);

  const moreButton = screen.getByText('More');
  fireEvent.press(moreButton);

  expect(mockShowActionSheet).toHaveBeenCalledWith(
    'Alice Smith',
    expect.arrayContaining([
      expect.objectContaining({ label: 'Remove Friend', destructive: true }),
    ]),
  );
  // Only 1 item in the array (helper auto-appends Cancel)
  const callArgs = mockShowActionSheet.mock.calls[0];
  expect(callArgs[1]).toHaveLength(1);
});

test('REQ-FP-09 avatar viewer: avatar_url present → header receives onAvatarPress; tap opens modal', () => {
  render(<FriendProfileScreen />);

  // FriendProfileHeader mock renders a pressable button when avatarUrl + onAvatarPress are both provided
  const avatarButton = screen.queryByTestId('header-avatar-button');
  expect(avatarButton).toBeTruthy(); // button is present when avatar_url is not null

  // Tap avatar → state flips avatarViewerOpen to true → ImageViewerModal visible
  fireEvent.press(avatarButton!);

  // After press the modal becomes visible — look for Close text in our modal mock
  const closeBtn = screen.queryByText('Close');
  expect(closeBtn).toBeTruthy();
});

test('REQ-FP-09 avatar viewer absent: avatar_url null → no avatar button in header', () => {
  mockUseFriendProfile.mockReturnValue({
    data: {
      profile: {
        display_name: 'Bob',
        username: 'bob',
        avatar_url: null,
        birthday_month: null,
        birthday_day: null,
        birthday_year: null,
        timezone: null,
        bio: null,
      },
      friendsSince: '2024-01-01T00:00:00Z',
      status: null,
      contextTag: null,
      statusExpiresAt: null,
      lastActiveAt: null,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });

  render(<FriendProfileScreen />);

  // When avatar_url is null, onAvatarPress is not passed → header mock renders null (no button)
  const avatarButton = screen.queryByTestId('header-avatar-button');
  expect(avatarButton).toBeNull();
});

test('REQ-FP-12 friend-not-found: friendsSince null → renders "No longer friends" + Back CTA calls router.back()', () => {
  mockUseFriendProfile.mockReturnValue({
    data: {
      profile: {
        display_name: 'Charlie',
        username: 'charlie',
        avatar_url: null,
        birthday_month: null,
        birthday_day: null,
        birthday_year: null,
        timezone: null,
        bio: null,
      },
      friendsSince: null,
      status: null,
      contextTag: null,
      statusExpiresAt: null,
      lastActiveAt: null,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });

  render(<FriendProfileScreen />);

  // Should render the "No longer friends" empty view
  expect(screen.getByText('No longer friends')).toBeTruthy();

  // "Back to friends" CTA should be present and call router.back()
  const backButton = screen.getByText('Back to friends');
  fireEvent.press(backButton);
  expect(mockBack).toHaveBeenCalled();
});

test('Loading state: renders skeleton when isLoading and no data', () => {
  mockUseFriendProfile.mockReturnValue({
    data: null,
    isLoading: true,
    error: null,
    refetch: jest.fn(),
  });

  render(<FriendProfileScreen />);

  // Should render skeleton loading (no profile name in DOM)
  expect(screen.queryByText('Alice Smith')).toBeNull();
  // Should not render friend-not-found view
  expect(screen.queryByText('No longer friends')).toBeNull();
});

test('Error state: renders ErrorDisplay when error present', () => {
  mockUseFriendProfile.mockReturnValue({
    data: null,
    isLoading: false,
    error: 'Network error',
    refetch: jest.fn(),
  });

  render(<FriendProfileScreen />);

  // Should show the error message
  expect(screen.getByText("Couldn't load profile. Check your connection and try again.")).toBeTruthy();
});
