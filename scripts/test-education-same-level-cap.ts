// scripts/test-education-same-level-cap.ts
import 'dotenv/config';
import {
  algorithm1_WeightedSum,
  type JobRequirements,
  type ApplicantData,
} from '../src/lib/gemini/scoringAlgorithms';

/**
 * Local helpers to approximate the "base" degree similarity
 * in the same style as matchDegreeRequirement.
 * (Purely for logging; the real scoring still happens inside algorithm1.)
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

function extractDegreeField(degree: string): string {
  const inMatch = degree.match(/\bin\s+(.+)$/i);
  if (inMatch) return inMatch[1].trim();

  const ofMatch = degree.match(/\bof\s+(.+)$/i);
  if (ofMatch) return ofMatch[1].trim();

  return degree.trim();
}

// Roughly mirror matchDegreeRequirement for a SINGLE degree vs SINGLE degree
function baseDegreeSimilarity(jobDegree: string, applicantDegree: string): number {
  const jobField = extractDegreeField(jobDegree);
  const appField = extractDegreeField(applicantDegree);
  return stringSimilarity(jobField, appField);
}

async function runCase(
  label: string,
  jobDegree: string,
  applicantDegree: string,
  jobLevel?: string,
  applicantLevel?: string
) {
  const job: JobRequirements = {
    title: 'Test Position',
    description: '',
    degreeRequirement: jobDegree,
    eligibilities: [],
    skills: [],
    yearsOfExperience: 1,
    degreeLevel: jobLevel,
    degreeFieldGroup: undefined,
  };

  const applicant: ApplicantData = {
    highestEducationalAttainment: applicantDegree,
    eligibilities: [],
    skills: [],
    totalYearsExperience: 0,
    workExperienceTitles: [],
    degreeLevel: applicantLevel,
    degreeFieldGroup: undefined,
  };

  const base = baseDegreeSimilarity(jobDegree, applicantDegree);
  const result = await algorithm1_WeightedSum(job, applicant);

  console.log('-------------------------------------------');
  console.log(`Case: ${label}`);
  console.log('-------------------------------------------');
  console.log('RAW VALUES:');
  console.log(`  Job degree requirement      : ${jobDegree}`);
  console.log(`  Applicant highest attainment: ${applicantDegree}`);
  console.log(`  jobLevel (meta)             : ${jobLevel ?? '(none)'}`);
  console.log(`  applicantLevel (meta)       : ${applicantLevel ?? '(none)'}`);
  console.log('');
  console.log('BASE DEGREE FIELD SIMILARITY (approx):');
  console.log(`  baseSimilarity              : ${base.toFixed(2)}%`);
  console.log('');
  console.log('FINAL EDUCATION SCORE (algorithm1):');
  console.log(`  educationScore              : ${result.educationScore.toFixed(2)}%`);
  console.log('');
}

async function main() {
  console.log('===========================================');
  console.log('▶ EDUCATION LEVEL + SAME-LEVEL CAP TEST');
  console.log('===========================================\n');

  // 1) Same degree, same level → should stay high (no cap)
  await runCase(
    'Exact same degree (bachelor)',
    'Bachelor of Science in Accountancy',
    'Bachelor of Science in Accountancy',
    'bachelor',
    'bachelor'
  );

  // 2) Different fields, SAME LEVEL bachelor → cap should kick in around 50
  await runCase(
    'Accountancy vs Business Administration (same level)',
    'Bachelor of Science in Accountancy',
    'Bachelor of Science in Business Administration',
    'bachelor',
    'bachelor'
  );

  // 3) Different fields, SAME LEVEL but applicantLevel = "college" (from levels.yaml)
  await runCase(
    'Accountancy vs Business Administration (job bachelor, applicant college)',
    'Bachelor of Science in Accountancy',
    'Bachelor of Science in Business Administration',
    'bachelor',
    'college' // will be normalized to "bachelor" inside adjustEducationForLevelAndField
  );

  // 4) Clearly lower level (Primary vs Bachelor) → should get penalized heavily
  await runCase(
    'Accountancy vs Primary (lower level applicant)',
    'Bachelor of Science in Accountancy',
    'Primary',
    'bachelor',
    'elementary'
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
