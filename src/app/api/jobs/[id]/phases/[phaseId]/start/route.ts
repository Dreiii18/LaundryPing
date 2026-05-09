import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { machineTypeMatches } from '@/lib/jobs/phases';
import type { MachineType, ServicePhaseConfigEntry } from '@/types/database';

// machine_id is optional. If omitted, the route falls back to the phase's
// pre-assigned machine_id (from POST /api/jobs phase_assignments or
// /assign-machine endpoint). If neither has one and the phase requires a
// machine, the route returns 400.
const startPhaseSchema = z.object({
  machine_id: z.string().uuid('Invalid machine ID').optional(),
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
    const parsed = startPhaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    // Fetch the phase + verify ownership via job. Read machine_id so we can
    // fall back to a pre-assigned machine when the body omits one (1-tap start).
    const { data: phase, error: phaseError } = await supabase
      .from('job_phases')
      .select('id, job_id, phase_type, status, sequence, laundromat_id, machine_id')
      .eq('id', phaseId)
      .eq('job_id', jobId)
      .eq('laundromat_id', laundromat.id)
      .single();

    if (phaseError || !phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    if (phase.status !== 'pending') {
      return NextResponse.json(
        { error: `Phase is ${phase.status}, can only start a pending phase` },
        { status: 409 }
      );
    }

    const phaseConfig = (laundromat.service_phase_config ?? {}) as Record<string, ServicePhaseConfigEntry>;
    const requiredType = phaseConfig[phase.phase_type]?.machine_type ?? null;

    // Resolve which machine to use: explicit body wins, then fall back to the
    // phase's pre-assigned machine. This is what makes 1-tap start possible:
    // the UI calls this endpoint with no body when the phase already has a
    // machine_id, and the server uses the stored value.
    const targetMachineId = parsed.data.machine_id ?? phase.machine_id;

    let machine: { id: string; label: string; machine_type: MachineType } | null = null;
    if (targetMachineId) {
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('id, label, machine_type')
        .eq('id', targetMachineId)
        .eq('laundromat_id', laundromat.id)
        .eq('status', 'active')
        .single();

      if (machineError || !machineData) {
        return NextResponse.json({ error: 'Machine not found or not active' }, { status: 404 });
      }

      machine = machineData;

      if (!machineTypeMatches(machine.machine_type, requiredType)) {
        return NextResponse.json(
          { error: `This machine is a ${machine.machine_type} but the phase (${phase.phase_type}) requires a ${requiredType}.` },
          { status: 400 }
        );
      }
    } else if (requiredType !== null) {
      return NextResponse.json(
        { error: `Phase ${phase.phase_type} requires a ${requiredType} machine.` },
        { status: 400 }
      );
    }

    // Activate the phase. The unique partial index on (machine_id WHERE status='in_progress')
    // makes "two phases on one machine" a 23505 error; surface as 409.
    const { data: updated, error: updateError } = await supabase
      .from('job_phases')
      .update({
        machine_id: machine?.id ?? null,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', phaseId)
      .eq('status', 'pending')
      .select('id, machine_id, status, started_at')
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'Machine just got taken by another job — try a different machine.' },
          { status: 409 }
        );
      }
      console.error('[Start Phase] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to start phase' }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Phase was modified concurrently' }, { status: 409 });
    }

    return NextResponse.json({
      phase: {
        ...updated,
        machine: machine
          ? { id: machine.id, label: machine.label, machine_type: machine.machine_type }
          : null,
      },
    });
  } catch (err) {
    console.error('[Start Phase] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
