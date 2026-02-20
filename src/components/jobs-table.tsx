'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Clock, CircleX, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';

interface Job {
  id: string;
  machine_id: string;
  customer_phone_masked: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  sms_sent: boolean;
  notes: string | null;
  machine: {
    id: string;
    label: string;
    type: string;
  } | null;
}

interface JobsTableProps {
  jobs: Job[];
}

export function JobsTable({ jobs: initialJobs }: JobsTableProps) {
  const router = useRouter();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleMarkDone = async (jobId: string) => {
    setCompletingId(jobId);

    try {
      const res = await fetch(`/api/jobs/${jobId}/complete`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to complete job');
        setCompletingId(null);
        return;
      }

      // Show toast based on response
      if (data.toastType === 'success') {
        toast.success(data.message || 'SMS sent to customer.');
      } else if (data.toastType === 'warning') {
        toast.warning(data.message || 'Free SMS limit reached.');
      } else if (data.toastType === 'error') {
        toast.error(data.message || 'SMS delivery failed. Please inform the customer manually.');
      }

      router.refresh();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setCompletingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });
  };

  const isOverdue = (job: Job) => {
    if (job.status !== 'in_progress') return false;
    const startedDate = new Date(job.started_at);
    const now = new Date();
    // Consider overdue if started before today (PH timezone)
    const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const phStarted = new Date(startedDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    return phStarted.toDateString() !== phNow.toDateString();
  };

  if (initialJobs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#0d968b]/5 flex items-center justify-between">
          <h4 className="font-bold text-slate-800">Today&apos;s Jobs</h4>
        </div>
        <EmptyState
          icon="jobs"
          title="No jobs yet today"
          description="Click &quot;Start new job&quot; in the top bar to get started with your first laundry job."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-[#0d968b]/5 flex items-center justify-between">
        <h4 className="font-bold text-slate-800">Today&apos;s Jobs</h4>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#0d968b] animate-pulse" />
          <span className="text-xs font-medium text-slate-500">Live</span>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Machine
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Phone Number
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Start Time
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Done Time
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialJobs.map((job) => (
            <TableRow key={job.id} className="hover:bg-slate-50/50 transition-colors">
              <TableCell className="px-6 py-4 text-sm font-bold text-slate-700">
                {job.machine?.label || 'Unknown'}
              </TableCell>
              <TableCell className="px-6 py-4 text-sm text-slate-600">
                {job.customer_phone_masked}
              </TableCell>
              <TableCell className="px-6 py-4">
                {job.status === 'in_progress' && isOverdue(job) ? (
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
                {job.status === 'in_progress' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkDone(job.id)}
                    disabled={completingId !== null}
                    aria-label={`Mark ${job.machine?.label || 'job'} as done`}
                    className="text-xs font-bold text-[#0d968b] border-[#0d968b]/20 hover:bg-[#0d968b]/10 min-h-[44px] min-w-[44px]"
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
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <CheckCircle className="size-4 text-slate-300" aria-hidden="true" />
                    Done
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
