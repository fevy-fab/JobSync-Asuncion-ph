/**
 * Shared text-matching utilities
 *
 * This mirrors the logic in scoringAlgorithms.ts:
 * - normalizeSkill
 * - levenshteinDistance
 * - stringSimilarity
 * - calculateSkillMatch's "is this skill matched?" rule (bestMatch >= 30)
 *
 * NOTE: This file is frontend-safe (no fs/path/etc).
 * It does NOT change backend behavior; it only helps the UI
 * reflect the same matching logic.
 */

/**
 * Normalize a skill string into tokens.
 * Same behavior as scoringAlgorithms.ts:
 * - lowercase
 * - remove punctuation
 * - split by whitespace
 * - remove very short/common words
 */
export function normalizeSkill(skill: string): string[] {
  return skill
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(
      (token) =>
        token.length > 2 &&
        !['the', 'and', 'for', 'with'].includes(token)
    );
}

/**
 * Levenshtein distance (edit distance) between two strings.
 * Copied to align with backend scoringAlgorithms.ts.
 */
export function levenshteinDistance(str1: string, str2: string): number {
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
 * String similarity percentage (0-100) using Levenshtein.
 * Mirrors backend stringSimilarity in scoringAlgorithms.ts.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return Math.max(0, Math.min(100, similarity));
}

export type SkillMatchType = 'exact' | 'high' | 'medium' | 'token' | 'none';

export interface SkillMatchPair {
  jobSkill: string;
  applicantSkill: string | null;
  similarity: number;      // 0–100
  matchType: SkillMatchType;
}

/**
 * For each required job skill, find the best related applicant skill
 * using the SAME logic style as the backend scoring.
 */
export function getSkillMatchPairs(
  jobSkills: string[],
  applicantSkills: string[]
): SkillMatchPair[] {
  if (!jobSkills?.length) return [];

  return jobSkills.map(jobSkill => {
    const jobTokens = normalizeSkill(jobSkill);

    let bestApplicantSkill: string | null = null;
    let bestSimilarity = 0;
    let bestType: SkillMatchType = 'none';

    for (const appSkill of applicantSkills || []) {
      let similarity = stringSimilarity(jobSkill, appSkill);
      let type: SkillMatchType = 'none';

      if (similarity === 100) {
        type = 'exact';
      } else if (similarity >= 80) {
        type = 'high';
      } else if (similarity >= 50) {
        type = 'medium';
      } else {
        // Token-based partial match
        const appTokens = normalizeSkill(appSkill);
        const commonTokens = jobTokens.filter(t => appTokens.includes(t));

        if (commonTokens.length > 0 && jobTokens.length > 0) {
          const tokenRatio = commonTokens.length / jobTokens.length;
          similarity = tokenRatio * 100;
          type = 'token';
        }
      }

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestType = type;
        bestApplicantSkill = type === 'none' ? null : appSkill;
      }
    }

    return {
      jobSkill,
      applicantSkill: bestApplicantSkill,
      similarity: bestApplicantSkill ? Math.round(bestSimilarity) : 0,
      matchType: bestApplicantSkill ? bestType : 'none',
    };
  });
}

/**
 * Determine whether a single REQUIRED job skill is considered "matched"
 * by the applicant's skill set, using the same thresholds used in
 * calculateSkillMatch():
 *
 * - exact match: 100
 * - high similarity (>= 80): 80
 * - medium similarity (50-80): 50
 * - token-based partial match: up to 30
 *
 * A skill counts as "matched" if bestMatch >= 30.
 */
export function isSkillMatched(
  requiredSkill: string,
  applicantSkills: string[]
): boolean {
  if (!requiredSkill || applicantSkills.length === 0) return false;

  let bestMatch = 0;

  for (const appSkill of applicantSkills) {
    const similarity = stringSimilarity(requiredSkill, appSkill);

    if (similarity === 100) {
      bestMatch = 100;
      break; // can't do better
    } else if (similarity >= 80) {
      bestMatch = Math.max(bestMatch, 80);
    } else if (similarity >= 50) {
      bestMatch = Math.max(bestMatch, 50);
    } else {
      // Token-based partial match (same as backend calculateSkillMatch)
      const jobTokens = normalizeSkill(requiredSkill);
      const appTokens = normalizeSkill(appSkill);
      const commonTokens = jobTokens.filter((t) => appTokens.includes(t));

      if (commonTokens.length > 0) {
        const tokenMatchScore =
          (commonTokens.length / jobTokens.length) * 30;
        bestMatch = Math.max(bestMatch, tokenMatchScore);
      }
    }
  }

  // Same rule as calculateSkillMatch: matched if >= 30 points
  return bestMatch >= 30;
}

/**
 * Convenience helper: count how many job skills are matched,
 * plus per-skill booleans. This is purely for UI display.
 */
export function getSkillMatchSummary(
  jobSkills: string[],
  applicantSkills: string[]
): {
  matchedCount: number;
  perSkillMatches: boolean[];
} {
  if (jobSkills.length === 0 || applicantSkills.length === 0) {
    return {
      matchedCount: 0,
      perSkillMatches: jobSkills.map(() => false),
    };
  }

  const perSkillMatches = jobSkills.map((reqSkill) =>
    isSkillMatched(reqSkill, applicantSkills)
  );

  const matchedCount = perSkillMatches.filter(Boolean).length;

  return { matchedCount, perSkillMatches };
}
