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

  // Fetch machines and phases in parallel.
  // Occupancy + activity are now derived from job_phases, not jobs.
  const [{ data: machines }, { data: phases }] = await Promise.all([
    supabase
      .from('machines')
      .select('*')
      .eq('laundromat_id', laundromat.id)
      .in('status', ['active', 'maintenance'])
      .order('created_at', { ascending: true }),
    supabase
      .from('job_phases')
      .select(`
        id,
        machine_id,
        phase_type,
        status,
        started_at,
        completed_at,
        job_id,
        jobs ( claim_number )
      `)
      .eq('laundromat_id', laundromat.id)
      .not('machine_id', 'is', null)
      .or(`status.eq.in_progress,and(status.eq.completed,completed_at.gte.${todayPH}T00:00:00+08:00)`),
  ]);

  type CurrentPhase = { jobId: string; claimNumber: number | null; phaseType: string };
  // Supabase types nested relations as arrays even for many-to-one relationships.
  type PhaseRow = {
    machine_id: string;
    phase_type: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    job_id: string;
    jobs: { claim_number: number | null }[] | { claim_number: number | null } | null;
  };
  const getClaim = (jobs: PhaseRow['jobs']): number | null => {
    if (!jobs) return null;
    if (Array.isArray(jobs)) return jobs[0]?.claim_number ?? null;
    return jobs.claim_number ?? null;
  };

  const machineStats = new Map<string, {
    hasInProgress: boolean;
    cyclesToday: number;
    lastActivityAt: string | null;
    currentPhase: CurrentPhase | null;
  }>();

  for (const phase of (phases ?? []) as unknown as PhaseRow[]) {
    if (!phase.machine_id) continue;
    const stats = machineStats.get(phase.machine_id) || {
      hasInProgress: false,
      cyclesToday: 0,
      lastActivityAt: null,
      currentPhase: null,
    };

    if (phase.status === 'in_progress') {
      stats.hasInProgress = true;
      stats.currentPhase = {
        jobId: phase.job_id,
        claimNumber: getClaim(phase.jobs),
        phaseType: phase.phase_type,
      };
    }

    if (phase.status === 'completed') {
      stats.cyclesToday += 1;
    }

    const activityTime = phase.completed_at || phase.started_at;
    if (activityTime && (!stats.lastActivityAt || activityTime > stats.lastActivityAt)) {
      stats.lastActivityAt = activityTime;
    }

    machineStats.set(phase.machine_id, stats);
  }

  const safeMachines = (machines || []).map((m) => {
    const stats = machineStats.get(m.id);
    return {
      id: m.id,
      label: m.label,
      status: m.status,
      machine_type: m.machine_type,
      created_at: m.created_at,
      operationalStatus: stats?.hasInProgress ? 'in_use' as const : 'available' as const,
      cyclesToday: stats?.cyclesToday ?? 0,
      lastActivityAt: stats?.lastActivityAt ?? null,
      currentPhase: stats?.currentPhase ?? null,
    };
  });

  return (
    <div>
      <MachinesTable machines={safeMachines} />
    </div>
  );
}
