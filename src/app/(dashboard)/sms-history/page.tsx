import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SmsHistoryContent } from '@/components/sms-history-content';

export default async function SmsHistoryPage() {
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

  const { data: logs } = await supabase
    .from('sms_logs')
    .select(`
      id,
      sent_at,
      status,
      provider,
      jobs!inner (
        customer_phone_masked,
        machines (
          label
        )
      )
    `)
    .eq('laundromat_id', laundromat.id)
    .order('sent_at', { ascending: false })
    .limit(100);

  const safeLogs = (logs ?? []).map((log) => {
    const job = Array.isArray(log.jobs) ? log.jobs[0] : log.jobs;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jobAny = job as Record<string, any> | null;
    const machinesRaw = jobAny?.machines;
    const machine = Array.isArray(machinesRaw) ? machinesRaw[0] : machinesRaw;

    return {
      id: log.id as string,
      sent_at: log.sent_at as string,
      status: log.status as string,
      provider: log.provider as string,
      customer_phone_masked: (jobAny?.customer_phone_masked as string | null) ?? null,
      machine_label: (machine?.label as string | null) ?? null,
    };
  });

  return <SmsHistoryContent logs={safeLogs} />;
}
