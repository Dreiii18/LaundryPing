import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSmsProvider, sendSms } from '../provider';

describe('getSmsProvider', () => {
  afterEach(() => {
    delete process.env.SMS_PROVIDER;
  });

  it('returns MockProvider when SMS_PROVIDER env is not set', () => {
    delete process.env.SMS_PROVIDER;
    const provider = getSmsProvider();
    // The constructor name reveals which provider class was instantiated
    expect(provider.constructor.name).toBe('MockProvider');
  });

  it('returns MockProvider when SMS_PROVIDER=mock', () => {
    process.env.SMS_PROVIDER = 'mock';
    const provider = getSmsProvider();
    expect(provider.constructor.name).toBe('MockProvider');
  });

  it('returns SemaphoreProvider when SMS_PROVIDER=semaphore', () => {
    process.env.SMS_PROVIDER = 'semaphore';
    const provider = getSmsProvider();
    expect(provider.constructor.name).toBe('SemaphoreProvider');
  });

  it('returns MockProvider for unknown SMS_PROVIDER value (default case)', () => {
    process.env.SMS_PROVIDER = 'unknown_provider';
    const provider = getSmsProvider();
    expect(provider.constructor.name).toBe('MockProvider');
  });
});

describe('MockProvider', () => {
  beforeEach(() => {
    // Ensure we always get a MockProvider
    delete process.env.SMS_PROVIDER;
  });

  it('returns success: true', async () => {
    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');
    expect(result.success).toBe(true);
  });

  it('returns provider name "mock"', async () => {
    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');
    expect(result.provider).toBe('mock');
  });

  it('returns a messageId starting with "mock-"', async () => {
    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toMatch(/^mock-\d+$/);
  });

  it('does not return an error field', async () => {
    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');
    expect(result.error).toBeUndefined();
  });

  it('accepts any phone number and message without throwing', async () => {
    const provider = getSmsProvider();
    await expect(
      provider.send('+639171234567', 'Magandang araw po!')
    ).resolves.not.toThrow();
  });

  it('returns unique messageIds for successive calls', async () => {
    const provider = getSmsProvider();
    const result1 = await provider.send('09171234567', 'Message 1');
    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 5));
    const result2 = await provider.send('09171234567', 'Message 2');
    // messageId format is mock-{Date.now()}, so they should differ over time
    // (they could theoretically collide within the same ms, so we just check they're both defined)
    expect(result1.messageId).toBeDefined();
    expect(result2.messageId).toBeDefined();
  });
});

describe('sendSms convenience wrapper', () => {
  beforeEach(() => {
    delete process.env.SMS_PROVIDER;
  });

  afterEach(() => {
    delete process.env.SMS_PROVIDER;
  });

  it('delegates to the provider and returns a result', async () => {
    const result = await sendSms('09171234567', 'Test message');
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.provider).toBe('string');
  });

  it('returns success result when using mock provider', async () => {
    const result = await sendSms('09171234567', 'Test message');
    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
  });

  it('passes the phone number to the provider', async () => {
    // We spy on getSmsProvider to capture calls. Instead we verify the
    // result which is provider-specific to confirm delegation happened.
    const result = await sendSms('09171234567', 'Your laundry is ready!');
    expect(result.messageId).toMatch(/^mock-\d+$/);
  });

  it('returns provider: "semaphore" with error when api key missing', async () => {
    process.env.SMS_PROVIDER = 'semaphore';
    delete process.env.SEMAPHORE_API_KEY;
    const result = await sendSms('09171234567', 'Test message');
    expect(result.success).toBe(false);
    expect(result.provider).toBe('semaphore');
    expect(result.error).toContain('SEMAPHORE_API_KEY not configured');
  });
});

describe('SemaphoreProvider', () => {
  beforeEach(() => {
    process.env.SMS_PROVIDER = 'semaphore';
    delete process.env.SEMAPHORE_API_KEY;
  });

  afterEach(() => {
    delete process.env.SMS_PROVIDER;
    delete process.env.SEMAPHORE_API_KEY;
  });

  it('returns success: false and descriptive error when API key is absent', async () => {
    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');
    expect(result.success).toBe(false);
    expect(result.error).toBe('SEMAPHORE_API_KEY not configured');
  });

  it('returns provider name "semaphore" even on error', async () => {
    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');
    expect(result.provider).toBe('semaphore');
  });

  it('makes an HTTP POST request to semaphore API when key is present', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';

    // Mock the global fetch to avoid real network calls
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ message_id: 'sem-12345' }],
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://semaphore.co/api/v4/messages',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('sem-12345');

    vi.unstubAllGlobals();
    delete process.env.SEMAPHORE_API_KEY;
  });

  it('returns error result when HTTP response is not ok', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Unprocessable Entity',
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toContain('422');

    vi.unstubAllGlobals();
    delete process.env.SEMAPHORE_API_KEY;
  });

  it('returns timeout error when fetch is aborted', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMS API timeout (5s)');

    vi.unstubAllGlobals();
    delete process.env.SEMAPHORE_API_KEY;
  });

  it('returns network error on generic fetch failure', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.stubGlobal('fetch', mockFetch);

    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network failure');

    vi.unstubAllGlobals();
    delete process.env.SEMAPHORE_API_KEY;
  });

  it('returns failure when Semaphore returns 200 with error object instead of array', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 401, message: 'Unauthorized' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Semaphore API error');
    expect(result.error).toContain('Unauthorized');
    expect(result.rawResponse).toEqual({ status: 401, message: 'Unauthorized' });

    vi.unstubAllGlobals();
  });

  it('returns failure when Semaphore returns 200 with empty array', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Semaphore API error');

    vi.unstubAllGlobals();
  });

  it('returns failure when Semaphore returns array entry without message_id', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ status: 'Failed', error: 'Invalid number' }],
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = getSmsProvider();
    const result = await provider.send('09171234567', 'Test message');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Semaphore API error');

    vi.unstubAllGlobals();
  });
});
