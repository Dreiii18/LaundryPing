import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { daysSincePh } from '../time';

describe('daysSincePh', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns 0 for a shop created earlier on the same PHT calendar day', () => {
    // "Now" = 09:00 PHT on 2026-05-14  =  01:00 UTC on 2026-05-14
    vi.setSystemTime(new Date('2026-05-14T01:00:00Z'));
    // Created at 00:01 PHT same day  =  16:01 UTC the day before
    expect(daysSincePh('2026-05-13T16:01:00Z')).toBe(0);
  });

  it('returns 0 for a shop created at 23:59 PHT inspected at 23:59 PHT same day', () => {
    // "Now" = 23:59 PHT on 2026-05-14  =  15:59 UTC on 2026-05-14
    vi.setSystemTime(new Date('2026-05-14T15:59:00Z'));
    // Created 2 hours earlier (21:59 PHT same day = 13:59 UTC)
    expect(daysSincePh('2026-05-14T13:59:00Z')).toBe(0);
  });

  it('rolls over to 1 day at PHT midnight even when wall-clock elapsed is small', () => {
    // "Now" = 00:01 PHT on 2026-05-15  =  16:01 UTC on 2026-05-14
    vi.setSystemTime(new Date('2026-05-14T16:01:00Z'));
    // Created 2 hours earlier (22:01 PHT 2026-05-14 = 14:01 UTC 2026-05-14)
    expect(daysSincePh('2026-05-14T14:01:00Z')).toBe(1);
  });

  it('returns 2 for a shop two full PHT days ago', () => {
    // "Now" = 08:01 PHT on 2026-05-15  =  00:01 UTC on 2026-05-15
    vi.setSystemTime(new Date('2026-05-15T00:01:00Z'));
    // Created at 00:00 PHT on 2026-05-13 = 16:00 UTC on 2026-05-12
    expect(daysSincePh('2026-05-12T16:00:00Z')).toBe(2);
  });

  it('returns 7 for a shop one PHT week ago', () => {
    vi.setSystemTime(new Date('2026-05-15T00:01:00Z'));
    // 7 PHT days before 2026-05-15 00:00 PHT = 2026-05-08 00:00 PHT = 2026-05-07 16:00 UTC
    expect(daysSincePh('2026-05-07T16:00:00Z')).toBe(7);
  });

  it('returns 30 for a shop one PHT month ago (30 days)', () => {
    vi.setSystemTime(new Date('2026-05-15T00:01:00Z'));
    // 30 PHT days before 2026-05-15 00:00 PHT = 2026-04-15 00:00 PHT = 2026-04-14 16:00 UTC
    expect(daysSincePh('2026-04-14T16:00:00Z')).toBe(30);
  });
});
