/**
 * Three Mathematically-Justified Scoring Algorithms for PDS Matching
 *
 * Algorithm 1: Weighted Sum Scoring (Primary) - Linear combination with normalized weights
 * Algorithm 2: Skill-Experience Composite (Secondary) - Exponential decay weighting
 * Algorithm 3: Eligibility-Education Tie-breaker - Boolean matching with priority
 *
 * References:
 * - Weighted Sum Model: Fishburn, P. C. (1967). "Additive Utilities with Incomplete Product Set"
 * - Exponential Weighting: Kahneman & Tversky (1979). "Prospect Theory"
 * - Boolean Matching: Gale-Shapley Algorithm for stable matching
 */

import { getSkillEmbedding, semanticSimilarityPercent } from '../semantic/sbertSkills';

export interface JobRequirements {
  title?: string; // Job title for relevance matching
  description?: string; // Job description for context
  degreeRequirement: string;
  eligibilities: string[];
  skills: string[];
  yearsOfExperience: number;

  // NEW (optional) – populated by normalization.ts if available
  degreeLevel?: string;        // e.g. "bachelor", "master"
  degreeFieldGroup?: string;   // e.g. "accounting_finance"
}

export interface ApplicantData {
  highestEducationalAttainment: string;
  eligibilities: Array<{ eligibilityTitle: string }>;
  skills: string[];
  totalYearsExperience: number;
  workExperienceTitles?: string[]; // Job titles from work history for relevance matching

  // NEW (optional)
  degreeLevel?: string;
  degreeFieldGroup?: string;
}

export interface ScoreBreakdown {
  educationScore: number;
  experienceScore: number;
  skillsScore: number;
  eligibilityScore: number;
  totalScore: number;
  algorithmUsed: string;
  reasoning: string;
  matchedSkillsCount: number; // Number of job skills matched by applicant
  matchedEligibilitiesCount: number; // Number of job eligibilities matched by applicant
}

function isNoRequirementText(raw?: string | null): boolean {
  if (raw === undefined || raw === null) return true;

  const lower = raw.toLowerCase().trim();
  if (!lower) return true; // empty string

  // Exact “no requirement” forms we want to treat as neutral
  if (lower === 'none') return true;
  if (lower === 'not required') return true;
  if (lower === 'no degree required') return true;
  if (lower === 'no eligibility required') return true;
  if (lower === 'no eligibilities required') return true;
  if (lower === 'no skills required') return true;
  if (lower === 'no specific skills required') return true;

  return false;
}

/**
 * Helper function to normalize skill strings into tokens
 * Removes punctuation, splits by whitespace, filters short/common words
 */
function normalizeSkill(skill: string): string[] {
  return skill
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(token => token.length > 2 && !['the', 'and', 'for', 'with'].includes(token));
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy string matching in education and eligibility scoring
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate string similarity percentage (0-100)
 * Uses Levenshtein distance for fuzzy matching
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return Math.max(0, Math.min(100, similarity));
}

/**
 * Map raw similarity (0–100) to a stricter eligibility score (0–100).
 * (Kept for potential future use; current eligibility scoring uses discrete logic.)
 */
function mapEligibilitySimilarity(similarity: number): number {
  const s = Math.max(0, Math.min(100, similarity));

  if (s >= 99) {
    return 100;
  }
  if (s >= 95) {
    return 70;
  }
  if (s >= 90) {
    return 50;
  }
  if (s >= 80) {
    return 30;
  }
  return 0;
}

/**
 * Clean degree requirement string by removing contaminating text
 * Removes eligibilities, skills, or experience text that was mistakenly appended
 */
function cleanDegreeRequirement(degreeReq: string): string {
  const cleaned = degreeReq.split(/\s+(Eligibilities|Skills|Experience):/i)[0].trim();
  return cleaned;
}

/**
 * Extract the core field from a degree string (what comes after "in" or "of")
 */
function extractDegreeField(degree: string): string {
  const inMatch = degree.match(/\bin\s+(.+)$/i);
  if (inMatch) return inMatch[1].trim();

  const ofMatch = degree.match(/\bof\s+(.+)$/i);
  if (ofMatch) return ofMatch[1].trim();

  return degree.trim();
}

/**
 * Parse a list expression with optional "and"/"or" and commas into a list of items.
 * Example inputs:
 * - "BS IT, BS IS, or BS CS"  -> ["BS IT", "BS IS", "BS CS"]
 * - "BS IT and BS CS"         -> ["BS IT", "BS CS"]
 */
function parseListExpression(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  const replaced = text
    .replace(/\s+(or|and)\s+/gi, ',')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return replaced;
}

/**
 * Detect whether a text uses AND, OR, or single semantics.
 * Priority: if "and" is present, treat as AND; else if "or" present, OR; else SINGLE.
 */
type ListMode = 'SINGLE' | 'AND' | 'OR';

function detectListMode(raw: string): ListMode {
  const lower = raw.toLowerCase();
  if (/\sand\s/.test(lower)) return 'AND';
  if (/\sor\s/.test(lower)) return 'OR';
  return 'SINGLE';
}

/**
 * Adjust an educationScore based on:
 * - degree level (elementary / secondary / vocational / bachelor / master / doctoral / graduate studies)
 * - relatedness of degree fields ("Accountancy" vs "Business Administration")
 * - optional field groups from degrees.yaml (if provided)
 *
 * NEW: uses smooth blending instead of flat floors (no more fixed 45/60/75 plateaus).
 */
