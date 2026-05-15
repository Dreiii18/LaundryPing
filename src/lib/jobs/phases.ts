import type { MachineType, ServicePhaseConfigEntry } from '@/types/database';

export const FALLBACK_PHASE_CONFIG: ServicePhaseConfigEntry = {
  is_phase: true,
  machine_type: 'combo',
  default_minutes: 30,
  sequence: 99,
};

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface PhaseRecord {
  job_id: string;
  laundromat_id: string;
  phase_type: string;
  machine_id: string | null;
  sequence: number;
  status: PhaseStatus;
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

/**
 * Resolve the effective config entry for a phase_type, applying FALLBACK_PHASE_CONFIG
 * for any unspecified fields. Returns a full ServicePhaseConfigEntry.
 */
export function resolvePhaseRequirement(
  phaseType: string,
  phaseConfig: Record<string, ServicePhaseConfigEntry> | null | undefined,
): ServicePhaseConfigEntry {
  return { ...FALLBACK_PHASE_CONFIG, ...(phaseConfig?.[phaseType] ?? {}) };
}

/**
 * Returns true iff the laundromat has an explicit config entry for `phaseType`.
 * Used to distinguish "known phase using fallback" from "unknown/stale phase_type".
 * The 'legacy' phase_type is always considered known (it's a backfill marker).
 */
export function isKnownPhaseType(
  phaseType: string,
  phaseConfig: Record<string, ServicePhaseConfigEntry> | null | undefined,
): boolean {
  return phaseType === 'legacy' || Boolean(phaseConfig?.[phaseType]);
}

/**
 * Return the next phase eligible to start: lowest sequence among pending phases.
 * Returns null if no pending phase exists.
 */
export function findNextPendingPhase<P extends { status: string; sequence: number }>(
  phases: P[],
): P | null {
  return (
    [...phases].sort((a, b) => a.sequence - b.sequence).find((p) => p.status === 'pending') ??
    null
  );
}

/**
 * Check whether a phase can transition to in_progress now: it must itself be pending
 * AND no earlier-sequence phase may still be pending (must be started, skipped, or completed).
 */
export function canStartPhase<
  P extends { id: string; status: string; sequence: number; phase_type?: string },
>(
  phase: P,
  allPhases: P[],
): { ok: true } | { ok: false; reason: string } {
  if (phase.status !== 'pending') {
    return { ok: false, reason: `Phase is ${phase.status}, can only start a pending phase` };
  }
  const blocking = allPhases
    .filter((p) => p.sequence < phase.sequence && p.status === 'pending')
    .sort((a, b) => a.sequence - b.sequence)[0];
  if (blocking) {
    const label = blocking.phase_type ?? `phase ${blocking.sequence}`;
    return { ok: false, reason: `${label} must be started or skipped first` };
  }
  return { ok: true };
}

/**
 * Validate a machine is compatible with a phase's required type. Returns the
 * resolved required type alongside the verdict for caller error messages.
 */
export function validateMachineForPhase(
  machine: { machine_type: MachineType },
  phaseType: string,
  phaseConfig: Record<string, ServicePhaseConfigEntry> | null | undefined,
):
  | { ok: true; requiredType: MachineType | null }
  | { ok: false; reason: string; requiredType: MachineType | null } {
  const requiredType = resolvePhaseRequirement(phaseType, phaseConfig).machine_type;
  if (!machineTypeMatches(machine.machine_type, requiredType)) {
    return {
      ok: false,
      requiredType,
      reason: `This machine is a ${machine.machine_type} but the phase (${phaseType}) requires a ${requiredType}.`,
    };
  }
  return { ok: true, requiredType };
}
