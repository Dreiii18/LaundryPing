import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SmsPackageSlug } from '@/lib/constants';
import { sendEmail } from '@/lib/email/provider';
import { buildTopupConfirmationEmail } from '@/lib/email/templates';

const topupSchema = z.object({
  laundromat_id: z.string().uuid('Invalid laundromat ID'),
  package_slug: z.enum(['pack-250', 'pack-600', 'pack-1100'] as const satisfies readonly SmsPackageSlug[]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = topupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { laundromat_id, package_slug } = parsed.data;

    // Verify laundromat exists and get owner info for email
    const { data: laundromat } = await supabaseAdmin
      .from('laundromats')
      .select('id, user_id, name')
      .eq('id', laundromat_id)
      .single();

    if (!laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const { error: rpcError } = await supabaseAdmin.rpc('add_sms_topup', {
      p_laundromat_id: laundromat_id,
      p_package_slug: package_slug,
      p_admin_id: user.id,
    });

    if (rpcError) {
      console.error('Top-up RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
    }

    // Fire-and-forget: send confirmation email to laundromat owner
    try {
      const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(laundromat.user_id);
      const ownerEmail = ownerData?.user?.email;

      if (ownerEmail) {
        const { data: pkg } = await supabaseAdmin
          .from('sms_topup_packages')
          .select('label, sms_credits, price_php')
          .eq('slug', package_slug)
          .single();

        const { data: updatedLaundromat } = await supabaseAdmin
          .from('laundromats')
          .select('sms_free_credits, sms_paid_credits')
          .eq('id', laundromat_id)
          .single();

        if (pkg && updatedLaundromat) {
          const { subject, html } = buildTopupConfirmationEmail({
            laundromatName: laundromat.name,
            packageLabel: pkg.label,
            creditsAdded: pkg.sms_credits,
            pricePHP: pkg.price_php,
            newPaidCredits: updatedLaundromat.sms_paid_credits,
            newTotalCredits: updatedLaundromat.sms_free_credits + updatedLaundromat.sms_paid_credits,
          });

          const emailResult = await sendEmail({ to: ownerEmail, subject, html });
          if (!emailResult.success) {
            console.error('Topup confirmation email failed:', emailResult.error);
          }
        }
      }
    } catch (emailErr) {
      console.error('Topup confirmation email error:', emailErr);
    }

    return NextResponse.json({ message: 'Credits added successfully' });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
