'use client';

import { useCallback } from 'react';
import { useJobActions } from '@/components/jobs-table/use-job-actions';
import { OverdueDialog } from '@/components/jobs-table/overdue-dialog';
import { CancelDialog } from '@/components/jobs-table/cancel-dialog';
import { PaymentDialog } from '@/components/jobs-table/payment-dialog';
import { EmptyState } from '@/components/empty-state';
import { TodaysJobsCard } from './todays-jobs-card';
import type { Job, ShopInfo } from '@/components/jobs-table/types';

interface TodaysJobsSectionProps {
  jobs: Job[];
  shopInfo?: ShopInfo;
}

export function TodaysJobsSection({ jobs, shopInfo }: TodaysJobsSectionProps) {
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
    });
  }, [shopInfo]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#0d968b]/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-[#0d968b]/5 flex items-center justify-between">
        <h4 className="font-bold text-slate-800">Today&apos;s Jobs</h4>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#0d968b] animate-pulse" />
          <span className="text-xs font-medium text-slate-500">Live</span>
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon="jobs"
          title="No jobs yet today"
          description="Click &quot;Start new job&quot; in the top bar to get started with your first laundry job."
        />
      ) : (
        <div className="p-3 space-y-2">
          {jobs.map((job) => (
            <TodaysJobsCard
              key={job.id}
              job={job}
              shopInfo={shopInfo}
              completingId={actions.completingId}
              cancellingId={actions.cancellingId}
              onMarkDone={actions.handleMarkDone}
              onCancel={actions.setCancelConfirmJobId}
              onPrint={handlePrint}
            />
          ))}
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
    </div>
  );
}
