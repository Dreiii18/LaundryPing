import type { MachineType, ServicePhaseConfigEntry } from '@/types/database';

export const FALLBACK_PHASE_CONFIG: ServicePhaseConfigEntry = {
  is_phase: true,
  machine_type: 'combo',
  default_minutes: 30,
  sequence: 99,
};

export interface PhaseRecord {
  job_id: string;
  laundromat_id: string;
  phase_type: string;
  machine_id: string | null;
  sequence: number;
  status: 'pending' | 'in_progress';
  started_at: string | null;
  estimated_minutes: number;
}

/**
 * Expand a job's services array into ordered phase records.
 * Services where `is_phase: false` (administrative items like Pickup/Delivery)
 * generate no phase row. Unknown services fall back to a generic phase config.
 *
 * Ordering: by configured `sequence`, then by original service order for ties.
 */
export function buildPhaseRecords(args: {
  jobId: string;
  laundromatId: string;
  services: string[];
  phaseConfig: Record<string, ServicePhaseConfigEntry> | null | undefined;
}): PhaseRecord[] {
  const { jobId, laundromatId, services, phaseConfig } = args;
  const cfg = phaseConfig ?? {};

  return services
    .map((service, idx) => ({
      service,
      cfg: { ...FALLBACK_PHASE_CONFIG, ...cfg[service] },
      originalIdx: idx,
    }))
    .filter((r) => r.cfg.is_phase)
    .sort((a, b) => a.cfg.sequence - b.cfg.sequence || a.originalIdx - b.originalIdx)
    .map((r, sortedIdx) => ({
      job_id: jobId,
      laundromat_id: laundromatId,
      phase_type: r.service,
      machine_id: null,
      sequence: sortedIdx + 1,
      status: 'pending' as const,
      started_at: null,
      estimated_minutes: r.cfg.default_minutes,
    }));
}

/**
 * Returns true if a machine of `actualType` can serve a phase requiring `requiredType`.
 * 'combo' machines fit any required type. A null required type means the phase
 * needs no machine.
 */
export function machineTypeMatches(
  actualType: MachineType,
  requiredType: MachineType | null,
): boolean {
  if (requiredType === null) return true;
  if (actualType === 'combo') return true;
  // 'combo' required + non-combo actual: not allowed (already handled above for combo actual).
  if (requiredType === 'combo') return false;
  return actualType === requiredType;
}
