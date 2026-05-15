import { describe, it, expect } from 'vitest';
import {
  buildTopupConfirmationEmail,
  buildPasswordResetEmail,
  buildNewSignupEmail,
  buildDailyPulseEmail,
  buildWelcomeEmail,
  buildD2NoMachineEmail,
  buildD7NoSmsEmail,
  buildD30RecapEmail,
} from '../templates';

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

describe('buildNewSignupEmail', () => {
  const sampleSignupData = {
    shopName: 'Sparkle Clean',
    email: 'owner@sparkle.com',
    signupTimestamp: 'April 1, 2026 at 10:00 AM',
  };

  it('returns an object with subject and html', () => {
    const result = buildNewSignupEmail(sampleSignupData);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(typeof result.subject).toBe('string');
    expect(typeof result.html).toBe('string');
  });

  it('subject contains the shop name', () => {
    const result = buildNewSignupEmail(sampleSignupData);
    expect(result.subject).toBe('New Signup: Sparkle Clean');
  });

  it('html contains the shop name', () => {
    const result = buildNewSignupEmail(sampleSignupData);
    expect(result.html).toContain('Sparkle Clean');
  });

  it('html contains the email', () => {
    const result = buildNewSignupEmail(sampleSignupData);
    expect(result.html).toContain('owner@sparkle.com');
  });

  it('html contains the signup timestamp', () => {
    const result = buildNewSignupEmail(sampleSignupData);
    expect(result.html).toContain('April 1, 2026 at 10:00 AM');
  });

  it('html contains branding color #0d968b', () => {
    const result = buildNewSignupEmail(sampleSignupData);
    expect(result.html).toContain('#0d968b');
  });

  it('escapes HTML in shop name', () => {
    const result = buildNewSignupEmail({
      ...sampleSignupData,
      shopName: '<script>alert("xss")</script>',
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in email', () => {
    const result = buildNewSignupEmail({
      ...sampleSignupData,
      email: '<img src=x onerror=alert(1)>@evil.com',
    });
    expect(result.html).not.toContain('<img');
    expect(result.html).toContain('&lt;img');
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

  it('html mentions 1-hour expiry', () => {
    const result = buildPasswordResetEmail({ resetLink });
    expect(result.html).toContain('1 hour');
  });

  it('escapes HTML in resetLink to prevent XSS', () => {
    const result = buildPasswordResetEmail({
      resetLink: 'https://example.com?x="><script>alert(1)</script>',
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });
});

describe('buildDailyPulseEmail', () => {
  const samplePulseData = {
    date: 'March 31, 2026',
    activeShopsYesterday: 3,
    totalShops: 10,
    jobsYesterday: 42,
    smsSent: 38,
    smsFailed: 2,
    inactiveShops: [
      { name: 'Suds & Bubbles', daysSinceActive: 5 },
      { name: 'Fresh Press Laundry', daysSinceActive: null },
    ],
    zeroCreditsShops: [{ name: 'Coin Wash Express' }],
  };

  it('returns an object with subject and html', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(typeof result.subject).toBe('string');
    expect(typeof result.html).toBe('string');
  });

  it('subject contains the date', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.subject).toContain('March 31, 2026');
    expect(result.subject).toBe('LaundryPing Daily Pulse — March 31, 2026');
  });

  it('html contains active shops count', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('3 / 10');
  });

  it('html contains jobs count', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('42');
  });

  it('html contains SMS sent count', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('38');
  });

  it('html contains SMS failed count', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('2');
  });

  it('html uses red color for non-zero SMS failed', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('#ef4444');
  });

  it('html does NOT use red color for SMS failed when count is zero', () => {
    // When smsFailed is 0 and no zero-credits shops, #ef4444 should not appear at all
    const resultNoAlerts = buildDailyPulseEmail({
      ...samplePulseData,
      smsFailed: 0,
      zeroCreditsShops: [],
    });
    expect(resultNoAlerts.html).not.toContain('#ef4444');
  });

  it('html contains inactive shop names when provided', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('Suds &amp; Bubbles');
    expect(result.html).toContain('Fresh Press Laundry');
  });

  it('html shows "Never active" for inactive shop with null daysSinceActive', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('Never active');
  });

  it('html contains zero-credits shop names when provided', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('Coin Wash Express');
  });

  it('html does NOT contain inactive section when list is empty', () => {
    const result = buildDailyPulseEmail({ ...samplePulseData, inactiveShops: [] });
    expect(result.html).not.toContain('Inactive Shops (3+ days)');
  });

  it('html does NOT contain zero-credits section when list is empty', () => {
    const result = buildDailyPulseEmail({ ...samplePulseData, zeroCreditsShops: [] });
    expect(result.html).not.toContain('Shops with 0 Credits');
  });

  it('html contains branding color #0d968b', () => {
    const result = buildDailyPulseEmail(samplePulseData);
    expect(result.html).toContain('#0d968b');
  });

  it('escapes HTML in shop names', () => {
    const result = buildDailyPulseEmail({
      ...samplePulseData,
      inactiveShops: [{ name: '<script>alert("xss")</script>', daysSinceActive: 4 }],
      zeroCreditsShops: [{ name: '<img src=x onerror=alert(1)>' }],
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).not.toContain('<img src=x');
    expect(result.html).toContain('&lt;img');
  });
});

