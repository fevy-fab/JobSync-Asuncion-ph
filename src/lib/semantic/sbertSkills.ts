/**
 * SBERT-based semantic similarity for skills.
 *
 * Uses Hugging Face Inference API with the model:
 *   sentence-transformers/all-MiniLM-L6-v2
 *
 * Environment variables:
 *   HF_API_KEY              - your Hugging Face access token (REQUIRED)
 *   HF_EMBEDDINGS_API_URL   - optional override for the embeddings URL
 *
 * Default URL (as of May 2025, recommended by Sentence Transformers org):
 *   https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction
 *
 * This module is SERVER-SIDE ONLY.
 */

export type Embedding = number[];

// Read env vars once
const HF_API_KEY = process.env.HF_API_KEY;
const HF_API_URL =
  process.env.HF_EMBEDDINGS_API_URL ??
  'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction';

// Simple in-memory cache: normalized skill text → embedding
const skillEmbeddingCache = new Map<string, Embedding>();

function normalizeSkillText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Cosine similarity between two embeddings (returns -1 to 1).
 */
export function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Map cosine similarity [-1, 1] → percentage [0, 100].
 */
export function semanticSimilarityPercent(a: Embedding, b: Embedding): number {
  const cos = cosineSimilarity(a, b);
  const percent = ((cos + 1) / 2) * 100; // [-1,1] → [0,100]
  return Math.max(0, Math.min(100, percent));
}

/**
 * Call Hugging Face Inference API to get one sentence embedding.
 * - Returns [] if HF_API_KEY is missing or the API fails.
 * - Results are cached in memory for this server process.
 */
export async function getSkillEmbedding(text: string): Promise<Embedding> {
  const normalized = normalizeSkillText(text);

  const cached = skillEmbeddingCache.get(normalized);
  if (cached) return cached;

  if (!HF_API_KEY) {
    console.warn(
      '[JobSync][SBERT] HF_API_KEY is not set; semantic skill similarity will fall back to string matching only.'
    );
    return [];
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [text],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        '[JobSync][SBERT] Hugging Face API error:',
        response.status,
        response.statusText,
        errorText
      );
      return [];
    }

    const data = await response.json();

    let embedding: Embedding;

    // Possible shapes:
    // - [dim]                                   → one embedding
    // - [[dim]]                                 → one embedding in list
    // - [[dim], [dim], ...]                     → token embeddings; we mean-pool
    if (Array.isArray(data) && typeof data[0] === 'number') {
      // [dim]
      embedding = data as Embedding;
    } else if (Array.isArray(data) && Array.isArray(data[0])) {
      const arr = data as number[][];
      if (arr.length === 1 && Array.isArray(arr[0]) && typeof arr[0][0] === 'number') {
        // [[dim]]
        embedding = arr[0];
      } else {
        // Mean-pool over tokens: [[dim], [dim], ...] → [dim]
        const dim = arr[0].length;
        const pooled = new Array(dim).fill(0);

        for (const vec of arr) {
          for (let i = 0; i < dim; i++) {
            pooled[i] += vec[i];
          }
        }
        for (let i = 0; i < dim; i++) {
          pooled[i] /= arr.length;
        }

        embedding = pooled;
      }
    } else {
      console.error('[JobSync][SBERT] Unexpected embedding format from HF API:', data);
      return [];
    }
    
    skillEmbeddingCache.set(normalized, embedding);
    return embedding;
  } catch (err) {
    console.error('[JobSync][SBERT] Failed to fetch embedding:', err);
    return [];
  }
}
