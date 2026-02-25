import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/utils/rate-limit';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const LAST_ACTIVITY_COOKIE = 'lp_last_activity';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except landing page)
  if (
    !user &&
    request.nextUrl.pathname !== '/' &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/api/auth') &&
    !request.nextUrl.pathname.startsWith('/blog')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from landing page to dashboard
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // --- Session inactivity timeout (8h) ---
  if (user) {
    const lastActivityStr = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
    const now = Date.now();

    if (lastActivityStr) {
      const lastActivity = parseInt(lastActivityStr, 10);
      if (!isNaN(lastActivity) && now - lastActivity > INACTIVITY_TIMEOUT_MS) {
        // Session inactive too long — sign out and redirect to landing page
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = '/';
        const response = NextResponse.redirect(url);
        response.cookies.delete(LAST_ACTIVITY_COOKIE);
        return response;
      }
    }

    // Update last activity timestamp
    supabaseResponse.cookies.set(LAST_ACTIVITY_COOKIE, now.toString(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: INACTIVITY_TIMEOUT_MS / 1000,
    });
  }

  // --- Rate limiting on mutation API endpoints ---
  if (
    user &&
    request.nextUrl.pathname.startsWith('/api/') &&
    MUTATION_METHODS.has(request.method)
  ) {
    const { allowed, remaining, resetAt } = checkRateLimit(user.id);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    supabaseResponse.headers.set(
      'X-RateLimit-Remaining',
      String(remaining)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
