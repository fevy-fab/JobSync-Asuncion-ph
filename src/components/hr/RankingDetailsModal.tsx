'use client';
import React, { useState } from 'react';
import { Modal, Badge } from '@/components/ui';
import {
  Award,
  GraduationCap,
  Briefcase,
  Wrench,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  Trophy,
  BarChart3,
  ArrowRightLeft,
  Clock,
} from 'lucide-react';
import {
  getPercentileText,
  getOrdinalRank,
  getRelativePositionMessage,
} from '@/lib/utils/rankingStatistics';
import { AlgorithmInfoModal } from './AlgorithmInfoModal';
import { getSkillMatchPairs } from '@/lib/utils/textMatching';

/**
 * Calculate string similarity percentage using Levenshtein distance
 * Used for checking OR-condition matches in education requirements
 * @returns Similarity percentage (0-100)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 100;

  // Substring match (high similarity)
  if (s1.includes(s2) || s2.includes(s1)) return 90;

  // Levenshtein distance calculation for fuzzy matching
  const len1 = s1.length;
  const len2 = s2.length;

  // Create matrix for dynamic programming
  const matrix: number[][] = [];

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Fill matrix with edit distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  // Convert edit distance to similarity percentage
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 100;

  const distance = matrix[len1][len2];
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Round experience years to 1 decimal place to eliminate floating-point precision errors
 */
function roundExperience(years: number): number {
  return Math.round(years * 10) / 10;
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

interface Statistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
}

interface TopPerformer {
  name: string;
  rank: number;
  matchScore: number;
  educationScore: number;
  experienceScore: number;
  skillsScore: number;
  eligibilityScore: number;
}

interface AlgorithmDetails {
  algorithm1Score?: number;
  algorithm2Score?: number;
  algorithm3Score?: number;
  ensembleMethod: 'weighted_average' | 'tie_breaker';
  algorithm1Weight?: number;
  algorithm2Weight?: number;
  isTieBreaker: boolean;
  scoreDifference?: number;
}

interface RankingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: {
    name: string;
    jobTitle: string;
    rank: number;
    matchScore: number;
    educationScore: number;
    experienceScore: number;
    skillsScore: number;
    eligibilityScore: number;
    algorithmUsed: string;
    reasoning: string;
    education?: string;
    experience?: number;
    skills?: string[];
    eligibilities?: string[];
    algorithmDetails?: AlgorithmDetails;
    matchedSkillsCount?: number;
    matchedEligibilitiesCount?: number;
    statistics?: {
      matchScore: Statistics;
      educationScore: Statistics;
      experienceScore: Statistics;
      skillsScore: Statistics;
      eligibilityScore: Statistics;
    };
    percentiles?: {
      matchScore: number;
      educationScore: number;
      experienceScore: number;
      skillsScore: number;
      eligibilityScore: number;
    };
    topPerformers?: TopPerformer[];
    totalApplicants?: number;
    hr_notes?: string | null;
    re_routed_from_job_id?: string | null;
    re_routed_to_job_id?: string | null;
    re_routed_at?: string | null;
    re_routing_reason?: string | null;
    status?: string;
  } | null;
  jobRequirements?: {
    degreeRequirement: string;
    eligibilities: string[];
    skills: string[];
    yearsOfExperience: number;
  } | null;
}

const BADGE_TEXT_CLASS = 'text-xs px-3 py-1 rounded-full font-medium';

/**
 * Split degree/eligibility/skills strings for display.
 * Splits on comma, slash, semicolon, "or" and "and".
 */
const splitTokens = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(/,|\/|;| or | and /i)
    .map((v) => v.trim())
    .filter(Boolean);
};

