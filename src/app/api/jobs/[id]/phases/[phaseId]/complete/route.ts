import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

export async function POST(
  _request: Request,
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

    const { data: phase, error: phaseError } = await supabase
      .from('job_phases')
      .select('id, status')
      .eq('id', phaseId)
      .eq('job_id', jobId)
      .eq('laundromat_id', laundromat.id)
      .single();

    if (phaseError || !phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    if (phase.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Phase is ${phase.status}, can only complete an in_progress phase` },
        { status: 409 }
      );
    }

    // Complete the phase. Trigger frees the machine and (if this was the last
    // open phase) flips the job to ready_for_pickup.
    const { data: updated, error: updateError } = await supabase
      .from('job_phases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', phaseId)
      .eq('status', 'in_progress')
      .select('id, status, completed_at, machine_id')
      .single();

    if (updateError || !updated) {
      console.error('[Complete Phase] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to complete phase' }, { status: 500 });
    }

    return NextResponse.json({ phase: updated });
  } catch (err) {
    console.error('[Complete Phase] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
