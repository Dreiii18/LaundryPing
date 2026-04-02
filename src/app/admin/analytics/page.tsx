import { redirect } from 'next/navigation';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  Store,
  MessageSquare,
  DollarSign,
  Zap,
  Activity,
  AlertTriangle,
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

  // PH timezone dates (UTC+8 fixed offset)
  const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowUtc = new Date();
  const phTimestamp = nowUtc.getTime() + PH_OFFSET_MS;
  const phTodayMidnightUtc = new Date(
    Math.floor(phTimestamp / 86_400_000) * 86_400_000 - PH_OFFSET_MS
  );
  const todayStartPH = phTodayMidnightUtc.toISOString();
  const weekAgoPH = new Date(phTodayMidnightUtc.getTime() - 7 * 86_400_000).toISOString();

  // Run all independent queries in parallel
  const [
    { count: totalLaundromats, error: e1 },
    { count: smsSentThisMonth, error: e2 },
    { data: topupLogs, error: e3 },
    { data: allLaundromats, error: e4 },
    { data: todayJobs, error: e5 },
    { count: smsFailedCount, error: e6 },
    { data: weekJobs, error: e7 },
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
      .select('id, user_id, name, sms_free_credits, sms_paid_credits, created_at'),
    // Daily active shops (jobs created today)
    supabaseAdmin
      .from('jobs')
      .select('laundromat_id')
      .gte('created_at', todayStartPH),
    // SMS failures this month
    supabaseAdmin
      .from('sms_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('sent_at', firstOfMonthISO),
    // Jobs from last 7 days (for per-shop activity)
    supabaseAdmin
      .from('jobs')
      .select('laundromat_id, created_at')
      .gte('created_at', weekAgoPH),
  ]);

  for (const err of [e1, e2, e3, e4, e5, e6, e7]) {
    if (err) console.error('Analytics query failed:', err.message);
  }

  const monthlyRevenue = (topupLogs || []).reduce((sum, l) => sum + Number(l.price_php), 0);
  const totalFreeCredits = (allLaundromats || []).reduce((sum, l) => sum + l.sms_free_credits, 0);
  const totalPaidCredits = (allLaundromats || []).reduce((sum, l) => sum + l.sms_paid_credits, 0);

  const dailyActiveShops = new Set((todayJobs || []).map((j) => j.laundromat_id)).size;
  const smsFailedThisMonth = smsFailedCount || 0;
  const smsTotalThisMonth = (smsSentThisMonth || 0) + smsFailedThisMonth;

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
    {
      label: 'Daily Active Shops',
      value: dailyActiveShops,
      icon: Activity,
      sub: '',
    },
    {
      label: 'SMS Failures (This Month)',
      value: smsFailedThisMonth,
      icon: AlertTriangle,
      sub: smsFailedThisMonth > 0 ? `${smsFailedThisMonth} failed / ${smsTotalThisMonth} total` : '',
    },
  ];

  // Build per-shop activity data
  const weekJobsData = weekJobs || [];

  // Fetch all user emails in a single call
  const emailMap = new Map<string, string>();
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (usersData?.users) {
    for (const u of usersData.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  }

  // Floor a UTC timestamp to its PH calendar day (midnight PH in UTC)
  function phDayStart(utcMs: number): number {
    return Math.floor((utcMs + PH_OFFSET_MS) / 86_400_000) * 86_400_000 - PH_OFFSET_MS;
  }

  const phTodayDay = phTodayMidnightUtc.getTime();

  // Compute relative date label (PH calendar days, not absolute hours)
  function relativeDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const jobDay = phDayStart(new Date(dateStr).getTime());
    const diffDays = Math.round((phTodayDay - jobDay) / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }

  // Compute status tier (PH calendar days)
  function statusTier(lastActiveDateStr: string | null): 0 | 1 | 2 {
    if (!lastActiveDateStr) return 0; // inactive (red) → sort first
    const jobDay = phDayStart(new Date(lastActiveDateStr).getTime());
    const diffDays = (phTodayDay - jobDay) / 86_400_000;
    if (diffDays <= 3) return 2; // active (green) → sort last
    if (diffDays <= 7) return 1; // slowing (amber) → sort middle
    return 0; // inactive (red) → sort first
  }

  // Pre-index jobs by laundromat for O(1) lookup
  const jobsByLaundromat = new Map<string, typeof weekJobsData>();
  for (const j of weekJobsData) {
    const arr = jobsByLaundromat.get(j.laundromat_id);
    if (arr) arr.push(j);
    else jobsByLaundromat.set(j.laundromat_id, [j]);
  }

  const shopActivity = (allLaundromats || [])
    .map((l) => {
      const shopJobs = jobsByLaundromat.get(l.id) || [];
      const jobDates = shopJobs.map((j) => j.created_at).sort().reverse();
      const lastActiveRaw = jobDates[0] || null;
      const tier = statusTier(lastActiveRaw);
      return {
        name: l.name,
        email: emailMap.get(l.user_id) || '',
        lastActive: relativeDate(lastActiveRaw),
        jobsThisWeek: shopJobs.length,
        smsCredits: l.sms_free_credits + l.sms_paid_credits,
        tier,
      };
    })
    // Sort: inactive (0) first, slowing (1) middle, active (2) last
    .sort((a, b) => a.tier - b.tier);

  function statusBadge(tier: 0 | 1 | 2) {
    if (tier === 2) return { className: 'bg-emerald-100 text-emerald-700', label: 'Active' };
    if (tier === 1) return { className: 'bg-amber-100 text-amber-700', label: 'Slowing' };
    return { className: 'bg-red-100 text-red-700', label: 'Inactive' };
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-500 mt-1">Business metrics overview</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Shop Activity */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Shop Activity</h2>
        {shopActivity.length === 0 ? (
          <p className="text-sm text-slate-500">No shops yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 font-medium text-slate-500">Name</th>
                  <th className="text-left py-2 font-medium text-slate-500">Email</th>
                  <th className="text-left py-2 font-medium text-slate-500">Last Active</th>
                  <th className="text-left py-2 font-medium text-slate-500">Jobs (7d)</th>
                  <th className="text-left py-2 font-medium text-slate-500">SMS Credits</th>
                  <th className="text-left py-2 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {shopActivity.map((s, i) => {
                  const badge = statusBadge(s.tier);
                  return (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 font-medium text-slate-700">{s.name}</td>
                      <td className="py-2 text-slate-500">{s.email}</td>
                      <td className="py-2 text-slate-500">{s.lastActive}</td>
                      <td className="py-2 text-slate-500">{s.jobsThisWeek}</td>
                      <td className="py-2 text-slate-500">{s.smsCredits}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
