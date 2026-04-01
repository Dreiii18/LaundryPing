'use client';

import { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import type { Job, Machine } from './types';

export function useJobActions(jobs: Job[]) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Ref to avoid re-creating callbacks when jobs array reference changes
  const jobsRef = useRef(jobs);
  useEffect(() => { jobsRef.current = jobs; }, [jobs]);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelConfirmJobId, setCancelConfirmJobId] = useState<string | null>(null);
  const [payLaterJobId, setPayLaterJobId] = useState<string | null>(null);
  const [payLaterMethod, setPayLaterMethod] = useState('');
  const [payLaterCashTendered, setPayLaterCashTendered] = useState('');
  const [overdueJobId, setOverdueJobId] = useState<string | null>(null);
  const [overdueReason, setOverdueReason] = useState('');
  const [assignJobId, setAssignJobId] = useState<string | null>(null);
  const [assignMachineId, setAssignMachineId] = useState('');
  const [assigningMachine, setAssigningMachine] = useState(false);
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);

  const completeJob = useCallback(async (jobId: string, options?: { payment_method?: string; cash_tendered?: number; overdue_reason?: string }) => {
    setCompletingId(jobId);

    try {
      const body: Record<string, string | number> = {};
      if (options?.payment_method) body.payment_method = options.payment_method;
      if (options?.cash_tendered != null) body.cash_tendered = options.cash_tendered;
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

      if (data.toastType === 'success') {
        toast.success(data.message || 'SMS sent to customer.');
      } else if (data.toastType === 'warning') {
        toast.warning(data.message || 'SMS limit reached.');
      } else if (data.toastType === 'error') {
        toast.error(data.message || 'SMS delivery failed. Please inform the customer manually.');
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setCompletingId(null);
    }
  }, [router, startTransition]);

  const proceedToPaymentOrComplete = useCallback((job: Job, overdueReasonText?: string) => {
    if (!job.is_paid) {
      setPayLaterJobId(job.id);
      setPayLaterMethod('');
      setPayLaterCashTendered('');
      if (overdueReasonText) setOverdueReason(overdueReasonText);
    } else {
      completeJob(job.id, overdueReasonText ? { overdue_reason: overdueReasonText } : undefined);
    }
  }, [completeJob]);

  const handleMarkDone = useCallback((job: Job) => {
    if (job.is_overdue) {
      setOverdueJobId(job.id);
      setOverdueReason('');
    } else {
      proceedToPaymentOrComplete(job);
    }
  }, [proceedToPaymentOrComplete]);

  const handleCancelJob = useCallback(async (jobId: string) => {
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
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setCancellingId(null);
    }
  }, [router, startTransition]);

  const handleOverdueConfirm = useCallback(() => {
    if (!overdueJobId || !overdueReason.trim()) return;
    const job = jobsRef.current.find((j) => j.id === overdueJobId);
    if (!job) return;
    const reason = overdueReason.trim();
    setOverdueJobId(null);
    proceedToPaymentOrComplete(job, reason);
  }, [overdueJobId, overdueReason, proceedToPaymentOrComplete]);

  const handlePayLaterConfirm = useCallback(() => {
    if (!payLaterJobId || !payLaterMethod) return;
    const reason = overdueReason.trim() || undefined;
    const cashTenderedNum = payLaterCashTendered ? parseFloat(payLaterCashTendered) : undefined;
    setPayLaterJobId(null);
    completeJob(payLaterJobId, {
      payment_method: payLaterMethod,
      ...(payLaterMethod === 'cash' && cashTenderedNum != null && !isNaN(cashTenderedNum) ? { cash_tendered: cashTenderedNum } : {}),
      ...(reason && { overdue_reason: reason }),
    });
    setOverdueReason('');
    setPayLaterCashTendered('');
  }, [payLaterJobId, payLaterMethod, payLaterCashTendered, overdueReason, completeJob]);

  const openAssignDialog = useCallback(async (jobId: string) => {
    setAssignJobId(jobId);
    setAssignMachineId('');
    setLoadingMachines(true);

    try {
      const machinesRes = await fetchWithAuth('/api/machines');
      const machinesData = await machinesRes.json();

      const activeMachineIds = new Set(
        jobsRef.current
          .filter((j) => ['pending', 'in_progress'].includes(j.status) && j.machine_id && j.id !== jobId)
          .map((j) => j.machine_id as string)
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
  }, []);

  const handleAssignMachine = useCallback(async () => {
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
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setAssigningMachine(false);
    }
  }, [assignJobId, assignMachineId, router, startTransition]);

  return {
    isPending,
    completingId,
    cancellingId,
    cancelConfirmJobId,
    setCancelConfirmJobId,
    payLaterJobId,
    setPayLaterJobId,
    payLaterMethod,
    setPayLaterMethod,
    payLaterCashTendered,
    setPayLaterCashTendered,
    overdueJobId,
    setOverdueJobId,
    overdueReason,
    setOverdueReason,
    assignJobId,
    setAssignJobId,
    assignMachineId,
    setAssignMachineId,
    assigningMachine,
    availableMachines,
    loadingMachines,
    handleMarkDone,
    handleCancelJob,
    handleOverdueConfirm,
    handlePayLaterConfirm,
    openAssignDialog,
    handleAssignMachine,
  };
}
