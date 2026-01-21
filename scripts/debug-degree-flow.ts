// scripts/debug-degree-flow.ts
import 'dotenv/config';
import { normalizeDegreeValue } from '../src/lib/gemini/normalization';

function header(title: string) {
  console.log('\n===================================');
  console.log(`▶ ${title}`);
  console.log('===================================\n');
}

async function main() {
  header('STEP 1: BUILD SAMPLE JOB & APPLICANT');

  // You can tweak these to whatever you want to test
  const rawJobDegree = 'Bachelor of Public Administration';
  const rawApplicantDegree = 'BA in Public Administration';

  console.log('RAW job.degreeRequirement:', rawJobDegree);
  console.log(
    'RAW applicant.highestEducationalAttainment:',
    rawApplicantDegree
  );

  header('STEP 2: NORMALIZE JOB & APPLICANT DEGREES');

  const jobNorm = await normalizeDegreeValue(rawJobDegree);
  const applicantNorm = await normalizeDegreeValue(rawApplicantDegree);

  console.log('NORM job.degreeRequirement:', jobNorm);
  console.log('NORM applicant.highestEducationalAttainment:', applicantNorm);

  header('STEP 3: DEGREE MATCH CHECK');

  const jobKey = jobNorm.canonicalKey;
  const applicantKey = applicantNorm.canonicalKey;

  const isMatch =
    !!jobKey &&
    !!applicantKey &&
    jobKey === applicantKey &&
    jobNorm.confidence > 0 &&
    applicantNorm.confidence > 0;

  console.log('job canonicalKey:       ', jobKey ?? 'NONE');
  console.log('applicant canonicalKey: ', applicantKey ?? 'NONE');
  console.log('job confidence:         ', jobNorm.confidence);
  console.log('applicant confidence:   ', applicantNorm.confidence);
  console.log('degrees MATCH?', isMatch);

  console.log('\nKey focus:');
  console.log('  jobKey:       ', jobKey ?? 'NONE');
  console.log('  applicantKey: ', applicantKey ?? 'NONE');
  console.log('  isMatch:      ', isMatch);

  console.log('\n✅ Done.');
}

main().catch((err) => {
  console.error('❌ Error in debug-degree-flow.ts:', err);
  process.exit(1);
});
