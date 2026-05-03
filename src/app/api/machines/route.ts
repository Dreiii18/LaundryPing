import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { sanitizeMachineLabel } from '@/lib/utils/sanitize';

const createMachineSchema = z.object({
  label: z.string().min(1, 'Label is required').max(20, 'Label must be 20 characters or less'),
  machine_type: z.enum(['washer', 'dryer', 'combo', 'other']).optional(),
});

export async function GET(request: Request) {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get('available') === 'true';
    const excludeJobId = searchParams.get('exclude_job');
    const machineTypeFilter = searchParams.get('machine_type');

    if (excludeJobId && !z.string().uuid().safeParse(excludeJobId).success) {
      return NextResponse.json({ error: 'Invalid exclude_job parameter' }, { status: 400 });
    }

    if (machineTypeFilter && !['washer', 'dryer', 'combo', 'other'].includes(machineTypeFilter)) {
      return NextResponse.json({ error: 'Invalid machine_type parameter' }, { status: 400 });
    }

    let query = supabase
      .from('machines')
      .select('*')
      .eq('laundromat_id', laundromat.id);

    if (availableOnly) {
      query = query.eq('status', 'active');

      // Occupancy is derived from job_phases: a machine is busy iff there's an
      // in_progress phase pointing at it.
      let phasesQuery = supabase
        .from('job_phases')
        .select('machine_id, job_id')
        .eq('laundromat_id', laundromat.id)
        .eq('status', 'in_progress')
        .not('machine_id', 'is', null);

      if (excludeJobId) {
        phasesQuery = phasesQuery.neq('job_id', excludeJobId);
      }

      const { data: busyPhases } = await phasesQuery;
      const busyMachineIds = (busyPhases || [])
        .map((p: { machine_id: string | null }) => p.machine_id)
        .filter(Boolean) as string[];

      if (busyMachineIds.length > 0) {
        query = query.not('id', 'in', `(${busyMachineIds.join(',')})`);
      }
    } else {
      query = query.in('status', ['active', 'maintenance']);
    }

    if (machineTypeFilter) {
      // 'combo' machines are universal — return them for any type filter.
      if (machineTypeFilter === 'combo') {
        query = query.eq('machine_type', 'combo');
      } else {
        query = query.in('machine_type', [machineTypeFilter, 'combo']);
      }
    }

    query = query.order('created_at', { ascending: true });

    const { data: machines, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
    }

    return NextResponse.json({ machines: machines || [] });
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
    const parsed = createMachineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const sanitizedLabel = sanitizeMachineLabel(parsed.data.label);

    if (!sanitizedLabel) {
      return NextResponse.json(
        { error: 'Label contains only invalid characters' },
        { status: 400 }
      );
    }

    const { data: machine, error: insertError } = await supabase
      .from('machines')
      .insert({
        laundromat_id: laundromat.id,
        label: sanitizedLabel,
        machine_type: parsed.data.machine_type ?? 'washer',
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (duplicate label for this laundromat)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: `A machine with label "${sanitizedLabel}" already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 });
    }

    return NextResponse.json({ machine }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
