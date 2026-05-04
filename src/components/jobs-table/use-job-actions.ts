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
  // Phase action state — replaces the old job-level "assign machine" dialog.
  // We track the JOB and the PHASE the user wants to start so the dialog can
  // filter the machine list by the phase's required machine_type.
  const [startPhaseJobId, setStartPhaseJobId] = useState<string | null>(null);
  const [startPhaseId, setStartPhaseId] = useState<string | null>(null);
  const [startPhaseType, setStartPhaseType] = useState<string>('');
  const [startPhaseMachineId, setStartPhaseMachineId] = useState('');
  const [startingPhase, setStartingPhase] = useState(false);
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [phaseInFlight, setPhaseInFlight] = useState<string | null>(null);

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

  /** Open the "start phase" dialog. Looks up machines compatible with the
   *  phase's required machine_type from settings.service_phase_config.
   *  If the phase needs no machine (e.g. Fold), starts it immediately
   *  without opening the dialog. */
  const openStartPhaseDialog = useCallback(async (jobId: string, phase: { id: string; phase_type: string }) => {
    // First: figure out the phase's required machine type so we know whether
    // a dialog is needed at all.
    let requiredType: string | null = null;
    try {
      const settingsRes = await fetchWithAuth('/api/settings');
      const settingsData = settingsRes.ok ? await settingsRes.json() : null;
      const phaseConfig = settingsData?.settings?.service_phase_config ?? {};
      requiredType = phaseConfig[phase.phase_type]?.machine_type ?? null;
    } catch {
      toast.error('Failed to load settings');
      return;
    }

    // Phase needs no machine — start it immediately.
    if (requiredType === null) {
      setPhaseInFlight(phase.id);
      try {
        const res = await fetchWithAuth(
          `/api/jobs/${jobId}/phases/${phase.id}/start`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to start phase');
          return;
        }
        toast.success(`${phase.phase_type} started.`);
        startTransition(() => router.refresh());
      } catch {
        toast.error('An unexpected error occurred');
      } finally {
        setPhaseInFlight(null);
      }
      return;
    }

    // Phase needs a machine — open the picker dialog.
    setStartPhaseJobId(jobId);
    setStartPhaseId(phase.id);
    setStartPhaseType(phase.phase_type);
    setStartPhaseMachineId('');
    setLoadingMachines(true);

    try {
      const url = `/api/machines?available=true&machine_type=${requiredType}&exclude_job=${jobId}`;
      const machinesRes = await fetchWithAuth(url);
      const machinesData = await machinesRes.json();
      setAvailableMachines(machinesData.machines || []);
    } catch {
      toast.error('Failed to load machines');
      setStartPhaseJobId(null);
      setStartPhaseId(null);
    } finally {
      setLoadingMachines(false);
    }
  }, [router, startTransition]);

  const handleStartPhase = useCallback(async () => {
    if (!startPhaseJobId || !startPhaseId || !startPhaseMachineId) return;
    setStartingPhase(true);

    try {
      const res = await fetchWithAuth(
        `/api/jobs/${startPhaseJobId}/phases/${startPhaseId}/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ machine_id: startPhaseMachineId }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to start phase');
        return;
      }

      toast.success(`${startPhaseType} started.`);
      setStartPhaseJobId(null);
      setStartPhaseId(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setStartingPhase(false);
    }
  }, [startPhaseJobId, startPhaseId, startPhaseMachineId, startPhaseType, router, startTransition]);

  const handleCompletePhase = useCallback(async (jobId: string, phase: { id: string; phase_type: string }) => {
    setPhaseInFlight(phase.id);
    try {
      const res = await fetchWithAuth(
        `/api/jobs/${jobId}/phases/${phase.id}/complete`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to complete phase');
        return;
      }
      toast.success(`${phase.phase_type} done.`);
      startTransition(() => router.refresh());
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setPhaseInFlight(null);
    }
  }, [router, startTransition]);

  const handleSkipPhase = useCallback(async (jobId: string, phase: { id: string; phase_type: string }) => {
    setPhaseInFlight(phase.id);
    try {
      const res = await fetchWithAuth(
        `/api/jobs/${jobId}/phases/${phase.id}/skip`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to skip phase');
        return;
      }
      toast.success(`${phase.phase_type} skipped.`);
      startTransition(() => router.refresh());
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setPhaseInFlight(null);
    }
  }, [router, startTransition]);

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
    // Phase actions (replaces job-level assign-machine)
    startPhaseJobId,
    setStartPhaseJobId,
    startPhaseId,
    setStartPhaseId,
    startPhaseType,
    startPhaseMachineId,
    setStartPhaseMachineId,
    startingPhase,
    availableMachines,
    loadingMachines,
    phaseInFlight,
    handleMarkDone,
    handleCancelJob,
    handleOverdueConfirm,
    handlePayLaterConfirm,
    openStartPhaseDialog,
    handleStartPhase,
    handleCompletePhase,
    handleSkipPhase,
  };
}
