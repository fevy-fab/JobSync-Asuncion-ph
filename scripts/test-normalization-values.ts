// scripts/test-normalization-values.ts
import 'dotenv/config';
import {
  normalizeDegreeValue,
  normalizeEligibilityValue,
} from '../src/lib/gemini/normalization';

async function testDegrees() {
  console.log('▶ NORMALIZATION – DEGREE VALUES\n');

  // 🔧 Update these to match your degrees.yaml aliases & some "noisy" inputs
  const degreeSamples = [
    'BS in Information Technology',
    'B.S. in Info Techologyy',         // intentionally misspelled → likely Gemini
    'Bachelor of Science in Accountancy',
    '"B.P.A.',                         // noisy / partial
    'MA in Public Administration',
    'Some Totally Unknown Degree',     // should become fallback or low-confidence Gemini
  ];

  for (const raw of degreeSamples) {
    const res = await normalizeDegreeValue(raw);
    console.log(`Raw: "${raw}"`);
    console.log(`  method: ${res.method}`);               // 'dictionary' | 'gemini' | 'fallback'
    console.log(`  canonicalKey: ${res.canonicalKey ?? 'NONE'}`);
    console.log(`  confidence: ${res.confidence}`);
    console.log('---');
  }
}

async function testEligibilities() {
  console.log('\n▶ NORMALIZATION – ELIGIBILITY VALUES\n');

  // 🔧 Update these to match your eligibilities.yaml aliases
  const eligibilitySamples = [
    'civil service exam passer professional level', // should map to CSC_PROF-ish
    'CS Professional',
    'CSE Prof',
    'CPA License',                                  // if you have PRC_CPA canonical
    'Some Weird Eligibility That Does Not Exist',   // fallback / Gemini
  ];

  for (const raw of eligibilitySamples) {
    const res = await normalizeEligibilityValue(raw);
    console.log(`Raw: "${raw}"`);
    console.log(`  method: ${res.method}`);         // 'dictionary' | 'gemini' | 'fallback'
    console.log(`  canonicalKey: ${res.canonicalKey ?? 'NONE'}`);
    console.log(`  confidence: ${res.confidence}`);
    console.log('---');
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set. Add it to your .env or .env.local.');
    process.exit(1);
  }

  await testDegrees();
  await testEligibilities();

  console.log('\n✅ Normalization tests done.');
}

main().then(() => process.exit(0));
