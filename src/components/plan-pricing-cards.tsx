'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle } from 'lucide-react';

interface Plan {
  tier: string;
  label: string;
  sms_limit: number;
  price_php: number;
  description: string | null;
}

interface PlanPricingCardsProps {
  plans: Plan[];
  currentPlanTier?: string | null;
}

export function PlanPricingCards({ plans, currentPlanTier }: PlanPricingCardsProps) {
  return (
    <div className="space-y-8">
      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = currentPlanTier === plan.tier;
          const isRecommended = plan.tier === 'growth';

          return (
            <div
              key={plan.tier}
              className={`relative rounded-xl border p-6 transition-shadow ${
                isCurrent
                  ? 'border-[#0d968b] bg-[#0d968b]/5 shadow-md'
                  : isRecommended
                    ? 'border-[#0d968b]/40 shadow-md hover:shadow-lg'
                    : 'border-slate-200 hover:shadow-md'
              }`}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-[#0d968b] text-white text-[10px] font-bold uppercase">
                  Current Plan
                </Badge>
              )}
              {isRecommended && !isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-amber-500 text-white text-[10px] font-bold uppercase">
                  Recommended
                </Badge>
              )}

              <div className="mb-4">
                <h4 className="text-lg font-bold text-slate-900">{plan.label}</h4>
                {plan.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                )}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-slate-900">₱{plan.price_php}</span>
                <span className="text-sm text-slate-500">/buwan</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MessageSquare className="size-4 text-[#0d968b]" aria-hidden="true" />
                <span className="font-semibold">{plan.sms_limit.toLocaleString()}</span>
                <span className="text-slate-500">SMS per month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* GCash Payment Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h4 className="text-base font-bold text-slate-900 mb-4">Paano mag-subscribe</h4>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-[#0d968b]/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#0d968b]">1</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Pumili ng plan</p>
              <p className="text-xs text-slate-500">Piliin ang plan na bagay sa iyong laundromat.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-[#0d968b]/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#0d968b]">2</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Bayaran via GCash</p>
              <p className="text-xs text-slate-500">I-scan ang QR code</p>

              {/* GCash QR Code */}
              <div className="mt-3">
                <div className="w-40 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <Image
                    src="/gcash-qr.jpg"
                    alt="GCash QR Code para sa LaundryPing payment"
                    width={160}
                    height={280}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-[#0d968b]/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-[#0d968b]">3</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">I-send ang receipt</p>
              <p className="text-xs text-slate-500">
                I-send ang screenshot ng GCash receipt kasama ang email address na ginamit sa LaundryPing.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-[#0d968b]/10 flex items-center justify-center shrink-0">
              <CheckCircle className="size-4 text-[#0d968b]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Ma-activate ang plan mo</p>
              <p className="text-xs text-slate-500">
                Ia-activate ang plan mo within 24 hours pagkatapos ma-verify ang bayad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
