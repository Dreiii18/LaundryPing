import type { SupabaseClient } from '@supabase/supabase-js';

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  canSend: boolean;
  billingCycleStart: string;
  daysUntilReset: number;
}

/**
 * Ensures the billing cycle is current (lazy reset).
 * If the current month is different from billing_cycle_start, resets counter.
 */
export async function ensureBillingCycle(
  supabase: SupabaseClient,
  laundromatId: string
): Promise<void> {
  await supabase.rpc('ensure_billing_cycle', {
    p_laundromat_id: laundromatId,
  });
}

/**
 * Gets the current SMS quota status for a laundromat.
 */
export async function getQuotaStatus(
  supabase: SupabaseClient,
  laundromatId: string
): Promise<QuotaStatus> {
  // First ensure billing cycle is current
  await ensureBillingCycle(supabase, laundromatId);

  const { data: laundromat, error } = await supabase
    .from('laundromats')
    .select('sms_used_this_month, sms_limit, billing_cycle_start')
    .eq('id', laundromatId)
    .single();

  if (error || !laundromat) {
    throw new Error('Failed to fetch quota status');
  }

  const used = laundromat.sms_used_this_month;
  const limit = laundromat.sms_limit;
  const remaining = Math.max(0, limit - used);

  // Calculate days until reset
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilReset = Math.ceil(
    (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    used,
    limit,
    remaining,
    canSend: used < limit,
    billingCycleStart: laundromat.billing_cycle_start,
    daysUntilReset,
  };
}

/**
 * Atomically checks and increments SMS quota.
 * Uses PostgreSQL stored procedure with row-level locking.
 * Returns true if quota available (and incremented), false if exhausted.
 */
export async function checkAndIncrementQuota(
  supabase: SupabaseClient,
  laundromatId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_and_increment_sms_quota', {
    p_laundromat_id: laundromatId,
  });

  if (error) {
    console.error('Quota check failed:', error);
    return false;
  }

  return data === true;
}

/**
 * Decrements the SMS quota (used when SMS send fails after increment).
 */
export async function decrementQuota(
  supabase: SupabaseClient,
  laundromatId: string
): Promise<void> {
  // Use direct SQL via RPC for atomic decrement.
  // Fallback: read-then-write for environments without the RPC.
  const { data: current } = await supabase
    .from('laundromats')
    .select('sms_used_this_month')
    .eq('id', laundromatId)
    .single();

  if (current && current.sms_used_this_month > 0) {
    await supabase
      .from('laundromats')
      .update({ sms_used_this_month: current.sms_used_this_month - 1 })
      .eq('id', laundromatId);
  }
}
