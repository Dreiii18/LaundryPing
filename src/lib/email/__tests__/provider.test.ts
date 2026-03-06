import { describe, it, expect, afterEach } from 'vitest';
import { getEmailProvider, sendEmail } from '../provider';

describe('getEmailProvider', () => {
  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
  });

  it('returns MockProvider when EMAIL_PROVIDER env is not set', () => {
    delete process.env.EMAIL_PROVIDER;
    const provider = getEmailProvider();
    expect(provider.constructor.name).toBe('MockProvider');
  });

  it('returns MockProvider when EMAIL_PROVIDER=mock', () => {
    process.env.EMAIL_PROVIDER = 'mock';
    const provider = getEmailProvider();
    expect(provider.constructor.name).toBe('MockProvider');
  });

  it('returns ResendProvider when EMAIL_PROVIDER=resend', () => {
    process.env.EMAIL_PROVIDER = 'resend';
    const provider = getEmailProvider();
    expect(provider.constructor.name).toBe('ResendProvider');
  });

  it('returns MockProvider for unknown EMAIL_PROVIDER value (default case)', () => {
    process.env.EMAIL_PROVIDER = 'unknown_provider';
    const provider = getEmailProvider();
    expect(provider.constructor.name).toBe('MockProvider');
  });
});

describe('MockProvider', () => {
  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
  });

  it('returns success: true', async () => {
    delete process.env.EMAIL_PROVIDER;
    const provider = getEmailProvider();
    const result = await provider.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.success).toBe(true);
  });

  it('returns provider name "mock"', async () => {
    delete process.env.EMAIL_PROVIDER;
    const provider = getEmailProvider();
    const result = await provider.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.provider).toBe('mock');
  });

  it('returns a messageId starting with "mock-"', async () => {
    delete process.env.EMAIL_PROVIDER;
    const provider = getEmailProvider();
    const result = await provider.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toMatch(/^mock-\d+$/);
  });

  it('does not return an error field', async () => {
    delete process.env.EMAIL_PROVIDER;
    const provider = getEmailProvider();
    const result = await provider.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.error).toBeUndefined();
  });
});

describe('ResendProvider', () => {
  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
  });

  it('returns error when RESEND_API_KEY is missing', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    delete process.env.RESEND_API_KEY;
    const provider = getEmailProvider();
    const result = await provider.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.success).toBe(false);
    expect(result.provider).toBe('resend');
    expect(result.error).toBe('RESEND_API_KEY not configured');
  });
});

describe('sendEmail convenience wrapper', () => {
  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
  });

  it('delegates to the provider and returns a result', async () => {
    delete process.env.EMAIL_PROVIDER;
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.provider).toBe('string');
  });

  it('returns success result when using mock provider', async () => {
    delete process.env.EMAIL_PROVIDER;
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
    expect(result.messageId).toMatch(/^mock-\d+$/);
  });
});
