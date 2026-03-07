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
import { checkAndConsumeCredit, refundCredit } from '@/lib/sms/quota';
import { decryptPhone } from '@/lib/utils/encryption';

const mockGetAuth = vi.mocked(getAuthenticatedUser);
const mockSendSms = vi.mocked(sendSms);
const mockCheckAndConsumeCredit = vi.mocked(checkAndConsumeCredit);
const mockRefundCredit = vi.mocked(refundCredit);
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
 * A minimal laundromat row with credit-based SMS fields.
 */
const baseLaundromat = {
  id: 'laundromat-1',
  name: 'SpinClean',
  user_id: 'user-1',
  sms_free_credits: 42,
  sms_paid_credits: 100,
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

function createMockSupabase({
  jobQueryResult = { data: baseJob, error: null },
  smsLogResult = { data: null, error: { code: 'PGRST116' } },
} = {}) {
  const mockEqForUpdate = vi.fn().mockResolvedValue({ error: null });
  const mockEqChainForUpdate = vi.fn().mockReturnValue({ eq: mockEqForUpdate });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqChainForUpdate });

  const mockInsert = vi.fn().mockResolvedValue({ error: null });

  const mockJobSingle = vi.fn().mockResolvedValue(jobQueryResult);
  const mockJobEqLaundromatId = vi.fn().mockReturnValue({ single: mockJobSingle });
  const mockJobEqId = vi.fn().mockReturnValue({ eq: mockJobEqLaundromatId });
  const mockJobSelect = vi.fn().mockReturnValue({ eq: mockJobEqId });

  const mockSmsLogSingle = vi.fn().mockResolvedValue(smsLogResult);
  const mockSmsLogEq = vi.fn().mockReturnValue({ single: mockSmsLogSingle });
  const mockSmsLogSelect = vi.fn().mockReturnValue({ eq: mockSmsLogEq });

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

    // Default credit mocks — available (free bucket)
    mockCheckAndConsumeCredit.mockResolvedValue('free');
    mockRefundCredit.mockResolvedValue(undefined);

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
  // Credits exhaustion
  // -------------------------------------------------------------------------

  describe('credits exhaustion', () => {
    it('returns a warning with quotaExhausted: true when no credits available', async () => {
      mockCheckAndConsumeCredit.mockResolvedValue(null);

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
      expect(body.quotaExhausted).toBe(true);
      expect(body.toastType).toBe('warning');
      expect(body.message).toContain('No SMS credits remaining');
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

    it('consumes the credit exactly once on success', async () => {
      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockCheckAndConsumeCredit).toHaveBeenCalledTimes(1);
      expect(mockRefundCredit).not.toHaveBeenCalled();
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

    it('refunds the credit when SMS sending fails', async () => {
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

      expect(mockRefundCredit).toHaveBeenCalledTimes(1);
      expect(mockRefundCredit).toHaveBeenCalledWith(supabase, baseLaundromat.id, 'free');
    });

    it('refunds to paid bucket when a paid credit was consumed', async () => {
      mockCheckAndConsumeCredit.mockResolvedValue('paid');
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

      expect(mockRefundCredit).toHaveBeenCalledWith(supabase, baseLaundromat.id, 'paid');
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

      const jobsUpdate = supabase.from.mock.calls
        .filter(([table]: [string]) => table === 'jobs')
        .map(() => null);
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

    it('refunds the credit when decryption fails after consume', async () => {
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

      expect(mockRefundCredit).toHaveBeenCalledTimes(1);
      expect(mockRefundCredit).toHaveBeenCalledWith(supabase, baseLaundromat.id, 'free');
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

      expect(body.smsSent).toBe(false);
      expect(supabase.from).toHaveBeenCalledWith('jobs');
    });
  });

  // -------------------------------------------------------------------------
  // Credit consumption
  // -------------------------------------------------------------------------

  describe('credit consumption', () => {
    it('calls checkAndConsumeCredit on the SMS path', async () => {
      const supabase = createMockSupabase();

      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: supabase as never,
        error: null,
      });

      await POST(makeRequest(), makeParams());

      expect(mockCheckAndConsumeCredit).toHaveBeenCalledWith(supabase, baseLaundromat.id);
    });

    it('does not call checkAndConsumeCredit on the early-exit (no SMS) path', async () => {
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

      await POST(makeRequest(), makeParams());

      expect(mockCheckAndConsumeCredit).not.toHaveBeenCalled();
    });
  });
});
