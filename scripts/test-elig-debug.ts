// scripts/test-elig-debug.ts
import 'dotenv/config';
import { normalizeEligibilityValue, normalizeJobAndApplicant } from '../src/lib/gemini/normalization';
import type { JobRequirements, ApplicantData } from '../src/lib/gemini/scoringAlgorithms';

async function main() {
  console.log('▶ TEST 1: Individual eligibility normalization\n');

  const samples = [
    'Career Service Professional',
    'Career Service Professional Eligibility',
    'Career Service Professional Eligibility (Second Level)',
  ];

  for (const raw of samples) {
    const res = await normalizeEligibilityValue(raw);
    console.log('RAW:', JSON.stringify(raw));
    console.log('  method:', res.method);
    console.log('  canonicalKey:', res.canonicalKey ?? 'NONE');
    console.log('  confidence:', res.confidence);
    console.log('---');
  }

  console.log('\n▶ TEST 2: Job + Applicant normalization\n');

  const job: JobRequirements = {
    title: 'Administrative Officer II',
    description: 'Test job for CSC_PROF matching',
    degreeRequirement: 'Bachelor’s Degree in any relevant field',
    eligibilities: ['Career Service Professional'],
    skills: [],
    yearsOfExperience: 1,
  };

  const applicant: ApplicantData = {
    highestEducationalAttainment: 'BS Public Administration',
    eligibilities: [
      { eligibilityTitle: 'Career Service Professional Eligibility' },
    ],
    skills: [],
    totalYearsExperience: 1,
    workExperienceTitles: [],
  };

  const { job: normJob, applicant: normApplicant } = await normalizeJobAndApplicant(job, applicant);

  console.log('\n[TEST] Normalized job eligibilities:', normJob.eligibilities);
  console.log('[TEST] Normalized applicant eligibilities:', normApplicant.eligibilities.map(e => e.eligibilityTitle));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
