import { Suspense } from 'react';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { redirect } from 'next/navigation';
import { JobsTable } from '@/components/jobs-table';
import { SmsUsageCard } from '@/components/sms-usage-card';
import { SmsQuotaWarning } from '@/components/sms-quota-warning';
import { StatCardWithTrend } from '@/components/dashboard/stat-card-with-trend';
import { OnboardingBanner } from '@/components/onboarding-banner';
import { createClient } from '@/lib/supabase/server';

function JobsTableSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="h-5 w-32 bg-slate-200 rounded" />
      </div>
      <div className="divide-y divide-slate-100">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-4 w-16 bg-slate-100 rounded" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 flex-1 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function DashboardJobsTable({
  laundromatId,
  todayPH,
  shopInfo,
}: {
  laundromatId: string;
  todayPH: string;
  shopInfo: { name: string; address: string | null; contactNumber: string | null; servicePrices: Record<string, number> };
}) {
  const supabase = await createClient();
  // WARNING: this query must run after mark_overdue_jobs has committed — it needs to see
  // the is_overdue updates (PostgreSQL read-committed isolation guarantees visibility
  // of committed writes before this statement begins).
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
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
      cash_tendered,
      is_paid,
      is_overdue,
      overdue_reason,
      services,
      claim_number,
      customer_name,
      created_at,
      machines (
        id,
        label
      )
    `)
    .eq('laundromat_id', laundromatId)
    .or(`started_at.gte.${todayPH}T00:00:00+08:00,status.eq.in_progress,status.eq.pending`)
    .order('started_at', { ascending: false });

  const safeJobs = (jobs || []).map((job) => ({
    id: job.id,
    machine_id: job.machine_id as string | null,
    customer_phone_masked: job.customer_phone_masked as string | null,
    status: job.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    started_at: job.started_at,
    completed_at: job.completed_at,
    sms_sent: job.sms_sent,
    notes: job.notes,
    payment_method: job.payment_method as string | null,
    pay_amount: job.pay_amount as number | null,
    cash_tendered: job.cash_tendered as number | null,
    is_paid: job.is_paid as boolean,
    is_overdue: job.is_overdue as boolean,
    overdue_reason: job.overdue_reason as string | null,
    services: (job.services || []) as string[],
    claim_number: job.claim_number as number | null,
    customer_name: job.customer_name as string | null,
    machine: Array.isArray(job.machines) ? job.machines[0] as { id: string; label: string } ?? null : job.machines as { id: string; label: string } | null,
  }));

  return (
    <JobsTable
      jobs={safeJobs}
      shopInfo={shopInfo}
    />
  );
}

export default async function DashboardPage() {
  // Deduplicated via React.cache — no extra DB round trips even though layout calls this too
  const { user, laundromat, supabase } = await getCachedUser();

  if (!user || !laundromat) {
    redirect('/login');
  }

  const freeCredits = laundromat.sms_free_credits;
  const paidCredits = laundromat.sms_paid_credits;
  const totalCredits = freeCredits + paidCredits;

  // Calculate dates in PH timezone
  const now = new Date();
  const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const nextMonth = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 1);
  const daysUntilFreeReset = Math.ceil((nextMonth.getTime() - phNow.getTime()) / (1000 * 60 * 60 * 24));

  const phFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayPH = phFormatter.format(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayPH = phFormatter.format(yesterdayDate);

  // Run all independent queries in parallel.
  // mark_overdue_jobs only modifies in_progress rows, so the todayCompleted/yesterdayCompleted
  // queries (filtered to status=completed) are unaffected by execution order.
  const [{ count: machineCount }, { error: overdueError }, { data: todayCompletedJobs }, { data: yesterdayCompletedJobs }] =
    await Promise.all([
      supabase
        .from('machines')
        .select('id', { count: 'exact', head: true })
        .eq('laundromat_id', laundromat.id)
        .in('status', ['active', 'maintenance']),
      supabase.rpc('mark_overdue_jobs', { p_laundromat_id: laundromat.id }),
      supabase
        .from('jobs')
        .select('pay_amount')
        .eq('laundromat_id', laundromat.id)
        .eq('status', 'completed')
        .gte('completed_at', `${todayPH}T00:00:00+08:00`),
      supabase
        .from('jobs')
        .select('pay_amount')
        .eq('laundromat_id', laundromat.id)
        .eq('status', 'completed')
        .gte('completed_at', `${yesterdayPH}T00:00:00+08:00`)
        .lt('completed_at', `${todayPH}T00:00:00+08:00`),
    ]);

  if (overdueError) console.error('mark_overdue_jobs failed:', overdueError.message);

  const hasNoMachines = (machineCount ?? 0) === 0;

  const completedToday = todayCompletedJobs?.length ?? 0;
  const todayRevenue = (todayCompletedJobs || [])
    .filter((j) => j.pay_amount != null)
    .reduce((sum, j) => sum + Number(j.pay_amount), 0);

  const yesterdayCount = yesterdayCompletedJobs?.length ?? 0;
  const yesterdayRevenue = (yesterdayCompletedJobs || [])
    .filter((j) => j.pay_amount != null)
    .reduce((sum, j) => sum + Number(j.pay_amount), 0);

  return (
    <div className="space-y-6">
      {/* Onboarding Banner - only when no machines */}
      {hasNoMachines && <OnboardingBanner />}

      {/* SMS Credit Warning */}
      <SmsQuotaWarning totalCredits={totalCredits} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Jobs Completed Today */}
        <StatCardWithTrend
          label="Jobs completed today"
          value={String(completedToday)}
          currentNumericValue={completedToday}
          previousValue={yesterdayCount}
          previousLabel={`vs ${yesterdayCount} yesterday`}
        />

        {/* Today's Total Revenue */}
        <StatCardWithTrend
          label="Today's total revenue"
          value={`₱${todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          currentNumericValue={todayRevenue}
          previousValue={yesterdayRevenue}
          previousLabel={`vs ₱${yesterdayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} yesterday`}
        />

        {/* SMS Credits */}
        <SmsUsageCard
          freeCredits={freeCredits}
          paidCredits={paidCredits}
          totalCredits={totalCredits}
          daysUntilFreeReset={daysUntilFreeReset}
        />
      </div>

      {/* Today's Jobs Table — streams in via Suspense after stats render */}
      <Suspense fallback={<JobsTableSkeleton />}>
        <DashboardJobsTable
          laundromatId={laundromat.id}
          todayPH={todayPH}
          shopInfo={{
            name: laundromat.name,
            address: laundromat.address,
            contactNumber: laundromat.contact_number,
            servicePrices: laundromat.service_prices || {},
          }}
        />
      </Suspense>
    </div>
  );
}
