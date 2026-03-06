import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureBillingCycle,
  checkAndConsumeCredit,
  refundCredit,
  getCreditStatus,
} from '../quota';

// ---------------------------------------------------------------------------
// Mock factory helpers
// ---------------------------------------------------------------------------

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

    await expect(
      ensureBillingCycle(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkAndConsumeCredit
// ---------------------------------------------------------------------------

describe('checkAndConsumeCredit', () => {
  it("returns 'free' when the RPC returns 'free'", async () => {
    const mock = createMockSupabase({ rpcData: 'free' });

    const result = await checkAndConsumeCredit(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(result).toBe('free');
    expect(mock.rpc).toHaveBeenCalledWith('check_and_consume_sms_credit', {
      p_laundromat_id: LAUNDROMAT_ID,
    });
  });

  it("returns 'paid' when the RPC returns 'paid'", async () => {
    const mock = createMockSupabase({ rpcData: 'paid' });

    const result = await checkAndConsumeCredit(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(result).toBe('paid');
  });

  it('returns null when the RPC returns "none"', async () => {
    const mock = createMockSupabase({ rpcData: 'none' });

    const result = await checkAndConsumeCredit(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(result).toBeNull();
  });

  it('throws and logs to console.error when the RPC returns an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mock = createMockSupabase({
      rpcData: undefined,
      rpcError: { message: 'credit consume failed' },
    });

    await expect(
      checkAndConsumeCredit(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).rejects.toThrow('Credit consume failed: credit consume failed');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      'Credit consume failed:',
      expect.objectContaining({ message: 'credit consume failed' })
    );

    errorSpy.mockRestore();
  });

});

// ---------------------------------------------------------------------------
// refundCredit
// ---------------------------------------------------------------------------

describe('refundCredit', () => {
  it('calls the refund_sms_credit RPC with the correct arguments', async () => {
    const mock = createMockSupabase();

    await refundCredit(mock as unknown as SupabaseClient, LAUNDROMAT_ID, 'free');

    expect(mock.rpc).toHaveBeenCalledOnce();
    expect(mock.rpc).toHaveBeenCalledWith('refund_sms_credit', {
      p_laundromat_id: LAUNDROMAT_ID,
      p_credit_type: 'free',
    });
  });

  it('passes paid credit type to the RPC', async () => {
    const mock = createMockSupabase();

    await refundCredit(mock as unknown as SupabaseClient, LAUNDROMAT_ID, 'paid');

    expect(mock.rpc).toHaveBeenCalledWith('refund_sms_credit', {
      p_laundromat_id: LAUNDROMAT_ID,
      p_credit_type: 'paid',
    });
  });

  it('resolves without throwing when the RPC succeeds', async () => {
    const mock = createMockSupabase();

    await expect(
      refundCredit(mock as unknown as SupabaseClient, LAUNDROMAT_ID, 'free')
    ).resolves.toBeUndefined();
  });

  it('throws and logs console.error when the RPC returns an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mock = createMockSupabase({
      rpcError: { message: 'refund failed' },
    });

    await expect(
      refundCredit(mock as unknown as SupabaseClient, LAUNDROMAT_ID, 'free')
    ).rejects.toThrow('Credit refund failed: refund failed');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      'Credit refund failed:',
      expect.objectContaining({ message: 'refund failed' })
    );

    errorSpy.mockRestore();
  });

  it('throws when the RPC errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mock = createMockSupabase({ rpcError: { message: 'crash' } });

    await expect(
      refundCredit(mock as unknown as SupabaseClient, LAUNDROMAT_ID, 'paid')
    ).rejects.toThrow('Credit refund failed: crash');

    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// getCreditStatus
// ---------------------------------------------------------------------------

describe('getCreditStatus', () => {
  const baseLaundromat = {
    sms_free_credits: 42,
    sms_paid_credits: 100,
    billing_cycle_start: '2026-02-01',
  };

  it('returns a CreditStatus object with the correct shape', async () => {
    const mock = createMockSupabase({ selectData: baseLaundromat });

    const status = await getCreditStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(status).toMatchObject({
      freeCredits: 42,
      paidCredits: 100,
      totalCredits: 142,
      canSend: true,
      billingCycleStart: '2026-02-01',
    });
    expect(status.daysUntilFreeReset).toBeGreaterThan(0);
    expect(Number.isInteger(status.daysUntilFreeReset)).toBe(true);
  });

  it('calls ensureBillingCycle (ensure_billing_cycle RPC) before querying', async () => {
    const mock = createMockSupabase({ selectData: baseLaundromat });

    await getCreditStatus(mock as unknown as SupabaseClient, LAUNDROMAT_ID);

    expect(mock.rpc).toHaveBeenCalledWith('ensure_billing_cycle', {
      p_laundromat_id: LAUNDROMAT_ID,
    });
  });

  it('returns canSend: false when both credits are 0', async () => {
    const emptyLaundromat = {
      ...baseLaundromat,
      sms_free_credits: 0,
      sms_paid_credits: 0,
    };
    const mock = createMockSupabase({ selectData: emptyLaundromat });

    const status = await getCreditStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(status.canSend).toBe(false);
    expect(status.totalCredits).toBe(0);
  });

  it('returns canSend: true when only paid credits are available', async () => {
    const paidOnlyLaundromat = {
      ...baseLaundromat,
      sms_free_credits: 0,
      sms_paid_credits: 50,
    };
    const mock = createMockSupabase({ selectData: paidOnlyLaundromat });

    const status = await getCreditStatus(
      mock as unknown as SupabaseClient,
      LAUNDROMAT_ID
    );

    expect(status.canSend).toBe(true);
    expect(status.totalCredits).toBe(50);
  });

  it('throws when the laundromats query returns an error', async () => {
    const mock = createMockSupabase({
      selectData: null,
      selectError: { message: 'not found' },
    });

    await expect(
      getCreditStatus(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).rejects.toThrow('Failed to fetch credit status');
  });

  it('throws when the laundromats query returns null data', async () => {
    const mock = createMockSupabase({ selectData: null });

    await expect(
      getCreditStatus(mock as unknown as SupabaseClient, LAUNDROMAT_ID)
    ).rejects.toThrow('Failed to fetch credit status');
  });
});
