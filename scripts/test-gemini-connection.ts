// scripts/test-gemini-connection.ts
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set. Check your .env or .env.local.');
    return;
  }

  console.log('🔑 GEMINI_API_KEY detected. Testing Gemini 2.0 Flash...');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent('Reply with exactly: "pong"');
    const text = result.response.text().trim();

    console.log('✅ Gemini responded with:', JSON.stringify(text));

    if (text.toLowerCase().includes('pong')) {
      console.log('🎉 Gemini API is reachable and working.');
    } else {
      console.log('⚠️ Gemini responded, but not exactly "pong" – still reachable though.');
    }
  } catch (err) {
    console.error('❌ Gemini connection test failed:', err);
  }
}

main().then(() => process.exit(0));
