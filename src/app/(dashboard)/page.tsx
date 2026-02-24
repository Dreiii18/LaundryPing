import { FREE_TIER_SMS_LIMIT } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { JobsTable } from '@/components/jobs-table';
import { SmsUsageCard } from '@/components/sms-usage-card';
import { SmsQuotaWarning } from '@/components/sms-quota-warning';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: laundromat } = await supabase
    .from('laundromats')
    .select('id, sms_used_this_month, sms_limit')
    .eq('user_id', user.id)
    .single();

  if (!laundromat) {
    redirect('/login');
  }

  const smsUsed = (laundromat as Record<string, unknown>).sms_used_this_month as number ?? 0;
  const smsLimit = (laundromat as Record<string, unknown>).sms_limit as number ?? FREE_TIER_SMS_LIMIT;

  // Calculate days until billing cycle reset (1st of next month)
  const now = new Date();
  const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const nextMonth = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 1);
  const daysUntilReset = Math.ceil((nextMonth.getTime() - phNow.getTime()) / (1000 * 60 * 60 * 24));

  // Get today's date in PH timezone
  const phFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayPH = phFormatter.format(now);

  // Fetch jobs for today OR overdue in_progress jobs
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
      created_at,
      machines (
        id,
        label,
        type
      )
    `)
    .eq('laundromat_id', laundromat.id)
    .or(`started_at.gte.${todayPH}T00:00:00+08:00,status.eq.in_progress`)
    .order('started_at', { ascending: false });

  const safeJobs = (jobs || []).map((job) => ({
    id: job.id,
    machine_id: job.machine_id,
    customer_phone_masked: job.customer_phone_masked,
    status: job.status as 'in_progress' | 'completed' | 'cancelled',
    started_at: job.started_at,
    completed_at: job.completed_at,
    sms_sent: job.sms_sent,
    notes: job.notes,
    payment_method: job.payment_method as string | null,
    pay_amount: job.pay_amount as number | null,
    is_paid: job.is_paid as boolean,
    machine: Array.isArray(job.machines) ? job.machines[0] as { id: string; label: string; type: string } ?? null : job.machines as { id: string; label: string; type: string } | null,
  }));

  // Count completed jobs today
  const completedToday = safeJobs.filter((j) => j.status === 'completed').length;

  // Calculate today's total revenue from completed jobs
  const todayRevenue = safeJobs
    .filter((j) => j.status === 'completed' && j.pay_amount != null)
    .reduce((sum, j) => sum + Number(j.pay_amount), 0);

  return (
    <div className="space-y-6">
      {/* SMS Quota Warning */}
      <SmsQuotaWarning used={smsUsed} limit={smsLimit} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Jobs Completed Today */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
          <p className="text-slate-500 text-sm font-medium mb-1">Jobs completed today</p>
          <p className="text-4xl font-bold text-slate-900" aria-label={`${completedToday} jobs completed today`}>{completedToday}</p>
        </div>

        {/* Today's Total Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
          <p className="text-slate-500 text-sm font-medium mb-1">Today&apos;s total revenue</p>
          <p className="text-4xl font-bold text-slate-900" aria-label={`Today's total revenue: ${todayRevenue} pesos`}>
            ₱{todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* SMS Usage */}
        <SmsUsageCard used={smsUsed} limit={smsLimit} daysUntilReset={daysUntilReset} />
      </div>

      {/* Today's Jobs Table */}
      <JobsTable jobs={safeJobs} />
    </div>
  );
}
