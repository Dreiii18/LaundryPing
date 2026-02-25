import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

const activatePlanSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  plan_tier: z.enum(['starter', 'growth', 'scale'], {
    message: 'Plan tier must be "starter", "growth", or "scale"',
  }),
  duration_days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30),
});

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized' || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = activatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { user_id, plan_tier, duration_days } = parsed.data;

    const { error: rpcError } = await supabaseAdmin.rpc('activate_sms_plan', {
      p_user_id: user_id,
      p_plan_tier: plan_tier,
      p_duration_days: duration_days,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message || 'Failed to activate plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
