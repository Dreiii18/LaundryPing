import type { SupabaseClient } from '@supabase/supabase-js';
import type { SmsPlanTier } from '@/lib/constants';

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  canSend: boolean;
  billingCycleStart: string;
  daysUntilReset: number;
  hasPlan: boolean;
  planTier: SmsPlanTier | null;
  planExpiresAt: string | null;
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
    .select('sms_used_this_month, sms_limit, billing_cycle_start, sms_plan_id, sms_plan_expires_at')
    .eq('id', laundromatId)
    .single();

  if (error || !laundromat) {
    throw new Error('Failed to fetch quota status');
  }

  const hasPlan = laundromat.sms_plan_id !== null;
  let planTier: SmsPlanTier | null = null;

  if (hasPlan) {
    const { data: plan } = await supabase
      .from('sms_plans')
      .select('tier')
      .eq('id', laundromat.sms_plan_id)
      .single();

    planTier = (plan?.tier as SmsPlanTier) ?? null;
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
    canSend: hasPlan && used < limit,
    billingCycleStart: laundromat.billing_cycle_start,
    daysUntilReset,
    hasPlan,
    planTier,
    planExpiresAt: laundromat.sms_plan_expires_at,
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
  const { error } = await supabase.rpc('decrement_sms_quota', {
    p_laundromat_id: laundromatId,
  });

  if (error) {
    console.error('Quota decrement failed:', error);
  }
}
