import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sanitizeLaundromatName } from '@/lib/utils/sanitize';
import { sendEmail } from '@/lib/email/provider';
import { buildNewSignupEmail } from '@/lib/email/templates';
import { getAdminEmailList } from '@/lib/supabase/admin-auth';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
        data: { laundromat_name: sanitizedShopName },
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

    // Fire-and-forget: notify admins of new signup
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
        Promise.all(
          adminEmails.map((adminEmail) =>
            sendEmail({ to: adminEmail, subject, html }).catch((err) =>
              console.error('Signup notification email error:', err)
            )
          )
        ).catch((err) => console.error('Signup notification emails failed:', err));
      }
    } catch (emailErr) {
      console.error('Signup notification error:', emailErr);
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
