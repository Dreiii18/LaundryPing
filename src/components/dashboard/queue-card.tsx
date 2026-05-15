'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Loader2, Printer, Pencil, Clock } from 'lucide-react';
import { renderPhaseLabel, type Job, type ShopInfo } from '@/components/jobs-table/types';

interface QueueCardProps {
  job: Job;
  shopInfo?: ShopInfo;
  completingId: string | null;
  cancellingId: string | null;
  phaseInFlight: Set<string>;
  isMachineFree?: (machineId: string) => boolean;
  onStartPhase: (jobId: string, phase: { id: string; phase_type: string }) => void;
  onStartPhaseDirect: (jobId: string, phase: { id: string; phase_type: string }) => void;
  onAssignMachine: (jobId: string, phase: { id: string; phase_type: string; machine_id?: string | null }) => void;
  onCancel: (jobId: string) => void;
  onPrint: (job: Job) => void;
}

export function QueueCard({
  job,
  shopInfo,
  completingId,
  cancellingId,
  phaseInFlight,
  isMachineFree,
  onStartPhase,
  onStartPhaseDirect,
  onAssignMachine,
  onCancel,
  onPrint,
}: QueueCardProps) {
  const jobInFlight = phaseInFlight.has(job.id);
  const isActionDisabled = completingId === job.id || cancellingId === job.id || jobInFlight;
  const phases = (job.phases ?? []).slice().sort((a, b) => a.sequence - b.sequence);
  const nextPending = phases.find((p) => p.status === 'pending') ?? null;

  const preassignedMachineId = nextPending?.machine_id ?? null;
  const preassignedMachineLabel = nextPending?.machine?.label ?? null;
  const preassignedFree =
    preassignedMachineId && isMachineFree ? isMachineFree(preassignedMachineId) : null;

  // Secondary info fragments
  const secondaryParts: string[] = [];
  if (job.claim_number != null) secondaryParts.push(`#${job.claim_number}`);
  if (job.customer_name) secondaryParts.push(job.customer_name);
  if (job.pay_amount != null) {
    secondaryParts.push(`₱${Number(job.pay_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }

  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 ${job.priority === 'rush' ? 'border-l-orange-400' : preassignedFree === true ? 'border-l-teal-400' : 'border-l-blue-400'} p-3 space-y-2`}>
      {/* Row 1: Service type (primary) + rush + ready badges */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-800">
          {job.services.length > 0 ? job.services.join(', ') : '--'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {preassignedMachineId && preassignedFree === true && (
            <Badge className="bg-teal-100 text-teal-700 border-transparent gap-1 text-xs">Ready</Badge>
          )}
          {preassignedMachineId && preassignedFree === false && (
            <Badge className="bg-amber-100 text-amber-700 border-transparent gap-1 text-xs">
              <Clock className="size-3" aria-hidden="true" />
              Waiting
            </Badge>
          )}
          {job.priority === 'rush' && (
            <Badge className="bg-orange-100 text-orange-700 border-transparent gap-1 text-xs">
              <Flame className="size-3" aria-hidden="true" />
              Rush
            </Badge>
          )}
        </div>
      </div>

      {/* Row 2: Metadata + actions */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400 truncate">
          {secondaryParts.join(' · ')}
          {preassignedMachineLabel && ` · ${preassignedMachineLabel}`}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {nextPending && preassignedMachineId ? (
            <>
              <Button
                size="sm"
                onClick={() => onStartPhaseDirect(job.id, nextPending)}
                disabled={isActionDisabled || preassignedFree === false}
                aria-label={`Start ${renderPhaseLabel(nextPending.phase_type)} on pre-assigned machine`}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 disabled:opacity-50"
              >
                {jobInFlight ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  `Start ${renderPhaseLabel(nextPending.phase_type)}`
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAssignMachine(job.id, nextPending)}
                disabled={isActionDisabled}
                aria-label="Change pre-assigned machine"
                title="Change pre-assigned machine"
                className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0 min-h-7"
              >
                <Pencil className="size-3" />
              </Button>
            </>
          ) : nextPending ? (
            <>
              <Button
                size="sm"
                onClick={() => onStartPhase(job.id, nextPending)}
                disabled={isActionDisabled}
                aria-label={`Start ${renderPhaseLabel(nextPending.phase_type)}`}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-7 px-3"
              >
                Start {renderPhaseLabel(nextPending.phase_type)}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAssignMachine(job.id, nextPending)}
                disabled={isActionDisabled}
                aria-label="Pre-assign machine"
                title="Pre-assign machine"
                className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0 min-h-7"
              >
                <Pencil className="size-3" />
              </Button>
            </>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancel(job.id)}
            disabled={isActionDisabled}
            aria-label="Cancel job"
            className="text-xs text-red-500 hover:text-red-700 h-7 px-2 min-h-7"
          >
            {cancellingId === job.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              'Cancel'
            )}
          </Button>
          {shopInfo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPrint(job)}
              className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0"
            >
              <Printer className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
