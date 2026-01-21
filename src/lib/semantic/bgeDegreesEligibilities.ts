// BGE-M3 embeddings for degree & eligibility normalization.
//
// Uses Hugging Face Inference API (same HF_API_KEY you already use for SBERT).
// Default URL is BAAI/bge-m3 via HF "router" feature-extraction pipeline.
//
// IMPORTANT: This file is SERVER-SIDE ONLY.
import 'dotenv/config';

export type Embedding = number[];

const HF_API_KEY = process.env.HF_API_KEY;
const BGE_M3_API_URL =
  process.env.BGE_M3_API_URL ??
  'https://router.huggingface.co/hf-inference/models/BAAI/bge-m3/pipeline/feature-extraction';

// Simple in-memory cache for query embeddings (within one Node process)
const bgeQueryEmbeddingCache = new Map<string, Embedding>();

function normalizeTextForCache(text: string): string {
  return text.toLowerCase().trim();
}

function logBgeWarn(message: string, ...args: unknown[]) {
  console.warn('[JobSync] [BGE-M3]', message, ...args);
}

function logBgeError(message: string, ...args: unknown[]) {
  console.error('[JobSync] [BGE-M3]', message, ...args);
}

/**
 * Call the BGE-M3 HF Inference endpoint.
 * Accepts one or many texts.
 */
async function callBgeApi(texts: string[]): Promise<any | null> {
  if (!HF_API_KEY) {
    logBgeWarn('HF_API_KEY is not set; BGE-M3 normalization is disabled.');
    return null;
  }

  if (!texts.length) return null;

  const body =
    texts.length === 1
      ? { inputs: texts[0] }
      : { inputs: texts };

  const res = await fetch(BGE_M3_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let extra: string | undefined;
    try {
      extra = await res.text();
    } catch {
      extra = undefined;
    }
    logBgeError(
      `API error status=${res.status} ${res.statusText}`,
      extra ? `body=${extra}` : ''
    );
    return null;
  }

  try {
    return await res.json();
  } catch (err) {
    logBgeError('Failed to parse BGE-M3 JSON response:', err);
    return null;
  }
}

/**
 * Recursively drill into the HF response and extract an embedding:
 *   - Handles shapes like [D], [[D]], [[[D]]], etc.
 */
function extractSingleEmbedding(obj: any): Embedding | null {
  if (!Array.isArray(obj) || obj.length === 0) return null;
  if (typeof obj[0] === 'number') {
    return obj as Embedding;
  }
  return extractSingleEmbedding(obj[0]);
}

/**
 * Extract a list of embeddings from the HF response.
 * For a batch, we expect one embedding per input text (same order).
 */
function extractEmbeddings(json: any): Embedding[] {
  if (!Array.isArray(json) || json.length === 0) return [];

  // Case 1: single embedding (no batch)
  if (typeof json[0] === 'number') {
    const single = extractSingleEmbedding(json);
    return single ? [single] : [];
  }

  // Case 2: batch; each item corresponds to one input
  const result: Embedding[] = [];
  for (const item of json) {
    const emb = extractSingleEmbedding(item);
    if (emb) result.push(emb);
  }
  return result;
}

/**
 * L2-normalize a vector so cosine similarity is just dot product.
 */
function l2Normalize(vec: Embedding): Embedding {
  let normSq = 0;
  for (const v of vec) normSq += v * v;
  const norm = Math.sqrt(normSq);
  if (!norm || !Number.isFinite(norm)) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Get a single BGE-M3 embedding for text (L2-normalized).
 * Uses an in-memory cache so repeated texts don't hit HF again in this process.
 */
export async function getBgeEmbedding(text: string): Promise<Embedding | null> {
  const value = text.trim();
  if (!value) return null;

  const cacheKey = normalizeTextForCache(value);
  const cached = bgeQueryEmbeddingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const json = await callBgeApi([value]);
  if (!json) return null;

  const embeddings = extractEmbeddings(json);
  if (!embeddings.length) {
    logBgeWarn('No embedding returned for text', value);
    return null;
  }

  const normalized = l2Normalize(embeddings[0]);
  bgeQueryEmbeddingCache.set(cacheKey, normalized);
  return normalized;
}

/**
 * Get BGE-M3 embeddings for a batch of texts (L2-normalized).
 * The i-th embedding corresponds to texts[i].
 */
export async function getBgeEmbeddingsBatch(
  texts: string[]
): Promise<Embedding[]> {
  const safeTexts = texts.map((t) => t ?? '').map((t) => t.trim());
  if (!safeTexts.length) return [];

  const json = await callBgeApi(safeTexts);
  if (!json) return [];

  const embeddings = extractEmbeddings(json);
  if (!embeddings.length) {
    logBgeWarn('No embeddings returned for batch of size', safeTexts.length);
    return [];
  }

  // Best-effort: if HF returns fewer embeddings than texts, we align by index.
  const normalized: Embedding[] = [];
  for (let i = 0; i < embeddings.length; i++) {
    normalized.push(l2Normalize(embeddings[i]));
  }
  return normalized;
}

/**
 * Cosine similarity between two (optionally already L2-normalized) vectors.
 */
export function cosineSimilarity(a: Embedding, b: Embedding): number {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
