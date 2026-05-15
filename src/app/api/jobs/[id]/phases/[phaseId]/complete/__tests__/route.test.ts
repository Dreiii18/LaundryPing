import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('@/lib/supabase/auth-helpers');

import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

const mockGetAuth = vi.mocked(getAuthenticatedUser);

const baseLaundromat = { id: 'lr-1', name: 'Shop', user_id: 'u-1' };

function makeReq() {
  return new Request('http://localhost/api/jobs/j-1/phases/p-1/complete', { method: 'POST' });
}
const makeParams = () =>
  ({ params: Promise.resolve({ id: 'j-1', phaseId: 'p-1' }) }) as {
    params: Promise<{ id: string; phaseId: string }>;
  };

/**
 * Build a Supabase double whose `.from('job_phases').select(...).eq().eq().eq().single()`
 * returns `phaseRow`, and whose subsequent `.from('job_phases').update(...).eq().eq().select().single()`
 * returns `updateResult`.
 */
function buildSupabase({
  phaseRow,
  updateResult,
}: {
  phaseRow: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
}) {
  const selectSingle = vi.fn().mockResolvedValue(phaseRow);
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    single: selectSingle,
  };
  const updateSingle = vi.fn().mockResolvedValue(updateResult ?? { data: null, error: null });
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnValue({ single: updateSingle }),
  };
  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue(updateChain),
  });
  return { from };
}

describe('POST /api/jobs/[id]/phases/[phaseId]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 idempotently when phase is already completed (double-tap)', async () => {
    const phaseRow = {
      id: 'p-1',
      status: 'completed',
      completed_at: '2026-05-14T00:00:00Z',
      machine_id: null,
    };
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: baseLaundromat,
      supabase: buildSupabase({ phaseRow: { data: phaseRow, error: null } }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.phase.status).toBe('completed');
  });

  it('returns 409 when phase is pending (cannot complete a not-started phase)', async () => {
    const phaseRow = { id: 'p-1', status: 'pending', completed_at: null, machine_id: null };
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: baseLaundromat,
      supabase: buildSupabase({ phaseRow: { data: phaseRow, error: null } }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('pending');
  });

  it('returns 500 with generic envelope on update failure (no leaked code/details/hint)', async () => {
    const phaseRow = { id: 'p-1', status: 'in_progress', completed_at: null, machine_id: 'm-1' };
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: baseLaundromat,
      supabase: buildSupabase({
        phaseRow: { data: phaseRow, error: null },
        updateResult: {
          data: null,
          error: { code: '23514', message: 'check constraint violation', details: 'leaked', hint: 'do not leak' },
        },
      }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to complete phase');
    // Critical: must NOT leak DB error internals
    expect(json.code).toBeUndefined();
    expect(json.details).toBeUndefined();
    expect(json.hint).toBeUndefined();
  });

  it('returns 200 with updated phase on success', async () => {
    const phaseRow = { id: 'p-1', status: 'in_progress', completed_at: null, machine_id: 'm-1' };
    const updatedRow = { id: 'p-1', status: 'completed', completed_at: '2026-05-14T01:00:00Z', machine_id: 'm-1' };
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: baseLaundromat,
      supabase: buildSupabase({
        phaseRow: { data: phaseRow, error: null },
        updateResult: { data: updatedRow, error: null },
      }) as never,
      error: null,
    } as never);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.phase.status).toBe('completed');
  });
});
