import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminTopupContent } from '@/components/admin/admin-topup-content';

export default async function AdminPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  // Fetch all laundromats with credit info
  const { data: laundromats } = await supabaseAdmin
    .from('laundromats')
    .select('id, user_id, name, sms_free_credits, sms_paid_credits')
    .order('created_at', { ascending: false });

  // Fetch top-up packages
  const { data: packages } = await supabaseAdmin
    .from('sms_topup_packages')
    .select('slug, label, sms_credits, price_php')
    .order('sort_order', { ascending: true });

  // Fetch user emails via admin API
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, string>();
  for (const u of usersData?.users || []) {
    emailMap.set(u.id, u.email || '');
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
