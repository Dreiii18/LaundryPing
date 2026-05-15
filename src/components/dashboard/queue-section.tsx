'use client';

import { useMemo } from 'react';
import { useJobActions } from '@/components/jobs-table/use-job-actions';
import { useHandlePrint } from '@/hooks/use-handle-print';
import { CancelDialog } from '@/components/jobs-table/cancel-dialog';
import { StartPhaseDialog } from '@/components/jobs-table/start-phase-dialog';
import { AssignMachineDialog } from '@/components/jobs-table/assign-machine-dialog';
import { QueueCard } from './queue-card';
import { ListTodo } from 'lucide-react';
import type { Job, ShopInfo } from '@/components/jobs-table/types';
import type { ServicePhaseConfigEntry } from '@/types/database';

interface QueueSectionProps {
  /** Queued jobs (status='pending') — what the section actually renders. */
  jobs: Job[];
  /** Full set of jobs the dashboard knows about (today + all open). Used to
   *  derive "is machine free" — must include in_progress jobs from other
   *  sections so the Ready/Waiting badge is accurate. */
  allJobs?: Job[];
  shopInfo?: ShopInfo;
  mobileTabMode?: boolean;
  /** Passed to useJobActions so dialog opens skip the /api/settings fetch. */
  servicePhaseConfig?: Record<string, ServicePhaseConfigEntry> | null;
}

export function QueueSection({ jobs, allJobs, shopInfo, mobileTabMode, servicePhaseConfig }: QueueSectionProps) {
  const actions = useJobActions(jobs, { servicePhaseConfig });
  const handlePrint = useHandlePrint(shopInfo);

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

  // Sort: Ready (pre-assigned + free) first, then Waiting (pre-assigned + busy),
  // then unassigned. Within each bucket, rush before normal, then FIFO.
  const sortedJobs = useMemo(() => {
    const readiness = (j: Job) => {
      const pending = (j.phases ?? []).find((p) => p.status === 'pending');
      if (!pending) return 3;
      if (!pending.machine_id) return 2; // unassigned
      return busyMachineIds.has(pending.machine_id) ? 1 : 0; // ready=0, waiting=1
    };
    return [...jobs].sort((a, b) => {
      const ra = readiness(a);
      const rb = readiness(b);
      if (ra !== rb) return ra - rb;
      if (a.priority === 'rush' && b.priority !== 'rush') return -1;
      if (a.priority !== 'rush' && b.priority === 'rush') return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [jobs, busyMachineIds]);

  return (
    <div className={`bg-white shadow-sm border border-[#0d968b]/10 overflow-hidden md:flex md:flex-col md:min-h-0 ${
      mobileTabMode ? 'rounded-b-xl border-t-0' : 'rounded-xl'
    }`}>
      {!mobileTabMode && (
        <div className="shrink-0 px-6 py-4 border-b border-[#0d968b]/5 flex items-center gap-2">
          <h4 className="font-bold text-slate-800">Queue</h4>
          {jobs.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {jobs.length}
            </span>
          )}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <ListTodo className="size-6 text-gray-400" aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-400">No jobs in queue</p>
        </div>
      ) : (
        <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto md:max-h-none md:flex-1 md:min-h-0 md:overflow-y-auto">
          {sortedJobs.map((job) => (
            <QueueCard
              key={job.id}
              job={job}
              shopInfo={shopInfo}
              completingId={actions.completingId}
              cancellingId={actions.cancellingId}
              phaseInFlight={actions.phaseInFlight}
              isMachineFree={isMachineFree}
              onStartPhase={actions.openStartPhaseDialog}
              onStartPhaseDirect={actions.startPhaseDirect}
              onAssignMachine={actions.openAssignMachineDialog}
              onCancel={actions.setCancelConfirmJobId}
              onPrint={handlePrint}
            />
          ))}
        </div>
      )}

      <CancelDialog
        cancelConfirmJobId={actions.cancelConfirmJobId}
        onConfirm={actions.handleCancelJob}
        onClose={() => actions.setCancelConfirmJobId(null)}
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
