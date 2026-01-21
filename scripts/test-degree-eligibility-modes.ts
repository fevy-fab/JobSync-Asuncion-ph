// scripts/test-degree-eligibility-modes.ts
//
// Standalone test harness for degree & eligibility normalization,
// using exactly ONE method at a time: "dictionary", "bge", or "gemini".
// Does NOT import or modify src/lib/gemini/normalization.ts.
//
// Usage examples (from project root):
//   npx ts-node scripts/test-degree-eligibility-modes.ts dictionary
//   npx ts-node scripts/test-degree-eligibility-modes.ts bge
//   npx ts-node scripts/test-degree-eligibility-modes.ts gemini

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import {
  getBgeEmbedding,
  cosineSimilarity as bgeCosine,
} from '../src/lib/semantic/bgeDegreesEligibilities';
import { generateContent, parseGeminiJSON } from '../src/lib/gemini/client';

type Mode = 'dictionary' | 'bge' | 'gemini';

interface CanonicalDegree {
  key: string;
  canonical: string;
  level?: string;
  fieldGroup?: string;
  aliases: string[];
}

interface CanonicalEligibility {
  key: string;
  canonical: string;
  category?: string;
  aliases: string[];
}

interface NormalizationResult {
  canonicalKey?: string;
  method: Mode;
  confidence: number; // 0–1
  raw: string;
}

// ---------------------------
// CLI arg handling
// ---------------------------
const modeArg = (process.argv[2] || '').toLowerCase();
const allowedModes: Mode[] = ['dictionary', 'bge', 'gemini'];

if (!allowedModes.includes(modeArg as Mode)) {
  console.error(
    `Please provide a mode: ${allowedModes.join(' | ')}\n` +
      `Example: npx ts-node scripts/test-degree-eligibility-modes.ts dictionary`
  );
  process.exit(1);
}

const MODE: Mode = modeArg as Mode;
console.log('===================================');
console.log('▶ Degree & Eligibility Pipeline Test');
console.log('Mode:', MODE);
console.log('===================================');

// ---------------------------
// Shared helpers (mirrors normalization.ts but self-contained)
// ---------------------------

function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function basicTokenSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));

  if (!aTokens.size || !bTokens.size) return 0;

  let intersection = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) intersection++;
  }
  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Degree YAML parsing (copy of logic from normalization.ts, simplified)
function parseDegreesYaml(doc: any): CanonicalDegree[] {
  if (!doc) return [];

  const source = doc.degrees ?? doc;
  const result: CanonicalDegree[] = [];

  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      const key = item.key || item.id;
      if (!key || !item.canonical) continue;

      result.push({
        key: String(key),
        canonical: String(item.canonical),
        level: item.level,
        fieldGroup: item.field_group || item.fieldGroup,
        aliases: Array.isArray(item.aliases)
          ? item.aliases.map((a: any) => String(a))
          : [],
      });
    }
    return result;
  }

  if (typeof source === 'object') {
    for (const [rawKey, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object') continue;
      const v: any = value;
      const key = v.key || rawKey;
      const canonical = v.canonical;
      if (!key || !canonical) continue;

      const aliases: string[] = Array.isArray(v.aliases)
        ? v.aliases.map((a: any) => String(a))
        : [];

      result.push({
        key: String(key),
        canonical: String(canonical),
        level: v.level,
        fieldGroup: v.field_group || v.fieldGroup,
        aliases,
      });
    }
    return result;
  }

  return [];
}

// Eligibility YAML parsing (copy of logic from normalization.ts, simplified)
function parseEligibilitiesYaml(doc: any): CanonicalEligibility[] {
  if (!doc) return [];

  const source = doc.eligibilities ?? doc;
  const result: CanonicalEligibility[] = [];

  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      const key = item.key || item.id;
      if (!key || !item.canonical) continue;

      result.push({
        key: String(key),
        canonical: String(item.canonical),
        category: item.category,
        aliases: Array.isArray(item.aliases)
          ? item.aliases.map((a: any) => String(a))
          : [],
      });
    }
    return result;
  }

  if (typeof source === 'object') {
    for (const [rawKey, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object') continue;
      const v: any = value;
      const key = v.key || rawKey;
      const canonical = v.canonical;
      if (!key || !canonical) continue;

      const aliases: string[] = Array.isArray(v.aliases)
        ? v.aliases.map((a: any) => String(a))
        : [];

      result.push({
        key: String(key),
        canonical: String(canonical),
        category: v.category,
        aliases,
      });
    }
    return result;
  }

  return [];
}

