// scripts/test-degree-normalization.ts
//
// Run with:
//   npx ts-node scripts/test-degree-normalization.ts

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import {
  normalizeJobAndApplicant,
} from '../src/lib/gemini/normalization';

import type {
  JobRequirements,
  ApplicantData,
} from '../src/lib/gemini/scoringAlgorithms';

interface CanonicalDegree {
  key: string;
  canonical: string;
  level?: string;
  fieldGroup?: string;
  aliases: string[];
}

/**
 * Same parse logic as in normalization.ts (parseDegreesYaml).
 */
function parseDegreesYaml(doc: any): CanonicalDegree[] {
  if (!doc) return [];

  const source = doc.degrees ?? doc; // support { degrees: {...} } or top-level map
  const result: CanonicalDegree[] = [];

  // Format B: degrees is an array
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      const key = (item as any).key || (item as any).id;
      if (!key || !(item as any).canonical) continue;

      result.push({
        key: String(key),
        canonical: String((item as any).canonical),
        level: (item as any).level,
        fieldGroup: (item as any).field_group || (item as any).fieldGroup,
        aliases: Array.isArray((item as any).aliases)
          ? (item as any).aliases.map((a: any) => String(a))
          : [],
      });
    }
    return result;
  }

  // Format A/C: object map
  if (typeof source === 'object') {
    for (const [rawKey, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object') continue;
      const v: any = value;
      const key = v.key || rawKey;
      const canonical = v.canonical;
      if (!key || !canonical) continue;

      const aliases: string[] = Array.isArray(v.aliases)
        ? v.aliases.map((a: any) => String(a))
        : [];

      result.push({
        key: String(key),
        canonical: String(canonical),
        level: v.level,
        fieldGroup: v.field_group || v.fieldGroup,
        aliases,
      });
    }
    return result;
  }

  return [];
}

function normalizeLevelForComparison(raw?: string): string {
  if (!raw) return '';
  return raw.toLowerCase().trim();
}

async function main() {
  const root = process.cwd();
  const degreesPath = path.join(
    root,
    'src',
    'app',
    'config',
    'dictionaries',
    'degrees.yaml'
  );

  console.log('▶ Degree normalization sanity check');
  console.log('process.cwd() =', root);
  console.log('degreesPath   =', degreesPath);

  if (!fs.existsSync(degreesPath)) {
    console.error('❌ degrees.yaml NOT FOUND at this path.');
    process.exit(1);
  }

  const raw = await fs.promises.readFile(degreesPath, 'utf8');
  const doc = yaml.load(raw);
  const degreesList = parseDegreesYaml(doc);

  console.log('Parsed degree entries:', degreesList.length);
  if (degreesList.length === 0) {
    console.error('❌ No degree entries parsed. Check degrees.yaml structure.');
    process.exit(1);
  }

  // Choose a few random entries to test
  const TEST_COUNT = Math.min(10, degreesList.length);
  const testedIndices = new Set<number>();

  console.log('----------------------------------------');
  console.log(`Testing ${TEST_COUNT} random degrees using normalizeJobAndApplicant(...)`);
  console.log('(Job + applicant both use a messy alias per case)\n');

  for (let i = 0; i < TEST_COUNT; i++) {
    // Pick a unique random index
    let idx: number;
    do {
      idx = Math.floor(Math.random() * degreesList.length);
    } while (testedIndices.has(idx));
    testedIndices.add(idx);

    const degree = degreesList[idx];

    // Prefer an alias for the messy test value, fall back to canonical
    const aliasPool = degree.aliases && degree.aliases.length > 0
      ? degree.aliases
      : [degree.canonical];

    const aliasIndex = Math.floor(Math.random() * aliasPool.length);
    const messyDegree = aliasPool[aliasIndex];

    const expectedCanonical = degree.canonical;
    const expectedLevel = normalizeLevelForComparison(degree.level);
    const expectedFieldGroup = degree.fieldGroup ?? undefined;

    // Build minimal job & applicant using this messy alias
    const jobReq: JobRequirements = {
      title: 'Test Job for Normalization',
      description: 'Sanity check for degree normalization pipeline.',
      degreeRequirement: messyDegree,
      eligibilities: [],
      skills: [],
      yearsOfExperience: 0,
    };

    const applicantData: ApplicantData = {
      highestEducationalAttainment: messyDegree,
      eligibilities: [],
      skills: [],
      totalYearsExperience: 0,
      workExperienceTitles: [],
    };

    // Call the REAL pipeline normalizer
    const { job: normalizedJob, applicant: normalizedApplicant } =
      await normalizeJobAndApplicant(jobReq, applicantData);

    const jobDegreeNorm = normalizedJob.degreeRequirement;
    const appDegreeNorm = normalizedApplicant.highestEducationalAttainment;
    const jobLevelNorm = normalizeLevelForComparison(normalizedJob.degreeLevel);
    const appLevelNorm = normalizeLevelForComparison(normalizedApplicant.degreeLevel);
    const jobFieldGroupNorm = normalizedJob.degreeFieldGroup;
    const appFieldGroupNorm = normalizedApplicant.degreeFieldGroup;

    const jobCanonicalOk =
      typeof jobDegreeNorm === 'string' &&
      jobDegreeNorm.trim() === expectedCanonical.trim();

    const appCanonicalOk =
      typeof appDegreeNorm === 'string' &&
      appDegreeNorm.trim() === expectedCanonical.trim();

    const jobLevelOk = jobLevelNorm === expectedLevel;
    const appLevelOk = appLevelNorm === expectedLevel;

    const jobFieldOk = jobFieldGroupNorm === expectedFieldGroup;
    const appFieldOk = appFieldGroupNorm === expectedFieldGroup;

    const allOk =
      jobCanonicalOk &&
      appCanonicalOk &&
      jobLevelOk &&
      appLevelOk &&
      jobFieldOk &&
      appFieldOk;

    console.log(`Case #${i + 1}`);
    console.log('  Dictionary entry:');
    console.log('    key         :', degree.key);
    console.log('    canonical   :', expectedCanonical);
    console.log('    level       :', degree.level ?? '(none)');
    console.log('    field_group :', expectedFieldGroup ?? '(none)');
    console.log('    alias used  :', JSON.stringify(messyDegree));

    console.log('  Normalized job:');
    console.log('    degreeRequirement:', jobDegreeNorm);
    console.log('    degreeLevel      :', normalizedJob.degreeLevel ?? '(none)');
    console.log('    degreeFieldGroup :', jobFieldGroupNorm ?? '(none)');

    console.log('  Normalized applicant:');
    console.log('    highestEducationalAttainment:', appDegreeNorm);
    console.log('    degreeLevel              :', normalizedApplicant.degreeLevel ?? '(none)');
    console.log('    degreeFieldGroup         :', appFieldGroupNorm ?? '(none)');

    console.log('  Checks:');
    console.log('    job canonical   OK?', jobCanonicalOk);
    console.log('    appl canonical  OK?', appCanonicalOk);
    console.log('    job level       OK?', jobLevelOk);
    console.log('    appl level      OK?', appLevelOk);
    console.log('    job field_group OK?', jobFieldOk);
    console.log('    appl field_group OK?', appFieldOk);

    console.log('  ==>', allOk ? '✅ PASS' : '⚠️  MISMATCH (check above lines)');
    console.log('----------------------------------------');
  }

  console.log('Normalization sanity check completed.');
}

main().catch(err => {
  console.error('Unexpected error in test-degree-normalization:', err);
  process.exit(1);
});
