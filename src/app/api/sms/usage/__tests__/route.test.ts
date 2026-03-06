import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/auth-helpers');
vi.mock('@/lib/sms/quota');

import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { getCreditStatus } from '@/lib/sms/quota';

const mockGetAuth = vi.mocked(getAuthenticatedUser);
const mockGetCreditStatus = vi.mocked(getCreditStatus);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseLaundromat = {
  id: 'laundromat-uuid-1234',
  name: 'SpinClean',
  user_id: 'user-1',
};

const baseCreditStatus = {
  freeCredits: 10,
  paidCredits: 200,
  totalCredits: 210,
  canSend: true,
  daysUntilFreeReset: 15,
  billingCycleStart: '2026-02-01',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/sms/usage', () => {
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
    it('returns 401 for an unauthenticated request', async () => {
      mockGetAuth.mockResolvedValue({
        user: null,
        laundromat: null,
        supabase: {} as never,
        error: 'Unauthorized',
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 404 when the laundromat is not found for the user', async () => {
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: null,
        supabase: {} as never,
        error: 'Laundromat not found',
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Laundromat not found');
    });
  });

  // -------------------------------------------------------------------------
  // Successful response
  // -------------------------------------------------------------------------

  describe('successful response', () => {
    it('returns the full credit status object on success', async () => {
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: {} as never,
        error: null,
      });
      mockGetCreditStatus.mockResolvedValue(baseCreditStatus);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        freeCredits: 10,
        paidCredits: 200,
        totalCredits: 210,
        canSend: true,
        daysUntilFreeReset: 15,
        billingCycleStart: '2026-02-01',
      });
    });

    it('calls getCreditStatus with the supabase client and laundromat id', async () => {
      const mockSupabase = { rpc: vi.fn(), from: vi.fn() };
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: mockSupabase as never,
        error: null,
      });
      mockGetCreditStatus.mockResolvedValue(baseCreditStatus);

      await GET();

      expect(mockGetCreditStatus).toHaveBeenCalledOnce();
      expect(mockGetCreditStatus).toHaveBeenCalledWith(mockSupabase, baseLaundromat.id);
    });

    it('correctly maps canSend: false when total credits are zero', async () => {
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: {} as never,
        error: null,
      });
      mockGetCreditStatus.mockResolvedValue({
        ...baseCreditStatus,
        freeCredits: 0,
        paidCredits: 0,
        totalCredits: 0,
        canSend: false,
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.canSend).toBe(false);
      expect(body.totalCredits).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getCreditStatus error
  // -------------------------------------------------------------------------

  describe('getCreditStatus error', () => {
    it('returns 500 when getCreditStatus throws an error', async () => {
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: baseLaundromat as never,
        supabase: {} as never,
        error: null,
      });
      mockGetCreditStatus.mockRejectedValue(new Error('Failed to fetch credit status'));

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('An unexpected error occurred');
    });
  });
});
