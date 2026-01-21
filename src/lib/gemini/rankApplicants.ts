/**
 * Gemini AI Integration for Applicant Ranking
 *
 * Uses the three mathematical algorithms plus Gemini AI for enhanced reasoning
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ensembleScore,
  algorithm1_WeightedSum,
  algorithm2_SkillExperienceComposite,
  algorithm3_EligibilityEducationTiebreaker,
  type JobRequirements,
  type ApplicantData,
  type ScoreBreakdown,
} from './scoringAlgorithms';
import { findTieGroups, breakTiesWithAI, type TieBreakResult } from './aiTieBreaker';
import { normalizeJobAndApplicant } from './normalization';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AlgorithmDetails {
  algorithm1Score?: number;
  algorithm2Score?: number;
  algorithm3Score?: number;
  ensembleMethod: 'weighted_average' | 'tie_breaker';
  algorithm1Weight?: number;
  algorithm2Weight?: number;
  isTieBreaker: boolean;
  scoreDifference?: number;
}

export interface RankedApplicant {
  applicantId: string;
  applicantName: string;
  rank: number;
  matchScore: number;
  educationScore: number;
  experienceScore: number;
  skillsScore: number;
  eligibilityScore: number;
  algorithmUsed: string;
  rankingReasoning: string;
  geminiInsights?: string;
  algorithmDetails?: AlgorithmDetails;
  matchedSkillsCount: number; // Number of job skills matched by applicant
  matchedEligibilitiesCount: number; // Number of job eligibilities matched by applicant
}

/**
 * Rank all applicants for a specific job using ensemble scoring
 * Now with degree/eligibility canonicalization via YAML + Gemini classifier,
 * and SBERT-enhanced skill similarity.
 */
