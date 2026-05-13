/**
 * @jest-environment node
 */
import { QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/queryClient';

describe('queryClient defaults', () => {
  let qc: QueryClient;
  let opts: any;

  beforeEach(() => {
    qc = createQueryClient();
    opts = qc.getDefaultOptions();
  });

  it('returns a QueryClient instance', () => {
    expect(qc).toBeInstanceOf(QueryClient);
  });

  it('staleTime is 60_000 (TSQ-02 default)', () => {
    expect(opts.queries?.staleTime).toBe(60_000);
  });

  it('gcTime is 5 * 60_000', () => {
    expect(opts.queries?.gcTime).toBe(5 * 60_000);
  });

  it('refetchOnWindowFocus is false (RN does not fire window focus)', () => {
    expect(opts.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('refetchOnReconnect is true', () => {
    expect(opts.queries?.refetchOnReconnect).toBe(true);
  });

  describe('retry predicate', () => {
    const retry = () => opts.queries.retry as (count: number, err: unknown) => boolean;

    it.each([
      { code: '401' },
      { code: '403' },
      { code: '404' },
      { status: 401 },
      { status: 403 },
      { status: 404 },
    ])('returns false for non-transient error %p', (err) => {
      expect(retry()(0, err)).toBe(false);
    });

    it('returns true while failureCount < 2 on generic error', () => {
      expect(retry()(0, new Error('boom'))).toBe(true);
      expect(retry()(1, new Error('boom'))).toBe(true);
    });

    it('returns false at failureCount >= 2', () => {
      expect(retry()(2, new Error('boom'))).toBe(false);
    });
  });

  it('mutation retry is 0', () => {
    expect(opts.mutations?.retry).toBe(0);
  });

  it('cache hit within staleTime does not refetch (TSQ-02)', async () => {
    const fetchSpy = jest.fn().mockResolvedValue([{ id: 1 }]);
    const key = ['testCacheHit'];

    // First fetch — populates cache
    await qc.fetchQuery({ queryKey: key, queryFn: fetchSpy });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Read again immediately — should be a cache hit, no second fetch
    const cached = qc.getQueryData(key);
    expect(cached).toEqual([{ id: 1 }]);

    // ensureQueryData should NOT trigger a refetch when data is fresh (within staleTime)
    await qc.ensureQueryData({ queryKey: key, queryFn: fetchSpy, staleTime: 60_000 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
