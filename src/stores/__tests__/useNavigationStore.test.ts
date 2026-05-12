/**
 * useNavigationStore test — Phase 30, Plan 01.
 * Tests verify the zustand slice that holds the canonical "current navigation surface".
 * Run: npx jest --testPathPatterns="useNavigationStore" --no-coverage
 *
 * All 4 tests should PASS once src/stores/useNavigationStore.ts is created.
 */

import { useNavigationStore, type NavigationSurface } from '../useNavigationStore';

describe('useNavigationStore (Phase 30 Plan 01)', () => {
  beforeEach(() => {
    // Reset to default before each test — store is module-singleton.
    useNavigationStore.getState().reset();
  });

  it("defaults to 'tabs' on fresh import", () => {
    expect(useNavigationStore.getState().currentSurface).toBe('tabs');
  });

  it("setSurface('chat') updates currentSurface to 'chat'", () => {
    useNavigationStore.getState().setSurface('chat');
    expect(useNavigationStore.getState().currentSurface).toBe('chat');
  });

  it("reset() restores currentSurface to 'tabs'", () => {
    useNavigationStore.getState().setSurface('plan');
    expect(useNavigationStore.getState().currentSurface).toBe('plan');
    useNavigationStore.getState().reset();
    expect(useNavigationStore.getState().currentSurface).toBe('tabs');
  });

  it("NavigationSurface type accepts the 5 canonical literals", () => {
    // Compile-time check — these assignments must typecheck.
    const tabs: NavigationSurface = 'tabs';
    const chat: NavigationSurface = 'chat';
    const plan: NavigationSurface = 'plan';
    const modal: NavigationSurface = 'modal';
    const auth: NavigationSurface = 'auth';
    expect([tabs, chat, plan, modal, auth]).toEqual(['tabs', 'chat', 'plan', 'modal', 'auth']);
  });
});
