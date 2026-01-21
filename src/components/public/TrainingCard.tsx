/**
 * TrainingCard Component
 *
 * Simplified card for public training listings
 * Matches announcements page pattern - clickable card that opens modal
 */

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { ProgramStatusBadge, type ProgramStatus } from '@/components/peso/ProgramStatusBadge';
import {
  GraduationCap,
  Calendar,
  MapPin,
  Users,
  Clock
} from 'lucide-react';

interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  duration: string;
  schedule?: string;
  capacity: number;
  enrolled_count: number;
  location?: string;
  speaker_name?: string;
  start_date: string;
  end_date?: string;
  skills_covered?: string[];
  icon?: string;
  status: ProgramStatus;
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface TrainingCardProps {
  training: TrainingProgram;
  onView: (training: TrainingProgram) => void;
}

export function TrainingCard({ training, onView }: TrainingCardProps) {
  // Check if training is new (created within last 7 days)
  const isNew = () => {
    const createdDate = new Date(training.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Check if starting soon (within next 14 days)
  const isStartingSoon = () => {
    const startDate = new Date(training.start_date);
    const now = new Date();
    const diffDays = Math.floor((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  };

  // Check if almost full (>80% capacity)
  const isAlmostFull = () => {
    const percentage = (training.enrolled_count / training.capacity) * 100;
    return percentage >= 80;
  };

  // Calculate enrollment percentage
  const enrollmentPercentage = Math.min(
    Math.round((training.enrolled_count / training.capacity) * 100),
    100
  );

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div
      onClick={() => onView(training)}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group"
    >
      {/* Header Image/Icon Section - Brand Green Gradient */}
      <div className="relative w-full h-48 bg-gradient-to-br from-[#22A555] to-[#1a8445]">
        <div className="absolute inset-0 flex items-center justify-center">
          <GraduationCap className="w-20 h-20 text-white opacity-80" />
        </div>

        {/* Status Badges Overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isNew() && (
            <Badge variant="success" className="shadow-md">
              New
            </Badge>
          )}
          {isStartingSoon() && (
            <Badge variant="info" className="shadow-md">
              Starting Soon
            </Badge>
          )}
          {isAlmostFull() && (
            <Badge variant="warning" className="shadow-md">
              Almost Full
            </Badge>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <ProgramStatusBadge status={training.status} size="md" className="shadow-md" />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-[#22A555] transition-colors">
          {training.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {training.description}
        </p>

        {/* Training Details Quick View */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#22A555]/10 rounded-md">
            <Clock className="w-3.5 h-3.5 text-[#22A555]" />
            <span className="text-xs font-medium text-[#22A555]">
              {training.duration}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#22A555]/10 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-[#22A555]" />
            <span className="text-xs font-medium text-[#22A555]">
              {formatDate(training.start_date)}
            </span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">
                {training.enrolled_count} / {training.capacity} enrolled
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-700">
              {enrollmentPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#22A555] to-[#1a8445] h-2 rounded-full transition-all duration-300"
              style={{ width: `${enrollmentPercentage}%` }}
            />
          </div>
        </div>

        {/* Metadata Section */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          {/* Location */}
          {training.location && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{training.location}</span>
            </div>
          )}

          {/* Posted Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Posted {formatDate(training.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
