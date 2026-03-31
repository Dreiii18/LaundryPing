'use client';

import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Clock, CircleX, CircleAlert, Printer } from 'lucide-react';
import type { Job, ShopInfo } from './types';

interface JobRowProps {
  job: Job;
  context: 'dashboard' | 'jobs-page';
  shopInfo?: ShopInfo;
  completingId: string | null;
  cancellingId: string | null;
  onMarkDone: (job: Job) => void;
  onCancelConfirm: (jobId: string) => void;
  onAssign: (jobId: string) => void;
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

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  });
};

export const JobRow = React.memo(function JobRow({
  job,
  context,
  shopInfo,
  completingId,
  cancellingId,
  onMarkDone,
  onCancelConfirm,
  onAssign,
  onPrint,
}: JobRowProps) {
  const isActionDisabled = completingId !== null || cancellingId !== null;

  return (
    <TableRow className="hover:bg-slate-50/50 transition-colors">
      <TableCell className="px-6 py-4">
        {job.claim_number != null ? (
          <span className="inline-flex items-center justify-center size-8 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
            #{job.claim_number}
          </span>
        ) : (
          <span className="text-slate-400 italic text-sm">--</span>
        )}
      </TableCell>
      {context === 'jobs-page' && (
        <TableCell className="px-6 py-4 text-sm text-slate-500 font-medium">
          {formatDate(job.started_at)}
        </TableCell>
      )}
      <TableCell className="px-6 py-4 text-sm font-bold text-slate-700">
        {job.machine ? job.machine.label : (
          <span className="text-slate-400 italic font-normal">Not assigned</span>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-slate-600">
        {job.services && job.services.length > 0 ? (
          <span>{job.services.join(', ')}</span>
        ) : (
          <span className="text-slate-400 italic">--</span>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-slate-600">
        <div>
          {job.customer_phone_masked || <span className="text-slate-400 italic">--</span>}
          {job.customer_name && (
            <div className="text-xs text-slate-400 mt-0.5">{job.customer_name}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-slate-600 font-medium">
        {job.pay_amount != null ? `₱${Number(job.pay_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-400 italic">--</span>}
      </TableCell>
      <TableCell className="px-6 py-4">
        {job.status === 'pending' ? (
          <Badge className="bg-blue-100 text-blue-700 border-transparent gap-1">
            <Clock className="size-3" aria-hidden="true" />
            Queued
          </Badge>
        ) : job.status === 'in_progress' && job.is_overdue ? (
          <Badge className="bg-red-100 text-red-700 border-transparent gap-1">
            <CircleAlert className="size-3" aria-hidden="true" />
            Overdue
          </Badge>
        ) : job.status === 'in_progress' ? (
          <Badge className="bg-amber-100 text-amber-700 border-transparent gap-1">
            <Clock className="size-3" aria-hidden="true" />
            In progress
          </Badge>
        ) : job.status === 'completed' ? (
          <Badge className="bg-[#0d968b]/10 text-[#0d968b] border-transparent gap-1">
            <CheckCircle className="size-3" aria-hidden="true" />
            Completed
          </Badge>
        ) : (
          <Badge className="bg-slate-100 text-slate-500 border-transparent gap-1">
            <CircleX className="size-3" aria-hidden="true" />
            Cancelled
          </Badge>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-slate-500 font-medium">
        {formatTime(job.started_at)}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm">
        {job.completed_at ? (
          <span className="text-slate-500 font-medium">
            {formatTime(job.completed_at)}
          </span>
        ) : (
          <span className="text-slate-400 italic">--</span>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 text-right">
        {['pending', 'in_progress'].includes(job.status) ? (
          <div className="inline-flex items-center gap-2 justify-end">
            {job.status === 'pending' && !job.machine_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssign(job.id)}
                disabled={isActionDisabled}
                aria-label="Assign machine"
                className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 min-h-11 min-w-11"
              >
                Assign
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkDone(job)}
              disabled={isActionDisabled}
              aria-label={`Mark ${job.machine?.label || 'job'} as done`}
              className="text-xs font-bold text-[#0d968b] border-[#0d968b]/20 hover:bg-[#0d968b]/10 min-h-11 min-w-11"
            >
              {completingId === job.id ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span className="ml-1">Sending...</span>
                </>
              ) : (
                'Mark done'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancelConfirm(job.id)}
              disabled={isActionDisabled}
              aria-label={`Cancel ${job.machine?.label || 'job'}`}
              className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 min-h-11 min-w-11"
            >
              {cancellingId === job.id ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span className="ml-1">Cancelling...</span>
                </>
              ) : (
                'Cancel'
              )}
            </Button>
            {shopInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrint(job)}
                aria-label="Print receipt"
                className="text-xs font-bold text-slate-500 border-slate-200 hover:bg-slate-50 min-h-11 min-w-11"
              >
                <Printer className="size-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 justify-end">
            {shopInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrint(job)}
                aria-label="Print receipt"
                className="text-xs font-bold text-slate-500 border-slate-200 hover:bg-slate-50 min-h-11 min-w-11"
              >
                <Printer className="size-3.5" />
                Print
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
});
