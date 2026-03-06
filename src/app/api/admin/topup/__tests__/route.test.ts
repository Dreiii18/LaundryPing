import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

// ---------------------------------------------------------------------------
// Module mocks
//
// @/lib/supabase/admin creates a SupabaseClient singleton at import time which
// requires real env vars. We mock the entire module with a factory so the
// real createClient call never executes during tests.
// ---------------------------------------------------------------------------

// Mutable reference that individual tests can shape per-scenario.
const mockAdminFrom = vi.fn();
const mockAdminRpc = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    get from() { return mockAdminFrom; },
    get rpc() { return mockAdminRpc; },
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    },
  },
}));

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/supabase/admin-auth');
vi.mock('@/lib/email/provider');
vi.mock('@/lib/email/templates');

import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/supabase/admin-auth';

const mockCreateClient = vi.mocked(createClient);
const mockIsAdmin = vi.mocked(isAdmin);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const VALID_BODY = { laundromat_id: VALID_UUID, package_slug: 'pack-250' };

function buildServerSupabase({
  user = { id: 'admin-user', email: 'admin@example.com' } as { id: string; email: string } | null,
  authError = null as unknown,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
  };
}

/** Wire the admin supabase mock for a given test scenario. */
function setupAdminSupabase({
  laundromat = { id: VALID_UUID, user_id: 'owner-user', name: 'Test Laundry' } as { id: string; user_id: string; name: string } | null,
  laundromatError = null as unknown,
  rpcError = null as unknown,
} = {}) {
  const single = vi.fn().mockResolvedValue({ data: laundromat, error: laundromatError });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });

  mockAdminFrom.mockReturnValue({ select });
  mockAdminRpc.mockResolvedValue({ error: rpcError });

  return { mockAdminFrom, mockAdminRpc };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/admin/topup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  describe('authentication', () => {
    it('returns 401 for an unauthenticated request (no user)', async () => {
      mockCreateClient.mockResolvedValue(buildServerSupabase({ user: null }) as never);
      mockIsAdmin.mockReturnValue(false);
      setupAdminSupabase();

      const response = await POST(makeRequest(VALID_BODY));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 for a non-admin authenticated user', async () => {
      mockCreateClient.mockResolvedValue(
        buildServerSupabase({ user: { id: 'regular', email: 'user@example.com' } }) as never
      );
      // isAdmin returns false — same 401 branch as no user.
      mockIsAdmin.mockReturnValue(false);
      setupAdminSupabase();

      const response = await POST(makeRequest(VALID_BODY));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  describe('input validation', () => {
    beforeEach(() => {
      mockCreateClient.mockResolvedValue(buildServerSupabase() as never);
      mockIsAdmin.mockReturnValue(true);
      setupAdminSupabase();
    });

    it('returns 400 when laundromat_id is missing', async () => {
      const response = await POST(makeRequest({ package_slug: 'pack-250' }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
    });

    it('returns 400 when package_slug is invalid', async () => {
      const response = await POST(
        makeRequest({ laundromat_id: VALID_UUID, package_slug: 'invalid-slug' })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
    });

    it('returns 400 when laundromat_id is not a valid UUID', async () => {
      const response = await POST(
        makeRequest({ laundromat_id: 'not-a-uuid', package_slug: 'pack-250' })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Laundromat lookup
  // -------------------------------------------------------------------------

  describe('laundromat lookup', () => {
    it('returns 404 when the laundromat does not exist', async () => {
      mockCreateClient.mockResolvedValue(buildServerSupabase() as never);
      mockIsAdmin.mockReturnValue(true);
      setupAdminSupabase({ laundromat: null, laundromatError: null });

      const response = await POST(makeRequest(VALID_BODY));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Laundromat not found');
    });
  });

  // -------------------------------------------------------------------------
  // Successful topup
  // -------------------------------------------------------------------------

  describe('successful topup', () => {
    it('returns 200 and calls add_sms_topup RPC on success', async () => {
      mockCreateClient.mockResolvedValue(buildServerSupabase() as never);
      mockIsAdmin.mockReturnValue(true);
      setupAdminSupabase();

      const response = await POST(makeRequest(VALID_BODY));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Credits added successfully');
      expect(mockAdminRpc).toHaveBeenCalledWith('add_sms_topup', {
        p_laundromat_id: VALID_UUID,
        p_package_slug: 'pack-250',
        p_admin_id: 'admin-user',
      });
    });

    it('calls add_sms_topup with all valid package slugs', async () => {
      const slugs = ['pack-250', 'pack-600', 'pack-1100'] as const;

      for (const slug of slugs) {
        vi.clearAllMocks();
        mockCreateClient.mockResolvedValue(buildServerSupabase() as never);
        mockIsAdmin.mockReturnValue(true);
        setupAdminSupabase();

        const response = await POST(makeRequest({ laundromat_id: VALID_UUID, package_slug: slug }));

        expect(response.status).toBe(200);
        expect(mockAdminRpc).toHaveBeenCalledWith(
          'add_sms_topup',
          expect.objectContaining({ p_package_slug: slug })
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // RPC failure
  // -------------------------------------------------------------------------

  describe('RPC failure', () => {
    it('returns 500 when the add_sms_topup RPC returns an error', async () => {
      mockCreateClient.mockResolvedValue(buildServerSupabase() as never);
      mockIsAdmin.mockReturnValue(true);
      setupAdminSupabase({ rpcError: { message: 'RPC failed' } });

      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await POST(makeRequest(VALID_BODY));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to add credits');
    });
  });
});
