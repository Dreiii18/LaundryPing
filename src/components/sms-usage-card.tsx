'use client';

import { BarChart3 } from 'lucide-react';

interface SmsUsageCardProps {
  used: number;
  limit: number;
  daysUntilReset: number;
  planName?: string;
}

export function SmsUsageCard({ used, limit, daysUntilReset, planName }: SmsUsageCardProps) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const barColor =
    percentage >= 100
      ? 'bg-red-500'
      : percentage >= 80
        ? 'bg-amber-500'
        : 'bg-[#0d968b]';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">
            SMS sent this month
            {planName && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#0d968b]/10 text-[#0d968b]">
                {planName}
              </span>
            )}
          </p>
          <h3 className="text-2xl font-bold text-slate-900">
            {used}{' '}
            <span className="text-sm text-slate-400 font-normal">
              / {limit} messages
            </span>
          </h3>
        </div>
        <BarChart3 className="size-6 text-[#0d968b]/40" />
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div
          className={`${barColor} h-full rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Plan resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
