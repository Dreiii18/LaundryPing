import { FREE_TIER_SMS_LIMIT } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/settings-form';
import { Badge } from '@/components/ui/badge';
import { Store, MessageSquare, CreditCard, Lock } from 'lucide-react';

export default async function SettingsPage() {
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

  // Get SMS quota info
  const smsUsed = laundromat.sms_used_this_month ?? 0;
  const smsLimit = laundromat.sms_limit ?? FREE_TIER_SMS_LIMIT;
  const remaining = Math.max(0, smsLimit - smsUsed);

  // Billing period is always 1st to last day of the current month (PH timezone)
  const now = new Date();
  const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const billingStart = new Date(phNow.getFullYear(), phNow.getMonth(), 1);
  const billingEnd = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 0); // last day of month

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-slate-500 mt-2">
          Manage your laundromat profile and communication statistics.
        </p>
      </header>

      <div className="space-y-8">
        {/* Section: Laundromat Details */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Store className="size-5 text-[#0d968b]" />
              Laundromat details
            </h3>
          </div>
          <SettingsForm
            initialName={laundromat.name || ''}
            initialAddress={laundromat.address || ''}
          />
        </section>

        {/* Section: SMS Usage Summary */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="size-5 text-[#0d968b]" />
              SMS usage summary
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-background-light rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Sent this month
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{smsUsed}</span>
                <span className="text-xs text-slate-400">/ {smsLimit} limit</span>
              </div>
              <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className="bg-[#0d968b] h-1.5 rounded-full"
                  style={{ width: `${Math.min((smsUsed / smsLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="p-4 bg-background-light rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Remaining credits
              </p>
              <span className="text-2xl font-bold text-slate-900">{remaining}</span>
            </div>
            <div className="p-4 bg-background-light rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Billing period
              </p>
              <span className="text-base font-bold text-slate-700">
                {formatDate(billingStart)} &mdash; {formatDate(billingEnd)}
              </span>
              <div className="mt-2 text-xs text-slate-400">Renews automatically</div>
            </div>
          </div>
        </section>

        {/* Section: Plan & Billing - Coming Soon */}
        <section className="bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 p-8 relative opacity-70">
          <div className="flex items-start gap-5">
            <div className="size-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
              <CreditCard className="size-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-bold text-slate-500">Plan & Billing</h3>
                <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                  Coming Soon
                </Badge>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                We&apos;re currently building a centralized hub for your subscription management.
                Soon, you&apos;ll be able to upgrade your SMS tiers, download invoices, and manage
                payment methods directly from here.
              </p>
            </div>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <Lock className="size-12 text-slate-300" />
          </div>
        </section>
      </div>
    </div>
  );
}
