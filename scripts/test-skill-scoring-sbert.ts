// scripts/test-skill-scoring-sbert.ts
import 'dotenv/config';
import {
  algorithm1_WeightedSum,
  type JobRequirements,
  type ApplicantData,
} from '../src/lib/gemini/scoringAlgorithms';

async function runScenario(
  label: string,
  jobSkills: string[],
  applicantSkills: string[]
) {
  const job: JobRequirements = {
    title: 'Customer Service Assistant',
    description:
      'Handles customer inquiries, supports clients, and maintains service quality.',
    degreeRequirement: 'Bachelor in any field',
    eligibilities: [],
    skills: jobSkills,
    yearsOfExperience: 1,
  };

  const applicant: ApplicantData = {
    highestEducationalAttainment: 'Bachelor of Business Administration',
    eligibilities: [],
    skills: applicantSkills,
    totalYearsExperience: 1,
    workExperienceTitles: ['Customer Support Representative'],
  };

  const score = await algorithm1_WeightedSum(job, applicant);

  console.log(`\n=== ${label} ===`);
  console.log('Job skills:      ', jobSkills);
  console.log('Applicant skills:', applicantSkills);
  console.log('SkillsScore:     ', score.skillsScore.toFixed(2), '%');
  console.log('Matched skills:  ', score.matchedSkillsCount);
}

async function main() {
  console.log('▶ SBERT in Algorithm 1 (skills) – integration test\n');
  console.log('HF_API_KEY present:', !!process.env.HF_API_KEY);
  console.log('----------------------------------------');

  // 1) Exact match baseline
  await runScenario(
    'Exact match',
    ['customer service', 'data entry', 'ms excel'],
    ['customer service', 'data entry']
  );

  // 2) Synonym case – this is where SBERT should help
  await runScenario(
    'Synonym match (SBERT should boost)',
    ['customer service', 'data entry', 'ms excel'],
    ['client support', 'office work']
  );

  // 3) Unrelated skills
  await runScenario(
    'Unrelated skills',
    ['customer service', 'data entry', 'ms excel'],
    ['welding', 'auto repair']
  );

  console.log('\n✅ If case 2 scores significantly higher than case 3 (even though text is different), SBERT is being used in skills.');
}

main().catch(err => {
  console.error('❌ test-skill-scoring-sbert failed:', err);
});
