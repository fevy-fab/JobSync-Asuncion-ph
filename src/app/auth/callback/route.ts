import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/supabase/activityLogger';

/**
 * Auth Callback Handler
 *
 * Handles email confirmation and password reset links from Supabase Auth.
 * This route is called when users click on email links sent by Supabase.
 *
 * Supported flows:
 * - PKCE flow (modern): Supabase /auth/v1/verify exchanges token and creates session automatically
 * - OTP flow (legacy): Requires manual verifyOtp() call with token_hash
 *
 * Auth types:
 * - Email confirmation (signup)
 * - Password reset (recovery)
 * - Email change confirmation
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') || '/';

    console.log('🔐 Auth callback triggered:', { type, has_token_hash: !!token_hash });

    const supabase = await createClient();

    // ========================================
    // PKCE FLOW (Modern Supabase Auth)
    // ========================================
    // After Supabase's /auth/v1/verify endpoint processes PKCE token,
    // the session is already established. Check for it first.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (session) {
      console.log('✅ PKCE flow: Session already established for user:', session.user.id);

      // PKCE flow succeeded - handle based on type parameter
      if (type === 'recovery') {
        console.log('➡️ Password reset: Redirecting to reset password page');
        return NextResponse.redirect(
          new URL('/reset-password', requestUrl.origin)
        );
      }

      if (type === 'signup' || type === 'email') {
        console.log('➡️ Email confirmation: Redirecting to login');
        return NextResponse.redirect(
          new URL('/login?message=Email confirmed! Please login to continue.', requestUrl.origin)
        );
      }

      if (type === 'email_change') {
        console.log('➡️ Email change: Syncing profiles.email and redirecting to dashboard');

        // Sync profiles.email from auth.users
        if (session.user.email) {
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              email: session.user.email,
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.user.id);

          if (profileUpdateError) {
            console.error('[Auth Callback] Failed to sync profiles.email:', profileUpdateError);
          } else {
            console.log('[Auth Callback] PKCE: Successfully synced profiles.email');
            try {
              await logActivity({
                userId: session.user.id,
                eventType: 'email_changed',
                eventCategory: 'user_management',
                details: `User changed their email address to ${session.user.email}`,
                metadata: { newEmail: session.user.email, verifiedAt: new Date().toISOString() },
              });
            } catch (logError) {
              console.error('[Auth Callback] Failed to log activity:', logError);
            }
          }
        }

        // Get user profile to determine which dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const dashboardMap: Record<string, string> = {
          ADMIN: '/admin/dashboard',
          HR: '/hr/dashboard',
          PESO: '/peso/dashboard',
          APPLICANT: '/applicant/dashboard',
        };

        const dashboardPath = profile?.role
          ? dashboardMap[profile.role]
          : '/applicant/dashboard';

        return NextResponse.redirect(
          new URL(dashboardPath + '?message=Email updated successfully', requestUrl.origin)
        );
      }

      // Unknown type with valid session - redirect to next or default
      console.log('➡️ Unknown type with session, redirecting to:', next);
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // ========================================
    // OTP FLOW (Legacy / Fallback)
    // ========================================
    // If no session exists, try OTP verification with token_hash
    if (token_hash && type) {
      console.log('🔄 Attempting OTP flow with token_hash');

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'email' | 'recovery' | 'signup' | 'email_change',
      });

      if (error) {
        console.error('❌ OTP verification error:', error.message);

        // Redirect to appropriate error page based on type
        if (type === 'recovery') {
          return NextResponse.redirect(
            new URL('/forgot-password?error=Invalid or expired reset link', requestUrl.origin)
          );
        }

        return NextResponse.redirect(
          new URL('/login?error=Invalid or expired authentication link', requestUrl.origin)
        );
      }

      console.log('✅ OTP verification successful:', { type, userId: data.user?.id });

      // Handle different auth flows for OTP
      switch (type) {
        case 'recovery':
          // Password reset - redirect to reset password page
          console.log('➡️ OTP flow: Redirecting to reset password page');
          return NextResponse.redirect(
            new URL('/reset-password', requestUrl.origin)
          );

        case 'signup':
        case 'email':
          // Email confirmation - redirect to login with success message
          console.log('➡️ OTP flow: Email confirmed, redirecting to login');
          return NextResponse.redirect(
            new URL('/login?message=Email confirmed! Please login to continue.', requestUrl.origin)
          );

        case 'email_change':
          // Email change confirmation - sync profiles.email and redirect to user's dashboard
          console.log('➡️ OTP flow: Email change confirmed, syncing profiles.email');

          // Sync profiles.email from auth.users
          if (data.user?.email) {
            const { error: otpProfileUpdateError } = await supabase
              .from('profiles')
              .update({
                email: data.user.email,
                updated_at: new Date().toISOString(),
              })
              .eq('id', data.user.id);

            if (otpProfileUpdateError) {
              console.error('[Auth Callback] OTP: Failed to sync profiles.email:', otpProfileUpdateError);
            } else {
              console.log('[Auth Callback] OTP: Successfully synced profiles.email');
              try {
                await logActivity({
                  userId: data.user.id,
                  eventType: 'email_changed',
                  eventCategory: 'user_management',
                  details: `User changed their email address to ${data.user.email}`,
                  metadata: { newEmail: data.user.email, verifiedAt: new Date().toISOString() },
                });
              } catch (logError) {
                console.error('[Auth Callback] Failed to log activity:', logError);
              }
            }
          }

          // Get user profile to determine which dashboard
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user!.id)
            .single();

          const dashboardMap: Record<string, string> = {
            ADMIN: '/admin/dashboard',
            HR: '/hr/dashboard',
            PESO: '/peso/dashboard',
            APPLICANT: '/applicant/dashboard',
          };

          const dashboardPath = profile?.role
            ? dashboardMap[profile.role]
            : '/applicant/dashboard';

          return NextResponse.redirect(
            new URL(dashboardPath + '?message=Email updated successfully', requestUrl.origin)
          );

        default:
          // Unknown type - redirect to next URL or login
          console.log('➡️ OTP flow: Unknown auth type, redirecting to next:', next);
          return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    }

    // ========================================
    // ERROR: No session and no token_hash
    // ========================================
    console.error('❌ No session or token_hash found - invalid authentication link');
    return NextResponse.redirect(
      new URL('/login?error=Invalid authentication link', requestUrl.origin)
    );
  } catch (error: any) {
    console.error('❌ Auth callback exception:', error);
    return NextResponse.redirect(
      new URL('/login?error=Authentication failed. Please try again.', new URL(request.url).origin)
    );
  }
}
