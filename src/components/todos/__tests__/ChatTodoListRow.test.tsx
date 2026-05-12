/**
 * ChatTodoListRow test — flat-row version.
 *
 * Each chat-todo-item renders as a flat TodoRow-style row inside the
 * "From chats" section of /squad/todos. Asserts: item title visible,
 * list-title attribution shown when distinct, checkbox toggle fires onToggle
 * with the item id.
 *
 * Run: npx jest --testPathPatterns="ChatTodoListRow" --no-coverage
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ChatTodoListRow } from '../ChatTodoListRow';
import type { ChatTodoItem } from '@/types/todos';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const stubItem: ChatTodoItem = {
  id: 'i1',
  list_id: 'l1',
  position: 0,
  title: 'Pack',
  due_date: null,
  completed_at: null,
};

function renderRow(props: Partial<React.ComponentProps<typeof ChatTodoListRow>> = {}) {
  return render(
    <ThemeProvider>
      <ChatTodoListRow
        item={stubItem}
        listTitle="Trip prep"
        onToggle={jest.fn()}
        {...props}
      />
    </ThemeProvider>
  );
}

describe('ChatTodoListRow', () => {
  it('renders the item title', () => {
    const { getByText } = renderRow();
    expect(getByText('Pack')).toBeTruthy();
  });

  it('shows the source list title as attribution when distinct from the item title', () => {
    const { getByText } = renderRow();
    expect(getByText('Trip prep')).toBeTruthy();
  });

  it('hides attribution when list title equals item title (single-item flavor)', () => {
    const { queryByText } = renderRow({
      item: { ...stubItem, title: 'Buy gift' },
      listTitle: 'Buy gift',
    });
    // Only one render of "Buy gift" — the title itself, no attribution copy.
    expect(queryByText('Buy gift')).toBeTruthy();
  });

  it('calls onToggle with the item id when the checkbox is pressed', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = renderRow({ onToggle });
    fireEvent.press(getByLabelText('Mark "Pack" done'));
    expect(onToggle).toHaveBeenCalledWith('i1');
  });
});
