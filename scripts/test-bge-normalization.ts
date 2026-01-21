import {
  normalizeDegreeValue,
  normalizeEligibilityValue,
  normalizeJobAndApplicant,
} from '../src/lib/gemini/normalization';

/**
 * Sample values – edit this to match real messy data from your DB.
 */
const degreeSamples: string[] = [
  'BS in Information Technology',
  'Bachelor of Science in Nursing',
  'BS Applied Statistics',
  'AB Political Sci',
  'Certificate in Meteorological Services'
];

const eligibilitySamples: string[] = [
  'Career Service Professional',
  'Career Service Professional Eligibility (Second Level)',
  'Civil Service Sub-Professional',
  'Board Exam passer (CPA)',
  'Registered Nurse (PRC)',
  'Barangay Health Worker Eligibility',
];

async function testDegrees() {
  console.log('========================================');
  console.log('▶ BGE-M3 DEGREE NORMALIZATION TEST');
  console.log('========================================\n');

  for (let i = 0; i < degreeSamples.length; i++) {
    const raw = degreeSamples[i];

    console.log(`Case #${i + 1}`);
    console.log(`  raw degree: "${raw}"`);

    // 1) Direct normalization (to see method + canonicalKey)
    const result = await normalizeDegreeValue(raw);

    console.log(`  method:         ${result.method}`);
    console.log(`  canonicalKey:   ${result.canonicalKey ?? 'undefined'}`);
    console.log(`  confidence:     ${result.confidence.toFixed(3)}`);

    // 2) Use normalizeJobAndApplicant to see final canonical text + level/fieldGroup
    const dummyJob: any = {
      position: 'Dummy Position',
      degreeRequirement: raw,
      eligibilities: [],
    };

    const dummyApplicant: any = {
      fullName: 'Dummy Applicant',
      highestEducationalAttainment: raw,
      eligibilities: [],
    };

    const { job, applicant } = await normalizeJobAndApplicant(dummyJob, dummyApplicant);

    console.log(`  job.degreeRequirement (canonical text):`);
    console.log(`    ${job.degreeRequirement ?? '(unchanged / undefined)'}`);

    console.log(`  applicant.highestEducationalAttainment (canonical text):`);
    console.log(`    ${applicant.highestEducationalAttainment ?? '(unchanged / undefined)'}`);

    console.log(`  job.degreeLevel:        ${job.degreeLevel ?? 'undefined'}`);
    console.log(`  job.degreeFieldGroup:   ${job.degreeFieldGroup ?? 'undefined'}`);
    console.log(`  applicant.degreeLevel:  ${applicant.degreeLevel ?? 'undefined'}`);
    console.log(`  applicant.degreeFieldGroup: ${applicant.degreeFieldGroup ?? 'undefined'}`);

    console.log('----------------------------------------\n');
  }
}

async function testEligibilities() {
  console.log('\n========================================');
  console.log('▶ BGE-M3 ELIGIBILITY NORMALIZATION TEST');
  console.log('========================================\n');

  for (let i = 0; i < eligibilitySamples.length; i++) {
    const raw = eligibilitySamples[i];

    console.log(`Case #${i + 1}`);
    console.log(`  raw eligibility: "${raw}"`);

    // 1) Direct normalization (to see method + canonicalKey)
    const result = await normalizeEligibilityValue(raw);

    console.log(`  method:         ${result.method}`);
    console.log(`  canonicalKey:   ${result.canonicalKey ?? 'undefined'}`);
    console.log(`  confidence:     ${result.confidence.toFixed(3)}`);

    // 2) Use normalizeJobAndApplicant so you can see final canonical text as used in scoring
    const dummyJob: any = {
      position: 'Dummy Position',
      degreeRequirement: '',
      eligibilities: [raw],
    };

    const dummyApplicant: any = {
      fullName: 'Dummy Applicant',
      highestEducationalAttainment: '',
      eligibilities: [
        {
          eligibilityTitle: raw,
          dateOfExam: null,
          rating: null,
        },
      ],
    };

    const { job, applicant } = await normalizeJobAndApplicant(dummyJob, dummyApplicant);

    console.log(`  job.eligibilities[0] (canonical text):`);
    console.log(`    ${
      job.eligibilities && job.eligibilities.length
        ? job.eligibilities[0]
        : '(none)'
    }`);

    console.log(`  applicant.eligibilities[0].eligibilityTitle (canonical text):`);
    console.log(`    ${
      applicant.eligibilities && applicant.eligibilities.length
        ? applicant.eligibilities[0].eligibilityTitle
        : '(none)'
    }`);

    console.log('----------------------------------------\n');
  }
}

async function main() {
  console.log('========================================');
  console.log('▶ BGE-M3 NORMALIZATION SMOKE TEST');
  console.log('========================================\n');

  await testDegrees();
  await testEligibilities();

  console.log('✅ Done.');
}

main().catch((err) => {
  console.error('❌ test-bge-normalization failed:', err);
  process.exit(1);
});
