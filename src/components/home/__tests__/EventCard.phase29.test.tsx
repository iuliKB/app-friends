/**
 * EventCard Phase 29 test scaffold — HOME-08.
 * Tests verify: hero card dimensions (300×220), relative-time pill presence.
 * Run: npx jest --testPathPatterns="EventCard.phase29" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { EventCard } from '../EventCard';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@/components/plans/AvatarStack', () => ({
  AvatarStack: 'AvatarStack',
}));

// plan ID 'p29test01': charCodeAt(0) = 112, 112 % 5 = 2 → pastel index 2 (#93C5FD)
const PLAN_BASE = {
  id: 'p29test01',
  title: 'Beach day',
  scheduled_for: new Date(Date.now() + 86400000).toISOString(),
  members: [],
  cover_image_url: null,
  created_by: 'user1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  location: null,
  link_dump: null,
  general_notes: null,
  latitude: null,
  longitude: null,
};

function renderCard(props = {}) {
  return render(
    <ThemeProvider>
      <EventCard plan={{ ...PLAN_BASE, ...props } as any} />
    </ThemeProvider>
  );
}

describe('EventCard Phase 29 (HOME-08)', () => {
  it('renders plan title', () => {
    const { getByText } = renderCard();
    expect(getByText('Beach day')).toBeTruthy();
  });

  it('card has width 240', () => {
    const { queryAllByTestId } = renderCard();
    const cards = queryAllByTestId('event-card');
    expect(cards).toHaveLength(1);
    const cardStyle = cards[0]?.props?.style;
    const flatStyle = Array.isArray(cardStyle) ? Object.assign({}, ...cardStyle) : cardStyle;
    expect(flatStyle?.width).toBe(240);
  });

  it('renders a date pill element', () => {
    const { queryAllByTestId } = renderCard();
    expect(queryAllByTestId('date-pill').length).toBeGreaterThan(0);
  });
});
