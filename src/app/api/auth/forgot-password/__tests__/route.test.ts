import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        generateLink: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/email/provider', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/email/templates', () => ({
  buildPasswordResetEmail: vi.fn(() => ({
    subject: 'Reset your LaundryPing password',
    html: '<html>reset</html>',
  })),
}));

vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 2, resetAt: Date.now() + 60_000 })),
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/provider';
import { checkRateLimit } from '@/lib/utils/rate-limit';

const mockGenerateLink = vi.mocked(supabaseAdmin.auth.admin.generateLink);
const mockSendEmail = vi.mocked(sendEmail);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown = { email: 'test@example.com' }) {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 2, resetAt: Date.now() + 60_000 });
  mockGenerateLink.mockResolvedValue({
    data: {
      properties: {
        action_link: 'https://laundryping.ph/reset-password?token=abc',
        email_otp: '',
        hashed_token: '',
        redirect_to: '',
        verification_type: 'recovery' as const,
      },
      user: {} as never,
    },
    error: null,
  });
  mockSendEmail.mockResolvedValue({ success: true, provider: 'mock', messageId: 'msg-1' });
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 400 for invalid email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('returns 400 for missing email', async () => {
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it('returns 200 with generic message on success', async () => {
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain('reset link has been sent');
  });

  it('calls generateLink with recovery type', async () => {
    await POST(makeRequest() as never);
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recovery',
        email: 'test@example.com',
      }),
    );
  });

  it('sends email via sendEmail', async () => {
    await POST(makeRequest() as never);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Reset your LaundryPing password',
      }),
    );
  });

  it('returns 200 even when generateLink fails (email enumeration prevention)', async () => {
    mockGenerateLink.mockResolvedValue({
      data: { properties: null as never, user: {} as never },
      error: { message: 'User not found', status: 422, name: 'AuthApiError' },
    });
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain('reset link has been sent');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited (no link generated)', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain('Too many requests');
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it('returns 200 even when sendEmail fails', async () => {
    mockSendEmail.mockResolvedValue({ success: false, provider: 'mock', error: 'SMTP down' });
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);
  });

  it('calls checkRateLimit with IP-based key and custom limits', async () => {
    await POST(makeRequest() as never);
    expect(mockCheckRateLimit).toHaveBeenCalledWith('forgot-password:127.0.0.1', 3, 60_000);
  });
});