// ---------------------------
// Load YAML dictionaries
// ---------------------------
function loadDictionaries() {
  const root = process.cwd();
  const degreesPath = path.join(
    root,
    'src',
    'app',
    'config',
    'dictionaries',
    'degrees.yaml'
  );
  const eligibilitiesPath = path.join(
    root,
    'src',
    'app',
    'config',
    'dictionaries',
    'eligibilities.yaml'
  );

  console.log('[Test] process.cwd() =', root);
  console.log('[Test] degreesPath =', degreesPath);
  console.log('[Test] eligibilitiesPath =', eligibilitiesPath);

  let degreesList: CanonicalDegree[] = [];
  let eligList: CanonicalEligibility[] = [];

  try {
    if (fs.existsSync(degreesPath)) {
      const raw = fs.readFileSync(degreesPath, 'utf8');
      const doc = yaml.load(raw);
      degreesList = parseDegreesYaml(doc);
    } else {
      console.warn('[Test] degrees.yaml not found.');
    }
  } catch (err) {
    console.error('[Test] Failed to load degrees.yaml:', err);
  }

  try {
    if (fs.existsSync(eligibilitiesPath)) {
      const raw = fs.readFileSync(eligibilitiesPath, 'utf8');
      const doc = yaml.load(raw);
      eligList = parseEligibilitiesYaml(doc);
    } else {
      console.warn('[Test] eligibilities.yaml not found.');
    }
  } catch (err) {
    console.error('[Test] Failed to load eligibilities.yaml:', err);
  }

  console.log('[Test] Parsed counts:', {
    degrees: degreesList.length,
    eligibilities: eligList.length,
  });

  return { degreesList, eligList };
}

const { degreesList, eligList } = loadDictionaries();

// ---------------------------
// DICTIONARY-ONLY normalizers
// ---------------------------
function buildDegreeAliasIndex(list: CanonicalDegree[]): Map<string, CanonicalDegree> {
  const index = new Map<string, CanonicalDegree>();
  for (const d of list) {
    const allStrings = new Set<string>();
    allStrings.add(d.canonical);
    d.aliases.forEach(a => allStrings.add(a));
    for (const s of allStrings) {
      const nk = normalizeKey(s);
      if (!index.has(nk)) {
        index.set(nk, d);
      }
    }
  }
  return index;
}

function buildEligibilityAliasIndex(
  list: CanonicalEligibility[]
): Map<string, CanonicalEligibility> {
  const index = new Map<string, CanonicalEligibility>();
  for (const e of list) {
    const allStrings = new Set<string>();
    allStrings.add(e.canonical);
    e.aliases.forEach(a => allStrings.add(a));
    for (const s of allStrings) {
      const nk = normalizeKey(s);
      if (!index.has(nk)) {
        index.set(nk, e);
      }
    }
  }
  return index;
}

const degreeAliasIndex = buildDegreeAliasIndex(degreesList);
const eligibilityAliasIndex = buildEligibilityAliasIndex(eligList);

function normalizeDegree_dictionary(raw: string): NormalizationResult {
  const key = normalizeKey(raw);
  const hit = degreeAliasIndex.get(key);

  return {
    canonicalKey: hit?.key,
    method: 'dictionary',
    confidence: hit ? 1 : 0,
    raw,
  };
}

function normalizeEligibility_dictionary(raw: string): NormalizationResult {
  const key = normalizeKey(raw);
  const hit = eligibilityAliasIndex.get(key);

  return {
    canonicalKey: hit?.key,
    method: 'dictionary',
    confidence: hit ? 1 : 0,
    raw,
  };
}

// ---------------------------
// BGE-ONLY normalizers
// ---------------------------

async function normalizeDegree_bge(raw: string): Promise<NormalizationResult> {
  const text = raw.trim();
  if (!text || degreesList.length === 0) {
    return { canonicalKey: undefined, method: 'bge', confidence: 0, raw };
  }

  const queryEmb = await getBgeEmbedding(text);
  if (!queryEmb) {
    return { canonicalKey: undefined, method: 'bge', confidence: 0, raw };
  }

  let bestKey: string | undefined;
  let bestSim = -1;

  for (const d of degreesList) {
    const canonEmb = await getBgeEmbedding(d.canonical);
    if (!canonEmb) continue;

    const sim = bgeCosine(queryEmb, canonEmb);
    if (sim > bestSim) {
      bestSim = sim;
      bestKey = d.key;
    }
  }

  if (!bestKey || bestSim <= 0) {
    return { canonicalKey: undefined, method: 'bge', confidence: 0, raw };
  }

  return {
    canonicalKey: bestKey,
    method: 'bge',
    confidence: Math.min(1, Math.max(0, bestSim)),
    raw,
  };
}

