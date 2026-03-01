import { describe, it, expect } from 'vitest';
import {
  buildWelcomeEmail,
  buildPlanActivatedEmail,
  buildPlanExpiryReminderEmail,
  buildPlanExpiredEmail,
  buildPlanCancelledEmail,
} from '../templates';

describe('buildWelcomeEmail', () => {
  it('returns a subject containing the shop name', () => {
    const { subject } = buildWelcomeEmail({ shopName: 'SpinClean' });
    expect(subject).toContain('SpinClean');
  });

  it('returns a subject starting with "Welcome"', () => {
    const { subject } = buildWelcomeEmail({ shopName: 'SpinClean' });
    expect(subject).toContain('Welcome');
  });

  it('returns HTML containing the shop name', () => {
    const { html } = buildWelcomeEmail({ shopName: 'SpinClean' });
    expect(html).toContain('SpinClean');
  });

  it('returns HTML containing Tagalog greeting', () => {
    const { html } = buildWelcomeEmail({ shopName: 'SpinClean' });
    expect(html).toContain('Maligayang pagdating');
  });

  it('returns HTML containing English greeting', () => {
    const { html } = buildWelcomeEmail({ shopName: 'SpinClean' });
    expect(html).toContain('Welcome');
  });

  it('returns HTML containing the LaundryPing brand header', () => {
    const { html } = buildWelcomeEmail({ shopName: 'SpinClean' });
    expect(html).toContain('LaundryPing');
  });

  it('returns HTML containing next steps', () => {
    const { html } = buildWelcomeEmail({ shopName: 'SpinClean' });
    expect(html).toContain('Add your laundry machines');
  });
});

describe('buildPlanActivatedEmail', () => {
  const params = {
    shopName: 'SpinClean',
    planLabel: 'Starter',
    planLimit: 300,
    planPricePhp: 299,
  };

  it('returns a subject containing the plan label', () => {
    const { subject } = buildPlanActivatedEmail(params);
    expect(subject).toContain('Starter');
  });

  it('returns HTML containing plan details', () => {
    const { html } = buildPlanActivatedEmail(params);
    expect(html).toContain('300');
    expect(html).toContain('299');
  });

  it('returns HTML containing Tagalog content', () => {
    const { html } = buildPlanActivatedEmail(params);
    expect(html).toContain('Na-activate');
  });

  it('returns HTML containing the shop name', () => {
    const { html } = buildPlanActivatedEmail(params);
    expect(html).toContain('SpinClean');
  });
});

describe('buildPlanExpiryReminderEmail', () => {
  const baseParams = {
    shopName: 'SpinClean',
    planLabel: 'Growth',
    expiresAt: '2026-03-15T00:00:00Z',
  };

  it('returns a subject with days remaining', () => {
    const { subject } = buildPlanExpiryReminderEmail({ ...baseParams, daysRemaining: 7 });
    expect(subject).toContain('7 days');
  });

  it('uses singular "day" when 1 day remaining', () => {
    const { subject } = buildPlanExpiryReminderEmail({ ...baseParams, daysRemaining: 1 });
    expect(subject).toContain('1 day');
    expect(subject).not.toContain('1 days');
  });

  it('returns HTML containing the shop name', () => {
    const { html } = buildPlanExpiryReminderEmail({ ...baseParams, daysRemaining: 3 });
    expect(html).toContain('SpinClean');
  });

  it('returns HTML containing Tagalog renewal message', () => {
    const { html } = buildPlanExpiryReminderEmail({ ...baseParams, daysRemaining: 3 });
    expect(html).toContain('i-renew');
  });

  it('uses "highlight" urgency class for 7 days remaining', () => {
    const { html } = buildPlanExpiryReminderEmail({ ...baseParams, daysRemaining: 7 });
    expect(html).toContain('data-urgency="highlight"');
  });

  it('uses "warning" urgency class for 3 days remaining', () => {
    const { html } = buildPlanExpiryReminderEmail({ ...baseParams, daysRemaining: 3 });
    expect(html).toContain('data-urgency="warning"');
  });

  it('uses "urgent" urgency class for 1 day remaining', () => {
    const { html } = buildPlanExpiryReminderEmail({ ...baseParams, daysRemaining: 1 });
    expect(html).toContain('data-urgency="urgent"');
  });
});

describe('buildPlanExpiredEmail', () => {
  const params = {
    shopName: 'SpinClean',
    planLabel: 'Starter',
    expiredAt: '2026-03-01T00:00:00Z',
  };

  it('returns a subject containing "Expired"', () => {
    const { subject } = buildPlanExpiredEmail(params);
    expect(subject).toContain('Expired');
  });

  it('returns HTML containing the shop name', () => {
    const { html } = buildPlanExpiredEmail(params);
    expect(html).toContain('SpinClean');
  });

  it('returns HTML containing Tagalog expired message', () => {
    const { html } = buildPlanExpiredEmail(params);
    expect(html).toContain('Nag-expire');
  });

  it('returns HTML containing English expired message', () => {
    const { html } = buildPlanExpiredEmail(params);
    expect(html).toContain('expired');
  });

  it('returns HTML containing renewal CTA', () => {
    const { html } = buildPlanExpiredEmail(params);
    expect(html).toContain('GCash');
  });
});

describe('buildPlanCancelledEmail', () => {
  const params = {
    shopName: 'SpinClean',
    planLabel: 'Growth',
    cancelledAt: '2026-02-27T00:00:00Z',
  };

  it('returns a subject containing "Cancelled"', () => {
    const { subject } = buildPlanCancelledEmail(params);
    expect(subject).toContain('Cancelled');
  });

  it('returns HTML containing the shop name', () => {
    const { html } = buildPlanCancelledEmail(params);
    expect(html).toContain('SpinClean');
  });

  it('returns HTML containing Tagalog cancellation message', () => {
    const { html } = buildPlanCancelledEmail(params);
    expect(html).toContain('Na-cancel');
  });

  it('returns HTML containing resubscribe info', () => {
    const { html } = buildPlanCancelledEmail(params);
    expect(html).toContain('resubscribe');
  });

  it('returns HTML containing the plan label', () => {
    const { html } = buildPlanCancelledEmail(params);
    expect(html).toContain('Growth');
  });
});
