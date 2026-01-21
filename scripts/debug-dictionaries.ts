// scripts/debug-dictionaries.ts
import 'dotenv/config';
import {
  debugDumpEligibilityState,
  normalizeEligibilityValue,
  normalizeDegreeValue,
} from '../src/lib/gemini/normalization';

async function main() {
  console.log('===================================');
  console.log('▶ STEP 1: DICTIONARY INTERNAL STATE');
  console.log('===================================\n');

  // This prints:
  // - eligibilitiesByKey.size
  // - eligibilityAliasIndex.size
  // - probe for "Career Service Professional" / "Career Service Professional Eligibility"
  await debugDumpEligibilityState();

  console.log('\n===================================');
  console.log('▶ STEP 2: ELIGIBILITY NORMALIZATION TESTS');
  console.log('===================================\n');

  const eligibilitySamples = [
    'Career Service Professional',
    'Career Service Professional Eligibility',
    'Career Service Professional Eligibility (Second Level)',
    'CSE professional',
    'cse prof',
    'CSC Professional Eligibility',
  ];

  for (const raw of eligibilitySamples) {
    const res = await normalizeEligibilityValue(raw);
    console.log(`Raw: "${raw}"`);
    console.log(`  method:       ${res.method}`);
    console.log(`  canonicalKey: ${res.canonicalKey ?? 'NONE'}`);
    console.log(`  confidence:   ${res.confidence}`);
    console.log('---');
  }

  console.log('\n===================================');
  console.log('▶ STEP 3: DEGREE NORMALIZATION TESTS');
  console.log('===================================\n');

  const degreeSamples = [
    'Bachelor of Public Administration',
    'B.P.A.',
    'BA in Public Administration',
    'Master in Public Administration',
    'MPA',
    'PhD in Public Policy',
    'AB Political Science',
  ];

  for (const raw of degreeSamples) {
    const res = await normalizeDegreeValue(raw);
    console.log(`Raw: "${raw}"`);
    console.log(`  method:       ${res.method}`);
    console.log(`  canonicalKey: ${res.canonicalKey ?? 'NONE'}`);
    console.log(`  confidence:   ${res.confidence}`);
    console.log('---');
  }

  console.log('\n✅ Done.');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
