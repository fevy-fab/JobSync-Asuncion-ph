// scripts/test-dictionary-pipeline.ts

import {
  normalizeDegreeValue,
  normalizeEligibilityValue,
  normalizeJobAndApplicant,
  debugDumpEligibilityState,
} from '../src/lib/gemini/normalization';
import type { JobRequirements, ApplicantData } from '../src/lib/gemini/scoringAlgorithms';

async function main() {
  console.log('========================================');
  console.log('▶ DICTIONARY PIPELINE LOAD TEST');
  console.log('========================================');
  console.log('process.cwd() =', process.cwd());
  console.log('');

  try {
    // 1) Simple direct normalization tests (trigger dictionary load)
    console.log('--- Degree normalization smoke test ---');
    const degreeTest = await normalizeDegreeValue('BS in Information Technology');
    console.log('Degree normalization result:', degreeTest);
    console.log('');

    console.log('--- Eligibility normalization smoke test ---');
    const eligibilityTest = await normalizeEligibilityValue('Career Service Professional');
    console.log('Eligibility normalization result:', eligibilityTest);
    console.log('');

    // 2) End-to-end job+applicant normalization (uses both degrees + eligibilities)
    console.log('--- normalizeJobAndApplicant(...) test ---');

    const jobReq: JobRequirements = {
      title: 'Administrative Officer I',
      description:
        'Provides administrative support, records management, and basic HR assistance in the LGU.',
      degreeRequirement:
        'Bachelor of Science in Business Administration, Public Administration, or Office Administration',
      eligibilities: [
        'Career Service Professional',
        'None / Not required for contractual positions',
      ],
      skills: [
        'records management',
        'office administration',
        'basic computer skills',
        'communication skills',
      ],
      yearsOfExperience: 1,
    };

    const applicantData: ApplicantData = {
      highestEducationalAttainment: 'BSBA Major in Human Resource Management',
      eligibilities: [
        { eligibilityTitle: 'Career Service Professional Eligibility (Second Level)' },
      ],
      skills: [
        'records management',
        'file organization',
        'MS Office',
        'oral and written communication',
      ],
      totalYearsExperience: 2,
      workExperienceTitles: ['Administrative Aide', 'HR Intern'],
    };

    const { job, applicant } = await normalizeJobAndApplicant(jobReq, applicantData);

    console.log('Normalized job:', {
      degreeRequirement: job.degreeRequirement,
      degreeLevel: job.degreeLevel,
      degreeFieldGroup: job.degreeFieldGroup,
      eligibilities: job.eligibilities,
    });

    console.log('Normalized applicant:', {
      highestEducationalAttainment: applicant.highestEducationalAttainment,
      degreeLevel: applicant.degreeLevel,
      degreeFieldGroup: applicant.degreeFieldGroup,
      eligibilities: applicant.eligibilities.map((e) => e.eligibilityTitle),
    });
    console.log('');

    // 3) Dump internal eligibility state (sizes + alias probes)
    console.log('--- debugDumpEligibilityState() ---');
    await debugDumpEligibilityState();
    console.log('');

    console.log('✅ Dictionary pipeline appears to be loading and readable.');
    console.log('   Check logs above for:');
    console.log('   - "[JobSync] Parsed dictionaries counts: { degrees: X, eligibilities: Y }"');
    console.log('   - Eligibility alias sample entries and Career Service probes.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Dictionary pipeline test FAILED:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unhandled error in dictionary test:', err);
  process.exit(1);
});
