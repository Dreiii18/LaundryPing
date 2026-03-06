const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per window
const CLEANUP_INTERVAL_MS = 60_000; // Clean up stale entries every minute

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();

// Periodic cleanup of expired entries to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (now >= entry.resetAt) {
        windows.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * In-memory sliding window rate limiter.
 * Returns { allowed, remaining, resetAt } for the given key.
 *
 * TODO(phase-2): Replace with Redis/Upstash-based rate limiter for
 * cross-instance consistency in serverless deployments. Current in-memory
 * approach resets on cold start and is per-instance only.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS,
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = windows.get(key);

  // Window expired or first request — start new window
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    windows.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  // Within window — check count
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}
