/**
 * RSVPButtons test scaffold — Wave 0 for PLANS-02.
 * Tests verify haptic mock wiring and disabled guard.
 * Plan 05 adds the spring bounce animation to RSVPButtons.tsx;
 * at that point haptic assertions become meaningful.
 *
 * Run: npx jest --testPathPatterns="RSVPButtons" --passWithNoTests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { RSVPButtons } from '../RSVPButtons';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

function renderRSVP(props: Partial<React.ComponentProps<typeof RSVPButtons>> = {}) {
  const onRsvp = jest.fn().mockResolvedValue(undefined);
  const result = render(
    <ThemeProvider>
      <RSVPButtons currentRsvp={null} onRsvp={onRsvp} {...props} />
    </ThemeProvider>,
  );
  return { ...result, onRsvp };
}

describe('RSVPButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Going, Maybe, Out buttons', () => {
    const { getByText } = renderRSVP();
    expect(getByText('Going')).toBeTruthy();
    expect(getByText('Maybe')).toBeTruthy();
    expect(getByText('Out')).toBeTruthy();
  });

  it('calls onRsvp with "going" when Going is pressed', async () => {
    const { getByText, onRsvp } = renderRSVP();
    fireEvent.press(getByText('Going'));
    expect(onRsvp).toHaveBeenCalledWith('going');
  });

  it('calls Haptics.selectionAsync when a button is pressed', async () => {
    const { getByText } = renderRSVP();
    fireEvent.press(getByText('Going'));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('does not call haptics when disabled={true}', () => {
    const { getByText } = renderRSVP({ disabled: true });
    fireEvent.press(getByText('Going'));
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
