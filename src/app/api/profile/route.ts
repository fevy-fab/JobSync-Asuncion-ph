import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProfileSchema } from '@/lib/validation/profileSchema';
import { logActivity } from '@/lib/supabase/activityLogger';

/**
 * GET /api/profile
 * Fetch current user's profile information
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, profile_image_url, role, status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in GET /api/profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Update current user's profile information
 * Body: { full_name?, email?, phone? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate request data
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updates = validation.data;
    let emailChangeInitiated = false;

    // Check if email is being changed and if it conflicts with existing users
    if (updates.email && updates.email !== user.email) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', updates.email)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use by another account' },
          { status: 409 }
        );
      }

      // Trigger email change verification in auth.users
      // Supabase will send verification emails to BOTH current and new email addresses
      const { error: authUpdateError } = await supabase.auth.updateUser({
        email: updates.email,
      });

      if (authUpdateError) {
        console.error('Error updating auth email:', authUpdateError);

        // Handle rate limit errors specifically
        if (authUpdateError.code === 'over_email_send_rate_limit' || authUpdateError.status === 429) {
          return NextResponse.json(
            {
              error: 'Too many email change requests. Please wait a few minutes before trying again.',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: 300 // 5 minutes in seconds
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to initiate email change. Please try again.' },
          { status: 500 }
        );
      }

      // DO NOT update profiles.email immediately
      // It will be synced automatically when email verification is completed
      // Remove email from updates to prevent immediate update
      delete updates.email;
      emailChangeInitiated = true;
    }

    // Update profile in database (RLS enforces user can only update own profile)
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, full_name, email, phone, profile_image_url, role, status')
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Log activity
    try {
      await logActivity({
        userId: user.id,
        eventType: 'profile_updated',
        eventCategory: 'user_management',
        details: 'User updated their profile information',
        metadata: {
          updatedFields: Object.keys(updates),
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log profile update activity:', logError);
    }

    return NextResponse.json(
      {
        message: emailChangeInitiated
          ? 'Profile updated. Email verification required: Check both your current and new email addresses for confirmation links.'
          : 'Profile updated successfully',
        profile: updatedProfile,
        emailChangeInitiated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in PATCH /api/profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}