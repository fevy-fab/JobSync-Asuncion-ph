import React from 'react';
import {
  CheckCircle2,
  Calendar,
  PlayCircle,
  Award,
  XCircle,
  Archive,
  LucideIcon
} from 'lucide-react';

export type ProgramStatus = 'active' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'archived';

interface ProgramStatusBadgeProps {
  status: ProgramStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
  description: string;
}

// Program status configuration
const statusConfigs: Record<ProgramStatus, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
    description: 'Accepting applications'
  },
  upcoming: {
    label: 'Upcoming',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Calendar,
    description: 'Scheduled, not started'
  },
  ongoing: {
    label: 'Ongoing',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: PlayCircle,
    description: 'In progress, training started'
  },
  completed: {
    label: 'Completed',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: Award,
    description: 'Finished successfully'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    description: 'Cancelled before/during execution'
  },
  archived: {
    label: 'Archived',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Archive,
    description: 'Old/historical programs'
  }
};

export const ProgramStatusBadge: React.FC<ProgramStatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const config = statusConfigs[status];
  const Icon = config.icon;

  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`
        inline-flex items-center
        ${sizeClasses[size]}
        ${config.color}
        border rounded-full font-medium
        ${className}
      `}
      title={config.description}
    >
      <Icon size={iconSizes[size]} className="flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

/**
 * Get status configuration for a program status
 */
export const getProgramStatusConfig = (status: ProgramStatus): StatusConfig => {
  return statusConfigs[status];
};

/**
 * Get all program statuses
 */
export const getProgramStatuses = (): ProgramStatus[] => {
  return Object.keys(statusConfigs) as ProgramStatus[];
};

/**
 * Check if a status is a program status
 */
export const isProgramStatus = (status: string): boolean => {
  return getProgramStatuses().includes(status as ProgramStatus);
};
