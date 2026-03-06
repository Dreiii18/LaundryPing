'use client';

import { AlertTriangle, XCircle } from 'lucide-react';

interface SmsQuotaWarningProps {
  totalCredits: number;
}

export function SmsQuotaWarning({ totalCredits }: SmsQuotaWarningProps) {
  if (totalCredits > 10) return null;

  if (totalCredits === 0) {
    return (
      <div
        className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
        role="alert"
      >
        <XCircle className="size-5 text-red-600 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-red-800">No SMS credits</p>
          <p className="text-xs text-red-600">
            Buy credits to send SMS notifications. Jobs will still be tracked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-6 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
      role="alert"
    >
      <AlertTriangle className="size-5 text-amber-600 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-bold text-amber-800">Low SMS credits</p>
        <p className="text-xs text-amber-600">
          You have {totalCredits} SMS credit{totalCredits !== 1 ? 's' : ''} left. Buy a top-up pack to keep sending notifications.
        </p>
      </div>
    </div>
  );
}
