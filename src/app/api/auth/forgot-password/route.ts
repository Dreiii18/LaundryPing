import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/provider';
import { buildPasswordResetEmail } from '@/lib/email/templates';
import { checkRateLimit } from '@/lib/utils/rate-limit';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  // IP-based rate limit: 3 requests per minute
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = checkRateLimit(`forgot-password:${ip}`, 3, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429 },
    );
  }

  // Validate request body
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const origin = request.headers.get('origin') || new URL(request.url).origin;

  try {
    // Generate password reset link via Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
      },
    });

    if (error) {
      // Log but don't expose — could be "user not found" etc.
      console.error('[forgot-password] generateLink error:', error.message);
      return NextResponse.json({
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    // Build and send branded email
    const resetLink = data.properties.action_link;
    const { subject, html } = buildPasswordResetEmail({ resetLink });
    const emailResult = await sendEmail({ to: email, subject, html });

    if (!emailResult.success) {
      console.error('[forgot-password] sendEmail error:', emailResult.error);
    }
  } catch (err) {
    console.error('[forgot-password] unexpected error:', err);
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({
    message: 'If an account exists with that email, a reset link has been sent.',
  });
}
