import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { JobsPageContent } from '@/components/jobs-page-content';

const PAGE_SIZE = 15;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

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

  // Extract filters from URL params
  const status = typeof params.status === 'string' ? params.status : 'all';
  const machineId = typeof params.machineId === 'string' ? params.machineId : 'all';
  const dateFrom = typeof params.dateFrom === 'string' ? params.dateFrom : '';
  const dateTo = typeof params.dateTo === 'string' ? params.dateTo : '';
  const search = typeof params.search === 'string' ? params.search : '';
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);

  // Mark overdue jobs before fetching
  await supabase.rpc('mark_overdue_jobs', { p_laundromat_id: laundromat.id });

  // Fetch all machines for filter dropdown
  const { data: machines } = await supabase
    .from('machines')
    .select('id, label, type')
    .eq('laundromat_id', laundromat.id)
    .eq('status', 'active')
    .order('label');

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
      payment_method,
      pay_amount,
      is_paid,
      is_overdue,
      overdue_reason,
      created_at,
      machines (
        id,
        label,
        type
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
    const sanitized = search.replace(/[,()\\%_]/g, '\\$&');
    query = query.or(
      `customer_phone_masked.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`
    );
  }

  // Pagination
  const offset = (page - 1) * PAGE_SIZE;
  query = query.order('started_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);

  const { data: jobs, count: totalCount } = await query;

  // Fetch total unfiltered count for the header badge
  const { count: totalJobCount } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('laundromat_id', laundromat.id);

  const safeJobs = (jobs || []).map((job) => ({
    id: job.id,
    machine_id: job.machine_id,
    customer_phone_masked: job.customer_phone_masked as string | null,
    status: job.status as 'in_progress' | 'completed' | 'cancelled',
    started_at: job.started_at,
    completed_at: job.completed_at,
    sms_sent: job.sms_sent,
    notes: job.notes,
    payment_method: job.payment_method as string | null,
    pay_amount: job.pay_amount as number | null,
    is_paid: job.is_paid as boolean,
    is_overdue: job.is_overdue as boolean,
    overdue_reason: job.overdue_reason as string | null,
    machine:
      Array.isArray(job.machines)
        ? ((job.machines[0] as { id: string; label: string; type: string }) ?? null)
        : (job.machines as { id: string; label: string; type: string } | null),
  }));

  const safeMachines = (machines || []).map((m) => ({
    id: m.id,
    label: m.label,
    type: m.type as 'washer' | 'dryer',
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
    />
  );
}
