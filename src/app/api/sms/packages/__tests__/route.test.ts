import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/auth-helpers');

import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

const mockGetAuth = vi.mocked(getAuthenticatedUser);

// ---------------------------------------------------------------------------
// Mock Supabase factory
// ---------------------------------------------------------------------------

function createMockSupabase({
  packages = null as unknown[] | null,
  queryError = null as unknown,
} = {}) {
  const order = vi.fn().mockResolvedValue({ data: packages, error: queryError });
  const select = vi.fn().mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({ select });

  return { from };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/sms/packages', () => {
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
      const supabase = createMockSupabase();
      mockGetAuth.mockResolvedValue({
        user: null,
        laundromat: null,
        supabase: supabase as never,
        error: 'Unauthorized',
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });
  });

  // -------------------------------------------------------------------------
  // Successful response
  // -------------------------------------------------------------------------

  describe('successful response', () => {
    it('returns a packages array on success', async () => {
      const mockPackages = [
        {
          slug: 'pack-250',
          label: '250 Credits',
          sms_credits: 250,
          price_php: 199,
          description: 'Starter pack',
        },
        {
          slug: 'pack-600',
          label: '600 Credits',
          sms_credits: 600,
          price_php: 449,
          description: 'Growth pack',
        },
      ];

      const supabase = createMockSupabase({ packages: mockPackages });
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: { id: 'laundromat-1' } as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.packages).toEqual(mockPackages);
    });

    it('returns an empty array when no packages are in the database', async () => {
      const supabase = createMockSupabase({ packages: null });
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: { id: 'laundromat-1' } as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.packages).toEqual([]);
    });

    it('queries the sms_topup_packages table with the correct columns and ordering', async () => {
      const supabase = createMockSupabase({ packages: [] });
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: { id: 'laundromat-1' } as never,
        supabase: supabase as never,
        error: null,
      });

      await GET();

      expect(supabase.from).toHaveBeenCalledWith('sms_topup_packages');
      const selectMock = supabase.from.mock.results[0].value.select;
      expect(selectMock).toHaveBeenCalledWith(
        'slug, label, sms_credits, price_php, description'
      );
      const orderMock = selectMock.mock.results[0].value.order;
      expect(orderMock).toHaveBeenCalledWith('sort_order', { ascending: true });
    });
  });

  // -------------------------------------------------------------------------
  // Database error
  // -------------------------------------------------------------------------

  describe('database error', () => {
    it('returns 500 on a database error', async () => {
      const supabase = createMockSupabase({
        packages: null,
        queryError: { message: 'relation "sms_topup_packages" does not exist' },
      });
      mockGetAuth.mockResolvedValue({
        user: { id: 'user-1' } as never,
        laundromat: { id: 'laundromat-1' } as never,
        supabase: supabase as never,
        error: null,
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to fetch packages');
    });
  });
});