export async function rankApplicantsForJob(
  job: {
    id: string;
    title: string;
    description: string;
    degreeRequirement: string;
    eligibilities: string[];
    skills: string[];
    yearsOfExperience: number;
  },
  applicants: Array<{
    applicantId: string;
    applicantProfileId: string;
    applicantName: string;
    highestEducationalAttainment: string;
    eligibilities: Array<{ eligibilityTitle: string }>;
    skills: string[];
    totalYearsExperience: number;
    workExperienceTitles?: string[];
  }>
): Promise<RankedApplicant[]> {
  // ✅ PHASE 2: Batched processing to stay within Gemini API rate limits
  // Process applicants in batches to avoid overwhelming the API
  const BATCH_SIZE = 5; // Process 5 applicants at a time
  const DELAY_BETWEEN_BATCHES_MS = 2000; // 2 second delay between batches

  const scoredApplicants: Array<{
    applicantId: string;
    applicantName: string;
    matchScore: number;
    educationScore: number;
    experienceScore: number;
    skillsScore: number;
    eligibilityScore: number;
    algorithmUsed: string;
    rankingReasoning: string;
    algorithmDetails: AlgorithmDetails;
    matchedSkillsCount: number;
    matchedEligibilitiesCount: number;
  }> = [];

  // Score all applicants in batches (with caching, most API calls are now avoided)
  for (let i = 0; i < applicants.length; i += BATCH_SIZE) {
    const batch = applicants.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async applicant => {
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

      // 🔹 Normalize degrees + eligibilities using YAML + Gemini classifier
      const { job: normalizedJobReq, applicant: normalizedApplicantData } =
        await normalizeJobAndApplicant(jobReq, applicantData);

      // Get individual algorithm scores (using normalized data)
      const score1 = await algorithm1_WeightedSum(normalizedJobReq, normalizedApplicantData);
      const score2 = await algorithm2_SkillExperienceComposite(
        normalizedJobReq,
        normalizedApplicantData
      );
      const scoreDiff = Math.abs(score1.totalScore - score2.totalScore);

      // Get ensemble score
      const score = await ensembleScore(normalizedJobReq, normalizedApplicantData);

      // Determine algorithm details
      let algorithmDetails: AlgorithmDetails;

      if (scoreDiff <= 5) {
        // Tie-breaker used
        const score3 = await algorithm3_EligibilityEducationTiebreaker(
          normalizedJobReq,
          normalizedApplicantData
        );
        algorithmDetails = {
          algorithm1Score: score1.totalScore,
          algorithm2Score: score2.totalScore,
          algorithm3Score: score3.totalScore,
          ensembleMethod: 'tie_breaker',
          isTieBreaker: true,
          scoreDifference: scoreDiff,
        };
      } else {
        // Weighted average used
        algorithmDetails = {
          algorithm1Score: score1.totalScore,
          algorithm2Score: score2.totalScore,
          ensembleMethod: 'weighted_average',
          algorithm1Weight: 0.6,
          algorithm2Weight: 0.4,
          isTieBreaker: false,
          scoreDifference: scoreDiff,
        };
      }

      return {
        ...applicant,
        ...score,
        algorithmDetails,
      };
    }));

    scoredApplicants.push(...batchResults);

    // Add delay between batches (except after the last batch)
    if (i + BATCH_SIZE < applicants.length) {
      console.log(`   ⏳ Processed ${i + batchResults.length}/${applicants.length} applicants, waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  // Sort by total score (descending) with tie-breaking (unchanged)
  const sortedApplicants = scoredApplicants.sort((a, b) => {
    // Primary: Total match score
    if (Math.abs(b.totalScore - a.totalScore) >= 0.01) {
      return b.totalScore - a.totalScore;
    }

    // Secondary: Eligibility score (highest priority in tie-breaker)
    if (Math.abs(b.eligibilityScore - a.eligibilityScore) >= 0.01) {
      return b.eligibilityScore - a.eligibilityScore;
    }

    // Tertiary: Education score
    if (Math.abs(b.educationScore - a.educationScore) >= 0.01) {
      return b.educationScore - a.educationScore;
    }

    // Quaternary: Experience score
    if (Math.abs(b.experienceScore - a.experienceScore) >= 0.01) {
      return b.experienceScore - a.experienceScore;
    }

    // Quinary: Skills score
    if (Math.abs(b.skillsScore - a.skillsScore) >= 0.01) {
      return b.skillsScore - a.skillsScore;
    }

    // Senary: Raw experience values (when percentage scores are identical, favor more actual years)
    if (b.totalYearsExperience !== a.totalYearsExperience) {
      return b.totalYearsExperience - a.totalYearsExperience;
    }

    // Septenary: Raw skills count (when all else is equal, more skills is better)
    const aSkillsCount = a.skills?.length || 0;
    const bSkillsCount = b.skills?.length || 0;
    if (bSkillsCount !== aSkillsCount) {
      return bSkillsCount - aSkillsCount;
    }

    // Final: Maintain original order (stable sort based on application order)
    return 0;
  });

  // AI-Powered Tie-Breaking: Differentiate candidates with identical scores
  console.log('🔍 Checking for tied candidates...');

  const tieGroups = findTieGroups(
    sortedApplicants.map(app => ({
      applicantId: app.applicantId,
      applicantName: app.applicantName,
      matchScore: app.totalScore,
      educationScore: app.educationScore,
      experienceScore: app.experienceScore,
      skillsScore: app.skillsScore,
      eligibilityScore: app.eligibilityScore,
      highestEducationalAttainment: app.highestEducationalAttainment,
      totalYearsExperience: app.totalYearsExperience,
      skills: app.skills,
      eligibilities: app.eligibilities,
      workExperienceTitles: app.workExperienceTitles,
    }))
  );

  if (tieGroups.length > 0) {
    console.log(
      `   Found ${tieGroups.length} tie groups with ${tieGroups.reduce(
        (sum, g) => sum + g.applicants.length,
        0
      )} total tied candidates`
    );

    // Break ties using AI
    const tieBreakResults = await breakTiesWithAI(tieGroups, job.title, job.description);

    // Apply micro-adjustments
    if (tieBreakResults.length > 0) {
      tieBreakResults.forEach(result => {
        const applicant = sortedApplicants.find(a => a.applicantId === result.applicantId);
        if (applicant) {
          applicant.totalScore += result.microAdjustment;
          applicant.reasoning += ` [AI Tie-break: ${result.reasoning}]`;
        }
      });

      // Re-sort after applying micro-adjustments
      sortedApplicants.sort((a, b) => b.totalScore - a.totalScore);
      console.log('   ✅ Ties broken successfully, candidates re-sorted');
    }
  } else {
    console.log('   ✨ No tied candidates found - all scores are unique!');
  }

  // Assign final ranks
  const rankedApplicants: RankedApplicant[] = sortedApplicants.map((applicant, index) => ({
    applicantId: applicant.applicantId,
    applicantName: applicant.applicantName,
    rank: index + 1,
    matchScore: applicant.totalScore,
    educationScore: applicant.educationScore,
    experienceScore: applicant.experienceScore,
    skillsScore: applicant.skillsScore,
    eligibilityScore: applicant.eligibilityScore,
    algorithmUsed: applicant.algorithmUsed,
    rankingReasoning: applicant.reasoning,
    algorithmDetails: applicant.algorithmDetails,
    matchedSkillsCount: applicant.matchedSkillsCount,
    matchedEligibilitiesCount: applicant.matchedEligibilitiesCount,
  }));

  // Get Gemini AI insights for top 5 candidates (unchanged)
  if (rankedApplicants.length > 0) {
    try {
      await addGeminiInsights(job, rankedApplicants.slice(0, Math.min(5, rankedApplicants.length)));
    } catch (error) {
      console.error('Gemini AI insights failed:', error);
      // Continue without insights
    }
  }

  return rankedApplicants;
}

/**
 * Use Gemini AI to provide additional insights for top candidates
 */
async function addGeminiInsights(
  job: any,
  topCandidates: RankedApplicant[]
): Promise<void> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // ✅ Using stable Gemini 2.0 Flash

  const prompt = `You are an HR expert analyzing job applicants.

Job Position: ${job.title}
Job Description: ${job.description}
Requirements:
- Education: ${job.degreeRequirement}
- Experience: ${job.yearsOfExperience} years
- Skills: ${job.skills.join(', ')}
- Eligibilities: ${job.eligibilities.join(', ')}

Top ${topCandidates.length} Candidates (already scored):
${topCandidates
  .map(
    (c, i) => `
${i + 1}. ${c.applicantName}
   - Match Score: ${c.matchScore.toFixed(1)}%
   - Algorithm: ${c.algorithmUsed}
   - Scoring: Education ${c.educationScore.toFixed(
     1
   )}%, Experience ${c.experienceScore.toFixed(1)}%, Skills ${c.skillsScore.toFixed(
     1
   )}%, Eligibility ${c.eligibilityScore.toFixed(1)}%
`
  )
  .join('\n')}

For each candidate, provide a brief (2-3 sentences) professional insight about their fit for this role. Focus on:
1. Key strengths that make them suitable
2. Any potential concerns or gaps
3. Recommendation (Highly Recommended / Recommended / Conditional)

Format your response as:
Candidate 1: [Your insight]
Candidate 2: [Your insight]
...

Keep it concise and professional.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the response and assign insights to candidates
    const insights = text.split(/Candidate \d+:/g).slice(1);

    topCandidates.forEach((candidate, index) => {
      if (insights[index]) {
        candidate.geminiInsights = insights[index].trim();
      }
    });
  } catch (error) {
    console.error('Error generating Gemini insights:', error);
    throw error;
  }
}

/**
 * Re-rank all applicants for a specific job (used when job requirements change)
 */
export async function reRankJobApplicants(jobId: string): Promise<RankedApplicant[]> {
  // This will be called from the API endpoint
  // The API will fetch the job and applicants from the database
  throw new Error('Use the API endpoint /api/jobs/[id]/rank to re-rank applicants');
}
