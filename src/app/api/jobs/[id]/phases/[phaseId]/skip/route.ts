import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { sanitizeNotes } from '@/lib/utils/sanitize';

const skipPhaseSchema = z.object({
  reason: z.string().max(500).optional(),
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

    let reason: string | undefined;
    try {
      const body = await request.json();
      const parsed = skipPhaseSchema.safeParse(body);
      if (parsed.success && parsed.data.reason) {
        reason = sanitizeNotes(parsed.data.reason);
      }
    } catch {
      // Empty body is fine
    }

    const { data: phase, error: phaseError } = await supabase
      .from('job_phases')
      .select('id, status, notes, completed_at')
      .eq('id', phaseId)
      .eq('job_id', jobId)
      .eq('laundromat_id', laundromat.id)
      .single();

    if (phaseError || !phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    // Idempotent: a retry on an already-skipped phase is a no-op.
    if (phase.status === 'skipped') {
      return NextResponse.json({
        phase: { id: phase.id, status: phase.status, completed_at: phase.completed_at },
      });
    }

    if (!['pending', 'in_progress'].includes(phase.status)) {
      return NextResponse.json(
        { error: `Phase is ${phase.status}, cannot skip` },
        { status: 409 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('job_phases')
      .update({
        status: 'skipped',
        completed_at: new Date().toISOString(),
        machine_id: null,
        notes: reason ?? phase.notes,
      })
      .eq('id', phaseId)
      .in('status', ['pending', 'in_progress'])
      .select('id, status, completed_at')
      .single();

    if (updateError || !updated) {
      console.error('[Skip Phase] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to skip phase' }, { status: 500 });
    }

    return NextResponse.json({ phase: updated });
  } catch (err) {
    console.error('[Skip Phase] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
