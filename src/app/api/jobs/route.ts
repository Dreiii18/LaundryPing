import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { isValidPhNumber, normalizeToLocal, maskPhone } from '@/lib/utils/phone';
import { encryptPhone, decryptPhone } from '@/lib/utils/encryption';
import { sanitizeNotes, sanitizeCustomerName } from '@/lib/utils/sanitize';
import { sendSms } from '@/lib/sms/provider';
import { buildQueueNotificationMessage } from '@/lib/sms/templates';
import { checkAndConsumeCredit, refundCredit } from '@/lib/sms/quota';

const PAYMENT_METHODS = ['cash', 'ewallet', 'card', 'bank_transfer'] as const;

const createJobSchema = z.object({
  machine_id: z.string().uuid('Invalid machine ID').optional(),
  phone: z.string().refine(
    (val) => isValidPhNumber(val),
    { message: 'Please enter a valid Philippine mobile number (e.g., 09171234567)' }
  ).optional(),
  notify_sms: z.boolean().optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  customer_name: z.string().max(60, 'Customer name must be 60 characters or less').optional(),
  is_paid: z.boolean(),
  pay_amount: z.number().min(0, 'Amount must be 0 or more'),
  cash_tendered: z.number().min(0).optional(),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
  services: z.array(z.string().min(1).max(50)).min(1, 'At least one service is required').max(10),
  notify_queue_sms: z.boolean().optional(),
  priority: z.enum(['normal', 'rush']).optional(),
}).refine(
  (data) => !data.is_paid || data.payment_method !== undefined,
  { message: 'Payment method is required when paid', path: ['payment_method'] }
);

