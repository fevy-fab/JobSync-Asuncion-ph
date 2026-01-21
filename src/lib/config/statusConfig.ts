import { CheckCircle, CheckCircle2, Clock, XCircle, Eye, Star, Calendar, Briefcase, Archive, AlertCircle, UserCheck, Play, PlayCircle, Award, Ban, ArrowRightLeft } from 'lucide-react';

/**
 * Centralized Status Configuration
 *
 * Single source of truth for all application status colors, labels, and icons.
 * Used across job applications and training applications.
 */

export type JobStatus =
  | 'pending'
  | 'under_review'
  | 'shortlisted'
  | 'interviewed'
  | 'approved'
  | 'denied'
  | 'hired'
  | 'archived'
  | 'withdrawn'
  | 're_routed';

export type TrainingStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'enrolled'
  | 'in_progress'
  | 'completed'
  | 'certified'
  | 'withdrawn'
  | 'failed'
  | 'archived';

export type ApplicationStatus = JobStatus | TrainingStatus;

export interface StatusConfig {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeVariant: 'success' | 'danger' | 'warning' | 'secondary' | 'primary' | 'teal';
  // Legacy support for ApplicationStatusBadge.tsx
  legacyColor?: string;
}

/**
 * Unified Status Configuration
 *
 * Color Scheme:
 * - Yellow: Pending, Certified
 * - Blue: Under Review, Enrolled
 * - Green: Approved
 * - Red: Denied, Failed
 * - Orange: Shortlisted
 * - Purple: Interviewed
 * - Teal: Hired, In Progress
 * - Gray: Completed, Archived, Withdrawn
 */
export const STATUS_CONFIG: Record<string, StatusConfig> = {
  // Common statuses (both job and training)
  pending: {
    label: 'Pending Review',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-600',
    badgeVariant: 'warning',
    legacyColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  under_review: {
    label: 'Under Review',
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-600',
    badgeVariant: 'primary',
    legacyColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-600',
    badgeVariant: 'success',
    legacyColor: 'bg-green-100 text-green-800 border-green-200',
  },
  denied: {
    label: 'Denied',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-600',
    badgeVariant: 'danger',
    legacyColor: 'bg-red-100 text-red-800 border-red-200',
  },
  withdrawn: {
    label: 'Withdrawn',
    icon: AlertCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-600',
    badgeVariant: 'secondary',
    legacyColor: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  archived: {
    label: 'Archived',
    icon: Archive,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-500',
    badgeVariant: 'secondary',
    legacyColor: 'bg-gray-100 text-gray-800 border-gray-200',
  },

  // Job-specific statuses
  shortlisted: {
    label: 'Shortlisted',
    icon: Star,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-600',
    badgeVariant: 'warning',
    legacyColor: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  interviewed: {
    label: 'Interviewed',
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-600',
    badgeVariant: 'primary',
    legacyColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  hired: {
    label: 'Hired',
    icon: Briefcase,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-600',
    badgeVariant: 'teal',
    legacyColor: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  re_routed: {
    label: 'Re-routed',
    icon: ArrowRightLeft,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-600',
    badgeVariant: 'primary',
    legacyColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },

  // Training-specific statuses
  enrolled: {
    label: 'Enrolled',
    icon: UserCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-600',
    badgeVariant: 'primary',
    legacyColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  in_progress: {
    label: 'In Progress',
    icon: Play,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-600',
    badgeVariant: 'teal',
    legacyColor: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-600',
    badgeVariant: 'secondary',
    legacyColor: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  certified: {
    label: 'Certified',
    icon: Award,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-600',
    badgeVariant: 'warning',
    legacyColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  failed: {
    label: 'Failed',
    icon: Ban,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-600',
    badgeVariant: 'danger',
    legacyColor: 'bg-red-100 text-red-800 border-red-200',
  },
};

/**
 * Get status configuration by status key
 *
 * @param status - The status key (e.g., 'pending', 'approved', etc.)
 * @returns StatusConfig object with label, colors, icon, etc.
 */
export const getStatusConfig = (status: string): StatusConfig => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
};

/**
 * Get all training-specific statuses
 */
export const getTrainingStatuses = (): TrainingStatus[] => {
  return [
    'pending',
    'under_review',
    'approved',
    'denied',
    'enrolled',
    'in_progress',
    'completed',
    'certified',
    'withdrawn',
    'failed',
    'archived',
  ];
};

/**
 * Get all job-specific statuses
 */
export const getJobStatuses = (): JobStatus[] => {
  return [
    'pending',
    'under_review',
    'shortlisted',
    'interviewed',
    'approved',
    'denied',
    'hired',
    'archived',
    'withdrawn',
  ];
};

/**
 * Check if a status is a training status
 */
export const isTrainingStatus = (status: string): boolean => {
  return getTrainingStatuses().includes(status as TrainingStatus);
};

/**
 * Check if a status is a job status
 */
export const isJobStatus = (status: string): boolean => {
  return getJobStatuses().includes(status as JobStatus);
};

// ============================================================================
// TRAINING PROGRAM STATUS CONFIGURATION (Program lifecycle, not applications)
// ============================================================================

/**
 * Training Program Status Type
 * Represents the lifecycle stage of a training program itself
 */
export type TrainingProgramStatus = 'active' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'archived';

/**
 * Training Program Status Configuration
 *
 * Status Workflow:
 * upcoming → active → ongoing → completed
 *    ↓        ↓        ↓         ↓
 * cancelled  cancelled cancelled cancelled
 *    ↓        ↓        ↓         ↓
 * archived  archived  archived  archived
 */
export const trainingProgramStatusConfig: Record<TrainingProgramStatus, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-100',
    legacyColor: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
    description: 'Accepting enrollments',
  },
  upcoming: {
    label: 'Upcoming',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:bg-blue-100',
    legacyColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Calendar,
    description: 'Scheduled, not started',
  },
  ongoing: {
    label: 'Ongoing',
    color: 'purple',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:bg-purple-100',
    legacyColor: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: PlayCircle,
    description: 'In progress, training started',
  },
  completed: {
    label: 'Completed',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    hoverColor: 'hover:bg-teal-100',
    legacyColor: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: Award,
    description: 'Finished successfully',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    hoverColor: 'hover:bg-red-100',
    legacyColor: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    description: 'Cancelled before/during execution',
  },
  archived: {
    label: 'Archived',
    color: 'gray',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    hoverColor: 'hover:bg-gray-100',
    legacyColor: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Archive,
    description: 'Historical, old programs',
  },
};

/**
 * Get status configuration for a training program status
 */
export const getProgramStatusConfig = (status: TrainingProgramStatus): StatusConfig => {
  return trainingProgramStatusConfig[status];
};

/**
 * Get all training program statuses
 */
export const getTrainingProgramStatuses = (): TrainingProgramStatus[] => {
  return Object.keys(trainingProgramStatusConfig) as TrainingProgramStatus[];
};

/**
 * Check if a status is a training program status
 */
export const isTrainingProgramStatus = (status: string): boolean => {
  return getTrainingProgramStatuses().includes(status as TrainingProgramStatus);
};
