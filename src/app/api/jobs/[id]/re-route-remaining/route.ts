import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';
import { batchReRouteApplicants, type ReRoutingResult } from '@/lib/gemini/reRouting';

/**
 * Re-route Remaining Applicants API
 *
 * Endpoint: POST /api/jobs/[id]/re-route-remaining
 *
 * Purpose: After HR fills positions, this endpoint:
 * 1. Identifies all remaining applicants (pending/under_review)
 * 2. Uses Gemini AI to find best alternative job for each
 * 3. Creates new applications for re-routed jobs
 * 4. Marks original applications as 're_routed'
 * 5. Sends notifications to applicants with re-routing details
 *
 * Requirements:
 * - HR or ADMIN role required
 * - HR can only re-route their own jobs
 * - Prevents infinite re-routing loops (max 2 per 30 days)
 * - Excludes hired applicants
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { id: jobId } = await params;
    const body = await request.json();
    const { customReason } = body; // Optional custom message for applicants

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
        { success: false, error: 'Forbidden - Only HR and Admin can re-route applicants' },
        { status: 403 }
      );
    }

    // 4. Get job details and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, description, status, created_by, degree_requirement, eligibilities, skills, years_of_experience')
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

    // HR can only re-route their own jobs, ADMIN can re-route any
    if (profile.role === 'HR' && job.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only re-route applicants from jobs you created' },
        { status: 403 }
      );
    }

    // 5. Get all re-routable applicants using database function
    const { data: reRoutableApplicants, error: applicantsError } = await adminClient
      .rpc('get_re_routable_applicants', { p_job_id: jobId });

    if (applicantsError) {
      console.error('Error fetching re-routable applicants:', applicantsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch applicants' },
        { status: 500 }
      );
    }

    if (!reRoutableApplicants || reRoutableApplicants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No applicants to re-route (all are already processed or hired elsewhere)',
        reRoutedCount: 0,
        deniedCount: 0,
        skippedCount: 0,
        results: [],
      });
    }

    // 6. Check re-routing limits for each applicant
    const applicantsWithinLimits = [];
    const skippedDueToLimit = [];

    for (const applicant of reRoutableApplicants) {
      const { data: reRouteCount, error: countError } = await adminClient
        .rpc('count_recent_re_routes', {
          p_applicant_id: applicant.applicant_id,
          p_days: 30
        });

      if (countError) {
        console.error(`Error checking re-route count for ${applicant.applicant_id}:`, countError);
        continue;
      }

      if (reRouteCount >= 2) {
        skippedDueToLimit.push({
          applicantId: applicant.applicant_id,
          applicantName: applicant.applicant_name,
          reason: 'Maximum re-routes reached (2 per 30 days)'
        });
      } else {
        applicantsWithinLimits.push(applicant);
      }
    }

    if (applicantsWithinLimits.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All applicants have reached re-routing limit',
        reRoutedCount: 0,
        deniedCount: 0,
        skippedCount: skippedDueToLimit.length,
        skippedApplicants: skippedDueToLimit,
        results: [],
      });
    }

    // 7. Fetch applicant data (PDS prioritized over profiles)
    const applicantsData = await Promise.all(
      applicantsWithinLimits.map(async (app) => {
        // Try PDS first
        const { data: pds } = await adminClient
          .from('applicant_pds')
          .select('educational_background, eligibility, other_information, work_experience')
          .eq('id', app.pds_id!)
          .single();

        // Fallback to profile
        const { data: profile } = await adminClient
          .from('applicant_profiles')
          .select('highest_educational_attainment, eligibilities, skills, total_years_experience, work_experience')
          .eq('id', app.applicant_profile_id!)
          .single();

        // Extract data (prioritize PDS)
        let highestEducationalAttainment = '';
        let eligibilities: Array<{ eligibilityTitle: string }> = [];
        let skills: string[] = [];
        let totalYearsExperience = 0;
        let workExperienceTitles: string[] = [];

        if (pds) {
          // Extract from PDS
          const educationArray = Array.isArray(pds.educational_background) ? pds.educational_background : [];
          if (educationArray.length > 0) {
            highestEducationalAttainment = educationArray[educationArray.length - 1]?.level || '';
          }

          eligibilities = Array.isArray(pds.eligibility) ? pds.eligibility.map((e: any) => ({
            eligibilityTitle: e.careerService || e.eligibilityTitle || ''
          })) : [];

          const otherInfo = pds.other_information || {};
          skills = Array.isArray(otherInfo.skills)
            ? otherInfo.skills
                .filter((s: any) => typeof s === 'string' && s.trim())
                .map((s: string) => s.trim())
            : [];

          const workExp = Array.isArray(pds.work_experience) ? pds.work_experience : [];
          workExperienceTitles = workExp.map((w: any) => w.positionTitle || '').filter(Boolean);

          // Calculate years of experience
          totalYearsExperience = workExp.reduce((total: number, exp: any) => {
            if (exp.periodOfService?.from && exp.periodOfService?.to) {
              const from = new Date(exp.periodOfService.from);
              const to = new Date(exp.periodOfService.to);
              return total + ((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365));
            }
            return total;
          }, 0);
        } else if (profile) {
          // Use profile data
          highestEducationalAttainment = profile.highest_educational_attainment || '';
          eligibilities = Array.isArray(profile.eligibilities) ? profile.eligibilities : [];
          skills = Array.isArray(profile.skills)
            ? profile.skills
                .filter((s: any) => typeof s === 'string' && s.trim())
                .map((s: string) => s.trim())
            : [];
          totalYearsExperience = profile.total_years_experience || 0;

          const workExp = Array.isArray(profile.work_experience) ? profile.work_experience : [];
          workExperienceTitles = workExp.map((w: any) => w.positionTitle || w.title || '').filter(Boolean);
        }

        return {
          applicantId: app.applicant_id,
          applicantName: app.applicant_name,
          applicationId: app.application_id,
          highestEducationalAttainment,
          eligibilities,
          skills,
          totalYearsExperience,
          workExperienceTitles,
        };
      })
    );

    // 8. Fetch all active alternative jobs (excluding current job)
    const { data: alternativeJobs, error: jobsError } = await adminClient
      .from('jobs')
      .select('id, title, description, degree_requirement, eligibilities, skills, years_of_experience')
      .eq('status', 'active')
      .neq('id', jobId);

    if (jobsError) {
      console.error('Error fetching alternative jobs:', jobsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch alternative jobs' },
        { status: 500 }
      );
    }

    if (!alternativeJobs || alternativeJobs.length === 0) {
      // No alternatives - deny all instead
      const denialResults = await denyAllApplicantsNoAlternatives(
        adminClient,
        applicantsWithinLimits,
        job.title,
        user.id,
        profile.full_name
      );

      return NextResponse.json({
        success: true,
        message: 'No alternative jobs available - all applicants denied',
        reRoutedCount: 0,
        deniedCount: denialResults.deniedCount,
        skippedCount: skippedDueToLimit.length,
        skippedApplicants: skippedDueToLimit,
        results: denialResults.results,
      });
    }

    // 9. Use Gemini AI to find best alternatives for each applicant
    const reRoutingResults: ReRoutingResult[] = await batchReRouteApplicants(
      applicantsData,
      { id: jobId, title: job.title },
      alternativeJobs.map(j => ({
        id: j.id,
        title: j.title,
        description: j.description,
        degreeRequirement: j.degree_requirement,
        eligibilities: Array.isArray(j.eligibilities)
          ? j.eligibilities.filter((e: any) => typeof e === 'string' && e.trim())
          : [],
        skills: Array.isArray(j.skills)
          ? j.skills.filter((s: any) => typeof s === 'string' && s.trim())
          : [],
        yearsOfExperience: j.years_of_experience || 0,
      }))
    );

    // 10. Process re-routing results
    let reRoutedCount = 0;
    let deniedCount = 0;
    const processedResults = [];

    for (const result of reRoutingResults) {
      const applicantData = applicantsData.find(a => a.applicantId === result.applicantId);
      if (!applicantData) continue;

      if (result.bestAlternative) {
        // Create new application for alternative job
        const { data: newApplication, error: createError } = await adminClient
          .from('applications')
          .insert({
            job_id: result.bestAlternative.jobId,
            applicant_id: result.applicantId,
            pds_id: applicantsWithinLimits.find(a => a.applicant_id === result.applicantId)?.pds_id,
            applicant_profile_id: applicantsWithinLimits.find(a => a.applicant_id === result.applicantId)?.applicant_profile_id,
            status: 'pending',
            re_routed_from_job_id: jobId,
            re_routing_reason: result.bestAlternative.reason,
            match_score: result.bestAlternative.matchScore,
            education_score: result.bestAlternative.educationScore,
            experience_score: result.bestAlternative.experienceScore,
            skills_score: result.bestAlternative.skillsScore,
            eligibility_score: result.bestAlternative.eligibilityScore,
            matched_skills_count: result.bestAlternative.matchedSkillsCount,
            matched_eligibilities_count: result.bestAlternative.matchedEligibilitiesCount,
            status_history: [
              {
                from: null,
                to: 'pending',
                changed_at: new Date().toISOString(),
                changed_by: user.id,
                note: `Application created via re-routing from "${job.title}"`
              }
            ]
          })
          .select('id')
          .single();

        if (createError) {
          console.error(`Error creating new application for ${result.applicantId}:`, createError);
          continue;
        }

        // Update original application to 're_routed' status
        const { error: updateError } = await adminClient
          .from('applications')
          .update({
            status: 're_routed',
            re_routed_to_job_id: result.bestAlternative.jobId,
            re_routed_at: new Date().toISOString(),
            re_routed_by: user.id,
            re_routing_reason: result.bestAlternative.reason,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            status_history: adminClient.rpc('append_status_history', {
              current_history: [],
              new_entry: {
                from: 'pending',
                to: 're_routed',
                changed_at: new Date().toISOString(),
                changed_by: user.id,
                note: `Re-routed to "${result.bestAlternative.jobTitle}" by ${profile.full_name}`
              }
            })
          })
          .eq('id', applicantData.applicationId);

        if (updateError) {
          console.error(`Error updating application ${applicantData.applicationId}:`, updateError);
          continue;
        }

        // Send notification to applicant
        await createNotification(result.applicantId, {
          type: 'application_status',
          title: 'Application Re-routed',
          message: `Your application for "${job.title}" has been re-routed to "${result.bestAlternative.jobTitle}" - a better match for your qualifications. ${result.bestAlternative.reason} Please review the new position and prepare for potential next steps.`,
          related_entity_type: 'application',
          related_entity_id: newApplication.id,
          link_url: `/applicant/jobs?highlight=${newApplication.id}`,
        });

        reRoutedCount++;
        processedResults.push({
          applicantId: result.applicantId,
          applicantName: result.applicantName,
          action: 're_routed',
          fromJob: job.title,
          toJob: result.bestAlternative.jobTitle,
          matchScore: result.bestAlternative.matchScore,
          reason: result.bestAlternative.reason,
          newApplicationId: newApplication.id,
        });
      } else {
        // No suitable alternative - deny with explanation
        const { error: denyError } = await adminClient
          .from('applications')
          .update({
            status: 'denied',
            denial_reason: result.noAlternativeReason || 'No suitable alternative positions found',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', applicantData.applicationId);

        if (!denyError) {
          await createNotification(result.applicantId, {
            type: 'application_status',
            title: 'Application Status Update',
            message: `Your application for "${job.title}" has been closed. ${result.noAlternativeReason || 'Unfortunately, no suitable alternative positions are currently available.'} We encourage you to check our job board regularly for new opportunities.`,
            related_entity_type: 'application',
            related_entity_id: applicantData.applicationId,
            link_url: `/applicant/applications`,
          });

          deniedCount++;
          processedResults.push({
            applicantId: result.applicantId,
            applicantName: result.applicantName,
            action: 'denied',
            reason: result.noAlternativeReason,
          });
        }
      }
    }

    // 11. Return summary
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${reRoutedCount + deniedCount} applicants`,
      reRoutedCount,
      deniedCount,
      skippedCount: skippedDueToLimit.length,
      skippedApplicants: skippedDueToLimit,
      results: processedResults,
    });

  } catch (error) {
    console.error('Error in re-route-remaining endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to deny all applicants when no alternative jobs exist
 */
async function denyAllApplicantsNoAlternatives(
  adminClient: any,
  applicants: any[],
  jobTitle: string,
  userId: string,
  userFullName: string
) {
  let deniedCount = 0;
  const results = [];

  for (const applicant of applicants) {
    const { error: denyError } = await adminClient
      .from('applications')
      .update({
        status: 'denied',
        denial_reason: 'No suitable alternative positions available at this time',
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicant.application_id);

    if (!denyError) {
      await createNotification(applicant.applicant_id, {
        type: 'application_status',
        title: 'Application Status Update',
        message: `Your application for "${jobTitle}" has been closed. Unfortunately, no suitable alternative positions are currently available. We encourage you to check our job board regularly for new opportunities that match your qualifications.`,
        related_entity_type: 'application',
        related_entity_id: applicant.application_id,
        link_url: `/applicant/applications`,
      });

      deniedCount++;
      results.push({
        applicantId: applicant.applicant_id,
        applicantName: applicant.applicant_name,
        action: 'denied',
        reason: 'No alternative jobs available',
      });
    }
  }

  return { deniedCount, results };
}
