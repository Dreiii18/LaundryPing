import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { sanitizeMachineLabel } from '@/lib/utils/sanitize';

const updateMachineSchema = z.object({
  label: z.string().min(1).max(20).optional(),
  type: z.enum(['washer', 'dryer']).optional(),
  status: z.enum(['active', 'maintenance']).optional(),
});

export async function PUT(
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

    // Verify machine belongs to user's laundromat
    const { data: existingMachine, error: fetchError } = await supabase
      .from('machines')
      .select('*')
      .eq('id', id)
      .eq('laundromat_id', laundromat.id)
      .single();

    if (fetchError || !existingMachine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateMachineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const updateData: Record<string, string> = {};

    if (parsed.data.label !== undefined) {
      const sanitizedLabel = sanitizeMachineLabel(parsed.data.label);
      if (!sanitizedLabel) {
        return NextResponse.json(
          { error: 'Label contains only invalid characters' },
          { status: 400 }
        );
      }
      updateData.label = sanitizedLabel;
    }

    if (parsed.data.type !== undefined) {
      updateData.type = parsed.data.type;
    }

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: machine, error: updateError } = await supabase
      .from('machines')
      .update(updateData)
      .eq('id', id)
      .eq('laundromat_id', laundromat.id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: `A machine with label "${updateData.label}" already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
    }

    return NextResponse.json({ machine });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Verify machine belongs to user's laundromat
    const { data: existingMachine, error: fetchError } = await supabase
      .from('machines')
      .select('*')
      .eq('id', id)
      .eq('laundromat_id', laundromat.id)
      .single();

    if (fetchError || !existingMachine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    // Check for active jobs on this machine
    const { data: activeJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('machine_id', id)
      .eq('status', 'in_progress')
      .limit(1);

    if (jobsError) {
      return NextResponse.json({ error: 'Failed to check active jobs' }, { status: 500 });
    }

    if (activeJobs && activeJobs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete -- this machine has active jobs.' },
        { status: 409 }
      );
    }

    // Soft delete: set status to 'inactive'
    const { error: deleteError } = await supabase
      .from('machines')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('laundromat_id', laundromat.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Machine deleted successfully' });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
