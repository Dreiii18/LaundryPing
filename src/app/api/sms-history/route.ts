import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

export async function GET() {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const { data: logs, error: queryError } = await supabase
      .from('sms_logs')
      .select(`
        id,
        sent_at,
        status,
        provider,
        jobs!inner (
          customer_phone_masked,
          machines (
            label
          )
        )
      `)
      .eq('laundromat_id', laundromat.id)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch SMS history' }, { status: 500 });
    }

    const transformed = (logs ?? []).map((log) => {
      const job = Array.isArray(log.jobs) ? log.jobs[0] : log.jobs;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobAny = job as Record<string, any> | null;
      const machinesRaw = jobAny?.machines;
      const machine = Array.isArray(machinesRaw) ? machinesRaw[0] : machinesRaw;

      return {
        id: log.id,
        sent_at: log.sent_at,
        status: log.status as string,
        provider: log.provider as string,
        customer_phone_masked: (jobAny?.customer_phone_masked as string | null) ?? null,
        machine_label: (machine?.label as string | null) ?? null,
      };
    });

    return NextResponse.json({ logs: transformed });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
