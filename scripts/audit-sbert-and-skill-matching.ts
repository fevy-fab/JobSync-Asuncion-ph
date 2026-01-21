// scripts/audit-sbert-and-skill-matching.ts
import 'dotenv/config';

import {
  getSkillEmbedding,
  semanticSimilarityPercent,
} from '../src/lib/semantic/sbertSkills';
import type { JobRequirements, ApplicantData } from '../src/lib/gemini/scoringAlgorithms';
import { algorithm1_WeightedSum } from '../src/lib/gemini/scoringAlgorithms';
import { normalizeJobAndApplicant } from '../src/lib/gemini/normalization';

async function testRawSBERTPairs() {
  console.log('--- STEP 1: Raw SBERT embedding + similarity checks ---');

  const pairs: Array<[string, string]> = [
    ['customer service', 'client support'],
    ['customer service', 'wiring installation'],
    ['records classification', 'records management'],
    ['FOI basics', 'freedom of information basics'],
    ['Data Privacy Act compliance', 'RA 10173 data privacy act compliance'],
  ];

  for (const [a, b] of pairs) {
    console.log(`\n[PAIR] "${a}"  vs  "${b}"`);

    const embA = await getSkillEmbedding(a);
    const embB = await getSkillEmbedding(b);

    console.log('  → embedding A dim:', embA.length);
    console.log('  → embedding B dim:', embB.length);

    if (!embA.length || !embB.length) {
      console.log('  ⚠️ One of the embeddings is empty (check HF_API_KEY / HF_EMBEDDINGS_API_URL).');
      continue;
    }

    const simPct = semanticSimilarityPercent(embA, embB);
    console.log('  → SBERT semantic similarity:', simPct.toFixed(2), '%');
  }
}

async function testSkillMatchingInsideAlgorithm() {
  console.log('\n--- STEP 2: Skill matching inside Algorithm 1 (with SBERT) ---');

  const jobReq: JobRequirements = {
    title: 'Administrative Officer II (Records Officer)',
    description:
      'Responsible for records classification, document tracking, FOI requests, and data privacy compliance in the municipal hall.',
    degreeRequirement: 'Bachelor of Public Administration',
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
      'recruitment and selection', // extra / noise skill
    ],
    totalYearsExperience: 3,
    workExperienceTitles: ['Administrative Aide IV (Records)', 'Records Clerk'],
  };

  const { job: normJob, applicant: normApplicant } =
    await normalizeJobAndApplicant(jobReq, applicant);

  console.log('\n[JOB skills]:', normJob.skills);
  console.log('[APPLICANT skills]:', normApplicant.skills);

  const score = await algorithm1_WeightedSum(normJob, normApplicant);

  console.log('\n[Algorithm 1 - ScoreBreakdown]');
  console.dir(score, { depth: null });

  console.log(
    `\nSkillsScore = ${score.skillsScore.toFixed(
      2,
    )}% | matchedSkillsCount = ${score.matchedSkillsCount}`,
  );
}

async function main() {
  console.log('===================================');
  console.log('▶ SBERT + SKILL MATCHING AUDIT');
  console.log('===================================\n');

  console.log('HF_API_KEY present:', !!process.env.HF_API_KEY);
  console.log('HF_EMBEDDINGS_API_URL:', process.env.HF_EMBEDDINGS_API_URL || '(default)');

  await testRawSBERTPairs();
  await testSkillMatchingInsideAlgorithm();

  console.log('\n✅ SBERT + skill matching audit finished.\n');
}

main().catch((err) => {
  console.error('❌ audit-sbert-and-skill-matching failed:', err);
  process.exit(1);
});
