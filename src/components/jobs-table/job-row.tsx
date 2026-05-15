'use client';

import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Clock, CircleX, CircleAlert, Printer, Flame, Bell, Play, Check, SkipForward, Pencil } from 'lucide-react';
import { renderPhaseLabel, type Job, type JobPhase, type ShopInfo } from './types';

interface JobRowProps {
  job: Job;
  context: 'dashboard' | 'jobs-page';
  shopInfo?: ShopInfo;
  completingId: string | null;
  cancellingId: string | null;
  /** Set of job_ids that currently have a phase action in flight. */
  phaseInFlight: Set<string>;
  /** Is the pre-assigned machine on `phase` currently free? Used to show
   *  Ready vs Waiting on rows whose next pending phase has machine_id. */
  isMachineFree?: (machineId: string) => boolean;
  onMarkDone: (job: Job) => void;
  onCancelConfirm: (jobId: string) => void;
  /** Open machine picker (no pre-assignment yet) */
  onStartPhase: (jobId: string, phase: { id: string; phase_type: string }) => void;
  /** 1-tap start when phase already has a pre-assigned machine */
  onStartPhaseDirect: (jobId: string, phase: { id: string; phase_type: string }) => void;
  /** Open the pre-assign dialog (queue: edit which machine is pre-assigned) */
  onAssignMachine: (jobId: string, phase: { id: string; phase_type: string; machine_id?: string | null }) => void;
  onCompletePhase: (jobId: string, phase: { id: string; phase_type: string }) => void;
  onSkipPhase: (jobId: string, phase: { id: string; phase_type: string }) => void;
  onPrint: (job: Job) => void;
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

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  });
};

