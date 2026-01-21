// scripts/audit-scoring-sbert.ts
import 'dotenv/config';
import {
  algorithm1_WeightedSum,
  algorithm2_SkillExperienceComposite,
  algorithm3_EligibilityEducationTiebreaker,
  ensembleScore,
  type JobRequirements,
  type ApplicantData,
} from '../src/lib/gemini/scoringAlgorithms';

interface Scenario {
  name: string;
  job: JobRequirements;
  applicant: ApplicantData;
}

function printBreakdown(label: string, r: Awaited<ReturnType<typeof ensembleScore>>) {
  console.log(`\n  [${label}]`);
  console.log(`    totalScore:        ${r.totalScore.toFixed(2)}%`);
  console.log(`    educationScore:    ${r.educationScore.toFixed(2)}%`);
  console.log(`    experienceScore:   ${r.experienceScore.toFixed(2)}%`);
  console.log(`    skillsScore:       ${r.skillsScore.toFixed(2)}%  ← SBERT affects this`);
  console.log(`    eligibilityScore:  ${r.eligibilityScore.toFixed(2)}%`);
  console.log(`    matchedSkills:     ${r.matchedSkillsCount}`);
  console.log(`    matchedEligibilities: ${r.matchedEligibilitiesCount}`);
  console.log(`    algorithmUsed:     ${r.algorithmUsed}`);
  console.log(`    reasoning:         ${r.reasoning}`);
}

const baseJob: JobRequirements = {
  title: 'Customer Service Assistant',
  description:
    'Handles customer inquiries, supports clients, manages complaints, and maintains service quality.',
  degreeRequirement: 'Bachelor in any field',
  eligibilities: [], // keep empty so we focus on skills effects
  skills: ['customer service', 'data entry', 'ms excel'],
  yearsOfExperience: 1,
};

const baseApplicant: ApplicantData = {
  highestEducationalAttainment: 'Bachelor of Business Administration',
  eligibilities: [],
  skills: [],
  totalYearsExperience: 1,
  workExperienceTitles: ['Customer Support Representative'],
};

const scenarios: Scenario[] = [
  {
    name: '1. Exact skill matches',
    job: baseJob,
    applicant: {
      ...baseApplicant,
      skills: ['customer service', 'data entry', 'ms excel'],
    },
  },
  {
    name: '2. Synonyms – SBERT should help',
    job: baseJob,
    applicant: {
      ...baseApplicant,
      // intentionally wording different but semantically close
      skills: ['client support', 'office admin', 'spreadsheets'],
    },
  },
  {
    name: '3. Mixed: some matches, some unrelated',
    job: baseJob,
    applicant: {
      ...baseApplicant,
      skills: ['client support', 'ms word', 'wiring installation'],
    },
  },
  {
    name: '4. Completely unrelated skills',
    job: baseJob,
    applicant: {
      ...baseApplicant,
      skills: ['welding', 'auto repair', 'plumbing'],
    },
  },
];

async function runScenario({ name, job, applicant }: Scenario) {
  console.log('\n======================================================');
  console.log(name);
  console.log('------------------------------------------------------');
  console.log('Job Skills:      ', job.skills);
  console.log('Applicant Skills:', applicant.skills);

  const [a1, a2, a3, ens] = await Promise.all([
    algorithm1_WeightedSum(job, applicant),
    algorithm2_SkillExperienceComposite(job, applicant),
    algorithm3_EligibilityEducationTiebreaker(job, applicant),
    ensembleScore(job, applicant),
  ]);

  printBreakdown('Algorithm 1 – Weighted Sum', a1);
  printBreakdown('Algorithm 2 – Skill-Experience Composite', a2);
  printBreakdown('Algorithm 3 – Tie-breaker', a3);
  printBreakdown('Ensemble', ens);
}

async function main() {
  console.log('▶ FULL SCORING AUDIT WITH SBERT (skills)\n');
  console.log('HF_API_KEY present:', !!process.env.HF_API_KEY);
  console.log('------------------------------------------------------');

  for (const scenario of scenarios) {
    await runScenario(scenario);
  }

  console.log('\n✅ Audit complete.');
  console.log(
    '   For the Synonyms scenario, you should see skillsScore & totalScore higher than in the Unrelated scenario.'
  );
  console.log(
    '   If you temporarily remove HF_API_KEY and re-run, you can compare “with SBERT” vs “without SBERT”.'
  );
}

main().catch(err => {
  console.error('❌ audit-scoring-sbert failed:', err);
});
