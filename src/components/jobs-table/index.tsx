'use client';

import { useCallback } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useJobActions } from './use-job-actions';
import { JobRow } from './job-row';
import { OverdueDialog } from './overdue-dialog';
import { CancelDialog } from './cancel-dialog';
import { PaymentDialog } from './payment-dialog';
import { AssignDialog } from './assign-dialog';
import type { Job, JobsTableProps } from './types';

export type { Job };
export { type ShopInfo } from './types';

export function JobsTable({ jobs: initialJobs, context = 'dashboard', shopInfo }: JobsTableProps) {
  const actions = useJobActions(initialJobs);

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
              onMarkDone={actions.handleMarkDone}
              onCancelConfirm={actions.setCancelConfirmJobId}
              onAssign={actions.openAssignDialog}
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
