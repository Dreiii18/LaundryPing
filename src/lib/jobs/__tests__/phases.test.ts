import { describe, it, expect } from 'vitest';
import {
  FALLBACK_PHASE_CONFIG,
  buildPhaseRecords,
  canStartPhase,
  findNextPendingPhase,
  isKnownPhaseType,
  machineTypeMatches,
  resolvePhaseRequirement,
  validateMachineForPhase,
} from '../phases';
import type { ServicePhaseConfigEntry } from '@/types/database';

const phaseConfig: Record<string, ServicePhaseConfigEntry> = {
  Wash: { is_phase: true, machine_type: 'washer', default_minutes: 45, sequence: 1 },
  Dry: { is_phase: true, machine_type: 'dryer', default_minutes: 50, sequence: 2 },
  Fold: { is_phase: true, machine_type: null, default_minutes: 15, sequence: 3 },
  Pickup: { is_phase: false, machine_type: null, default_minutes: 0, sequence: 99 },
};

describe('buildPhaseRecords', () => {
  it('produces one phase per is_phase=true service in sequence order', () => {
    const phases = buildPhaseRecords({
      jobId: 'j1',
      laundromatId: 'lr1',
      services: ['Wash', 'Dry', 'Fold'],
      phaseConfig,
    });
    expect(phases).toHaveLength(3);
    expect(phases.map((p) => p.phase_type)).toEqual(['Wash', 'Dry', 'Fold']);
    expect(phases.map((p) => p.sequence)).toEqual([1, 2, 3]);
  });

  it('filters out is_phase=false services', () => {
    const phases = buildPhaseRecords({
      jobId: 'j1',
      laundromatId: 'lr1',
      services: ['Wash', 'Pickup', 'Dry'],
      phaseConfig,
    });
    expect(phases.map((p) => p.phase_type)).toEqual(['Wash', 'Dry']);
  });

  it('falls back to FALLBACK_PHASE_CONFIG for unknown services', () => {
    const phases = buildPhaseRecords({
      jobId: 'j1',
      laundromatId: 'lr1',
      services: ['MysteryService'],
      phaseConfig,
    });
    expect(phases).toHaveLength(1);
    expect(phases[0].phase_type).toBe('MysteryService');
    expect(phases[0].estimated_minutes).toBe(FALLBACK_PHASE_CONFIG.default_minutes);
  });

  it('returns empty for empty services', () => {
    expect(
      buildPhaseRecords({ jobId: 'j', laundromatId: 'lr', services: [], phaseConfig }),
    ).toEqual([]);
  });

  it('returns empty when all services are is_phase=false', () => {
    expect(
      buildPhaseRecords({
        jobId: 'j',
        laundromatId: 'lr',
        services: ['Pickup'],
        phaseConfig,
      }),
    ).toEqual([]);
  });

  it('preserves original order for sequence ties', () => {
    const tieConfig: Record<string, ServicePhaseConfigEntry> = {
      A: { is_phase: true, machine_type: 'washer', default_minutes: 30, sequence: 1 },
      B: { is_phase: true, machine_type: 'washer', default_minutes: 30, sequence: 1 },
    };
    const phases = buildPhaseRecords({
      jobId: 'j',
      laundromatId: 'lr',
      services: ['B', 'A'],
      phaseConfig: tieConfig,
    });
    expect(phases.map((p) => p.phase_type)).toEqual(['B', 'A']);
  });

  it('emits pending status with null machine_id by default', () => {
    const phases = buildPhaseRecords({
      jobId: 'j',
      laundromatId: 'lr',
      services: ['Wash'],
      phaseConfig,
    });
    expect(phases[0].status).toBe('pending');
    expect(phases[0].machine_id).toBeNull();
    expect(phases[0].started_at).toBeNull();
  });
});

describe('machineTypeMatches', () => {
  it('any actual matches null required', () => {
    expect(machineTypeMatches('washer', null)).toBe(true);
    expect(machineTypeMatches('combo', null)).toBe(true);
  });

  it('combo actual matches any required', () => {
    expect(machineTypeMatches('combo', 'washer')).toBe(true);
    expect(machineTypeMatches('combo', 'dryer')).toBe(true);
    expect(machineTypeMatches('combo', 'combo')).toBe(true);
  });

  it('non-combo actual against combo required returns false', () => {
    expect(machineTypeMatches('washer', 'combo')).toBe(false);
  });

  it('exact match returns true', () => {
    expect(machineTypeMatches('washer', 'washer')).toBe(true);
    expect(machineTypeMatches('dryer', 'dryer')).toBe(true);
  });

  it('mismatch returns false', () => {
    expect(machineTypeMatches('washer', 'dryer')).toBe(false);
    expect(machineTypeMatches('dryer', 'washer')).toBe(false);
  });
});

