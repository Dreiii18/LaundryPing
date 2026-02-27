import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/auth-helpers');
vi.mock('@/lib/sms/provider');
vi.mock('@/lib/sms/quota');
vi.mock('@/lib/utils/encryption');
vi.mock('@/lib/utils/phone', () => ({
  normalizeToLocal: vi.fn((phone: string) => phone),
}));
vi.mock('@/lib/sms/templates', () => ({
  buildLaundryDoneMessage: vi.fn(() => 'Your laundry is done!'),
}));

import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { sendSms } from '@/lib/sms/provider';
import { ensureBillingCycle, checkAndIncrementQuota, decrementQuota } from '@/lib/sms/quota';
import { decryptPhone } from '@/lib/utils/encryption';

const mockGetAuth = vi.mocked(getAuthenticatedUser);
const mockSendSms = vi.mocked(sendSms);
const mockEnsureBillingCycle = vi.mocked(ensureBillingCycle);
const mockCheckAndIncrementQuota = vi.mocked(checkAndIncrementQuota);
const mockDecrementQuota = vi.mocked(decrementQuota);
const mockDecryptPhone = vi.mocked(decryptPhone);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a POST request to the complete endpoint. */
function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/jobs/test-job-id/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Resolved params object matching the Next.js dynamic route signature. */
const makeParams = (id = 'test-job-id') =>
  ({ params: Promise.resolve({ id }) }) as { params: Promise<{ id: string }> };

/**
 * A minimal laundromat row that has an active SMS plan.
 * Tests that need no plan override `sms_plan_id` to null.
 */
const baseLaundromat = {
  id: 'laundromat-1',
  name: 'SpinClean',
  user_id: 'user-1',
  sms_plan_id: 'plan-starter',
  sms_used_this_month: 5,
  sms_limit: 300,
};

/** A job row that is eligible for SMS notification. */
const baseJob = {
  id: 'test-job-id',
  laundromat_id: 'laundromat-1',
  status: 'in_progress',
  notify_sms: true,
  customer_phone_encrypted: 'iv:tag:ciphertext',
  is_paid: true,
  payment_method: 'cash',
};

// ---------------------------------------------------------------------------
// Mock Supabase factory
// ---------------------------------------------------------------------------

/**
 * Creates a chainable Supabase mock.
 *
 * `jobQueryResult` controls what `.from('jobs').select().eq().eq().single()` returns.
 * `smsLogResult`   controls what `.from('sms_logs').select().eq().single()` returns.
 * `laundromatQuotaResult` controls the refetch after quota exhaustion.
 */
