// src/app/api/debug/sbert/route.ts
//
// Test SBERT skills embedding via Hugging Face Inference API
// Uses your existing sbertSkills.ts module.
//
// Call after deploy:
//   https://jobsync-asuncion.vercel.app/api/debug/sbert

import { NextResponse } from 'next/server';
import {
  getSkillEmbedding,
  semanticSimilarityPercent,
} from '@/lib/semantic/sbertSkills';

export async function GET() {
  try {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      HF_API_KEY_present: !!process.env.HF_API_KEY,
      HF_EMBEDDINGS_API_URL: process.env.HF_EMBEDDINGS_API_URL ?? 'DEFAULT_ROUTER_URL',
    };

    // Tiny smoke test – safe strings
    const s1 = 'customer service';
    const s2 = 'client support';

    const [e1, e2] = await Promise.all([
      getSkillEmbedding(s1),
      getSkillEmbedding(s2),
    ]);

    const dims = {
      [s1]: e1.length,
      [s2]: e2.length,
    };

    let similarity: number | null = null;
    if (e1.length && e2.length && e1.length === e2.length) {
      similarity = semanticSimilarityPercent(e1, e2);
    }

    return NextResponse.json(
      {
        ok: true,
        provider: 'SBERT (sentence-transformers/all-MiniLM-L6-v2)',
        envInfo,
        embeddingDimensions: dims,
        similarityPercent_customerService_vs_clientSupport: similarity,
        note:
          'If HF_API_KEY_present is true and dimensions > 0, SBERT is working in this environment.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[DEBUG SBERT] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        provider: 'SBERT',
        errorMessage: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
