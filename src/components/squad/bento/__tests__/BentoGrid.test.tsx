/**
 * BentoGrid test scaffold — Phase 29.1 Plan 04 Wave 0.
 *
 * Asserts that the extended 4-row grid renders all 6 feature tiles (IOU,
 * Habits, Birthdays, To-Dos, Streak, Squad Challenges placeholder) plus
 * the spotlight. Wave 0 — fails until Task 3 extends BentoGrid.
 *
 * Run: npx jest --testPathPatterns="BentoGrid" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { BentoGrid } from '../BentoGrid';
import type { IOUSummaryData } from '@/hooks/useIOUSummary';
import type { StreakData } from '@/hooks/useStreakData';
import type { UpcomingBirthdaysData } from '@/hooks/useUpcomingBirthdays';
import type { UseHabitsResult } from '@/hooks/useHabits';
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

// Phase 31 Plan 07 — useSpotlight.ts now transitively imports the migrated
// source hooks (useHabits → @/lib/supabase). BentoGrid.tsx only uses the
// pure selectSpotlight() selector, but the import graph still touches
// supabase at module-load time. Stub it so this component test doesn't
// require .env.local.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
    auth: {
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { session: null }) => unknown) =>
    selector({ session: null }),
}));

const stubIOU: IOUSummaryData = {
  rows: [],
  netCents: 0,
  unsettledCount: 0,
  loading: false,
  error: null,
  refetch: jest.fn(async () => {}),
};

const stubStreak: StreakData = {
  currentWeeks: 0,
  bestWeeks: 0,
  loading: false,
  error: null,
  refetch: jest.fn(async () => {}),
};

const stubBirthdays: UpcomingBirthdaysData = {
  entries: [],
  loading: false,
  error: null,
  refetch: jest.fn(async () => {}),
};

const stubHabits: UseHabitsResult = {
  habits: [],
  loading: false,
  error: null,
  refetch: jest.fn(async () => {}),
  toggleToday: jest.fn(async () => ({ error: null })),
};

const stubTodos: UseTodosResult = {
  mine: [],
  fromChats: [],
  loading: false,
  error: null,
  refetch: jest.fn(async () => {}),
  completeTodo: jest.fn(async () => ({ error: null })),
  completeChatTodo: jest.fn(async () => ({ error: null, messageId: null })),
};

describe('BentoGrid', () => {
  it('renders 6 feature tiles + spotlight (D-14, D-15)', () => {
    const { getByText } = render(
      <ThemeProvider>
        <BentoGrid
          iou={stubIOU}
          streak={stubStreak}
          birthdays={stubBirthdays}
          habits={stubHabits}
          todos={stubTodos}
        />
      </ThemeProvider>
    );
    expect(getByText('IOUs')).toBeTruthy();
    expect(getByText('Habits')).toBeTruthy(); // D-01
    expect(getByText('Birthdays')).toBeTruthy();
    expect(getByText('To-Dos')).toBeTruthy(); // D-03
    expect(getByText('Streak')).toBeTruthy();
    expect(getByText(/challenges|goals/i)).toBeTruthy(); // D-15 — Squad Challenges placeholder
  });
});