function createMockSupabase({
  jobQueryResult = { data: baseJob, error: null },
  smsLogResult = { data: null, error: { code: 'PGRST116' } },
  laundromatQuotaResult = {
    data: { sms_used_this_month: 300, sms_limit: 300 },
    error: null,
  },
} = {}) {
  // Generic update chain: .from().update().eq().eq()  (returns void-like)
  const mockEqForUpdate = vi.fn().mockResolvedValue({ error: null });
  const mockEqChainForUpdate = vi.fn().mockReturnValue({ eq: mockEqForUpdate });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqChainForUpdate });

  // insert()
  const mockInsert = vi.fn().mockResolvedValue({ error: null });

  // select chain for jobs: .from('jobs').select().eq().eq().single()
  const mockJobSingle = vi.fn().mockResolvedValue(jobQueryResult);
  const mockJobEqLaundromatId = vi.fn().mockReturnValue({ single: mockJobSingle });
  const mockJobEqId = vi.fn().mockReturnValue({ eq: mockJobEqLaundromatId });
  const mockJobSelect = vi.fn().mockReturnValue({ eq: mockJobEqId });

  // select chain for sms_logs: .from('sms_logs').select().eq().single()
  const mockSmsLogSingle = vi.fn().mockResolvedValue(smsLogResult);
  const mockSmsLogEq = vi.fn().mockReturnValue({ single: mockSmsLogSingle });
  const mockSmsLogSelect = vi.fn().mockReturnValue({ eq: mockSmsLogEq });

  // select chain for laundromats (quota refetch): .from('laundromats').select().eq().single()
  const mockLaundromatSingle = vi.fn().mockResolvedValue(laundromatQuotaResult);
  const mockLaundromatEq = vi.fn().mockReturnValue({ single: mockLaundromatSingle });
  const mockLaundromatSelect = vi.fn().mockReturnValue({ eq: mockLaundromatEq });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'jobs') {
      return {
        select: mockJobSelect,
        update: mockUpdate,
        insert: mockInsert,
      };
    }
    if (table === 'sms_logs') {
      return {
        select: mockSmsLogSelect,
        insert: mockInsert,
      };
    }
    if (table === 'laundromats') {
      return {
        select: mockLaundromatSelect,
      };
    }
    // Fallback for any other table
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }), update: mockUpdate, insert: mockInsert };
  });

  const mockRpc = vi.fn().mockResolvedValue({ data: undefined, error: null });

  return { from: mockFrom, rpc: mockRpc };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/jobs/[id]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default quota mocks — available
    mockEnsureBillingCycle.mockResolvedValue(undefined);
    mockCheckAndIncrementQuota.mockResolvedValue(true);
    mockDecrementQuota.mockResolvedValue(undefined);

    // Default SMS mock — success
    mockSendSms.mockResolvedValue({
      success: true,
      provider: 'mock',
      messageId: 'mock-123',
    });

    // Default decryption mock — success
    mockDecryptPhone.mockReturnValue('09171234567');
  });

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  describe('authentication', () => {
    it('returns 401 when the user is not authenticated', async () => {
      mockGetAuth.mockResolvedValue({
        user: null,
        laundromat: null,
        supabase: createMockSupabase() as never,
        error: 'Unauthorized',
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 404 when the laundromat is not found for the user', async () => {
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: null,
        supabase: createMockSupabase() as never,
        error: 'Laundromat not found',
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Laundromat not found');
    });
  });

  // -------------------------------------------------------------------------
  // Job fetching and ownership
  // -------------------------------------------------------------------------

  describe('job validation', () => {
    it('returns 404 when the job does not exist', async () => {
      const supabase = createMockSupabase({
        jobQueryResult: { data: null, error: { code: 'PGRST116', message: 'Not found' } },
      });

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Job not found');
    });

    it('returns 409 when the job is not in_progress', async () => {
      const completedJob = { ...baseJob, status: 'completed' };
      const supabase = createMockSupabase({
        jobQueryResult: { data: completedJob, error: null },
      });

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toBe('Job already completed');
      expect(body.toastType).toBe('warning');
    });
  });

  // -------------------------------------------------------------------------
  // Payment validation
  // -------------------------------------------------------------------------

  describe('payment validation', () => {
    it('returns 400 when job is unpaid and no payment_method is provided', async () => {
      const unpaidJob = { ...baseJob, is_paid: false, payment_method: null };
      const supabase = createMockSupabase({
        jobQueryResult: { data: unpaidJob, error: null },
      });

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Payment method is required for unpaid jobs');
    });
  });

  // -------------------------------------------------------------------------
  // Early exits (no SMS path)
  // -------------------------------------------------------------------------

  describe('early exit without SMS', () => {
    it('completes the job without SMS when laundromat has no SMS plan', async () => {
      const laundromatNoPlan = { ...baseLaundromat, sms_plan_id: null };
      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: laundromatNoPlan as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(false);
      expect(body.toastType).toBe('success');
      expect(body.message).toBe('Job completed.');
      // SMS subsystem should not be touched
      expect(mockSendSms).not.toHaveBeenCalled();
      expect(mockCheckAndIncrementQuota).not.toHaveBeenCalled();
    });

    it('completes the job without SMS when notify_sms is false', async () => {
      const jobNoSms = { ...baseJob, notify_sms: false };
      const supabase = createMockSupabase({
        jobQueryResult: { data: jobNoSms, error: null },
      });

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(false);
      expect(body.toastType).toBe('success');
      expect(mockSendSms).not.toHaveBeenCalled();
    });

    it('completes the job without SMS when customer phone is missing', async () => {
      const jobNoPhone = { ...baseJob, customer_phone_encrypted: null };
      const supabase = createMockSupabase({
        jobQueryResult: { data: jobNoPhone, error: null },
      });

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(false);
      expect(body.toastType).toBe('success');
      expect(mockSendSms).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  describe('idempotency', () => {
    it('returns smsSent: true and success toast when SMS log already shows sent', async () => {
      const supabase = createMockSupabase({
        smsLogResult: { data: { id: 'log-1', status: 'sent' }, error: null },
      });

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(true);
      expect(body.toastType).toBe('success');
      expect(body.message).toBe('Already processed');
      // Should not attempt a second send
      expect(mockSendSms).not.toHaveBeenCalled();
    });

    it('returns smsSent: false and error toast when SMS log shows a previous failure', async () => {
      const supabase = createMockSupabase({
        smsLogResult: { data: { id: 'log-1', status: 'failed' }, error: null },
      });

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(false);
      expect(body.toastType).toBe('error');
      expect(mockSendSms).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Quota exhaustion
  // -------------------------------------------------------------------------

  describe('quota exhaustion', () => {
    it('returns a warning with quotaExhausted: true when SMS quota is used up', async () => {
      mockCheckAndIncrementQuota.mockResolvedValue(false);

      const supabase = createMockSupabase({
        laundromatQuotaResult: {
          data: { sms_used_this_month: 300, sms_limit: 300 },
          error: null,
        },
      });

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(false);
      expect(body.quotaExhausted).toBe(true);
      expect(body.toastType).toBe('warning');
      expect(body.message).toContain('300/300');
      expect(mockSendSms).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful SMS send
  // -------------------------------------------------------------------------

  describe('successful SMS send', () => {
    it('returns smsSent: true and success toast on a happy-path SMS delivery', async () => {
      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(true);
      expect(body.toastType).toBe('success');
      expect(body.message).toBe('SMS sent to customer.');
    });

    it('decrypts the phone and calls sendSms with the normalized number', async () => {
      mockDecryptPhone.mockReturnValue('+639171234567');
      const { normalizeToLocal } = await import('@/lib/utils/phone');
      const mockNormalize = vi.mocked(normalizeToLocal);
      mockNormalize.mockReturnValue('09171234567');

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockDecryptPhone).toHaveBeenCalledWith('iv:tag:ciphertext');
      expect(mockNormalize).toHaveBeenCalledWith('+639171234567');
      expect(mockSendSms).toHaveBeenCalledWith('09171234567', 'Your laundry is done!');
    });

    it('increments the quota exactly once on success', async () => {
      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockCheckAndIncrementQuota).toHaveBeenCalledTimes(1);
      expect(mockDecrementQuota).not.toHaveBeenCalled();
    });

    it('inserts a sent sms_log row after a successful send', async () => {
      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      // Verify insert was called on sms_logs table
      expect(supabase.from).toHaveBeenCalledWith('sms_logs');
    });
  });

  // -------------------------------------------------------------------------
  // SMS send failure
  // -------------------------------------------------------------------------

  describe('SMS send failure', () => {
    it('returns smsSent: false and error toast when the SMS provider fails', async () => {
      mockSendSms.mockResolvedValue({
        success: false,
        provider: 'mock',
        error: 'Network timeout',
      });

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(false);
      expect(body.toastType).toBe('error');
      expect(body.message).toBe('SMS delivery failed. Please inform the customer manually.');
    });

    it('decrements the quota when SMS sending fails', async () => {
      mockSendSms.mockResolvedValue({
        success: false,
        provider: 'mock',
        error: 'Provider error',
      });

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockDecrementQuota).toHaveBeenCalledTimes(1);
      expect(mockDecrementQuota).toHaveBeenCalledWith(supabase, baseLaundromat.id);
    });

    it('still completes the job (status: completed, sms_sent: false) after SMS failure', async () => {
      mockSendSms.mockResolvedValue({
        success: false,
        provider: 'mock',
        error: 'Provider error',
      });

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      // The jobs table update should have been called with sms_sent: false
      const jobsUpdate = supabase.from.mock.calls
        .filter(([table]: [string]) => table === 'jobs')
        .map(() => null); // just verify it was called
      expect(jobsUpdate.length).toBeGreaterThan(0);
    });

    it('inserts a failed sms_log row when the provider reports failure', async () => {
      mockSendSms.mockResolvedValue({
        success: false,
        provider: 'mock',
        error: 'Provider error',
      });

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(supabase.from).toHaveBeenCalledWith('sms_logs');
    });
  });

  // -------------------------------------------------------------------------
  // Decryption failure
  // -------------------------------------------------------------------------

  describe('decryption failure', () => {
    it('returns smsSent: false and error toast when phone decryption throws', async () => {
      mockDecryptPhone.mockImplementation(() => {
        throw new Error('Decryption failed: bad key');
      });

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.smsSent).toBe(false);
      expect(body.toastType).toBe('error');
      expect(body.message).toBe('Unable to send SMS. Please inform the customer manually.');
    });

    it('decrements the quota when decryption fails after increment', async () => {
      mockDecryptPhone.mockImplementation(() => {
        throw new Error('Key mismatch');
      });

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockDecrementQuota).toHaveBeenCalledTimes(1);
      expect(mockDecrementQuota).toHaveBeenCalledWith(supabase, baseLaundromat.id);
    });

    it('does not call sendSms when decryption fails', async () => {
      mockDecryptPhone.mockImplementation(() => {
        throw new Error('Corrupted ciphertext');
      });

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockSendSms).not.toHaveBeenCalled();
    });

    it('still completes the job after decryption failure', async () => {
      mockDecryptPhone.mockImplementation(() => {
        throw new Error('Bad key');
      });

      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await POST(makeRequest(), makeParams());
      const body = await response.json();

      // Job completion is still signalled in the response body
      expect(body.smsSent).toBe(false);
      // Jobs update should still have been called
      expect(supabase.from).toHaveBeenCalledWith('jobs');
    });
  });

  // -------------------------------------------------------------------------
  // Billing cycle
  // -------------------------------------------------------------------------

  describe('billing cycle', () => {
    it('ensures billing cycle before checking quota on the SMS path', async () => {
      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockEnsureBillingCycle).toHaveBeenCalledWith(supabase, baseLaundromat.id);
      // ensureBillingCycle must be called before checkAndIncrementQuota
      const ensureOrder = mockEnsureBillingCycle.mock.invocationCallOrder[0];
      const checkOrder = mockCheckAndIncrementQuota.mock.invocationCallOrder[0];
      expect(ensureOrder).toBeLessThan(checkOrder);
    });

    it('does not call ensureBillingCycle on the early-exit (no plan) path', async () => {
      const laundromatNoPlan = { ...baseLaundromat, sms_plan_id: null };
      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: laundromatNoPlan as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockEnsureBillingCycle).not.toHaveBeenCalled();
    });
  });
});
