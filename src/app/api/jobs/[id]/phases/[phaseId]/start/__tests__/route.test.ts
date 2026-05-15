import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('@/lib/supabase/auth-helpers');

import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

const mockGetAuth = vi.mocked(getAuthenticatedUser);

const phaseConfig = {
  Wash: { is_phase: true, machine_type: 'washer', default_minutes: 45, sequence: 1 },
  Dry: { is_phase: true, machine_type: 'dryer', default_minutes: 50, sequence: 2 },
};

const laundromat = {
  id: 'lr-1',
  name: 'Shop',
  user_id: 'u-1',
  service_phase_config: phaseConfig,
};

function makeReq(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/jobs/j-1/phases/p-2/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const makeParams = (phaseId = 'p-2') =>
  ({ params: Promise.resolve({ id: 'j-1', phaseId }) }) as {
    params: Promise<{ id: string; phaseId: string }>;
  };

/**
 * Build a Supabase double for the start-phase route.
 * Order of supabase calls in the route:
 *   1. supabase.from('job_phases').select(...).eq('job_id').eq('laundromat_id').order()
 *   2. If a machine is supplied: supabase.from('machines').select(...).eq().eq().eq().single()
 *   3. supabase.from('job_phases').update(...).eq().eq().select().single()
 */
function buildSupabase({
  phases,
  machine,
  updateResult,
}: {
  phases: { data: unknown; error: unknown };
  machine?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
}) {
  // phases query: .select.eq.eq.order
  const phaseOrder = vi.fn().mockResolvedValue(phases);
  const phaseEq2 = vi.fn().mockReturnValue({ order: phaseOrder });
  const phaseEq1 = vi.fn().mockReturnValue({ eq: phaseEq2 });
  const phaseSelect = vi.fn().mockReturnValue({ eq: phaseEq1 });

  // machine query
  const machineSingle = vi.fn().mockResolvedValue(machine ?? { data: null, error: null });
  const machineEq3 = vi.fn().mockReturnValue({ single: machineSingle });
  const machineEq2 = vi.fn().mockReturnValue({ eq: machineEq3 });
  const machineEq1 = vi.fn().mockReturnValue({ eq: machineEq2 });
  const machineSelect = vi.fn().mockReturnValue({ eq: machineEq1 });

  // update query
  const updateSingle = vi.fn().mockResolvedValue(updateResult ?? { data: null, error: null });
  const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
  const updateEq2 = vi.fn().mockReturnValue({ select: updateSelect });
  const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 });
  const phaseUpdate = vi.fn().mockReturnValue({ eq: updateEq1 });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'job_phases') return { select: phaseSelect, update: phaseUpdate };
    if (table === 'machines') return { select: machineSelect };
    return {};
  });
  return { from };
}

describe('POST /api/jobs/[id]/phases/[phaseId]/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('REGRESSION: rejects starting phase 2 while phase 1 is still pending', async () => {
    const phases = [
      { id: 'p-1', job_id: 'j-1', phase_type: 'Wash', status: 'pending', sequence: 1, laundromat_id: 'lr-1', machine_id: null },
      { id: 'p-2', job_id: 'j-1', phase_type: 'Dry', status: 'pending', sequence: 2, laundromat_id: 'lr-1', machine_id: null },
    ];
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat,
      supabase: buildSupabase({ phases: { data: phases, error: null } }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq({ machine_id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789' }), makeParams('p-2'));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('Wash');
  });

  it('rejects washer machine for dryer-required phase', async () => {
    const phases = [
      { id: 'p-1', job_id: 'j-1', phase_type: 'Wash', status: 'completed', sequence: 1, laundromat_id: 'lr-1', machine_id: 'm-w' },
      { id: 'p-2', job_id: 'j-1', phase_type: 'Dry', status: 'pending', sequence: 2, laundromat_id: 'lr-1', machine_id: null },
    ];
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat,
      supabase: buildSupabase({
        phases: { data: phases, error: null },
        machine: { data: { id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789', label: 'W1', machine_type: 'washer' }, error: null },
      }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq({ machine_id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789' }), makeParams('p-2'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.toLowerCase()).toContain('washer');
    expect(json.error.toLowerCase()).toContain('dryer');
  });

  it('accepts combo machine for washer-required phase', async () => {
    const phases = [
      { id: 'p-1', job_id: 'j-1', phase_type: 'Wash', status: 'pending', sequence: 1, laundromat_id: 'lr-1', machine_id: null },
    ];
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat,
      supabase: buildSupabase({
        phases: { data: phases, error: null },
        machine: { data: { id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789', label: 'C1', machine_type: 'combo' }, error: null },
        updateResult: {
          data: { id: 'p-1', machine_id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789', status: 'in_progress', started_at: '2026-05-14T00:00:00Z' },
          error: null,
        },
      }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq({ machine_id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789' }), makeParams('p-1'));
    expect(res.status).toBe(200);
  });

  it('returns 409 with friendly message on 23505 (machine just got taken)', async () => {
    const phases = [
      { id: 'p-1', job_id: 'j-1', phase_type: 'Wash', status: 'pending', sequence: 1, laundromat_id: 'lr-1', machine_id: null },
    ];
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat,
      supabase: buildSupabase({
        phases: { data: phases, error: null },
        machine: { data: { id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789', label: 'W1', machine_type: 'washer' }, error: null },
        updateResult: { data: null, error: { code: '23505', message: 'duplicate' } },
      }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq({ machine_id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789' }), makeParams('p-1'));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.toLowerCase()).toContain('try a different machine');
  });

  it('rejects starting a phase with stale phase_type (no longer in config)', async () => {
    const phases = [
      { id: 'p-1', job_id: 'j-1', phase_type: 'Steam', status: 'pending', sequence: 1, laundromat_id: 'lr-1', machine_id: null },
    ];
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat,
      supabase: buildSupabase({ phases: { data: phases, error: null } }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq({ machine_id: 'a1b2c3d4-e5f6-4a7b-8c9d-ef0123456789' }), makeParams('p-1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('no longer configured');
  });
});
