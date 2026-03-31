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
    .select('id, name, address, sms_free_credits, sms_paid_credits, billing_cycle_start, available_services, service_prices, contact_number')
    .eq('user_id', user.id)
    .single();

  if (laundromatError || !laundromat) {
    return { user, laundromat: null, supabase, error: 'Laundromat not found' as const };
  }

  // Lazy billing cycle reset: if the stored cycle is from a previous month (PH time),
  // call the DB function to reset free credits and reflect the change in-memory.
  // PH timezone (UTC+8) must match the DB functions which use Asia/Manila.
  const phNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const firstOfMonthPH = `${phNow.getFullYear()}-${String(phNow.getMonth() + 1).padStart(2, '0')}-01`;
  if (laundromat.billing_cycle_start < firstOfMonthPH) {
    await supabase.rpc('ensure_billing_cycle', { p_laundromat_id: laundromat.id });
    laundromat.sms_free_credits = 50;
    laundromat.billing_cycle_start = firstOfMonthPH;
  }

  return { user, laundromat, supabase, error: null };
});
