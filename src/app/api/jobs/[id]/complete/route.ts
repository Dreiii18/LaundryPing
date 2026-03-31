import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { decryptPhone } from '@/lib/utils/encryption';
import { normalizeToLocal } from '@/lib/utils/phone';
import { sendSms } from '@/lib/sms/provider';
import { buildLaundryDoneMessage } from '@/lib/sms/templates';
import { checkAndConsumeCredit, refundCredit } from '@/lib/sms/quota';

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

    // Check job is still pending or in progress
    if (!['pending', 'in_progress'].includes(job.status)) {
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
      const { error: paymentError } = await supabase
        .from('jobs')
        .update({ payment_method: paymentMethod, is_paid: true })
        .eq('id', id);

      if (paymentError) {
        console.error('Payment update failed:', paymentError);
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
      }
    }

    // Early exit: no SMS notification or no phone number
    if (!job.notify_sms || !job.customer_phone_encrypted) {
      const { error: noSmsUpdateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: false,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .in('status', ['pending', 'in_progress']);

      if (noSmsUpdateError) {
        console.error('Job completion update failed (no-SMS path):', noSmsUpdateError);
      }

      return NextResponse.json({
        message: 'Job completed.',
        toastType: 'success',
        smsSent: false,
      });
    }

    // Idempotency check: see if SMS was already sent for this job.
    // This runs BEFORE credit consumption to avoid double-charging.
    const { data: existingSmsLog } = await supabase
      .from('sms_logs')
      .select('id, status')
      .eq('job_id', id)
      .single();

    if (existingSmsLog) {
      // Already processed -- mark job complete if not already and return
      const { error: idempotentUpdateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: existingSmsLog.status === 'sent',
        })
        .eq('id', id)
        .in('status', ['pending', 'in_progress']);

      if (idempotentUpdateError) {
        console.error('Job completion update failed (idempotency path):', idempotentUpdateError);
      }

      return NextResponse.json({
        message: 'Already processed',
        toastType: existingSmsLog.status === 'sent' ? 'success' : 'error',
        smsSent: existingSmsLog.status === 'sent',
      });
    }

    // Atomically check and consume one SMS credit
    // (billing cycle reset is handled atomically inside check_and_consume_sms_credit)
    let consumedCreditType: 'free' | 'paid' | null;
    try {
      consumedCreditType = await checkAndConsumeCredit(supabase, laundromat.id);
    } catch (creditError) {
      console.error('[SMS] Credit check RPC failed for job:', id, creditError);
      consumedCreditType = null;
    }

    if (!consumedCreditType) {
      // No credits -- complete the job but skip SMS
      const { error: noCreditsUpdateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: false,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .in('status', ['pending', 'in_progress']);

      if (noCreditsUpdateError) {
        console.error('Job completion update failed (no-credits path):', noCreditsUpdateError);
      }

      return NextResponse.json({
        message: 'No SMS credits remaining. Please inform the customer manually.',
        toastType: 'warning',
        smsSent: false,
        quotaExhausted: true,
      });
    }

    // Credit available -- decrypt phone and send SMS
    let phoneNumber: string;
    try {
      if (!job.customer_phone_encrypted) {
        throw new Error('Phone number missing after guard check');
      }
      const decryptedPhone = decryptPhone(job.customer_phone_encrypted);
      phoneNumber = normalizeToLocal(decryptedPhone);
    } catch (decryptError) {
      // Decryption failed -- key mismatch, corrupted data, or missing phone
      // Refund credit back since we won't send
      try {
        await refundCredit(supabase, laundromat.id, consumedCreditType!);
      } catch (refundError) {
        console.error('[CREDIT LEAK] Refund failed after decrypt error for job:', id, refundError);
      }

      // Complete the job without SMS
      const { error: decryptUpdateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: false,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .in('status', ['pending', 'in_progress']);

      if (decryptUpdateError) {
        console.error('Job completion update failed (decrypt-error path):', decryptUpdateError);
      }

      console.error('[SMS] Phone decryption failed for job:', id, decryptError);

      return NextResponse.json({
        message: 'Unable to send SMS. Please inform the customer manually.',
        toastType: 'error',
        smsSent: false,
      });
    }

    // Build message and send SMS
    const message = buildLaundryDoneMessage(laundromat.name, job.customer_name);
    const smsResult = await sendSms(phoneNumber, message);

    if (smsResult.success) {
      // SMS sent successfully
      // Insert sms_logs; unique constraint violation (23505) means idempotent duplicate -- ignore it
      const { error: logError } = await supabase
        .from('sms_logs')
        .insert({
          job_id: id,
          laundromat_id: laundromat.id,
          provider: smsResult.provider,
          status: 'sent',
          provider_message_id: smsResult.messageId || null,
          provider_response: smsResult.rawResponse as unknown as Record<string, unknown> || null,
        });

      if (logError && !logError.code?.includes('23505')) {
        console.error('SMS log insert failed (non-idempotency):', logError);
      }

      // Update job as completed with SMS sent
      const { error: successUpdateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: true,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .in('status', ['pending', 'in_progress']);

      if (successUpdateError) {
        // SMS was already sent -- log for ops but don't fail the response
        console.error('Job completion update failed (SMS-sent path):', successUpdateError);
      }

      return NextResponse.json({
        message: 'SMS sent to customer.',
        toastType: 'success',
        smsSent: true,
      });
    } else {
      // SMS sending failed -- refund credit back
      try {
        await refundCredit(supabase, laundromat.id, consumedCreditType!);
      } catch (refundError) {
        console.error('[CREDIT LEAK] Refund failed after SMS failure for job:', id, refundError);
      }

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
      const { error: smsFailUpdateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sms_sent: false,
          ...(overdueReason && { overdue_reason: overdueReason }),
        })
        .eq('id', id)
        .in('status', ['pending', 'in_progress']);

      if (smsFailUpdateError) {
        console.error('Job completion update failed (SMS-failed path):', smsFailUpdateError);
      }

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
