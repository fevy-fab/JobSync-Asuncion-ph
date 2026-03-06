import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/hr/dashboard/stats
 * Returns dashboard statistics filtered to current HR user's jobs only
 * Ensures multi-tenancy: HR users only see stats for jobs they created
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile and verify HR role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'HR' && profile.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: HR or ADMIN role required' },
        { status: 403 }
      );
    }

    // For ADMIN, show all stats (system-wide)
    // For HR, show only stats for jobs they created
    const isAdmin = profile.role === 'ADMIN';

    // Get jobs for this HR user (or all jobs if ADMIN)
    let jobsQuery = supabase
      .from('jobs')
      .select('id, status');

    if (!isAdmin) {
      // HR: Filter to only jobs they created
      jobsQuery = jobsQuery.eq('created_by', user.id);
    }

    const { data: jobs, error: jobsError } = await jobsQuery;

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    const jobIds = jobs?.map(job => job.id) || [];

    // If HR user has no jobs, return zero stats
    if (!isAdmin && jobIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalScanned: 0,
          pendingReview: 0,
          inProgress: 0,
          approvedHired: 0,
          deniedWithdrawn: 0,
          archived: 0,
          activeJobs: 0,
        }
      });
    }

    // Use parallel count queries instead of fetching all rows
    const buildCountQuery = (statuses: string[]) => {
      let q = supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });
      if (!isAdmin && jobIds.length > 0) {
        q = q.in('job_id', jobIds);
      }
      if (statuses.length === 1) {
        q = q.eq('status', statuses[0]);
      } else {
        q = q.in('status', statuses);
      }
      return q;
    };

    const buildTotalCountQuery = () => {
      let q = supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });
      if (!isAdmin && jobIds.length > 0) {
        q = q.in('job_id', jobIds);
      }
      return q;
    };

    const [
      { count: totalScanned },
      { count: pendingReview },
      { count: inProgress },
      { count: approvedHired },
      { count: deniedWithdrawn },
      { count: archived },
    ] = await Promise.all([
      buildTotalCountQuery(),
      buildCountQuery(['pending', 'under_review']),
      buildCountQuery(['shortlisted', 'interviewed']),
      buildCountQuery(['approved', 'hired']),
      buildCountQuery(['denied', 'withdrawn']),
      buildCountQuery(['archived']),
    ]);

    // Count active jobs
    const activeJobs = jobs?.filter(job => job.status === 'active').length || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalScanned: totalScanned || 0,
        pendingReview: pendingReview || 0,
        inProgress: inProgress || 0,
        approvedHired: approvedHired || 0,
        deniedWithdrawn: deniedWithdrawn || 0,
        archived: archived || 0,
        activeJobs,
      }
    });

  } catch (error: any) {
    console.error('Error in HR dashboard stats API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
