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
import { Loader2, CheckCircle, Clock, CircleX, CircleAlert, Droplets, Wind } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import { EmptyState } from '@/components/empty-state';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'ewallet', label: 'E-wallet' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const;

interface Machine {
  id: string;
  label: string;
  type: string;
}

interface Job {
  id: string;
  machine_id: string | null;
  customer_phone_masked: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  sms_sent: boolean;
  notes: string | null;
  payment_method: string | null;
  pay_amount: number | null;
  is_paid: boolean;
  is_overdue: boolean;
  overdue_reason: string | null;
  services: string[];
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
  const [assignJobId, setAssignJobId] = useState<string | null>(null);
  const [assignMachineId, setAssignMachineId] = useState('');
  const [assigningMachine, setAssigningMachine] = useState(false);
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);

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

  const openAssignDialog = async (jobId: string) => {
    setAssignJobId(jobId);
    setAssignMachineId('');
    setLoadingMachines(true);

    try {
      const machinesRes = await fetchWithAuth('/api/machines');
      const machinesData = await machinesRes.json();

      const jobsRes = await fetchWithAuth('/api/jobs');
      const jobsData = await jobsRes.json();

      const activeMachineIds = new Set(
        (jobsData.jobs || [])
          .filter((j: { status: string; machine_id: string | null }) =>
            ['pending', 'in_progress'].includes(j.status) && j.machine_id
          )
          .map((j: { machine_id: string }) => j.machine_id)
      );

      const available = (machinesData.machines || []).filter(
        (m: Machine) => !activeMachineIds.has(m.id)
      );

      setAvailableMachines(available);
    } catch {
      toast.error('Failed to load machines');
      setAssignJobId(null);
    } finally {
      setLoadingMachines(false);
    }
  };

  const handleAssignMachine = async () => {
    if (!assignJobId || !assignMachineId) return;
    setAssigningMachine(true);

    try {
      const res = await fetchWithAuth(`/api/jobs/${assignJobId}/assign-machine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: assignMachineId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to assign machine');
        return;
      }

      toast.success('Machine assigned.');
      setAssignJobId(null);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setAssigningMachine(false);
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
              Services
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
                {job.customer_phone_masked || <span className="text-slate-400 italic">--</span>}
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
                        onClick={() => openAssignDialog(job.id)}
                        disabled={completingId !== null || cancellingId !== null}
                        aria-label="Assign machine"
                        className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 min-h-11 min-w-11"
                      >
                        Assign
                      </Button>
                    )}
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

      {/* Assign Machine Dialog */}
      <Dialog open={assignJobId !== null} onOpenChange={(open) => { if (!open) setAssignJobId(null); }}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#111817]">
              Assign Machine
            </DialogTitle>
            <DialogDescription className="text-[#618986]">
              Select a machine to assign to this job.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingMachines ? (
              <div className="h-12 flex items-center text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin mr-2" />
                Loading machines...
              </div>
            ) : availableMachines.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                No available machines right now.
              </div>
            ) : (
              <>
                <Label htmlFor="assign-machine" className="text-sm font-semibold text-[#111817]">Machine</Label>
                <Select value={assignMachineId} onValueChange={setAssignMachineId}>
                  <SelectTrigger id="assign-machine" className="w-full h-12 mt-2">
                    <SelectValue placeholder="Select a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMachines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          {m.type === 'washer' ? (
                            <Droplets className="size-4 text-blue-500" />
                          ) : (
                            <Wind className="size-4 text-orange-500" />
                          )}
                          <span>{m.label}</span>
                          <span className="text-slate-400 capitalize">({m.type})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAssignJobId(null)}
              className="min-h-11"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!assignMachineId || assigningMachine}
              onClick={handleAssignMachine}
              className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold min-h-11"
            >
              {assigningMachine ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Machine'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