export async function GET() {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    // Get today's date in PH timezone (Asia/Manila is UTC+8)
    const now = new Date();
    const phFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayPH = phFormatter.format(now); // YYYY-MM-DD format

    // Get jobs started today (PH timezone) OR still in_progress (overdue)
    const { data: jobs, error: queryError } = await supabase
      .from('jobs')
      .select(`
        id,
        laundromat_id,
        machine_id,
        customer_phone_masked,
        notes,
        status,
        started_at,
        completed_at,
        sms_sent,
        notify_sms,
        notify_queue_sms,
        payment_method,
        pay_amount,
        cash_tendered,
        is_paid,
        services,
        claim_number,
        customer_name,
        created_at,
        priority,
        machines (
          id,
          label
        )
      `)
      .eq('laundromat_id', laundromat.id)
      .or(`started_at.gte.${todayPH}T00:00:00+08:00,status.eq.in_progress,status.eq.pending`)
      .order('started_at', { ascending: false });

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Never send encrypted phone to client -- only masked
    const safeJobs = (jobs || []).map((job) => ({
      id: job.id,
      laundromat_id: job.laundromat_id,
      machine_id: job.machine_id,
      customer_phone_masked: job.customer_phone_masked,
      notes: job.notes,
      status: job.status,
      started_at: job.started_at,
      completed_at: job.completed_at,
      sms_sent: job.sms_sent,
      notify_sms: job.notify_sms,
      notify_queue_sms: job.notify_queue_sms,
      payment_method: job.payment_method,
      pay_amount: job.pay_amount,
      cash_tendered: job.cash_tendered,
      is_paid: job.is_paid,
      services: job.services,
      claim_number: job.claim_number,
      customer_name: job.customer_name,
      created_at: job.created_at,
      priority: job.priority,
      machine: job.machines,
    }));

    return NextResponse.json({ jobs: safeJobs });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { machine_id, phone, notes, customer_name, is_paid, pay_amount, cash_tendered, payment_method } = parsed.data;

    const notifySms = parsed.data.notify_sms ?? true;
    const notifyQueueSms = parsed.data.notify_queue_sms ?? false;
    const priority = parsed.data.priority ?? 'normal';

    // If notify_sms is true, phone is required
    if (notifySms && !phone) {
      return NextResponse.json(
        { error: 'Phone number is required when SMS notification is enabled' },
        { status: 400 }
      );
    }

    // Validate machine if provided
    let machine: { id: string; label: string } | null = null;

    if (machine_id) {
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('*')
        .eq('id', machine_id)
        .eq('laundromat_id', laundromat.id)
        .eq('status', 'active')
        .single();

      if (machineError || !machineData) {
        return NextResponse.json(
          { error: 'Machine not found or not active' },
          { status: 404 }
        );
      }

      machine = machineData;

      // Check if machine already has an active job
      const { data: activeJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('machine_id', machine_id)
        .in('status', ['pending', 'in_progress'])
        .limit(1);

      if (activeJobs && activeJobs.length > 0) {
        return NextResponse.json(
          { error: 'This machine already has an active job' },
          { status: 409 }
        );
      }
    }

    // Check laundromat-wide active job cap
    const { count: activeJobCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('laundromat_id', laundromat.id)
      .in('status', ['pending', 'in_progress']);

    const { count: machineCount } = await supabase
      .from('machines')
      .select('id', { count: 'exact', head: true })
      .eq('laundromat_id', laundromat.id)
      .eq('status', 'active');

    const maxActiveJobs = Math.max(20, (machineCount ?? 0) * 2);

    if ((activeJobCount ?? 0) >= maxActiveJobs) {
      return NextResponse.json(
        { error: `Too many active jobs. Maximum ${maxActiveJobs} concurrent jobs allowed.` },
        { status: 409 }
      );
    }

    // Process phone number if provided and SMS is enabled
    let encryptedPhone: string | null = null;
    let maskedPhone: string | null = null;

    if (notifySms && phone) {
      const normalizedPhone = normalizeToLocal(phone);
      encryptedPhone = encryptPhone(normalizedPhone);
      maskedPhone = maskPhone(normalizedPhone);
    }

    // Sanitize notes and customer name
    const sanitizedNotes = notes ? sanitizeNotes(notes) : null;
    const sanitizedCustomerName = customer_name ? sanitizeCustomerName(customer_name) : null;

    // Generate claim number and insert job.
    // The RPC's advisory lock is transaction-scoped and released before INSERT,
    // so a concurrent request can get the same number. We retry once on unique
    // constraint violation (23505) to handle this race.
    const jobPayload = {
      laundromat_id: laundromat.id,
      machine_id: machine_id || null,
      customer_phone_encrypted: encryptedPhone,
      customer_phone_masked: maskedPhone,
      notes: sanitizedNotes,
      status: machine_id ? ('in_progress' as const) : ('pending' as const),
      notify_sms: notifySms,
      is_paid,
      pay_amount,
      cash_tendered: cash_tendered ?? null,
      payment_method: payment_method ?? null,
      services: parsed.data.services,
      customer_name: sanitizedCustomerName,
      notify_queue_sms: notifyQueueSms,
      priority,
    };

    const selectFields = `
      id, laundromat_id, machine_id, customer_phone_masked, notes,
      status, started_at, completed_at, sms_sent, notify_sms,
      payment_method, pay_amount, cash_tendered, is_paid, services,
      claim_number, customer_name, created_at, priority
    `;

    const insertWithClaimNumber = async (attempt: number) => {
      const { data: claimNumber, error: claimError } = await supabase
        .rpc('generate_claim_number', { p_laundromat_id: laundromat.id });

      if (claimError) {
        console.error('Claim number generation failed:', claimError);
        return { job: null, error: claimError };
      }

      const { data: job, error: insertError } = await supabase
        .from('jobs')
        .insert({ ...jobPayload, claim_number: claimNumber })
        .select(selectFields)
        .single();

      // Retry once on unique constraint violation (claim_number race)
      if (insertError?.code === '23505' && attempt === 0) {
        return insertWithClaimNumber(1);
      }

      return { job, error: insertError };
    };

    const { job, error: insertError } = await insertWithClaimNumber(0);

    if (insertError || !job) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // Queue SMS: send notification if job is queued, queue SMS enabled, and phone exists
    let queueSmsSent = false;
    let queueSmsSkipReason: string | null = null;

    if (job.status === 'pending' && notifyQueueSms && encryptedPhone) {
      try {
        // Idempotency check: see if queue SMS was already sent for this job
        const { data: existingQueueLog } = await supabase
          .from('sms_logs')
          .select('id')
          .eq('job_id', job.id)
          .eq('notification_type', 'queue')
          .single();

        if (existingQueueLog) {
          queueSmsSent = true;
        } else {
        // Consume one SMS credit
        let consumedCreditType: 'free' | 'paid' | null;
        try {
          consumedCreditType = await checkAndConsumeCredit(supabase, laundromat.id);
        } catch {
          consumedCreditType = null;
        }

        if (!consumedCreditType) {
          queueSmsSkipReason = 'no_credits';
        } else {
          // Decrypt phone and send
          try {
            const decryptedPhone = decryptPhone(encryptedPhone);
            const phoneNumber = normalizeToLocal(decryptedPhone);
            const message = buildQueueNotificationMessage(
              laundromat.name,
              sanitizedCustomerName,
            );
            const smsResult = await sendSms(phoneNumber, message);

            if (smsResult.success) {
              queueSmsSent = true;
              // Insert log; ignore 23505 (unique constraint) as idempotency marker
              const { error: logError } = await supabase.from('sms_logs').insert({
                job_id: job.id,
                laundromat_id: laundromat.id,
                provider: smsResult.provider,
                status: 'sent',
                notification_type: 'queue',
                provider_message_id: smsResult.messageId || null,
                provider_response: smsResult.rawResponse as unknown as Record<string, unknown> || null,
              });
              if (logError && !logError.code?.includes('23505')) {
                console.error('Queue SMS log insert failed:', logError);
              }
            } else {
              // SMS failed — refund credit
              try {
                await refundCredit(supabase, laundromat.id, consumedCreditType);
              } catch (refundError) {
                console.error('[CREDIT LEAK] Queue SMS refund failed for job:', job.id, refundError);
              }
              await supabase.from('sms_logs').insert({
                job_id: job.id,
                laundromat_id: laundromat.id,
                provider: smsResult.provider,
                status: 'failed',
                notification_type: 'queue',
                provider_response: { error: smsResult.error } as unknown as Record<string, unknown>,
              });
              queueSmsSkipReason = 'send_failed';
            }
          } catch (decryptError) {
            // Phone decryption failed — refund credit
            try {
              await refundCredit(supabase, laundromat.id, consumedCreditType);
            } catch (refundError) {
              console.error('[CREDIT LEAK] Queue SMS refund failed for job:', job.id, refundError);
            }
            console.error('[Queue SMS] Phone decryption failed for job:', job.id, decryptError);
            queueSmsSkipReason = 'decrypt_failed';
          }
        }
        } // end else (no existing queue log)
      } catch (queueSmsError) {
        console.error('[Queue SMS] Unexpected error for job:', job.id, queueSmsError);
        queueSmsSkipReason = 'unexpected_error';
      }
    }

    return NextResponse.json({
      job: {
        ...job,
        machine: machine ? {
          id: machine.id,
          label: machine.label,
        } : null,
      },
      queueSmsSent,
      ...(queueSmsSkipReason && { queueSmsSkipReason }),
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
