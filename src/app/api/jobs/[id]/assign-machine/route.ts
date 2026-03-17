import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

const assignMachineSchema = z.object({
  machine_id: z.string().uuid('Invalid machine ID'),
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

    // Only pending or in_progress jobs can have machines assigned
    if (!['pending', 'in_progress'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Cannot assign machine to a completed or cancelled job' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const parsed = assignMachineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { machine_id: newMachineId } = parsed.data;

    // Validate machine exists, belongs to laundromat, and is active
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('id, label')
      .eq('id', newMachineId)
      .eq('laundromat_id', laundromat.id)
      .eq('status', 'active')
      .single();

    if (machineError || !machine) {
      return NextResponse.json(
        { error: 'Machine not found or not active' },
        { status: 404 }
      );
    }

    // Check machine has no active job (excluding this job itself)
    const { data: occupyingJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('machine_id', newMachineId)
      .in('status', ['pending', 'in_progress'])
      .neq('id', id)
      .limit(1);

    if (occupyingJobs && occupyingJobs.length > 0) {
      return NextResponse.json(
        { error: 'This machine already has an active job' },
        { status: 409 }
      );
    }

    // Guard against promoting a job with no services
    if (!job.services || job.services.length === 0) {
      return NextResponse.json(
        { error: 'Cannot assign machine to a job with no services' },
        { status: 409 }
      );
    }

    // Update job: assign machine, transition pending → in_progress
    // Reset started_at so overdue check uses machine assignment time, not creation time
    const updateData: Record<string, string | boolean> = { machine_id: newMachineId };
    if (job.status === 'pending') {
      updateData.status = 'in_progress';
      updateData.started_at = new Date().toISOString();
      updateData.is_overdue = false;
    }

    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .in('status', ['pending', 'in_progress'])
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
        claim_number,
        customer_name,
        created_at
      `)
      .single();

    if (updateError || !updatedJob) {
      return NextResponse.json(
        { error: 'Machine is no longer available' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      job: {
        ...updatedJob,
        machine: {
          id: machine.id,
          label: machine.label,
        },
      },
    });
  } catch (err) {
    console.error('[Assign Machine] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
