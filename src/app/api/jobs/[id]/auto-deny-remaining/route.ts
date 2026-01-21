import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notifyAdmins, notifyHR } from '@/lib/notifications';

/**
 * Auto-Deny All Remaining Applicants API
 *
 * Endpoint: POST /api/jobs/[id]/auto-deny-remaining
 *
 * Purpose: When HR has approved enough applicants to fill a position,
 * this endpoint automatically:
 * 1. Changes job status to 'closed'
 * 2. Denies all remaining pending applicants
 * 3. Sends batch notifications to denied applicants
 * 4. Logs the bulk action
 *
 * Requirements:
 * - HR or ADMIN role required
 * - HR can only close their own jobs
 * - ADMIN can close any job
 * - Only processes applicants with 'pending' status
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: jobId } = await params;
    const body = await request.json();
    const { reason } = body; // Optional reason for denial

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
        { success: false, error: 'Forbidden - Only HR and Admin can close jobs and deny applicants' },
        { status: 403 }
      );
    }

    // 4. Get job details and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, status, created_by')
      .eq('id', jobId)
      .single();

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching job:', jobError);
      return NextResponse.json(
        { success: false, error: jobError.message },
        { status: 500 }
      );
    }

    // HR can only close their own jobs, ADMIN can close any
    if (profile.role === 'HR' && job.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only close jobs you created' },
        { status: 403 }
      );
    }

    // 5. Check if job is already closed
    if (job.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Job is already closed' },
        { status: 400 }
      );
    }

    // 6. Fetch all pending applicants
    const { data: pendingApplications, error: applicationsError } = await supabase
      .from('applications')
      .select(`
        id,
        applicant_id,
        status,
        status_history,
        profiles:applicant_id (
          id,
          full_name,
          email
        )
      `)
      .eq('job_id', jobId)
      .eq('status', 'pending');

    if (applicationsError) {
      console.error('Error fetching pending applications:', applicationsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pending applications' },
        { status: 500 }
      );
    }

    const pendingCount = pendingApplications?.length || 0;

    // 7. If no pending applications, just close the job
    if (pendingCount === 0) {
      // Update job status to closed
      const { error: closeJobError } = await supabase
        .from('jobs')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (closeJobError) {
        console.error('Error closing job:', closeJobError);
        return NextResponse.json(
          { success: false, error: 'Failed to close job' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Job "${job.title}" closed successfully. No pending applications to deny.`,
        deniedCount: 0,
        jobClosed: true,
      });
    }

    // 8. Use database function to batch deny applications (bypasses RLS)
    const currentTimestamp = new Date().toISOString();
    const denialReason = reason || 'Position has been filled';

    // Call the server-side function that handles batch denial atomically
    const { data: denialResult, error: denyError } = await supabase
      .rpc('auto_deny_remaining_applications', {
        p_job_id: jobId,
        p_user_id: user.id,
        p_reason: denialReason
      })
      .single();

    if (denyError) {
      console.error('Error denying applications via database function:', denyError);
      return NextResponse.json(
        { success: false, error: 'Failed to deny applications: ' + denyError.message },
        { status: 500 }
      );
    }

    // Extract results from function
    const actualDeniedCount = denialResult?.denied_count || 0;
    const deniedApplicantIds = denialResult?.denied_applicant_ids || [];
    const deniedApplicationIds = denialResult?.denied_application_ids || [];

    console.log(`✅ Successfully denied ${actualDeniedCount} applications via database function`);

    // 9. Update job status to 'closed'
    const { error: closeJobError } = await supabase
      .from('jobs')
      .update({
        status: 'closed',
        updated_at: currentTimestamp,
      })
      .eq('id', jobId);

    if (closeJobError) {
      console.error('Error closing job:', closeJobError);
      // Job denial succeeded but closing failed - still return success with warning
      console.warn('Applications denied but job status update failed');
    }

    // 10. Send batch notifications to all denied applicants
    try {
      if (deniedApplicantIds.length > 0 && deniedApplicationIds.length > 0) {
        const notificationsToCreate = deniedApplicantIds.map((applicantId, index) => ({
          user_id: applicantId,
          type: 'application_status',
          title: 'Application Status Update',
          message: `The position for "${job.title}" has been filled. Your application has been closed.${denialReason ? ` Reason: ${denialReason}.` : ''} We encourage you to apply for other opportunities.`,
          related_entity_type: 'application',
          related_entity_id: deniedApplicationIds[index],
          link_url: '/applicant/applications',
          is_read: false,
          created_at: currentTimestamp,
        }));

        console.log(`🔔 Attempting to create ${notificationsToCreate.length} notifications for denied applicants...`);

        // Use admin client to bypass RLS for bulk notification creation
        // HR needs to create notifications for applicants (different user_ids)
        const supabaseAdmin = createAdminClient();

        // Batch insert notifications
        // Note: Removed .select('id') to avoid RLS errors on SELECT after INSERT
        // We already have the notification data in notificationsToCreate array
        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert(notificationsToCreate);

        if (notifError) {
          console.error('❌ Error creating batch notifications:');
          console.error('Error Code:', notifError.code);
          console.error('Error Message:', notifError.message);
          console.error('Error Details:', notifError.details);
          console.error('Error Hint:', notifError.hint);
          console.error('Full Error:', JSON.stringify(notifError, null, 2));
          // Don't fail the request if notifications fail
        } else {
          console.log(`✅ Successfully created ${notificationsToCreate.length} notifications`);

          // Mark applications as notification_sent = true (use admin client for consistency)
          const { error: updateError } = await supabaseAdmin
            .from('applications')
            .update({ notification_sent: true })
            .in('id', deniedApplicationIds);

          if (updateError) {
            console.error('⚠️  Failed to update notification_sent flag:', updateError);
          } else {
            console.log(`✅ Marked ${deniedApplicationIds.length} applications as notification_sent`);
          }
        }
      }
    } catch (notifError) {
      console.error('❌ Exception while sending batch notifications:');
      console.error(notifError);
      // Don't fail the request if notifications fail
    }

    // 11. Log activity
    try {
      await supabase.rpc('log_job_status_changed', {
        p_user_id: user.id,
        p_job_id: jobId,
        p_old_status: job.status,
        p_new_status: 'closed',
        p_metadata: {
          job_title: job.title,
          action: 'auto_deny_remaining',
          denied_count: actualDeniedCount,
          reason: denialReason,
          bulk_operation: true,
        }
      });
    } catch (logError) {
      console.error('Error logging auto-deny action:', logError);
      // Don't fail the request if logging fails
    }

    // 12. Notify HR and ADMIN of the action
    try {
      // Notify HR user (confirmation)
      await notifyHR(user.id, {
        type: 'system',
        title: 'Job Closed & Applicants Denied',
        message: `Job "${job.title}" has been closed. ${actualDeniedCount} pending ${actualDeniedCount === 1 ? 'applicant was' : 'applicants were'} automatically denied.`,
        related_entity_type: 'job',
        related_entity_id: jobId,
        link_url: '/hr/ranked-records',
      });

      // Notify all admins
      await notifyAdmins({
        type: 'system',
        title: 'HR Closed Job with Auto-Deny',
        message: `${profile.full_name} closed "${job.title}" and denied ${actualDeniedCount} pending ${actualDeniedCount === 1 ? 'applicant' : 'applicants'}`,
        related_entity_type: 'job',
        related_entity_id: jobId,
        link_url: '/admin/user-management',
      });
    } catch (notifError) {
      console.error('Error sending HR/Admin notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    // 13. Return success response
    return NextResponse.json({
      success: true,
      message: `Job "${job.title}" closed successfully. ${actualDeniedCount} pending ${actualDeniedCount === 1 ? 'applicant was' : 'applicants were'} denied.`,
      deniedCount: actualDeniedCount,
      jobClosed: true,
      deniedApplicantIds,
      deniedApplicationIds,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Server error in POST /api/jobs/[id]/auto-deny-remaining:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
