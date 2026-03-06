import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware to refresh Supabase sessions
 * This ensures that the user's session is always up-to-date
 * and accessible in Server Components and API Routes
 */
export async function middleware(request: NextRequest) {
  // Early return for public paths — skip Supabase client creation entirely
  const { pathname, searchParams } = request.nextUrl;
  const hasAuthCode = searchParams.has('code');

  // If root path has ?code= param, it's an auth callback (email change, etc.)
  // Don't skip — let it exchange the code for a session below
  if (
    (pathname === '/' && !hasAuthCode) ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/role-select' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next();
  }

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
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle auth code exchange on root path (email change confirmation, etc.)
  // After getUser() above, the code has been exchanged for a session.
  // Redirect the user to their dashboard with a success message.
  if (pathname === '/' && hasAuthCode && user) {
    // Sync profiles.email with the confirmed auth email
    await supabase
      .from('profiles')
      .update({ email: user.email, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    const url = request.nextUrl.clone();
    url.pathname = '/applicant/settings';
    url.searchParams.delete('code');
    url.searchParams.set('message', 'Email updated successfully!');
    const redirectResponse = NextResponse.redirect(url);
    // Copy full Set-Cookie headers to preserve options (path, httpOnly, secure, sameSite, maxAge)
    supabaseResponse.headers.getSetCookie().forEach(cookie => {
      redirectResponse.headers.append('Set-Cookie', cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
