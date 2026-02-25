'use client';

import { AlertTriangle, XCircle } from 'lucide-react';

interface SmsQuotaWarningProps {
  used: number;
  limit: number;
}

export function SmsQuotaWarning({ used, limit }: SmsQuotaWarningProps) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  if (percentage < 80) return null;

  if (percentage >= 100) {
    return (
      <div
        className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
        role="alert"
      >
        <XCircle className="size-5 text-red-600 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-red-800">SMS limit reached</p>
          <p className="text-xs text-red-600">
            Jobs will still be tracked but SMS won&apos;t be sent. Inform customers manually.
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
        <p className="text-sm font-bold text-amber-800">Running low on SMS this month</p>
        <p className="text-xs text-amber-600">
          You have {Math.max(0, limit - used)} SMS left this month. Consider informing some customers manually.
        </p>
      </div>
    </div>
  );
}
