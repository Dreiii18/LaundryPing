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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, Clock, CircleX, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import { EmptyState } from '@/components/empty-state';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'ewallet', label: 'E-wallet' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const;

interface Job {
  id: string;
  machine_id: string;
  customer_phone_masked: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  sms_sent: boolean;
  notes: string | null;
  payment_method: string | null;
  pay_amount: number | null;
  is_paid: boolean;
  is_overdue: boolean;
  overdue_reason: string | null;
  machine: {
    id: string;
    label: string;
    type: string;
  } | null;
}

interface JobsTableProps {
  jobs: Job[];
  context?: 'dashboard' | 'jobs-page';
}

export type { Job };

export function JobsTable({ jobs: initialJobs, context = 'dashboard' }: JobsTableProps) {
  const router = useRouter();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelConfirmJobId, setCancelConfirmJobId] = useState<string | null>(null);
  const [payLaterJobId, setPayLaterJobId] = useState<string | null>(null);
  const [payLaterMethod, setPayLaterMethod] = useState('');
  const [overdueJobId, setOverdueJobId] = useState<string | null>(null);
  const [overdueReason, setOverdueReason] = useState('');

  const completeJob = async (jobId: string, options?: { payment_method?: string; overdue_reason?: string }) => {
    setCompletingId(jobId);

    try {
      const body: Record<string, string> = {};
      if (options?.payment_method) body.payment_method = options.payment_method;
      if (options?.overdue_reason) body.overdue_reason = options.overdue_reason;

      const res = await fetchWithAuth(`/api/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        toast.warning(data.message || 'SMS limit reached.');
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

  // Proceeds after overdue dialog (or skips it for non-overdue jobs)
  const proceedToPaymentOrComplete = (job: Job, overdueReasonText?: string) => {
    if (!job.is_paid) {
      // Open payment method dialog for pay-later jobs
      setPayLaterJobId(job.id);
      setPayLaterMethod('');
      // Store overdue reason temporarily to pass through payment dialog
      if (overdueReasonText) setOverdueReason(overdueReasonText);
    } else {
      completeJob(job.id, overdueReasonText ? { overdue_reason: overdueReasonText } : undefined);
    }
  };

  const handleMarkDone = (job: Job) => {
    if (job.is_overdue) {
      // Open overdue reason dialog first
      setOverdueJobId(job.id);
      setOverdueReason('');
    } else {
      proceedToPaymentOrComplete(job);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    setCancelConfirmJobId(null);
    setCancellingId(jobId);

    try {
      const res = await fetchWithAuth(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to cancel job');
        return;
      }

      toast.success('Job cancelled.');
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setCancellingId(null);
    }
  };

  const handleOverdueConfirm = () => {
    if (!overdueJobId || !overdueReason.trim()) return;
    const job = initialJobs.find((j) => j.id === overdueJobId);
    if (!job) return;
    const reason = overdueReason.trim();
    setOverdueJobId(null);
    proceedToPaymentOrComplete(job, reason);
  };

  const handlePayLaterConfirm = () => {
    if (!payLaterJobId || !payLaterMethod) return;
    const reason = overdueReason.trim() || undefined;
    setPayLaterJobId(null);
    completeJob(payLaterJobId, { payment_method: payLaterMethod, ...(reason && { overdue_reason: reason }) });
    setOverdueReason('');
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });
  };

  if (initialJobs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
        {context === 'dashboard' && (
          <div className="px-6 py-4 border-b border-[#0d968b]/5 flex items-center justify-between">
            <h4 className="font-bold text-slate-800">Today&apos;s Jobs</h4>
          </div>
        )}
        <EmptyState
          icon="jobs"
          title={context === 'jobs-page' ? 'No jobs found' : 'No jobs yet today'}
          description={context === 'jobs-page'
            ? 'Try adjusting your filters or date range to find jobs.'
            : 'Click "Start new job" in the top bar to get started with your first laundry job.'}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
      {context === 'dashboard' && (
        <div className="px-6 py-4 border-b border-[#0d968b]/5 flex items-center justify-between">
          <h4 className="font-bold text-slate-800">Today&apos;s Jobs</h4>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#0d968b] animate-pulse" />
            <span className="text-xs font-medium text-slate-500">Live</span>
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            {context === 'jobs-page' && (
              <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Date
              </TableHead>
            )}
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Machine
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Phone Number
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount
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
              {context === 'jobs-page' && (
                <TableCell className="px-6 py-4 text-sm text-slate-500 font-medium">
                  {formatDate(job.started_at)}
                </TableCell>
              )}
              <TableCell className="px-6 py-4 text-sm font-bold text-slate-700">
                {job.machine?.label || 'Unknown'}
              </TableCell>
              <TableCell className="px-6 py-4 text-sm text-slate-600">
                {job.customer_phone_masked || <span className="text-slate-400 italic">--</span>}
              </TableCell>
              <TableCell className="px-6 py-4 text-sm text-slate-600 font-medium">
                {job.pay_amount != null ? `₱${Number(job.pay_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-400 italic">--</span>}
              </TableCell>
              <TableCell className="px-6 py-4">
                {job.status === 'in_progress' && job.is_overdue ? (
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
                  <div className="inline-flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkDone(job)}
                      disabled={completingId !== null || cancellingId !== null}
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
                      onClick={() => setCancelConfirmJobId(job.id)}
                      disabled={completingId !== null || cancellingId !== null}
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
                  </div>
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

      {/* Overdue Reason Dialog */}
      <Dialog open={overdueJobId !== null} onOpenChange={(open) => { if (!open) { setOverdueJobId(null); setOverdueReason(''); } }}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#111817]">
              Job Overdue
            </DialogTitle>
            <DialogDescription className="text-[#618986]">
              This job was started on{' '}
              {(() => {
                const job = initialJobs.find((j) => j.id === overdueJobId);
                if (!job) return '';
                return new Date(job.started_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'Asia/Manila',
                });
              })()}
              . Please provide a reason for the delay.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="overdue-reason" className="text-sm font-semibold text-[#111817]">Reason</Label>
            <Textarea
              id="overdue-reason"
              value={overdueReason}
              onChange={(e) => setOverdueReason(e.target.value)}
              placeholder="e.g. Customer did not pick up on time, machine issue..."
              className="mt-2 min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOverdueJobId(null); setOverdueReason(''); }}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!overdueReason.trim()}
              onClick={handleOverdueConfirm}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Job Confirmation Dialog */}
      <AlertDialog open={cancelConfirmJobId !== null} onOpenChange={(open) => { if (!open) setCancelConfirmJobId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this job? No SMS will be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => { if (cancelConfirmJobId) handleCancelJob(cancelConfirmJobId); }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Method Dialog for Pay Later jobs */}
      <Dialog open={payLaterJobId !== null} onOpenChange={(open) => { if (!open) { setPayLaterJobId(null); setOverdueReason(''); } }}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#111817]">
              Collect Payment
            </DialogTitle>
            <DialogDescription className="text-[#618986]">
              Select the payment method used by the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="pay-later-method" className="text-sm font-semibold text-[#111817]">Payment Method</Label>
            <Select value={payLaterMethod} onValueChange={setPayLaterMethod}>
              <SelectTrigger id="pay-later-method" className="w-full h-12 mt-2">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPayLaterJobId(null)}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!payLaterMethod}
              onClick={handlePayLaterConfirm}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
            >
              Confirm & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
