import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

export async function POST(
  _request: Request,
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

    // Only pending, in_progress, or ready_for_pickup jobs can be cancelled
    if (!['pending', 'in_progress', 'ready_for_pickup'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Job is already completed or cancelled', toastType: 'warning' },
        { status: 409 }
      );
    }

    // Skip any open phases first so machines free up. Do this BEFORE setting
    // jobs.status = 'cancelled' — once the job is cancelled, the trigger ignores
    // phase mutations (terminal status).
    const { error: skipPhasesError } = await supabase
      .from('job_phases')
      .update({ status: 'skipped', completed_at: new Date().toISOString() })
      .eq('job_id', id)
      .in('status', ['pending', 'in_progress']);

    if (skipPhasesError) {
      // Fail loud: lingering in_progress phase rows would permanently lock
      // their machines (unique partial index + busy-machine queries) with no
      // in-app recovery. The update is idempotent, so a retry is safe.
      console.error('[Cancel Job] Phase skip failed:', skipPhasesError);
      return NextResponse.json(
        { error: 'Failed to free machines, please retry' },
        { status: 500 }
      );
    }

    // Cancel the job -- no SMS sent
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .in('status', ['pending', 'in_progress', 'ready_for_pickup']);

    if (updateError) {
      console.error('[Cancel Job] Update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Job cancelled.', toastType: 'success' });
  } catch (err) {
    console.error('[Cancel Job] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
