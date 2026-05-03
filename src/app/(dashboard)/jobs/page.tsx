import { getCachedUser } from '@/lib/supabase/cached-auth';
import { redirect } from 'next/navigation';
import { JobsPageContent } from '@/components/jobs-page-content';
import type { MachineType } from '@/components/jobs-table/types';

const PAGE_SIZE = 15;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { user, laundromat, supabase } = await getCachedUser();

  if (!user || !laundromat) {
    redirect('/login');
  }

  // Extract filters from URL params
  const status = typeof params.status === 'string' ? params.status : 'all';
  const machineId = typeof params.machineId === 'string' ? params.machineId : 'all';
  const dateFrom = typeof params.dateFrom === 'string' ? params.dateFrom : '';
  const dateTo = typeof params.dateTo === 'string' ? params.dateTo : '';
  const search = typeof params.search === 'string' ? params.search : '';
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);

  // Run mark_overdue and machines fetch in parallel
  const [{ error: overdueError }, { data: machines }] = await Promise.all([
    supabase.rpc('mark_overdue_jobs', { p_laundromat_id: laundromat.id }),
    supabase
      .from('machines')
      .select('id, label')
      .eq('laundromat_id', laundromat.id)
      .eq('status', 'active')
      .order('label'),
  ]);

  if (overdueError) console.error('mark_overdue_jobs failed:', overdueError.message);

  // Build filtered, paginated query
  let query = supabase
    .from('jobs')
    .select(
      `
      id,
      laundromat_id,
      machine_id,
      customer_phone_masked,
      notes,
      status,
      started_at,
      completed_at,
      sms_sent,
      notify_sms,
      notify_queue_sms,
      payment_method,
      pay_amount,
      cash_tendered,
      is_paid,
      is_overdue,
      overdue_reason,
      services,
      service_quantities,
      service_weights_actual,
      total_weight,
      claim_number,
      customer_name,
      created_at,
      priority,
      machines (
        id,
        label,
        machine_type
      ),
      job_phases (
        id,
        phase_type,
        machine_id,
        sequence,
        status,
        started_at,
        completed_at,
        estimated_minutes,
        machines (
          id,
          label,
          machine_type
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('laundromat_id', laundromat.id);

  // Apply filters
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  if (machineId !== 'all') {
    query = query.eq('machine_id', machineId);
  }
  if (dateFrom) {
    query = query.gte('started_at', `${dateFrom}T00:00:00+08:00`);
  }
  if (dateTo) {
    query = query.lte('started_at', `${dateTo}T23:59:59+08:00`);
  }
  if (search) {
    // Escape PostgREST-special characters to prevent filter injection
    const trimmed = search.trim();
    const sanitized = trimmed.replace(/[,()\\%_]/g, '\\$&');
    const isNumeric = /^\d+$/.test(trimmed);
    const filters = [
      `customer_phone_masked.ilike.%${sanitized}%`,
      `notes.ilike.%${sanitized}%`,
      `customer_name.ilike.%${sanitized}%`,
    ];
    if (isNumeric) {
      filters.push(`claim_number.eq.${trimmed}`);
    }
    query = query.or(filters.join(','));
  }

  // Pagination
  const offset = (page - 1) * PAGE_SIZE;
  query = query.order('started_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);

  // Run paginated jobs query (filtered, for pagination) and total unfiltered count in parallel.
  // totalCount drives pagination UI; totalJobCount drives the page header badge — they are intentionally different.
  const [{ data: jobs, count: totalCount }, { count: totalJobCount }] = await Promise.all([
    query,
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('laundromat_id', laundromat.id),
  ]);

  // Supabase types nested relations as arrays even for many-to-one joins.
  type JoinedMachine = { id: string; label: string; machine_type?: MachineType };
  type JoinedPhase = {
    id: string;
    phase_type: string;
    machine_id: string | null;
    sequence: number;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    estimated_minutes: number | null;
    machines: JoinedMachine | JoinedMachine[] | null;
  };
  const pickOne = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const safeJobs = (jobs || []).map((job) => {
    const phases = ((job.job_phases ?? []) as unknown as JoinedPhase[])
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((p) => ({
        id: p.id,
        phase_type: p.phase_type,
        machine_id: p.machine_id,
        sequence: p.sequence,
        status: p.status as 'pending' | 'in_progress' | 'completed' | 'skipped',
        started_at: p.started_at,
        completed_at: p.completed_at,
        estimated_minutes: p.estimated_minutes,
        machine: pickOne(p.machines),
      }));

    return {
      id: job.id,
      machine_id: job.machine_id as string | null,
      customer_phone_masked: job.customer_phone_masked as string | null,
      status: job.status as 'pending' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled',
      started_at: job.started_at,
      completed_at: job.completed_at,
      sms_sent: job.sms_sent,
      notify_sms: job.notify_sms as boolean,
      notify_queue_sms: job.notify_queue_sms as boolean,
      notes: job.notes,
      payment_method: job.payment_method as string | null,
      pay_amount: job.pay_amount as number | null,
      cash_tendered: job.cash_tendered as number | null,
      is_paid: job.is_paid as boolean,
      is_overdue: job.is_overdue as boolean,
      overdue_reason: job.overdue_reason as string | null,
      services: (job.services || []) as string[],
      service_quantities: (job.service_quantities as Record<string, number> | null) ?? null,
      service_weights_actual: (job.service_weights_actual as Record<string, number> | null) ?? null,
      total_weight: job.total_weight as number | null,
      claim_number: job.claim_number as number | null,
      customer_name: job.customer_name as string | null,
      priority: (job.priority as 'normal' | 'rush') ?? 'normal',
      created_at: job.created_at as string,
      machine: pickOne(job.machines as JoinedMachine | JoinedMachine[] | null),
      phases,
    };
  });

  const safeMachines = (machines || []).map((m) => ({
    id: m.id,
    label: m.label,
  }));

  return (
    <JobsPageContent
      jobs={safeJobs}
      machines={safeMachines}
      totalCount={totalCount ?? 0}
      totalJobCount={totalJobCount ?? 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      currentFilters={{ status, machineId, dateFrom, dateTo, search }}
      shopInfo={{
        name: laundromat.name,
        address: laundromat.address,
        contactNumber: laundromat.contact_number,
        servicePrices: laundromat.service_prices || {},
        serviceWeights: laundromat.service_weights || {},
        serviceTypes: laundromat.service_types || {},
        receiptPaperSize: laundromat.receipt_paper_size ?? '58mm',
      }}
    />
  );
}
