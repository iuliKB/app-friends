/**
 * useViewPreference test — Phase 29, HOME-06.
 * Tests verify AsyncStorage persistence: default 'radar', restore 'cards', setItem call.
 * Run: npx jest --testPathPatterns="useViewPreference" --no-coverage
 *
 * All 3 tests should PASS — implementation is already complete (D-05).
 * AsyncStorage is auto-mocked via jest.config.js moduleNameMapper.
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useViewPreference } from '../useViewPreference';

describe('useViewPreference (HOME-06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('defaults to radar on first run', async () => {
    const { result } = renderHook(() => useViewPreference());
    await act(async () => {});
    expect(result.current[0]).toBe('radar');
  });

  it('restores persisted cards preference on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('cards');
    const { result } = renderHook(() => useViewPreference());
    await act(async () => {});
    expect(result.current[0]).toBe('cards');
  });

  it('persists new view value on setView call', async () => {
    const { result } = renderHook(() => useViewPreference());
    await act(async () => {});
    act(() => {
      result.current[1]('cards');
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('campfire:home_view', 'cards');
  });
});
