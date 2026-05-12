/**
 * ChatTodoListRow test scaffold — Phase 29.1 Plan 06 Task 1 (Wave 0 — TDD).
 *
 * Asserts: collapsed-state copy (D-13 "{title} · {done}/{total} done"),
 * onExpand callback fires on header tap, expanded view renders child items
 * via the controlled-prop pattern (W9 — parent owns expanded state).
 *
 * Run: npx jest --testPathPatterns="ChatTodoListRow" --no-coverage
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ChatTodoListRow } from '../ChatTodoListRow';
import type { ChatTodoRow, ChatTodoItem } from '@/types/todos';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const stubRow: ChatTodoRow = {
  list_id: 'l1',
  group_channel_id: 'gc1',
  message_id: 'm1',
  created_by: 'u1',
  title: 'Trip prep',
  is_list: true,
  created_at: '2026-05-12T00:00:00Z',
  total_count: 5,
  done_count: 2,
  next_due_date: null,
  is_overdue: false,
  is_due_today: false,
};

const stubItems: ChatTodoItem[] = [
  { id: 'i1', list_id: 'l1', position: 0, title: 'Pack', due_date: null, completed_at: null },
  {
    id: 'i2',
    list_id: 'l1',
    position: 1,
    title: 'Charge',
    due_date: null,
    completed_at: '2026-05-12',
  },
];

function renderRow(props: Partial<React.ComponentProps<typeof ChatTodoListRow>> = {}) {
  return render(
    <ThemeProvider>
      <ChatTodoListRow
        row={stubRow}
        items={[]}
        loadingItems={false}
        onExpand={jest.fn()}
        onToggleItem={jest.fn()}
        {...props}
      />
    </ThemeProvider>
  );
}

describe('ChatTodoListRow', () => {
  it('shows "Trip prep · 2/5 done" in collapsed state (D-13)', () => {
    const { getByText } = renderRow();
    expect(getByText(/Trip prep/)).toBeTruthy();
    expect(getByText(/2.*5/)).toBeTruthy();
  });

  it('calls onExpand with list_id when header tapped', () => {
    const onExpand = jest.fn();
    const { getByText } = renderRow({ onExpand });
    fireEvent.press(getByText(/Trip prep/));
    expect(onExpand).toHaveBeenCalledWith('l1');
  });

  it('renders child items after expansion via controlled-prop pattern (D-13, W9)', () => {
    // ChatTodoListRow uses controlled-prop expansion: parent owns expanded state and
    // calls setExpanded in the onExpand callback, then re-renders with new items.
    // (Picked controlled-prop pattern per W9 — local-only state is rejected.)
    const onExpand = jest.fn();

    const { getByText, rerender, queryByText } = render(
      <ThemeProvider>
        <ChatTodoListRow
          row={stubRow}
          items={[]}
          loadingItems={false}
          onExpand={onExpand}
          onToggleItem={jest.fn()}
        />
      </ThemeProvider>
    );

    // Before expansion: child titles NOT rendered
    expect(queryByText('Pack')).toBeNull();
    expect(queryByText('Charge')).toBeNull();

    // Tap the header — parent (test) handles state transition via onExpand
    fireEvent.press(getByText(/Trip prep/));
    expect(onExpand).toHaveBeenCalledWith('l1');

    // Re-render with the new items (parent-controlled expansion + items)
    rerender(
      <ThemeProvider>
        <ChatTodoListRow
          row={stubRow}
          items={stubItems}
          loadingItems={false}
          onExpand={onExpand}
          onToggleItem={jest.fn()}
        />
      </ThemeProvider>
    );

    // After expansion + items provided, child titles render
    expect(getByText('Pack')).toBeTruthy();
    expect(getByText('Charge')).toBeTruthy();
  });
});
