"use client";

type CacheOptions<T> = {
  key: string;
  ttlMs: number;
  loader: () => Promise<T>;
};

type CacheEntry<T> = {
  timestamp: number;
  data: T;
};

const inflight = new Map<string, Promise<unknown>>();

export function readCached<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function writeCached<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      } satisfies CacheEntry<T>)
    );
  } catch {
    // Ignore storage failures.
  }
}

export function invalidateCached(prefix: string): void {
  if (typeof window === "undefined") return;

  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}

export async function getCached<T>({ key, ttlMs, loader }: CacheOptions<T>): Promise<T> {
  const cached = readCached<T>(key, ttlMs);
  if (cached !== null) {
    return cached;
  }

  const current = inflight.get(key) as Promise<T> | undefined;
  if (current) {
    return current;
  }

  const pending = loader()
    .then((data) => {
      writeCached(key, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, pending);
  return pending;
}

export function prefetchCached<T>(options: CacheOptions<T>): void {
  void getCached(options).catch(() => {
    // Background warmup failures should not disrupt the UI.
  });
}
