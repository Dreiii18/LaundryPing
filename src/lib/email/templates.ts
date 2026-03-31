import { escapeHtml } from '@/lib/utils/sanitize';

export interface TopupConfirmationData {
  laundromatName: string;
  packageLabel: string;
  creditsAdded: number;
  pricePHP: number;
  newPaidCredits: number;
  newTotalCredits: number;
}

export function buildTopupConfirmationEmail(data: TopupConfirmationData): {
  subject: string;
  html: string;
} {
  const subject = `SMS Credits Added — ${data.packageLabel}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0d968b;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">LaundryPing</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">SMS Credits Added</h2>
              <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.5;">
                Hi <strong>${escapeHtml(data.laundromatName)}</strong>, your SMS credits have been topped up successfully.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:6px;padding:16px;margin-bottom:16px;">
                <tr>
                  <td style="padding:6px 16px;color:#71717a;font-size:13px;">Package</td>
                  <td style="padding:6px 16px;color:#18181b;font-size:13px;text-align:right;font-weight:600;">${escapeHtml(data.packageLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 16px;color:#71717a;font-size:13px;">Credits Added</td>
                  <td style="padding:6px 16px;color:#18181b;font-size:13px;text-align:right;font-weight:600;">${data.creditsAdded} SMS</td>
                </tr>
                <tr>
                  <td style="padding:6px 16px;color:#71717a;font-size:13px;">Amount Paid</td>
                  <td style="padding:6px 16px;color:#18181b;font-size:13px;text-align:right;font-weight:600;">PHP ${data.pricePHP.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:8px 16px 0;"><hr style="border:none;border-top:1px solid #e4e4e7;margin:0;"></td>
                </tr>
                <tr>
                  <td style="padding:6px 16px;color:#71717a;font-size:13px;">Paid Credits Balance</td>
                  <td style="padding:6px 16px;color:#18181b;font-size:13px;text-align:right;font-weight:600;">${data.newPaidCredits} SMS</td>
                </tr>
                <tr>
                  <td style="padding:6px 16px;color:#71717a;font-size:13px;">Total Credits</td>
                  <td style="padding:6px 16px;color:#0d968b;font-size:14px;text-align:right;font-weight:700;">${data.newTotalCredits} SMS</td>
                </tr>
              </table>
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;">
                Paid credits never expire. Free credits (50/month) reset on your billing cycle.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;">LaundryPing — SMS notifications for Philippine laundromats</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

export interface PasswordResetEmailData {
  resetLink: string;
}

export function buildPasswordResetEmail(data: PasswordResetEmailData): {
  subject: string;
  html: string;
} {
  const subject = 'Reset your LaundryPing password';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0d968b;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">LaundryPing</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">Reset Your Password</h2>
              <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.5;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center" style="padding:8px 0;">
                    <a href="${escapeHtml(data.resetLink)}" style="display:inline-block;padding:12px 32px;background-color:#0d968b;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;">Reset password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;color:#71717a;font-size:12px;line-height:1.5;word-break:break-all;">
                Or copy this link: ${escapeHtml(data.resetLink)}
              </p>
              <p style="margin:0 0 8px;color:#a1a1aa;font-size:12px;line-height:1.5;">
                This link expires in 1 hour.
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;">
                If you didn&#39;t request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;">LaundryPing — SMS notifications for Philippine laundromats</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

