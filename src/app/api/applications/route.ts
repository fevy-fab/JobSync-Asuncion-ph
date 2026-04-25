import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createInitialStatusHistory, appendStatusHistory } from '@/lib/utils/statusHistory';
import { createNotification, notifyJobCreator, notifyAdmins } from '@/lib/notifications';

/**
 * Application Management API Routes
 *
 * Endpoints:
 * - GET /api/applications - List applications (filtered by user/job/status)
 * - POST /api/applications - Submit application with web-based PDS
 *
 * Database Schema:
 * - applications table: id, job_id, applicant_id, applicant_profile_id, pds_id, status, rank, match_score, created_at
 * - applicant_profiles table: user_id, education, work_experience, eligibilities, skills, etc.
 */

/**
 * Extract applicant data from PDS (web-based forms) with fallback to applicant_profiles (OCR)
 * Prioritizes applicant_pds data since PDF upload feature was removed 2025-01-01
 */
function extractPDSData(pds: any, profile: any) {
  // Extract skills from PDS other_information or fallback to profile
  let skills: string[] = profile?.skills || [];
  if (pds?.other_information?.skills && Array.isArray(pds.other_information.skills)) {
    skills = pds.other_information.skills.map((s: any) => {
      if (typeof s === 'string') return s.trim();
      if (s && s.skillName) return String(s.skillName).trim();
      if (s && s.name) return String(s.name).trim();
      return '';
    }).filter((s: string) => s.length > 0);
  }

  // Extract eligibilities from PDS eligibility array or fallback to profile
  let eligibilities: any[] = profile?.eligibilities || [];
  if (pds?.eligibility && Array.isArray(pds.eligibility)) {
    eligibilities = pds.eligibility.map((e: any) => ({
      eligibilityTitle: e.careerService || e.eligibilityTitle || e.title || e.name || String(e)
    }));
  }

  const getPhilippineTime = () => {
    // If you want to be strict about PH time:
    // return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    // But simplest (and usually fine): just "now"
    return new Date();
  };

  const parseFlexibleDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    if (!s) return null;

    const iso = s.replace(/\//g, '-');
    const isoMatch = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const d = new Date(
        `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
      );
      return isNaN(d.getTime()) ? null : d;
    }

    const dmy = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (dmy) {
      const a = parseInt(dmy[1], 10);
      const b = parseInt(dmy[2], 10);
      const yyyy = dmy[3];

      let dd = a;
      let mm = b;

      if (a > 12 && b <= 12) {
        dd = a; mm = b;
      } else if (b > 12 && a <= 12) {
        mm = a; dd = b;
      }

      const d = new Date(`${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  };

    // Calculate total years of experience from PDS work_experience
  let totalYears = profile?.total_years_experience || 0;

  const workExp = pds?.work_experience ?? pds?.workExperience;

  if (Array.isArray(workExp)) {
    totalYears = workExp.reduce((total: number, work: any) => {
      const fromDateStr =
        work?.periodOfService?.from || work?.from || work?.fromDate || work?.dateFrom;

      const toDateStr =
        work?.periodOfService?.to || work?.to || work?.toDate || work?.dateTo;

      if (!fromDateStr || !toDateStr) return total;

      const from = parseFlexibleDate(fromDateStr);
      const to =
        (typeof toDateStr === 'string' && toDateStr.trim().toLowerCase() === 'present')
          ? getPhilippineTime()
          : parseFlexibleDate(toDateStr);

      if (!from || !to) return total;

      const years = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return total + Math.max(0, years);
    }, 0);

    totalYears = Math.round(totalYears * 10) / 10;
  }


  // Extract highest educational attainment from PDS educational_background
  let education = profile?.highest_educational_attainment || 'Not specified';

  if (pds?.educational_background && Array.isArray(pds.educational_background)) {
    // Normalize and bucket entries by level
    const byLevel = {
      GRADUATE_STUDIES: [] as any[],
      COLLEGE: [] as any[],
      VOCATIONAL: [] as any[],
      SECONDARY: [] as any[],
      ELEMENTARY: [] as any[],
    };

    for (const entry of pds.educational_background) {
      const levelKey = String(entry.level || '').toUpperCase().trim();

      if (levelKey.includes('GRADUATE')) {
        byLevel.GRADUATE_STUDIES.push(entry);
      } else if (levelKey.includes('COLLEGE')) {
        byLevel.COLLEGE.push(entry);
      } else if (levelKey.includes('VOCATIONAL')) {
        byLevel.VOCATIONAL.push(entry);
      } else if (levelKey.includes('SECONDARY') || levelKey.includes('HIGH SCHOOL')) {
        byLevel.SECONDARY.push(entry);
      } else if (levelKey.includes('ELEMENTARY')) {
        byLevel.ELEMENTARY.push(entry);
      }
    }

    // Helper to turn entries into nice degree strings
    const entriesToDegreeNames = (entries: any[]): string[] =>
      entries
        .map((e: any) =>
          e.basicEducationDegreeCourse ||
          e.course ||
          e.degree ||
          e.nameOfSchool ||
          e.level
        )
        .map((s: any) => String(s).trim())
        .filter((s: string) => s.length > 0);

        // Collect degrees to include based on your rules
        const degreesToInclude: string[] = [];

        if (byLevel.GRADUATE_STUDIES.length > 0) {
          // If there is 1 or more graduate studies degrees, take it as highestEducationalAttainment
          degreesToInclude.push(...entriesToDegreeNames(byLevel.GRADUATE_STUDIES));

          // If there is 1 or more both college and graduate studies degrees, take both levels
          if (byLevel.COLLEGE.length > 0) {
            degreesToInclude.push(...entriesToDegreeNames(byLevel.COLLEGE));
          }
        } else if (byLevel.COLLEGE.length > 0) {
          // If there is 1 or more college degrees, take it as highestEducationalAttainment
          degreesToInclude.push(...entriesToDegreeNames(byLevel.COLLEGE));

          // If there is 1 or more both college and vocational degrees, take both levels
          if (byLevel.VOCATIONAL.length > 0) {
            degreesToInclude.push(...entriesToDegreeNames(byLevel.VOCATIONAL));
          }
        } else if (byLevel.VOCATIONAL.length > 0) {
          // If there is 1 or more vocational degrees, take it as highestEducationalAttainment
          degreesToInclude.push(...entriesToDegreeNames(byLevel.VOCATIONAL));
        } else if (byLevel.SECONDARY.length > 0) {
          // No college/vocational/grad, fall back to secondary if present
          degreesToInclude.push(...entriesToDegreeNames(byLevel.SECONDARY));
        } else if (byLevel.ELEMENTARY.length > 0) {
          // Last fallback: elementary
          degreesToInclude.push(...entriesToDegreeNames(byLevel.ELEMENTARY));
        }

    // Format nicely: "A", "A and B", "A, B, and C"
    if (degreesToInclude.length === 1) {
      education = degreesToInclude[0];
    } else if (degreesToInclude.length === 2) {
      education = `${degreesToInclude[0]} and ${degreesToInclude[1]}`;
    } else if (degreesToInclude.length > 2) {
      education = `${degreesToInclude.slice(0, -1).join(', ')}, and ${degreesToInclude[degreesToInclude.length - 1]}`;
    }
  }

  return {
    skills,
    eligibilities,
    total_years_experience: totalYears,
    highest_educational_attainment: education,
  };
}

// GET /api/applications - List applications with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    // 2. Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 3. Parse filters
    const jobId = searchParams.get('job_id');
    const applicantId = searchParams.get('applicant_id');
    const status = searchParams.get('status'); // pending, approved, denied
    const fields = searchParams.get('fields'); // 'summary' for lightweight select
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '300', 10); // default for server-side pagination
    const statuses = searchParams.get('statuses'); // comma-separated statuses for multi-status filters
    const includeCounts = searchParams.get('includeCounts') !== 'false';

    // 4. Build query based on role
    // Use lightweight select for list views, full select for detail views
    const summarySelect = `
      id,
      job_id,
      applicant_id,
      status,
      rank,
      match_score,
      created_at,
      jobs:job_id (
        id,
        title,
        status
      ),
      applicant_profiles:applicant_profile_id (
        id,
        first_name,
        surname
      )
    `;

    // Medium-weight select for paginated list views (tables)
    // Drops heavy JSONB: applicant_pds.educational_background/work_experience/eligibility/other_information
    // and applicant_profiles.education/work_experience (large JSONB arrays)
    const listSelect = `
        id,
        job_id,
        applicant_id,
        applicant_profile_id,
        pds_id,
        status,
        status_history,
        rank,
        match_score,
        education_score,
        experience_score,
        skills_score,
        eligibility_score,
        algorithm_used,
        ranking_reasoning,
        algorithm_details,
        reviewed_by,
        reviewed_at,
        notification_sent,
        hr_notes,
        created_at,
        updated_at,
        matched_skills_count,
        matched_eligibilities_count,
        jobs:job_id (
          id,
          title,
          degree_requirement,
          eligibilities,
          skills,
          years_of_experience,
          status
        ),
        applicant_profiles:applicant_profile_id (
          id,
          user_id,
          surname,
          first_name,
          middle_name,
          eligibilities,
          skills,
          total_years_experience,
          highest_educational_attainment,
          ocr_processed,
          profiles:user_id (
            email,
            profile_image_url
          )
        ),
        applicant_pds:pds_id (
          id,
          signature_url,
          signature_uploaded_at
        )
    `;

    const fullSelect = `
        id,
        job_id,
        applicant_id,
        applicant_profile_id,
        pds_id,
        status,
        status_history,
        rank,
        match_score,
        education_score,
        experience_score,
        skills_score,
        eligibility_score,
        algorithm_used,
        ranking_reasoning,
        algorithm_details,
        reviewed_by,
        reviewed_at,
        notification_sent,
        hr_notes,
        created_at,
        updated_at,
        matched_skills_count,
        matched_eligibilities_count,
        jobs:job_id (
          id,
          title,
          description,
          degree_requirement,
          eligibilities,
          skills,
          years_of_experience,
          location,
          employment_type,
          status,
          created_at,
          profiles:created_by (
            id,
            full_name,
            role
          )
        ),
        applicant_profiles:applicant_profile_id (
          id,
          user_id,
          surname,
          first_name,
          middle_name,
          phone_number,
          mobile_number,
          education,
          work_experience,
          eligibilities,
          skills,
          total_years_experience,
          highest_educational_attainment,
          ocr_processed,
          profiles:user_id (
            email,
            profile_image_url
          )
        ),
        applicant_pds:pds_id (
          id,
          signature_url,
          signature_uploaded_at,
          educational_background,
          work_experience,
          eligibility,
          other_information
        )
    `;

    const selectQuery = fields === 'summary' ? summarySelect : fields === 'list' ? listSelect : fullSelect;

    // 5. Determine role-based filters first (shared between data + count queries)
    let hrJobIds: string[] | null = null;

    if (profile.role === 'HR') {
      const { data: hrJobs, error: hrJobsError } = await supabase
        .from('jobs')
        .select('id')
        .eq('created_by', user.id);

      if (hrJobsError) {
        console.error('Error fetching HR jobs:', hrJobsError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch HR jobs' },
          { status: 500 }
        );
      }
      hrJobIds = hrJobs?.map(job => job.id) || [];
    }

    // Helper: apply shared filters to any query builder
    const applyFilters = (q: any) => {
      if (profile.role === 'APPLICANT') {
        q = q.eq('applicant_id', user.id);
      } else if (profile.role === 'HR') {
        if (hrJobIds && hrJobIds.length > 0) {
          q = q.in('job_id', hrJobIds);
        } else {
          q = q.eq('job_id', '00000000-0000-0000-0000-000000000000');
        }
        if (jobId && hrJobIds?.includes(jobId)) {
          q = q.eq('job_id', jobId);
        }
        if (applicantId) {
          q = q.eq('applicant_id', applicantId);
        }
      } else if (profile.role === 'ADMIN') {
        if (jobId) q = q.eq('job_id', jobId);
        if (applicantId) q = q.eq('applicant_id', applicantId);
      } else {
        return null; // invalid role
      }

      // Status filters
      if (statuses) {
        q = q.in('status', statuses.split(','));
      } else if (status) {
        q = q.eq('status', status);
      }

      return q;
    };

    // Helper: apply shared filters WITHOUT status (for cross-status counts)
    const applyBaseFilters = (q: any) => {
      if (profile.role === 'APPLICANT') {
        q = q.eq('applicant_id', user.id);
      } else if (profile.role === 'HR') {
        if (hrJobIds && hrJobIds.length > 0) {
          q = q.in('job_id', hrJobIds);
        } else {
          q = q.eq('job_id', '00000000-0000-0000-0000-000000000000');
        }
        if (jobId && hrJobIds?.includes(jobId)) {
          q = q.eq('job_id', jobId);
        }
        if (applicantId) {
          q = q.eq('applicant_id', applicantId);
        }
      } else if (profile.role === 'ADMIN') {
        if (jobId) q = q.eq('job_id', jobId);
        if (applicantId) q = q.eq('applicant_id', applicantId);
      } else {
        return null;
      }
      // No status filter applied — intentional for cross-status counts
      return q;
    };

    // 6. Build data query (no count — joins make count slow)
    let dataQuery = supabase
      .from('applications')
      .select(selectQuery)
      .order('created_at', { ascending: false });

    dataQuery = applyFilters(dataQuery);
    if (!dataQuery) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Invalid role' },
        { status: 403 }
      );
    }

    // 7. Apply pagination if limit is specified
    if (limit > 0) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      dataQuery = dataQuery.range(from, to);
    }

    const statusGroups: Record<string, string[]> = {
      needsAction: ['pending'],
      inProgress: ['under_review', 'shortlisted', 'interviewed'],
      approved: ['approved', 'hired'],
      denied: ['denied'],
    };

    let countQuery: any = null;
    let statusCountQueries: any[] = [];

    if (includeCounts) {
      countQuery = supabase
        .from('applications')
        .select('id', { count: 'exact', head: true });

      countQuery = applyFilters(countQuery);

      statusCountQueries = Object.entries(statusGroups).map(([, groupStatuses]) => {
        let q = supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .in('status', groupStatuses);

        q = applyBaseFilters(q);
        return q ? q : Promise.resolve({ count: 0, error: null, data: null });
      });
    }

    const [dataResult, countResult, ...statusCountResults] = await Promise.all([
      dataQuery,
      includeCounts && countQuery
        ? countQuery
        : Promise.resolve({ count: null, error: null, data: null }),
      ...statusCountQueries,
    ]);

    const { data: applications, error } = dataResult;
    if (countResult?.error) {
      console.error('Error in count query:', countResult.error);
    }
    let totalCount = countResult?.count ?? 0;

    console.log('[applications/GET] Count debug:', {
      role: profile.role,
      userId: user.id,
      hrJobIdsLength: hrJobIds?.length ?? 'N/A',
      countResult: countResult?.count,
      countError: countResult?.error?.message ?? null,
      statusCounts: statusCountResults.map((r: any, i: number) => ({
        group: Object.keys(statusGroups)[i],
        count: r?.count,
        error: r?.error?.message ?? null,
      })),
      dataLength: dataResult?.data?.length ?? 0,
    });

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 9. Process each application to extract PDS data (skip for summary/list mode)
    const processedApplications = (fields === 'summary' || fields === 'list')
      ? applications || []
      : (applications?.map((app: any) => {
          const pds = app.applicant_pds;
          const profile = app.applicant_profiles;
          const extracted = extractPDSData(pds, profile);
          return { ...app, _extracted: extracted };
        }) || []);

    // Build statusCounts from parallel query results
    const statusCountKeys = Object.keys(statusGroups);
    const statusCounts: Record<string, number> = {
      needsAction: 0,
      inProgress: 0,
      approved: 0,
      denied: 0,
    };

    if (includeCounts) {
      const statusCountKeys = Object.keys(statusGroups);

      statusCountKeys.forEach((key, i) => {
        statusCounts[key] = (statusCountResults[i] as any)?.count ?? 0;
      });
    }

    // Fallback: if counts are 0 but data exists, use admin client to bypass RLS
    const allCountsZero = totalCount === 0 && Object.values(statusCounts).every(v => v === 0);
    if (includeCounts && processedApplications.length > 0 && allCountsZero) {
      console.warn('[applications/GET] Count queries returned 0 but data exists. Using admin fallback.');
      try {
        const adminSupabase = createAdminClient();

        const buildAdminBaseFilter = (q: any) => {
          if (profile.role === 'HR' && hrJobIds && hrJobIds.length > 0) {
            q = q.in('job_id', hrJobIds);
          }
          if (jobId) q = q.eq('job_id', jobId);
          if (applicantId) q = q.eq('applicant_id', applicantId);
          return q;
        };

        // Total count
        const adminCountResult = await buildAdminBaseFilter(
          adminSupabase.from('applications').select('id', { count: 'exact', head: true })
        );
        if (adminCountResult.count !== null && adminCountResult.count > 0) {
          totalCount = adminCountResult.count;
        }

        // Status counts
        const adminStatusResults = await Promise.all(
          Object.entries(statusGroups).map(([, statuses]) =>
            buildAdminBaseFilter(
              adminSupabase.from('applications').select('id', { count: 'exact', head: true }).in('status', statuses)
            )
          )
        );
        Object.keys(statusGroups).forEach((key, i) => {
          if (adminStatusResults[i]?.count != null) {
            statusCounts[key] = adminStatusResults[i].count;
          }
        });
      } catch (e) {
        console.error('[applications/GET] Admin count fallback failed:', e);
      }
    }

    const responseData: any = {
      success: true,
      data: processedApplications,
      count: processedApplications.length,
      statusCounts,
    };

    // Include pagination metadata when limit is specified
    if (limit > 0 && totalCount !== null) {
      responseData.pagination = {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      };
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Server error in GET /api/applications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/applications - Submit job application
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    // 2. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 3. Only applicants can submit applications
    if (profile.role !== 'APPLICANT') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only applicants can submit applications' },
        { status: 403 }
      );
    }

    // 4. Validate required fields
    const { job_id, pds_id } = body;

    if (!job_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: job_id' },
        { status: 400 }
      );
    }

    if (!pds_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: pds_id - Please complete your PDS first' },
        { status: 400 }
      );
    }

    // 5. Verify job exists and is active
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, status')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'This job has been closed.' },
        { status: 400 }
      );
    }

    if (job.status === 'archived') {
      return NextResponse.json(
        { success: false, error: 'This job posting has been archived and is no longer available.' },
        { status: 400 }
      );
    }

    if (job.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'This job is no longer accepting applications.' },
        { status: 400 }
      );
    }

    // 6. Check if applicant is currently hired for another job
    const { data: hiredApp, error: hiredCheckError } = await supabase
      .from('applications')
      .select('job_id, jobs:job_id(title), updated_at')
      .eq('applicant_id', user.id)
      .eq('status', 'hired')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (hiredCheckError) {
      console.error('Error checking hired status:', hiredCheckError);
      return NextResponse.json(
        { success: false, error: hiredCheckError.message },
        { status: 500 }
      );
    }

    if (hiredApp) {
      const hiredTitle = (hiredApp.jobs as any)?.title || 'another position';
      return NextResponse.json(
        {
          success: false,
          error: `You have already been hired for "${hiredTitle}". Please complete that position before applying to new roles.`,
        },
        { status: 403 }
      );
    }

    // 7. Check for ACTIVE application (exclude withdrawn, denied, archived)
    const { data: existingApplication, error: duplicateError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('job_id', job_id)
      .eq('applicant_id', user.id)
      .not('status', 'in', '(withdrawn,denied,archived)')
      .maybeSingle();

    if (duplicateError) {
      console.error('Error checking duplicate application:', duplicateError);
      return NextResponse.json(
        { success: false, error: duplicateError.message },
        { status: 500 }
      );
    }

    if (existingApplication) {
      return NextResponse.json(
        { success: false, error: 'You already have an active application for this job.' },
        { status: 400 }
      );
    }

    // 8. Ensure applicant_profile exists, create if not
    let applicantProfileId: string;

    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('applicant_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // If "no rows found" is returned as an error in your setup, ignore that case.
    if (profileCheckError && (profileCheckError as any).code !== 'PGRST116') {
      console.error('Error checking applicant profile:', profileCheckError);
      return NextResponse.json(
        { success: false, error: profileCheckError.message },
        { status: 500 }
      );
    }

    if (existingProfile) {
      applicantProfileId = existingProfile.id;
    } else {
      const { data: newProfile, error: createProfileError } = await supabase
        .from('applicant_profiles')
        .insert({
          user_id: user.id,
          first_name: profile.full_name?.split(' ')[0] || '',
          surname: profile.full_name?.split(' ').slice(1).join(' ') || '',
          ocr_processed: false,
          ai_processed: false,
        })
        .select('id')
        .single();

      if (createProfileError || !newProfile) {
        console.error('Error creating applicant profile:', createProfileError);
        return NextResponse.json(
          { success: false, error: 'Failed to create applicant profile' },
          { status: 500 }
        );
      }

      applicantProfileId = newProfile.id;
    }

    /**
     * OPTION B (No RLS change): DO NOT UPDATE old withdrawn/denied/archived applications.
     * Reapply is handled by INSERTING a new application row.
     *
     * This is already supported by the active-duplicate check above which excludes:
     * (withdrawn, denied, archived).
     *
     * So: no "reopen" logic here. Always proceed to insert.
     */

    // 9. Create application (always insert)
    const currentTimestamp = new Date().toISOString();
    const insertData = {
      job_id,
      applicant_id: user.id,
      applicant_profile_id: applicantProfileId,
      pds_id,
      status: 'pending',
      notification_sent: false,
      // Initialize status_history with the initial "null → pending" transition
      status_history: createInitialStatusHistory('pending', currentTimestamp, user.id),
    };

    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert(insertData)
      .select(`
        id,
        job_id,
        applicant_id,
        pds_id,
        status,
        created_at,
        jobs:job_id (
          id,
          title,
          description
        )
      `)
      .single();

    if (applicationError) {
      console.error('Error creating application:', applicationError);
      return NextResponse.json(
        {
          success: false,
          error: applicationError.message,
          code: (applicationError as any).code,
          details: (applicationError as any).details,
          hint: (applicationError as any).hint,
        },
        { status: 500 }
      );
    }

    // 10. Send notifications
    try {
      await createNotification(profile.id, {
        type: 'application_status',
        title: 'Application Submitted Successfully',
        message: `Your application for "${job.title}" has been received and is under review.`,
        related_entity_type: 'application',
        related_entity_id: application.id,
        link_url: '/applicant/applications',
      });

      await notifyJobCreator(job_id, profile.full_name);

      await notifyAdmins({
        type: 'system',
        title: 'New Job Application Received',
        message: `${profile.full_name} applied for "${job.title}"`,
        related_entity_type: 'application',
        related_entity_id: application.id,
        link_url: '/hr/scanned-records',
      });
    } catch (notifError) {
      console.error('Error sending notifications:', notifError);
    }

    return NextResponse.json(
      {
        success: true,
        data: application,
        message: `Application submitted successfully for ${job.title}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Server error in POST /api/applications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
