import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { getQuotaStatus } from '@/lib/sms/quota';

export async function GET() {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const quota = await getQuotaStatus(supabase, laundromat.id);

    return NextResponse.json({
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      billingCycleStart: quota.billingCycleStart,
      daysUntilReset: quota.daysUntilReset,
      hasPlan: quota.hasPlan,
      planTier: quota.planTier,
      planExpiresAt: quota.planExpiresAt,
    });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
