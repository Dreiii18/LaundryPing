import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { JobsTable } from '@/components/jobs-table';

export default async function JobsPage() {
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

  // Get today's date in PH timezone
  const now = new Date();
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Jobs</h2>
        <p className="text-slate-500 text-sm mt-1">View and manage today&apos;s laundry jobs.</p>
      </div>
      <JobsTable jobs={safeJobs} />
    </div>
  );
}
