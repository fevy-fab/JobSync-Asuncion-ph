/**
 * Gemini AI-powered Re-routing Service
 *
 * Finds the best alternative job for applicants when their current
 * application needs to be re-routed (e.g., position filled)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ensembleScore,
  algorithm1_WeightedSum,
  algorithm2_SkillExperienceComposite,
  type JobRequirements,
  type ApplicantData,
} from './scoringAlgorithms';
import { normalizeJobAndApplicant } from './normalization';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AlternativeJobMatch {
  jobId: string;
  jobTitle: string;
  matchScore: number;
  reason: string; // AI-generated explanation
  educationScore: number;
  experienceScore: number;
  skillsScore: number;
  eligibilityScore: number;
  matchedSkillsCount: number;
  matchedEligibilitiesCount: number;
}

export interface ReRoutingResult {
  applicantId: string;
  applicantName: string;
  originalJobId: string;
  originalJobTitle: string;
  bestAlternative: AlternativeJobMatch | null;
  noAlternativeReason?: string;
}

/**
 * Find the best alternative job for a single applicant
 * @param applicant The applicant's data
 * @param currentJob The job they're currently applied to
 * @param alternativeJobs List of active jobs to consider (excluding current job)
 * @returns The best matching alternative job with AI reasoning, or null if none suitable
 */
export async function findBestAlternativeJob(
  applicant: {
    applicantId: string;
    applicantName: string;
    highestEducationalAttainment: string;
    eligibilities: Array<{ eligibilityTitle: string }>;
    skills: string[];
    totalYearsExperience: number;
    workExperienceTitles?: string[];
  },
  currentJob: {
    id: string;
    title: string;
  },
  alternativeJobs: Array<{
    id: string;
    title: string;
    description: string;
    degreeRequirement: string;
    eligibilities: string[];
    skills: string[];
    yearsOfExperience: number;
  }>
): Promise<AlternativeJobMatch | null> {
  if (alternativeJobs.length === 0) {
    return null;
  }

  // Score the applicant against each alternative job
  const jobScores = await Promise.all(
    alternativeJobs.map(async (job) => {
      const jobReq: JobRequirements = {
        title: job.title,
        description: job.description,
        degreeRequirement: job.degreeRequirement,
        eligibilities: job.eligibilities,
        skills: job.skills,
        yearsOfExperience: job.yearsOfExperience,
      };

      const applicantData: ApplicantData = {
        highestEducationalAttainment: applicant.highestEducationalAttainment,
        eligibilities: applicant.eligibilities,
        skills: applicant.skills,
        totalYearsExperience: applicant.totalYearsExperience,
        workExperienceTitles: applicant.workExperienceTitles,
      };

      // Normalize degrees + eligibilities using YAML + Gemini classifier
      const { job: normalizedJobReq, applicant: normalizedApplicantData } =
        await normalizeJobAndApplicant(jobReq, applicantData);

      // Calculate scores using both algorithms
      const algo1Result = algorithm1_WeightedSum(normalizedJobReq, normalizedApplicantData);
      const algo2Result = algorithm2_SkillExperienceComposite(normalizedJobReq, normalizedApplicantData);

      // Use ensemble scoring to get final match score
      const ensembleResult = ensembleScore(algo1Result, algo2Result);

      return {
        jobId: job.id,
        jobTitle: job.title,
        jobDescription: job.description,
        matchScore: ensembleResult.finalScore,
        educationScore: ensembleResult.breakdown.education,
        experienceScore: ensembleResult.breakdown.experience,
        skillsScore: ensembleResult.breakdown.skills,
        eligibilityScore: ensembleResult.breakdown.eligibility,
        matchedSkillsCount: algo1Result.matchedSkillsCount,
        matchedEligibilitiesCount: algo1Result.matchedEligibilitiesCount,
      };
    })
  );

  // Filter out jobs with very low match scores (< 30%)
  const viableJobs = jobScores.filter(job => job.matchScore >= 30);

  if (viableJobs.length === 0) {
    return null;
  }

  // Sort by match score (highest first)
  viableJobs.sort((a, b) => b.matchScore - a.matchScore);

  // Get the best match
  const bestMatch = viableJobs[0];

  // Generate AI reasoning for why this is the best alternative
  const reason = await generateReRoutingReason(
    applicant.applicantName,
    currentJob.title,
    bestMatch.jobTitle,
    bestMatch.jobDescription,
    bestMatch.matchScore,
    {
      education: bestMatch.educationScore,
      experience: bestMatch.experienceScore,
      skills: bestMatch.skillsScore,
      eligibility: bestMatch.eligibilityScore,
    }
  );

  return {
    jobId: bestMatch.jobId,
    jobTitle: bestMatch.jobTitle,
    matchScore: bestMatch.matchScore,
    reason,
    educationScore: bestMatch.educationScore,
    experienceScore: bestMatch.experienceScore,
    skillsScore: bestMatch.skillsScore,
    eligibilityScore: bestMatch.eligibilityScore,
    matchedSkillsCount: bestMatch.matchedSkillsCount,
    matchedEligibilitiesCount: bestMatch.matchedEligibilitiesCount,
  };
}

