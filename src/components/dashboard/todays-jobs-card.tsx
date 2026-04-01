'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, CircleX, CircleAlert, Loader2, Printer, MessageSquare } from 'lucide-react';
import type { Job, ShopInfo } from '@/components/jobs-table/types';

interface TodaysJobsCardProps {
  job: Job;
  shopInfo?: ShopInfo;
  completingId: string | null;
  cancellingId: string | null;
  onMarkDone: (job: Job) => void;
  onCancel: (jobId: string) => void;
  onPrint: (job: Job) => void;
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
};

export function TodaysJobsCard({
  job,
  shopInfo,
  completingId,
  cancellingId,
  onMarkDone,
  onCancel,
  onPrint,
}: TodaysJobsCardProps) {
  const isActionDisabled = completingId !== null || cancellingId !== null;
  const isActive = ['in_progress'].includes(job.status);

  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
      {/* Row 1: Claim number + machine */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.claim_number != null ? (
            <span className="inline-flex items-center justify-center size-7 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
              #{job.claim_number}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">--</span>
          )}
          <span className="text-sm font-bold text-slate-700">
            {job.machine ? job.machine.label : <span className="text-slate-400 italic font-normal">No machine</span>}
          </span>
        </div>
        {job.customer_name && (
          <span className="text-xs text-slate-400">{job.customer_name}</span>
        )}
      </div>

      {/* Row 2: Services + amount */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">
          {job.services.length > 0 ? job.services.join(', ') : '--'}
        </span>
        <span className="font-medium text-slate-700">
          {job.pay_amount != null
            ? `₱${Number(job.pay_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '--'}
        </span>
      </div>

      {/* Row 3: Status + time + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.status === 'in_progress' && job.is_overdue ? (
            <Badge className="bg-red-100 text-red-700 border-transparent gap-1 text-xs">
              <CircleAlert className="size-3" aria-hidden="true" />
              Overdue
            </Badge>
          ) : job.status === 'in_progress' ? (
            <Badge className="bg-amber-100 text-amber-700 border-transparent gap-1 text-xs">
              <Clock className="size-3" aria-hidden="true" />
              In progress
            </Badge>
          ) : job.status === 'completed' ? (
            <Badge className="bg-[#0d968b]/10 text-[#0d968b] border-transparent gap-1 text-xs">
              <CheckCircle className="size-3" aria-hidden="true" />
              Completed
            </Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-500 border-transparent gap-1 text-xs">
              <CircleX className="size-3" aria-hidden="true" />
              Cancelled
            </Badge>
          )}
          <span className="text-xs text-slate-400">
            {formatTime(job.started_at)}
          </span>
          {job.sms_sent ? (
            <span className="flex items-center gap-0.5 text-xs text-[#0d968b]">
              <MessageSquare className="size-3" />
              Sent
            </span>
          ) : job.notify_sms && job.status === 'in_progress' ? (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <MessageSquare className="size-3" />
              On completion
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkDone(job)}
                disabled={isActionDisabled}
                className="text-xs font-bold text-[#0d968b] border-[#0d968b]/20 hover:bg-[#0d968b]/10 h-8 px-2.5"
              >
                {completingId === job.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  'Done'
                )}
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
            </>
          )}
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
