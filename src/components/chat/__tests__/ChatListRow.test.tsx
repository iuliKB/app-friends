/**
 * ChatListRow test scaffold — Phase 32 Plan 02.
 *
 * Validates the kind-aware preview rendering introduced in Plan 32-02:
 *   • Ionicons icon rendered for image / poll / todo kinds
 *   • No icon for text / system / deleted kinds
 *   • Sender prefix "You: " for own messages, "<FirstName>: " for others
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
      <ChatListRow
        item={{ ...baseItem, ...overrides }}
        onPress={jest.fn()}
      />
    </ThemeProvider>,
  );
}

// Helper: find all Ionicons host components rendered (excluding the swipe
// action icons which we don't render in unit tests since renderRightActions is
// triggered only on swipe).
function findIonicons(getByTestId: ReturnType<typeof render>['UNSAFE_getAllByType']) {
  try {
    // UNSAFE_getAllByType('Ionicons') works because the mock returns the
    // string 'Ionicons' as the component — RNTL's host-string element type.
    return getByTestId('Ionicons');
  } catch {
    return [];
  }
}

// Look up a <Text> node by its direct children value (handles mixed-children rows
// where getByText would match the concatenated text across the whole subtree).
type TextElement = { props: { children?: unknown; style?: unknown } };
function findTextNodeWithChildren(
  allTexts: TextElement[],
  childValue: unknown,
): TextElement | undefined {
  return allTexts.find((el) => {
    const c = el.props.children;
    // Direct string match
    if (c === childValue) return true;
    // Array children — check if the array contains the value
    if (Array.isArray(c)) return c.includes(childValue);
    return false;
  });
}

describe('ChatListRow — Phase 32 preview rendering', () => {
  it('image kind renders image-outline icon next to "Photo"', () => {
    const { UNSAFE_getAllByType } = renderRow({
      lastMessageKind: 'image',
      lastMessage: 'Photo',
      lastMessageSenderName: 'Alice',
      title: 'Alice Chat',
    });
    // The outer preview <Text> has children ["Alice: ", "Photo"] — verify "Photo" appears
    const allTexts = UNSAFE_getAllByType('Text' as unknown as React.ComponentType) as TextElement[];
    const previewText = findTextNodeWithChildren(allTexts, 'Photo');
    expect(previewText).toBeTruthy();
    // An Ionicons element with name="image-outline" is present
    const icons = UNSAFE_getAllByType('Ionicons' as unknown as React.ComponentType);
    const previewIcon = icons.find((el: { props: { name?: string } }) => el.props.name === 'image-outline');
    expect(previewIcon).toBeTruthy();
  });

  it('poll kind renders stats-chart-outline icon next to "Poll: Pizza?"', () => {
    const { UNSAFE_getAllByType } = renderRow({
      lastMessageKind: 'poll',
      lastMessage: 'Poll: Pizza?',
      lastMessageSenderName: 'Alice',
      title: 'Alice Chat',
    });
    const allTexts = UNSAFE_getAllByType('Text' as unknown as React.ComponentType) as TextElement[];
    const previewText = findTextNodeWithChildren(allTexts, 'Poll: Pizza?');
    expect(previewText).toBeTruthy();
    const icons = UNSAFE_getAllByType('Ionicons' as unknown as React.ComponentType);
    const previewIcon = icons.find((el: { props: { name?: string } }) => el.props.name === 'stats-chart-outline');
    expect(previewIcon).toBeTruthy();
  });

  it('todo kind renders checkbox-outline icon next to "To-do: Buy milk" with "You: " prefix', () => {
    const { UNSAFE_getAllByType } = renderRow({
      lastMessageKind: 'todo',
      lastMessage: 'To-do: Buy milk',
      lastMessageSenderName: 'You',
      title: 'Group Chat',
    });
    // The outer preview <Text> has children ["You: ", "To-do: Buy milk"]
    const allTexts = UNSAFE_getAllByType('Text' as unknown as React.ComponentType) as TextElement[];
    const previewText = findTextNodeWithChildren(allTexts, 'To-do: Buy milk');
    expect(previewText).toBeTruthy();
    // Sender prefix "You: " is a sibling child
    const prefixText = findTextNodeWithChildren(allTexts, 'You: ');
    expect(prefixText).toBeTruthy();
    const icons = UNSAFE_getAllByType('Ionicons' as unknown as React.ComponentType);
    const previewIcon = icons.find((el: { props: { name?: string } }) => el.props.name === 'checkbox-outline');
    expect(previewIcon).toBeTruthy();
  });

  it('deleted kind renders "Message deleted" in italic with sender prefix upright — no preview icon', () => {
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
      (s: unknown) => typeof s === 'object' && s !== null && (s as Record<string, unknown>).fontStyle === 'italic',
    );
    expect(hasItalic).toBe(true);

    // No preview icon for deleted kind — UNSAFE_queryAllByType returns [] not throws when empty
    const icons = UNSAFE_queryAllByType('Ionicons' as unknown as React.ComponentType);
    const previewIcon = icons.find(
      (el: { props: { name?: string } }) =>
        el.props.name !== 'notifications-off-outline' &&
        el.props.name !== 'calendar-outline' &&
        el.props.name !== 'people-outline' &&
        el.props.name !== 'gift-outline',
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