/**
 * Generate AI reasoning for why a particular job is the best alternative
 */
async function generateReRoutingReason(
  applicantName: string,
  originalJob: string,
  alternativeJob: string,
  alternativeJobDescription: string,
  matchScore: number,
  scoreBreakdown: {
    education: number;
    experience: number;
    skills: number;
    eligibility: number;
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // ✅ Using stable Gemini 2.0 Flash

  const prompt = `You are an HR assistant helping to explain why an applicant is being re-routed from one job to another.

**Applicant:** ${applicantName}
**Original Job:** ${originalJob}
**Alternative Job:** ${alternativeJob}
**Alternative Job Description:** ${alternativeJobDescription}

**Match Scores:**
- Overall Match: ${matchScore.toFixed(1)}%
- Education Match: ${scoreBreakdown.education.toFixed(1)}%
- Experience Match: ${scoreBreakdown.experience.toFixed(1)}%
- Skills Match: ${scoreBreakdown.skills.toFixed(1)}%
- Eligibility Match: ${scoreBreakdown.eligibility.toFixed(1)}%

Generate a brief, professional explanation (2-3 sentences) for why this alternative position is a better match for the applicant's qualifications. Focus on the strongest matching areas and how this role aligns with their profile.

Keep the tone encouraging and professional. Do not mention the original job being filled or closed.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating re-routing reason:', error);
    // Fallback to a generic message
    return `Based on your qualifications, this position offers a ${matchScore.toFixed(0)}% match to your profile, with strong alignment in ${
      scoreBreakdown.skills > 70 ? 'skills' :
      scoreBreakdown.education > 70 ? 'education' :
      scoreBreakdown.experience > 70 ? 'experience' : 'multiple areas'
    }.`;
  }
}

/**
 * Batch process re-routing for multiple applicants
 * @param applicants List of applicants to re-route
 * @param currentJob The job they're currently applied to
 * @param alternativeJobs List of active jobs to consider
 * @returns Array of re-routing results for each applicant
 */
export async function batchReRouteApplicants(
  applicants: Array<{
    applicantId: string;
    applicantName: string;
    highestEducationalAttainment: string;
    eligibilities: Array<{ eligibilityTitle: string }>;
    skills: string[];
    totalYearsExperience: number;
    workExperienceTitles?: string[];
  }>,
  currentJob: {
    id: string;
    title: string;
  },
  alternativeJobs: Array<{
    id: string;
    title: string;
    description: string;
    degreeRequirement: string;
    eligibilities: string[];
    skills: string[];
    yearsOfExperience: number;
  }>
): Promise<ReRoutingResult[]> {
  const results = await Promise.all(
    applicants.map(async (applicant) => {
      const bestAlternative = await findBestAlternativeJob(
        applicant,
        currentJob,
        alternativeJobs
      );

      const result: ReRoutingResult = {
        applicantId: applicant.applicantId,
        applicantName: applicant.applicantName,
        originalJobId: currentJob.id,
        originalJobTitle: currentJob.title,
        bestAlternative,
      };

      if (!bestAlternative) {
        result.noAlternativeReason =
          alternativeJobs.length === 0
            ? 'No active job postings available'
            : 'No suitable alternative positions found matching your qualifications (minimum 30% match required)';
      }

      return result;
    })
  );

  return results;
}
