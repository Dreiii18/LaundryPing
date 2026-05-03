import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { isValidPhNumber, normalizeToLocal, maskPhone } from '@/lib/utils/phone';
import { encryptPhone, decryptPhone } from '@/lib/utils/encryption';
import { sanitizeNotes, sanitizeCustomerName } from '@/lib/utils/sanitize';
import { sendSms } from '@/lib/sms/provider';
import { renderSmsTemplate, DEFAULT_QUEUE_TEMPLATE } from '@/lib/sms/templates';
import { checkAndConsumeCredit, refundCredit } from '@/lib/sms/quota';
import { buildPhaseRecords, machineTypeMatches } from '@/lib/jobs/phases';
import type { MachineType, ServicePhaseConfigEntry } from '@/types/database';

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
  service_quantities: z.record(z.string(), z.number().int().min(1).max(10)).optional(),
  service_weights_actual: z.record(z.string(), z.number().min(0).max(9999)).optional(),
  total_weight: z.number().min(0).max(99999).optional(),
  notify_queue_sms: z.boolean().optional(),
  priority: z.enum(['normal', 'rush']).optional(),
}).refine(
  (data) => !data.is_paid || data.payment_method !== undefined,
  { message: 'Payment method is required when paid', path: ['payment_method'] }
).refine(
  (data) => !data.service_quantities || Object.keys(data.service_quantities).every(k => data.services.includes(k)),
  { message: 'service_quantities keys must be a subset of services', path: ['service_quantities'] }
).refine(
  (data) => !data.service_weights_actual || Object.keys(data.service_weights_actual).every(k => data.services.includes(k)),
  { message: 'service_weights_actual keys must be a subset of services', path: ['service_weights_actual'] }
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

    // Get jobs started today (PH timezone) OR still pending/in_progress/ready_for_pickup
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
        service_quantities,
        service_weights_actual,
        total_weight,
        claim_number,
        customer_name,
        created_at,
        priority,
        machines (
          id,
          label,
          machine_type
        ),
        job_phases (
          id,
          phase_type,
          machine_id,
          sequence,
          status,
          started_at,
          completed_at,
          estimated_minutes,
          machines (
            id,
            label,
            machine_type
          )
        )
      `)
      .eq('laundromat_id', laundromat.id)
      .or(`started_at.gte.${todayPH}T00:00:00+08:00,status.eq.in_progress,status.eq.pending,status.eq.ready_for_pickup`)
      .order('started_at', { ascending: false });

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Never send encrypted phone to client -- only masked.
    // Supabase types nested relations as arrays even for many-to-one joins;
    // we tolerate both shapes.
    type JoinedMachine = { id: string; label: string; machine_type: string };
    type JoinedPhase = {
      id: string;
      phase_type: string;
      machine_id: string | null;
      sequence: number;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      estimated_minutes: number | null;
      machines: JoinedMachine | JoinedMachine[] | null;
    };
    const pickOne = <T,>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? (v[0] ?? null) : v;

    const safeJobs = (jobs || []).map((job) => {
      const phases = ((job.job_phases ?? []) as unknown as JoinedPhase[])
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((p) => ({
          id: p.id,
          phase_type: p.phase_type,
          machine_id: p.machine_id,
          sequence: p.sequence,
          status: p.status,
          started_at: p.started_at,
          completed_at: p.completed_at,
          estimated_minutes: p.estimated_minutes,
          machine: pickOne(p.machines),
        }));

      return {
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
        service_quantities: job.service_quantities as Record<string, number> | null,
        service_weights_actual: job.service_weights_actual as Record<string, number> | null,
        total_weight: job.total_weight as number | null,
        claim_number: job.claim_number,
        customer_name: job.customer_name,
        created_at: job.created_at,
        priority: job.priority,
        machine: job.machines,
        phases,
      };
    });

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
    let machine: { id: string; label: string; machine_type: MachineType } | null = null;

    if (machine_id) {
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('id, label, machine_type')
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

      // Check if machine is currently in an in_progress phase
      const { data: activePhases } = await supabase
        .from('job_phases')
        .select('id')
        .eq('machine_id', machine_id)
        .eq('status', 'in_progress')
        .limit(1);

      if (activePhases && activePhases.length > 0) {
        return NextResponse.json(
          { error: 'This machine is currently in use' },
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
      service_quantities: parsed.data.service_quantities ?? null,
      service_weights_actual: parsed.data.service_weights_actual ?? null,
      total_weight: parsed.data.total_weight ?? null,
      customer_name: sanitizedCustomerName,
      notify_queue_sms: notifyQueueSms,
      priority,
    };

    const selectFields = `
      id, laundromat_id, machine_id, customer_phone_masked, notes,
      status, started_at, completed_at, sms_sent, notify_sms,
      payment_method, pay_amount, cash_tendered, is_paid, services,
      service_quantities, service_weights_actual, total_weight, claim_number, customer_name, created_at, priority
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

    // Expand services into phase rows. The trg_sync_job_from_phases trigger
    // will keep jobs.status / jobs.machine_id in sync as phases activate/complete.
    const phaseConfig = (laundromat.service_phase_config ?? {}) as Record<string, ServicePhaseConfigEntry>;
    const phaseRecords = buildPhaseRecords({
      jobId: job.id,
      laundromatId: laundromat.id,
      services: parsed.data.services,
      phaseConfig,
    });

    // If a machine was supplied, validate type compatibility with the first phase
    // and start that phase immediately.
    if (machine && phaseRecords.length > 0) {
      const firstPhase = phaseRecords[0];
      const requiredType = (phaseConfig[firstPhase.phase_type] ?? { machine_type: 'combo' as MachineType | null }).machine_type;
      if (!machineTypeMatches(machine.machine_type, requiredType)) {
        // Roll back the job to keep state consistent
        await supabase.from('jobs').delete().eq('id', job.id);
        return NextResponse.json(
          {
            error: `Selected machine is a ${machine.machine_type} but the first phase (${firstPhase.phase_type}) requires a ${requiredType}.`,
          },
          { status: 400 }
        );
      }
      firstPhase.machine_id = machine.id;
      firstPhase.status = 'in_progress';
      firstPhase.started_at = new Date().toISOString();
    }

    if (phaseRecords.length > 0) {
      const { error: phasesError } = await supabase.from('job_phases').insert(phaseRecords);
      if (phasesError) {
        console.error('Phase insert failed:', phasesError);
        await supabase.from('jobs').delete().eq('id', job.id);
        return NextResponse.json({ error: 'Failed to create job phases' }, { status: 500 });
      }
    } else {
      // All services are administrative (is_phase=false) — no operational work needed.
      // Skip straight to ready_for_pickup, and clear the inherited machine_id so
      // jobs.machine_id never points at a machine that has no associated phase row.
      await supabase
        .from('jobs')
        .update({ status: 'ready_for_pickup', machine_id: null })
        .eq('id', job.id);
      job.status = 'ready_for_pickup';
      job.machine_id = null;
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
            const message = renderSmsTemplate(
              laundromat.sms_queue_template,
              DEFAULT_QUEUE_TEMPLATE,
              {
                shop_name: laundromat.name,
                customer_name: sanitizedCustomerName ?? '',
                job_id: job.id.slice(0, 8),
              },
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