function adjustEducationForLevelAndField(
  baseScore: number,
  jobDegree: string,
  applicantDegree: string,
  jobLevelFromMeta?: string,
  applicantLevelFromMeta?: string,
  jobFieldGroup?: string,
  applicantFieldGroup?: string
): number {
  let educationScore = baseScore;

  const degreeLevels = [
    'elementary',
    'secondary',
    'vocational',
    'bachelor',
    'master',
    'doctoral',
    'graduate studies',
  ];

  const jobLower = jobDegree.toLowerCase();
  const applicantLower = applicantDegree.toLowerCase();

  /**
   * Normalize whatever normalization.ts gives us (levels.yaml / degrees.yaml)
   * into the buckets we care about here.
   */
  const normalizeMetaLevel = (fromMeta?: string): string | undefined => {
    if (!fromMeta) return undefined;
    const v = fromMeta.toLowerCase().trim();

    if (v === 'college') return 'bachelor';
    if (
      v === 'graduate studies' ||
      v === 'graduate-studies' ||
      v === 'graduate_studies'
    ) {
      return 'graduate studies';
    }

    if (degreeLevels.includes(v)) return v;
    return undefined;
  };

  // Prefer explicit degreeLevel from YAML; fall back to substring detection
  const resolveLevel = (fromMeta: string | undefined, text: string): string | undefined => {
    const meta = normalizeMetaLevel(fromMeta);
    if (meta) return meta;

    const lower = text.toLowerCase();

    if (lower.includes('elementary') || lower.includes('primary')) {
      return 'elementary';
    }
    if (
      lower.includes('high school') ||
      lower.includes('secondary') ||
      lower.includes('senior high') ||
      lower.includes('junior high')
    ) {
      return 'secondary';
    }
    if (
      lower.includes('vocational') ||
      lower.includes('tech-voc') ||
      lower.includes('tvet') ||
      lower.includes('tesda')
    ) {
      return 'vocational';
    }
    if (
      lower.includes('bachelor') ||
      lower.includes('college') ||
      lower.includes('b.s.') ||
      lower.includes('bs ')
    ) {
      return 'bachelor';
    }
    if (lower.includes('master')) {
      return 'master';
    }
    if (lower.includes('doctor') || lower.includes('phd') || lower.includes('ph.d')) {
      return 'doctoral';
    }
    if (
      lower.includes('graduate studies') ||
      lower.includes('postgraduate') ||
      lower.includes('post-graduate')
    ) {
      return 'graduate studies';
    }

    return undefined;
  };

  const jobLevel = resolveLevel(jobLevelFromMeta, jobLower);
  const applicantLevel = resolveLevel(applicantLevelFromMeta, applicantLower);

  // 1) Same-level handling: smoothly blend field similarity with baseScore
  if (jobLevel && applicantLevel && jobLevel === applicantLevel) {
    const jobOptions = parseListExpression(jobDegree);
    const applicantOptions = parseListExpression(applicantDegree);

    let fieldSim = 0;

    if (jobOptions.length > 0 || applicantOptions.length > 0) {
      const jobList = jobOptions.length ? jobOptions : [jobDegree];
      const appList = applicantOptions.length ? applicantOptions : [applicantDegree];

      for (const jd of jobList) {
        const jobField = extractDegreeField(jd).toLowerCase();
        for (const ad of appList) {
          const appField = extractDegreeField(ad).toLowerCase();
          const sim = stringSimilarity(jobField, appField);
          if (sim > fieldSim) fieldSim = sim;
        }
      }
    } else {
      const jobField = extractDegreeField(jobDegree).toLowerCase();
      const applicantField = extractDegreeField(applicantDegree).toLowerCase();
      fieldSim = stringSimilarity(jobField, applicantField);
    }

    if (fieldSim > 0) {
      // Blend baseScore and fieldSim instead of snapping to 45/60/75
      const blended = 0.6 * educationScore + 0.4 * fieldSim;
      educationScore = blended;

      // If fields are clearly unrelated (<40), apply a smooth penalty
      if (fieldSim < 40) {
        const penalty = (40 - fieldSim) * 0.25; // max -10 when fieldSim = 0
        educationScore = Math.max(educationScore - penalty, 0);
      }
    }
  }

  // 2) Level difference: higher level gets smooth bonus, lower level gets smooth penalty
  if (jobLevel && applicantLevel) {
    const jobIdx = degreeLevels.indexOf(jobLevel);
    const appIdx = degreeLevels.indexOf(applicantLevel);

    if (jobIdx >= 0 && appIdx >= 0) {
      if (appIdx > jobIdx) {
        // Applicant higher level than required → small per-level bonus
        const delta = Math.min(appIdx - jobIdx, 3); // cap at 3 levels
        educationScore += delta * 4; // up to +12
      } else if (appIdx < jobIdx) {
        // Applicant lower level → stronger per-level penalty
        const delta = Math.min(jobIdx - appIdx, 3);
        educationScore -= delta * 6; // up to -18
      }
    }
  }

  // 3) Optional: fieldGroup-based strong relatedness (if YAML provides it)
  if (jobFieldGroup && applicantFieldGroup) {
    if (jobFieldGroup === applicantFieldGroup) {
      // Explicitly marked as same field group in YAML → strong match
      educationScore = Math.max(educationScore, 70);
      educationScore += 5; // small bump
    }
  }

  // 4) Clamp and gentle global minimum if we had any match at all
  if (baseScore > 0) {
    educationScore = Math.max(educationScore, 20);
  }

  educationScore = Math.max(0, Math.min(100, educationScore));
  return educationScore;
}

/**
 * DEGREE MATCHING with support for:
 * - Single degree
 * - "BS IT or BS IS or BS CS" (OR → any acceptable, pick best match)
 * - "BS IT, BS IS, and BS CS" (AND → require all, score = hits / required * 100)
 *
 * Applicants can also have multiple degrees encoded in their string:
 * e.g., "BS IT and BS IS" or "BS IT, BS CS".
 */
function matchDegreeRequirement(jobDegree: string, applicantDegree: string): number {
  const cleanedJobDegree = cleanDegreeRequirement(jobDegree);
  const jobMode = detectListMode(cleanedJobDegree);
  const jobDegrees = parseListExpression(cleanedJobDegree);

  // Applicant can also have multiple degrees encoded with commas/and/or
  const applicantDegrees = parseListExpression(applicantDegree);

  if (!jobDegrees.length || !applicantDegrees.length) return 0;

  // Helper: similarity between two degree options using core field
  const degreeOptionSimilarity = (jobOpt: string, applicantOpt: string): number => {
    const jobField = extractDegreeField(jobOpt);
    const applicantField = extractDegreeField(applicantOpt);
    const similarity = stringSimilarity(jobField, applicantField);

    if (similarity >= 85) {
      return 100;
    }

    return similarity;
  };

  // OR semantics: any of the job degrees is acceptable; take the best match
  if (jobMode === 'OR') {
    let best = 0;

    for (const jd of jobDegrees) {
      for (const ad of applicantDegrees) {
        const sim = degreeOptionSimilarity(jd, ad);
        best = Math.max(best, sim);
      }
    }

    return best;
  }

  // AND semantics: all degrees required.
  // Scoring rule: score = (hits / required) * 100, where a "hit" means
  // at least one applicant degree is strongly related to that required degree.
  if (jobMode === 'AND') {
    const required = jobDegrees.length;
    let hits = 0;

    for (const jd of jobDegrees) {
      let bestForThisRequirement = 0;

      for (const ad of applicantDegrees) {
        const sim = degreeOptionSimilarity(jd, ad);
        bestForThisRequirement = Math.max(bestForThisRequirement, sim);
      }

      if (bestForThisRequirement >= 85) {
        hits++;
      }
    }

    if (required === 0) return 0;
    return (hits / required) * 100;
  }

  // SINGLE semantic: original behavior, but consider applicant-side multiple degrees
  let best = 0;
  const cleanedSingleJob = cleanDegreeRequirement(jobDegree);

  for (const ad of applicantDegrees) {
    const sim = stringSimilarity(cleanedSingleJob, ad);
    best = Math.max(best, sim);
  }

  return best;
}

