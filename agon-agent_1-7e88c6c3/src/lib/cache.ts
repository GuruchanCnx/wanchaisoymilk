// Aggressive TTL-based localStorage cache for menu/settings.
type Entry<T> = { v: T; t: number };

export function cacheGet<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: Entry<T> = JSON.parse(raw);
    if (Date.now() - parsed.t > ttlMs) return null;
    return parsed.v;
  } catch { return null; }
}

export function cacheSet<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() } as Entry<T>)); } catch {}
}

export function cacheDelete(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

// Stale-while-revalidate helper
export async function swr<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<{ data: T | null; refresh: Promise<T> }> {
  const cached = cacheGet<T>(key, ttlMs * 5); // return stale up to 5x ttl
  const refresh = fetcher().then((data) => { cacheSet(key, data); return data; });
  return { data: cached, refresh };
}
