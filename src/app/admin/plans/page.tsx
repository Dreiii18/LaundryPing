import { redirect } from 'next/navigation';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminTopupContent } from '@/components/admin/topup';

export default async function AdminPlansPage() {
  const { user, error } = await getCachedUser();

  if (error === 'Unauthorized' || !user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  // Fetch laundromats and packages in parallel
  const [{ data: laundromats, error: laundromatError }, { data: packages, error: packageError }] = await Promise.all([
    supabaseAdmin
      .from('laundromats')
      .select('id, user_id, name, sms_free_credits, sms_paid_credits')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('sms_topup_packages')
      .select('slug, label, sms_credits, price_php')
      .order('sort_order', { ascending: true }),
  ]);

  if (laundromatError) console.error('Failed to fetch laundromats:', laundromatError.message);
  if (packageError) console.error('Failed to fetch packages:', packageError.message);

  // Fetch only the emails we actually need (one per laundromat) in parallel
  const userIds = (laundromats || []).map((l) => l.user_id);
  const userResults = await Promise.allSettled(
    userIds.map((id) => supabaseAdmin.auth.admin.getUserById(id))
  );
  const emailMap = new Map<string, string>();
  for (const result of userResults) {
    if (result.status === 'fulfilled' && result.value.data?.user) {
      emailMap.set(result.value.data.user.id, result.value.data.user.email || '');
    }
  }

  // Enrich laundromat rows
  const enriched = (laundromats || []).map((l) => ({
    id: l.id,
    user_id: l.user_id,
    name: l.name,
    email: emailMap.get(l.user_id) || '',
    sms_free_credits: l.sms_free_credits,
    sms_paid_credits: l.sms_paid_credits,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SMS Credit Management</h1>
        <p className="text-slate-500 mt-1">Top up SMS credits for laundromats</p>
      </div>
      <AdminTopupContent
        laundromats={enriched}
        packages={(packages || []).map(p => ({ ...p, price_php: Number(p.price_php) }))}
      />
    </div>
  );
}
