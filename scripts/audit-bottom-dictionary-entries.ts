// scripts/audit-bottom-dictionary-entries.ts
//
// Purpose: Verify that dictionary-based normalization works for entries
// near the BOTTOM of degrees.yaml, eligibilities.yaml, and that levels.yaml
// is fully parsed (top-to-bottom) by reading the last entry.
//
// Run with:
//   npx ts-node scripts/audit-bottom-dictionary-entries.ts

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import {
  normalizeDegreeValue,
  normalizeEligibilityValue,
} from '../src/lib/gemini/normalization';

interface NormalizationResult {
  canonicalKey?: string;
  method: 'dictionary' | 'gemini' | 'fallback' | string;
  confidence?: number;
}

// Simple helpers for pretty logging
function logTitle(title: string) {
  console.log('\n===================================');
  console.log(`▶ ${title}`);
  console.log('===================================\n');
}

function logSubsection(title: string) {
  console.log(`\n--- ${title} ---\n`);
}

async function testDegreeAlias(alias: string, expectedKey: string) {
  const result = (await normalizeDegreeValue(alias)) as NormalizationResult;

  const ok =
    result.method === 'dictionary' && result.canonicalKey === expectedKey;

  console.log(`[DEGREE] "${alias}"`);
  console.log(
    `  → method: ${result.method}, canonicalKey: ${result.canonicalKey}, confidence: ${result.confidence}`
  );
  console.log(`  → EXPECTED key: ${expectedKey}  |  PASS: ${ok}\n`);
}

async function testEligibilityAlias(alias: string, expectedKey: string) {
  const result = (await normalizeEligibilityValue(alias)) as NormalizationResult;

  const ok =
    result.method === 'dictionary' && result.canonicalKey === expectedKey;

  console.log(`[ELIGIBILITY] "${alias}"`);
  console.log(
    `  → method: ${result.method}, canonicalKey: ${result.canonicalKey}, confidence: ${result.confidence}`
  );
  console.log(`  → EXPECTED key: ${expectedKey}  |  PASS: ${ok}\n`);
}

function inspectLevelsYaml() {
// --- LEVELS YAML (top-to-bottom load check) ---

console.log('\n--- LEVELS YAML (top-to-bottom load check) ---');

try {
  const levelsPath = path.join(
    process.cwd(),
    'src',
    'app',
    'config',
    'dictionaries',
    'levels.yaml'
  );

  const levelsRaw = fs.readFileSync(levelsPath, 'utf8');
  const levelsData = yaml.load(levelsRaw);

  interface DegreeLevel {
    id: string;
    aliases: string[];
  }

  // Support your current format:
  // canonical:
  //   - id: elementary
  //     aliases: [...]
  const levelsList: DegreeLevel[] =
    levelsData &&
    typeof levelsData === 'object' &&
    Array.isArray((levelsData as any).canonical)
      ? ((levelsData as any).canonical as DegreeLevel[])
      : Array.isArray(levelsData)
      ? (levelsData as DegreeLevel[])
      : (levelsData &&
        typeof levelsData === 'object' &&
        Array.isArray((levelsData as any).levels)
          ? ((levelsData as any).levels as DegreeLevel[])
          : []);

  if (levelsList.length === 0) {
    console.log(
      '[WARN] levels.yaml is empty or has unexpected structure. Parsed value:',
      levelsData
    );
    return;
  }

  console.log(
    `[JobSync] Parsed levels entries count: ${levelsList.length}`
  );

  const first = levelsList[0];
  const last = levelsList[levelsList.length - 1];

  console.log('\n[First entry]');
  console.log(first);

  console.log('\n[Last entry]');
  console.log(last);

  // Helper to test specific aliases against a target level id
  function testLevelAliases(
    levelId: string,
    testAliases: string[]
  ) {
    const level = levelsList.find((l) => l.id === levelId);
    if (!level) {
      console.log(
        `\n[ERROR] Level id "${levelId}" not found in levels.yaml`
      );
      return;
    }

    console.log(`\n▶ Testing "${levelId}" aliases`);

    const normalizedAliases = level.aliases.map((a) =>
      a.toLowerCase().trim()
    );

    for (const raw of testAliases) {
      const probe = raw.toLowerCase().trim();
      const pass = normalizedAliases.includes(probe);

      console.log(
        `[LEVEL] "${raw}"\n  → foundInLevel: ${
          pass ? levelId : 'NOT FOUND'
        }\n  → EXPECTED level: ${levelId}  |  PASS: ${pass}`
      );
    }
  }

  // Bottom-of-YAML checks
  // (using the aliases you defined near the bottom of levels.yaml)

  // college
  testLevelAliases('college', [
    'b',
    'bs in',
    'bachelor',
    "bachelor's in",
    'bachelors of'
  ]);

  // graduate studies
  testLevelAliases('graduate studies', [
    'mt',
    'mt in',
    'master',
    "master's",
    'masters in',
    'masters of'
  ]);
} catch (err) {
  console.error('[ERROR] Failed to read/parse levels.yaml:', err);
}

}

