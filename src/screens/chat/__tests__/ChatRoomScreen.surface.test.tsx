/**
 * ChatRoomScreen surface-writer test — Phase 30, Plan 04 (Task 2).
 *
 * Verifies the useFocusEffect that pushes `'chat'` onto the navigation
 * store on focus and restores `'tabs'` on blur.
 *
 * Strategy: ChatRoomScreen has heavy dependencies (useChatRoom, useChatTodos,
 * supabase, ImagePicker, …) so we mock all of them and intercept the
 * `useFocusEffect` callback to invoke it manually — then assert store state
 * after focus and after cleanup. This isolates the surface-write contract
 * without coupling the test to the rest of the screen's behavior.
 *
 * Run: npx jest --testPathPatterns="ChatRoomScreen.surface" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useNavigationStore } from '@/stores/useNavigationStore';

// Capture the most-recent useFocusEffect callback so we can run it manually.
let lastFocusEffectCallback: (() => void | (() => void)) | null = null;

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    lastFocusEffectCallback = cb;
  },
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Heavy hook dependencies — return shapes shaped for the screen's first-render
// path. None of these are exercised by the surface-writer test.
jest.mock('@/hooks/useChatRoom', () => ({
  useChatRoom: () => ({
    messages: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
    sendMessage: jest.fn(),
    retryMessage: jest.fn(),
    sendImage: jest.fn(),
    sendPoll: jest.fn(),
    deleteMessage: jest.fn(),
    addReaction: jest.fn(),
    lastPollVoteEvent: null,
  }),
}));

jest.mock('@/hooks/useChatTodos', () => ({
  useChatTodos: () => ({ sendChatTodo: jest.fn(), completeChatTodo: jest.fn() }),
}));

jest.mock('@/hooks/useChatMembers', () => ({
  useChatMembers: () => ({ members: [] }),
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: null }) => unknown) =>
    selector({ session: null }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaType: 'images',
}));

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 44,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Heavy child components — render as plain markers.
jest.mock('@/components/chat/MessageBubble', () => ({
  MessageBubble: 'MessageBubble',
  formatTimeSeparator: () => '',
  shouldShowTimeSeparator: () => false,
}));
jest.mock('@/components/chat/ImageViewerModal', () => ({ ImageViewerModal: 'ImageViewerModal' }));
jest.mock('@/components/chat/PollCreationSheet', () => ({ PollCreationSheet: 'PollCreationSheet' }));
jest.mock('@/components/chat/ChatTodoPickerSheet', () => ({ ChatTodoPickerSheet: 'ChatTodoPickerSheet' }));
jest.mock('@/components/chat/SendBar', () => ({ SendBar: 'SendBar' }));
jest.mock('@/components/chat/PinnedPlanBanner', () => ({ PinnedPlanBanner: 'PinnedPlanBanner' }));
jest.mock('@/components/chat/BirthdayWishListPanel', () => ({ BirthdayWishListPanel: 'BirthdayWishListPanel' }));
jest.mock('@/components/chat/GroupParticipantsSheet', () => ({ GroupParticipantsSheet: 'GroupParticipantsSheet' }));
jest.mock('@/components/common/ErrorDisplay', () => ({ ErrorDisplay: 'ErrorDisplay' }));
jest.mock('@/components/common/SkeletonPulse', () => ({ SkeletonPulse: 'SkeletonPulse' }));

// Now import the screen after mocks are wired.
import { ChatRoomScreen } from '../ChatRoomScreen';

describe('ChatRoomScreen useFocusEffect surface writer (Phase 30 Plan 04 — Task 2)', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset();
    lastFocusEffectCallback = null;
  });

  it("registers a useFocusEffect callback that sets currentSurface to 'chat' on focus", () => {
    render(<ChatRoomScreen dmChannelId="dm-1" friendName="Alice" />);
    expect(lastFocusEffectCallback).not.toBeNull();
    // Initial state.
    expect(useNavigationStore.getState().currentSurface).toBe('tabs');
    // Invoke the captured focus-effect callback (simulating focus).
    lastFocusEffectCallback?.();
    expect(useNavigationStore.getState().currentSurface).toBe('chat');
  });

  it("cleanup returned by useFocusEffect restores currentSurface to 'tabs' (blur)", () => {
    render(<ChatRoomScreen dmChannelId="dm-1" friendName="Alice" />);
    const cleanup = lastFocusEffectCallback?.();
    expect(useNavigationStore.getState().currentSurface).toBe('chat');
    // Simulate blur — invoke the cleanup function returned by the focus callback.
    expect(typeof cleanup).toBe('function');
    (cleanup as () => void)();
    expect(useNavigationStore.getState().currentSurface).toBe('tabs');
  });

  it("re-focusing after blur sets surface back to 'chat'", () => {
    render(<ChatRoomScreen dmChannelId="dm-1" friendName="Alice" />);
    const cleanup1 = lastFocusEffectCallback?.() as () => void;
    cleanup1();
    expect(useNavigationStore.getState().currentSurface).toBe('tabs');
    // New focus cycle.
    lastFocusEffectCallback?.();
    expect(useNavigationStore.getState().currentSurface).toBe('chat');
  });
});
