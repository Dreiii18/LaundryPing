import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, buildPlanCancelledEmail } from '@/lib/email';

const cancelPlanSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
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
    const parsed = cancelPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { user_id } = parsed.data;

    // Verify user has an active plan
    const { data: laundromat } = await supabaseAdmin
      .from('laundromats')
      .select('id, name, sms_plan_id')
      .eq('user_id', user_id)
      .single();

    if (!laundromat) {
      return NextResponse.json(
        { error: 'Laundromat not found' },
        { status: 404 }
      );
    }

    if (!laundromat.sms_plan_id) {
      return NextResponse.json(
        { error: 'User does not have an active plan' },
        { status: 400 }
      );
    }

    // Fetch plan details before cancellation (for email)
    const { data: plan } = await supabaseAdmin
      .from('sms_plans')
      .select('label')
      .eq('id', laundromat.sms_plan_id)
      .single();

    const { error: rpcError } = await supabaseAdmin.rpc('cancel_sms_plan', {
      p_user_id: user_id,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message || 'Failed to cancel plan' },
        { status: 500 }
      );
    }

    // Fire-and-forget cancellation email
    (async () => {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (!userData?.user?.email) return;

        const { subject, html } = buildPlanCancelledEmail({
          shopName: laundromat.name,
          planLabel: plan?.label || 'SMS',
          cancelledAt: new Date().toISOString(),
        });

        const result = await sendEmail({ to: { email: userData.user.email }, subject, html });

        await supabaseAdmin.from('email_logs').insert({
          user_id,
          laundromat_id: laundromat.id,
          email_type: 'plan_cancelled' as const,
          recipient_email: userData.user.email,
          subject,
          provider: result.provider,
          status: result.success ? 'sent' : 'failed',
          provider_message_id: result.messageId || null,
          provider_response: result.rawResponse ? (result.rawResponse as Record<string, unknown>) : null,
        });
      } catch (err) {
        console.error('[Plan Cancellation Email] Failed:', err);
      }
    })();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
