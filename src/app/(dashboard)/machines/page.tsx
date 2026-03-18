import { getCachedUser } from '@/lib/supabase/cached-auth';
import { redirect } from 'next/navigation';
import { MachinesTable } from '@/components/machines-table';

export default async function MachinesPage() {
  const { user, laundromat, supabase } = await getCachedUser();

  if (!user || !laundromat) {
    redirect('/login');
  }

  // Get today's date in PH timezone for filtering completed jobs
  const todayPH = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // Fetch machines and jobs in parallel
  const [{ data: machines }, { data: jobs }] = await Promise.all([
    supabase
      .from('machines')
      .select('*')
      .eq('laundromat_id', laundromat.id)
      .in('status', ['active', 'maintenance'])
      .order('created_at', { ascending: true }),
    supabase
      .from('jobs')
      .select('id, machine_id, status, started_at, completed_at')
      .eq('laundromat_id', laundromat.id)
      .or(`status.eq.in_progress,and(status.eq.completed,completed_at.gte.${todayPH}T00:00:00+08:00)`),
  ]);

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