/**
 * Evaluate whether an AND-style degree requirement is fully satisfied.
 *
 * - If jobDegreeRaw is not AND → isAnd = false (we don't interfere).
 * - If it is AND:
 *    - hits = number of required degrees that have a strong match (≥85)
 *    - required = total required degrees in the AND expression
 *    - allHit = (hits === required)
 */
function evaluateDegreeAndGate(
  jobDegreeRaw: string,
  applicantDegreeRaw: string
): { isAnd: boolean; allHit: boolean; hits: number; required: number } {
  const cleanedJob = cleanDegreeRequirement(jobDegreeRaw).toLowerCase().trim();
  const jobMode = detectListMode(cleanedJob);

  if (jobMode !== 'AND') {
    return { isAnd: false, allHit: true, hits: 0, required: 0 };
  }

  const jobDegrees = parseListExpression(cleanedJob);
  const applicantDegrees = parseListExpression(applicantDegreeRaw.toLowerCase().trim());
  const required = jobDegrees.length;

  if (!required || !applicantDegrees.length) {
    return { isAnd: true, allHit: false, hits: 0, required };
  }

  const degreeOptionSimilarity = (jobOpt: string, applicantOpt: string): number => {
    const jobField = extractDegreeField(jobOpt);
    const applicantField = extractDegreeField(applicantOpt);
    return stringSimilarity(jobField, applicantField);
  };

  let hits = 0;

  for (const jd of jobDegrees) {
    let bestForThisRequirement = 0;

    for (const ad of applicantDegrees) {
      const sim = degreeOptionSimilarity(jd, ad);
      if (sim > bestForThisRequirement) {
        bestForThisRequirement = sim;
      }
    }

    if (bestForThisRequirement >= 85) {
      hits++;
    }
  }

  return {
    isAnd: true,
    allHit: hits === required,
    hits,
    required,
  };
}

/**
 * ELIGIBILITY MATCHING helper with strict AND/OR semantics and hard 0/100 scoring.
 *
 * Job eligibilities are interpreted as:
 * - Each STRING in job.eligibilities = one requirement line.
 * - Inside a line:
 *    - "A, B, or C"  → OR group: group is satisfied if the applicant has ANY of A/B/C.
 *    - "A, B, and C" → AND group: group is satisfied only if the applicant has ALL of A/B/C.
 *    - No "and"/"or" → single required eligibility.
 *
 * Across lines:
 * - All requirement lines must be satisfied → overall score = 100.
 * - If ANY requirement line is not satisfied → overall score = 0.
 *
 * Special case:
 * - If there are no true requirements, or a line includes "none" / "not required",
 *   we return a neutral score of 50.
 */
function computeEligibilityMatch(
  jobEligibilitiesRaw: string[],
  applicantEligibilitiesRaw: string[]
): { score: number; matchedCount: number } {
  const jobLines = jobEligibilitiesRaw
    .map(e => e.trim())
    .filter(Boolean);

  const applicantEligibilities = applicantEligibilitiesRaw
    .map(e => e.trim())
    .filter(Boolean);

  let matchedEligibilitiesCount = 0;

  if (
    jobLines.length === 0 ||
    jobLines.some(e => isNoRequirementText(e))
  ) {
    return {
      score: 50,
      matchedCount: 0,
    };
  }

  const hasTokenMatch = (token: string): boolean => {
    const tokenNorm = token.toLowerCase().trim();
    if (!tokenNorm) return false;

    for (const a of applicantEligibilities) {
      const aNorm = a.toLowerCase().trim();
      if (!aNorm) continue;

      if (aNorm === tokenNorm) return true;

      const sim = stringSimilarity(tokenNorm, aNorm);
      if (sim >= 92) {
        return true;
      }
    }

    return false;
  };

  const groupSatisfiedFlags: boolean[] = [];

  for (const rawReq of jobLines) {
    const lowerReq = rawReq.toLowerCase().trim();
    if (!lowerReq) continue;

    const mode = detectListMode(lowerReq);
    let tokens = parseListExpression(lowerReq);
    tokens = tokens.map(t => t.trim()).filter(Boolean);

    if (mode === 'SINGLE') {
      const hit = hasTokenMatch(lowerReq);
      if (hit) matchedEligibilitiesCount += 1;
      groupSatisfiedFlags.push(hit);
      continue;
    }

    if (tokens.length === 0) {
      continue;
    }

    if (mode === 'OR') {
      let localHits = 0;
      for (const token of tokens) {
        if (hasTokenMatch(token)) {
          localHits++;
        }
      }
      const groupHit = localHits > 0;
      if (localHits > 0) {
        matchedEligibilitiesCount += localHits;
      }
      groupSatisfiedFlags.push(groupHit);
    } else if (mode === 'AND') {
      let allHit = true;
      let localHits = 0;

      for (const token of tokens) {
        if (hasTokenMatch(token)) {
          localHits++;
        } else {
          allHit = false;
        }
      }

      if (localHits > 0) {
        matchedEligibilitiesCount += localHits;
      }
      groupSatisfiedFlags.push(allHit);
    }
  }

  if (groupSatisfiedFlags.length === 0) {
    return {
      score: 50,
      matchedCount: matchedEligibilitiesCount,
    };
  }

  const allGroupsSatisfied = groupSatisfiedFlags.every(Boolean);
  const eligibilityScore = allGroupsSatisfied ? 100 : 0;

  return {
    score: eligibilityScore,
    matchedCount: matchedEligibilitiesCount,
  };
}

