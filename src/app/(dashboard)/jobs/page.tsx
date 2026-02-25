import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { JobsPageContent } from '@/components/jobs-page-content';

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

  // Mark overdue jobs before fetching
  await supabase.rpc('mark_overdue_jobs', { p_laundromat_id: laundromat.id });

  // Fetch all machines for filter dropdown
  const { data: machines } = await supabase
    .from('machines')
    .select('id, label, type')
    .eq('laundromat_id', laundromat.id)
    .eq('status', 'active')
    .order('label');

  // Fetch ALL jobs (with safety cap), ordered by most recent first
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
      created_at,
      machines (
        id,
        label,
        type
      )
    `)
    .eq('laundromat_id', laundromat.id)
    .order('started_at', { ascending: false })
    .limit(1000);

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
    machine: Array.isArray(job.machines) ? job.machines[0] as { id: string; label: string; type: string } ?? null : job.machines as { id: string; label: string; type: string } | null,
  }));

  const safeMachines = (machines || []).map((m) => ({
    id: m.id,
    label: m.label,
    type: m.type as 'washer' | 'dryer',
  }));

  return <JobsPageContent jobs={safeJobs} machines={safeMachines} />;
}
