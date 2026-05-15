import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

export async function DELETE(
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

    if (phase.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete a pending phase' },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from('job_phases')
      .delete()
      .eq('id', phaseId)
      .eq('status', 'pending');

    if (deleteError) {
      console.error('[Delete Phase] Failed:', deleteError);
      return NextResponse.json({ error: 'Failed to delete phase' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Phase deleted' });
  } catch (err) {
    console.error('[Delete Phase] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
