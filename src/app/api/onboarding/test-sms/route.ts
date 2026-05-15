import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { phoneSchema, normalizeToLocal } from '@/lib/utils/phone';
import { sendSms } from '@/lib/sms/provider';
import { renderSmsTemplate, DEFAULT_COMPLETION_TEMPLATE } from '@/lib/sms/templates';
import { checkAndConsumeCredit, refundCredit } from '@/lib/sms/quota';
import { checkRateLimit } from '@/lib/utils/rate-limit';

const bodySchema = z.object({ phone: phoneSchema });

// Per-laundromat cap on top of the global mutation limiter (60 req/min/user
// in proxy.ts). Without this, a logged-in user can fire up to 60 test SMS
// to an arbitrary PH number per minute — abuse vector (credit drain +
// harassment of arbitrary numbers).
const TEST_SMS_HOURLY_LIMIT = 3;
const TEST_SMS_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    // Idempotency gate: once onboarding is complete, this endpoint must not
    // burn another credit or send another SMS. Returns success so a retried
    // tab/double-tap flows through to the wizard's "complete" UI.
    if (laundromat.onboarding_completed_at !== null) {
      return NextResponse.json({ success: true, alreadyCompleted: true });
    }

    // Per-laundromat hourly rate limit.
    const { allowed, resetAt } = checkRateLimit(
      `test-sms:${laundromat.id}`,
      TEST_SMS_HOURLY_LIMIT,
      TEST_SMS_WINDOW_MS
    );
    if (!allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: 'Too many test SMS attempts. Please wait an hour and try again.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    let consumedCreditType: 'free' | 'paid' | null;
    try {
      consumedCreditType = await checkAndConsumeCredit(supabase, laundromat.id);
    } catch (creditError) {
      console.error('[Onboarding Test SMS] credit check failed:', creditError);
      return NextResponse.json({ error: 'Could not check SMS credits' }, { status: 500 });
    }

    if (!consumedCreditType) {
      return NextResponse.json(
        {
          error:
            "You've used all your SMS credits. Free credits reset on the 1st of next month, or top up from the dashboard.",
        },
        { status: 402 }
      );
    }

    const message = renderSmsTemplate(
      laundromat.sms_completion_template,
      DEFAULT_COMPLETION_TEMPLATE,
      {
        shop_name: laundromat.name,
        customer_name: 'Test',
        job_id: 'test',
      },
    );

    const phoneLocal = normalizeToLocal(parsed.data.phone);
    const smsResult = await sendSms(phoneLocal, message);

    if (!smsResult.success) {
      try {
        await refundCredit(supabase, laundromat.id, consumedCreditType);
      } catch (refundError) {
        console.error('[CREDIT LEAK] Onboarding test SMS refund failed:', refundError);
      }
      console.error('[Onboarding Test SMS] send failed:', smsResult.error);
      return NextResponse.json(
        { error: 'Could not send test SMS. Please try again.' },
        { status: 502 }
      );
    }

    // Mark onboarding complete. Uses supabaseAdmin because the
    // protect_lifecycle_columns trigger blocks authenticated-client writes to
    // onboarding_completed_at (so users can't skip the wizard via the JS client).
    // We intentionally skip sms_logs (the table requires a real job_id) — the
    // credit decrement + onboarding_completed_at stamp are sufficient activation signal.
    const { error: updateError } = await supabaseAdmin
      .from('laundromats')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', laundromat.id);

    if (updateError) {
      // SMS already went out — log but don't block the user from finishing.
      console.error('[Onboarding Test SMS] onboarding stamp failed:', updateError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Onboarding Test SMS] unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
