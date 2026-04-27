import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/hr/dashboard/stats
 * Returns dashboard statistics.
 *
 * ADMIN: sees all applications/jobs.
 * HR: sees only applications attached to jobs created by that HR user.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    const isAdmin = profile.role === 'ADMIN';

    let jobsQuery = adminSupabase
      .from('jobs')
      .select('id, status');

    if (!isAdmin) {
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

    const jobIds = jobs?.map((job) => job.id) || [];

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
        },
      });
    }

    const applyHrScope = (q: any) => {
      if (!isAdmin) {
        return q.in('job_id', jobIds);
      }

      return q;
    };

    const buildCountQuery = (statuses?: string[]) => {
      let q = adminSupabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      q = applyHrScope(q);

      if (statuses && statuses.length === 1) {
        q = q.eq('status', statuses[0]);
      } else if (statuses && statuses.length > 1) {
        q = q.in('status', statuses);
      }

      return q;
    };

    const [
      { count: totalScanned, error: totalError },
      { count: pendingReview, error: pendingError },
      { count: inProgress, error: progressError },
      { count: approvedHired, error: approvedError },
      { count: deniedWithdrawn, error: deniedError },
      { count: archived, error: archivedError },
    ] = await Promise.all([
      buildCountQuery(),
      buildCountQuery(['pending', 'under_review']),
      buildCountQuery(['shortlisted', 'interviewed']),
      buildCountQuery(['approved', 'hired']),
      buildCountQuery(['denied', 'withdrawn']),
      buildCountQuery(['archived']),
    ]);

    const queryError =
      totalError ||
      pendingError ||
      progressError ||
      approvedError ||
      deniedError ||
      archivedError;

    if (queryError) {
      console.error('Error fetching dashboard stats:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch dashboard stats' },
        { status: 500 }
      );
    }

    const activeJobs =
      jobs?.filter((job) => job.status === 'active').length || 0;

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
      },
    });
  } catch (error: any) {
    console.error('Error in HR dashboard stats API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}