// scripts/audit-normalization-and-dictionaries.ts
import 'dotenv/config';
import {
  normalizeDegreeValue,
  normalizeEligibilityValue,
  normalizeJobAndApplicant,
  debugDumpEligibilityState,
} from '../src/lib/gemini/normalization';
import type { JobRequirements, ApplicantData } from '@/lib/gemini/scoringAlgorithms';

async function main() {
  console.log('========================================');
  console.log('▶ NORMALIZATION + YAML DICTIONARIES AUDIT');
  console.log('========================================\n');

  // 1) Dump basic eligibility dictionary state (sizes + sample aliases)
  console.log('\n--- STEP 1: Dictionary state (eligibilities) ---');
  await debugDumpEligibilityState();

  // 2) Test key degree normalization cases
  console.log('\n--- STEP 2: Degree normalization smoke test ---');
  const degreeCases = [
    'Bachelor of Public Administration',
    'BA in Public Administration',
    'Bachelor of Science in Public Administration',
    'BS Business Administration major in Human Resource Management',
  ];

  for (const raw of degreeCases) {
    const res = await normalizeDegreeValue(raw);
    console.log(`\n[DEGREE] "${raw}"`);
    console.log('  → method:', res.method);
    console.log('  → canonicalKey:', res.canonicalKey);
    console.log('  → confidence:', res.confidence);
  }

  // 3) Test key eligibility normalization cases
  console.log('\n--- STEP 3: Eligibility normalization smoke test ---');
  const eligCases = [
    'Career Service Professional',
    'Career Service Professional Eligibility',
    'Career Service Professional Eligibility (Second Level)',
    'PRC Registered Nurse',
    'CSC Professional',
  ];

  for (const raw of eligCases) {
    const res = await normalizeEligibilityValue(raw);
    console.log(`\n[ELIGIBILITY] "${raw}"`);
    console.log('  → method:', res.method);
    console.log('  → canonicalKey:', res.canonicalKey);
    console.log('  → confidence:', res.confidence);
  }

  // 4) Full job+applicant normalization example
  console.log('\n--- STEP 4: normalizeJobAndApplicant() end-to-end ---');

  const jobReq: JobRequirements = {
    title: 'Administrative Officer II (Records Officer)',
    description:
      'Responsible for records classification, document tracking, FOI requests, and data privacy compliance in the municipal hall.',
    degreeRequirement: 'Bachelor of Public Administration or Bachelor of Business Administration',
    eligibilities: ['Career Service Professional'],
    skills: [
      'records classification',
      'document tracking',
      'FOI basics',
      'Data Privacy Act compliance',
      'PDF editing',
      'clear written communication',
    ],
    yearsOfExperience: 2,
  };

  const applicant: ApplicantData = {
    highestEducationalAttainment: 'BA in Public Administration',
    eligibilities: [
      { eligibilityTitle: 'Career Service Professional Eligibility (Second Level)' },
    ],
    skills: [
      'records management',
      'document tracking',
      'freedom of information basics',
      'RA 10173 data privacy act compliance',
      'pdf editing',
      'professional written communication',
    ],
    totalYearsExperience: 3,
    workExperienceTitles: ['Administrative Aide IV (Records)', 'Records Clerk'],
  };

  const { job: normJob, applicant: normApplicant } =
    await normalizeJobAndApplicant(jobReq, applicant);

  console.log('\n[JOB - BEFORE]');
  console.dir(jobReq, { depth: null });
  console.log('\n[JOB - AFTER NORMALIZATION]');
  console.dir(normJob, { depth: null });

  console.log('\n[APPLICANT - BEFORE]');
  console.dir(applicant, { depth: null });
  console.log('\n[APPLICANT - AFTER NORMALIZATION]');
  console.dir(normApplicant, { depth: null });

  console.log('\n✅ Normalization audit finished.\n');
}

main().catch((err) => {
  console.error('❌ audit-normalization-and-dictionaries failed:', err);
  process.exit(1);
});
