import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PlanPricingCards } from '@/components/plan-pricing-cards';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CreditCard } from 'lucide-react';

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

  // Safely access plan columns (may not exist before migration)
  const smsPlanId = (laundromat as Record<string, unknown>).sms_plan_id as string | null ?? null;
  const hasPlan = smsPlanId !== null;
  const smsUsed = laundromat.sms_used_this_month ?? 0;
  const smsLimit = laundromat.sms_limit ?? 0;
  const remaining = Math.max(0, smsLimit - smsUsed);

  // Get current plan details if plan exists
  let currentPlanTier: string | null = null;
  let currentPlanLabel: string | null = null;

  if (hasPlan) {
    const { data: plan } = await supabase
      .from('sms_plans')
      .select('tier, label')
      .eq('id', smsPlanId)
      .single();
    currentPlanTier = plan?.tier ?? null;
    currentPlanLabel = plan?.label ?? null;
  }

  // Fetch all available plans
  const { data: plans } = await supabase
    .from('sms_plans')
    .select('tier, label, sms_limit, price_php, description')
    .order('sort_order', { ascending: true });

  // Billing period
  const now = new Date();
  const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const billingStart = new Date(phNow.getFullYear(), phNow.getMonth(), 1);
  const billingEnd = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 0);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

  // Plan expiry
  const planExpiresAt = (laundromat as Record<string, unknown>).sms_plan_expires_at
    ? new Date((laundromat as Record<string, unknown>).sms_plan_expires_at as string)
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Plan & Billing</h2>
        <p className="text-slate-500 mt-2">
          Manage your SMS plan and billing details.
        </p>
      </header>

      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="size-5 text-[#0d968b]" />
              SMS Plan
            </h3>
            {hasPlan && currentPlanLabel && (
              <Badge className="bg-[#0d968b]/10 text-[#0d968b] text-xs font-bold">
                {currentPlanLabel} Plan
              </Badge>
            )}
          </div>
          <div className="p-6">
            {hasPlan ? (
              <div className="space-y-6">
                {/* Current plan summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        style={{ width: `${smsLimit > 0 ? Math.min((smsUsed / smsLimit) * 100, 100) : 0}%` }}
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
                    {planExpiresAt && (
                      <div className="mt-2 text-xs text-slate-400">
                        Plan expires: {planExpiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upgrade option */}
                {currentPlanTier !== 'scale' && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Upgrade your plan</h4>
                    <PlanPricingCards
                      plans={(plans || []).map(p => ({
                        ...p,
                        price_php: Number(p.price_php),
                      }))}
                      currentPlanTier={currentPlanTier}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <MessageSquare className="size-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">No SMS plan active</p>
                    <p className="text-xs text-amber-600">
                      Subscribe to a plan to start sending SMS notifications to your customers.
                    </p>
                  </div>
                </div>
                <PlanPricingCards
                  plans={(plans || []).map(p => ({
                    ...p,
                    price_php: Number(p.price_php),
                  }))}
                  currentPlanTier={null}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
