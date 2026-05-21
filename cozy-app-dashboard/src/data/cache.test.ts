import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache, getCachedData } from './cache';

describe('cache', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should cache data and return it on subsequent calls', async () => {
    const mockFn = vi.fn().mockResolvedValue('test-data');

    // First call - should fetch data
    const result1 = await getCachedData('test-key', mockFn);
    expect(result1).toBe('test-data');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call - should return cached data
    const result2 = await getCachedData('test-key', mockFn);
    expect(result2).toBe('test-data');
    expect(mockFn).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should fetch fresh data after cache expires', async () => {
    const mockFn = vi
      .fn()
      .mockResolvedValueOnce('first-data')
      .mockResolvedValueOnce('second-data');

    // First call
    const result1 = await getCachedData('test-key', mockFn, 100); // 100ms TTL
    expect(result1).toBe('first-data');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Wait for cache to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Second call - should fetch fresh data
    const result2 = await getCachedData('test-key', mockFn, 100);
    expect(result2).toBe('second-data');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should clear cache when clearCache is called', async () => {
    const mockFn = vi.fn().mockResolvedValue('test-data');

    // First call
    await getCachedData('test-key', mockFn);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Clear cache
    clearCache();

    // Second call - should fetch fresh data
    await getCachedData('test-key', mockFn);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
