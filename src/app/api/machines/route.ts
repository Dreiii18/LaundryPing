import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { sanitizeMachineLabel } from '@/lib/utils/sanitize';

const createMachineSchema = z.object({
  label: z.string().min(1, 'Label is required').max(20, 'Label must be 20 characters or less'),
});

export async function GET() {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const { data: machines, error: queryError } = await supabase
      .from('machines')
      .select('*')
      .eq('laundromat_id', laundromat.id)
      .in('status', ['active', 'maintenance'])
      .order('created_at', { ascending: true });

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
