// scripts/test-degree-meta-flow.ts
import 'dotenv/config';
import {
  normalizeJobAndApplicant,
} from '../src/lib/gemini/normalization';
import {
  algorithm1_WeightedSum,
  type JobRequirements,
  type ApplicantData,
} from '../src/lib/gemini/scoringAlgorithms';

/**
 * We mirror the degree matching helpers from scoringAlgorithms.ts
 * so we can compute the "base" field similarity before
 * adjustEducationForLevelAndField kicks in.
 */

/**
 * Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * String similarity (0–100) based on Levenshtein
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return Math.max(0, Math.min(100, similarity));
}

/**
 * Remove contaminating text from degree requirement
 */
function cleanDegreeRequirement(degreeReq: string): string {
  const cleaned = degreeReq.split(/\s+(Eligibilities|Skills|Experience):/i)[0].trim();
  return cleaned;
}

/**
 * Extract core field from degree (what comes after "in" or "of")
 */
function extractDegreeField(degree: string): string {
  const inMatch = degree.match(/\bin\s+(.+)$/i);
  if (inMatch) return inMatch[1].trim();

  const ofMatch = degree.match(/\bof\s+(.+)$/i);
  if (ofMatch) return ofMatch[1].trim();

  return degree.trim();
}

/**
 * Parse expressions like "BS IT, BS IS or BS CS"
 */
function parseListExpression(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  const replaced = text
    .replace(/\s+(or|and)\s+/gi, ',')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return replaced;
}

type ListMode = 'SINGLE' | 'AND' | 'OR';

function detectListMode(raw: string): ListMode {
  const lower = raw.toLowerCase();
  if (/\sand\s/.test(lower)) return 'AND';
  if (/\sor\s/.test(lower)) return 'OR';
  return 'SINGLE';
}

/**
 * DEGREE MATCHING (same as in scoringAlgorithms.ts)
 * We use this here to compute the "base" similarity BEFORE
 * adjustEducationForLevelAndField modifies it.
 */
function matchDegreeRequirement(jobDegree: string, applicantDegree: string): number {
  const cleanedJobDegree = cleanDegreeRequirement(jobDegree);
  const jobMode = detectListMode(cleanedJobDegree);
  const jobDegrees = parseListExpression(cleanedJobDegree);

  // Applicant can also have multiple degrees encoded
  const applicantDegrees = parseListExpression(applicantDegree);

  if (!jobDegrees.length || !applicantDegrees.length) return 0;

  const degreeOptionSimilarity = (jobOpt: string, applicantOpt: string): number => {
    const jobField = extractDegreeField(jobOpt);
    const applicantField = extractDegreeField(applicantOpt);
    const similarity = stringSimilarity(jobField, applicantField);

    if (similarity >= 85) {
      return 100;
    }

    return similarity;
  };

  if (jobMode === 'OR') {
    let best = 0;
    for (const jd of jobDegrees) {
      for (const ad of applicantDegrees) {
        const sim = degreeOptionSimilarity(jd, ad);
        best = Math.max(best, sim);
      }
    }
    return best;
  }

  if (jobMode === 'AND') {
    const required = jobDegrees.length;
    let hits = 0;

    for (const jd of jobDegrees) {
      let bestForThisRequirement = 0;

      for (const ad of applicantDegrees) {
        const sim = degreeOptionSimilarity(jd, ad);
        bestForThisRequirement = Math.max(bestForThisRequirement, sim);
      }

      if (bestForThisRequirement >= 85) {
        hits++;
      }
    }

    if (required === 0) return 0;
    return (hits / required) * 100;
  }

  // SINGLE
  let best = 0;
  const cleanedSingleJob = cleanDegreeRequirement(jobDegree);

  for (const ad of applicantDegrees) {
    const sim = stringSimilarity(cleanedSingleJob, ad);
    best = Math.max(best, sim);
  }

  return best;
}

/**
 * Sample cases – you can edit these to whatever you want to inspect.
 */
