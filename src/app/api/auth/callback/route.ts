import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { logActivity } from '@/lib/supabase/activityLogger';

/**
 * Auth Callback Handler
 *
 * Handles authentication callbacks from Supabase, including:
 * - Email verification (email_change)
 * - Email confirmation
 * - OAuth callbacks
 *
 * When email change is confirmed, this syncs profiles.email with auth.users.email
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  console.log('[Auth Callback] Type:', type, 'Token Hash:', token_hash ? 'present' : 'missing');

  if (token_hash && type) {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Handle cookie setting errors (e.g., in middleware)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Handle cookie removal errors
            }
          },
        },
      }
    );

    try {
      // Verify the token and type
      const { data, error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      });

      if (error) {
        console.error('[Auth Callback] Verification error:', error);
        return NextResponse.redirect(
          new URL(`/error?message=${encodeURIComponent('Email verification failed. Please try again.')}`, request.url)
        );
      }

      console.log('[Auth Callback] Verification successful for user:', data.user?.id);

      // If this is an email change confirmation, sync profiles.email
      if (type === 'email_change' && data.user) {
        const newEmail = data.user.email;

        if (newEmail) {
          console.log('[Auth Callback] Syncing profiles.email to:', newEmail);

          // Update profiles table to match confirmed auth email
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              email: newEmail,
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.user.id);

          if (profileUpdateError) {
            console.error('[Auth Callback] Failed to sync profiles.email:', profileUpdateError);
            // Don't fail the entire callback, but log it
          } else {
            console.log('[Auth Callback] Successfully synced profiles.email');

            // Log the email change activity
            try {
              await logActivity({
                userId: data.user.id,
                eventType: 'email_changed',
                eventCategory: 'user_management',
                details: `User changed their email address to ${newEmail}`,
                metadata: {
                  newEmail,
                  verifiedAt: new Date().toISOString(),
                },
              });
            } catch (logError) {
              console.error('[Auth Callback] Failed to log activity:', logError);
            }
          }
        }
      }

      // Redirect to success page or specified next URL
      const redirectUrl = type === 'email_change'
        ? '/account/settings?email_verified=true'
        : next;

      return NextResponse.redirect(new URL(redirectUrl, request.url));
    } catch (error) {
      console.error('[Auth Callback] Unexpected error:', error);
      return NextResponse.redirect(
        new URL(`/error?message=${encodeURIComponent('An unexpected error occurred during verification.')}`, request.url)
      );
    }
  }

  // If no token_hash or type, redirect to home
  console.log('[Auth Callback] Missing token_hash or type, redirecting to home');
  return NextResponse.redirect(new URL('/', request.url));
}
