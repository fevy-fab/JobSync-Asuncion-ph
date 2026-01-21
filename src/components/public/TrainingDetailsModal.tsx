/**
 * TrainingDetailsModal Component
 *
 * Displays full training program details in a modal
 * Used when clicking on a training card
 */

import React from 'react';
import { ModernModal } from '@/components/ui/ModernModal';
import { Button, Badge } from '@/components/ui';
import { ProgramStatusBadge, type ProgramStatus } from '@/components/peso/ProgramStatusBadge';
import {
  GraduationCap,
  Calendar,
  Users,
  Clock,
  MapPin,
  User,
  BookOpen,
  Tag,
  CheckCircle2,
  AlertCircle,
  Archive
} from 'lucide-react';
import Link from 'next/link';

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

interface TrainingDetailsModalProps {
  training: TrainingProgram | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TrainingDetailsModal({ training, isOpen, onClose }: TrainingDetailsModalProps) {
  if (!training) return null;

  // Check if training is new (created within last 7 days)
  const isNew = () => {
    const createdDate = new Date(training.created_at);
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

  // Calculate enrollment percentage
  const enrollmentPercentage = Math.min(
    Math.round((training.enrolled_count / training.capacity) * 100),
    100
  );

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="Training Program Details"
      subtitle="Complete program information"
      colorVariant="green"
      icon={GraduationCap}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header with Title and Badges */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-2xl font-bold text-gray-900 flex-1">{training.title}</h2>
            <div className="flex gap-2">
              {isNew() && (
                <Badge variant="success" icon={CheckCircle2}>
                  New
                </Badge>
              )}
              <ProgramStatusBadge status={training.status} size="md" />
            </div>
          </div>
        </div>

        {/* SPEAKER/INSTRUCTOR - PROMINENT DISPLAY */}
        {training.speaker_name && (
          <div className="bg-[#22A555]/5 border-2 border-[#22A555]/20 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#22A555]/10 rounded-full">
                <User className="w-5 h-5 text-[#22A555]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#22A555] uppercase tracking-wide">
                  Speaker / Instructor
                </p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {training.speaker_name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Full Description */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Program Description
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {training.description}
          </p>
        </div>

        {/* Training Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Duration */}
          <div className="bg-[#22A555]/10 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#22A555] mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <p className="text-gray-900 font-semibold">{training.duration}</p>
          </div>

          {/* Program Dates */}
          <div className="bg-[#22A555]/10 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#22A555] mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Program Dates</span>
            </div>
            <p className="text-gray-900 font-semibold text-sm">
              {formatDate(training.start_date)}
              {training.end_date && ` - ${formatDate(training.end_date)}`}
            </p>
          </div>

          {/* Schedule */}
          {training.schedule && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Schedule</span>
              </div>
              <p className="text-gray-900 font-semibold">{training.schedule}</p>
            </div>
          )}

          {/* Location */}
          {training.location && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Location</span>
              </div>
              <p className="text-gray-900 font-semibold">{training.location}</p>
            </div>
          )}
        </div>

        {/* Enrollment Status */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Enrollment Status
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-900 font-semibold">
                {training.enrolled_count} / {training.capacity} enrolled
              </p>
              <span className="text-sm font-bold text-gray-700">
                {enrollmentPercentage}% capacity
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-[#22A555] to-[#1a8445] h-3 rounded-full transition-all duration-300"
                style={{ width: `${enrollmentPercentage}%` }}
              />
            </div>
            {enrollmentPercentage >= 80 && (
              <p className="text-xs text-orange-600 font-medium mt-2">
                ⚠️ Limited slots available
              </p>
            )}
          </div>
        </div>

        {/* Skills Covered */}
        {training.skills_covered && training.skills_covered.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Skills Covered
            </h3>
            <div className="flex flex-wrap gap-2">
              {training.skills_covered.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-[#22A555]/10 text-[#22A555] rounded-full text-sm font-medium border border-[#22A555]/20"
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
              <span>Posted {formatDate(training.created_at)}</span>
            </div>
            {training.profiles && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>by {training.profiles.full_name}</span>
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
            <Button variant="primary" icon={GraduationCap} className="w-full">
              Login to Enroll
            </Button>
          </Link>
        </div>
      </div>
    </ModernModal>
  );
}
