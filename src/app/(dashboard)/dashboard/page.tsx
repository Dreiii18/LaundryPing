import { getCachedUser } from '@/lib/supabase/cached-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { JobsTable } from '@/components/jobs-table';
import { SmsUsageCard } from '@/components/sms-usage-card';
import { SmsQuotaWarning } from '@/components/sms-quota-warning';
import { TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import Image from 'next/image';

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
  // The error from mark_overdue_jobs is intentionally discarded (index 1 unused) — it only
  // fails if auth context is mismatched, which cannot happen here since user is verified above.
  const [{ count: machineCount }, , { data: todayCompletedJobs }, { data: yesterdayCompletedJobs }] =
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

  const hasNoMachines = (machineCount ?? 0) === 0;

  // WARNING: this query must remain after the Promise.all above — it needs to see
  // the is_overdue updates written by mark_overdue_jobs (PostgreSQL read-committed isolation
  // guarantees visibility of committed writes before this statement begins).
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
    .eq('laundromat_id', laundromat.id)
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
    is_paid: job.is_paid as boolean,
    is_overdue: job.is_overdue as boolean,
    overdue_reason: job.overdue_reason as string | null,
    services: (job.services || []) as string[],
    claim_number: job.claim_number as number | null,
    customer_name: job.customer_name as string | null,
    machine: Array.isArray(job.machines) ? job.machines[0] as { id: string; label: string } ?? null : job.machines as { id: string; label: string } | null,
  }));

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
      {/* Onboarding Banner - only when no machines and no jobs */}
      {hasNoMachines && safeJobs.length === 0 && (
        <div className="bg-white border-2 border-[#0d968b]/30 rounded-xl p-6 flex items-start gap-4">
          <Image src="/laundryping-icon.png" alt="LaundryPing" width={144} height={144} className="size-12 rounded-xl shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Welcome to LaundryPing!</h3>
            <p className="text-sm text-slate-600 mb-3">
              Get started by adding your first machine.
            </p>
            <Link
              href="/machines"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d968b] text-white font-semibold text-sm hover:bg-[#0d968b]/90 transition-colors"
            >
              <Plus className="size-4" />
              Add Machine
            </Link>
          </div>
        </div>
      )}

      {/* SMS Credit Warning */}
      <SmsQuotaWarning totalCredits={totalCredits} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Jobs Completed Today */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
          <p className="text-slate-500 text-sm font-medium mb-1">Jobs completed today</p>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-slate-900" aria-label={`${completedToday} jobs completed today`}>{completedToday}</p>
            {yesterdayCount > 0 ? (
              (() => {
                const pctChange = Math.round(((completedToday - yesterdayCount) / yesterdayCount) * 100);
                if (pctChange > 0) {
                  return (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 mb-1">
                      <TrendingUp className="size-3.5" aria-hidden="true" />
                      +{pctChange}%
                    </span>
                  );
                }
                if (pctChange < 0) {
                  return (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500 mb-1">
                      <TrendingDown className="size-3.5" aria-hidden="true" />
                      {pctChange}%
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-400 mb-1">
                    <Minus className="size-3.5" aria-hidden="true" />
                    0%
                  </span>
                );
              })()
            ) : completedToday > 0 && yesterdayCount === 0 ? (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 mb-1">
                <TrendingUp className="size-3.5" aria-hidden="true" />
                New
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400 mt-1">vs {yesterdayCount} yesterday</p>
        </div>

        {/* Today's Total Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
          <p className="text-slate-500 text-sm font-medium mb-1">Today&apos;s total revenue</p>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-slate-900" aria-label={`Today's total revenue: ${todayRevenue} pesos`}>
              ₱{todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {yesterdayRevenue > 0 ? (
              (() => {
                const pctChange = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
                if (pctChange > 0) {
                  return (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 mb-1">
                      <TrendingUp className="size-3.5" aria-hidden="true" />
                      +{pctChange}%
                    </span>
                  );
                }
                if (pctChange < 0) {
                  return (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500 mb-1">
                      <TrendingDown className="size-3.5" aria-hidden="true" />
                      {pctChange}%
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-400 mb-1">
                    <Minus className="size-3.5" aria-hidden="true" />
                    0%
                  </span>
                );
              })()
            ) : todayRevenue > 0 && yesterdayRevenue === 0 ? (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 mb-1">
                <TrendingUp className="size-3.5" aria-hidden="true" />
                New
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400 mt-1">vs ₱{yesterdayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} yesterday</p>
        </div>

        {/* SMS Credits */}
        <SmsUsageCard
          freeCredits={freeCredits}
          paidCredits={paidCredits}
          totalCredits={totalCredits}
          daysUntilFreeReset={daysUntilFreeReset}
        />
      </div>

      {/* Today's Jobs Table */}
      <JobsTable jobs={safeJobs} />
    </div>
  );
}
