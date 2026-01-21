// scripts/test-normalization-pipeline.ts
//
// Run with:
//   npx ts-node scripts/test-normalization-pipeline.ts
//
// This uses YOUR real normalization pipeline (normalization.ts),
// so if this passes, it means:
//  - YAML paths are correct
//  - YAML structure is parseable
//  - alias indexes are built
//  - normalizeJobAndApplicant() runs end-to-end

import path from 'path';
import { fileURLToPath } from 'url'; // safe even in CJS; ts-node will transpile
import { normalizeJobAndApplicant, debugDumpEligibilityState } from '../src/lib/gemini/normalization';
import type { JobRequirements, ApplicantData } from '../src/lib/gemini/scoringAlgorithms';

async function main() {
  const cwd = process.cwd();
  console.log('========================================');
  console.log('▶ JobSync NORMALIZATION PIPELINE SMOKE TEST');
  console.log('========================================');
  console.log('process.cwd() =', cwd);
  console.log(
    'Expecting dictionaries at:',
    path.join(cwd, 'src', 'app', 'config', 'dictionaries')
  );

  console.log('\n1) Dumping eligibility dictionary state (from normalization.ts)...');
  await debugDumpEligibilityState();

  console.log('\n2) Running normalizeJobAndApplicant(...) on a sample case...');
  const sampleJob: JobRequirements = {
    title: 'Administrative Officer II (HR)',
    description:
      'Handles HR records, recruitment support, and employee services at the Municipal Hall.',
    degreeRequirement: 'BS in Business Administration major in Human Resource Management',
    eligibilities: [
      'Career Service Professional Eligibility (Second Level)',
      'Preferably with HR-related trainings',
    ],
    skills: [
      'Recruitment and selection',
      'Employee relations and counseling',
      'Records management',
      'Training coordination',
    ],
    yearsOfExperience: 2,
    // Optional meta (normally will be filled from YAML in runtime):
    degreeLevel: undefined,
    degreeFieldGroup: undefined,
  };

  const sampleApplicant: ApplicantData = {
    highestEducationalAttainment:
      'Bachelor of Science in Business Administration major in Human Resource Development Management',
    eligibilities: [
      { eligibilityTitle: 'Career Service Professional Eligibility' },
      { eligibilityTitle: 'RA 1080 (Registered Psychometrician)' },
    ],
    skills: [
      'Employee relations',
      'Recruitment & selection',
      'Public speaking',
      'Basic Canva design',
    ],
    totalYearsExperience: 1.5,
    workExperienceTitles: ['HR Assistant', 'Administrative Aide'],
    degreeLevel: undefined,
    degreeFieldGroup: undefined,
  };

  const { job: normalizedJob, applicant: normalizedApplicant } =
    await normalizeJobAndApplicant(sampleJob, sampleApplicant);

  console.log('\n--- NORMALIZED JOB REQUIREMENTS ---');
  console.dir(normalizedJob, { depth: null });

  console.log('\n--- NORMALIZED APPLICANT DATA ---');
  console.dir(normalizedApplicant, { depth: null });

  console.log('\n✅ Normalization pipeline test completed.');
}

main().catch((err) => {
  console.error('\n❌ Normalization pipeline test FAILED');
  console.error(err);
  process.exit(1);
});