/**
 * Calculate skill match score using weighted matching
 * AND ensure:
 * - Duplicate skills (job or applicant) do NOT affect the score
 * - One applicant skill can only fully "satisfy" one job skill
 *
 * NEW: Uses a **continuous** mapping (no more flat 30/50/80/100 bands).
 * We still:
 * - Ignore very weak matches (< ~55 similarity)
 * - Use SBERT conservatively to boost obvious semantic matches
 */
async function calculateSkillMatch(
  jobSkills: string[],
  applicantSkills: string[]
): Promise<{ score: number; matchedCount: number }> {
  // DEFENSIVE: Ensure arrays and filter non-strings
  const safeJobSkills = Array.isArray(jobSkills)
    ? jobSkills.filter(s => typeof s === 'string' && s.trim())
    : [];
  const safeApplicantSkills = Array.isArray(applicantSkills)
    ? applicantSkills.filter(s => typeof s === 'string' && s.trim())
    : [];

  const jobMap = new Map<string, string>();
  for (const s of safeJobSkills) {
    const key = s.toLowerCase().trim();
    if (!key) continue;
    if (!jobMap.has(key)) jobMap.set(key, s);
  }

  // Start from unique job skills
  let uniqueJobSkills = Array.from(jobMap.values());

  // Treat explicit textual “no skill requirement” as NO requirements → neutral 50
  uniqueJobSkills = uniqueJobSkills.filter(s => {
    const lower = s.toLowerCase().trim();
    if (!lower) return false;

    if (lower === 'none') return false;
    if (lower === 'not required') return false;
    if (lower === 'no skills required') return false;
    if (lower === 'no specific skills required') return false;

    return true;
  });

  const applicantMap = new Map<string, string>();
  for (const s of safeApplicantSkills) {
    const key = s.toLowerCase().trim();
    if (!key) continue;
    if (!applicantMap.has(key)) applicantMap.set(key, s);
  }
  const uniqueApplicantSkills = Array.from(applicantMap.values());

  if (uniqueJobSkills.length === 0) return { score: 50, matchedCount: 0 };
  if (uniqueApplicantSkills.length === 0) return { score: 0, matchedCount: 0 };

  const jobEmbeddingEntries = await Promise.all(
    uniqueJobSkills.map(async skill => [skill, await getSkillEmbedding(skill)] as const)
  );
  const applicantEmbeddingEntries = await Promise.all(
    uniqueApplicantSkills.map(async skill => [skill, await getSkillEmbedding(skill)] as const)
  );

  const jobEmbeddings = new Map<string, number[]>(jobEmbeddingEntries);
  const applicantEmbeddings = new Map<string, number[]>(applicantEmbeddingEntries);

  /**
   * NEW continuous scoring:
   * - combined ∈ [0,100]
   * - below 55 → treated as 0 (too weak)
   * - 55..100 → smoothly mapped to 0..100
   */
  function scorePair(jobSkill: string, appSkill: string): { rawCombined: number; bandScore: number } {
    const jobEmbedding = jobEmbeddings.get(jobSkill) ?? [];
    const appEmbedding = applicantEmbeddings.get(appSkill) ?? [];

    const textSim = stringSimilarity(jobSkill, appSkill); // 0–100

    let tokenMatchScore = 0;
    if (textSim < 85) {
      const jobTokens = normalizeSkill(jobSkill);
      const appTokens = normalizeSkill(appSkill);
      const commonTokens = jobTokens.filter(token => appTokens.includes(token));

      if (commonTokens.length > 0 && jobTokens.length > 0) {
        tokenMatchScore = (commonTokens.length / jobTokens.length) * 30;
      }
    }

    let sbertSim = 0;
    if (jobEmbedding.length && appEmbedding.length) {
      sbertSim = semanticSimilarityPercent(jobEmbedding, appEmbedding);
    }

    let combined = textSim;

    combined = Math.max(combined, tokenMatchScore);

    if (sbertSim >= 65) {
      combined = Math.max(combined, sbertSim * 0.85);
    }

    if (textSim >= 95) {
      combined = 100;
    }

    const clipped = Math.max(0, Math.min(100, combined));

    let bandScore: number;
    if (clipped < 55) {
      bandScore = 0;
    } else {
      // Map 55..100 → 0..100 linearly for continuous scoring
      bandScore = ((clipped - 55) / 45) * 100;
    }

    return { rawCombined: clipped, bandScore };
  }

  let totalScore = 0;
  let matchedCount = 0;
  const maxScore = uniqueJobSkills.length * 100;
  const usedApplicantSkills = new Set<string>();

  for (const jobSkill of uniqueJobSkills) {
    let bestApp: string | null = null;
    let bestBand = 0;

    for (const appSkill of uniqueApplicantSkills) {
      if (usedApplicantSkills.has(appSkill)) continue;

      const { bandScore } = scorePair(jobSkill, appSkill);

      if (bandScore > bestBand) {
        bestBand = bandScore;
        bestApp = appSkill;
      }
    }

    if (bestApp && bestBand > 0) {
      usedApplicantSkills.add(bestApp);
      totalScore += bestBand;

      // count as matched skill if reasonably strong (bandScore >= 50)
      if (bestBand >= 50) {
        matchedCount++;
      }
    }
  }

  const baseScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  const bonusSkills = Math.max(0, uniqueApplicantSkills.length - uniqueJobSkills.length);
  const bonus = Math.min(bonusSkills * 1, 5);

  const finalScore = Math.min(baseScore + bonus, 100);

  return {
    score: finalScore,
    matchedCount,
  };
}

/**
 * Continuous years-of-experience scoring helper
 *
 * - 0 years → 0
 * - 0 < ratio < 1 → smoothly 40..80 (under-qualified but has experience)
 * - ratio >= 1 → smoothly 80..100 (meeting or exceeding)
 */
function computeYearsScore(requiredYearsRaw: number, applicantYearsRaw: number): number {
  const requiredYears = requiredYearsRaw && requiredYearsRaw > 0 ? requiredYearsRaw : 1;
  const applicantYears = Math.max(0, applicantYearsRaw || 0);

  if (applicantYears === 0) return 0;

  const ratio = applicantYears / requiredYears;

  if (ratio < 1) {
    // Under the requirement: 0<ratio<1 → 40..80
    return Math.max(0, Math.min(80, 40 + 40 * ratio));
  } else {
    // Meets / exceeds: 1..3x → 80..100 (capped)
    const extraRatio = Math.min(ratio - 1, 2); // cap at +2
    return Math.max(80, Math.min(100, 80 + (extraRatio / 2) * 20));
  }
}