async function normalizeEligibility_bge(raw: string): Promise<NormalizationResult> {
  const text = raw.trim();
  if (!text || eligList.length === 0) {
    return { canonicalKey: undefined, method: 'bge', confidence: 0, raw };
  }

  const queryEmb = await getBgeEmbedding(text);
  if (!queryEmb) {
    return { canonicalKey: undefined, method: 'bge', confidence: 0, raw };
  }

  let bestKey: string | undefined;
  let bestSim = -1;

  for (const e of eligList) {
    const canonEmb = await getBgeEmbedding(e.canonical);
    if (!canonEmb) continue;

    const sim = bgeCosine(queryEmb, canonEmb);
    if (sim > bestSim) {
      bestSim = sim;
      bestKey = e.key;
    }
  }

  if (!bestKey || bestSim <= 0) {
    return { canonicalKey: undefined, method: 'bge', confidence: 0, raw };
  }

  return {
    canonicalKey: bestKey,
    method: 'bge',
    confidence: Math.min(1, Math.max(0, bestSim)),
    raw,
  };
}

// ---------------------------
// GEMINI-ONLY normalizers
// (no dictionary / BGE – we just use candidates list + Gemini classifier)
// ---------------------------

interface GeminiDegreeClassificationResponse {
  canonical_key: string;
  confidence?: number;
  reasoning?: string;
}
interface GeminiEligibilityClassificationResponse {
  canonical_key: string;
  confidence?: number;
  reasoning?: string;
}

function getTopDegreeCandidates(raw: string, limit: number): CanonicalDegree[] {
  const scored = degreesList
    .map(d => ({ degree: d, score: basicTokenSimilarity(raw, d.canonical) }))
    .filter(s => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.degree);
}

function getTopEligibilityCandidates(
  raw: string,
  limit: number
): CanonicalEligibility[] {
  const scored = eligList
    .map(e => ({ eligibility: e, score: basicTokenSimilarity(raw, e.canonical) }))
    .filter(s => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.eligibility);
}

function buildDegreeClassificationPrompt(rawDegree: string, candidates: CanonicalDegree[]): string {
  const options = candidates.map(c => ({
    key: c.key,
    canonical: c.canonical,
    level: c.level ?? null,
    field_group: c.fieldGroup ?? null,
  }));

  return `
You are part of an HR system for Philippine government jobs.
Your task is to NORMALIZE an applicant's degree name to one of the canonical degrees provided.

The system has the following canonical degree options (JSON):

${JSON.stringify(options, null, 2)}

Given this raw applicant degree string:

"${rawDegree}"

Choose the SINGLE best canonical degree key from the list above.
If you are not reasonably sure, choose "UNKNOWN".

Respond ONLY in this exact JSON format:

{
  "canonical_key": "<one of the keys from the list OR 'UNKNOWN'>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<short explanation in 1-2 sentences>"
}
`;
}

function buildEligibilityClassificationPrompt(
  rawEligibility: string,
  candidates: CanonicalEligibility[]
): string {
  const options = candidates.map(c => ({
    key: c.key,
    canonical: c.canonical,
    category: c.category ?? null,
  }));

  return `
You are part of an HR system for Philippine government jobs.
Your task is to NORMALIZE an applicant's eligibility or license name to one of the canonical eligibilities provided.

The system has the following canonical eligibility options (JSON):

${JSON.stringify(options, null, 2)}

Given this raw applicant eligibility string:

"${rawEligibility}"

Choose the SINGLE best canonical eligibility key from the list above.
If you are not reasonably sure, choose "UNKNOWN".

Respond ONLY in this exact JSON format:

{
  "canonical_key": "<one of the keys from the list OR 'UNKNOWN'>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<short explanation in 1-2 sentences>"
}
`;
}

async function normalizeDegree_gemini(raw: string): Promise<NormalizationResult> {
  const trimmed = raw.trim();
  if (!trimmed || degreesList.length === 0) {
    return { canonicalKey: undefined, method: 'gemini', confidence: 0, raw };
  }

  const candidates = getTopDegreeCandidates(trimmed, 20);
  if (!candidates.length) {
    return { canonicalKey: undefined, method: 'gemini', confidence: 0, raw };
  }

  const prompt = buildDegreeClassificationPrompt(trimmed, candidates);

  try {
    const text = await generateContent(prompt, 'gemini-2.0-flash-exp');
    const parsed = parseGeminiJSON<GeminiDegreeClassificationResponse>(text);

    const key = parsed.canonical_key;
    if (!key || key === 'UNKNOWN') {
      return {
        canonicalKey: undefined,
        method: 'gemini',
        confidence: parsed.confidence ?? 0.3,
        raw,
      };
    }

    const exists = degreesList.find(d => d.key === key);
    if (!exists) {
      return {
        canonicalKey: undefined,
        method: 'gemini',
        confidence: parsed.confidence ?? 0.2,
        raw,
      };
    }

    return {
      canonicalKey: key,
      method: 'gemini',
      confidence: parsed.confidence ?? 0.8,
      raw,
    };
  } catch (err) {
    console.error('[Test] Gemini degree normalization failed:', err);
    return { canonicalKey: undefined, method: 'gemini', confidence: 0, raw };
  }
}

