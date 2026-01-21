// scripts/test-normalization.ts
import 'dotenv/config'; // 🔹 Load env first
import {
  normalizeDegreeValue,
  normalizeEligibilityValue,
} from '@/lib/gemini/normalization';

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set. Add it to your .env (or configure dotenv path).');
    process.exit(1);
  }

  console.log('✅ GEMINI_API_KEY found. Testing normalization pipeline...\n');

  // 🔧 Adjust these to hit both dictionary + Gemini paths
  const testDegrees = [
    'BS in IT',                                           // should hit BS_IT alias if in YAML
    'Bachelor of Science in Information Technology',      // same canonical
    'BS Accountancy',                                     // if BS_ACCOUNTING is in YAML
    'Random Invented Degree X',                           // likely fallback / Gemini
  ];

  const testEligibilities = [
    'Civil Service Exam Professional',                    // CSC_PROF alias
    'CS Professional',                                    // alias
    'CPA License',                                        // PRC_CPA alias if configured
    'Random Eligibility ABC',                             // likely fallback / Gemini
  ];

  console.log('=== DEGREE NORMALIZATION TEST ===');
  for (const degree of testDegrees) {
    const res = await normalizeDegreeValue(degree);
    console.log({
      input: degree,
      method: res.method,           // 'dictionary' | 'gemini' | 'fallback'
      canonicalKey: res.canonicalKey ?? null,
      confidence: res.confidence,
    });
  }

  console.log('\n=== ELIGIBILITY NORMALIZATION TEST ===');
  for (const elig of testEligibilities) {
    const res = await normalizeEligibilityValue(elig);
    console.log({
      input: elig,
      method: res.method,
      canonicalKey: res.canonicalKey ?? null,
      confidence: res.confidence,
    });
  }

  console.log('\n✅ Normalization test finished.');
}

main().catch((err) => {
  console.error('❌ Test script crashed:', err);
  process.exit(1);
});
