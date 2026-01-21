/**
 * JobDetailsModal Component
 *
 * Displays full job details in a modal
 * Used when clicking on a job card
 */

import React from 'react';
import { ModernModal } from '@/components/ui/ModernModal';
import { Button, Badge } from '@/components/ui';
import {
  Briefcase,
  GraduationCap,
  Clock,
  MapPin,
  Building2,
  Home,
  Award,
  Calendar,
  Users,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

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

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailsModal({ job, isOpen, onClose }: JobDetailsModalProps) {
  if (!job) return null;

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
      month: 'long',
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
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="Job Details"
      subtitle="Complete job information"
      colorVariant="green"
      icon={Briefcase}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header with Title and Badges */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-2xl font-bold text-gray-900 flex-1">{job.title}</h2>
            {isNew() && (
              <Badge variant="success" icon={CheckCircle2}>
                New
              </Badge>
            )}
          </div>
          {job.employment_type && (
            <Badge variant="info">{job.employment_type}</Badge>
          )}
        </div>

        {/* Full Description */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Job Description
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {job.description}
          </p>
        </div>

        {/* Job Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Education Requirement */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium">Education Requirement</span>
            </div>
            <p className="text-gray-900 font-semibold">{job.degree_requirement}</p>
          </div>

          {/* Experience Required */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Experience Required</span>
            </div>
            <p className="text-gray-900 font-semibold">{getExperienceText()}</p>
          </div>

          {/* Employment Type */}
          {job.employment_type && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">Employment Type</span>
              </div>
              <p className="text-gray-900 font-semibold">{job.employment_type}</p>
            </div>
          )}

          {/* Location */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              {job.remote ? (
                <Home className="w-4 h-4" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Work Location</span>
            </div>
            <p className="text-gray-900 font-semibold">
              {job.remote ? 'Remote' : job.location || 'Location not specified'}
            </p>
          </div>
        </div>

        {/* Eligibilities */}
        {job.eligibilities && job.eligibilities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Required Eligibilities
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.eligibilities.map((eligibility, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium border border-orange-200"
                >
                  {eligibility}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Required Skills */}
        {job.skills && job.skills.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Required Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-[#D4F4DD] text-[#22A555] rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Posted {formatDate(job.created_at)}</span>
            </div>
            {job.profiles && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>by {job.profiles.full_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Link href="/login" className="flex-1">
            <Button variant="primary" icon={Briefcase} className="w-full">
              Login to Apply
            </Button>
          </Link>
        </div>
      </div>
    </ModernModal>
  );
}
