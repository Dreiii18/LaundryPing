import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEmailProvider, sendEmail } from '../provider';

describe('getEmailProvider', () => {
  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
  });

  it('returns MockEmailProvider when EMAIL_PROVIDER env is not set', () => {
    delete process.env.EMAIL_PROVIDER;
    const provider = getEmailProvider();
    expect(provider.constructor.name).toBe('MockEmailProvider');
  });

  it('returns MockEmailProvider when EMAIL_PROVIDER=mock', () => {
    process.env.EMAIL_PROVIDER = 'mock';
    const provider = getEmailProvider();
    expect(provider.constructor.name).toBe('MockEmailProvider');
  });

  it('returns ResendProvider when EMAIL_PROVIDER=resend', () => {
    process.env.EMAIL_PROVIDER = 'resend';
    const provider = getEmailProvider();
    expect(provider.constructor.name).toBe('ResendProvider');
  });

  it('returns MockEmailProvider for unknown EMAIL_PROVIDER value (default case)', () => {
    process.env.EMAIL_PROVIDER = 'unknown_provider';
    const provider = getEmailProvider();
    expect(provider.constructor.name).toBe('MockEmailProvider');
  });
});

describe('MockEmailProvider', () => {
  beforeEach(() => {
    delete process.env.EMAIL_PROVIDER;
  });

  it('returns success: true', async () => {
    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result.success).toBe(true);
  });

  it('returns provider name "mock"', async () => {
    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result.provider).toBe('mock');
  });

  it('returns a messageId starting with "mock-"', async () => {
    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toMatch(/^mock-\d+$/);
  });

  it('does not return an error field', async () => {
    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result.error).toBeUndefined();
  });

  it('accepts any email payload without throwing', async () => {
    const provider = getEmailProvider();
    await expect(
      provider.send({
        to: { email: 'user@laundromat.ph', name: 'Shop Owner' },
        subject: 'Welcome!',
        html: '<h1>Welcome</h1>',
      })
    ).resolves.not.toThrow();
  });
});

describe('sendEmail convenience wrapper', () => {
  beforeEach(() => {
    delete process.env.EMAIL_PROVIDER;
  });

  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
  });

  it('delegates to the provider and returns a result', async () => {
    const result = await sendEmail({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.provider).toBe('string');
  });

  it('returns success result when using mock provider', async () => {
    const result = await sendEmail({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
  });
});

describe('ResendProvider', () => {
  beforeEach(() => {
    process.env.EMAIL_PROVIDER = 'resend';
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
  });

  it('returns success: false and descriptive error when API key is absent', async () => {
    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('RESEND_API_KEY not configured');
  });

  it('returns provider name "resend" even on error', async () => {
    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result.provider).toBe('resend');
  });

  it('makes an HTTP POST request to Resend API when key is present', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'resend-12345' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('resend-12345');

    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
  });

  it('returns error result when HTTP response is not ok', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Unprocessable Entity',
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('422');

    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
  });

  it('returns timeout error when fetch is aborted', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email API timeout (10s)');

    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
  });

  it('returns network error on generic fetch failure', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.stubGlobal('fetch', mockFetch);

    const provider = getEmailProvider();
    const result = await provider.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network failure');

    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
  });
});
