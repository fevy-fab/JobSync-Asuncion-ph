// scripts/audit-full-pipeline-all-modes.ts
//
// Shortened: focuses ONLY on failure / edge scenarios:
//
//   TC5_FAIL_NO_ELIG_APPLICANT  → eligibilityScore = 0
//   TC6_FAIL_WRONG_DEGREE       → educationScore low (near the floor)
//   TC7_JOB_NO_ELIG             → eligibilityScore ≈ 50 (neutral)
//   TC8_JOB_ELIG_NONE_TEXT      → eligibilityScore ≈ 50 (neutral)
//
// NOTE: For deterministic results, set JOBSYNC_USE_GEMINI=false in your env
// so normalization uses YAML dictionaries only (no Gemini calls).

import { normalizeJobAndApplicant } from '../src/lib/gemini/normalization';
import {
  algorithm1_WeightedSum,
  algorithm2_SkillExperienceComposite,
  algorithm3_EligibilityEducationTiebreaker,
  ensembleScore,
  type JobRequirements,
  type ApplicantData,
} from '../src/lib/gemini/scoringAlgorithms';

interface TestCase {
  id: string;
  description: string;
  job: JobRequirements;
  applicant: ApplicantData;
}

function logCaseHeader(tc: TestCase) {
  console.log('\n================================================');
  console.log(`▶ TEST CASE: ${tc.id}`);
  console.log(`   ${tc.description}`);
  console.log('================================================\n');

  console.log('\nRAW JOB');
  console.log(tc.job);

  console.log('\nRAW APPLICANT');
  console.log(tc.applicant);
  console.log('');
}

async function runTestCase(tc: TestCase) {
  logCaseHeader(tc);
  const { job, applicant, id } = tc;

  console.log('--- STEP A: NORMALIZATION (cleaning + dictionaries + levels) ---');

  // We don't fully trust the TS type signature here, so cast to any
  // and support both { normalizedJob, normalizedApplicant } or { job, applicant }.
  const normResult = (await normalizeJobAndApplicant(job, applicant as any)) as any;

  const normalizedJob: JobRequirements =
    normResult.normalizedJob ?? normResult.job ?? job;

  const normalizedApplicant: ApplicantData =
    normResult.normalizedApplicant ?? normResult.applicant ?? applicant;

  console.log('\nNORMALIZED JOB');
  console.log(normalizedJob);

  console.log('\nNORMALIZED APPLICANT');
  console.log(normalizedApplicant);
  console.log('');

  // --- Algorithm 1 ---
  console.log('--- STEP B: ALGORITHM 1 – Weighted Sum ---');
  const algo1 = await algorithm1_WeightedSum(normalizedJob, normalizedApplicant);
  console.log('\nAlgorithm 1 ScoreBreakdown');
  console.log(algo1);

  // --- Algorithm 2 ---
  console.log('\n--- STEP C: ALGORITHM 2 – Skill-Experience Composite ---');
  const algo2 = await algorithm2_SkillExperienceComposite(
    normalizedJob,
    normalizedApplicant
  );
  console.log('\nAlgorithm 2 ScoreBreakdown');
  console.log(algo2);

  // --- Algorithm 3 ---
  console.log('\n--- STEP D: ALGORITHM 3 – Eligibility-Education Tie-breaker ---');
  const algo3 = await algorithm3_EligibilityEducationTiebreaker(
    normalizedJob,
    normalizedApplicant
  );
  console.log('\nAlgorithm 3 ScoreBreakdown');
  console.log(algo3);

  // --- Ensemble ---
  console.log('\n--- STEP E: ENSEMBLE (uses 1 & 2, tie-breaker with 3) ---');
  const ens = await ensembleScore(normalizedJob, normalizedApplicant);
  console.log('\nEnsemble ScoreBreakdown');
  console.log(ens);

  // --- Quick expectation check (using Algorithm 1 as reference) ---
  console.log(`\n[CHECK] Expectations for ${id}:`);
  switch (id) {
    case 'TC5_FAIL_NO_ELIG_APPLICANT':
      console.log(
        '  → Expect eligibilityScore = 0 (no applicant eligibility vs required).'
      );
      console.log(
        '    Got eligibilityScore (Algo1):',
        algo1.eligibilityScore
      );
      break;

    case 'TC6_FAIL_WRONG_DEGREE':
      console.log(
        '  → Expect educationScore LOW (near floor from adjustEducationForLevelAndField).'
      );
      console.log(
        '    Got educationScore (Algo1):',
        algo1.educationScore
      );
      break;

    case 'TC7_JOB_NO_ELIG':
      console.log(
        '  → Job has NO eligibilities → expect neutral eligibilityScore ≈ 50.'
      );
      console.log(
        '    Got eligibilityScore (Algo1):',
        algo1.eligibilityScore
      );
      break;

    case 'TC8_JOB_ELIG_NONE_TEXT':
      console.log(
        '  → Job eligibilities include "None / Not required" → expect neutral eligibilityScore ≈ 50.'
      );
      console.log(
        '    Got eligibilityScore (Algo1):',
        algo1.eligibilityScore
      );
      break;

    default:
      break;
  }

  console.log('\n[SUMMARY]', id);
  console.log(
    `  Algo1 (WeightedSum): ${algo1.totalScore}\n` +
      `  Algo2 (Skill-Experience): ${algo2.totalScore}\n` +
      `  Algo3 (Elig-Edu Tiebreaker): ${algo3.totalScore}\n` +
      `  Ensemble: ${ens.totalScore} | algorithmUsed: ${ens.algorithmUsed}\n`
  );
}

