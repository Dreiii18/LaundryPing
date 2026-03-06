import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TopupPackageCards } from '@/components/topup-package-cards';
import { MessageSquare } from 'lucide-react';

export default async function PlanBillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: laundromat } = await supabase
    .from('laundromats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!laundromat) {
    redirect('/login');
  }

  const freeCredits = laundromat.sms_free_credits;
  const paidCredits = laundromat.sms_paid_credits;
  const totalCredits = freeCredits + paidCredits;

  // Fetch top-up packages
  const { data: packages } = await supabase
    .from('sms_topup_packages')
    .select('slug, label, sms_credits, price_php, description')
    .order('sort_order', { ascending: true });

  // Fetch top-up history
  const { data: topupLogs } = await supabase
    .from('sms_topup_logs')
    .select('package_slug, credits_added, price_php, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  // Billing period
  const now = new Date();
  const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const nextMonth = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 1);
  const daysUntilFreeReset = Math.ceil((nextMonth.getTime() - phNow.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">SMS Credits</h2>
        <p className="text-slate-500 mt-2">
          Manage your SMS credits and buy top-up packs.
        </p>
      </header>

      <div className="space-y-8">
        {/* Credit Summary */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="size-5 text-[#0d968b]" />
              Credit Balance
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-background-light rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Free credits
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{freeCredits}</span>
                  <span className="text-xs text-slate-400">/ 50 monthly</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Free credits remaining"
                  aria-valuenow={freeCredits}
                  aria-valuemin={0}
                  aria-valuemax={50}
                  className="mt-3 w-full bg-slate-200 rounded-full h-1.5"
                >
                  <div
                    className="bg-[#0d968b] h-1.5 rounded-full"
                    style={{ width: `${(freeCredits / 50) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Resets in {daysUntilFreeReset} day{daysUntilFreeReset !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-4 bg-background-light rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Purchased credits
                </p>
                <span className="text-2xl font-bold text-slate-900">{paidCredits}</span>
                <p className="mt-2 text-xs text-slate-400">Never expire</p>
              </div>
              <div className="p-4 bg-background-light rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Total available
                </p>
                <span className="text-2xl font-bold text-[#0d968b]">{totalCredits}</span>
                <p className="mt-2 text-xs text-slate-400">Free credits used first</p>
              </div>
            </div>
          </div>
        </section>

        {/* Top-up Packages */}
        <section>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Buy SMS Credits</h3>
          <TopupPackageCards
            packages={(packages || []).map(p => ({
              ...p,
              price_php: Number(p.price_php),
            }))}
          />
        </section>

        {/* Top-up History */}
        {topupLogs && topupLogs.length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Top-up History</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {topupLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">+{log.credits_added} credits</p>
                      <p className="text-xs text-slate-400">{log.package_slug}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">₱{Number(log.price_php).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
