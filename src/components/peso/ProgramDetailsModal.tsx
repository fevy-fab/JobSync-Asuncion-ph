/**
 * Program Details Modal Component
 *
 * Displays full training program details in a modal
 * Used when clicking on a program card for preview
 */

import React from 'react';
import { ModernModal, Button, Badge } from '@/components/ui';
import { ProgramStatusBadge, type ProgramStatus } from './ProgramStatusBadge';
import {
  GraduationCap,
  Calendar,
  Users,
  Clock,
  MapPin,
  User,
  BookOpen,
  Tag,
  Edit,
  CheckCircle2,
  AlertCircle,
  Archive
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
  status: 'active' | 'upcoming' | 'archived';
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface ProgramDetailsModalProps {
  program: TrainingProgram | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (program: TrainingProgram) => void;
}

export function ProgramDetailsModal({ program, isOpen, onClose, onEdit }: ProgramDetailsModalProps) {
  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate enrollment percentage (safely handle null program)
  const enrollmentPercentage = program ? Math.round((program.enrolled_count / program.capacity) * 100) : 0;

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="Training Program Details"
      subtitle="View complete program information"
      colorVariant="green"
      icon={GraduationCap}
      size="lg"
    >
      {program ? (
      <div className="space-y-6">
        {/* Header with Badge */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{program.title}</h2>
            <ProgramStatusBadge status={program.status} size="md" />
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Description
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{program.description}</p>
        </div>

        {/* Program Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Duration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <p className="text-gray-900 font-semibold">{program.duration}</p>
          </div>

          {/* Dates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Program Dates</span>
            </div>
            <p className="text-gray-900 font-semibold text-sm">
              {formatDate(program.start_date)}
              {program.end_date && ` - ${formatDate(program.end_date)}`}
            </p>
          </div>

          {/* Enrollment */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Enrollment</span>
            </div>
            <p className="text-gray-900 font-semibold">
              {program.enrolled_count} / {program.capacity} enrolled
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#22A555] h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(enrollmentPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{enrollmentPercentage}% capacity</p>
          </div>

          {/* Location */}
          {program.location && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Location</span>
              </div>
              <p className="text-gray-900 font-semibold">{program.location}</p>
            </div>
          )}

          {/* Schedule */}
          {program.schedule && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Schedule</span>
              </div>
              <p className="text-gray-900 font-semibold">{program.schedule}</p>
            </div>
          )}

          {/* Speaker */}
          {program.speaker_name && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Speaker/Instructor</span>
              </div>
              <p className="text-gray-900 font-semibold">{program.speaker_name}</p>
            </div>
          )}
        </div>

        {/* Skills Covered */}
        {program.skills_covered && program.skills_covered.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Skills Covered
            </h3>
            <div className="flex flex-wrap gap-2">
              {program.skills_covered.map((skill, index) => (
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

        {/* Creator Info */}
        {program.profiles && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Created by <span className="font-semibold text-gray-700">{program.profiles.full_name}</span> on{' '}
              {formatDate(program.created_at)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Close
          </Button>
          {onEdit && program && (
            <Button
              variant="warning"
              icon={Edit}
              onClick={() => {
                onEdit(program);
                onClose();
              }}
              className="flex-1"
            >
              Edit Program
            </Button>
          )}
        </div>
      </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No program data available</p>
        </div>
      )}
    </ModernModal>
  );
}