// ---------------------------------------------------------------------------
// Lifecycle emails (D0 welcome / D2 no-machine / D7 no-SMS / D30 recap)
// ---------------------------------------------------------------------------

describe('buildWelcomeEmail', () => {
  const sample = { shopName: 'Sparkle Clean', onboardingUrl: 'https://laundryping.com/onboarding' };

  it('returns subject and html', () => {
    const result = buildWelcomeEmail(sample);
    expect(result.subject).toBe('Welcome to LaundryPing — send your first SMS today');
    expect(result.html).toContain('Sparkle Clean');
    expect(result.html).toContain('https://laundryping.com/onboarding');
  });

  it('escapes HTML in shop name', () => {
    const result = buildWelcomeEmail({ ...sample, shopName: '<script>alert(1)</script>' });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in onboardingUrl (CTA href injection)', () => {
    const result = buildWelcomeEmail({
      ...sample,
      onboardingUrl: '"><script>alert(1)</script>',
    });
    expect(result.html).not.toContain('<script>alert(1)</script>');
    expect(result.html).toContain('&lt;script&gt;');
  });
});

describe('buildD2NoMachineEmail', () => {
  const sample = { shopName: 'Sparkle Clean', onboardingUrl: 'https://laundryping.com/onboarding' };

  it('returns subject and html', () => {
    const result = buildD2NoMachineEmail(sample);
    expect(result.subject).toBe('Add your first machine in under a minute');
    expect(result.html).toContain('Sparkle Clean');
  });

  it('escapes HTML in shop name', () => {
    const result = buildD2NoMachineEmail({ ...sample, shopName: '<script>alert(1)</script>' });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in onboardingUrl (CTA href injection)', () => {
    const result = buildD2NoMachineEmail({
      ...sample,
      onboardingUrl: '"><script>alert(1)</script>',
    });
    expect(result.html).not.toContain('<script>alert(1)</script>');
  });
});

describe('buildD7NoSmsEmail', () => {
  const sample = { shopName: 'Sparkle Clean', appUrl: 'https://laundryping.com/dashboard' };

  it('returns subject and html', () => {
    const result = buildD7NoSmsEmail(sample);
    expect(result.subject).toBe('Send your first "laundry done" SMS today');
    expect(result.html).toContain('Sparkle Clean');
  });

  it('escapes HTML in shop name', () => {
    const result = buildD7NoSmsEmail({ ...sample, shopName: '<script>alert(1)</script>' });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in appUrl (CTA href injection)', () => {
    const result = buildD7NoSmsEmail({ ...sample, appUrl: '"><script>alert(1)</script>' });
    expect(result.html).not.toContain('<script>alert(1)</script>');
  });
});

describe('buildD30RecapEmail', () => {
  const sample = {
    shopName: 'Sparkle Clean',
    appUrl: 'https://laundryping.com/dashboard',
    jobsCount: 12,
    smsSent: 9,
    freeCreditsRemaining: 41,
  };

  it('returns subject and html with stats', () => {
    const result = buildD30RecapEmail(sample);
    expect(result.subject).toBe('Your first 30 days on LaundryPing');
    expect(result.html).toContain('Sparkle Clean');
    expect(result.html).toContain('>12<'); // jobsCount cell
    expect(result.html).toContain('>9<'); // smsSent cell
    expect(result.html).toContain('>41<'); // freeCreditsRemaining cell
  });

  it('shows the "blocked feedback" copy when no SMS sent', () => {
    const result = buildD30RecapEmail({ ...sample, smsSent: 0 });
    // Apostrophe is HTML-escaped (&#39;) in the rendered template.
    expect(result.html).toContain('what&#39;s blocking');
  });

  it('escapes HTML in shop name', () => {
    const result = buildD30RecapEmail({ ...sample, shopName: '<script>alert(1)</script>' });
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in appUrl (CTA href injection)', () => {
    const result = buildD30RecapEmail({ ...sample, appUrl: '"><script>alert(1)</script>' });
    expect(result.html).not.toContain('<script>alert(1)</script>');
  });
});
