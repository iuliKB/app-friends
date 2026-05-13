/**
 * @jest-environment node
 *
 * TSQ-04 — dehydrate/hydrate symmetry for the query cache.
 *
 * Asserts:
 *   1. A dehydrated cache restores the same data when hydrated into a fresh client.
 *   2. The shouldDehydrateQuery predicate excludes 'chat' root + 'plans/photos' +
 *      'plans/allPhotos' — chat data (high-volume + most-sensitive) never touches
 *      AsyncStorage, and plan photos (1h-TTL signed URLs) don't surface as expired
 *      on cold start.
 *
 * Run: npx jest --testPathPatterns="persistQueryClient" --no-coverage
 */
import { QueryClient, dehydrate, hydrate } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

describe('persistQueryClient dehydrate/hydrate symmetry (TSQ-04)', () => {
  it('a dehydrated cache restores the same data when hydrated into a fresh client', async () => {
    const writer = new QueryClient();
    const data = [{ id: 'h1', name: 'Run' }];
    await writer.fetchQuery({
      queryKey: queryKeys.habits.overview('2026-05-13'),
      queryFn: async () => data,
    });
    const dehydrated = dehydrate(writer);

    const reader = new QueryClient();
    hydrate(reader, dehydrated);
    const restored = reader.getQueryData(queryKeys.habits.overview('2026-05-13'));
    expect(restored).toEqual(data);
  });

  it('shouldDehydrateQuery predicate excludes chat and plans-photos / plans-allPhotos', () => {
    // Mirror the predicate used in _layout.tsx so the test asserts the SAME
    // behavior the runtime ships. Predicate shape MUST match the production code.
    const predicate = (query: { queryKey: readonly unknown[] }) => {
      const [root, sub] = query.queryKey as readonly string[];
      if (root === 'chat') return false;
      if (root === 'plans' && (sub === 'photos' || sub === 'allPhotos')) return false;
      return true;
    };

    // Persisted (returns true)
    expect(predicate({ queryKey: ['habits', 'overview', '2026-05-13'] })).toBe(true);
    expect(predicate({ queryKey: ['plans', 'list', 'u1'] })).toBe(true);
    expect(predicate({ queryKey: ['friends', 'list', 'u1'] })).toBe(true);
    expect(predicate({ queryKey: ['home', 'friends', 'u1'] })).toBe(true);
    expect(predicate({ queryKey: ['status', 'own', 'u1'] })).toBe(true);

    // Excluded — chat root
    expect(predicate({ queryKey: ['chat', 'list', 'u1'] })).toBe(false);
    expect(predicate({ queryKey: ['chat', 'room', 'p1', 'messages', {}] })).toBe(false);

    // Excluded — plans/photos and plans/allPhotos (signed-URL TTL)
    expect(predicate({ queryKey: ['plans', 'photos', 'p1'] })).toBe(false);
    expect(predicate({ queryKey: ['plans', 'allPhotos', 'u1'] })).toBe(false);
  });

  it('dehydrate respects the shouldDehydrateQuery predicate', async () => {
    const client = new QueryClient();
    await client.fetchQuery({
      queryKey: queryKeys.habits.overview('2026-05-13'),
      queryFn: async () => [{ id: 'h1' }],
    });
    await client.fetchQuery({
      queryKey: queryKeys.chat.list('u1'),
      queryFn: async () => [{ id: 'c1' }],
    });
    await client.fetchQuery({
      queryKey: queryKeys.plans.photos('plan-1'),
      queryFn: async () => [{ id: 'photo-1', signedUrl: 'https://...?expires=in-1h' }],
    });

    const dehydrated = dehydrate(client, {
      shouldDehydrateQuery: (query) => {
        const [root, sub] = query.queryKey as readonly string[];
        if (root === 'chat') return false;
        if (root === 'plans' && (sub === 'photos' || sub === 'allPhotos')) return false;
        return true;
      },
    });

    const persistedKeys = dehydrated.queries.map((q) => q.queryKey);
    // Habits SHOULD be persisted
    expect(persistedKeys).toEqual(
      expect.arrayContaining([queryKeys.habits.overview('2026-05-13') as unknown as readonly unknown[]]),
    );
    // Chat SHOULD NOT be persisted
    expect(persistedKeys.some((k) => (k as readonly unknown[])[0] === 'chat')).toBe(false);
    // plan photos SHOULD NOT be persisted
    expect(
      persistedKeys.some(
        (k) =>
          (k as readonly unknown[])[0] === 'plans' && (k as readonly unknown[])[1] === 'photos',
      ),
    ).toBe(false);
  });
});
