import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureBillingCycle,
  checkAndIncrementQuota,
  decrementQuota,
  getQuotaStatus,
} from '../quota';

// ---------------------------------------------------------------------------
// Mock factory helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal chainable Supabase mock suitable for single-table queries.
 * The chain mirrors: supabase.from(...).select(...).eq(...).single()
 * (one .eq() call only, matching quota.ts lines 39-43 and 53-57)
 */
function createMockSupabase(overrides?: {
  rpcData?: unknown;
  rpcError?: unknown;
  selectData?: unknown;
  selectError?: unknown;
}) {
  const single = vi.fn().mockResolvedValue({
    data: overrides?.selectData ?? null,
    error: overrides?.selectError ?? null,
  });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });

  return {
    rpc: vi.fn().mockResolvedValue({
      data: overrides?.rpcData ?? undefined,
      error: overrides?.rpcError ?? null,
    }),
    from: vi.fn().mockReturnValue({ select }),
  };
}

/**
 * Builds one complete .select().eq().single() chain and returns it
 * alongside its constituent mocks so callers can inspect call args.
 */
function buildSelectChain(resolvedData: unknown, resolvedError: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, single };
}

/**
 * Builds a Supabase mock that serves two different responses from two
 * consecutive `from()` calls. Used by getQuotaStatus which queries both
 * `laundromats` and `sms_plans` in sequence.
 */
function createDualFromMockSupabase(
  laundromatData: unknown,
  planData: unknown,
  options?: { laundromatError?: unknown }
) {
  const laundromatChain = buildSelectChain(
    laundromatData,
    options?.laundromatError ?? null
  );
  const planChain = buildSelectChain(planData);

  const from = vi
    .fn()
    .mockReturnValueOnce({ select: laundromatChain.select })
    .mockReturnValueOnce({ select: planChain.select });

  return {
    rpc: vi.fn().mockResolvedValue({ data: undefined, error: null }),
    from,
  };
}

const LAUNDROMAT_ID = 'laundromat-uuid-1234';

// ---------------------------------------------------------------------------
// ensureBillingCycle
// ---------------------------------------------------------------------------

