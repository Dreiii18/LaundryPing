import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MachinesTable } from '@/components/machines-table';

export default async function MachinesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: laundromat } = await supabase
    .from('laundromats')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!laundromat) {
    redirect('/login');
  }

  const { data: machines } = await supabase
    .from('machines')
    .select('*')
    .eq('laundromat_id', laundromat.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  // Get today's date in PH timezone for filtering completed jobs
  const now = new Date();
  const phFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayPH = phFormatter.format(now);

  // Fetch jobs: in_progress (any day) + completed today
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, machine_id, status, started_at, completed_at')
    .eq('laundromat_id', laundromat.id)
    .or(`status.eq.in_progress,and(status.eq.completed,completed_at.gte.${todayPH}T00:00:00+08:00)`);

  // Aggregate per-machine stats
  const machineStats = new Map<string, {
    hasInProgressJob: boolean;
    cyclesToday: number;
    lastActivityAt: string | null;
  }>();

  for (const job of jobs || []) {
    const stats = machineStats.get(job.machine_id) || {
      hasInProgressJob: false,
      cyclesToday: 0,
      lastActivityAt: null,
    };

    if (job.status === 'in_progress') {
      stats.hasInProgressJob = true;
    }

    if (job.status === 'completed') {
      stats.cyclesToday += 1;
    }

    // Track most recent activity (use started_at or completed_at)
    const activityTime = job.completed_at || job.started_at;
    if (activityTime && (!stats.lastActivityAt || activityTime > stats.lastActivityAt)) {
      stats.lastActivityAt = activityTime;
    }

    machineStats.set(job.machine_id, stats);
  }

  const safeMachines = (machines || []).map((m) => {
    const stats = machineStats.get(m.id);
    return {
      id: m.id,
      label: m.label,
      type: m.type as 'washer' | 'dryer',
      status: m.status,
      created_at: m.created_at,
      operationalStatus: stats?.hasInProgressJob ? 'in_use' as const : 'available' as const,
      cyclesToday: stats?.cyclesToday ?? 0,
      lastActivityAt: stats?.lastActivityAt ?? null,
    };
  });

  return (
    <div>
      <MachinesTable machines={safeMachines} />
    </div>
  );
}
