import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';

/**
 * Release Hire Status API
 *
 * Endpoint: POST /api/applications/[id]/release-hire
 *
 * Purpose: Allows HR/ADMIN to release an applicant's hired status,
 * enabling them to apply for other positions.
 *
 * Requirements:
 * - HR or ADMIN role required
 * - Application must have 'hired' status
 * - Changes status to 'archived'
 * - Sends notification to applicant
 * - Logs to audit trail
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    // Body is optional; avoid throwing if request has no JSON body
    let release_reason: string | undefined;
    try {
      const body = await request.json();
      release_reason = body?.release_reason;
    } catch {
      release_reason = undefined;
    }

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    // 2. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 3. Check if user is HR or ADMIN
    if (profile.role !== 'HR' && profile.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only HR and Admin can release hire status' },
        { status: 403 }
      );
    }

    // 4. Get application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        applicant_id,
        job_id,
        status,
        hr_notes,
        jobs:job_id (
          id,
          title
        ),
        profiles:applicant_id (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (appError) {
      if (appError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Application not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching application:', appError);
      return NextResponse.json(
        { success: false, error: appError.message },
        { status: 500 }
      );
    }

    // 5. Verify application is in 'hired' status
    if (application.status !== 'hired') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot release hire status - Application status is '${application.status}', not 'hired'`
        },
        { status: 400 }
      );
    }

    // 5.5 Guard: detect multiple hired applications for this applicant
    // This prevents DB triggers/policies that assume only 1 hired row from exploding
    const { data: hiredApps, error: hiredAppsError } = await supabase
      .from('applications')
      .select('id, job_id')
      .eq('applicant_id', application.applicant_id)
      .eq('status', 'hired');

    if (hiredAppsError) {
      console.error('Error checking hired applications:', hiredAppsError);
      return NextResponse.json(
        { success: false, error: hiredAppsError.message },
        { status: 500 }
      );
    }

    if (hiredApps && hiredApps.length > 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Cannot release hire status because this applicant has multiple 'hired' applications ` +
            `(${hiredApps.length}). This will cause DB subquery cardinality errors. ` +
            `Please resolve duplicates first.`,
          details: {
            applicant_id: application.applicant_id,
            hired_application_ids: hiredApps.map(a => a.id),
          },
        },
        { status: 400 }
      );
    }

    // 6. Release hire status by changing to 'archived'
    const currentTimestamp = new Date().toISOString();
    const { data: updatedApplication, error: updateError } = await supabase
      .from('applications')
      .update({
        status: 'archived',
        reviewed_by: user.id,
        reviewed_at: currentTimestamp,
        updated_at: currentTimestamp,
        hr_notes: application.hr_notes
          ? `${application.hr_notes}\n\n[${currentTimestamp}] Hire status released by ${profile.full_name}${release_reason ? `: ${release_reason}` : ''}`
          : `[${currentTimestamp}] Hire status released by ${profile.full_name}${release_reason ? `: ${release_reason}` : ''}`,
      })
      .eq('id', id)
      .eq('status', 'hired')
      .select('id, applicant_id, job_id, status, reviewed_by, reviewed_at, updated_at, hr_notes')
      .maybeSingle();

    if (updateError) {
      console.error('Error releasing hire status:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // If no row was updated, the status likely changed or update was blocked (RLS)
    if (!updatedApplication) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Release failed: application was not updated. It may no longer be in "hired" status, ' +
            'or you may not have permission to update it.',
        },
        { status: 409 }
      );
    }

    // 7. Send notification to applicant
    const jobTitle = (application.jobs as any)?.title || 'a position';
    const applicantName = (application.profiles as any)?.full_name || 'Applicant';

    try {
      await createNotification(application.applicant_id, {
        type: 'system',
        title: 'Hire Status Released',
        message: `Your hire status for "${jobTitle}" has been released by ${profile.full_name} (${profile.role}). You may now apply for other positions.${release_reason ? ` Reason: ${release_reason}` : ''}`,
        related_entity_type: 'application',
        related_entity_id: id,
        link_url: '/applicant/applications',
      });
    } catch (notifError) {
      console.error('Error sending release notification:', notifError);
      // Don't fail the request if notification fails
    }

    // 8. Log to audit trail (automatic via database triggers)
    console.log(`✅ Hire status released for ${applicantName} (${jobTitle}) by ${profile.full_name}`);

    // 9. Return success response
    return NextResponse.json({
      success: true,
      message: `Hire status released successfully for ${applicantName}`,
      application: updatedApplication,
    });

  } catch (error: any) {
    console.error('Server error in POST /api/applications/[id]/release-hire:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
