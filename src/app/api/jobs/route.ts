import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { isValidPhNumber, normalizeToLocal, maskPhone } from '@/lib/utils/phone';
import { encryptPhone } from '@/lib/utils/encryption';
import { sanitizeNotes } from '@/lib/utils/sanitize';

const PAYMENT_METHODS = ['cash', 'ewallet', 'card', 'bank_transfer'] as const;

const createJobSchema = z.object({
  machine_id: z.string().uuid('Invalid machine ID').optional(),
  phone: z.string().refine(
    (val) => isValidPhNumber(val),
    { message: 'Please enter a valid Philippine mobile number (e.g., 09171234567)' }
  ).optional(),
  notify_sms: z.boolean().optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  is_paid: z.boolean(),
  pay_amount: z.number().min(0, 'Amount must be 0 or more'),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
  services: z.array(z.string().max(50)).min(1, 'At least one service is required').max(10),
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
        payment_method,
        pay_amount,
        is_paid,
        services,
        created_at,
        machines (
          id,
          label,
          type
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
      payment_method: job.payment_method,
      pay_amount: job.pay_amount,
      is_paid: job.is_paid,
      services: job.services,
      created_at: job.created_at,
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

    const { machine_id, phone, notes, is_paid, pay_amount, payment_method } = parsed.data;

    const notifySms = parsed.data.notify_sms ?? true;

    // If notify_sms is true, phone is required
    if (notifySms && !phone) {
      return NextResponse.json(
        { error: 'Phone number is required when SMS notification is enabled' },
        { status: 400 }
      );
    }

    // Validate machine if provided
    let machine: { id: string; label: string; type: string } | null = null;

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

    // Sanitize notes
    const sanitizedNotes = notes ? sanitizeNotes(notes) : null;

    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        laundromat_id: laundromat.id,
        machine_id: machine_id || null,
        customer_phone_encrypted: encryptedPhone,
        customer_phone_masked: maskedPhone,
        notes: sanitizedNotes,
        status: machine_id ? 'in_progress' : 'pending',
        notify_sms: notifySms,
        is_paid,
        pay_amount,
        payment_method: payment_method ?? null,
        services: parsed.data.services,
      })
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
        payment_method,
        pay_amount,
        is_paid,
        services,
        created_at
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    return NextResponse.json({
      job: {
        ...job,
        machine: machine ? {
          id: machine.id,
          label: machine.label,
          type: machine.type,
        } : null,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
