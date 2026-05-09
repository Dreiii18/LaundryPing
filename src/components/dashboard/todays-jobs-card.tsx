'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, MessageSquare, Bell, Check, Play, SkipForward, Pencil, Clock } from 'lucide-react';
import type { Job, JobPhase, ShopInfo } from '@/components/jobs-table/types';

interface TodaysJobsCardProps {
  job: Job;
  shopInfo?: ShopInfo;
  completingId: string | null;
  cancellingId: string | null;
  phaseInFlight: string | null;
  isMachineFree?: (machineId: string) => boolean;
  onMarkDone: (job: Job) => void;
  onCancel: (jobId: string) => void;
  onPrint: (job: Job) => void;
  onStartPhase: (jobId: string, phase: { id: string; phase_type: string }) => void;
  onStartPhaseDirect: (jobId: string, phase: { id: string; phase_type: string }) => void;
  onAssignMachine: (jobId: string, phase: { id: string; phase_type: string; machine_id?: string | null }) => void;
  onCompletePhase: (jobId: string, phase: { id: string; phase_type: string }) => void;
  onSkipPhase: (jobId: string, phase: { id: string; phase_type: string }) => void;
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
};

const formatAmount = (amount: number | null) => {
  if (amount == null) return null;
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getBorderColor = (job: Job) => {
  if (job.status === 'in_progress' && job.is_overdue) return 'border-l-red-500';
  if (job.status === 'in_progress') return 'border-l-amber-400';
  if (job.status === 'ready_for_pickup') return 'border-l-teal-500';
  if (job.status === 'completed') return 'border-l-[#0d968b]';
  return 'border-l-slate-200';
};

function PhaseChip({ phase }: { phase: JobPhase }) {
  const base = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border';
  if (phase.status === 'completed') {
    return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}><Check className="size-2.5" />{phase.phase_type}</span>;
  }
  if (phase.status === 'in_progress') {
    return <span className={`${base} bg-amber-50 text-amber-800 border-amber-300`}><span className="size-1 rounded-full bg-amber-500 animate-pulse" />{phase.phase_type}{phase.machine ? ` · ${phase.machine.label}` : ''}</span>;
  }
  if (phase.status === 'skipped') {
    return <span className={`${base} bg-slate-50 text-slate-400 border-slate-200 line-through`}>{phase.phase_type}</span>;
  }
  // pending — show pre-assigned machine label if any
  return <span className={`${base} bg-slate-50 text-slate-500 border-slate-200`}><span className="size-1 rounded-full bg-slate-300" />{phase.phase_type}{phase.machine ? ` · ${phase.machine.label}` : ''}</span>;
}

