import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/auth-helpers');
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}));
vi.mock('@/lib/sms/provider');
vi.mock('@/lib/sms/quota');
// Note: NOT mocking '@/lib/utils/phone' — phoneSchema is a real Zod schema
// nested inside the route's bodySchema and must remain a valid ZodType.
// We use a real PH phone in the test request body to satisfy validation.
vi.mock('@/lib/sms/templates', () => ({
  renderSmsTemplate: vi.fn(() => 'Test SMS body'),
  DEFAULT_COMPLETION_TEMPLATE: 'default',
}));
vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 2, resetAt: Date.now() + 3_600_000 })),
}));

import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSms } from '@/lib/sms/provider';
import { checkAndConsumeCredit, refundCredit } from '@/lib/sms/quota';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { POST } from '../route';

const mockGetAuth = vi.mocked(getAuthenticatedUser);
const mockFrom = vi.mocked(supabaseAdmin.from);
const mockSendSms = vi.mocked(sendSms);
const mockCheckAndConsumeCredit = vi.mocked(checkAndConsumeCredit);
const mockRefundCredit = vi.mocked(refundCredit);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseLaundromat = {
  id: 'lm-1',
  name: 'Sparkle Clean',
  user_id: 'user-1',
  sms_free_credits: 49,
  sms_paid_credits: 0,
  sms_completion_template: null,
  onboarding_completed_at: null as string | null,
};

function makeRequest(body: unknown = { phone: '09171234567' }) {
  return new Request('http://localhost/api/onboarding/test-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function installSupabaseAdmin() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ update } as never);
  return { update, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuth.mockResolvedValue({
    user: { id: 'user-1' } as never,
    laundromat: { ...baseLaundromat } as never,
    supabase: {} as never,
    error: null,
  });
  mockCheckRateLimit.mockReturnValue({
    allowed: true,
    remaining: 2,
    resetAt: Date.now() + 3_600_000,
  });
  mockCheckAndConsumeCredit.mockResolvedValue('free');
  mockSendSms.mockResolvedValue({ success: true, provider: 'mock', messageId: 'sms-1' });
  installSupabaseAdmin();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/test-sms', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce({
      user: null,
      laundromat: null,
      supabase: {} as never,
      error: 'Unauthorized',
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 200 alreadyCompleted and does NOT consume a credit when onboarding is already complete', async () => {
    mockGetAuth.mockResolvedValueOnce({
      user: { id: 'user-1' } as never,
      laundromat: { ...baseLaundromat, onboarding_completed_at: '2026-01-01T00:00:00Z' } as never,
      supabase: {} as never,
      error: null,
    });
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, alreadyCompleted: true });
    expect(mockCheckAndConsumeCredit).not.toHaveBeenCalled();
    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it('returns 429 with Retry-After when per-laundromat hourly limit is exceeded', async () => {
    mockCheckRateLimit.mockReturnValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1800_000,
    });
    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(mockCheckAndConsumeCredit).not.toHaveBeenCalled();
  });

  it('returns 402 with credit-reset copy when no credits remain', async () => {
    mockCheckAndConsumeCredit.mockResolvedValueOnce(null);
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toContain('reset');
  });

  it('refunds the credit when sendSms fails and returns 502', async () => {
    mockSendSms.mockResolvedValueOnce({ success: false, provider: 'mock', error: 'semaphore down' });
    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
    expect(mockRefundCredit).toHaveBeenCalledWith(expect.anything(), 'lm-1', 'free');
  });

  it('logs [CREDIT LEAK] when refundCredit throws after sendSms failure (returns 502, does not crash)', async () => {
    mockSendSms.mockResolvedValueOnce({ success: false, provider: 'mock', error: 'semaphore down' });
    mockRefundCredit.mockRejectedValueOnce(new Error('rpc down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
    const calls = errSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes('CREDIT LEAK'))).toBe(true);

    errSpy.mockRestore();
  });

  it('stamps onboarding_completed_at via supabaseAdmin (not the user-authed client)', async () => {
    const { update } = installSupabaseAdmin();
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_completed_at: expect.any(String) })
    );
  });
});
