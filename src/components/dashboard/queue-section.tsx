'use client';

import { useCallback } from 'react';
import { useJobActions } from '@/components/jobs-table/use-job-actions';
import { CancelDialog } from '@/components/jobs-table/cancel-dialog';
import { AssignDialog } from '@/components/jobs-table/assign-dialog';
import { QueueCard } from './queue-card';
import { ListTodo } from 'lucide-react';
import type { Job, ShopInfo } from '@/components/jobs-table/types';

interface QueueSectionProps {
  jobs: Job[];
  shopInfo?: ShopInfo;
}

export function QueueSection({ jobs, shopInfo }: QueueSectionProps) {
  const actions = useJobActions(jobs);

  const handlePrint = useCallback(async (job: Job) => {
    if (!shopInfo) return;
    const { printReceipt } = await import('@/lib/utils/receipt');
    printReceipt({
      shopName: shopInfo.name,
      shopAddress: shopInfo.address,
      shopContact: shopInfo.contactNumber,
      claimNumber: job.claim_number,
      date: job.started_at,
      customerName: job.customer_name,
      customerPhone: job.customer_phone_masked,
      services: job.services,
      servicePrices: shopInfo.servicePrices,
      payAmount: job.pay_amount ?? 0,
      cashTendered: job.cash_tendered,
      isPaid: job.is_paid,
      paymentMethod: job.payment_method,
      paperSize: shopInfo.receiptPaperSize,
    });
  }, [shopInfo]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-[#0d968b]/5 flex items-center gap-2">
        <h4 className="font-bold text-slate-800">Queue</h4>
        {jobs.length > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {jobs.length}
          </span>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <ListTodo className="size-6 text-gray-400" aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-400">No jobs in queue</p>
        </div>
      ) : (
        <div className="p-3 space-y-2">
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
