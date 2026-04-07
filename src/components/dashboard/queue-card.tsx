'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Loader2, Printer } from 'lucide-react';
import type { Job, ShopInfo } from '@/components/jobs-table/types';

interface QueueCardProps {
  job: Job;
  shopInfo?: ShopInfo;
  completingId: string | null;
  cancellingId: string | null;
  onAssign: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onPrint: (job: Job) => void;
}

export function QueueCard({
  job,
  shopInfo,
  completingId,
  cancellingId,
  onAssign,
  onCancel,
  onPrint,
}: QueueCardProps) {
  const isActionDisabled = completingId !== null || cancellingId !== null;

  // Secondary info fragments
  const secondaryParts: string[] = [];
  if (job.claim_number != null) secondaryParts.push(`#${job.claim_number}`);
  if (job.customer_name) secondaryParts.push(job.customer_name);
  if (job.pay_amount != null) {
    secondaryParts.push(`₱${Number(job.pay_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }

  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 ${job.priority === 'rush' ? 'border-l-orange-400' : 'border-l-blue-400'} p-3 space-y-2`}>
      {/* Row 1: Service type (primary) + rush badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-800">
          {job.services.length > 0 ? job.services.join(', ') : '--'}
        </span>
        {job.priority === 'rush' && (
          <Badge className="bg-orange-100 text-orange-700 border-transparent gap-1 text-xs shrink-0">
            <Flame className="size-3" aria-hidden="true" />
            Rush
          </Badge>
        )}
      </div>

      {/* Row 2: Metadata + actions */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400 truncate">
          {secondaryParts.join(' · ')}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={() => onAssign(job.id)}
            disabled={isActionDisabled}
            className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-7 px-3"
          >
            Assign
          </Button>
          <button
            onClick={() => onCancel(job.id)}
            disabled={isActionDisabled}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 px-1"
          >
            {cancellingId === job.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              'Cancel'
            )}
          </button>
          {shopInfo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPrint(job)}
              className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0"
            >
              <Printer className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