/**
 * ALGORITHM 1: Weighted Sum Scoring Model
 */
export async function algorithm1_WeightedSum(
  job: JobRequirements,
  applicant: ApplicantData
): Promise<ScoreBreakdown> {
  // Education Score
  const jobDegreeRaw = job.degreeRequirement || '';
  const applicantDegreeRaw = applicant.highestEducationalAttainment || '';

  let educationScore: number;

  if (isNoRequirementText(jobDegreeRaw)) {
    // No degree requirement – neutral score so education doesn't unfairly penalize or boost
    educationScore = 50;
  } else {
    const jobDegree = jobDegreeRaw.toLowerCase().trim();
    const applicantDegree = applicantDegreeRaw.toLowerCase().trim();

    educationScore = matchDegreeRequirement(jobDegree, applicantDegree);

    const andInfo = evaluateDegreeAndGate(jobDegreeRaw, applicantDegreeRaw);

    if (andInfo.isAnd && !andInfo.allHit) {
      const originalScore = educationScore;
      educationScore = 0;

      console.log('🔍 [Algorithm 1] Degree AND gate NOT satisfied, forcing educationScore to 0', {
        jobDegreeRaw,
        applicantDegreeRaw,
        hits: andInfo.hits,
        required: andInfo.required,
        originalScore,
      });
    } else {
      const relatedFields: Record<string, string[]> = {
        // ----------------------------
        // IT / IS / CS / E-Gov
        // ----------------------------
        'information technology': [
          'computer science',
          'software engineering',
          'information systems',
          'information system',
          'information management',
          'information and communications technology',
          'information communication technology',
          'information and communication technology',
          'computer engineering',
          'informatics',
          'management information systems',
          'government information systems',
          'e-governance',
          'e-government',
        ],
        'information systems': [
          'information technology',
          'computer science',
          'software engineering',
          'management information systems',
          'information management',
          'information and communications technology',
          'computer engineering',
          'informatics',
        ],
        'computer science': [
          'information technology',
          'software engineering',
          'computer engineering',
          'information systems',
          'informatics',
          'information and communications technology',
        ],
        'computer engineering': [
          'computer science',
          'information technology',
          'electronics engineering',
          'software engineering',
          'information systems',
        ],
        'software engineering': [
          'computer science',
          'information technology',
          'information systems',
          'computer engineering',
        ],
        'informatics': [
          'information technology',
          'computer science',
          'information systems',
          'data science',
        ],

        // ----------------------------
        // Engineering / Planning / Built Environment
        // ----------------------------
        'civil engineering': [
          'architecture',
          'structural engineering',
          'construction management',
          'construction engineering',
          'sanitary engineering',
          'environmental engineering',
          'transportation engineering',
          'highway engineering',
          'water resources engineering',
        ],
        'architecture': [
          'civil engineering',
          'construction management',
          'environmental planning',
          'urban planning',
          'urban and regional planning',
          'landscape architecture',
          'building technology',
        ],
        'environmental planning': [
          'urban planning',
          'urban and regional planning',
          'regional planning',
          'architecture',
          'civil engineering',
          'environmental management',
          'environmental science',
        ],

        // ----------------------------
        // Health / Nursing / Public Health
        // ----------------------------
        'nursing': [
          'midwifery',
          'health sciences',
          'medical technology',
          'medical laboratory science',
          'public health',
          'community health',
          'allied health sciences',
        ],
        'midwifery': [
          'nursing',
          'health sciences',
          'public health',
          'community health',
        ],
        'public health': [
          'nursing',
          'community health',
          'health sciences',
          'medical technology',
        ],

        // ----------------------------
        // Accounting / Finance / Public Finance / Treasury
        // ----------------------------
        'accounting': [
          'accountancy',
          'finance',
          'financial management',
          'business administration',
          'accounting technology',
          'management accounting',
          'banking and finance',
          'public finance',
          'public financial management',
          'fiscal administration',
          'local fiscal administration',
          'treasury management',
          'budget management',
          'public budgeting',
          'internal auditing',
          'audit and internal control',
        ],
        'accountancy': [
          'accounting',
          'financial management',
          'finance',
          'management accounting',
          'public finance',
          'public financial management',
        ],
        'financial management': [
          'accounting',
          'accountancy',
          'business administration',
          'banking and finance',
          'economics',
          'public finance',
        ],
        'public finance': [
          'accounting',
          'accountancy',
          'financial management',
          'fiscal administration',
          'public financial management',
          'treasury management',
          'budget management',
        ],
        'fiscal administration': [
          'public finance',
          'public administration',
          'accounting',
          'accountancy',
          'public budgeting',
        ],

        // ----------------------------
        // Business / Office / HR / Commerce
        // ----------------------------
        'business administration': [
          'management',
          'organizational development',
          'commerce',
          'entrepreneurship',
          'marketing management',
          'financial management',
          'human resource management',
          'office administration',
          'public administration',
          'management accounting',
          'business management',
          'operations management',
          'supply chain management',
        ],
        'commerce': [
          'business administration',
          'accounting',
          'financial management',
          'marketing management',
        ],
        'office administration': [
          'public administration',
          'business administration',
          'secretarial',
          'office management',
          'management',
          'executive assistant',
          'records management',
          'administrative management',
        ],
        'public administration': [
          'office administration',
          'business administration',
          'political science',
          'public management',
          'public governance',
          'local government administration',
          'local governance',
          'public affairs',
          'development studies',
          'community development',
          'fiscal administration',
          'public policy',
        ],
        'public management': [
          'public administration',
          'public governance',
          'public affairs',
          'local governance',
          'development management',
        ],
        'public governance': [
          'public administration',
          'public management',
          'local governance',
          'political science',
        ],
        'human resource management': [
          'human resources management',
          'business administration',
          'psychology',
          'industrial psychology',
          'organizational development',
        ],

        // ----------------------------
        // Local Governance / Dev / Community
        // ----------------------------
        'local government administration': [
          'public administration',
          'local governance',
          'public management',
          'public governance',
          'community development',
          'development management',
        ],
        'local governance': [
          'public administration',
          'local government administration',
          'public governance',
          'community development',
          'development management',
        ],
        'community development': [
          'social work',
          'public administration',
          'local governance',
          'development studies',
          'rural development',
          'community organizing',
        ],
        'development studies': [
          'public administration',
          'community development',
          'rural development',
          'development management',
          'political science',
        ],

        // ----------------------------
        // Social Welfare / Social Work / Psych
        // ----------------------------
        'social work': [
          'social welfare',
          'community development',
          'psychology',
          'sociology',
          'guidance and counseling',
          'human services',
        ],
        'social welfare': [
          'social work',
          'community development',
          'public administration',
          'development studies',
        ],
        'psychology': [
          'industrial psychology',
          'organizational psychology',
          'human resource management',
          'guidance and counseling',
          'social work',
        ],

        // ----------------------------
        // DRRM / Safety / Peace & Order
        // ----------------------------
        'disaster risk reduction and management': [
          'disaster risk reduction management',
          'disaster management',
          'emergency management',
          'emergency and disaster management',
          'civil defense',
          'public safety administration',
          'public safety management',
          'environmental management',
          'community development',
        ],
        'disaster management': [
          'disaster risk reduction and management',
          'emergency management',
          'civil defense',
          'public safety administration',
        ],
        'public safety administration': [
          'public safety management',
          'criminology',
          'industrial security management',
          'disaster risk reduction and management',
          'police administration',
        ],
        'criminology': [
          'criminal justice',
          'public safety administration',
          'industrial security management',
          'forensic science',
        ],

        // ----------------------------
        // Agriculture / Agribusiness / Environment
        // ----------------------------
        'agriculture': [
          'agribusiness',
          'agricultural engineering',
          'agricultural and biosystems engineering',
          'agricultural economics',
          'animal science',
          'crop science',
          'rural development',
          'veterinary medicine',
        ],
        'agribusiness': [
          'agriculture',
          'business administration',
          'commerce',
          'agricultural economics',
        ],
        'environmental science': [
          'environmental management',
          'environmental engineering',
          'environmental planning',
          'natural resources management',
          'forestry',
          'marine biology',
          'biology',
        ],

        // ----------------------------
        // Education (for DepEd / LGU school-based posts)
        // ----------------------------
        'elementary education': [
          'early childhood education',
          'primary education',
          'basic education',
        ],
        'secondary education': [
          'social studies education',
          'mathematics education',
          'science education',
          'english education',
          'mapeh education',
        ],
        'social studies education': [
          'secondary education major in social studies',
          'history',
          'political science',
          'community development',
        ],

        // ----------------------------
        // Records / Library / Info Services
        // ----------------------------
        'library and information science': [
          'library science',
          'information studies',
          'archives and records management',
          'records management',
          'records administration',
        ],
        'records management': [
          'archives and records management',
          'records and archives management',
          'office administration',
          'library and information science',
          'information management',
        ],

        // ----------------------------
        // Hospitality / Tourism (for LGU-run facilities / tourism office)
        // ----------------------------
        'hospitality management': [
          'hotel and restaurant management',
          'hotel management',
          'tourism management',
          'culinary arts',
          'events management',
        ],
        'tourism management': [
          'tourism',
          'hospitality management',
          'hotel and restaurant management',
          'travel management',
          'events management',
          'development communication',
        ],

        // ----------------------------
        // Communication / DevComm (LGU information / PIO)
        // ----------------------------
        'communication': [
          'mass communication',
          'development communication',
          'journalism',
          'public relations',
          'marketing communication',
          'media studies',
        ],
        'development communication': [
          'communication',
          'mass communication',
          'journalism',
          'public relations',
          'community development',
          'social work',
        ],
      };

      for (const [field, related] of Object.entries(relatedFields)) {
        if (jobDegree.includes(field)) {
          for (const relatedField of related) {
            if (applicantDegree.includes(relatedField)) {
              educationScore = Math.max(educationScore, 85);
              break;
            }
          }
        }
      }

      educationScore = adjustEducationForLevelAndField(
        educationScore,
        job.degreeRequirement,
        applicant.highestEducationalAttainment,
        job.degreeLevel,
        applicant.degreeLevel,
        job.degreeFieldGroup,
        applicant.degreeFieldGroup
      );
    }
  }

  // Experience (continuous yearsScore)
  const requiredYears = job.yearsOfExperience || 1;
  const applicantYears = applicant.totalYearsExperience || 0;

  const yearsScore = computeYearsScore(requiredYears, applicantYears);

  let relevanceScore: number;
  if (applicantYears === 0) {
    relevanceScore = 0;
  } else {
    relevanceScore = 100;
  }

  const experienceScore = yearsScore * 0.7 + relevanceScore * 0.3;

  const skillsMatch = await calculateSkillMatch(job.skills, applicant.skills);
  const skillsScore = skillsMatch.score;
  const matchedSkillsCount = skillsMatch.matchedCount;

  const jobEligibilitiesRaw = job.eligibilities;
  const applicantEligibilitiesRaw = applicant.eligibilities
    .filter(e => e && e.eligibilityTitle)
    .map(e => e.eligibilityTitle);

  const eligibilityResult = computeEligibilityMatch(jobEligibilitiesRaw, applicantEligibilitiesRaw);
  const eligibilityScore = eligibilityResult.score;
  const matchedEligibilitiesCount = eligibilityResult.matchedCount;

  console.log('🔍 [Algorithm 1] Eligibility matching:', {
    jobEligibilities: jobEligibilitiesRaw,
    applicantEligibilities: applicantEligibilitiesRaw,
    matchedEligibilitiesCount,
    eligibilityScore,
  });

  const weights = { education: 0.30, experience: 0.20, skills: 0.20, eligibility: 0.30 };
  const totalScore =
    weights.education * educationScore +
    weights.experience * experienceScore +
    weights.skills * skillsScore +
    weights.eligibility * eligibilityScore;

  return {
    educationScore,
    experienceScore,
    skillsScore,
    eligibilityScore,
    totalScore: Math.round(totalScore * 100) / 100,
    algorithmUsed: 'Weighted Sum Model',
    reasoning: `Education (30%): ${educationScore.toFixed(1)}, Experience (20%): ${experienceScore.toFixed(
      1
    )}, Skills (20%): ${skillsScore.toFixed(1)}, Eligibility (30%): ${eligibilityScore.toFixed(1)}`,
    matchedSkillsCount,
    matchedEligibilitiesCount,
  };
}

