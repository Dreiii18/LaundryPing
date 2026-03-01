/**
 * Bilingual Tagalog/English HTML email templates for LaundryPing.
 * Mirrors the pattern from src/lib/sms/templates.ts.
 */

const BRAND_COLOR = '#0d968b';

function emailLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LaundryPing</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR};padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">LaundryPing</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#71717a;">
                LaundryPing — SMS notifications for Philippine laundromats
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmail({ shopName }: { shopName: string }): { subject: string; html: string } {
  const subject = `Welcome to LaundryPing, ${shopName}!`;

  const body = `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Maligayang pagdating! Welcome!</h2>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Salamat sa pag-sign up ng <strong>${shopName}</strong> sa LaundryPing!
    </p>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Thank you for signing up <strong>${shopName}</strong> on LaundryPing!
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Here's what to do next:
    </p>
    <ol style="margin:0 0 24px;padding-left:20px;color:#3f3f46;font-size:15px;line-height:1.8;">
      <li>Add your laundry machines in the dashboard</li>
      <li>Contact us to activate an SMS plan</li>
      <li>Start creating jobs and sending "laundry done" notifications!</li>
    </ol>
    <p style="margin:0;color:#71717a;font-size:13px;">
      If you have questions, just reply to this email — we're happy to help.
    </p>`;

  return { subject, html: emailLayout(body) };
}

export function buildPlanActivatedEmail({
  shopName,
  planLabel,
  planLimit,
  planPricePhp,
}: {
  shopName: string;
  planLabel: string;
  planLimit: number;
  planPricePhp: number;
}): { subject: string; html: string } {
  const subject = `SMS Plan Activated — ${planLabel}`;

  const body = `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Plan Activated!</h2>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Na-activate na ang SMS plan ng <strong>${shopName}</strong>. Congratulations!
    </p>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      The SMS plan for <strong>${shopName}</strong> has been activated.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:16px 0 24px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;width:100%;">
      <tr style="background:#f4f4f5;">
        <td style="padding:10px 16px;font-size:14px;color:#71717a;font-weight:600;">Plan</td>
        <td style="padding:10px 16px;font-size:14px;color:#18181b;">${planLabel}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#71717a;font-weight:600;">SMS Limit</td>
        <td style="padding:10px 16px;font-size:14px;color:#18181b;">${planLimit} / month</td>
      </tr>
      <tr style="background:#f4f4f5;">
        <td style="padding:10px 16px;font-size:14px;color:#71717a;font-weight:600;">Price</td>
        <td style="padding:10px 16px;font-size:14px;color:#18181b;">PHP ${planPricePhp}/mo</td>
      </tr>
    </table>
    <p style="margin:0;color:#71717a;font-size:13px;">
      You can now send SMS notifications to your customers. Enjoy!
    </p>`;

  return { subject, html: emailLayout(body) };
}

export function buildPlanExpiryReminderEmail({
  shopName,
  planLabel,
  daysRemaining,
  expiresAt,
}: {
  shopName: string;
  planLabel: string;
  daysRemaining: number;
  expiresAt: string;
}): { subject: string; html: string } {
  const subject = `SMS Plan Expiring in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} — ${shopName}`;

  // Urgency styling based on days remaining
  let urgencyColor: string;
  let urgencyBg: string;
  let urgencyClass: string;
  if (daysRemaining <= 1) {
    urgencyColor = '#dc2626';
    urgencyBg = '#fef2f2';
    urgencyClass = 'urgent';
  } else if (daysRemaining <= 3) {
    urgencyColor = '#d97706';
    urgencyBg = '#fffbeb';
    urgencyClass = 'warning';
  } else {
    urgencyColor = '#2563eb';
    urgencyBg = '#eff6ff';
    urgencyClass = 'highlight';
  }

  const expiresDate = new Date(expiresAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Plan Expiry Reminder</h2>
    <div data-urgency="${urgencyClass}" style="margin:0 0 20px;padding:16px;border-radius:8px;background:${urgencyBg};border-left:4px solid ${urgencyColor};">
      <p style="margin:0;color:${urgencyColor};font-size:15px;font-weight:600;">
        Mag-e-expire ang inyong ${planLabel} plan sa ${daysRemaining} araw.
      </p>
      <p style="margin:4px 0 0;color:${urgencyColor};font-size:15px;">
        Your ${planLabel} plan for <strong>${shopName}</strong> expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.
      </p>
    </div>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Expiry date: <strong>${expiresDate}</strong>
    </p>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Para makapagpatuloy sa pag-send ng SMS notifications, i-renew po ang inyong plan bago mag-expire.
    </p>
    <p style="margin:0;color:#3f3f46;font-size:15px;line-height:1.6;">
      To continue sending SMS notifications, please renew your plan before it expires. Contact us via GCash to renew.
    </p>`;

  return { subject, html: emailLayout(body) };
}

export function buildPlanExpiredEmail({
  shopName,
  planLabel,
  expiredAt,
}: {
  shopName: string;
  planLabel: string;
  expiredAt: string;
}): { subject: string; html: string } {
  const subject = `SMS Plan Expired — ${shopName}`;

  const expiredDate = new Date(expiredAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Plan Expired</h2>
    <div style="margin:0 0 20px;padding:16px;border-radius:8px;background:#fef2f2;border-left:4px solid #dc2626;">
      <p style="margin:0;color:#dc2626;font-size:15px;font-weight:600;">
        Nag-expire na ang inyong ${planLabel} plan noong ${expiredDate}.
      </p>
      <p style="margin:4px 0 0;color:#dc2626;font-size:15px;">
        Your ${planLabel} plan for <strong>${shopName}</strong> expired on ${expiredDate}.
      </p>
    </div>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Hindi na po kayo makakapag-send ng SMS notifications hangga't walang active na plan.
    </p>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      You will not be able to send SMS notifications until your plan is renewed.
    </p>
    <p style="margin:0;color:#3f3f46;font-size:15px;line-height:1.6;">
      Contact us via GCash to reactivate your plan and resume sending notifications.
    </p>`;

  return { subject, html: emailLayout(body) };
}

export function buildPlanCancelledEmail({
  shopName,
  planLabel,
  cancelledAt,
}: {
  shopName: string;
  planLabel: string;
  cancelledAt: string;
}): { subject: string; html: string } {
  const subject = `SMS Plan Cancelled — ${shopName}`;

  const cancelledDate = new Date(cancelledAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Plan Cancelled</h2>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Na-cancel ang inyong <strong>${planLabel}</strong> plan para sa <strong>${shopName}</strong> noong ${cancelledDate}.
    </p>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Your <strong>${planLabel}</strong> plan for <strong>${shopName}</strong> has been cancelled on ${cancelledDate}.
    </p>
    <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Hindi na po kayo makakapag-send ng SMS notifications hangga't walang active na plan.
    </p>
    <p style="margin:0;color:#3f3f46;font-size:15px;line-height:1.6;">
      If you'd like to resubscribe, contact us via GCash to activate a new plan.
    </p>`;

  return { subject, html: emailLayout(body) };
}