const ScoreBar = ({
  score,
  label,
  icon: Icon,
  color,
}: {
  score: number;
  label: string;
  icon: any;
  color: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="font-medium text-gray-700 text-sm">{label}</span>
      </div>
      <span className={`text-base font-bold ${color}`}>
        {Math.round(score * 10) / 10}%
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          score >= 80
            ? 'bg-green-500'
            : score >= 60
            ? 'bg-yellow-500'
            : score >= 40
            ? 'bg-orange-500'
            : 'bg-red-500'
        }`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  </div>
);

const getRankBadgeVariant = (
  rank: number
): 'success' | 'info' | 'warning' | 'default' => {
  switch (rank) {
    case 1:
      return 'success';
    case 2:
      return 'info';
    case 3:
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * UPDATED: Education verdict aligned with AND/OR logic and stricter degree handling.
 */
const generateEducationVerdict = (
  applicantEducation: string | undefined,
  applicantEducationScore: number,
  jobDegreeRequirement?: string
): string => {
  if (!applicantEducation || !jobDegreeRequirement) {
    return 'Education information is incomplete.';
  }

  const jobRaw = jobDegreeRequirement.trim();
  const lowerJob = jobRaw.toLowerCase();
  const isAndRequirement = /\sand\s/.test(lowerJob);
  const isOrRequirement = /\sor\s/.test(lowerJob);

  const applicantField = extractDegreeField(applicantEducation);

  // AND-style requirement: all listed degrees are required
  if (isAndRequirement) {
    const parts = jobRaw
      .split(/,| and /i)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      // Fallback to score-based verdict
      if (applicantEducationScore >= 80) {
        return 'Applicant degree meets the required degree.';
      }
      if (applicantEducationScore >= 60) {
        return 'Applicant degree is in a closely related field.';
      }
      if (applicantEducationScore >= 40) {
        return 'Applicant degree has the same level but a different specialization.';
      }
      return 'Applicant degree does not meet the required degree.';
    }

    let hitCount = 0;
    for (const part of parts) {
      const requiredField = extractDegreeField(part);
      const similarity = calculateStringSimilarity(requiredField, applicantField);
      if (similarity >= 85) {
        hitCount++;
      }
    }

    if (hitCount === parts.length) {
      return 'Applicant degrees fully satisfy the multi-degree requirement.';
    }
    if (hitCount > 0) {
      return `Applicant degrees match ${hitCount} of ${parts.length} required degrees, but the requirement uses “and”, so all must be satisfied for full credit.`;
    }
    return 'Applicant degrees do not satisfy the full multi-degree requirement.';
  }

  // OR-style requirement: any acceptable degree; pick best match
  const degreeOptions = isOrRequirement
    ? jobDegreeRequirement
        .split(/ or /i)
        .map((opt) => opt.trim())
        .filter(Boolean)
    : [jobDegreeRequirement];

  let matchesOrCondition = false;
  let bestMatchScore = 0;

  if (degreeOptions.length > 1) {
    for (const option of degreeOptions) {
      const requiredField = extractDegreeField(option);
      const similarity = calculateStringSimilarity(requiredField, applicantField);
      bestMatchScore = Math.max(bestMatchScore, similarity);
      if (similarity >= 85) {
        matchesOrCondition = true;
        break;
      }
    }
  } else {
    bestMatchScore = calculateStringSimilarity(
      applicantEducation,
      jobDegreeRequirement
    );
    matchesOrCondition = bestMatchScore >= 85;
  }

  if (matchesOrCondition || applicantEducationScore >= 80) {
    return 'Applicant degree meets the required degree.';
  }
  if (applicantEducationScore >= 60) {
    return 'Applicant degree is in a closely related field.';
  }
  if (applicantEducationScore >= 40) {
    return 'Applicant degree has the same level but a different specialization.';
  }
  return 'Applicant degree does not meet the required degree.';
};

/**
 * UPDATED: Skill summary text aligned with SBERT-based scoring and scoring thresholds.
 */
const describeSkillMatchSummary = (
  skillsScore: number,
  jobSkills: string[],
  skillMatchPairs: any[],
  matchedSkillsCount?: number
): string => {
  const totalRequired = jobSkills.length;

  if (skillMatchPairs.length > 0) {
    const strongMatches = skillMatchPairs.filter(
      (pair) => pair.matchType === 'exact' || pair.matchType === 'high'
    ).length;
    const relatedOnly = skillMatchPairs.filter(
      (pair) => pair.matchType === 'medium' || pair.matchType === 'token'
    ).length;

    if (strongMatches === 0 && relatedOnly === 0) {
      return `No required skills are matched yet out of ${totalRequired} required skills. Skills score is ${skillsScore.toFixed(
        1
      )}%.`;
    }

    if (strongMatches === totalRequired) {
      return `All ${totalRequired} required skills are directly matched. Skills score is ${skillsScore.toFixed(
        1
      )}%.`;
    }

    // handle the case where SBERT/keywords see "related"
    // but the final score is still 0 because of the threshold.
    if (strongMatches === 0 && relatedOnly > 0) {
      if (skillsScore === 0) {
        return `${relatedOnly} skills look related to the requirements (shared keywords/semantics), but they are below the similarity threshold used for scoring, so the skills score remains 0%.`;
      }
      return `${relatedOnly} skills are semantically related to the requirements. The AI model gives partial credit, resulting in a skills score of ${skillsScore.toFixed(
        1
      )}%.`;
    }

    return `Matches ${strongMatches} of ${totalRequired} required skills directly, plus ${relatedOnly} related skills that raise the skills score to ${skillsScore.toFixed(
      1
    )}%.`;
  }

  // Fallback when we don't have detailed pairs
  const matched = matchedSkillsCount ?? 0;
  if (matched === 0 && skillsScore === 0) {
    return `No required skills are matched. Skills score is 0%.`;
  }
  if (matched === 0 && skillsScore > 0) {
    return `No exact matches, but several skills are related to the requirements. AI gives partial credit, so skills score is ${skillsScore.toFixed(
      1
    )}%.`;
  }
  if (matched === totalRequired && totalRequired > 0) {
    return `All ${totalRequired} required skills are matched. Skills score is ${skillsScore.toFixed(
      1
    )}%.`;
  }
  return `Matches ${matched} of ${totalRequired} required skills, with additional partial credit from related skills. Skills score is ${skillsScore.toFixed(
    1
  )}%.`;
};

export function RankingDetailsModal({
  isOpen,
  onClose,
  applicant,
  jobRequirements,
}: RankingDetailsModalProps) {
  const [isAlgorithmInfoOpen, setIsAlgorithmInfoOpen] = useState(false);

  if (!applicant) return null;

  const hasNonZeroSkillsScore = applicant.skillsScore > 0;

  const skillMatchPairs =
    jobRequirements &&
    jobRequirements.skills &&
    jobRequirements.skills.length > 0 &&
    applicant.skills &&
    applicant.skills.length > 0
      ? getSkillMatchPairs(jobRequirements.skills, applicant.skills)
      : [];

  // More compact, non-redundant explanation for the amber "Why This Rank?" box
  const generateRankingExplanation = (): string => {
    if (!jobRequirements) {
      return 'Ranking reflects how the applicant’s education, experience, skills, and eligibilities align with the role.';
    }

    const parts: string[] = [];

    // Experience
    if (applicant.experience !== undefined) {
      const roundedExperience = roundExperience(applicant.experience || 0);
      const requiredYears = jobRequirements.yearsOfExperience;
      const diff = roundExperience((applicant.experience || 0) - requiredYears);

      if (diff > 0) {
        parts.push(
          `Experience – ${roundedExperience} years, about ${diff} ${
            diff === 1 ? 'year' : 'years'
          } above the ${requiredYears}-year requirement.`
        );
      } else if (diff === 0) {
        parts.push(
          `Experience – ${roundedExperience} years, exactly meets the ${requiredYears}-year requirement.`
        );
      } else {
        parts.push(
          `Experience – ${roundedExperience} years, about ${Math.abs(diff)} ${
            Math.abs(diff) === 1 ? 'year' : 'years'
          } below the ${requiredYears}-year requirement.`
        );
      }
    }

    // Skills
    if (applicant.skills && jobRequirements.skills && jobRequirements.skills.length > 0) {
      const matchedSkillsCount = applicant.matchedSkillsCount ?? 0;
      const totalRequired = jobRequirements.skills.length;
      const matchPercentage =
        totalRequired > 0
          ? Math.round((matchedSkillsCount / totalRequired) * 100)
          : 0;

      if (matchedSkillsCount === 0) {
        parts.push(
          `Skills – no required skills directly matched (0 of ${totalRequired}). Any score comes from related or transferable skills detected by AI.`
        );
      } else if (matchedSkillsCount === totalRequired) {
        parts.push(
          `Skills – all ${totalRequired} required skills directly matched (${matchPercentage}% direct match), plus related skills contributing additional points.`
        );
      } else {
        parts.push(
          `Skills – ${matchedSkillsCount} of ${totalRequired} required skills directly matched (${matchPercentage}% direct match), with additional partial credit from related skills.`
        );
      }
    }

    // Education
    if (applicant.education && jobRequirements.degreeRequirement) {
      const verdict = generateEducationVerdict(
        applicant.education,
        applicant.educationScore,
        jobRequirements.degreeRequirement
      );
      parts.push(`Education – ${verdict}`);
    }

    // Eligibility
    if (
      applicant.eligibilities &&
      jobRequirements.eligibilities &&
      jobRequirements.eligibilities.length > 0
    ) {
      const matchedEligibilitiesCount = applicant.matchedEligibilitiesCount ?? 0;
      const total = jobRequirements.eligibilities.length;
      const hasRealRequirement = !jobRequirements.eligibilities.some((e) =>
        /none|not required/i.test(e)
      );

      if (!hasRealRequirement) {
        parts.push('Eligibilities – none specifically required for this role (neutral score).');
      } else if (matchedEligibilitiesCount === 0) {
        parts.push(`Eligibilities – 0 of ${total} required eligibilities matched.`);
      } else if (matchedEligibilitiesCount === total) {
        parts.push(`Eligibilities – all ${total} required eligibilities matched.`);
      } else {
        parts.push(
          `Eligibilities – ${matchedEligibilitiesCount} of ${total} required eligibilities present, but all groups must be satisfied for a full eligibility score.`
        );
      }
    }

    // Overall ranking
    const totalApplicants = applicant.totalApplicants;
    if (totalApplicants) {
      if (applicant.rank === 1) {
        parts.push(
          `Overall – ranked 1st out of ${totalApplicants} applicant(s), with the strongest overall match to the requirements.`
        );
      } else if (applicant.rank <= 3) {
        parts.push(
          `Overall – ranked ${getOrdinalRank(
            applicant.rank
          )} out of ${totalApplicants}, within the top group of candidates.`
        );
      } else {
        parts.push(
          `Overall – ranking reflects a moderate match compared with other applicants for this role.`
        );
      }
    } else {
      parts.push(
        'Overall – ranking reflects the combined effect of all scoring components.'
      );
    }

    return parts.join(' ');
  };

  const generateHighlightBadges = (): {
    label: string;
    icon: any;
    variant: 'success' | 'info' | 'warning';
  }[] => {
    const badges: {
      label: string;
      icon: any;
      variant: 'success' | 'info' | 'warning';
    }[] = [];

    if (applicant.topPerformers && applicant.topPerformers.length > 0) {
      const topExperience = Math.max(
        ...applicant.topPerformers.map((p) => p.experienceScore)
      );
      if (
        applicant.experienceScore >= topExperience &&
        applicant.experienceScore >= 90
      ) {
        badges.push({
          label: '⭐ Top Experience',
          icon: Briefcase,
          variant: 'success',
        });
      }
    }

    if (applicant.educationScore === 100) {
      badges.push({
        label: '🎓 Education Match',
        icon: GraduationCap,
        variant: 'info',
      });
    }

    if (applicant.topPerformers && applicant.topPerformers.length > 0) {
      const topSkills = Math.max(
        ...applicant.topPerformers.map((p) => p.skillsScore)
      );
      if (applicant.skillsScore >= topSkills && applicant.skillsScore >= 80) {
        badges.push({
          label: '🛠️ Skills Leader',
          icon: Wrench,
          variant: 'warning',
        });
      }
    }

    if (applicant.eligibilityScore === 100) {
      badges.push({
        label: '🏅 Fully Eligible',
        icon: ShieldCheck,
        variant: 'success',
      });
    }

    if (
      applicant.educationScore >= 100 &&
      applicant.experienceScore >= 100 &&
      applicant.skillsScore >= 80 &&
      applicant.eligibilityScore >= 80
    ) {
      badges.push({
        label: '⚡ Exceeds Requirements',
        icon: Star,
        variant: 'success',
      });
    }

    if (applicant.rank === 1 && badges.length === 0) {
      badges.push({
        label: '🏆 Top Ranked',
        icon: Trophy,
        variant: 'success',
      });
    }

    return badges;
  };

  const generateKeyDifferentiator = (): string => {
    if (!applicant.totalApplicants) {
      return getRelativePositionMessage(applicant.rank, 1);
    }

    const totalApplicants = applicant.totalApplicants;

    const tiedCandidates = applicant.topPerformers?.filter(
      (p) => Math.abs(p.matchScore - applicant.matchScore) < 0.1
    );

    if (tiedCandidates && tiedCandidates.length > 1 && applicant.rank > 1) {
      const higherRanked = tiedCandidates.find((p) => p.rank < applicant.rank);
      if (higherRanked && jobRequirements) {
        if (
          applicant.experience &&
          higherRanked.experienceScore === applicant.experienceScore
        ) {
          return `Tied at ${applicant.matchScore.toFixed(
            1
          )}% with other candidates. Ranked ${getOrdinalRank(
            applicant.rank
          )} based on actual years of experience.`;
        }
        return `Tied at ${applicant.matchScore.toFixed(
          1
        )}% with other candidates. Ranking determined by tie-breaking criteria.`;
      }
    }

    if (applicant.rank === 1) {
      if (totalApplicants === 1) {
        return 'Only applicant for this position.';
      }
      if (
        applicant.experience &&
        jobRequirements &&
        applicant.experience > jobRequirements.yearsOfExperience
      ) {
        const excess = roundExperience(
          applicant.experience - jobRequirements.yearsOfExperience
        );
        return `Top-ranked candidate – exceeds experience requirement by ${excess} ${
          excess === 1 ? 'year' : 'years'
        }.`;
      }
      return 'Top-ranked candidate with the highest overall match score.';
    }

    if (
      applicant.rank <= 3 &&
      applicant.topPerformers &&
      applicant.topPerformers.length > 0
    ) {
      const topCandidate = applicant.topPerformers[0];
      const scoreDiff = topCandidate.matchScore - applicant.matchScore;

      if (scoreDiff < 5) {
        return `Ranked ${getOrdinalRank(
          applicant.rank
        )} – very competitive, within ${scoreDiff.toFixed(
          1
        )} points of the top candidate.`;
      }
      return `Ranked ${getOrdinalRank(
        applicant.rank
      )} – ${scoreDiff.toFixed(1)} points below the top candidate.`;
    }

    return getRelativePositionMessage(applicant.rank, totalApplicants);
  };

  const educationVerdictText = jobRequirements
    ? generateEducationVerdict(
        applicant.education,
        applicant.educationScore,
        jobRequirements.degreeRequirement
      )
    : '';

  const applicantEducationBadges = splitTokens(applicant.education);
  const applicantEligibilityBadges =
    applicant.eligibilities?.map((elig: any) =>
      typeof elig === 'string'
        ? elig
        : elig?.eligibilityTitle || elig?.name || 'Unknown'
    ) || [];
  const applicantSkillsBadges = applicant.skills || [];

  const jobDegreeBadges = jobRequirements
    ? splitTokens(jobRequirements.degreeRequirement)
    : [];
  const jobEligibilityBadges =
    jobRequirements?.eligibilities?.flatMap((elig) => splitTokens(elig)) ?? [];
  const jobSkillsBadges = jobRequirements?.skills || [];

  const skillsSummaryText =
    jobRequirements && jobRequirements.skills
      ? describeSkillMatchSummary(
          applicant.skillsScore,
          jobRequirements.skills,
          skillMatchPairs,
          applicant.matchedSkillsCount
        )
      : '';

  // Icons for applicant's Education & Experience in "How This Applicant Matches"
  const educationMatchIcon =
    jobRequirements && applicant.education
      ? applicant.educationScore >= 80
        ? <CheckCircle className="w-3 h-3 text-green-500" />
        : applicant.educationScore >= 40
        ? <AlertCircle className="w-3 h-3 text-yellow-500" />
        : <XCircle className="w-3 h-3 text-red-500" />
      : null;

  const experienceMatchIcon =
    jobRequirements && applicant.experience !== undefined
      ? applicant.experience >= jobRequirements.yearsOfExperience * 1.5
        ? <Star className="w-3 h-3 text-yellow-500" />
        : applicant.experience >= jobRequirements.yearsOfExperience
        ? <CheckCircle className="w-3 h-3 text-green-500" />
        : <XCircle className="w-3 h-3 text-red-500" />
      : null;

  // Overall eligibility match icon for "How This Applicant Matches"
  const matchedEligCount = applicant.matchedEligibilitiesCount ?? 0;
  const totalEligRequired = jobRequirements?.eligibilities?.length ?? 0;
  const eligibilityMatchIcon =
    jobRequirements && totalEligRequired > 0
      ? matchedEligCount === 0
        ? applicant.eligibilityScore > 0
          ? <AlertCircle className="w-3 h-3 text-amber-500" />
          : <XCircle className="w-3 h-3 text-red-500" />
        : matchedEligCount === totalEligRequired
        ? <CheckCircle className="w-3 h-3 text-green-500" />
        : <AlertCircle className="w-3 h-3 text-amber-500" />
      : null;

  const hasRealEligibilityRequirement =
    jobRequirements &&
    jobRequirements.eligibilities &&
    !jobRequirements.eligibilities.some((e) =>
      /none|not required/i.test(e)
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={applicant.name}
      showFooter={false}
    >
      <div className="relative text-sm">
        {/* Applicant header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
          <Badge variant={getRankBadgeVariant(applicant.rank)}>
            Rank #{applicant.rank}
          </Badge>
          <span className="text-gray-400">•</span>
          <p className="text-gray-600 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {applicant.jobTitle}
          </p>
          {applicant.totalApplicants && (
            <span className="text-gray-400 ml-auto text-xs">
              {getOrdinalRank(applicant.rank)} of {applicant.totalApplicants} applicants
            </span>
          )}
        </div>

        {/* Highlight badges */}
        {(() => {
          const badges = generateHighlightBadges();
          if (!badges.length) return null;
          return (
            <div className="flex flex-wrap gap-2 mb-4">
              {badges.map((badge, idx) => (
                <Badge key={idx} variant={badge.variant}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          );
        })()}

        {/* Why this rank callout */}
        <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-purple-900 mb-1 flex items-center gap-2">
                WHY THIS RANK?
              </h3>
              <p className="text-gray-700 leading-relaxed text-sm">
                {generateKeyDifferentiator()}
              </p>
            </div>
          </div>
        </div>

        {/* Overall match score */}
        <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Overall Match Score</p>
                <p className="text-4xl font-bold text-green-600">
                  {applicant.matchScore.toFixed(1)}%
                </p>
              </div>
            </div>
            <Award className="w-16 h-16 text-green-200" />
          </div>
        </div>

        {/* Why this rank – explanation */}
        {jobRequirements && (
          <div className="mb-6 p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border-2 border-amber-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Why This Rank?
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm">
              {generateRankingExplanation()}
            </p>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#22A555]" />
            Score Breakdown
          </h3>

          {/* Education */}
          <ScoreBar
            score={applicant.educationScore}
            label="Education"
            icon={GraduationCap}
            color="text-blue-600"
          />
          <div className="ml-7 -mt-1 space-y-1">
            {applicantEducationBadges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {applicantEducationBadges.map((deg, idx) => (
                  <Badge key={idx} variant="default" className={BADGE_TEXT_CLASS}>
                    {deg}
                  </Badge>
                ))}
              </div>
            )}
            {jobRequirements && applicant.education && (
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <span>{educationVerdictText}</span>
                {applicant.educationScore >= 80 ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : applicant.educationScore >= 40 ? (
                  <AlertCircle className="w-3 h-3 text-yellow-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
              </p>
            )}
          </div>

          {/* Experience */}
          <ScoreBar
            score={applicant.experienceScore}
            label="Experience"
            icon={Briefcase}
            color="text-purple-600"
          />
          {applicant.experience !== undefined && (
            <div className="ml-7 -mt-1 space-y-1">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className={BADGE_TEXT_CLASS}>
                  {roundExperience(applicant.experience)} years total experience
                </Badge>
              </div>
              {jobRequirements && (
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  {(() => {
                    const diff = roundExperience(
                      (applicant.experience || 0) - jobRequirements.yearsOfExperience
                    );
                    if (diff > 0) {
                      return (
                        <>
                          <span>
                            Above minimum requirement by {diff}{' '}
                            {diff === 1 ? 'year' : 'years'}.
                          </span>
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        </>
                      );
                    }
                    if (diff === 0) {
                      return (
                        <>
                          <span>Exactly meets the required years of experience.</span>
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        </>
                      );
                    }
                    return (
                      <>
                        <span>
                          {Math.abs(diff)} {Math.abs(diff) === 1 ? 'year' : 'years'} below
                          the minimum requirement.
                        </span>
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      </>
                    );
                  })()}
                </p>
              )}
              {applicant.percentiles && applicant.totalApplicants && (
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {getPercentileText(
                    applicant.percentiles.experienceScore,
                    applicant.totalApplicants
                  )}
                </p>
              )}
            </div>
          )}

          {/* Skills */}
          <ScoreBar
            score={applicant.skillsScore}
            label="Skills"
            icon={Wrench}
            color="text-orange-600"
          />
          {applicantSkillsBadges.length > 0 && (
            <div className="ml-7 -mt-1 space-y-1">
              <div className="flex flex-wrap gap-2">
                {applicantSkillsBadges.slice(0, 5).map((skill, idx) => (
                  <Badge key={idx} variant="default" className={BADGE_TEXT_CLASS}>
                    {skill}
                  </Badge>
                ))}
                {applicantSkillsBadges.length > 5 && (
                  <Badge variant="default" className={BADGE_TEXT_CLASS}>
                    +{applicantSkillsBadges.length - 5} more
                  </Badge>
                )}
              </div>
              {jobRequirements && (
                <p className="text-xs text-gray-600">
                  {skillsSummaryText}{' '}
                  Note: the skills score uses an AI semantic similarity model (SBERT),
                  so related skills that pass a minimum similarity threshold can earn
                  partial points. If the similarity is too weak, they are shown as
                  “related” but still score 0%.
                </p>
              )}
              {applicant.percentiles && applicant.totalApplicants && (
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {getPercentileText(
                    applicant.percentiles.skillsScore,
                    applicant.totalApplicants
                  )}
                </p>
              )}
            </div>
          )}

          {/* Eligibility */}
          <ScoreBar
            score={applicant.eligibilityScore}
            label="Eligibility"
            icon={ShieldCheck}
            color="text-green-600"
          />
          {applicantEligibilityBadges.length > 0 && (
            <div className="ml-7 -mt-1 space-y-1">
              <div className="flex flex-wrap gap-2">
                {applicantEligibilityBadges.map((elig, idx) => (
                  <Badge key={idx} variant="success" className={BADGE_TEXT_CLASS}>
                    {elig}
                  </Badge>
                ))}
              </div>
              {jobRequirements && jobRequirements.eligibilities.length > 0 && (
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  {(() => {
                    const matched = applicant.matchedEligibilitiesCount ?? 0;
                    const totalLines = jobRequirements.eligibilities.length;
                    const neutralCase = jobRequirements.eligibilities.some((e) =>
                      /none|not required/i.test(e)
                    );

                    if (neutralCase) {
                      return (
                        <>
                          <span>
                            No specific eligibility is required for this role. Score is
                            treated as neutral.
                          </span>
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                        </>
                      );
                    }

                    if (matched === 0 && applicant.eligibilityScore === 0) {
                      return (
                        <>
                          <span>
                            No required eligibilities are matched. The eligibility score
                            is 0% because all requirement groups must be satisfied.
                          </span>
                          <XCircle className="w-3 h-3 text-red-500" />
                        </>
                      );
                    }

                    if (applicant.eligibilityScore === 100) {
                      return (
                        <>
                          <span>
                            All eligibility requirement groups are satisfied (full score).
                          </span>
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        </>
                      );
                    }

                    return (
                      <>
                        <span>
                          Applicant has {matched} relevant eligibilities, but at least one
                          requirement group is still incomplete, so the eligibility score
                          remains at 0% until all required groups are met.
                        </span>
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      </>
                    );
                  })()}
                </p>
              )}
              {applicant.percentiles && applicant.totalApplicants && (
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {getPercentileText(
                    applicant.percentiles.eligibilityScore,
                    applicant.totalApplicants
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Job Requirements & How This Applicant Matches */}
        {jobRequirements && (
          <div className="space-y-6 mb-6">
            {/* Job Requirements */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Job Requirements
              </h3>
              <div className="space-y-3">
                {/* Education */}
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      Education Required
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {jobDegreeBadges.map((deg, idx) => (
                        <Badge key={idx} variant="info" className={BADGE_TEXT_CLASS}>
                          {deg}
                        </Badge>
                      ))}
                    </div>
                    {/\sand\s/i.test(jobRequirements.degreeRequirement) && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        Note: this uses an <strong>“and” rule</strong> – all listed
                        degrees are required for full credit.
                      </p>
                    )}
                    {/\sor\s/i.test(jobRequirements.degreeRequirement) &&
                      !/\sand\s/i.test(jobRequirements.degreeRequirement) && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Note: this uses an <strong>“or” rule</strong> – any one of the
                          acceptable degrees is sufficient.
                        </p>
                      )}
                  </div>
                </div>

                {/* Experience */}
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      Experience Required
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="info" className={BADGE_TEXT_CLASS}>
                        {jobRequirements.yearsOfExperience} years minimum
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {jobSkillsBadges.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Wrench className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Skills Required
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {jobSkillsBadges.map((skill, idx) => (
                          <Badge key={idx} variant="info" className={BADGE_TEXT_CLASS}>
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Eligibilities */}
                {jobEligibilityBadges.length > 0 && (
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Eligibilities Required
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {jobEligibilityBadges.map((elig, idx) => (
                          <Badge key={idx} variant="info" className={BADGE_TEXT_CLASS}>
                            {elig}
                          </Badge>
                        ))}
                      </div>
                      {hasRealEligibilityRequirement && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Eligibility scoring is <strong>strict</strong> – every
                          requirement line must be satisfied. Lines with “and” require all
                          listed eligibilities; lines with “or” accept any one.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* How This Applicant Matches */}
            <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                How This Applicant Matches
              </h3>
              <div className="space-y-4">
                {/* Education */}
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <GraduationCap className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-gray-700 mb-1">Education Match</p>
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span className="text-gray-500">Requires:</span>
                      <span className="font-medium text-gray-900">
                        {jobRequirements.degreeRequirement}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-1 mt-1">
                      <span className="text-gray-500">Applicant:</span>
                      <span className="font-medium text-gray-900">
                        {applicant.education || 'Not specified'}
                      </span>
                      {educationMatchIcon && (
                        <span className="ml-1 flex items-center">
                          {educationMatchIcon}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Experience */}
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <Briefcase className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-gray-700 mb-1">Experience Match</p>
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span className="text-gray-500">Requires:</span>
                      <span className="font-medium text-gray-900">
                        {jobRequirements.yearsOfExperience} years
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-1 mt-1">
                      <span className="text-gray-500">Applicant:</span>
                      <span className="font-medium text-gray-900">
                        {applicant.experience !== undefined
                          ? `${roundExperience(applicant.experience)} years`
                          : 'Not specified'}
                      </span>
                      {experienceMatchIcon && (
                        <span className="ml-1 flex items-center">
                          {experienceMatchIcon}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {jobRequirements.skills && jobRequirements.skills.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <Wrench className="w-4 h-4 text-purple-600 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-gray-700 mb-1">Skills Match</p>
                      {skillMatchPairs.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">
                            Each required skill is aligned to the closest skill from this
                            applicant. Exact/very close matches contribute more; related
                            skills contribute partial points via SBERT semantic similarity.
                          </p>
                          <div className="space-y-1 mt-1">
                            {skillMatchPairs.map((pair, idx) => {
                              const hasSkill = pair.matchType !== 'none';
                              const isStrong =
                                pair.matchType === 'exact' ||
                                pair.matchType === 'high';

                              const relationLabel =
                                pair.matchType === 'exact'
                                  ? 'exact match'
                                  : pair.matchType === 'high'
                                  ? 'very close match'
                                  : pair.matchType === 'medium'
                                  ? 'related skill'
                                  : pair.matchType === 'token'
                                  ? 'shares important keywords'
                                  : '';

                              const IconComponent = hasSkill
                                ? isStrong
                                  ? CheckCircle
                                  : AlertCircle
                                : XCircle;

                              const iconClass = hasSkill
                                ? isStrong
                                  ? 'text-green-500'
                                  : 'text-amber-500'
                                : 'text-red-500';

                              return (
                                <div
                                  key={idx}
                                  className="flex flex-wrap items-baseline gap-1"
                                >
                                  <IconComponent
                                    className={`w-3 h-3 ${iconClass}`}
                                  />
                                  <span
                                    className={
                                      hasSkill ? 'text-gray-700' : 'text-gray-500'
                                    }
                                  >
                                    {pair.jobSkill}
                                  </span>
                                  {hasSkill && (
                                    <>
                                      <span className="text-gray-400">→</span>
                                      <span className="text-gray-800">
                                        {pair.applicantSkill}
                                      </span>
                                      {relationLabel && (
                                        <span className="text-[11px] text-gray-500">
                                          ({relationLabel})
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            {hasNonZeroSkillsScore ? (
                              <>
                                Skills score shown above already includes both direct
                                matches and SBERT-based related skills that pass the
                                similarity threshold, so you may see a non-zero score even
                                if there are few exact keyword matches.
                              </>
                            ) : (
                              <>
                                Some skills look loosely related (shared
                                keywords/semantics), but they did not pass the similarity
                                threshold used for scoring, so the skills score remains 0%.
                              </>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {jobRequirements.skills.map((reqSkill, idx) => (
                            <div
                              key={idx}
                              className="flex flex-wrap items-baseline gap-1"
                            >
                              <XCircle className="w-3 h-3 text-red-500" />
                              <span className="text-gray-500">{reqSkill}</span>
                            </div>
                          ))}
                          {(!applicant.skills || applicant.skills.length === 0) && (
                            <p className="text-xs text-gray-500 mt-1">
                              Applicant has no listed skills yet, so no skill alignment
                              can be computed.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Eligibilities */}
                {jobRequirements.eligibilities &&
                  jobRequirements.eligibilities.length > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-gray-700 mb-1">
                          Eligibility Match
                        </p>

                        {/* Requires – raw eligibilities for AND/OR context */}
                        <div className="flex flex-wrap items-baseline gap-1">
                          <span className="text-gray-500">Requires:</span>
                          <span className="text-gray-900">
                            {jobRequirements.eligibilities.join('; ')}
                          </span>
                        </div>

                        {/* Applicant */}
                        <div className="flex flex-wrap items-baseline gap-1 mt-1">
                          <span className="text-gray-500">Applicant:</span>
                          <span className="text-gray-900">
                            {applicantEligibilityBadges.length > 0
                              ? applicantEligibilityBadges.join(', ')
                              : 'None listed'}
                          </span>
                          {eligibilityMatchIcon && (
                            <span className="ml-1 flex items-center">
                              {eligibilityMatchIcon}
                            </span>
                          )}
                        </div>

                        {hasRealEligibilityRequirement && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            The eligibility score is <strong>all-or-nothing</strong> – all
                            requirement lines must be satisfied to receive 100%. Partial
                            matches appear above but still score 0% until every group is
                            complete.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Executive Summary */}
        <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Executive Summary
          </h3>

          {/* Reasoning text */}
          {applicant.reasoning && (
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {(() => {
                let cleanReasoning = applicant.reasoning
                  .replace(
                    /Algo(?:rithm)?\s*\d+:\s*[\d.]+\s*\(\d+%\)[,\s|]*/gi,
                    ''
                  )
                  .replace(
                    /Using.*?algorithm/gi,
                    'Based on a comprehensive evaluation'
                  )
                  .replace(
                    /ensemble\s*(?:method|approach)/gi,
                    'multi-factor assessment'
                  )
                  .trim();

                if (cleanReasoning.length < 20 || cleanReasoning.includes('Algo')) {
                  const summaryParts: string[] = [];

                  if (applicant.educationScore >= 80) {
                    summaryParts.push('strong educational background');
                  }
                  if (applicant.experienceScore >= 80) {
                    summaryParts.push(
                      applicant.experience &&
                        jobRequirements &&
                        applicant.experience > jobRequirements.yearsOfExperience
                        ? 'excellent relevant experience'
                        : 'solid work experience'
                    );
                  }
                  if (applicant.skillsScore >= 60) {
                    summaryParts.push('good skills alignment');
                  }
                  if (applicant.eligibilityScore >= 80) {
                    summaryParts.push('complete required eligibilities');
                  }

                  if (summaryParts.length > 0) {
                    cleanReasoning = `${
                      applicant.rank === 1 ? 'Strong' : 'Qualified'
                    } candidate with ${summaryParts.join(', ')}. `;
                  } else {
                    cleanReasoning =
                      'Candidate evaluated across education, experience, skills, and eligibilities. ';
                  }

                  if (applicant.matchScore >= 80) {
                    cleanReasoning += 'Highly recommended for interview.';
                  } else if (applicant.matchScore >= 60) {
                    cleanReasoning += 'Recommended for further consideration.';
                  } else {
                    cleanReasoning += 'May require additional assessment.';
                  }
                }

                return cleanReasoning;
              })()}
            </p>
          )}

          {/* Strengths & areas for improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-xs font-semibold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                STRENGTHS
              </h4>
              <div className="space-y-2 text-sm">
                {applicant.educationScore >= 80 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>
                      {applicant.educationScore === 100 ? 'Fully meets' : 'Meets'} education
                      requirement
                      {applicant.education && ` (${applicant.education})`}
                    </span>
                  </div>
                )}
                {applicant.experienceScore >= 80 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>
                      {applicant.experience &&
                      jobRequirements &&
                      applicant.experience > jobRequirements.yearsOfExperience
                        ? `${roundExperience(
                            applicant.experience - jobRequirements.yearsOfExperience
                          )} years above required experience`
                        : 'Meets experience requirement'}
                    </span>
                  </div>
                )}
                {applicant.skillsScore >= 60 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Demonstrates relevant and transferable skills.</span>
                  </div>
                )}
                {applicant.eligibilityScore >= 80 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Has the required eligibilities/certifications.</span>
                  </div>
                )}
                {applicant.educationScore < 80 &&
                  applicant.experienceScore < 80 &&
                  applicant.skillsScore < 60 &&
                  applicant.eligibilityScore < 80 && (
                    <div className="flex items-start gap-2 text-gray-500 italic">
                      <span>No major strengths identified.</span>
                    </div>
                  )}
              </div>
            </div>

            {/* Areas for improvement */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-xs font-semibold text-orange-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                AREAS FOR IMPROVEMENT
              </h4>
              <div className="space-y-2 text-sm">
                {applicant.educationScore < 80 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <span className="text-orange-600 mt-0.5">⚠</span>
                    <span>
                      Education level or field is below the ideal requirement.
                    </span>
                  </div>
                )}
                {applicant.experienceScore < 80 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <span className="text-orange-600 mt-0.5">⚠</span>
                    <span>
                      {jobRequirements && applicant.experience !== undefined
                        ? (() => {
                            const diffYears = roundExperience(
                              jobRequirements.yearsOfExperience -
                                (applicant.experience || 0)
                            );
                            if (diffYears > 0) {
                              return `Needs about ${diffYears} more ${
                                diffYears === 1 ? 'year' : 'years'
                              } of experience to fully meet the requirement.`;
                            }
                            return 'Experience is already close to or above the minimum, but may be less relevant compared with other candidates.';
                          })()
                        : 'Limited relevant experience.'}
                    </span>
                  </div>
                )}
                {applicant.skillsScore < 60 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <span className="text-orange-600 mt-0.5">⚠</span>
                    <span>Skills alignment is moderate or low.</span>
                  </div>
                )}
                {applicant.eligibilityScore < 80 && hasRealEligibilityRequirement && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <span className="text-orange-600 mt-0.5">⚠</span>
                    <span>Missing some of the required eligibilities.</span>
                  </div>
                )}
                {applicant.educationScore >= 80 &&
                  applicant.experienceScore >= 80 &&
                  applicant.skillsScore >= 60 &&
                  (applicant.eligibilityScore >= 80 || !hasRealEligibilityRequirement) && (
                    <div className="flex items-start gap-2 text-gray-500 italic">
                      <span>No significant gaps identified.</span>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                Recommendation:
              </span>
              {applicant.matchScore >= 80 ? (
                <Badge variant="success">Highly Recommended for Interview</Badge>
              ) : applicant.matchScore >= 60 ? (
                <Badge variant="info">Recommended for Consideration</Badge>
              ) : applicant.matchScore >= 40 ? (
                <Badge variant="warning">Conditional – Further Assessment Needed</Badge>
              ) : (
                <Badge variant="default">Does Not Meet Minimum Requirements</Badge>
              )}
            </div>
          </div>
        </div>

        {/* HR Internal Notes (HR Only) */}
        {applicant.hr_notes && (
          <div className="mt-6 p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border-2 border-amber-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Internal Notes (HR Only)
            </h3>
            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {applicant.hr_notes}
              </p>
            </div>
            <p className="text-xs text-amber-700 mt-2 italic">
              These notes are for HR reference only and are not visible to the applicant.
            </p>
          </div>
        )}

        {/* Re-routing Information */}
        {(applicant.status === 're_routed' || applicant.re_routed_from_job_id || applicant.re_routed_to_job_id) && (
          <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-100 rounded-xl border-2 border-purple-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
              Re-routing Information
            </h3>
            <div className="space-y-3">
              {applicant.status === 're_routed' && applicant.re_routed_to_job_id && (
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-sm font-medium text-purple-900 mb-2">
                    This application was re-routed to an alternative position
                  </p>
                  {applicant.re_routing_reason && (
                    <div className="bg-purple-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-purple-700 mb-1">AI Reasoning:</p>
                      <p className="text-sm text-purple-800 leading-relaxed">
                        {applicant.re_routing_reason}
                      </p>
                    </div>
                  )}
                  {applicant.re_routed_at && (
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Re-routed on {new Date(applicant.re_routed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              )}
              {applicant.re_routed_from_job_id && (
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-sm font-medium text-purple-900 mb-2">
                    This is a re-routed application
                  </p>
                  <p className="text-sm text-gray-700">
                    The applicant was originally applied to another position and was automatically matched to this job by our AI system.
                  </p>
                  {applicant.re_routing_reason && (
                    <div className="bg-purple-50 rounded-lg p-3 mt-3">
                      <p className="text-xs font-semibold text-purple-700 mb-1">Match Reasoning:</p>
                      <p className="text-sm text-purple-800 leading-relaxed">
                        {applicant.re_routing_reason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-purple-700 mt-3 italic">
              Re-routing uses Gemini AI to find the best alternative job matches based on applicant qualifications.
            </p>
          </div>
        )}

        {/* Algorithm analysis */}
        {applicant.algorithmDetails && (
          <div className="mt-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl border-2 border-indigo-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Algorithm Analysis
            </h3>

            {/* Method */}
            <div className="mb-4 p-4 bg-white rounded-lg">
              <h4 className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-2">
                <BarChart3 className="w-3 h-3" />
                SCORING METHOD
              </h4>
              <p className="text-sm text-gray-700">
                {applicant.algorithmDetails.isTieBreaker ? (
                  <>
                    <Badge variant="warning" className="mr-2">
                      Tie-breaker Applied
                    </Badge>
                    Algorithm 1 and Algorithm 2 scores were very close (difference of{' '}
                    {applicant.algorithmDetails.scoreDifference?.toFixed(2)} points), so
                    Algorithm 3 (Eligibility–Education tie-breaker) determined the final
                    rank.
                  </>
                ) : (
                  <>
                    <Badge variant="info" className="mr-2">
                      Weighted Average
                    </Badge>
                    Final score is a weighted combination: 60% Algorithm 1 (Weighted Sum)
                    and 40% Algorithm 2 (Skill–Experience Composite).
                  </>
                )}
              </p>
            </div>

            {/* Individual algorithm scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {applicant.algorithmDetails.algorithm1Score !== undefined && (
                <div className="p-4 bg-white rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      1
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-600">
                        Algorithm 1
                      </p>
                      <p className="text-[11px] text-gray-500">Weighted Sum</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {applicant.algorithmDetails.algorithm1Score.toFixed(1)}
                  </p>
                  {!applicant.algorithmDetails.isTieBreaker && (
                    <p className="text-[11px] text-gray-500 mt-1">Weight: 60%</p>
                  )}
                </div>
              )}

              {applicant.algorithmDetails.algorithm2Score !== undefined && (
                <div className="p-4 bg-white rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      2
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-600">
                        Algorithm 2
                      </p>
                      <p className="text-[11px] text-gray-500">Skill–Experience</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {applicant.algorithmDetails.algorithm2Score.toFixed(1)}
                  </p>
                  {!applicant.algorithmDetails.isTieBreaker && (
                    <p className="text-[11px] text-gray-500 mt-1">Weight: 40%</p>
                  )}
                </div>
              )}

              {applicant.algorithmDetails.algorithm3Score !== undefined &&
                applicant.algorithmDetails.isTieBreaker && (
                  <div className="p-4 bg-white rounded-lg border-l-4 border-yellow-500">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        3
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-600">
                          Algorithm 3
                        </p>
                        <p className="text-[11px] text-gray-500">Tie-breaker</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {applicant.algorithmDetails.algorithm3Score.toFixed(1)}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">Weight: 100%</p>
                  </div>
                )}
            </div>

            {/* Final calculation */}
            <div className="p-4 bg-white rounded-lg">
              <h4 className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                FINAL CALCULATION
              </h4>
              <div className="text-sm text-gray-700">
                {applicant.algorithmDetails.isTieBreaker ? (
                  <div className="space-y-1">
                    <p>
                      <strong>Algorithm 3 Score:</strong>{' '}
                      {applicant.algorithmDetails.algorithm3Score?.toFixed(2)} × 100% ={' '}
                      <strong className="text-indigo-600">
                        {applicant.matchScore.toFixed(2)}
                      </strong>
                    </p>
                    <p className="text-[11px] text-gray-500 italic">
                      Tie-breaker prioritizes education and eligibilities when candidates
                      are very close in overall score.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p>
                      <strong>Algorithm 1:</strong>{' '}
                      {applicant.algorithmDetails.algorithm1Score?.toFixed(2)} × 60% ={' '}
                      {(
                        (applicant.algorithmDetails.algorithm1Score || 0) * 0.6
                      ).toFixed(2)}
                    </p>
                    <p>
                      <strong>Algorithm 2:</strong>{' '}
                      {applicant.algorithmDetails.algorithm2Score?.toFixed(2)} × 40% ={' '}
                      {(
                        (applicant.algorithmDetails.algorithm2Score || 0) * 0.4
                      ).toFixed(2)}
                    </p>
                    <p className="pt-2 border-t border-gray-200 mt-2">
                      <strong>Final Score:</strong>{' '}
                      <strong className="text-indigo-600">
                        {applicant.matchScore.toFixed(2)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-200">
              <button
                onClick={() => setIsAlgorithmInfoOpen(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2 transition-colors hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                Learn more about these algorithms
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Algorithm Info Modal */}
      <AlgorithmInfoModal
        isOpen={isAlgorithmInfoOpen}
        onClose={() => setIsAlgorithmInfoOpen(false)}
      />
    </Modal>
  );
}
