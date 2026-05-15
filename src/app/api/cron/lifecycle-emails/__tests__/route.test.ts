import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { listUsers: vi.fn() } },
  },
}));

vi.mock('@/lib/email/provider', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/email/templates', () => ({
  buildD2NoMachineEmail: vi.fn(() => ({ subject: 'd2', html: '<html>d2</html>' })),
  buildD7NoSmsEmail: vi.fn(() => ({ subject: 'd7', html: '<html>d7</html>' })),
  buildD30RecapEmail: vi.fn(() => ({ subject: 'd30', html: '<html>d30</html>' })),
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/provider';
import { GET } from '../route';

const mockSendEmail = vi.mocked(sendEmail);
const mockFrom = vi.mocked(supabaseAdmin.from);
const mockListUsers = vi.mocked(supabaseAdmin.auth.admin.listUsers);

// ---------------------------------------------------------------------------
// Mock builder — assembles a fluent Supabase chain per call to from(table).
// ---------------------------------------------------------------------------

interface FromMockOptions {
  laundromatRows?: unknown[];
  laundromatFetchError?: { message: string } | null;
  machineCount?: number;
  smsSentCount?: number;
  jobsCount?: number;
  stampError?: { message: string } | null;
  rollbackError?: { message: string } | null;
}

interface UpdateCall {
  table: string;
  payload: Record<string, unknown>;
}

function installFromMock(opts: FromMockOptions = {}): { updates: UpdateCall[] } {
  const updates: UpdateCall[] = [];

  // First update to a column (the stamp) returns stampError; subsequent updates
  // to the same column (rollback to null) return rollbackError. Keyed by
  // payload value: ISO string = stamp, null = rollback.
  const updateImpl = (table: string) => (payload: Record<string, unknown>) => {
    updates.push({ table, payload });
    const isRollback = Object.values(payload).some((v) => v === null);
    const error = isRollback ? (opts.rollbackError ?? null) : (opts.stampError ?? null);
    return {
      eq: vi.fn().mockResolvedValue({ error }),
    };
  };

  mockFrom.mockImplementation(((table: string) => {
    if (table === 'laundromats') {
      const result = {
        data: opts.laundromatRows ?? [],
        error: opts.laundromatFetchError ?? null,
      };
      return {
        // .select(...).lt(...).or(...) → Promise<{data, error}>
        select: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue(result),
          }),
        }),
        update: updateImpl('laundromats'),
      };
    }
    if (table === 'machines') {
      // .select(_, { count, head }).eq(...).in(...) → Promise<{count}>
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ count: opts.machineCount ?? 0 }),
          }),
        }),
      };
    }
    if (table === 'sms_logs') {
      // .select(_, { count, head }).eq(...).eq(...) → Promise<{count}>
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: opts.smsSentCount ?? 0 }),
          }),
        }),
      };
    }
    if (table === 'jobs') {
      // .select(_, { count, head }).eq(...) → Promise<{count}>
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: opts.jobsCount ?? 0 }),
        }),
      };
    }
    throw new Error(`Unexpected from(${table})`);
  }) as never);

  return { updates };
}

function authedRequest() {
  return new Request('http://localhost/api/cron/lifecycle-emails', {
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret' },
  }) as never;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret';
  vi.clearAllMocks();
  mockSendEmail.mockResolvedValue({ success: true, provider: 'mock', messageId: 'm-1' });
  mockListUsers.mockResolvedValue({
    data: {
      users: [{ id: 'user-1', email: 'owner@example.com' }] as never,
      aud: '',
    } as never,
    error: null,
  } as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cron /api/cron/lifecycle-emails', () => {
  it('returns 401 when authorization header is missing', async () => {
    installFromMock();
    const res = await GET(
      new Request('http://localhost/api/cron/lifecycle-emails', { method: 'GET' }) as never
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    installFromMock();
    const res = await GET(authedRequest());
    expect(res.status).toBe(401);
  });

  it('reports zero candidates when there are no eligible rows', async () => {
    installFromMock({ laundromatRows: [] });
    const res = await GET(authedRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, scanned: 0, candidates: 0, sent: 0, failed: 0 });
  });

  it('stamps before sending so a transient send failure rolls the stamp back (not duplicate)', async () => {
    // Row eligible for D2 only, no machines, send fails.
    const row = {
      id: 'lm-1',
      user_id: 'user-1',
      name: 'Sparkle',
      created_at: '2026-01-01T00:00:00Z', // very old → eligible for everything
      sms_free_credits: 50,
      d2_email_sent_at: null,
      d7_email_sent_at: new Date().toISOString(), // mark D7 already sent so we focus on D2/D30
      d30_email_sent_at: new Date().toISOString(),
      onboarding_completed_at: null,
    };
    const { updates } = installFromMock({
      laundromatRows: [row],
      machineCount: 0, // D2 fires
    });
    mockSendEmail.mockResolvedValueOnce({ success: false, provider: 'mock', error: 'timeout' });

    const res = await GET(authedRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.failed).toBe(1);

    // Verify stamp-first, rollback-on-fail: two updates to d2_email_sent_at
    // — first with ISO string, then with null.
    const d2Updates = updates.filter(
      (u) => u.table === 'laundromats' && 'd2_email_sent_at' in u.payload
    );
    expect(d2Updates.length).toBe(2);
    expect(typeof d2Updates[0].payload.d2_email_sent_at).toBe('string');
    expect(d2Updates[1].payload.d2_email_sent_at).toBeNull();
  });

  it('emits one outcome per eligible stage when the user has no email (no longer hardcoded to d2)', async () => {
    // Row that is 35 days old with all stages pending — eligible for d2, d7, d30.
    const row = {
      id: 'lm-1',
      user_id: 'user-1',
      name: 'Sparkle',
      created_at: '2026-01-01T00:00:00Z',
      sms_free_credits: 50,
      d2_email_sent_at: null,
      d7_email_sent_at: null,
      d30_email_sent_at: null,
      onboarding_completed_at: null,
    };
    installFromMock({ laundromatRows: [row] });
    // listUsers returns the user but with no email — simulates a soft-deleted auth row.
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'user-1', email: undefined }] as never } as never,
      error: null,
    } as never);

    const res = await GET(authedRequest());
    const body = await res.json();

    const noEmail = body.outcomes.filter((o: { reason?: string }) => o.reason === 'no_email');
    const stages = noEmail.map((o: { stage: string }) => o.stage).sort();
    expect(stages).toEqual(['d2', 'd30', 'd7']);
  });
});
