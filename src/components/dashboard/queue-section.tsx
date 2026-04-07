'use client';

import { useJobActions } from '@/components/jobs-table/use-job-actions';
import { useHandlePrint } from '@/hooks/use-handle-print';
import { CancelDialog } from '@/components/jobs-table/cancel-dialog';
import { AssignDialog } from '@/components/jobs-table/assign-dialog';
import { QueueCard } from './queue-card';
import { ListTodo } from 'lucide-react';
import type { Job, ShopInfo } from '@/components/jobs-table/types';

interface QueueSectionProps {
  jobs: Job[];
  shopInfo?: ShopInfo;
  mobileTabMode?: boolean;
}

export function QueueSection({ jobs, shopInfo, mobileTabMode }: QueueSectionProps) {
  const actions = useJobActions(jobs);
  const handlePrint = useHandlePrint(shopInfo);

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
          {jobs.map((job) => (
            <QueueCard
              key={job.id}
              job={job}
              shopInfo={shopInfo}
              completingId={actions.completingId}
              cancellingId={actions.cancellingId}
              onAssign={actions.openAssignDialog}
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
      <AssignDialog
        assignJobId={actions.assignJobId}
        assignMachineId={actions.assignMachineId}
        assigningMachine={actions.assigningMachine}
        availableMachines={actions.availableMachines}
        loadingMachines={actions.loadingMachines}
        onMachineChange={actions.setAssignMachineId}
        onConfirm={actions.handleAssignMachine}
        onClose={() => actions.setAssignJobId(null)}
      />
    </div>
  );
}
