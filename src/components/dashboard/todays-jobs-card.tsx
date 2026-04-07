'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, MessageSquare } from 'lucide-react';
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

const formatAmount = (amount: number | null) => {
  if (amount == null) return null;
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getBorderColor = (job: Job) => {
  if (job.status === 'in_progress' && job.is_overdue) return 'border-l-red-500';
  if (job.status === 'in_progress') return 'border-l-amber-400';
  if (job.status === 'completed') return 'border-l-[#0d968b]';
  return 'border-l-slate-200'; // cancelled — greyed out
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
  const isActive = job.status === 'in_progress';
  const borderColor = getBorderColor(job);
  const amount = formatAmount(job.pay_amount);

  // Secondary info fragments
  const secondaryParts: string[] = [];
  if (job.claim_number != null) secondaryParts.push(`#${job.claim_number}`);
  if (job.machine) secondaryParts.push(job.machine.label);
  else secondaryParts.push('No machine');
  if (job.customer_name) secondaryParts.push(job.customer_name);

  // Compact row for completed/cancelled jobs
  if (!isActive) {
    return <CompactJobRow job={job} shopInfo={shopInfo} amount={amount} borderColor={borderColor} secondaryParts={secondaryParts} onPrint={onPrint} formatTime={formatTime} />;
  }

  // Full card for active (in_progress) jobs
  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 ${borderColor} p-3 space-y-2`}>
      {/* Row 1: Service type (primary) + amount */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-bold text-slate-800">
          {job.services.length > 0 ? job.services.join(', ') : '--'}
        </span>
        {amount && (
          <span className={`text-xs shrink-0 ${job.is_paid ? 'text-[#0d968b]' : 'text-amber-600'}`}>
            {amount} — {job.is_paid ? 'paid' : 'unpaid'}
          </span>
        )}
      </div>

      {/* Row 2: Secondary info + time + SMS */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
        <span>{secondaryParts.join(' · ')}</span>
        <span>·</span>
        <span>{formatTime(job.started_at)}</span>
        {job.sms_sent && (
          <span className="flex items-center gap-0.5 text-[#0d968b]">
            <MessageSquare className="size-3" />
            Sent
          </span>
        )}
        {job.is_overdue && (
          <span className="text-red-600 font-medium">· Overdue</span>
        )}
      </div>

      {/* Row 3: Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onMarkDone(job)}
          disabled={isActionDisabled}
          className="text-xs font-bold bg-[#0d968b] hover:bg-[#0b7f75] text-white h-8 px-4"
        >
          {completingId === job.id ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            'Done'
          )}
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
            className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0 ml-auto"
          >
            <Printer className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CompactJobRow({
  job,
  shopInfo,
  amount,
  borderColor,
  secondaryParts,
  onPrint,
  formatTime: fmtTime,
}: {
  job: Job;
  shopInfo?: ShopInfo;
  amount: string | null;
  borderColor: string;
  secondaryParts: string[];
  onPrint: (job: Job) => void;
  formatTime: (dateStr: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCancelled = job.status === 'cancelled';
  const services = job.services.length > 0 ? job.services.join(', ') : '--';

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`rounded-lg border border-slate-100 border-l-4 ${borderColor} px-3 py-2 cursor-pointer ${isCancelled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${expanded ? '' : 'truncate'} ${isCancelled ? 'text-slate-400' : 'font-semibold text-slate-700'}`}>
              {services}
            </span>
            {amount && (
              <span className={`text-xs shrink-0 ${isCancelled ? 'line-through text-slate-400' : job.is_paid ? 'text-[#0d968b]' : 'text-amber-600'}`}>
                {amount}
              </span>
            )}
            {isCancelled && (
              <span className="text-xs text-slate-400 shrink-0">cancelled</span>
            )}
          </div>
          <div className={`text-xs text-slate-400 ${expanded ? '' : 'truncate'}`}>
            {secondaryParts.join(' · ')} · {fmtTime(job.started_at)}
            {job.sms_sent && ' · SMS sent'}
          </div>
        </div>
        {shopInfo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onPrint(job); }}
            className="text-slate-300 hover:text-slate-500 h-7 w-7 p-0 shrink-0"
          >
            <Printer className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
