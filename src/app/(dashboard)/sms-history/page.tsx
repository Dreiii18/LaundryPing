import { getCachedUser } from '@/lib/supabase/cached-auth';
import { redirect } from 'next/navigation';
import { SmsHistoryContent } from '@/components/sms-history-content';

export default async function SmsHistoryPage() {
  const { user, laundromat, supabase } = await getCachedUser();

  if (!user || !laundromat) {
    redirect('/login');
  }

  const { data: logs } = await supabase
    .from('sms_logs')
    .select(`
      id,
      sent_at,
      status,
      provider,
      notification_type,
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
      notification_type: (log.notification_type as 'queue' | 'completion') ?? 'completion',
      customer_phone_masked: (jobAny?.customer_phone_masked as string | null) ?? null,
      machine_label: (machine?.label as string | null) ?? null,
    };
  });

  return <SmsHistoryContent logs={safeLogs} />;
}