describe('ensureBillingCycle', () => {
  it('calls the ensure_billing_cycle RPC with the correct argument', async () => {
    const mock = createMockSupabase();

    await ensureBillingCycle(mock as unknown as SupabaseClient, LAUNDROMAT_ID);

    expect(mock.rpc).toHaveBeenCalledOnce();
    expect(mock.rpc).toHaveBeenCalledWith('ensure_billing_cycle', {
      p_laundromat_id: LAUNDROMAT_ID,
    });
  });

  it('resolves without throwing even when the RPC returns an error', async () => {
    const mock = createMockSupabase({ rpcError: { message: 'DB error' } });

    // The function does not inspect the RPC result — it fire-and-forgets
    await expect(
      ensureBillingCycle(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkAndIncrementQuota
// ---------------------------------------------------------------------------

describe('checkAndIncrementQuota', () => {
  it('returns true when the RPC returns true', async () => {
    const mock = createMockSupabase({ rpcData: true });

    const result = await checkAndIncrementQuota(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(result).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith('check_and_increment_sms_quota', {
      p_laundromat_id: LAUNDROMAT_ID,
    });
  });

  it('returns false when the RPC returns false', async () => {
    const mock = createMockSupabase({ rpcData: false });

    const result = await checkAndIncrementQuota(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(result).toBe(false);
  });

  it('returns false and logs to console.error when the RPC returns an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mock = createMockSupabase({
      rpcData: undefined,
      rpcError: { message: 'quota check failed' },
    });

    const result = await checkAndIncrementQuota(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      'Quota check failed:',
      expect.objectContaining({ message: 'quota check failed' })
    );

    errorSpy.mockRestore();
  });

  it('returns false when RPC returns a non-boolean truthy value that is not strictly true', async () => {
    // The implementation uses `data === true`, so only boolean true passes.
    const mock = createMockSupabase({ rpcData: 1 });

    const result = await checkAndIncrementQuota(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// decrementQuota
// ---------------------------------------------------------------------------

describe('decrementQuota', () => {
  it('calls the decrement_sms_quota RPC with the correct argument', async () => {
    const mock = createMockSupabase();

    await decrementQuota(mock as unknown as SupabaseClient, LAUNDROMAT_ID);

    expect(mock.rpc).toHaveBeenCalledOnce();
    expect(mock.rpc).toHaveBeenCalledWith('decrement_sms_quota', {
      p_laundromat_id: LAUNDROMAT_ID,
    });
  });

  it('resolves without throwing when the RPC succeeds', async () => {
    const mock = createMockSupabase();

    await expect(
      decrementQuota(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).resolves.toBeUndefined();
  });

  it('logs console.error when the RPC returns an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mock = createMockSupabase({
      rpcError: { message: 'decrement failed' },
    });

    await decrementQuota(mock as unknown as SupabaseClient, LAUNDROMAT_ID);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      'Quota decrement failed:',
      expect.objectContaining({ message: 'decrement failed' })
    );

    errorSpy.mockRestore();
  });

  it('does not throw when the RPC errors — it only logs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mock = createMockSupabase({ rpcError: { message: 'crash' } });

    await expect(
      decrementQuota(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).resolves.toBeUndefined();

    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// getQuotaStatus
// ---------------------------------------------------------------------------

describe('getQuotaStatus', () => {
  const baseLaundromat = {
    sms_used_this_month: 42,
    sms_limit: 300,
    billing_cycle_start: '2026-02-01',
    sms_plan_id: 'plan-uuid-abc',
    sms_plan_expires_at: '2026-03-01',
  };

  it('returns a QuotaStatus object with the correct shape when a plan is active', async () => {
    const mock = createDualFromMockSupabase(baseLaundromat, { tier: 'starter' });

    const status = await getQuotaStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(status).toMatchObject({
      used: 42,
      limit: 300,
      remaining: 258,
      canSend: true,
      billingCycleStart: '2026-02-01',
      hasPlan: true,
      planTier: 'starter',
      planExpiresAt: '2026-03-01',
    });
    // daysUntilReset is computed from Date.now() so just check it is a positive integer
    expect(status.daysUntilReset).toBeGreaterThan(0);
    expect(Number.isInteger(status.daysUntilReset)).toBe(true);
  });

  it('calls ensureBillingCycle (ensure_billing_cycle RPC) before querying', async () => {
    const mock = createDualFromMockSupabase(baseLaundromat, { tier: 'growth' });

    await getQuotaStatus(mock as unknown as SupabaseClient, LAUNDROMAT_ID);

    expect(mock.rpc).toHaveBeenCalledWith('ensure_billing_cycle', {
      p_laundromat_id: LAUNDROMAT_ID,
    });
  });

  it('returns hasPlan: false and planTier: null when sms_plan_id is null', async () => {
    const laundromatWithoutPlan = {
      ...baseLaundromat,
      sms_plan_id: null,
      sms_limit: 0,
    };
    // Only one from() call happens when hasPlan is false (no sms_plans query)
    const chain = buildSelectChain(laundromatWithoutPlan);
    const mock = {
      rpc: vi.fn().mockResolvedValue({ data: undefined, error: null }),
      from: vi.fn().mockReturnValue({ select: chain.select }),
    };

    const status = await getQuotaStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(status.hasPlan).toBe(false);
    expect(status.planTier).toBeNull();
    expect(status.canSend).toBe(false);
  });

  it('sets canSend: false when used equals limit (quota exhausted)', async () => {
    const exhaustedLaundromat = {
      ...baseLaundromat,
      sms_used_this_month: 300,
      sms_limit: 300,
    };
    const mock = createDualFromMockSupabase(exhaustedLaundromat, { tier: 'starter' });

    const status = await getQuotaStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(status.canSend).toBe(false);
    expect(status.remaining).toBe(0);
  });

  it('clamps remaining to 0 when used exceeds limit', async () => {
    const overLimitLaundromat = {
      ...baseLaundromat,
      sms_used_this_month: 350,
      sms_limit: 300,
    };
    const mock = createDualFromMockSupabase(overLimitLaundromat, { tier: 'starter' });

    const status = await getQuotaStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(status.remaining).toBe(0);
  });

  it('fetches the plan tier from sms_plans using the laundromat sms_plan_id', async () => {
    const mock = createDualFromMockSupabase(baseLaundromat, { tier: 'scale' });

    const status = await getQuotaStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    // Verify second from() was called with 'sms_plans'
    expect(mock.from).toHaveBeenCalledWith('sms_plans');
    expect(status.planTier).toBe('scale');
  });

  it('throws when the laundromats query returns an error', async () => {
    const mock = createDualFromMockSupabase(
      null,
      null,
      { laundromatError: { message: 'not found' } }
    );

    await expect(
      getQuotaStatus(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).rejects.toThrow('Failed to fetch quota status');
  });

  it('throws when the laundromats query returns null data', async () => {
    const mock = createDualFromMockSupabase(null, null);

    await expect(
      getQuotaStatus(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).rejects.toThrow('Failed to fetch quota status');
  });

  it('sets planTier to null when sms_plans returns no tier', async () => {
    const mock = createDualFromMockSupabase(baseLaundromat, null);

    const status = await getQuotaStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(status.planTier).toBeNull();
    // hasPlan is still true because sms_plan_id is set on the laundromat
    expect(status.hasPlan).toBe(true);
  });
});
