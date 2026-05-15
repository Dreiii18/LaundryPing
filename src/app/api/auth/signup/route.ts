import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeLaundromatName } from '@/lib/utils/sanitize';
import { sendEmail } from '@/lib/email/provider';
import { buildNewSignupEmail, buildWelcomeEmail } from '@/lib/email/templates';
import { getAdminEmailList } from '@/lib/supabase/admin-auth';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://laundryping.com';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  shopName: z.string().min(1, 'Shop name is required').max(50, 'Shop name must be 50 characters or less'),
});

// Generic error message used for any signup failure that could otherwise leak
// account existence (Supabase's "User already registered" message, the
// identities=[] soft-duplicate signal, etc.). Real cause is logged server-side.
const GENERIC_SIGNUP_ERROR = 'Could not create account. Please check your details and try again.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password, shopName } = parsed.data;
    const sanitizedShopName = sanitizeLaundromatName(shopName);

    if (!sanitizedShopName) {
      return NextResponse.json(
        { error: 'Shop name contains only invalid characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { laundromat_name: sanitizedShopName },
      },
    });

    if (error) {
      console.error('Signup error:', error.message);
      return NextResponse.json({ error: GENERIC_SIGNUP_ERROR }, { status: 400 });
    }

    // Supabase returns a user with identities=[] if the email is already
    // registered (with "Confirm email" enabled and a pending confirmation).
    // Surfacing this distinctly leaks account existence — collapse into the
    // generic error path.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      console.error('Signup duplicate-email attempt for', email);
      return NextResponse.json({ error: GENERIC_SIGNUP_ERROR }, { status: 400 });
    }

    // Fan-out side effects (admin notification + D0 welcome email) are
    // awaited so that on Vercel serverless the container isn't torn down
    // before they complete. Both are wrapped in try/catch so a failure
    // never blocks account creation.
    await sendSideEffectEmails({
      newUserId: data.user?.id,
      email,
      sanitizedShopName,
    });

    return NextResponse.json(
      { message: 'Account created successfully', user: data.user },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

async function sendSideEffectEmails(args: {
  newUserId: string | undefined;
  email: string;
  sanitizedShopName: string;
}): Promise<void> {
  const { newUserId, email, sanitizedShopName } = args;

  // Admin notification (one email per admin recipient).
  try {
    const adminEmails = getAdminEmailList();
    if (adminEmails.length > 0) {
      const phTimestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const { subject, html } = buildNewSignupEmail({
        shopName: sanitizedShopName,
        email,
        signupTimestamp: phTimestamp,
      });
      await Promise.all(
        adminEmails.map((adminEmail) =>
          sendEmail({ to: adminEmail, subject, html }).catch((err) =>
            console.error('Signup notification email error:', err)
          )
        )
      );
    }
  } catch (emailErr) {
    console.error('Signup notification error:', emailErr);
  }

  // D0 welcome email — only fires for genuine new signups (data.user.id present).
  if (!newUserId) return;

  try {
    const { subject, html } = buildWelcomeEmail({
      shopName: sanitizedShopName,
      onboardingUrl: `${SITE_URL}/onboarding`,
    });
    const result = await sendEmail({ to: email, subject, html });
    if (!result.success) {
      console.error('Welcome email send error:', result.error);
      return;
    }
    // Stamp welcome_email_sent_at so the (future) welcome-retry path knows
    // not to re-send. Uses supabaseAdmin because the protect_lifecycle_columns
    // trigger blocks authenticated-client writes to this column.
    const { error: stampError } = await supabaseAdmin
      .from('laundromats')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('user_id', newUserId);
    if (stampError) {
      console.error('Welcome email stamp error:', stampError.message);
    }
  } catch (welcomeErr) {
    console.error('Welcome email error:', welcomeErr);
  }
}
