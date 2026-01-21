/**
 * JobCard Component
 *
 * Simplified card for public job listings
 * Matches announcements page pattern - clickable card that opens modal
 */

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import {
  Briefcase,
  MapPin,
  Calendar,
  GraduationCap,
  Clock,
  Building2,
  Home
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  degree_requirement: string;
  eligibilities: string[];
  skills: string[];
  years_of_experience: number;
  min_years_experience: number | null;
  max_years_experience: number | null;
  experience: string | null;
  location: string | null;
  employment_type: string | null;
  remote: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

interface JobCardProps {
  job: Job;
  onView: (job: Job) => void;
}

export function JobCard({ job, onView }: JobCardProps) {
  // Check if job is new (created within last 7 days)
  const isNew = () => {
    const createdDate = new Date(job.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get experience display text
  const getExperienceText = () => {
    if (job.experience) return job.experience;
    if (job.min_years_experience !== null && job.max_years_experience !== null) {
      return `${job.min_years_experience}-${job.max_years_experience} years`;
    }
    if (job.min_years_experience !== null) {
      return `${job.min_years_experience}+ years`;
    }
    if (job.years_of_experience > 0) {
      return `${job.years_of_experience}+ years`;
    }
    return 'No experience required';
  };

  return (
    <div
      onClick={() => onView(job)}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group"
    >
      {/* Header Image/Icon Section */}
      <div className="relative w-full h-48 bg-gradient-to-br from-[#22A555] to-[#1a8445]">
        <div className="absolute inset-0 flex items-center justify-center">
          <Briefcase className="w-20 h-20 text-white opacity-80" />
        </div>

        {/* New Badge Overlay */}
        {isNew() && (
          <div className="absolute top-3 right-3">
            <Badge variant="success" className="shadow-md">
              New
            </Badge>
          </div>
        )}

        {/* Employment Type Badge */}
        {job.employment_type && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold shadow-md bg-white/90 text-gray-700">
              {job.employment_type}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-[#22A555] transition-colors">
          {job.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {job.description}
        </p>

        {/* Requirements Quick View */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-md">
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 truncate max-w-[150px]">
              {job.degree_requirement}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 rounded-md">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">
              {getExperienceText()}
            </span>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          {/* Location/Remote */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {job.remote ? (
              <>
                <Home className="w-3.5 h-3.5" />
                <span>Remote</span>
              </>
            ) : job.location ? (
              <>
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{job.location}</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5" />
                <span>Location not specified</span>
              </>
            )}
          </div>

          {/* Posted Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Posted {formatDate(job.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