async function main() {
  logTitle('BOTTOM-OF-YAML DICTIONARY ENTRIES AUDIT');

  console.log('[JobSync] process.cwd() =', process.cwd());
  console.log(
    '[Note] For this audit, it is recommended to set JOBSYNC_USE_GEMINI=false to avoid Gemini calls.\n'
  );

  // ==============================
  // STEP 1: Degrees (bottom entries)
  // ==============================
  logSubsection('DEGREE ALIASES FROM BOTTOM OF degrees.yaml');

  // BS_CINEMATOGRAPHY
  console.log('▶ Testing BS_CINEMATOGRAPHY aliases\n');
  await testDegreeAlias(
    'Bachelor of Fine Arts major in Cinematography',
    'BS_CINEMATOGRAPHY'
  );
  await testDegreeAlias('BFA in Cinematography', 'BS_CINEMATOGRAPHY');
  await testDegreeAlias('Cinematography', 'BS_CINEMATOGRAPHY');
  await testDegreeAlias('Film Production', 'BS_CINEMATOGRAPHY'); // currently BA_FILM_PRODUCTION
  await testDegreeAlias('Camera Operations', 'BS_CINEMATOGRAPHY');

  // BS_STAGE_DESIGN_MGMT
  console.log('▶ Testing BS_STAGE_DESIGN_MGMT aliases\n');
  await testDegreeAlias(
    'Bachelor of Arts in Stage Design and Management',
    'BS_STAGE_DESIGN_MGMT'
  );
  await testDegreeAlias(
    'BA in Stage Design and Management',
    'BS_STAGE_DESIGN_MGMT'
  );
  await testDegreeAlias('Stage Design', 'BS_STAGE_DESIGN_MGMT');
  await testDegreeAlias('Stage Management', 'BS_STAGE_DESIGN_MGMT'); // currently BA_PERFORMING_ARTS_MANAGEMENT
  await testDegreeAlias('Production Design', 'BS_STAGE_DESIGN_MGMT'); // currently BS_PRODUCTION_ENGINEERING

  // CERT_SOUND_LIGHT_TECH
  console.log('▶ Testing CERT_SOUND_LIGHT_TECH aliases\n');
  await testDegreeAlias(
    'Certificate in Sound and Light Technology',
    'CERT_SOUND_LIGHT_TECH'
  );
  await testDegreeAlias(
    'Sound and Light Technology',
    'CERT_SOUND_LIGHT_TECH'
  );
  await testDegreeAlias('Lighting Technology', 'CERT_SOUND_LIGHT_TECH');
  await testDegreeAlias('Sound Technology', 'CERT_SOUND_LIGHT_TECH');
  await testDegreeAlias('Stage Lighting', 'CERT_SOUND_LIGHT_TECH');

  // =================================
  // STEP 2: Eligibilities (bottom entries)
  // =================================
  logSubsection('ELIGIBILITY ALIASES FROM BOTTOM OF eligibilities.yaml');

  console.log('▶ Testing CSC_TOURISM_ARTS_OFFICER aliases\n');
  await testEligibilityAlias('tourism officer eligibility', 'CSC_TOURISM_ARTS_OFFICER');
  await testEligibilityAlias('tourism promotion eligibility', 'CSC_TOURISM_ARTS_OFFICER');
  await testEligibilityAlias('events management eligibility', 'CSC_TOURISM_ARTS_OFFICER');
  await testEligibilityAlias('performing arts officer eligibility', 'CSC_TOURISM_ARTS_OFFICER');
  await testEligibilityAlias('eligibility for arts officers', 'CSC_TOURISM_ARTS_OFFICER');

  console.log('▶ Testing CSC_EDU_TRAINING_OFFICER aliases\n');
  await testEligibilityAlias('education officer eligibility', 'CSC_EDU_TRAINING_OFFICER');
  await testEligibilityAlias('training officer eligibility', 'CSC_EDU_TRAINING_OFFICER');
  await testEligibilityAlias(
    'learning and development officer eligibility',
    'CSC_EDU_TRAINING_OFFICER'
  );
  await testEligibilityAlias('training management eligibility', 'CSC_EDU_TRAINING_OFFICER');
  await testEligibilityAlias(
    'eligibility for education and training officers',
    'CSC_EDU_TRAINING_OFFICER'
  );

  console.log('▶ Testing DFA_FSO aliases\n');
  await testEligibilityAlias('foreign service officer eligibility', 'DFA_FSO');
  await testEligibilityAlias('fso eligibility', 'DFA_FSO');
  await testEligibilityAlias('diplomatic service eligibility', 'DFA_FSO');
  await testEligibilityAlias('foreign affairs eligibility', 'DFA_FSO');
  await testEligibilityAlias('embassy officer eligibility', 'DFA_FSO');
  await testEligibilityAlias('passed foreign service officer exam', 'DFA_FSO');

  // =================================
  // STEP 3: levels.yaml bottom check
  // =================================
  inspectLevelsYaml();

  console.log('\n✅ Bottom-of-YAML dictionary entries audit finished.\n');
}

main().catch((err) => {
  console.error('\n[ERROR] audit-bottom-dictionary-entries.ts failed:\n', err);
  process.exit(1);
});