async function main() {
  console.log('===================================');
  console.log('▶ FULL NLP + SCORING PIPELINE AUDIT – FAILURE / EDGE CASES ONLY');
  console.log('===================================\n');

  console.log(
    `[Note] JOBSYNC_USE_GEMINI=${process.env.JOBSYNC_USE_GEMINI ?? 'undefined'} ` +
      '(set to "false" to avoid hitting Gemini quotas during audit).'
  );

  const baseSkillsJob = [
    'records classification',
    'document tracking',
    'FOI basics',
    'Data Privacy Act compliance',
    'PDF editing',
    'clear written communication',
  ];

  const baseSkillsApplicant = [
    'records management',
    'document tracking',
    'freedom of information basics',
    'RA 10173 data privacy act compliance',
    'pdf editing',
    'professional written communication',
  ];

  const failureCases: TestCase[] = [
    // -------------------------------------------------------------------
    // TC5: Applicant has NO eligibilities but job requires one → score 0
    // -------------------------------------------------------------------
    {
      id: 'TC5_FAIL_NO_ELIG_APPLICANT',
      description:
        'Job requires Career Service Professional; applicant has NO eligibility entries → expect eligibilityScore = 0.',
      job: {
        title: 'Administrative Officer II (Records) – Requires Professional',
        description:
          'Records role requiring Career Service Professional Eligibility.',
        degreeRequirement: 'Bachelor of Public Administration',
        eligibilities: ['Career Service Professional Eligibility (Second Level)'],
        skills: baseSkillsJob,
        yearsOfExperience: 1,
      },
      applicant: {
        highestEducationalAttainment: 'BA in Public Administration',
        eligibilities: [], // <-- key: no eligibilities at all
        skills: baseSkillsApplicant,
        totalYearsExperience: 2,
        workExperienceTitles: ['Administrative Aide I'],
      },
    },

    // -------------------------------------------------------------------
    // TC6: Wrong / unrelated degree → low educationScore (near floor)
    // -------------------------------------------------------------------
    {
      id: 'TC6_FAIL_WRONG_DEGREE',
      description:
        'Job requires Public Administration, applicant has clearly unrelated degree (BS Fisheries) → expect low educationScore.',
      job: {
        title: 'Administrative Officer II (Records)',
        description:
          'Records role requiring Public Administration or related governance degree.',
        degreeRequirement: 'Bachelor of Public Administration',
        eligibilities: ['Career Service Professional Eligibility (Second Level)'],
        skills: baseSkillsJob,
        yearsOfExperience: 2,
      },
      applicant: {
        highestEducationalAttainment: 'BS in Fisheries',
        eligibilities: [
          { eligibilityTitle: 'Career Service Professional Eligibility (Second Level)' },
        ],
        skills: baseSkillsApplicant,
        totalYearsExperience: 3,
        workExperienceTitles: ['Municipal Fisheries Technician'],
      },
    },

    // -------------------------------------------------------------------
    // TC7: Job has NO eligibilities at all → neutral ~50
    // -------------------------------------------------------------------
    {
      id: 'TC7_JOB_NO_ELIG',
      description:
        'Job has NO eligibilities listed (truly none required) → expect neutral eligibilityScore ≈ 50.',
      job: {
        title: 'Administrative Aide I (General Services)',
        description:
          'Entry-level support role with no formal civil service eligibility required.',
        degreeRequirement: 'High school graduate',
        eligibilities: [], // <-- key: empty requirements
        skills: ['basic clerical work', 'filing', 'office errands'],
        yearsOfExperience: 0,
      },
      applicant: {
        highestEducationalAttainment: 'High School Graduate',
        eligibilities: [
          // applicant may still have some eligibility; but job doesn’t require them
          { eligibilityTitle: 'Career Service Subprofessional Eligibility (First Level)' },
        ],
        skills: ['filing', 'office errands', 'basic computer use'],
        totalYearsExperience: 1,
        workExperienceTitles: ['Utility Worker'],
      },
    },

    // -------------------------------------------------------------------
    // TC8: Job elig text says "None / Not required" → neutral ~50
    // -------------------------------------------------------------------
    {
      id: 'TC8_JOB_ELIG_NONE_TEXT',
      description:
        'Job eligibilities include text like "None / Not required" → expect neutral eligibilityScore ≈ 50.',
      job: {
        title: 'Clerk – No Eligibility Required',
        description:
          'Clerical role explicitly stating that civil service eligibility is not required.',
        degreeRequirement: 'Senior High School Graduate',
        eligibilities: [
          'None (eligibility not required)', // <-- triggers neutral in computeEligibilityMatch
        ],
        skills: ['typing', 'document filing', 'basic customer service'],
        yearsOfExperience: 0,
      },
      applicant: {
        highestEducationalAttainment: 'Senior High School Graduate',
        eligibilities: [], // may or may not have eligibility; should not matter
        skills: ['typing', 'basic customer service'],
        totalYearsExperience: 0,
        workExperienceTitles: [],
      },
    },
  ];

  for (const tc of failureCases) {
    // eslint-disable-next-line no-await-in-loop
    await runTestCase(tc);
  }

  console.log('✅ Failure / edge-case NLP + scoring audit finished.');
}

main().catch(err => {
  console.error('❌ Error in audit:', err);
  process.exit(1);
});
