import { cache } from 'react';
import { createClient } from './server';

/**
 * React.cache-wrapped auth + laundromat fetch.
 * Deduplicated per-request: layout and page components that both call this
 * within the same render tree will only hit the DB once.
 *
 * IMPORTANT: The returned `supabase` instance must NOT be used for
 * auth-mutating operations (signIn, signOut, setSession). It is safe
 * for read/write data queries only.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, laundromat: null, supabase, error: 'Unauthorized' as const };
  }

  const { data: laundromat, error: laundromatError } = await supabase
    .from('laundromats')
    .select('id, name, address, sms_free_credits, sms_paid_credits, available_services, service_prices, contact_number')
    .eq('user_id', user.id)
    .single();

  if (laundromatError || !laundromat) {
    return { user, laundromat: null, supabase, error: 'Laundromat not found' as const };
  }

  return { user, laundromat, supabase, error: null };
});