/**
 * ALGORITHM 2: Skill-Experience Composite Scoring
 */
export async function algorithm2_SkillExperienceComposite(
  job: JobRequirements,
  applicant: ApplicantData
): Promise<ScoreBreakdown> {
  const skillsMatch = await calculateSkillMatch(job.skills, applicant.skills);
  const skillsScore = skillsMatch.score;
  const matchedSkillsCount = skillsMatch.matchedCount;

  const requiredYears = job.yearsOfExperience || 1;
  const applicantYears = applicant.totalYearsExperience || 0;
  const experienceRatio = applicantYears / requiredYears;

  const yearsScore = computeYearsScore(requiredYears, applicantYears);

  let relevanceScore: number;
  if (applicantYears === 0) {
    relevanceScore = 0;
  } else {
    relevanceScore = 100;
  }

  const experienceScore = yearsScore * 0.7 + relevanceScore * 0.3;

  const beta = 0.5;
  const composite =
    (skillsScore * Math.exp(beta * Math.min(experienceRatio, 2))) / Math.exp(beta * 2);

  const jobDegreeRaw = job.degreeRequirement || '';
  const applicantDegreeRaw = applicant.highestEducationalAttainment || '';

  let educationScore: number;

  if (isNoRequirementText(jobDegreeRaw)) {
    educationScore = 50;
  } else {
    const jobDegree = jobDegreeRaw.toLowerCase().trim();
    const applicantDegree = applicantDegreeRaw.toLowerCase().trim();

    educationScore = matchDegreeRequirement(jobDegree, applicantDegree);

    const andInfo = evaluateDegreeAndGate(jobDegreeRaw, applicantDegreeRaw);

    if (andInfo.isAnd && !andInfo.allHit) {
      const originalScore = educationScore;
      educationScore = 0;

      console.log('🔍 [Algorithm 2] Degree AND gate NOT satisfied, forcing educationScore to 0', {
        jobDegreeRaw,
        applicantDegreeRaw,
        hits: andInfo.hits,
        required: andInfo.required,
        originalScore,
      });
    } else {
      educationScore = adjustEducationForLevelAndField(
        educationScore,
        job.degreeRequirement,
        applicant.highestEducationalAttainment,
        job.degreeLevel,
        applicant.degreeLevel,
        job.degreeFieldGroup,
        applicant.degreeFieldGroup
      );
    }
  }

  const jobEligibilitiesRaw = job.eligibilities;
  const applicantEligibilitiesRaw = applicant.eligibilities
    .filter(e => e && e.eligibilityTitle)
    .map(e => e.eligibilityTitle);

  const eligibilityResult = computeEligibilityMatch(jobEligibilitiesRaw, applicantEligibilitiesRaw);
  const eligibilityScore = eligibilityResult.score;
  const matchedEligibilitiesCount = eligibilityResult.matchedCount;

  console.log('🔍 [Algorithm 2] Eligibility matching:', {
    jobEligibilities: jobEligibilitiesRaw,
    applicantEligibilities: applicantEligibilitiesRaw,
    matchedEligibilitiesCount,
    eligibilityScore,
  });

  const totalScore = 0.30 * composite + 0.35 * educationScore + 0.35 * eligibilityScore;

  return {
    educationScore,
    experienceScore,
    skillsScore,
    eligibilityScore,
    totalScore: Math.round(totalScore * 100) / 100,
    algorithmUsed: 'Skill-Experience Composite',
    reasoning: `Skill-Experience Composite (30%): ${composite.toFixed(
      1
    )}, Education (35%): ${educationScore.toFixed(1)}, Eligibility (35%): ${eligibilityScore.toFixed(1)}`,
    matchedSkillsCount,
    matchedEligibilitiesCount,
  };
}

