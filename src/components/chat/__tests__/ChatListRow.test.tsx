/**
 * ChatListRow test scaffold — Phase 32 Plan 02.
 *
 * Validates the kind-aware preview rendering:
 *   • Media kinds (image / poll / todo) render full-sentence previews with NO
 *     leading preview icon and NO sender-name prefix
 *   • Text kind is name-prefixed ("You: " / "<FirstName>: ")
 *   • No prefix when lastMessageSenderName is null (no-messages branch)
 *   • Deleted kind renders preview body in italic (fontStyle: 'italic')
 *
 * Run: npx jest --testPathPatterns="ChatListRow" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ChatListRow } from '../ChatListRow';
import type { ChatListItem } from '@/types/chat';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Swipeable requires react-native-gesture-handler — stub it
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    Swipeable: ({ children }: { children: React.ReactNode }) =>
      React.createElement('Swipeable', null, children),
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  };
});

// AvatarCircle references expo-image — stub it
jest.mock('@/components/common/AvatarCircle', () => {
  const React = require('react');
  return {
    AvatarCircle: () => React.createElement('View', null),
  };
});

const baseItem: ChatListItem = {
  id: 'ch1',
  type: 'dm',
  title: 'Alice',
  avatarUrl: null,
  lastMessage: 'Hello',
  lastMessageAt: new Date().toISOString(),
  hasUnread: false,
  unreadCount: 0,
  isMuted: false,
  lastMessageKind: 'text',
  lastMessageSenderName: 'Alice',
};

function renderRow(overrides: Partial<ChatListItem> = {}) {
  return render(
    <ThemeProvider>
      <ChatListRow item={{ ...baseItem, ...overrides }} onPress={jest.fn()} />
    </ThemeProvider>
  );
}

describe('ChatListRow — Phase 32 preview rendering', () => {
  it('image kind renders the sentence preview with no name prefix and no preview icon', () => {
    const { getByText, queryByText, UNSAFE_queryAllByType } = renderRow({
      lastMessageKind: 'image',
      lastMessage: 'Alice sent a photo',
      lastMessageSenderName: 'Alice',
      title: 'Alice Chat',
    });
    // Full-sentence preview already names the sender — no "Alice: " prefix.
    expect(getByText('Alice sent a photo')).toBeTruthy();
    expect(queryByText('Alice: ')).toBeNull();
    // No leading preview icon for media kinds anymore.
    const icons = UNSAFE_queryAllByType('Ionicons' as unknown as React.ComponentType);
    expect(
      icons.find((el: { props: { name?: string } }) => el.props.name === 'image-outline')
    ).toBeFalsy();
  });

  it('poll kind renders "Poll: Pizza?" with no name prefix and no preview icon', () => {
    const { getByText, queryByText, UNSAFE_queryAllByType } = renderRow({
      lastMessageKind: 'poll',
      lastMessage: 'Poll: Pizza?',
      lastMessageSenderName: 'Alice',
      title: 'Alice Chat',
    });
    expect(getByText('Poll: Pizza?')).toBeTruthy();
    expect(queryByText('Alice: ')).toBeNull();
    const icons = UNSAFE_queryAllByType('Ionicons' as unknown as React.ComponentType);
    expect(
      icons.find((el: { props: { name?: string } }) => el.props.name === 'stats-chart-outline')
    ).toBeFalsy();
  });

  it('todo kind renders the sentence preview with no name prefix and no preview icon', () => {
    const { getByText, queryByText, UNSAFE_queryAllByType } = renderRow({
      lastMessageKind: 'todo',
      lastMessage: 'You shared a to-do',
      lastMessageSenderName: 'You',
      title: 'Group Chat',
    });
    expect(getByText('You shared a to-do')).toBeTruthy();
    expect(queryByText('You: ')).toBeNull();
    const icons = UNSAFE_queryAllByType('Ionicons' as unknown as React.ComponentType);
    expect(
      icons.find((el: { props: { name?: string } }) => el.props.name === 'checkbox-outline')
    ).toBeFalsy();
  });

  it('deleted kind renders "Message deleted" in italic with no name prefix — no preview icon', () => {
    const { UNSAFE_getAllByType, UNSAFE_queryAllByType } = renderRow({
      lastMessageKind: 'deleted',
      lastMessage: 'Message deleted',
      lastMessageSenderName: 'Alice',
      title: 'Alice Chat',
    });

    // Find the <Text> whose children is 'Message deleted' and assert it has fontStyle: 'italic'
    const allTexts = UNSAFE_getAllByType('Text' as unknown as React.ComponentType);
    const deletedText = allTexts.find((el: { props: { children?: unknown } }) => {
      const children = el.props.children;
      return children === 'Message deleted';
    });
    expect(deletedText).toBeTruthy();
    const styleArr = Array.isArray(deletedText?.props?.style)
      ? deletedText.props.style
      : [deletedText?.props?.style];
    const hasItalic = styleArr.some(
      (s: unknown) =>
        typeof s === 'object' && s !== null && (s as Record<string, unknown>).fontStyle === 'italic'
    );
    expect(hasItalic).toBe(true);

    // No preview icon for deleted kind — UNSAFE_queryAllByType returns [] not throws when empty
    const icons = UNSAFE_queryAllByType('Ionicons' as unknown as React.ComponentType);
    const previewIcon = icons.find(
      (el: { props: { name?: string } }) =>
        el.props.name !== 'notifications-off-outline' &&
        el.props.name !== 'calendar-outline' &&
        el.props.name !== 'people-outline' &&
        el.props.name !== 'gift-outline'
    );
    expect(previewIcon).toBeFalsy();
  });

  it('text kind with null sender (no-messages branch) renders body only, no prefix', () => {
    const { getByText, queryByText } = renderRow({
      lastMessageKind: 'text',
      lastMessage: 'No messages yet',
      lastMessageSenderName: null,
    });
    expect(getByText(/No messages yet/)).toBeTruthy();
    // No colon-separated prefix should appear
    expect(queryByText(/: $/)).toBeNull();
  });
});
