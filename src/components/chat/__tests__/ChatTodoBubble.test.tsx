/**
 * ChatTodoBubble test scaffold — Phase 29.1 Plan 07 Task 1.
 *
 * Asserts:
 *   • Single-item flavor renders title + due subline "for {firstName}".
 *   • Only the assignee can fire onCompleteItem (D-11 / T-29.1-32 — UI gate).
 *   • List flavor renders title + "{done}/{total} done" progress (D-13).
 *
 * Run: npx jest --testPathPatterns="ChatTodoBubble" --no-coverage
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ChatTodoBubble } from '../ChatTodoBubble';
import type { ChatTodoItem, ChatTodoList } from '@/types/todos';
import type { MessageWithProfile } from '@/types/chat';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const baseMessage: MessageWithProfile = {
  id: 'm1',
  plan_id: null,
  dm_channel_id: null,
  group_channel_id: 'gc1',
  sender_id: 'u-sender',
  body: 'Buy bread',
  created_at: '2026-05-12T10:00:00Z',
  image_url: null,
  reply_to_message_id: null,
  message_type: 'todo',
  poll_id: null,
  sender_display_name: 'Alice',
  sender_avatar_url: null,
};

const baseListSingle: ChatTodoList = {
  id: 'l1',
  group_channel_id: 'gc1',
  message_id: 'm1',
  created_by: 'u-sender',
  assignee_id: 'u-assignee',
  title: 'Buy bread',
  is_list: false,
  created_at: '2026-05-12T10:00:00Z',
};

const baseListMulti: ChatTodoList = { ...baseListSingle, is_list: true, title: 'Trip prep' };

const baseItem = (overrides: Partial<ChatTodoItem> = {}): ChatTodoItem => ({
  id: 'i1',
  list_id: 'l1',
  position: 0,
  title: 'Buy bread',
  due_date: '2026-05-13',
  completed_at: null,
  ...overrides,
});

function renderBubble(props: Partial<React.ComponentProps<typeof ChatTodoBubble>> = {}) {
  return render(
    <ThemeProvider>
      <ChatTodoBubble
        message={baseMessage}
        currentUserId="u-assignee"
        isOwn={false}
        list={baseListSingle}
        items={[baseItem()]}
        assigneeName="Sam Reeves"
        onCompleteItem={jest.fn()}
        {...props}
      />
    </ThemeProvider>
  );
}

describe('ChatTodoBubble', () => {
  it('renders single-item title + due subline "for {firstName}" (D-09)', () => {
    const { getByText } = renderBubble();
    expect(getByText(/Buy bread/)).toBeTruthy();
    // First-name only (assigneeName is "Sam Reeves" — should render "for Sam")
    expect(getByText(/for Sam/)).toBeTruthy();
  });

  it('only assignee can fire onCompleteItem (D-11 / T-29.1-32)', () => {
    const onCompleteItem = jest.fn();

    // Non-assignee: checkbox renders as static View with "Not yet completed"
    // a11y label — no pressable "Tap to mark done" label exists.
    const { queryByLabelText, rerender, getByLabelText } = render(
      <ThemeProvider>
        <ChatTodoBubble
          message={baseMessage}
          currentUserId="u-not-assignee"
          isOwn={false}
          list={baseListSingle}
          items={[baseItem()]}
          assigneeName="Sam"
          onCompleteItem={onCompleteItem}
        />
      </ThemeProvider>
    );
    expect(queryByLabelText('Mark done checkbox')).toBeNull();
    expect(queryByLabelText(/Not yet completed/i)).toBeTruthy();
    expect(onCompleteItem).not.toHaveBeenCalled();

    // Re-render as assignee — Pressable checkbox with "Tap to mark done" label.
    rerender(
      <ThemeProvider>
        <ChatTodoBubble
          message={baseMessage}
          currentUserId="u-assignee"
          isOwn={false}
          list={baseListSingle}
          items={[baseItem()]}
          assigneeName="Sam"
          onCompleteItem={onCompleteItem}
        />
      </ThemeProvider>
    );
    const checkbox = getByLabelText('Mark done checkbox');
    fireEvent.press(checkbox);
    expect(onCompleteItem).toHaveBeenCalledWith('i1');
  });

  it('renders list-flavor with progress "{done}/{total} done" (D-13)', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ChatTodoBubble
          message={baseMessage}
          currentUserId="u-assignee"
          isOwn={false}
          list={baseListMulti}
          items={[
            baseItem({ id: 'i1', title: 'Pack', completed_at: '2026-05-12T11:00:00Z' }),
            baseItem({ id: 'i2', title: 'Charge', completed_at: null, position: 1 }),
          ]}
          assigneeName="Sam"
          onCompleteItem={jest.fn()}
        />
      </ThemeProvider>
    );
    expect(getByText(/Trip prep/)).toBeTruthy();
    expect(getByText(/1\/2 done/)).toBeTruthy();
  });
});