/**
 * ALGORITHM 3: Eligibility-Education Tie-breaker
 */
export async function algorithm3_EligibilityEducationTiebreaker(
  job: JobRequirements,
  applicant: ApplicantData
): Promise<ScoreBreakdown> {
  let totalScore = 0;
  const reasoning: string[] = [];

  const jobEligibilitiesRaw = job.eligibilities;
  const applicantEligibilitiesRaw = applicant.eligibilities
    .filter(e => e && e.eligibilityTitle)
    .map(e => e.eligibilityTitle);

  const eligibilityResult = computeEligibilityMatch(jobEligibilitiesRaw, applicantEligibilitiesRaw);
  const eligibilityScore = eligibilityResult.score;
  const matchedEligibilitiesCount = eligibilityResult.matchedCount;

  let eligibilityContribution: number;
  if (
    jobEligibilitiesRaw.length === 0 ||
    jobEligibilitiesRaw.some(e => isNoRequirementText(e))
  ) {
    // Neutral 50% of the 40-point eligibility weight → 20 points
    eligibilityContribution = 20;
    reasoning.push('No license required (+20)');
  } else {
    eligibilityContribution = (eligibilityScore / 100) * 40;
    reasoning.push(
      `Professional license match: ${eligibilityScore.toFixed(
        1
      )}% (+${eligibilityContribution.toFixed(1)})`
    );
  }

  totalScore += eligibilityContribution;

  console.log('🔍 [Algorithm 3] Eligibility matching:', {
    jobEligibilities: jobEligibilitiesRaw,
    applicantEligibilities: applicantEligibilitiesRaw,
    matchedEligibilitiesCount,
    eligibilityScore,
  });

  const jobDegreeRaw = job.degreeRequirement || '';
  const applicantDegreeRaw = applicant.highestEducationalAttainment || '';

  let educationScore: number;

  if (isNoRequirementText(jobDegreeRaw)) {
    // No degree requirement – neutral contribution
    educationScore = 50;
  } else {
    const jobDegree = jobDegreeRaw.toLowerCase().trim();
    const applicantDegree = applicantDegreeRaw.toLowerCase().trim();

    educationScore = matchDegreeRequirement(jobDegree, applicantDegree);

    const andInfo = evaluateDegreeAndGate(jobDegreeRaw, applicantDegreeRaw);

    if (andInfo.isAnd && !andInfo.allHit) {
      const originalScore = educationScore;
      educationScore = 0;

      console.log('🔍 [Algorithm 3] Degree AND gate NOT satisfied, forcing educationScore to 0', {
        jobDegreeRaw,
        applicantDegreeRaw,
        hits: andInfo.hits,
        required: andInfo.required,
        originalScore,
      });
    } else {
      educationScore = adjustEducationForLevelAndField(
        educationScore,
        job.degreeRequirement,
        applicant.highestEducationalAttainment,
        job.degreeLevel,
        applicant.degreeLevel,
        job.degreeFieldGroup,
        applicant.degreeFieldGroup
      );
    }
  }

  const eduScoreContribution = (educationScore / 100) * 30;
  totalScore += eduScoreContribution;
  reasoning.push(`Degree match: ${educationScore.toFixed(1)}% (+${eduScoreContribution.toFixed(1)})`);

  const requiredYears = job.yearsOfExperience || 1;
  const applicantYears = applicant.totalYearsExperience || 0;

  const yearsScore = computeYearsScore(requiredYears, applicantYears);

  let relevanceScore: number;
  if (applicantYears === 0) {
    relevanceScore = 0;
  } else {
    relevanceScore = 100;
  }

  const experienceScore = yearsScore * 0.7 + relevanceScore * 0.3;

  const excessYears = Math.max(0, applicantYears - requiredYears);
  const experienceBonus = Math.min((experienceScore / 100) * 20, 20);
  totalScore += experienceBonus;
  reasoning.push(
    `Experience: ${experienceScore.toFixed(
      1
    )}%, ${excessYears.toFixed(1)} years over (+${experienceBonus.toFixed(1)})`
  );

  const skillsMatch = await calculateSkillMatch(job.skills, applicant.skills);
  const skillsScore = skillsMatch.score;
  const matchedSkillsCount = skillsMatch.matchedCount;

  const skillBonus = Math.min(matchedSkillsCount * 10, 20);
  totalScore += skillBonus * 0.10; // 10% weight
  reasoning.push(`${matchedSkillsCount} matched skills (+${(skillBonus * 0.10).toFixed(1)})`);

  return {
    educationScore,
    experienceScore,
    skillsScore,
    eligibilityScore,
    totalScore: Math.round(totalScore * 100) / 100,
    algorithmUsed: 'Eligibility-Education Tie-breaker',
    reasoning: reasoning.join('; '),
    matchedSkillsCount,
    matchedEligibilitiesCount,
  };
}

