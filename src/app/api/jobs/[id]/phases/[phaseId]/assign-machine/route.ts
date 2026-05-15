import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { machineTypeMatches } from '@/lib/jobs/phases';
import type { MachineType, ServicePhaseConfigEntry } from '@/types/database';

// Pre-assign (or unassign) a machine on a pending phase. Soft preference —
// the machine isn't reserved (idx_job_phases_machine_unique_active only
// applies to in_progress phases), but the row records intent so Start
// becomes a 1-tap action when the operator is ready.
const assignMachineSchema = z.object({
  machine_id: z.string().uuid('Invalid machine ID').nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const { id: jobId, phaseId } = await params;
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = assignMachineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { data: phase, error: phaseError } = await supabase
      .from('job_phases')
      .select('id, job_id, phase_type, status, laundromat_id')
      .eq('id', phaseId)
      .eq('job_id', jobId)
      .eq('laundromat_id', laundromat.id)
      .single();

    if (phaseError || !phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    if (phase.status !== 'pending') {
      return NextResponse.json(
        { error: `Phase is ${phase.status}, can only pre-assign a pending phase` },
        { status: 409 }
      );
    }

    const { machine_id: requestedId } = parsed.data;

    // Unassign path
    if (requestedId === null) {
      const { data: updated, error: updateError } = await supabase
        .from('job_phases')
        .update({ machine_id: null })
        .eq('id', phaseId)
        .eq('status', 'pending')
        .select('id, machine_id, status')
        .single();

      if (updateError || !updated) {
        console.error('[Assign Machine] Unassign failed:', updateError);
        return NextResponse.json(
          { error: updateError?.message || 'Failed to unassign machine' },
          { status: 500 }
        );
      }
      return NextResponse.json({ phase: { ...updated, machine: null } });
    }

    // Assign path — validate machine
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('id, label, machine_type')
      .eq('id', requestedId)
      .eq('laundromat_id', laundromat.id)
      .eq('status', 'active')
      .single();

    if (machineError || !machine) {
      return NextResponse.json({ error: 'Machine not found or not active' }, { status: 404 });
    }

    const phaseConfig = (laundromat.service_phase_config ?? {}) as Record<string, ServicePhaseConfigEntry>;
    const requiredType = phaseConfig[phase.phase_type]?.machine_type ?? null;

    if (!machineTypeMatches(machine.machine_type as MachineType, requiredType)) {
      return NextResponse.json(
        { error: `This machine is a ${machine.machine_type} but the phase (${phase.phase_type}) requires a ${requiredType}.` },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('job_phases')
      .update({ machine_id: machine.id })
      .eq('id', phaseId)
      .eq('status', 'pending')
      .select('id, machine_id, status')
      .single();

    if (updateError || !updated) {
      console.error('[Assign Machine] Update failed:', updateError);
      return NextResponse.json(
        { error: updateError?.message || 'Failed to assign machine' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      phase: {
        ...updated,
        machine: { id: machine.id, label: machine.label, machine_type: machine.machine_type },
      },
    });
  } catch (err) {
    console.error('[Assign Machine] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
