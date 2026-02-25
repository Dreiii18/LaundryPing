import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  Store,
  CreditCard,
  MessageSquare,
  DollarSign,
} from 'lucide-react';

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  // Total laundromats
  const { count: totalLaundromats } = await supabaseAdmin
    .from('laundromats')
    .select('*', { count: 'exact', head: true });

  // Active plans (has plan + not expired)
  const { count: activePlans } = await supabaseAdmin
    .from('laundromats')
    .select('*', { count: 'exact', head: true })
    .not('sms_plan_id', 'is', null)
    .gte('sms_plan_expires_at', new Date().toISOString());

  // SMS sent this month
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const { count: smsSentThisMonth } = await supabaseAdmin
    .from('sms_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', firstOfMonth.toISOString());

  // Revenue: get active laundromats with their plan IDs, then sum prices
  const { data: activeLaundromats } = await supabaseAdmin
    .from('laundromats')
    .select('sms_plan_id')
    .not('sms_plan_id', 'is', null)
    .gte('sms_plan_expires_at', new Date().toISOString());

  const { data: allPlans } = await supabaseAdmin
    .from('sms_plans')
    .select('id, tier, label, price_php, sms_limit')
    .order('sort_order', { ascending: true });

  const planPriceMap = new Map<string, number>();
  const planInfoMap = new Map<string, { tier: string; label: string }>();
  for (const p of allPlans || []) {
    planPriceMap.set(p.id, p.price_php);
    planInfoMap.set(p.id, { tier: p.tier, label: p.label });
  }

  let estimatedRevenue = 0;
  const tierCounts: Record<string, number> = {};
  for (const l of activeLaundromats || []) {
    if (l.sms_plan_id) {
      estimatedRevenue += planPriceMap.get(l.sms_plan_id) || 0;
      const info = planInfoMap.get(l.sms_plan_id);
      if (info) {
        tierCounts[info.label] = (tierCounts[info.label] || 0) + 1;
      }
    }
  }

  // Recent signups (last 5)
  const { data: recentLaundromats } = await supabaseAdmin
    .from('laundromats')
    .select('id, user_id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, string>();
  for (const u of usersData?.users || []) {
    emailMap.set(u.id, u.email || '');
  }

  const recentSignups = (recentLaundromats || []).map((l) => ({
    name: l.name,
    email: emailMap.get(l.user_id) || '',
    date: new Date(l.created_at).toLocaleDateString(),
  }));

  const activePercent = totalLaundromats
    ? Math.round(((activePlans || 0) / totalLaundromats) * 100)
    : 0;

  const metrics = [
    {
      label: 'Total Laundromats',
      value: totalLaundromats || 0,
      icon: Store,
      sub: '',
    },
    {
      label: 'Active Plans',
      value: activePlans || 0,
      icon: CreditCard,
      sub: `${activePercent}% with active plans`,
    },
    {
      label: 'SMS Sent (This Month)',
      value: smsSentThisMonth || 0,
      icon: MessageSquare,
      sub: '',
    },
    {
      label: 'Est. Monthly Revenue',
      value: `PHP ${estimatedRevenue.toLocaleString()}`,
      icon: DollarSign,
      sub: '',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-500 mt-1">Business metrics overview</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 bg-[#0d968b]/10 rounded-lg flex items-center justify-center">
                <m.icon className="size-5 text-[#0d968b]" />
              </div>
              <p className="text-sm text-slate-500 font-medium">{m.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{m.value}</p>
            {m.sub && <p className="text-xs text-slate-400 mt-1">{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Plan Distribution</h2>
        {Object.keys(tierCounts).length === 0 ? (
          <p className="text-sm text-slate-500">No active plans</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(tierCounts).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0d968b]/10 text-[#0d968b]">
                  {label}
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {count} laundromat{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Signups */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Signups</h2>
        {recentSignups.length === 0 ? (
          <p className="text-sm text-slate-500">No signups yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 font-medium text-slate-500">Name</th>
                  <th className="text-left py-2 font-medium text-slate-500">Email</th>
                  <th className="text-left py-2 font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-700">{s.name}</td>
                    <td className="py-2 text-slate-500">{s.email}</td>
                    <td className="py-2 text-slate-500">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
