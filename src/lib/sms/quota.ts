import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreditStatus {
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
  canSend: boolean;
  daysUntilFreeReset: number;
  billingCycleStart: string;
}

/**
 * Ensures the billing cycle is current (lazy reset).
 * If the current month is different from billing_cycle_start, resets free credits.
 */
export async function ensureBillingCycle(
  supabase: SupabaseClient,
  laundromatId: string
): Promise<void> {
  const { error } = await supabase.rpc('ensure_billing_cycle', {
    p_laundromat_id: laundromatId,
  });
  if (error) {
    console.error('ensure_billing_cycle failed:', error.message);
    throw new Error(`Failed to ensure billing cycle: ${error.message}`);
  }
}

/**
 * Gets the current SMS credit status for a laundromat.
 */
export async function getCreditStatus(
  supabase: SupabaseClient,
  laundromatId: string
): Promise<CreditStatus> {
  await ensureBillingCycle(supabase, laundromatId);

  const { data: laundromat, error } = await supabase
    .from('laundromats')
    .select('sms_free_credits, sms_paid_credits, billing_cycle_start')
    .eq('id', laundromatId)
    .single();

  if (error || !laundromat) {
    throw new Error('Failed to fetch credit status');
  }

  const freeCredits = laundromat.sms_free_credits;
  const paidCredits = laundromat.sms_paid_credits;
  const totalCredits = freeCredits + paidCredits;

  const phNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const nextMonth = new Date(phNow.getFullYear(), phNow.getMonth() + 1, 1);
  const daysUntilFreeReset = Math.ceil(
    (nextMonth.getTime() - phNow.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    freeCredits,
    paidCredits,
    totalCredits,
    canSend: totalCredits > 0,
    daysUntilFreeReset,
    billingCycleStart: laundromat.billing_cycle_start,
  };
}

/**
 * Atomically checks and consumes one SMS credit.
 * Free credits are consumed first, then paid credits.
 * Returns 'free' or 'paid' indicating which bucket was consumed, or null if no credits available.
 * Throws on RPC errors (distinguishing infrastructure failures from a
 * legitimate credit-exhausted null return).
 */
export async function checkAndConsumeCredit(
  supabase: SupabaseClient,
  laundromatId: string
): Promise<'free' | 'paid' | null> {
  const { data, error } = await supabase.rpc('check_and_consume_sms_credit', {
    p_laundromat_id: laundromatId,
  });

  if (error) {
    console.error('Credit consume failed:', error);
    throw new Error(`Credit consume failed: ${error.message}`);
  }

  return data === 'none' ? null : (data as 'free' | 'paid');
}

/**
 * Refunds one SMS credit to the specified bucket (must match what was consumed).
 * Throws on RPC error so callers can detect and handle the failure.
 */
export async function refundCredit(
  supabase: SupabaseClient,
  laundromatId: string,
  creditType: 'free' | 'paid'
): Promise<void> {
  const { error } = await supabase.rpc('refund_sms_credit', {
    p_laundromat_id: laundromatId,
    p_credit_type: creditType,
  });

  if (error) {
    console.error('Credit refund failed:', error);
    throw new Error(`Credit refund failed: ${error.message}`);
  }
}
