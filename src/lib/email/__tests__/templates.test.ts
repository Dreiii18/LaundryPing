import { describe, it, expect } from 'vitest';
import { buildTopupConfirmationEmail, buildPasswordResetEmail } from '../templates';

const sampleData = {
  laundromatName: 'Sparkle Clean Laundry',
  packageLabel: 'Pack 250',
  creditsAdded: 250,
  pricePHP: 299,
  newPaidCredits: 350,
  newTotalCredits: 400,
};

describe('buildTopupConfirmationEmail', () => {
  it('returns an object with subject and html', () => {
    const result = buildTopupConfirmationEmail(sampleData);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(typeof result.subject).toBe('string');
    expect(typeof result.html).toBe('string');
  });

  it('subject contains the package label', () => {
    const result = buildTopupConfirmationEmail(sampleData);
    expect(result.subject).toBe('SMS Credits Added — Pack 250');
  });

  it('html contains the laundromat name', () => {
    const result = buildTopupConfirmationEmail(sampleData);
    expect(result.html).toContain('Sparkle Clean Laundry');
  });

  it('html contains credits added', () => {
    const result = buildTopupConfirmationEmail(sampleData);
    expect(result.html).toContain('250 SMS');
  });

  it('html contains the price', () => {
    const result = buildTopupConfirmationEmail(sampleData);
    expect(result.html).toContain('PHP 299');
  });

  it('html contains paid credits balance', () => {
    const result = buildTopupConfirmationEmail(sampleData);
    expect(result.html).toContain('350 SMS');
  });

  it('html contains total credits', () => {
    const result = buildTopupConfirmationEmail(sampleData);
    expect(result.html).toContain('400 SMS');
  });

  it('html contains LaundryPing branding color', () => {
    const result = buildTopupConfirmationEmail(sampleData);
    expect(result.html).toContain('#0d968b');
  });

  it('escapes HTML in laundromat name', () => {
    const result = buildTopupConfirmationEmail({
      ...sampleData,
      laundromatName: '<script>alert("xss")</script>',
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });
});

describe('buildPasswordResetEmail', () => {
  const resetLink = 'https://laundryping.com/api/auth/callback?next=/reset-password&token=abc123';

  it('returns an object with subject and html', () => {
    const result = buildPasswordResetEmail({ resetLink });
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
  });

  it('subject is "Reset your LaundryPing password"', () => {
    const result = buildPasswordResetEmail({ resetLink });
    expect(result.subject).toBe('Reset your LaundryPing password');
  });

  it('html contains the reset link (with HTML-escaped ampersands)', () => {
    const result = buildPasswordResetEmail({ resetLink });
    // escapeHtml converts & to &amp;
    const escapedLink = resetLink.replace(/&/g, '&amp;');
    expect(result.html).toContain(escapedLink);
  });

  it('html contains LaundryPing branding', () => {
    const result = buildPasswordResetEmail({ resetLink });
    expect(result.html).toContain('LaundryPing');
    expect(result.html).toContain('#0d968b');
  });

  it('html contains a "Reset password" button', () => {
    const result = buildPasswordResetEmail({ resetLink });
    expect(result.html).toContain('Reset password</a>');
  });

  it('html contains the safety disclaimer', () => {
    const result = buildPasswordResetEmail({ resetLink });
    expect(result.html).toContain('safely ignore this email');
  });

  it('html mentions 24-hour expiry', () => {
    const result = buildPasswordResetEmail({ resetLink });
    expect(result.html).toContain('24 hours');
  });

  it('escapes HTML in resetLink to prevent XSS', () => {
    const result = buildPasswordResetEmail({
      resetLink: 'https://example.com?x="><script>alert(1)</script>',
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });
});