describe('resolvePhaseRequirement', () => {
  it('returns the config entry for a known phase', () => {
    const r = resolvePhaseRequirement('Wash', phaseConfig);
    expect(r.machine_type).toBe('washer');
    expect(r.sequence).toBe(1);
  });

  it('falls back to FALLBACK_PHASE_CONFIG for unknown phase', () => {
    const r = resolvePhaseRequirement('UnknownPhase', phaseConfig);
    expect(r).toEqual(FALLBACK_PHASE_CONFIG);
  });

  it('falls back when config is null/undefined', () => {
    expect(resolvePhaseRequirement('Wash', null)).toEqual(FALLBACK_PHASE_CONFIG);
    expect(resolvePhaseRequirement('Wash', undefined)).toEqual(FALLBACK_PHASE_CONFIG);
  });
});

describe('isKnownPhaseType', () => {
  it('returns true for phases in config', () => {
    expect(isKnownPhaseType('Wash', phaseConfig)).toBe(true);
  });

  it('returns true for the legacy backfill marker', () => {
    expect(isKnownPhaseType('legacy', phaseConfig)).toBe(true);
    expect(isKnownPhaseType('legacy', {})).toBe(true);
    expect(isKnownPhaseType('legacy', null)).toBe(true);
  });

  it('returns false for unknown phase types not equal to legacy', () => {
    expect(isKnownPhaseType('Steam', phaseConfig)).toBe(false);
    expect(isKnownPhaseType('SomethingNew', {})).toBe(false);
  });
});

describe('findNextPendingPhase', () => {
  it('returns the lowest-sequence pending phase', () => {
    const phases = [
      { id: 'a', status: 'completed', sequence: 1 },
      { id: 'b', status: 'pending', sequence: 3 },
      { id: 'c', status: 'pending', sequence: 2 },
    ];
    expect(findNextPendingPhase(phases)?.id).toBe('c');
  });

  it('returns null when no pending phase', () => {
    expect(
      findNextPendingPhase([
        { id: 'a', status: 'completed', sequence: 1 },
        { id: 'b', status: 'skipped', sequence: 2 },
      ]),
    ).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(findNextPendingPhase([])).toBeNull();
  });
});

describe('canStartPhase', () => {
  it('allows starting the first pending phase', () => {
    const phases = [
      { id: 'a', status: 'pending', sequence: 1, phase_type: 'Wash' },
      { id: 'b', status: 'pending', sequence: 2, phase_type: 'Dry' },
    ];
    expect(canStartPhase(phases[0], phases).ok).toBe(true);
  });

  it('rejects starting a later-sequence phase while earlier still pending', () => {
    const phases = [
      { id: 'a', status: 'pending', sequence: 1, phase_type: 'Wash' },
      { id: 'b', status: 'pending', sequence: 2, phase_type: 'Dry' },
    ];
    const result = canStartPhase(phases[1], phases);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('Wash');
  });

  it('allows starting later phase if earlier is completed', () => {
    const phases = [
      { id: 'a', status: 'completed', sequence: 1, phase_type: 'Wash' },
      { id: 'b', status: 'pending', sequence: 2, phase_type: 'Dry' },
    ];
    expect(canStartPhase(phases[1], phases).ok).toBe(true);
  });

  it('allows starting later phase if earlier is skipped', () => {
    const phases = [
      { id: 'a', status: 'skipped', sequence: 1, phase_type: 'Wash' },
      { id: 'b', status: 'pending', sequence: 2, phase_type: 'Dry' },
    ];
    expect(canStartPhase(phases[1], phases).ok).toBe(true);
  });

  it('rejects starting a non-pending phase', () => {
    const phases = [{ id: 'a', status: 'completed', sequence: 1, phase_type: 'Wash' }];
    const result = canStartPhase(phases[0], phases);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('completed');
  });
});

describe('validateMachineForPhase', () => {
  it('passes when machine type matches', () => {
    const r = validateMachineForPhase({ machine_type: 'washer' }, 'Wash', phaseConfig);
    expect(r.ok).toBe(true);
    expect(r.requiredType).toBe('washer');
  });

  it('passes when combo machine on washer-required phase', () => {
    const r = validateMachineForPhase({ machine_type: 'combo' }, 'Wash', phaseConfig);
    expect(r.ok).toBe(true);
  });

  it('fails when washer used for dryer-required phase', () => {
    const r = validateMachineForPhase({ machine_type: 'washer' }, 'Dry', phaseConfig);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain('washer');
      expect(r.reason).toContain('dryer');
    }
  });

  it('passes any machine for a phase that requires null', () => {
    const r = validateMachineForPhase({ machine_type: 'washer' }, 'Fold', phaseConfig);
    expect(r.ok).toBe(true);
    expect(r.requiredType).toBeNull();
  });

  it('falls back to combo requirement for unknown phase, blocking non-combo machines', () => {
    const r = validateMachineForPhase({ machine_type: 'washer' }, 'UnknownPhase', phaseConfig);
    expect(r.ok).toBe(false);
  });
});
