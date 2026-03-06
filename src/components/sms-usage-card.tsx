'use client';

import { BarChart3 } from 'lucide-react';

interface SmsUsageCardProps {
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
  daysUntilFreeReset: number;
}

export function SmsUsageCard({ freeCredits, paidCredits, totalCredits, daysUntilFreeReset }: SmsUsageCardProps) {
  const freePercentage = (freeCredits / 50) * 100;
  const barColor =
    totalCredits === 0
      ? 'bg-red-500'
      : totalCredits <= 10
        ? 'bg-amber-500'
        : 'bg-[#0d968b]';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#0d968b]/10">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">SMS credits available</p>
          <h3 className="text-2xl font-bold text-slate-900">
            {totalCredits}{' '}
            <span className="text-sm text-slate-400 font-normal">
              credits
            </span>
          </h3>
        </div>
        <BarChart3 className="size-6 text-[#0d968b]/40" />
      </div>
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-slate-500">Free credits</span>
          <span className="text-xs font-medium text-slate-500">{freeCredits} / 50</span>
        </div>
        <div
          role="progressbar"
          aria-label="Free SMS credits remaining"
          aria-valuenow={freeCredits}
          aria-valuemin={0}
          aria-valuemax={50}
          className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"
        >
          <div
            className={`${barColor} h-full rounded-full transition-all`}
            style={{ width: `${Math.min(freePercentage, 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-between items-center">
        <p className="text-xs text-slate-500">
          {freeCredits} free (resets in {daysUntilFreeReset} day{daysUntilFreeReset !== 1 ? 's' : ''})
          {paidCredits > 0 && <> + {paidCredits} purchased</>}
        </p>
      </div>
    </div>
  );
}