const testCases: Array<{
  label: string;
  jobDegree: string;
  applicantDegree: string;
}> = [
  {
    label: 'Accountancy vs Business Administration',
    jobDegree: 'Bachelor of Science in Accountancy',
    applicantDegree: 'Bachelor of Science in Business Administration',
  },
  {
    label: 'Accountancy vs Communication',
    jobDegree: 'Bachelor of Science in Accountancy',
    applicantDegree: 'Bachelor of Science in Communication',
  },
  {
    label: 'Accountancy vs Office Administration',
    jobDegree: 'Bachelor of Science in Accountancy',
    applicantDegree: 'Bachelor of Science in Office Administration',
  },
  {
    label: 'Accountancy vs Primary',
    jobDegree: 'Bachelor of Science in Accountancy',
    applicantDegree: 'Primary',
  },
  {
    label: 'Accountancy vs Public Administration',
    jobDegree: 'Bachelor of Science in Accountancy',
    applicantDegree: 'Bachelor of Science in Public Administration',
  },
];

async function main() {
  console.log('===========================================');
  console.log('▶ DEGREE META FLOW – NORMALIZATION + SCORING');
  console.log('===========================================\n');

  for (const tc of testCases) {
    console.log('-------------------------------------------');
    console.log(`Case: ${tc.label}`);
    console.log('-------------------------------------------');
    console.log('RAW VALUES:');
    console.log('  Job degree requirement      :', tc.jobDegree);
    console.log('  Applicant highest attainment:', tc.applicantDegree);
    console.log('');

    // Build minimal JobRequirements / ApplicantData
    const rawJob: JobRequirements = {
      title: 'Test Position',
      description: 'Test description',
      degreeRequirement: tc.jobDegree,
      eligibilities: [],
      skills: [],
      yearsOfExperience: 0,
    };

    const rawApplicant: ApplicantData = {
      highestEducationalAttainment: tc.applicantDegree,
      eligibilities: [],
      skills: [],
      totalYearsExperience: 0,
      workExperienceTitles: [],
    };

    // 1) Normalize (uses degrees.yaml + Gemini if needed)
    const { job: normJob, applicant: normApplicant } =
      await normalizeJobAndApplicant(rawJob, rawApplicant);

    console.log('AFTER NORMALIZATION:');
    console.log('  Job canonical degree        :', normJob.degreeRequirement);
    console.log('  Applicant canonical degree  :', normApplicant.highestEducationalAttainment);
    console.log('  Job degreeLevel             :', normJob.degreeLevel ?? '(none)');
    console.log('  Job degreeFieldGroup        :', normJob.degreeFieldGroup ?? '(none)');
    console.log('  Applicant degreeLevel       :', normApplicant.degreeLevel ?? '(none)');
    console.log('  Applicant degreeFieldGroup  :', normApplicant.degreeFieldGroup ?? '(none)');
    console.log('');

    // 2) Compute base similarity (same as algorithms do BEFORE adjustments)
    const baseSimilarity = matchDegreeRequirement(
      normJob.degreeRequirement.toLowerCase().trim(),
      normApplicant.highestEducationalAttainment.toLowerCase().trim()
    );

    console.log('BASE DEGREE FIELD SIMILARITY (before level/fieldGroup adj.):');
    console.log('  matchDegreeRequirement      :', baseSimilarity.toFixed(2) + '%');
    console.log('');

    // 3) Run Algorithm 1 to see final educationScore
    const score = await algorithm1_WeightedSum(normJob, normApplicant);

    console.log('FINAL EDUCATION SCORE (after adjustEducationForLevelAndField):');
    console.log('  educationScore              :', score.educationScore.toFixed(2) + '%');
    console.log('');
    console.log('OTHER SCORES (for context):');
    console.log('  experienceScore             :', score.experienceScore.toFixed(2) + '%');
    console.log('  skillsScore                 :', score.skillsScore.toFixed(2) + '%');
    console.log('  eligibilityScore            :', score.eligibilityScore.toFixed(2) + '%');
    console.log('  totalScore (Algorithm 1)    :', score.totalScore.toFixed(2) + '%');
    console.log('');
  }

  console.log('Done.\n');
}

main().catch(err => {
  console.error('Error in test-degree-meta-flow:', err);
  process.exit(1);
});
