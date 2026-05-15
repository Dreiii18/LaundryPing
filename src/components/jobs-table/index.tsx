'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useJobActions } from './use-job-actions';
import { useHandlePrint } from '@/hooks/use-handle-print';
import { JobRow } from './job-row';
import { OverdueDialog } from './overdue-dialog';
import { CancelDialog } from './cancel-dialog';
import { PaymentDialog } from './payment-dialog';
import { StartPhaseDialog } from './start-phase-dialog';
import { AssignMachineDialog } from './assign-machine-dialog';
import { useMemo } from 'react';
import type { Job, JobsTableProps } from './types';

export type { Job };
export { type ShopInfo } from './types';

export function JobsTable({ jobs: initialJobs, context = 'dashboard', shopInfo, servicePhaseConfig }: JobsTableProps) {
  const actions = useJobActions(initialJobs, { servicePhaseConfig });
  const handlePrint = useHandlePrint(shopInfo);

  // Pre-compute the set of machine_ids that are currently in_progress across
  // all visible jobs. Drives the Ready/Waiting badge on rows whose next
  // pending phase has a pre-assigned machine.
  const busyMachineIds = useMemo(() => {
    const set = new Set<string>();
    for (const j of initialJobs) {
      for (const p of j.phases ?? []) {
        if (p.status === 'in_progress' && p.machine_id) set.add(p.machine_id);
      }
    }
    return set;
  }, [initialJobs]);
  const isMachineFree = (machineId: string) => !busyMachineIds.has(machineId);

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
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              #
            </TableHead>
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
            <JobRow
              key={job.id}
              job={job}
              context={context}
              shopInfo={shopInfo}
              completingId={actions.completingId}
              cancellingId={actions.cancellingId}
              phaseInFlight={actions.phaseInFlight}
              isMachineFree={isMachineFree}
              onMarkDone={actions.handleMarkDone}
              onCancelConfirm={actions.setCancelConfirmJobId}
              onStartPhase={actions.openStartPhaseDialog}
              onStartPhaseDirect={actions.startPhaseDirect}
              onAssignMachine={actions.openAssignMachineDialog}
              onCompletePhase={actions.handleCompletePhase}
              onSkipPhase={actions.handleSkipPhase}
              onPrint={handlePrint}
            />
          ))}
        </TableBody>
      </Table>

      {/* Dialogs — only mounted when active */}
      <OverdueDialog
        overdueJobId={actions.overdueJobId}
        overdueReason={actions.overdueReason}
        jobs={initialJobs}
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
        payAmount={initialJobs.find((j) => j.id === actions.payLaterJobId)?.pay_amount ?? null}
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
