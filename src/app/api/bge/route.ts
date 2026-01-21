// src/app/api/debug/bge/route.ts
//
// Test BGE-M3 embeddings via your bgeDegreesEligibilities.ts module.
//
// Call after deploy:
//   https://jobsync-asuncion.vercel.app/api/debug/bge

import { NextResponse } from 'next/server';
import {
  getBgeEmbedding,
  cosineSimilarity,
} from '@/lib/semantic/bgeDegreesEligibilities';

export async function GET() {
  try {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      HF_API_KEY_present: !!process.env.HF_API_KEY,
      BGE_M3_API_URL:
        process.env.BGE_M3_API_URL ??
        'https://router.huggingface.co/hf-inference/models/BAAI/bge-m3/pipeline/feature-extraction',
      BGE_M3_STRONG_THRESHOLD: process.env.BGE_M3_STRONG_THRESHOLD ?? '0.83 (default)',
      BGE_M3_SOFT_THRESHOLD: process.env.BGE_M3_SOFT_THRESHOLD ?? '0.75 (default)',
    };

    const t1 = 'Bachelor of Science in Accountancy';
    const t2 = 'BS Accountancy';

    const [e1, e2] = await Promise.all([
      getBgeEmbedding(t1),
      getBgeEmbedding(t2),
    ]);

    const dims = {
      [t1]: e1?.length ?? 0,
      [t2]: e2?.length ?? 0,
    };

    let similarity: number | null = null;
    if (e1 && e2 && e1.length && e2.length) {
      similarity = cosineSimilarity(e1, e2);
    }

    return NextResponse.json(
      {
        ok: true,
        provider: 'BAAI/bge-m3 via Hugging Face',
        envInfo,
        embeddingDimensions: dims,
        cosineSimilarity: similarity,
        note:
          'If HF_API_KEY_present is true and dimensions > 0, BGE-M3 is working in this environment.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[DEBUG BGE-M3] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        provider: 'BGE-M3',
        errorMessage: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
