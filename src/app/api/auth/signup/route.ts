import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeLaundromatName } from '@/lib/utils/sanitize';
import { sendEmail, buildWelcomeEmail } from '@/lib/email';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  shopName: z.string().min(1, 'Shop name is required').max(50, 'Shop name must be 50 characters or less'),
});

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
        data: { shop_name: sanitizedShopName },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Supabase may return a user with identities=[] if email already exists
    // (when "Confirm email" is enabled and user hasn't confirmed)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Fire-and-forget welcome email — never fail signup on email failure
    if (data.user?.email) {
      const userId = data.user.id;
      const userEmail = data.user.email;

      (async () => {
        try {
          const { subject, html } = buildWelcomeEmail({ shopName: sanitizedShopName });
          const result = await sendEmail({ to: { email: userEmail }, subject, html });

          await supabaseAdmin.from('email_logs').insert({
            user_id: userId,
            laundromat_id: null,
            email_type: 'welcome' as const,
            recipient_email: userEmail,
            subject,
            provider: result.provider,
            status: result.success ? 'sent' : 'failed',
            provider_message_id: result.messageId || null,
            provider_response: result.rawResponse ? (result.rawResponse as Record<string, unknown>) : null,
          });
        } catch (err) {
          console.error('[Welcome Email] Failed:', err);
        }
      })();
    }

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
