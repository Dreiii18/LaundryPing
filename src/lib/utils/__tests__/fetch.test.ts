import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithAuth } from '../fetch';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockLocation = { href: '' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

describe('fetchWithAuth', () => {
  beforeEach(() => {
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns the response unchanged on a 200 status', async () => {
    const mockResponse = new Response(null, { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchWithAuth('/api/jobs');

    expect(result).toBe(mockResponse);
    expect(result.status).toBe(200);
  });

  it('does not call toast.error on a 200 status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    await fetchWithAuth('/api/jobs');

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not redirect on a 200 status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    await fetchWithAuth('/api/jobs');

    expect(mockLocation.href).toBe('');
  });

  it('calls toast.error with session-expired message on a 401 status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await fetchWithAuth('/api/jobs');

    expect(toast.error).toHaveBeenCalledWith('Your session has expired. Please log in again.');
  });

  it('redirects to /login on a 401 status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await fetchWithAuth('/api/jobs');

    expect(mockLocation.href).toBe('/login');
  });

  it('returns the 401 response after redirecting', async () => {
    const mockResponse = new Response(null, { status: 401 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchWithAuth('/api/jobs');

    expect(result).toBe(mockResponse);
    expect(result.status).toBe(401);
  });

  it('forwards custom headers to fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const init: RequestInit = { headers: { Authorization: 'Bearer token123' } };
    await fetchWithAuth('/api/jobs', init);

    expect(mockFetch).toHaveBeenCalledWith('/api/jobs', init);
  });

  it('forwards method and body to fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify({ machine_id: 'abc', customer_name: 'Juan' }),
      headers: { 'Content-Type': 'application/json' },
    };
    await fetchWithAuth('/api/jobs', init);

    expect(mockFetch).toHaveBeenCalledWith('/api/jobs', init);
  });

  it('calls fetch with the exact input URL when no init is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    await fetchWithAuth('/api/machines');

    expect(mockFetch).toHaveBeenCalledWith('/api/machines', undefined);
  });
});
