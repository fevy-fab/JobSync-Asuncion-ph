// scripts/test-gemini-basic.ts
import 'dotenv/config'; // Load env vars (GEMINI_API_KEY etc.)
import { generateContent } from '../src/lib/gemini';

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set. Add it to your .env or .env.local.');
    process.exit(1);
  }

  console.log('✅ GEMINI_API_KEY found. Testing Gemini connection...\n');

  const prompt = `
You are a test assistant.
Reply with a short JSON only:

{
  "status": "ok",
  "message": "Gemini free tier test pass"
}
`;

  try {
    // Use a cheap / fast model for free tier
    const text = await generateContent(prompt, 'gemini-1.5-flash');

    console.log('=== RAW GEMINI RESPONSE ===');
    console.log(text);
    console.log('\n✅ Gemini basic test finished.');
  } catch (err) {
    console.error('\n❌ Gemini basic test failed:');
    console.error(err);
    process.exit(1);
  }
}

main();
