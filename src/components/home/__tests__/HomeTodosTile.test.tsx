/**
 * HomeTodosTile test scaffold — Phase 29.1 Plan 08.
 *
 * Asserts: TO-DOS eyebrow label, "all caught up" empty caption, "due now"
 * destructive hero when overdue > 0, Add chip in top-right.
 *
 * Run: npx jest --testPathPatterns="HomeTodosTile" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { HomeTodosTile } from '../HomeTodosTile';
import type { UseTodosResult } from '@/hooks/useTodos';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

function mockTodos(overrides: Partial<UseTodosResult> = {}): UseTodosResult {
  return {
    mine: [],
    fromChats: [],
    loading: false,
    error: null,
    refetch: jest.fn(async () => {}),
    completeTodo: jest.fn(async () => ({ error: null })),
    completeChatTodo: jest.fn(async () => ({ error: null, messageId: null })),
    ...overrides,
  };
}

function renderTile(todos: UseTodosResult) {
  return render(
    <ThemeProvider>
      <HomeTodosTile todos={todos} />
    </ThemeProvider>
  );
}

describe('HomeTodosTile', () => {
  it('renders "TO-DOS" eyebrow label (UI-SPEC)', () => {
    const { getByText } = renderTile(mockTodos());
    expect(getByText('TO-DOS')).toBeTruthy();
  });

  it('shows "all caught up" when no overdue or due-today', () => {
    const { getByText } = renderTile(mockTodos());
    expect(getByText(/all caught up/i)).toBeTruthy();
  });

  it('shows "due now" caption when overdue > 0', () => {
    const { getByText } = renderTile(
      mockTodos({
        mine: [
          {
            id: 't1',
            title: 'X',
            completed_at: null,
            is_overdue: true,
            is_due_today: false,
            due_date: '2026-05-01',
            priority: 'high',
            notes: null,
            created_at: '',
          },
        ],
      })
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText(/due now/i)).toBeTruthy();
  });

  it('shows "due today" caption when only due-today items exist', () => {
    const { getByText } = renderTile(
      mockTodos({
        mine: [
          {
            id: 't1',
            title: 'X',
            completed_at: null,
            is_overdue: false,
            is_due_today: true,
            due_date: '2026-05-12',
            priority: 'medium',
            notes: null,
            created_at: '',
          },
        ],
      })
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText(/due today/i)).toBeTruthy();
  });

  it('renders "Add" chip in top-right (UI-SPEC)', () => {
    const { getByText } = renderTile(mockTodos());
    expect(getByText(/^Add$/i)).toBeTruthy();
  });
});
