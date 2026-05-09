'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useJobActions } from '@/components/jobs-table/use-job-actions';
import { useHandlePrint } from '@/hooks/use-handle-print';
import { OverdueDialog } from '@/components/jobs-table/overdue-dialog';
import { CancelDialog } from '@/components/jobs-table/cancel-dialog';
import { PaymentDialog } from '@/components/jobs-table/payment-dialog';
import { StartPhaseDialog } from '@/components/jobs-table/start-phase-dialog';
import { AssignMachineDialog } from '@/components/jobs-table/assign-machine-dialog';
import { EmptyState } from '@/components/empty-state';
import { TodaysJobsCard } from './todays-jobs-card';
import type { Job, ShopInfo } from '@/components/jobs-table/types';

interface TodaysJobsSectionProps {
  jobs: Job[];
  /** Optional broader job list (today + queue) for cross-section "is machine free" derivation. */
  allJobs?: Job[];
  shopInfo?: ShopInfo;
  mobileTabMode?: boolean;
}

export function TodaysJobsSection({ jobs, allJobs, shopInfo, mobileTabMode }: TodaysJobsSectionProps) {
  const actions = useJobActions(jobs);
  const handlePrint = useHandlePrint(shopInfo);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const busyMachineIds = useMemo(() => {
    const set = new Set<string>();
    const source = allJobs ?? jobs;
    for (const j of source) {
      for (const p of j.phases ?? []) {
        if (p.status === 'in_progress' && p.machine_id) set.add(p.machine_id);
      }
    }
    return set;
  }, [allJobs, jobs]);
  const isMachineFree = (machineId: string) => !busyMachineIds.has(machineId);

  // ready_for_pickup is part of the active workflow (waiting on operator
  // to notify the customer + complete) — render it like in_progress.
  const activeJobsRaw = jobs.filter((j) => j.status === 'in_progress' || j.status === 'ready_for_pickup');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const cancelledJobs = jobs.filter((j) => j.status === 'cancelled');

  // Sort active jobs so the operator sees the most actionable items first:
  // Active phase running > pre-assigned + machine free (Ready) > pre-assigned + busy >
  // unassigned > ready_for_pickup. Within each bucket, oldest first.
  const activeJobs = useMemo(() => {
    const bucket = (j: Job): number => {
      if (j.status === 'ready_for_pickup') return 4;
      const phases = j.phases ?? [];
      if (phases.find((p) => p.status === 'in_progress')) return 0;
      const next = phases.find((p) => p.status === 'pending');
      if (!next) return 4;
      if (!next.machine_id) return 3;
      return busyMachineIds.has(next.machine_id) ? 2 : 1;
    };
    return [...activeJobsRaw].sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
    });
  }, [activeJobsRaw, busyMachineIds]);

  return (
    <div className={`bg-white shadow-sm border border-[#0d968b]/10 overflow-hidden md:flex md:flex-col md:min-h-0 ${
      mobileTabMode ? 'rounded-b-xl border-t-0' : 'rounded-xl'
    }`}>
      {!mobileTabMode && (
        <div className="shrink-0 px-6 py-4 border-b border-[#0d968b]/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800">Today&apos;s Jobs</h4>
            {activeJobs.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#0d968b]/10 text-[#0d968b] text-xs font-bold">
                {activeJobs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#0d968b] animate-pulse" />
            <span className="text-xs font-medium text-slate-500">Live</span>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState
          icon="jobs"
          title="No jobs yet today"
          description="Click &quot;Start new job&quot; in the top bar to get started with your first laundry job."
        />
      ) : (
        <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto md:max-h-none md:flex-1 md:min-h-0 md:overflow-y-auto">
          {activeJobs.map((job) => (
            <TodaysJobsCard
              key={job.id}
              job={job}
              shopInfo={shopInfo}
              completingId={actions.completingId}
              cancellingId={actions.cancellingId}
              phaseInFlight={actions.phaseInFlight}
              isMachineFree={isMachineFree}
              onMarkDone={actions.handleMarkDone}
              onCancel={actions.setCancelConfirmJobId}
              onPrint={handlePrint}
              onStartPhase={actions.openStartPhaseDialog}
              onStartPhaseDirect={actions.startPhaseDirect}
              onAssignMachine={actions.openAssignMachineDialog}
              onCompletePhase={actions.handleCompletePhase}
              onSkipPhase={actions.handleSkipPhase}
            />
          ))}

          {completedJobs.length > 0 && (
            <>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-1.5 w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showCompleted ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                {completedJobs.length} completed
              </button>
              {showCompleted && completedJobs.map((job) => (
                <TodaysJobsCard
                  key={job.id}
                  job={job}
                  shopInfo={shopInfo}
                  completingId={actions.completingId}
                  cancellingId={actions.cancellingId}
                  phaseInFlight={actions.phaseInFlight}
                  isMachineFree={isMachineFree}
                  onMarkDone={actions.handleMarkDone}
                  onCancel={actions.setCancelConfirmJobId}
                  onPrint={handlePrint}
                  onStartPhase={actions.openStartPhaseDialog}
                  onStartPhaseDirect={actions.startPhaseDirect}
                  onAssignMachine={actions.openAssignMachineDialog}
                  onCompletePhase={actions.handleCompletePhase}
                  onSkipPhase={actions.handleSkipPhase}
                />
              ))}
            </>
          )}

          {cancelledJobs.length > 0 && (
            <>
              <button
                onClick={() => setShowCancelled(!showCancelled)}
                className="flex items-center gap-1.5 w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showCancelled ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                {cancelledJobs.length} cancelled
              </button>
              {showCancelled && cancelledJobs.map((job) => (
                <TodaysJobsCard
                  key={job.id}
                  job={job}
                  shopInfo={shopInfo}
                  completingId={actions.completingId}
                  cancellingId={actions.cancellingId}
                  phaseInFlight={actions.phaseInFlight}
                  isMachineFree={isMachineFree}
                  onMarkDone={actions.handleMarkDone}
                  onCancel={actions.setCancelConfirmJobId}
                  onPrint={handlePrint}
                  onStartPhase={actions.openStartPhaseDialog}
                  onStartPhaseDirect={actions.startPhaseDirect}
                  onAssignMachine={actions.openAssignMachineDialog}
                  onCompletePhase={actions.handleCompletePhase}
                  onSkipPhase={actions.handleSkipPhase}
                />
              ))}
            </>
          )}
        </div>
      )}

      <OverdueDialog
        overdueJobId={actions.overdueJobId}
        overdueReason={actions.overdueReason}
        jobs={jobs}
        onReasonChange={actions.setOverdueReason}
        onConfirm={actions.handleOverdueConfirm}
        onClose={() => { actions.setOverdueJobId(null); actions.setOverdueReason(''); }}
      />
      <CancelDialog
        cancelConfirmJobId={actions.cancelConfirmJobId}
        onConfirm={actions.handleCancelJob}
        onClose={() => actions.setCancelConfirmJobId(null)}
      />
      <PaymentDialog
        payLaterJobId={actions.payLaterJobId}
        payLaterMethod={actions.payLaterMethod}
        payLaterCashTendered={actions.payLaterCashTendered}
        payAmount={jobs.find((j) => j.id === actions.payLaterJobId)?.pay_amount ?? null}
        onMethodChange={actions.setPayLaterMethod}
        onCashTenderedChange={actions.setPayLaterCashTendered}
        onConfirm={actions.handlePayLaterConfirm}
        onClose={() => { actions.setPayLaterJobId(null); actions.setOverdueReason(''); }}
      />
      <StartPhaseDialog
        open={actions.startPhaseJobId !== null}
        phaseType={actions.startPhaseType}
        machineId={actions.startPhaseMachineId}
        starting={actions.startingPhase}
        availableMachines={actions.availableMachines}
        loadingMachines={actions.loadingMachines}
        onMachineChange={actions.setStartPhaseMachineId}
        onConfirm={actions.handleStartPhase}
        onClose={() => { actions.setStartPhaseJobId(null); actions.setStartPhaseId(null); }}
      />
      <AssignMachineDialog
        open={actions.assignMachineJobId !== null}
        phaseType={actions.assignMachinePhaseType}
        machineId={actions.assignMachineSelectedId}
        saving={actions.assigningMachine}
        availableMachines={actions.availableMachines}
        loadingMachines={actions.loadingMachines}
        hasExistingAssignment={!!actions.assignMachineCurrentId}
        onMachineChange={actions.setAssignMachineSelectedId}
        onConfirm={actions.handleAssignMachine}
        onUnassign={actions.handleUnassignMachine}
        onClose={() => { actions.setAssignMachineJobId(null); actions.setAssignMachinePhaseId(null); }}
      />
    </div>
  );
}