async function normalizeEligibility_gemini(raw: string): Promise<NormalizationResult> {
  const trimmed = raw.trim();
  if (!trimmed || eligList.length === 0) {
    return { canonicalKey: undefined, method: 'gemini', confidence: 0, raw };
  }

  const candidates = getTopEligibilityCandidates(trimmed, 20);
  if (!candidates.length) {
    return { canonicalKey: undefined, method: 'gemini', confidence: 0, raw };
  }

  const prompt = buildEligibilityClassificationPrompt(trimmed, candidates);

  try {
    const text = await generateContent(prompt, 'gemini-2.0-flash-exp');
    const parsed = parseGeminiJSON<GeminiEligibilityClassificationResponse>(text);

    const key = parsed.canonical_key;
    if (!key || key === 'UNKNOWN') {
      return {
        canonicalKey: undefined,
        method: 'gemini',
        confidence: parsed.confidence ?? 0.3,
        raw,
      };
    }

    const exists = eligList.find(e => e.key === key);
    if (!exists) {
      return {
        canonicalKey: undefined,
        method: 'gemini',
        confidence: parsed.confidence ?? 0.2,
        raw,
      };
    }

    return {
      canonicalKey: key,
      method: 'gemini',
      confidence: parsed.confidence ?? 0.8,
      raw,
    };
  } catch (err) {
    console.error('[Test] Gemini eligibility normalization failed:', err);
    return { canonicalKey: undefined, method: 'gemini', confidence: 0, raw };
  }
}

// ---------------------------
// Dispatcher
// ---------------------------

async function normalizeDegree(raw: string): Promise<NormalizationResult> {
  if (MODE === 'dictionary') return normalizeDegree_dictionary(raw);
  if (MODE === 'bge') return await normalizeDegree_bge(raw);
  return await normalizeDegree_gemini(raw);
}

async function normalizeEligibility(raw: string): Promise<NormalizationResult> {
  if (MODE === 'dictionary') return normalizeEligibility_dictionary(raw);
  if (MODE === 'bge') return await normalizeEligibility_bge(raw);
  return await normalizeEligibility_gemini(raw);
}

// ---------------------------
// TEST CASES (edit these for real data)
// ---------------------------

const TEST_DEGREES: string[] = [
  'BS in Information Technology',
  'Bachelor of Science in Accountancy',
  'BSBA Major in Financial Management',
  'Bachelor of Public Administration',
  'BS in Civil Engineering',
];

const TEST_ELIGIBILITIES: string[] = [
  'Career Service Professional',
  'Career Service Professional Eligibility',
  'Career Service Sub-Professional',
  'Registered Nurse',
  'Certified Public Accountant',
];

// ---------------------------
// Run tests
// ---------------------------

(async () => {
  console.log('\n=== DEGREE NORMALIZATION TESTS ===');
  for (const raw of TEST_DEGREES) {
    const result = await normalizeDegree(raw);
    const canonical = result.canonicalKey
      ? degreesList.find(d => d.key === result.canonicalKey)?.canonical
      : undefined;

    console.log('----------------------------------------');
    console.log('Raw degree       :', raw);
    console.log('Canonical key    :', result.canonicalKey ?? '(none)');
    console.log('Canonical name   :', canonical ?? '(none)');
    console.log('Method           :', result.method);
    console.log('Confidence       :', result.confidence.toFixed(3));
  }

  console.log('\n=== ELIGIBILITY NORMALIZATION TESTS ===');
  for (const raw of TEST_ELIGIBILITIES) {
    const result = await normalizeEligibility(raw);
    const canonical = result.canonicalKey
      ? eligList.find(e => e.key === result.canonicalKey)?.canonical
      : undefined;

    console.log('----------------------------------------');
    console.log('Raw eligibility  :', raw);
    console.log('Canonical key    :', result.canonicalKey ?? '(none)');
    console.log('Canonical name   :', canonical ?? '(none)');
    console.log('Method           :', result.method);
    console.log('Confidence       :', result.confidence.toFixed(3));
  }

  console.log('\n✅ Done.\n');
})();
