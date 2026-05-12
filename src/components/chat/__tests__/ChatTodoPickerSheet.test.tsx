/**
 * ChatTodoPickerSheet test scaffold — Phase 29.1 Plan 07 Task 2.
 *
 * Asserts the D-09 two-step flow:
 *   • Step 1 renders "Send a to-do" header + both "Single item" / "List of
 *     items" options.
 *   • Tapping "Single item" advances to Step 2 (title input visible).
 *   • Tapping the back arrow on Step 2 returns to Step 1.
 *
 * Run: npx jest --testPathPatterns="ChatTodoPickerSheet" --no-coverage
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ChatTodoPickerSheet, type ChatTodoPickerMember } from '../ChatTodoPickerSheet';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const stubMembers: ChatTodoPickerMember[] = [
  { user_id: 'u1', display_name: 'Alice', avatar_url: null },
  { user_id: 'u2', display_name: 'Bob', avatar_url: null },
];

function renderSheet(props: Partial<React.ComponentProps<typeof ChatTodoPickerSheet>> = {}) {
  return render(
    <ThemeProvider>
      <ChatTodoPickerSheet
        visible={true}
        onDismiss={jest.fn()}
        groupChannelId="gc1"
        members={stubMembers}
        currentUserId="u-self"
        onSend={jest.fn().mockResolvedValue({ listId: null, error: null })}
        {...props}
      />
    </ThemeProvider>
  );
}

describe('ChatTodoPickerSheet', () => {
  it('shows step 1 picker with both options when opened (D-09)', () => {
    const { getByText } = renderSheet();
    expect(getByText('Send a to-do')).toBeTruthy();
    expect(getByText('Single item')).toBeTruthy();
    expect(getByText('List of items')).toBeTruthy();
  });

  it('advances to step 2 single-item form after tapping "Single item"', () => {
    const { getByText, getByPlaceholderText } = renderSheet();
    fireEvent.press(getByText('Single item'));
    // Step 2 single header
    expect(getByText('New to-do')).toBeTruthy();
    // Step 2 single title placeholder
    expect(getByPlaceholderText('What needs doing?')).toBeTruthy();
  });

  it('back arrow on step 2 returns to step 1 (no Modal unmount)', () => {
    const { getByText, getByLabelText, queryByText } = renderSheet();
    fireEvent.press(getByText('Single item'));
    expect(getByText('New to-do')).toBeTruthy();
    fireEvent.press(getByLabelText('Back to step 1'));
    // Back to step 1 — header + both options visible again
    expect(getByText('Send a to-do')).toBeTruthy();
    expect(getByText('Single item')).toBeTruthy();
    expect(getByText('List of items')).toBeTruthy();
    // Step 2 single header gone
    expect(queryByText('New to-do')).toBeNull();
  });
});
