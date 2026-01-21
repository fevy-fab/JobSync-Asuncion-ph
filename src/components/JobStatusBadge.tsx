import React from 'react';
import { CheckCircle, EyeOff, Archive, Lock } from 'lucide-react';

export type JobStatus = 'active' | 'hidden' | 'archived' | 'closed';

interface JobStatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ElementType;
  description: string;
}

const statusConfigs: Record<JobStatus, StatusConfig> = {
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    description: 'Accepting applications'
  },
  hidden: {
    label: 'Hidden',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: EyeOff,
    description: 'Not visible to applicants'
  },
  archived: {
    label: 'Archived',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: Archive,
    description: 'Historical/old job posting'
  },
  closed: {
    label: 'Closed',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Lock,
    description: 'Positions filled, no new applications'
  }
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4'
};

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({
  status,
  size = 'md',
  className = ''
}) => {
  const config = statusConfigs[status];
  const Icon = config.icon;

  if (!config) {
    console.warn(`Unknown job status: ${status}`);
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-gray-100 text-gray-800 border-gray-200 ${className}`}>
        <span className="text-xs font-medium">{status}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${config.color} ${sizeClasses[size]} ${className}`}
      title={config.description}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </div>
  );
};

// Export status configs for use in other components
export { statusConfigs };
