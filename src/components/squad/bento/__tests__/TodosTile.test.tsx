/**
 * TodosTile test scaffold — Phase 29.1 Plan 04 Wave 0.
 *
 * Asserts: title copy, hero metric, "due now" / "due today" / "all caught up"
 * subline copy. Tests are Wave 0 — fail until Task 2 creates TodosTile.tsx.
 *
 * Run: npx jest --testPathPatterns="TodosTile" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TodosTile } from '../TodosTile';
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
      <TodosTile todos={todos} />
    </ThemeProvider>
  );
}

describe('TodosTile', () => {
  it('renders title "To-Dos" (D-03)', () => {
    const { getByText } = renderTile(mockTodos());
    expect(getByText('To-Dos')).toBeTruthy();
  });

  it('shows "0" + "all caught up" when no overdue or due-today (UI-SPEC)', () => {
    const { getByText } = renderTile(mockTodos());
    expect(getByText('0')).toBeTruthy();
    expect(getByText(/all caught up/i)).toBeTruthy();
  });

  it('shows count + "due today" when due-today exists but no overdue', () => {
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

  it('shows "due now" when overdue exists', () => {
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
});
