import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminPlansContent } from '@/components/admin/admin-plans-content';

export default async function AdminPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  // Fetch all laundromats with their plan info
  const { data: laundromats } = await supabaseAdmin
    .from('laundromats')
    .select('id, user_id, name, sms_used_this_month, sms_limit, sms_plan_id, sms_plan_expires_at')
    .order('created_at', { ascending: false });

  // Fetch all available plans
  const { data: plans } = await supabaseAdmin
    .from('sms_plans')
    .select('id, tier, label, sms_limit, price_php')
    .order('sort_order', { ascending: true });

  // Fetch user emails via admin API
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, string>();
  for (const u of usersData?.users || []) {
    emailMap.set(u.id, u.email || '');
  }

  // Build plan lookup
  const planMap = new Map<string, { tier: string; label: string }>();
  for (const p of plans || []) {
    planMap.set(p.id, { tier: p.tier, label: p.label });
  }

  // Enrich laundromat rows
  const enriched = (laundromats || []).map((l) => {
    const plan = l.sms_plan_id ? planMap.get(l.sms_plan_id) : null;
    return {
      id: l.id,
      user_id: l.user_id,
      name: l.name,
      email: emailMap.get(l.user_id) || '',
      plan_tier: plan?.tier || null,
      plan_label: plan?.label || null,
      sms_used_this_month: l.sms_used_this_month,
      sms_limit: l.sms_limit,
      sms_plan_expires_at: l.sms_plan_expires_at,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Plan Activation</h1>
        <p className="text-slate-500 mt-1">Manage SMS plans for all laundromats</p>
      </div>
      <AdminPlansContent laundromats={enriched} plans={plans || []} />
    </div>
  );
}
