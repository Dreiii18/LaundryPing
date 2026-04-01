'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Loader2, Printer, MessageSquare } from 'lucide-react';
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

  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
      {/* Row 1: Claim number + priority */}
      <div className="flex items-center gap-2">
        {job.claim_number != null ? (
          <span className="inline-flex items-center justify-center size-7 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
            #{job.claim_number}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">--</span>
        )}
        {job.priority === 'rush' ? (
          <Badge className="bg-orange-100 text-orange-700 border-transparent gap-1 text-xs">
            <Flame className="size-3" aria-hidden="true" />
            Rush
          </Badge>
        ) : (
          <Badge className="bg-slate-100 text-slate-500 border-transparent text-xs">
            Normal
          </Badge>
        )}
      </div>

      {/* Row 2: Customer + services */}
      <div className="text-sm text-slate-600">
        {job.customer_name && (
          <span className="font-medium text-slate-700">{job.customer_name} · </span>
        )}
        {job.services.length > 0 ? job.services.join(', ') : '--'}
      </div>

      {/* SMS indicator */}
      {(job.notify_sms || job.notify_queue_sms) && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <MessageSquare className="size-3" />
          {job.notify_queue_sms && job.notify_sms
            ? 'Queue + Completion'
            : 'Completion only'}
        </div>
      )}

      {/* Row 3: Amount + actions */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {job.pay_amount != null
            ? `₱${Number(job.pay_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '--'}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAssign(job.id)}
            disabled={isActionDisabled}
            className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-2.5"
          >
            Assign
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(job.id)}
            disabled={isActionDisabled}
            className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 h-8 px-2.5"
          >
            {cancellingId === job.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              'Cancel'
            )}
          </Button>
          {shopInfo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPrint(job)}
              className="text-xs text-slate-500 border-slate-200 hover:bg-slate-50 h-8 px-2"
            >
              <Printer className="size-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
