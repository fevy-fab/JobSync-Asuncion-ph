// scripts/debug-degrees.ts
import 'dotenv/config';
import { normalizeDegreeValue } from '../src/lib/gemini/normalization';

function header(title: string) {
  console.log('\n===================================');
  console.log(`▶ ${title}`);
  console.log('===================================\n');
}

async function main() {
  header('STEP 1: DEGREE NORMALIZATION TESTS');

  const degreeSamples = [
    'Bachelor of Public Administration',
    'B.P.A.',
    'BA in Public Administration',
    'Master in Public Administration',
    'MPA',
    'PhD in Public Policy',
    'AB Political Science',
    'Bachelor of Science in Agricultural Engineering',
    'BS Agricultural Engineering',
    'BSAE',
    'Bachelor of Science in Environmental Engineering',
    'BS Environmental Engineering',
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
  console.error('❌ Error in debug-degrees.ts:', err);
  process.exit(1);
});
