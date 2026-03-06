import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit } from '../rate-limit';

const MAX_REQUESTS = 60;
const WINDOW_MS = 60_000;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkRateLimit', () => {
  describe('first request', () => {
    it('is allowed', () => {
      const result = checkRateLimit('test-key-first-allowed');
      expect(result.allowed).toBe(true);
    });

    it('returns remaining: 59', () => {
      const result = checkRateLimit('test-key-first-remaining');
      expect(result.remaining).toBe(59);
    });
  });

  describe('window exhaustion', () => {
    it('allows the 60th request', () => {
      const key = 'test-key-60th-allowed';
      for (let i = 0; i < MAX_REQUESTS - 1; i++) {
        checkRateLimit(key);
      }
      const result = checkRateLimit(key);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('blocks the 61st request', () => {
      const key = 'test-key-61st-blocked';
      for (let i = 0; i < MAX_REQUESTS; i++) {
        checkRateLimit(key);
      }
      const result = checkRateLimit(key);
      expect(result.allowed).toBe(false);
    });

    it('returns remaining: 0 when blocked', () => {
      const key = 'test-key-remaining-zero';
      for (let i = 0; i < MAX_REQUESTS; i++) {
        checkRateLimit(key);
      }
      const result = checkRateLimit(key);
      expect(result.remaining).toBe(0);
    });
  });

  describe('window reset after expiry', () => {
    it('allows requests again after the window expires', () => {
      const key = 'test-key-window-reset';
      const baseTime = 1_000_000;

      vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      // Exhaust the window
      for (let i = 0; i < MAX_REQUESTS; i++) {
        checkRateLimit(key);
      }
      expect(checkRateLimit(key).allowed).toBe(false);

      // Advance time past the window
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + WINDOW_MS);

      const result = checkRateLimit(key);
      expect(result.allowed).toBe(true);
    });

    it('resets remaining to 59 after the window expires', () => {
      const key = 'test-key-window-reset-remaining';
      const baseTime = 2_000_000;

      vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      for (let i = 0; i < MAX_REQUESTS; i++) {
        checkRateLimit(key);
      }

      vi.spyOn(Date, 'now').mockReturnValue(baseTime + WINDOW_MS);

      const result = checkRateLimit(key);
      expect(result.remaining).toBe(59);
    });
  });

  describe('key isolation', () => {
    it('does not share state between different keys', () => {
      const exhaustedKey = 'test-key-isolation-exhausted';
      const freshKey = 'test-key-isolation-fresh';

      for (let i = 0; i < MAX_REQUESTS; i++) {
        checkRateLimit(exhaustedKey);
      }
      expect(checkRateLimit(exhaustedKey).allowed).toBe(false);

      const result = checkRateLimit(freshKey);
      expect(result.allowed).toBe(true);
    });

    it('fresh key returns remaining: 59 after another key is exhausted', () => {
      const exhaustedKey = 'test-key-isolation-remaining-exhausted';
      const freshKey = 'test-key-isolation-remaining-fresh';

      for (let i = 0; i < MAX_REQUESTS; i++) {
        checkRateLimit(exhaustedKey);
      }

      const result = checkRateLimit(freshKey);
      expect(result.remaining).toBe(59);
    });
  });

  describe('custom maxRequests and windowMs', () => {
    it('respects a custom maxRequests limit', () => {
      const key = 'test-key-custom-max';
      for (let i = 0; i < 3; i++) {
        checkRateLimit(key, 3);
      }
      const result = checkRateLimit(key, 3);
      expect(result.allowed).toBe(false);
    });

    it('respects a custom windowMs', () => {
      const key = 'test-key-custom-window';
      const baseTime = 5_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      checkRateLimit(key, 1, 5_000);
      expect(checkRateLimit(key, 1, 5_000).allowed).toBe(false);

      // Advance 5 seconds
      vi.spyOn(Date, 'now').mockReturnValue(baseTime + 5_000);
      const result = checkRateLimit(key, 1, 5_000);
      expect(result.allowed).toBe(true);
    });

    it('uses defaults when no custom params provided', () => {
      const key = 'test-key-defaults';
      const result = checkRateLimit(key);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });
  });

  describe('resetAt', () => {
    it('is greater than Date.now() on the first request', () => {
      const before = Date.now();
      const result = checkRateLimit('test-key-resetAt-future');
      expect(result.resetAt).toBeGreaterThan(before);
    });

    it('is approximately one window (60 s) ahead of call time', () => {
      const baseTime = 3_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      const result = checkRateLimit('test-key-resetAt-window');
      expect(result.resetAt).toBe(baseTime + WINDOW_MS);
    });

    it('is consistent within the same window', () => {
      const key = 'test-key-resetAt-consistent';
      const first = checkRateLimit(key).resetAt;
      const second = checkRateLimit(key).resetAt;
      expect(second).toBe(first);
    });
  });
});