/**
 * Ensemble Method: Combines all three algorithms
 */
export async function ensembleScore(
  job: JobRequirements,
  applicant: ApplicantData
): Promise<ScoreBreakdown> {
  const score1 = await algorithm1_WeightedSum(job, applicant);
  const score2 = await algorithm2_SkillExperienceComposite(job, applicant);

  const scoreDiff = Math.abs(score1.totalScore - score2.totalScore);

  if (scoreDiff <= 5) {
    const score3 = await algorithm3_EligibilityEducationTiebreaker(job, applicant);
    return {
      ...score3,
      algorithmUsed: 'Ensemble (Tie-breaker)',
      reasoning: `Algorithms 1 & 2 within 5% (${score1.totalScore.toFixed(
        1
      )} vs ${score2.totalScore.toFixed(1)}). Tie-breaker: ${score3.reasoning}`,
    };
  }

  const educationScore = score1.educationScore * 0.6 + score2.educationScore * 0.4;
  const experienceScore = score1.experienceScore * 0.6 + score2.experienceScore * 0.4;
  const skillsScore = score1.skillsScore * 0.6 + score2.skillsScore * 0.4;
  const eligibilityScore = score1.eligibilityScore * 0.6 + score2.eligibilityScore * 0.4;
  const totalScore = score1.totalScore * 0.6 + score2.totalScore * 0.4;

  const strengths: string[] = [];
  const gaps: string[] = [];

  if (educationScore >= 80) strengths.push('strong educational background');
  else if (educationScore < 60) gaps.push('education level');

  if (experienceScore >= 80) {
    strengths.push(
      experienceScore === 100 ? 'excellent relevant experience' : 'solid work experience'
    );
  } else if (experienceScore < 60) {
    gaps.push('years of experience');
  }

  if (skillsScore >= 60) strengths.push('good technical skills');
  else if (skillsScore < 40) gaps.push('required skills');

  if (eligibilityScore >= 80) strengths.push('appropriate certifications');
  else if (eligibilityScore < 60) gaps.push('certifications');

  let reasoning = '';
  if (strengths.length > 0) {
    reasoning = `Candidate demonstrates ${strengths.join(', ')}.`;
  }
  if (gaps.length > 0) {
    reasoning += ` ${
      gaps.length > 0 && strengths.length > 0 ? 'Areas for development include' : 'Needs improvement in'
    } ${gaps.join(', ')}.`;
  }
  if (!reasoning) {
    reasoning = 'Candidate evaluated across multiple qualification criteria.';
  }

  return {
    educationScore: Math.round(educationScore * 100) / 100,
    experienceScore: Math.round(experienceScore * 100) / 100,
    skillsScore: Math.round(skillsScore * 100) / 100,
    eligibilityScore: Math.round(eligibilityScore * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    algorithmUsed: 'Multi-Factor Assessment',
    reasoning: reasoning.trim(),
    matchedSkillsCount: score1.matchedSkillsCount,
    matchedEligibilitiesCount: score1.matchedEligibilitiesCount,
  };
}

/**
 * Compare two applicants directly (for debugging/testing)
 */
export async function compareApplicants(
  job: JobRequirements,
  applicant1: ApplicantData,
  applicant2: ApplicantData
): Promise<{
  winner: 'applicant1' | 'applicant2' | 'tie';
  applicant1Score: ScoreBreakdown;
  applicant2Score: ScoreBreakdown;
  analysis: string;
}> {
  const score1 = await ensembleScore(job, applicant1);
  const score2 = await ensembleScore(job, applicant2);

  const diff = score1.totalScore - score2.totalScore;

  let winner: 'applicant1' | 'applicant2' | 'tie';
  if (Math.abs(diff) < 1) {
    winner = 'tie';
  } else if (diff > 0) {
    winner = 'applicant1';
  } else {
    winner = 'applicant2';
  }

  return {
    winner,
    applicant1Score: score1,
    applicant2Score: score2,
    analysis: `Applicant 1: ${score1.totalScore.toFixed(
      2
    )} vs Applicant 2: ${score2.totalScore.toFixed(2)}. Difference: ${Math.abs(diff).toFixed(
      2
    )} points.`,
  };
}

// 🔍 Export internal helper for tests
export { computeEligibilityMatch };