export function TodaysJobsCard({
  job,
  shopInfo,
  completingId,
  cancellingId,
  phaseInFlight,
  isMachineFree,
  onMarkDone,
  onCancel,
  onPrint,
  onStartPhase,
  onStartPhaseDirect,
  onAssignMachine,
  onCompletePhase,
  onSkipPhase,
}: TodaysJobsCardProps) {
  const isActionDisabled = completingId !== null || cancellingId !== null || phaseInFlight !== null;
  const isOpen = job.status === 'in_progress' || job.status === 'ready_for_pickup';
  const borderColor = getBorderColor(job);
  const amount = formatAmount(job.pay_amount);

  const phases = (job.phases ?? []).slice().sort((a, b) => a.sequence - b.sequence);
  const activePhase = phases.find((p) => p.status === 'in_progress') ?? null;
  const nextPendingPhase = phases.find((p) => p.status === 'pending') ?? null;
  const preassignedMachineId = nextPendingPhase?.machine_id ?? null;
  const preassignedMachineLabel = nextPendingPhase?.machine?.label ?? null;
  const preassignedFree =
    preassignedMachineId && isMachineFree ? isMachineFree(preassignedMachineId) : null;

  // Secondary info: claim# + customer name (machine label is now inside the phase strip)
  const secondaryParts: string[] = [];
  if (job.claim_number != null) secondaryParts.push(`#${job.claim_number}`);
  if (phases.length === 0 && job.machine) secondaryParts.push(job.machine.label);
  if (job.customer_name) secondaryParts.push(job.customer_name);

  // Compact row for completed/cancelled jobs
  if (!isOpen) {
    return <CompactJobRow job={job} shopInfo={shopInfo} amount={amount} borderColor={borderColor} secondaryParts={secondaryParts} onPrint={onPrint} formatTime={formatTime} />;
  }

  // Full card for active (in_progress / ready_for_pickup) jobs
  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 ${borderColor} p-3 space-y-2`}>
      {/* Row 1: Service type (primary) + amount */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-bold text-slate-800">
          {job.services.length > 0 ? job.services.join(', ') : '--'}
        </span>
        {amount && (
          <span className={`text-xs shrink-0 ${job.is_paid ? 'text-[#0d968b]' : 'text-amber-600'}`}>
            {amount} — {job.is_paid ? 'paid' : 'unpaid'}
          </span>
        )}
      </div>

      {/* Phase strip (when phases exist) */}
      {phases.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {phases.map((p) => <PhaseChip key={p.id} phase={p} />)}
        </div>
      )}

      {/* Row 2: Secondary info + time + SMS */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
        {secondaryParts.length > 0 && <span>{secondaryParts.join(' · ')}</span>}
        {secondaryParts.length > 0 && <span>·</span>}
        <span>{formatTime(job.started_at)}</span>
        {job.sms_sent && (
          <span className="flex items-center gap-0.5 text-[#0d968b]">
            <MessageSquare className="size-3" />
            Sent
          </span>
        )}
        {job.is_overdue && (
          <span className="text-red-600 font-medium">· Overdue</span>
        )}
      </div>

      {/* Row 3: Phase-aware actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Active phase: complete + skip */}
        {activePhase && (
          <>
            <Button
              size="sm"
              onClick={() => onCompletePhase(job.id, activePhase)}
              disabled={isActionDisabled}
              className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-8 px-3"
            >
              {phaseInFlight === activePhase.id ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <><Check className="size-3" /><span className="ml-1">Done {activePhase.phase_type}</span></>
              )}
            </Button>
            <button
              onClick={() => onSkipPhase(job.id, activePhase)}
              disabled={isActionDisabled}
              className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50 px-1"
              aria-label={`Skip ${activePhase.phase_type}`}
            >
              <SkipForward className="size-3.5" />
            </button>
          </>
        )}

        {/* Next pending phase: start it. Pre-assigned → 1-tap (machine in label).
            Pre-assigned + busy → Waiting cue + disabled button.
            Unassigned → opens picker. */}
        {!activePhase && nextPendingPhase && (
          preassignedMachineId ? (
            <>
              {preassignedFree === false && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                  <Clock className="size-3" />
                  Waiting on {preassignedMachineLabel}
                </span>
              )}
              {preassignedFree !== false && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700">
                  Ready
                </span>
              )}
              <Button
                size="sm"
                onClick={() => onStartPhaseDirect(job.id, nextPendingPhase)}
                disabled={isActionDisabled || preassignedFree === false}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 disabled:opacity-50"
              >
                {phaseInFlight === nextPendingPhase.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <><Play className="size-3" /><span className="ml-1">Start {nextPendingPhase.phase_type} · {preassignedMachineLabel}</span></>
                )}
              </Button>
              <button
                onClick={() => onAssignMachine(job.id, nextPendingPhase)}
                disabled={isActionDisabled}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 p-1"
                title="Change pre-assigned machine"
              >
                <Pencil className="size-3" />
              </button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => onStartPhase(job.id, nextPendingPhase)}
                disabled={isActionDisabled}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
              >
                <Play className="size-3" />
                <span className="ml-1">Start {nextPendingPhase.phase_type}</span>
              </Button>
              <button
                onClick={() => onAssignMachine(job.id, nextPendingPhase)}
                disabled={isActionDisabled}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 p-1"
                title="Pre-assign machine"
              >
                <Pencil className="size-3" />
              </button>
            </>
          )
        )}

        {/* Ready for pickup OR no phases at all: notify customer */}
        {(job.status === 'ready_for_pickup' || (!activePhase && !nextPendingPhase)) && (
          <Button
            size="sm"
            onClick={() => onMarkDone(job)}
            disabled={isActionDisabled}
            className="text-xs font-bold bg-[#0d968b] hover:bg-[#0b7f75] text-white h-8 px-3"
          >
            {completingId === job.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <><Bell className="size-3" /><span className="ml-1">Notify &amp; complete</span></>
            )}
          </Button>
        )}

        <button
          onClick={() => onCancel(job.id)}
          disabled={isActionDisabled}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 px-1"
        >
          {cancellingId === job.id ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            'Cancel'
          )}
        </button>
        {shopInfo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPrint(job)}
            className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0 ml-auto"
          >
            <Printer className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CompactJobRow({
  job,
  shopInfo,
  amount,
  borderColor,
  secondaryParts,
  onPrint,
  formatTime: fmtTime,
}: {
  job: Job;
  shopInfo?: ShopInfo;
  amount: string | null;
  borderColor: string;
  secondaryParts: string[];
  onPrint: (job: Job) => void;
  formatTime: (dateStr: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCancelled = job.status === 'cancelled';
  const services = job.services.length > 0 ? job.services.join(', ') : '--';

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`rounded-lg border border-slate-100 border-l-4 ${borderColor} px-3 py-2 cursor-pointer ${isCancelled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${expanded ? '' : 'truncate'} ${isCancelled ? 'text-slate-400' : 'font-semibold text-slate-700'}`}>
              {services}
            </span>
            {amount && (
              <span className={`text-xs shrink-0 ${isCancelled ? 'line-through text-slate-400' : job.is_paid ? 'text-[#0d968b]' : 'text-amber-600'}`}>
                {amount}
              </span>
            )}
            {isCancelled && (
              <span className="text-xs text-slate-400 shrink-0">cancelled</span>
            )}
          </div>
          <div className={`text-xs text-slate-400 ${expanded ? '' : 'truncate'}`}>
            {secondaryParts.join(' · ')} · {fmtTime(job.started_at)}
            {job.sms_sent && ' · SMS sent'}
          </div>
        </div>
        {shopInfo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onPrint(job); }}
            className="text-slate-300 hover:text-slate-500 h-7 w-7 p-0 shrink-0"
          >
            <Printer className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
