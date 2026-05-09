'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Loader2, Printer, Pencil, Clock } from 'lucide-react';
import type { Job, ShopInfo } from '@/components/jobs-table/types';

interface QueueCardProps {
  job: Job;
  shopInfo?: ShopInfo;
  completingId: string | null;
  cancellingId: string | null;
  phaseInFlight: string | null;
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
  const isActionDisabled = completingId !== null || cancellingId !== null || phaseInFlight !== null;
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
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 disabled:opacity-50"
              >
                {phaseInFlight === nextPending.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  `Start ${nextPending.phase_type}`
                )}
              </Button>
              <button
                onClick={() => onAssignMachine(job.id, nextPending)}
                disabled={isActionDisabled}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 p-1"
                title="Change pre-assigned machine"
              >
                <Pencil className="size-3" />
              </button>
            </>
          ) : nextPending ? (
            <>
              <Button
                size="sm"
                onClick={() => onStartPhase(job.id, nextPending)}
                disabled={isActionDisabled}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-7 px-3"
              >
                Start {nextPending.phase_type}
              </Button>
              <button
                onClick={() => onAssignMachine(job.id, nextPending)}
                disabled={isActionDisabled}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 p-1"
                title="Pre-assign machine"
              >
                <Pencil className="size-3" />
              </button>
            </>
          ) : null}
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
