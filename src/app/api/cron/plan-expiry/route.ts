import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  sendEmail,
  buildPlanExpiryReminderEmail,
  buildPlanExpiredEmail,
} from '@/lib/email';

export async function GET(request: Request) {
  // Auth via CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = {
    reminders_sent: 0,
    expired_sent: 0,
    errors: 0,
    skipped_already_sent: 0,
  };

  const now = new Date();

  // --- Phase 1: Reminders (7, 3, 1 days before expiry) ---
  for (const days of [7, 3, 1]) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);

    // Window: start of target day to end of target day (UTC)
    const windowStart = new Date(targetDate);
    windowStart.setUTCHours(0, 0, 0, 0);
    const windowEnd = new Date(targetDate);
    windowEnd.setUTCHours(23, 59, 59, 999);

    const { data: laundromats } = await supabaseAdmin
      .from('laundromats')
      .select('id, user_id, name, sms_plan_id, sms_plan_expires_at')
      .not('sms_plan_id', 'is', null)
      .gte('sms_plan_expires_at', windowStart.toISOString())
      .lte('sms_plan_expires_at', windowEnd.toISOString());

    if (!laundromats || laundromats.length === 0) continue;

    for (const laundromat of laundromats) {
      // Idempotency: check if already sent
      const { data: existing } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('laundromat_id', laundromat.id)
        .eq('email_type', 'plan_expiry_reminder')
        .eq('status', 'sent')
        .eq('metadata->>reminder_days', String(days))
        .limit(1);

      if (existing && existing.length > 0) {
        summary.skipped_already_sent++;
        continue;
      }

      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(laundromat.user_id);
        if (!userData?.user?.email) continue;

        const { data: plan } = await supabaseAdmin
          .from('sms_plans')
          .select('label')
          .eq('id', laundromat.sms_plan_id!)
          .single();

        const { subject, html } = buildPlanExpiryReminderEmail({
          shopName: laundromat.name,
          planLabel: plan?.label || 'SMS',
          daysRemaining: days,
          expiresAt: laundromat.sms_plan_expires_at!,
        });

        const result = await sendEmail({ to: { email: userData.user.email }, subject, html });

        await supabaseAdmin.from('email_logs').insert({
          user_id: laundromat.user_id,
          laundromat_id: laundromat.id,
          email_type: 'plan_expiry_reminder' as const,
          recipient_email: userData.user.email,
          subject,
          provider: result.provider,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId || null,
          provider_response: result.rawResponse ? (result.rawResponse as Record<string, unknown>) : null,
          metadata: { reminder_days: String(days), expires_at: laundromat.sms_plan_expires_at },
        });

        if (result.success) {
          summary.reminders_sent++;
        } else {
          summary.errors++;
        }
      } catch (err) {
        console.error(`[Cron] Reminder error for laundromat ${laundromat.id}:`, err);
        summary.errors++;
      }
    }
  }

  // --- Phase 2: Expired (plan expired in last 24h) ---
  const twentyFourHoursAgo = new Date(now);
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data: expiredLaundromats } = await supabaseAdmin
    .from('laundromats')
    .select('id, user_id, name, sms_plan_id, sms_plan_expires_at')
    .not('sms_plan_id', 'is', null)
    .lt('sms_plan_expires_at', now.toISOString())
    .gte('sms_plan_expires_at', twentyFourHoursAgo.toISOString());

  if (expiredLaundromats && expiredLaundromats.length > 0) {
    for (const laundromat of expiredLaundromats) {
      // Idempotency: check if already sent
      const { data: existing } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('laundromat_id', laundromat.id)
        .eq('email_type', 'plan_expired')
        .eq('status', 'sent')
        .eq('metadata->>expires_at', laundromat.sms_plan_expires_at!)
        .limit(1);

      if (existing && existing.length > 0) {
        summary.skipped_already_sent++;
        continue;
      }

      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(laundromat.user_id);
        if (!userData?.user?.email) continue;

        const { data: plan } = await supabaseAdmin
          .from('sms_plans')
          .select('label')
          .eq('id', laundromat.sms_plan_id!)
          .single();

        const { subject, html } = buildPlanExpiredEmail({
          shopName: laundromat.name,
          planLabel: plan?.label || 'SMS',
          expiredAt: laundromat.sms_plan_expires_at!,
        });

        const result = await sendEmail({ to: { email: userData.user.email }, subject, html });

        await supabaseAdmin.from('email_logs').insert({
          user_id: laundromat.user_id,
          laundromat_id: laundromat.id,
          email_type: 'plan_expired' as const,
          recipient_email: userData.user.email,
          subject,
          provider: result.provider,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId || null,
          provider_response: result.rawResponse ? (result.rawResponse as Record<string, unknown>) : null,
          metadata: { expires_at: laundromat.sms_plan_expires_at },
        });

        if (result.success) {
          summary.expired_sent++;
        } else {
          summary.errors++;
        }
      } catch (err) {
        console.error(`[Cron] Expired email error for laundromat ${laundromat.id}:`, err);
        summary.errors++;
      }
    }
  }

  return NextResponse.json(summary);
}
