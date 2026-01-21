// scripts/test-eligibility-strict.ts
import 'dotenv/config';
import { computeEligibilityMatch } from '../src/lib/gemini/scoringAlgorithms';

interface TestCase {
  name: string;
  jobEligibilities: string[];      // each string = one line in HR form
  applicantEligibilities: string[]; // applicant.eligibilities[].eligibilityTitle
}

const cases: TestCase[] = [
  {
    name: '1. Single exact match (simple)',
    jobEligibilities: ['Career Service Professional Eligibility'],
    applicantEligibilities: ['Career Service Professional Eligibility'],
  },
  {
    name: '2. Single NO match (simple)',
    jobEligibilities: ['Career Service Professional Eligibility'],
    applicantEligibilities: ['Barangay Official Eligibility'],
  },
  {
    name: '3. OR group satisfied via second option',
    jobEligibilities: [
      'Career Service Professional Eligibility OR Career Service Subprofessional Eligibility',
    ],
    applicantEligibilities: ['Career Service Subprofessional Eligibility'],
  },
  {
    name: '4. OR group NOT satisfied',
    jobEligibilities: [
      'Career Service Professional Eligibility OR Career Service Subprofessional Eligibility',
    ],
    applicantEligibilities: ['Barangay Official Eligibility'],
  },
  {
    name: '5. AND group all present (strict 100)',
    jobEligibilities: [
      'Career Service Professional Eligibility AND Barangay Official Eligibility',
    ],
    applicantEligibilities: [
      'Career Service Professional Eligibility',
      'Barangay Official Eligibility',
    ],
  },
  {
    name: '6. AND group partially present (strict 0)',
    jobEligibilities: [
      'Career Service Professional Eligibility AND Barangay Official Eligibility',
    ],
    applicantEligibilities: ['Career Service Professional Eligibility'],
  },
  {
    name: '7. Multiple lines, all satisfied',
    jobEligibilities: [
      'Career Service Professional Eligibility',
      'Barangay Official Eligibility OR PD 907 (Honor Graduate Eligibility)',
    ],
    applicantEligibilities: [
      'Career Service Professional Eligibility',
      'PD 907 (Honor Graduate Eligibility)',
    ],
  },
  {
    name: '8. Multiple lines, one line NOT satisfied (strict 0)',
    jobEligibilities: [
      'Career Service Professional Eligibility',
      'Barangay Official Eligibility OR PD 907 (Honor Graduate Eligibility)',
    ],
    applicantEligibilities: ['Career Service Professional Eligibility'],
  },
];

function printCase(tc: TestCase) {
  const result = computeEligibilityMatch(tc.jobEligibilities, tc.applicantEligibilities);
  console.log('====================================================');
  console.log(tc.name);
  console.log('Job eligibilities (per line):');
  tc.jobEligibilities.forEach((line, idx) => {
    console.log(`  [${idx + 1}] ${line}`);
  });
  console.log('Applicant eligibilities:');
  tc.applicantEligibilities.forEach((e, idx) => {
    console.log(`  (${idx + 1}) ${e}`);
  });
  console.log('⇒ score:', result.score);
  console.log('⇒ matchedCount:', result.matchedCount);
}

function main() {
  console.log('▶ ELIGIBILITY STRICT TESTS\n');
  cases.forEach(printCase);
  console.log('\nDone.');
}

main();
