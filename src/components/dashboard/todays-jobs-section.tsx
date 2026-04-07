'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useJobActions } from '@/components/jobs-table/use-job-actions';
import { useHandlePrint } from '@/hooks/use-handle-print';
import { OverdueDialog } from '@/components/jobs-table/overdue-dialog';
import { CancelDialog } from '@/components/jobs-table/cancel-dialog';
import { PaymentDialog } from '@/components/jobs-table/payment-dialog';
import { EmptyState } from '@/components/empty-state';
import { TodaysJobsCard } from './todays-jobs-card';
import type { Job, ShopInfo } from '@/components/jobs-table/types';

interface TodaysJobsSectionProps {
  jobs: Job[];
  shopInfo?: ShopInfo;
  mobileTabMode?: boolean;
}

export function TodaysJobsSection({ jobs, shopInfo, mobileTabMode }: TodaysJobsSectionProps) {
  const actions = useJobActions(jobs);
  const handlePrint = useHandlePrint(shopInfo);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const activeJobs = jobs.filter((j) => j.status === 'in_progress');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const cancelledJobs = jobs.filter((j) => j.status === 'cancelled');

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
              onMarkDone={actions.handleMarkDone}
              onCancel={actions.setCancelConfirmJobId}
              onPrint={handlePrint}
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
                  onMarkDone={actions.handleMarkDone}
                  onCancel={actions.setCancelConfirmJobId}
                  onPrint={handlePrint}
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
                  onMarkDone={actions.handleMarkDone}
                  onCancel={actions.setCancelConfirmJobId}
                  onPrint={handlePrint}
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
    </div>
  );
}
