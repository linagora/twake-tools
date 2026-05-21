// Simple in-memory cache with TTL
const cache = new Map<
  string,
  { data: unknown; timestamp: number; ttl: number }
>();

export function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 60 * 60 * 1000,
): Promise<T> {
  const cached = cache.get(key);

  // Return cached data if it exists and hasn't expired
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return Promise.resolve(cached.data as T);
  }

  // Fetch fresh data, cache it, and return
  return fetchFn().then((data) => {
    cache.set(key, { data, timestamp: Date.now(), ttl });
    return data;
  });
}

export function clearCache() {
  cache.clear();
}
