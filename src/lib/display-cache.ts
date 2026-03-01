/**
 * Display Offline Cache
 * Caches all display data to localStorage so the display works without internet.
 * When online, fetches fresh data and updates cache.
 */

const CACHE_PREFIX = 'display-cache-';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function setCacheData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Failed to cache display data:', key, e);
  }
}

export function getCacheData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}

export function getCacheTimestamp(key: string): number | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry.timestamp;
  } catch {
    return null;
  }
}

/**
 * Fetch with offline fallback.
 * If online: fetch from supabase, cache result, return it.
 * If offline or fetch fails: return cached data.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<{ data: T | null; fromCache: boolean }> {
  if (navigator.onLine) {
    try {
      const data = await fetcher();
      setCacheData(key, data);
      return { data, fromCache: false };
    } catch (e) {
      console.warn(`Fetch failed for ${key}, using cache:`, e);
      const cached = getCacheData<T>(key);
      return { data: cached, fromCache: true };
    }
  } else {
    const cached = getCacheData<T>(key);
    return { data: cached, fromCache: true };
  }
}
