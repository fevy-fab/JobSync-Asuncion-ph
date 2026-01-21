// scripts/debug-eligibility-flow.ts
import 'dotenv/config';
import {
  normalizeJobAndApplicant,
  debugDumpEligibilityState,
} from '../src/lib/gemini/normalization';
import {
  algorithm1_WeightedSum,
  type JobRequirements,
  type ApplicantData,
} from '../src/lib/gemini/scoringAlgorithms';

async function main() {
  console.log('===================================');
  console.log('▶ STEP 0: DICTIONARY CHECK (SHORT)');
  console.log('===================================\n');

  await debugDumpEligibilityState();

  console.log('\n===================================');
  console.log('▶ STEP 1: BUILD SAMPLE JOB & APPLICANT');
  console.log('===================================\n');

  const job: JobRequirements = {
    title: 'Administrative Officer II',
    description: 'Sample AO II job for debugging eligibility matching.',
    degreeRequirement: 'Bachelor of Public Administration',
    eligibilities: ['Career Service Professional Eligibility'], // job requirement
    skills: ['records management', 'public administration', 'communication skills'],
    yearsOfExperience: 2,
  };

  const applicant: ApplicantData = {
    highestEducationalAttainment: 'Bachelor of Public Administration',
    eligibilities: [
      {
        // applicant actual text
        eligibilityTitle: 'Career Service Professional',
      },
    ],
    skills: ['records management', 'communication skills'],
    totalYearsExperience: 3,
    workExperienceTitles: ['Administrative Aide', 'Administrative Assistant'],
  };

  console.log('RAW job.eligibilities:', job.eligibilities);
  console.log(
    'RAW applicant.eligibilities:',
    applicant.eligibilities.map((e) => e.eligibilityTitle),
  );

  console.log('\n===================================');
  console.log('▶ STEP 2: NORMALIZE JOB & APPLICANT (YAML + GEMINI CLASSIFIER)');
  console.log('===================================\n');

  const { job: normalizedJob, applicant: normalizedApplicant } =
    await normalizeJobAndApplicant(job, applicant);

  console.log('NORM job.degreeRequirement:', normalizedJob.degreeRequirement);
  console.log('NORM job.eligibilities:', normalizedJob.eligibilities);

  console.log(
    'NORM applicant.highestEducationalAttainment:',
    normalizedApplicant.highestEducationalAttainment,
  );
  console.log(
    'NORM applicant.eligibilities:',
    normalizedApplicant.eligibilities.map((e) => e.eligibilityTitle),
  );

  console.log('\n===================================');
  console.log('▶ STEP 3: RUN ALGORITHM 1 WITH NORMALIZED DATA');
  console.log('===================================\n');

  const score = algorithm1_WeightedSum(normalizedJob, normalizedApplicant);

  console.log('Score breakdown (Algorithm 1 - Weighted Sum Model):');
  console.log(JSON.stringify(score, null, 2));

  console.log('\nKey focus:');
  console.log('  educationScore:', score.educationScore);
  console.log('  eligibilityScore:', score.eligibilityScore);
  console.log('  matchedEligibilitiesCount:', score.matchedEligibilitiesCount);
  console.log('  totalScore:', score.totalScore);
  console.log('\nReasoning:', score.reasoning);

  console.log('\n✅ Done.');
}

main().catch((err) => {
  console.error('Debug flow failed:', err);
  process.exit(1);
});
