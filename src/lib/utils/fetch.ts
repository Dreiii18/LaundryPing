import { toast } from 'sonner';

/**
 * Wrapper around fetch that handles 401 responses by showing a toast
 * and redirecting to /login. Use this for all client-side API calls.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    toast.error('Your session has expired. Please log in again.');
    window.location.href = '/login';
    // Return the response so callers don't throw on the redirect
    return res;
  }

  return res;
}
