'use client';

import { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch';
import type { ServicePhaseConfigEntry } from '@/types/database';
import type { Job, Machine } from './types';

export interface UseJobActionsOptions {
  /** Per-laundromat phase config (from server-rendered page data). When
   *  provided, the hook uses it to derive required machine_type instead of
   *  fetching /api/settings on every dialog open. */
  servicePhaseConfig?: Record<string, ServicePhaseConfigEntry> | null;
}

export function useJobActions(jobs: Job[], options: UseJobActionsOptions = {}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const servicePhaseConfig = options.servicePhaseConfig ?? null;

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
  // Keyed by job_id (not phase_id) so a phase action on Job A doesn't disable
  // every other row's buttons. Use a Set for O(1) lookup per row.
  const [phaseInFlight, setPhaseInFlight] = useState<Set<string>>(() => new Set());

  const markPhaseInFlight = useCallback((jobId: string) => {
    setPhaseInFlight((prev) => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });
  }, []);

  const clearPhaseInFlight = useCallback((jobId: string) => {
    setPhaseInFlight((prev) => {
      if (!prev.has(jobId)) return prev;
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  }, []);

  // Assign-machine dialog (pre-assignment for queued phases — separate from
  // the start-phase dialog).
  const [assignMachineJobId, setAssignMachineJobId] = useState<string | null>(null);
  const [assignMachinePhaseId, setAssignMachinePhaseId] = useState<string | null>(null);
  const [assignMachinePhaseType, setAssignMachinePhaseType] = useState<string>('');
  const [assignMachineCurrentId, setAssignMachineCurrentId] = useState<string>('');
  const [assignMachineSelectedId, setAssignMachineSelectedId] = useState<string>('');
  const [assigningMachine, setAssigningMachine] = useState(false);

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
   *  phase's required machine_type from servicePhaseConfig (passed via props).
   *  Falls back to a one-shot /api/settings fetch only when no config was supplied. */
  const openStartPhaseDialog = useCallback(async (jobId: string, phase: { id: string; phase_type: string }) => {
    setStartPhaseJobId(jobId);
    setStartPhaseId(phase.id);
    setStartPhaseType(phase.phase_type);
    setStartPhaseMachineId('');
    setLoadingMachines(true);

    try {
      let requiredType: string | null;
      if (servicePhaseConfig) {
        requiredType = servicePhaseConfig[phase.phase_type]?.machine_type ?? null;
      } else {
        const settingsRes = await fetchWithAuth('/api/settings');
        const settingsData = settingsRes.ok ? await settingsRes.json() : null;
        const phaseConfig = settingsData?.settings?.service_phase_config ?? {};
        requiredType = phaseConfig[phase.phase_type]?.machine_type ?? null;
      }

      const url = requiredType
        ? `/api/machines?available=true&machine_type=${requiredType}&exclude_job=${jobId}`
        : `/api/machines?available=true&exclude_job=${jobId}`;
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
  }, [servicePhaseConfig]);

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

  /** 1-tap variant: start a phase that already has a pre-assigned machine.
   *  Sends an empty body — the server uses phase.machine_id (set previously
   *  via /assign-machine or POST /api/jobs phase_assignments). */
  const startPhaseDirect = useCallback(async (jobId: string, phase: { id: string; phase_type: string }) => {
    markPhaseInFlight(jobId);
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
      clearPhaseInFlight(jobId);
    }
  }, [router, startTransition, markPhaseInFlight, clearPhaseInFlight]);

  /** Open the pre-assign dialog (variant of start-phase for queued phases). */
  const openAssignMachineDialog = useCallback(async (jobId: string, phase: { id: string; phase_type: string; machine_id?: string | null }) => {
    setAssignMachineJobId(jobId);
    setAssignMachinePhaseId(phase.id);
    setAssignMachinePhaseType(phase.phase_type);
    setAssignMachineCurrentId(phase.machine_id ?? '');
    setAssignMachineSelectedId(phase.machine_id ?? '');
    setLoadingMachines(true);

    try {
      let requiredType: string | null;
      if (servicePhaseConfig) {
        requiredType = servicePhaseConfig[phase.phase_type]?.machine_type ?? null;
      } else {
        const settingsRes = await fetchWithAuth('/api/settings');
        const settingsData = settingsRes.ok ? await settingsRes.json() : null;
        const phaseConfig = settingsData?.settings?.service_phase_config ?? {};
        requiredType = phaseConfig[phase.phase_type]?.machine_type ?? null;
      }

      // For pre-assignment we want ALL active machines of the right type, not
      // only currently-free ones (operators want to plan ahead).
      const url = requiredType
        ? `/api/machines?machine_type=${requiredType}`
        : `/api/machines`;
      const machinesRes = await fetchWithAuth(url);
      const machinesData = await machinesRes.json();
      setAvailableMachines(machinesData.machines || []);
    } catch {
      toast.error('Failed to load machines');
      setAssignMachineJobId(null);
      setAssignMachinePhaseId(null);
    } finally {
      setLoadingMachines(false);
    }
  }, [servicePhaseConfig]);

  const handleAssignMachine = useCallback(async () => {
    if (!assignMachineJobId || !assignMachinePhaseId || !assignMachineSelectedId) return;
    setAssigningMachine(true);
    try {
      const res = await fetchWithAuth(
        `/api/jobs/${assignMachineJobId}/phases/${assignMachinePhaseId}/assign-machine`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ machine_id: assignMachineSelectedId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to assign machine');
        return;
      }
      toast.success(`${assignMachinePhaseType} pre-assigned.`);
      setAssignMachineJobId(null);
      setAssignMachinePhaseId(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setAssigningMachine(false);
    }
  }, [assignMachineJobId, assignMachinePhaseId, assignMachineSelectedId, assignMachinePhaseType, router, startTransition]);

  const handleUnassignMachine = useCallback(async () => {
    if (!assignMachineJobId || !assignMachinePhaseId) return;
    setAssigningMachine(true);
    try {
      const res = await fetchWithAuth(
        `/api/jobs/${assignMachineJobId}/phases/${assignMachinePhaseId}/assign-machine`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ machine_id: null }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to unassign machine');
        return;
      }
      toast.success(`${assignMachinePhaseType} unassigned.`);
      setAssignMachineJobId(null);
      setAssignMachinePhaseId(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setAssigningMachine(false);
    }
  }, [assignMachineJobId, assignMachinePhaseId, assignMachinePhaseType, router, startTransition]);

  const handleCompletePhase = useCallback(async (jobId: string, phase: { id: string; phase_type: string }) => {
    markPhaseInFlight(jobId);
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
      clearPhaseInFlight(jobId);
    }
  }, [router, startTransition, markPhaseInFlight, clearPhaseInFlight]);

  const handleSkipPhase = useCallback(async (jobId: string, phase: { id: string; phase_type: string }) => {
    markPhaseInFlight(jobId);
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
      clearPhaseInFlight(jobId);
    }
  }, [router, startTransition, markPhaseInFlight, clearPhaseInFlight]);

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
    // 1-tap start (for phases with pre-assigned machines)
    startPhaseDirect,
    // Pre-assign / unassign machine on a queued phase
    assignMachineJobId,
    setAssignMachineJobId,
    assignMachinePhaseId,
    setAssignMachinePhaseId,
    assignMachinePhaseType,
    assignMachineCurrentId,
    assignMachineSelectedId,
    setAssignMachineSelectedId,
    assigningMachine,
    openAssignMachineDialog,
    handleAssignMachine,
    handleUnassignMachine,
  };
}