function PhaseChip({ phase }: { phase: JobPhase }) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border';
  const label = renderPhaseLabel(phase.phase_type);
  if (phase.status === 'completed') {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`} title={`${label} done`}>
        <Check className="size-3" /> {label}
      </span>
    );
  }
  if (phase.status === 'in_progress') {
    return (
      <span className={`${base} bg-amber-50 text-amber-800 border-amber-300`} title={`${label} in progress`}>
        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
        {label}{phase.machine ? ` · ${phase.machine.label}` : ''}
      </span>
    );
  }
  if (phase.status === 'skipped') {
    return (
      <span className={`${base} bg-slate-50 text-slate-400 border-slate-200 line-through`} title={`${label} skipped`}>
        {label}
      </span>
    );
  }
  // pending — show pre-assigned machine label if the phase has been pre-assigned
  return (
    <span className={`${base} bg-slate-50 text-slate-500 border-slate-200`} title={`${label} pending`}>
      <span className="size-1.5 rounded-full bg-slate-300" />
      {label}{phase.machine ? ` · ${phase.machine.label}` : ''}
    </span>
  );
}

export const JobRow = React.memo(function JobRow({
  job,
  context,
  shopInfo,
  completingId,
  cancellingId,
  phaseInFlight,
  isMachineFree,
  onMarkDone,
  onCancelConfirm,
  onStartPhase,
  onStartPhaseDirect,
  onAssignMachine,
  onCompletePhase,
  onSkipPhase,
  onPrint,
}: JobRowProps) {
  const jobInFlight = phaseInFlight.has(job.id);
  const isActionDisabled = completingId === job.id || cancellingId === job.id || jobInFlight;
  const phases = (job.phases ?? []).slice().sort((a, b) => a.sequence - b.sequence);
  const activePhase = phases.find((p) => p.status === 'in_progress') ?? null;
  const nextPendingPhase = phases.find((p) => p.status === 'pending') ?? null;
  const isJobOpen = ['pending', 'in_progress', 'ready_for_pickup'].includes(job.status);

  // Pre-assignment state for the next pending phase. Drives 1-tap start
  // (server uses phase.machine_id when body is empty) and Ready/Waiting
  // visual cues.
  const preassignedMachineId = nextPendingPhase?.machine_id ?? null;
  const preassignedMachineLabel = nextPendingPhase?.machine?.label ?? null;
  const preassignedMachineFree =
    preassignedMachineId && isMachineFree ? isMachineFree(preassignedMachineId) : null;

  return (
    <TableRow className="hover:bg-slate-50/50 transition-colors">
      <TableCell className="px-6 py-4">
        {job.claim_number != null ? (
          <span className="inline-flex items-center justify-center size-8 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
            #{job.claim_number}
          </span>
        ) : (
          <span className="text-slate-400 italic text-sm">--</span>
        )}
      </TableCell>
      {context === 'jobs-page' && (
        <TableCell className="px-6 py-4 text-sm text-slate-500 font-medium">
          {formatDate(job.started_at)}
        </TableCell>
      )}
      <TableCell className="px-6 py-4 text-sm font-bold text-slate-700">
        {phases.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {phases.map((p) => <PhaseChip key={p.id} phase={p} />)}
          </div>
        ) : job.machine ? (
          job.machine.label
        ) : (
          <span className="text-slate-400 italic font-normal">Not assigned</span>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-slate-600">
        {job.services && job.services.length > 0 ? (
          <span>{job.services.map((s) => {
            const type = shopInfo?.serviceTypes?.[s] ?? 'per_load';
            if (type === 'per_kg' && job.service_weights_actual?.[s]) {
              return `${s} ${job.service_weights_actual[s].toFixed(1)}kg`;
            }
            const qty = job.service_quantities?.[s] ?? 1;
            return qty > 1 ? `${s} ×${qty}` : s;
          }).join(', ')}</span>
        ) : (
          <span className="text-slate-400 italic">--</span>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-slate-600">
        <div>
          {job.customer_phone_masked || <span className="text-slate-400 italic">--</span>}
          {job.customer_name && (
            <div className="text-xs text-slate-400 mt-0.5">{job.customer_name}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-slate-600 font-medium">
        <div>
          {job.pay_amount != null ? `₱${Number(job.pay_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-400 italic">--</span>}
          {job.total_weight != null && job.total_weight > 0 && (
            <div className="text-xs text-slate-400 mt-0.5">{Number(job.total_weight).toFixed(1)} kg</div>
          )}
        </div>
      </TableCell>
      <TableCell className="px-6 py-4">
        {job.status === 'pending' ? (
          <div className="flex items-center gap-1">
            <Badge className="bg-blue-100 text-blue-700 border-transparent gap-1">
              <Clock className="size-3" aria-hidden="true" />
              Queued
            </Badge>
            {job.priority === 'rush' && (
              <Badge className="bg-orange-100 text-orange-700 border-transparent gap-1">
                <Flame className="size-3" aria-hidden="true" />
                Rush
              </Badge>
            )}
          </div>
        ) : job.status === 'in_progress' && job.is_overdue ? (
          <Badge className="bg-red-100 text-red-700 border-transparent gap-1">
            <CircleAlert className="size-3" aria-hidden="true" />
            Overdue
          </Badge>
        ) : job.status === 'in_progress' ? (
          <Badge className="bg-amber-100 text-amber-700 border-transparent gap-1">
            <Clock className="size-3" aria-hidden="true" />
            In progress
          </Badge>
        ) : job.status === 'ready_for_pickup' ? (
          <Badge className="bg-teal-100 text-teal-700 border-transparent gap-1">
            <Bell className="size-3" aria-hidden="true" />
            Ready
          </Badge>
        ) : job.status === 'completed' ? (
          <Badge className="bg-[#0d968b]/10 text-[#0d968b] border-transparent gap-1">
            <CheckCircle className="size-3" aria-hidden="true" />
            Completed
          </Badge>
        ) : (
          <Badge className="bg-slate-100 text-slate-500 border-transparent gap-1">
            <CircleX className="size-3" aria-hidden="true" />
            Cancelled
          </Badge>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-slate-500 font-medium">
        {formatTime(job.started_at)}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm">
        {job.completed_at ? (
          <span className="text-slate-500 font-medium">
            {formatTime(job.completed_at)}
          </span>
        ) : (
          <span className="text-slate-400 italic">--</span>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 text-right">
        {isJobOpen ? (
          <div className="inline-flex items-center gap-2 justify-end flex-wrap">
            {/* Active phase: complete + skip */}
            {activePhase && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCompletePhase(job.id, activePhase)}
                  disabled={isActionDisabled}
                  aria-label={`Complete ${renderPhaseLabel(activePhase.phase_type)}`}
                  className="text-xs font-bold text-amber-700 border-amber-200 hover:bg-amber-50 min-h-11 min-w-11"
                >
                  {jobInFlight ? (
                    <><Loader2 className="size-3 animate-spin" /><span className="ml-1">…</span></>
                  ) : (
                    <><Check className="size-3" /><span className="ml-1">Done {renderPhaseLabel(activePhase.phase_type)}</span></>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSkipPhase(job.id, activePhase)}
                  disabled={isActionDisabled}
                  aria-label={`Skip ${renderPhaseLabel(activePhase.phase_type)}`}
                  className="text-xs text-slate-400 hover:text-slate-600 min-h-11 min-w-11"
                >
                  <SkipForward className="size-3" />
                </Button>
              </>
            )}

            {/* No active phase but next pending: start it.
                Pre-assigned → 1-tap (label includes machine).
                Pre-assigned + machine busy → show "Waiting" cue.
                Unassigned → opens picker dialog. */}
            {!activePhase && nextPendingPhase && (
              <>
                {preassignedMachineId ? (
                  <>
                    {preassignedMachineFree === false && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Clock className="size-3" aria-hidden="true" />
                        Waiting on {preassignedMachineLabel}
                      </span>
                    )}
                    {preassignedMachineFree !== false && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStartPhaseDirect(job.id, nextPendingPhase)}
                      disabled={isActionDisabled || preassignedMachineFree === false}
                      aria-label={`Start ${renderPhaseLabel(nextPendingPhase.phase_type)} on ${preassignedMachineLabel}`}
                      className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 min-h-11 min-w-11 disabled:opacity-50"
                    >
                      {jobInFlight ? (
                        <><Loader2 className="size-3 animate-spin" /><span className="ml-1">…</span></>
                      ) : (
                        <><Play className="size-3" /><span className="ml-1">Start {renderPhaseLabel(nextPendingPhase.phase_type)} · {preassignedMachineLabel}</span></>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssignMachine(job.id, nextPendingPhase)}
                      disabled={isActionDisabled}
                      aria-label="Change pre-assigned machine"
                      className="text-xs text-slate-400 hover:text-slate-600 min-h-11 min-w-11"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStartPhase(job.id, nextPendingPhase)}
                      disabled={isActionDisabled}
                      aria-label={`Start ${renderPhaseLabel(nextPendingPhase.phase_type)}`}
                      className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 min-h-11 min-w-11"
                    >
                      <Play className="size-3" />
                      <span className="ml-1">Start {renderPhaseLabel(nextPendingPhase.phase_type)}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssignMachine(job.id, nextPendingPhase)}
                      disabled={isActionDisabled}
                      aria-label={`Pre-assign machine for ${renderPhaseLabel(nextPendingPhase.phase_type)}`}
                      className="text-xs text-slate-400 hover:text-slate-600 min-h-11 min-w-11"
                      title="Pre-assign machine"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </>
                )}
              </>
            )}

            {/* Ready for pickup (or all phases settled): notify customer + complete.
                Guard against rendering alongside an active-phase action — only
                show this CTA when nothing is currently running for this job. */}
            {!activePhase && (job.status === 'ready_for_pickup' || !nextPendingPhase) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkDone(job)}
                disabled={isActionDisabled}
                aria-label="Notify customer and complete job"
                className="text-xs font-bold text-[#0d968b] border-[#0d968b]/20 hover:bg-[#0d968b]/10 min-h-11 min-w-11"
              >
                {completingId === job.id ? (
                  <><Loader2 className="size-3 animate-spin" /><span className="ml-1">Sending...</span></>
                ) : (
                  <><Bell className="size-3" /><span className="ml-1">Notify &amp; complete</span></>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancelConfirm(job.id)}
              disabled={isActionDisabled}
              aria-label="Cancel job"
              className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 min-h-11 min-w-11"
            >
              {cancellingId === job.id ? (
                <><Loader2 className="size-3 animate-spin" /><span className="ml-1">Cancelling...</span></>
              ) : (
                'Cancel'
              )}
            </Button>
            {shopInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrint(job)}
                aria-label="Print receipt"
                className="text-xs font-bold text-slate-500 border-slate-200 hover:bg-slate-50 min-h-11 min-w-11"
              >
                <Printer className="size-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 justify-end">
            {shopInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrint(job)}
                aria-label="Print receipt"
                className="text-xs font-bold text-slate-500 border-slate-200 hover:bg-slate-50 min-h-11 min-w-11"
              >
                <Printer className="size-3.5" />
                Print
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
});
