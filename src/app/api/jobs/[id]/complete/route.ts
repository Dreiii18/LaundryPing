import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { decryptPhone } from '@/lib/utils/encryption';
import { normalizeToLocal } from '@/lib/utils/phone';
import { sendSms } from '@/lib/sms/provider';
import { buildLaundryDoneMessage } from '@/lib/sms/templates';
import { ensureBillingCycle, checkAndIncrementQuota, decrementQuota } from '@/lib/sms/quota';

const completeJobSchema = z.object({
  payment_method: z.enum(['cash', 'ewallet', 'card', 'bank_transfer']).optional(),
  overdue_reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    // Fetch the job and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('laundromat_id', laundromat.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check job is still in progress
    if (job.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Job already completed', toastType: 'warning' },
        { status: 409 }
      );
    }

    // Parse optional payment_method and overdue_reason from request body
    let paymentMethod: string | undefined;
    let overdueReason: string | undefined;
    try {
      const body = await request.json();
      const parsed = completeJobSchema.safeParse(body);
      if (parsed.success) {
        paymentMethod = parsed.data.payment_method;
        overdueReason = parsed.data.overdue_reason;
      }
    } catch {
      // No body or invalid JSON — that's fine for already-paid jobs
    }

    // If the job was not paid at creation, require payment_method now
    if (!job.is_paid && !job.payment_method && !paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required for unpaid jobs' },
        { status: 400 }
      );
    }

    // Update payment info if provided for pay-later jobs
    if (!job.is_paid && paymentMethod) {
      await supabase
        .from('jobs')
        .update({ payment_method: paymentMethod, is_paid: true })
        .eq('id', id);
    }

    // Early exit: no plan, no SMS notification, or no phone number
    const hasPlan = (laundromat as Record<string, unknown>).sms_plan_id !== null &&
                    (laundromat as Record<string, unknown>).sms_plan_id !== undefined;

    if (!hasPlan || !job.notify_sms || !job.customer_phone_encrypted) {
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: false,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .eq('status', 'in_progress');

      return NextResponse.json({
        message: 'Job completed.',
        toastType: 'success',
        smsSent: false,
      });
    }

    // Idempotency check: see if SMS was already sent for this job
    const { data: existingSmsLog } = await supabase
      .from('sms_logs')
      .select('id, status')
      .eq('job_id', id)
      .single();

    if (existingSmsLog) {
      // Already processed -- mark job complete if not already and return
      if (job.status === 'in_progress') {
        await supabase
          .from('jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            sms_sent: existingSmsLog.status === 'sent',
          })
          .eq('id', id);
      }
      return NextResponse.json({
        message: 'Already processed',
        toastType: existingSmsLog.status === 'sent' ? 'success' : 'error',
        smsSent: existingSmsLog.status === 'sent',
      });
    }

    // Ensure billing cycle is current (lazy reset)
    await ensureBillingCycle(supabase, laundromat.id);

    // Atomically check and increment SMS quota
    const quotaAvailable = await checkAndIncrementQuota(supabase, laundromat.id);

    if (!quotaAvailable) {
      // Quota exhausted -- complete the job but skip SMS
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: false,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .eq('status', 'in_progress');

      // Refetch updated quota for display
      const { data: updatedLaundromat } = await supabase
        .from('laundromats')
        .select('sms_used_this_month, sms_limit')
        .eq('id', laundromat.id)
        .single();

      return NextResponse.json({
        message: `SMS limit reached (${updatedLaundromat?.sms_used_this_month ?? '?'}/${updatedLaundromat?.sms_limit ?? 0}). Please inform the customer manually.`,
        toastType: 'warning',
        smsSent: false,
        quotaExhausted: true,
      });
    }

    // Quota available -- decrypt phone and send SMS
    let phoneNumber: string;
    try {
      const decryptedPhone = decryptPhone(job.customer_phone_encrypted);
      phoneNumber = normalizeToLocal(decryptedPhone);
    } catch (decryptError) {
      // Decryption failed -- key mismatch or corrupted data
      // Decrement quota back since we won't send
      await decrementQuota(supabase, laundromat.id);

      // Complete the job without SMS
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: false,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .eq('status', 'in_progress');

      console.error('[SMS] Phone decryption failed for job:', id, decryptError);

      return NextResponse.json({
        message: 'Unable to send SMS. Please inform the customer manually.',
        toastType: 'error',
        smsSent: false,
      });
    }

    // Build message and send SMS
    const message = buildLaundryDoneMessage(laundromat.name);
    const smsResult = await sendSms(phoneNumber, message);

    if (smsResult.success) {
      // SMS sent successfully
      // Insert sms_logs (may fail on unique constraint for idempotency -- that's ok)
      await supabase
        .from('sms_logs')
        .insert({
          job_id: id,
          laundromat_id: laundromat.id,
          provider: smsResult.provider,
          status: 'sent',
          provider_message_id: smsResult.messageId || null,
          provider_response: smsResult.rawResponse as unknown as Record<string, unknown> || null,
        });

      // Update job as completed with SMS sent
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: true,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .eq('status', 'in_progress');

      return NextResponse.json({
        message: 'SMS sent to customer.',
        toastType: 'success',
        smsSent: true,
      });
    } else {
      // SMS sending failed -- decrement quota back
      await decrementQuota(supabase, laundromat.id);

      // Log the failure
      await supabase
        .from('sms_logs')
        .insert({
          job_id: id,
          laundromat_id: laundromat.id,
          provider: smsResult.provider,
          status: 'failed',
          provider_response: { error: smsResult.error } as unknown as Record<string, unknown>,
        });

      // Complete the job without SMS
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: false,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .eq('status', 'in_progress');

      console.error('[SMS] Send failed for job:', id, smsResult.error);

      return NextResponse.json({
        message: 'SMS delivery failed. Please inform the customer manually.',
        toastType: 'error',
        smsSent: false,
      });
    }
  } catch (err) {
    console.error('[Complete Job] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
