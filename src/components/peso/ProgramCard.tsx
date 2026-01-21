/**
 * Program Card Component
 *
 * Displays training program information in a card format
 * Similar to announcements card design for consistent UI/UX
 */

import React, { useState, useEffect, useRef } from 'react';
import { Badge, Button } from '@/components/ui';
import { ProgramStatusBadge, type ProgramStatus } from './ProgramStatusBadge';
import { getValidTransitions } from '@/lib/utils/statusTransitions';
import {
  GraduationCap,
  Calendar,
  Users,
  Clock,
  MapPin,
  User,
  Edit,
  Archive,
  Undo2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ArrowRight,
  ChevronDown
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

interface ProgramCardProps {
  program: TrainingProgram;
  onView: (program: TrainingProgram) => void;
  onEdit: (program: TrainingProgram) => void;
  onArchive: (program: TrainingProgram) => void;
  onRestore: (program: TrainingProgram) => void;
  onDelete: (program: TrainingProgram) => void;
  onChangeStatus?: (program: TrainingProgram, newStatus: ProgramStatus) => void;
}

export function ProgramCard({ program, onView, onEdit, onArchive, onRestore, onDelete, onChangeStatus }: ProgramCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isArchived = program.status === 'archived';

  // Get valid status transitions for this program
  const validTransitions = getValidTransitions(program.status as any);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    }

    if (showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showStatusMenu]);

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
      onClick={() => onView(program)}
      className="bg-white border border-gray-200 rounded-xl hover:shadow-xl transition-all duration-200 cursor-pointer group"
    >
      {/* Header Image/Icon Section */}
      <div className="relative w-full h-48 bg-gradient-to-br from-[#D4F4DD] to-[#22A555] rounded-t-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <GraduationCap className="w-24 h-24 text-white opacity-80" />
        </div>

        {/* Status Badge Overlay */}
        <div className="absolute top-3 right-3">
          <ProgramStatusBadge status={program.status} size="md" className="shadow-md" />
        </div>

        {/* Enrolled Count Badge */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
            <Users className="w-4 h-4 text-[#22A555]" />
            <span className="text-sm font-semibold text-gray-900">
              {program.enrolled_count} / {program.capacity}
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-[#22A555] transition-colors">
          {program.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {program.description}
        </p>

        {/* Metadata Section */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          {/* Start Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(program.start_date)}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{program.duration}</span>
          </div>

          {/* Location */}
          {program.location && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{program.location}</span>
            </div>
          )}

          {/* Speaker */}
          {program.speaker_name && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{program.speaker_name}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Edit Button */}
            <Button
              variant="warning"
              size="sm"
              icon={Edit}
              onClick={(e) => { e.stopPropagation(); onEdit(program); }}
              className="flex-1"
            >
              Edit
            </Button>

            {/* Status Change Dropdown - only if handler is provided and has valid transitions */}
            {onChangeStatus && validTransitions.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant={showStatusMenu ? "primary" : "secondary"}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                  className="flex items-center gap-1 px-3 min-w-fit"
                  title="Change program status"
                >
                  <span className="text-xs font-medium">Status</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
                </Button>

                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 rounded">
                        Change Status To
                      </div>
                      {validTransitions.map((status) => (
                        <button
                          key={status}
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeStatus(program, status);
                            setShowStatusMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left rounded-md hover:bg-blue-50 transition-colors group"
                        >
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          <ProgramStatusBadge status={status} size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delete Button - only for archived */}
            {isArchived && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={(e) => { e.stopPropagation(); onDelete(program); }}
                className="flex-1"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
