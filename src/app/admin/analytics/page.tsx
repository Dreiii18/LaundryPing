import { redirect } from 'next/navigation';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  Store,
  MessageSquare,
  DollarSign,
  Zap,
} from 'lucide-react';

export default async function AdminAnalyticsPage() {
  const { user, error } = await getCachedUser();

  if (error === 'Unauthorized' || !user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const firstOfMonthISO = firstOfMonth.toISOString();

  // Run all independent queries in parallel
  const [
    { count: totalLaundromats, error: e1 },
    { count: smsSentThisMonth, error: e2 },
    { data: topupLogs, error: e3 },
    { data: allLaundromats, error: e4 },
    { data: recentLaundromats, error: e5 },
  ] = await Promise.all([
    supabaseAdmin
      .from('laundromats')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('sms_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', firstOfMonthISO),
    supabaseAdmin
      .from('sms_topup_logs')
      .select('price_php')
      .gte('created_at', firstOfMonthISO),
    supabaseAdmin
      .from('laundromats')
      .select('sms_free_credits, sms_paid_credits'),
    supabaseAdmin
      .from('laundromats')
      .select('id, user_id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  for (const err of [e1, e2, e3, e4, e5]) {
    if (err) console.error('Analytics query failed:', err.message);
  }

  const monthlyRevenue = (topupLogs || []).reduce((sum, l) => sum + Number(l.price_php), 0);
  const totalFreeCredits = (allLaundromats || []).reduce((sum, l) => sum + l.sms_free_credits, 0);
  const totalPaidCredits = (allLaundromats || []).reduce((sum, l) => sum + l.sms_paid_credits, 0);

  // Fetch only the emails we need (one per recent signup) in parallel
  const recentUserIds = (recentLaundromats || []).map((l) => l.user_id);
  const recentUserResults = await Promise.allSettled(
    recentUserIds.map((id) => supabaseAdmin.auth.admin.getUserById(id))
  );
  const emailMap = new Map<string, string>();
  for (const result of recentUserResults) {
    if (result.status === 'fulfilled' && result.value.data?.user) {
      emailMap.set(result.value.data.user.id, result.value.data.user.email || '');
    }
  }

  const recentSignups = (recentLaundromats || []).map((l) => ({
    name: l.name,
    email: emailMap.get(l.user_id) || '',
    date: new Date(l.created_at).toLocaleDateString(),
  }));

  const metrics = [
    {
      label: 'Total Laundromats',
      value: totalLaundromats || 0,
      icon: Store,
      sub: '',
    },
    {
      label: 'SMS Sent (This Month)',
      value: smsSentThisMonth || 0,
      icon: MessageSquare,
      sub: '',
    },
    {
      label: 'Top-up Revenue (This Month)',
      value: `PHP ${monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      sub: '',
    },
    {
      label: 'Total Credits in System',
      value: totalFreeCredits + totalPaidCredits,
      icon: Zap,
      sub: `${totalFreeCredits} free + ${totalPaidCredits} paid`,
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
