import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('@/lib/supabase/auth-helpers');

import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

const mockGetAuth = vi.mocked(getAuthenticatedUser);

const baseLaundromat = { id: 'lr-1', name: 'Shop', user_id: 'u-1' };

function makeReq() {
  return new Request('http://localhost/api/jobs/j-1/cancel', { method: 'POST' });
}
const makeParams = () =>
  ({ params: Promise.resolve({ id: 'j-1' }) }) as { params: Promise<{ id: string }> };

interface CancelMockOpts {
  job: { data: unknown; error: unknown };
  skipPhasesError?: unknown;
  jobUpdateError?: unknown;
}

function buildSupabase({ job, skipPhasesError, jobUpdateError }: CancelMockOpts) {
  // jobs.update(...).eq('id').in('status'): the .in() is the awaited terminal
  // jobs.select(...).eq().eq().single() returns job
  const jobUpdateIn = vi.fn().mockResolvedValue({ error: jobUpdateError ?? null });
  const jobUpdateEq = vi.fn().mockReturnValue({ in: jobUpdateIn });
  const jobUpdate = vi.fn().mockReturnValue({ eq: jobUpdateEq });

  const jobSingle = vi.fn().mockResolvedValue(job);
  const jobSelectEq2 = vi.fn().mockReturnValue({ single: jobSingle });
  const jobSelectEq1 = vi.fn().mockReturnValue({ eq: jobSelectEq2 });
  const jobSelect = vi.fn().mockReturnValue({ eq: jobSelectEq1 });

  // job_phases.update(...).eq('job_id').in('status'): terminal .in() awaited
  const phaseUpdateIn = vi.fn().mockResolvedValue({ error: skipPhasesError ?? null });
  const phaseUpdateEq = vi.fn().mockReturnValue({ in: phaseUpdateIn });
  const phaseUpdate = vi.fn().mockReturnValue({ eq: phaseUpdateEq });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'jobs') return { select: jobSelect, update: jobUpdate };
    if (table === 'job_phases') return { update: phaseUpdate };
    return {};
  });
  return { from, _phaseUpdateIn: phaseUpdateIn, _jobUpdateIn: jobUpdateIn };
}

describe('POST /api/jobs/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels an in_progress job and skips its phases', async () => {
    const supabase = buildSupabase({
      job: { data: { id: 'j-1', laundromat_id: 'lr-1', status: 'in_progress' }, error: null },
    });
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: baseLaundromat,
      supabase: supabase as never,
      error: null,
    } as never);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe('Job cancelled.');
    // Both updates must have been issued
    expect(supabase._phaseUpdateIn).toHaveBeenCalled();
    expect(supabase._jobUpdateIn).toHaveBeenCalled();
  });

  it('REGRESSION: fails loud (500) when phase skip errors — does NOT cancel the job', async () => {
    const supabase = buildSupabase({
      job: { data: { id: 'j-1', laundromat_id: 'lr-1', status: 'in_progress' }, error: null },
      skipPhasesError: { message: 'connection lost' },
    });
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: baseLaundromat,
      supabase: supabase as never,
      error: null,
    } as never);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Failed to free machines');
    // CRITICAL: the job UPDATE must NOT have been issued, otherwise the job
    // would be cancelled while lingering in_progress phases hold their machines.
    expect(supabase._jobUpdateIn).not.toHaveBeenCalled();
  });

  it('cancels a ready_for_pickup job (no open phases, but skip update is still safe)', async () => {
    const supabase = buildSupabase({
      job: { data: { id: 'j-1', laundromat_id: 'lr-1', status: 'ready_for_pickup' }, error: null },
    });
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: baseLaundromat,
      supabase: supabase as never,
      error: null,
    } as never);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(200);
    expect(supabase._jobUpdateIn).toHaveBeenCalled();
  });

  it('returns 409 when job is already completed', async () => {
    const supabase = buildSupabase({
      job: { data: { id: 'j-1', laundromat_id: 'lr-1', status: 'completed' }, error: null },
    });
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: baseLaundromat,
      supabase: supabase as never,
      error: null,
    } as never);

    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('already completed or cancelled');
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValue({
      user: null,
      laundromat: null,
      supabase: {} as never,
      error: 'Unauthorized',
    } as never);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });
});
