'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { X, Unlock, CheckCircle, Briefcase, User } from 'lucide-react';
import Image from 'next/image';

interface ReleaseHireModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicantName: string;
  jobTitle: string;
  applicationId: string;
  onConfirm: (reason: string) => Promise<void>;
  submitting: boolean;
}

const RELEASE_REASONS = [
  'Employee resigned',
  'Contract ended',
  'Position terminated',
  'Mutual agreement',
  'Employee requested release',
  'Other'
];

export const ReleaseHireModal: React.FC<ReleaseHireModalProps> = ({
  isOpen,
  onClose,
  applicantName,
  jobTitle,
  applicationId,
  onConfirm,
  submitting
}) => {
  const [releaseReason, setReleaseReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const finalReason = releaseReason === 'Other' ? customReason : releaseReason;

    await onConfirm(finalReason);

    // Reset form
    setReleaseReason('');
    setCustomReason('');
  };

  const isFormValid = releaseReason && (releaseReason !== 'Other' || customReason.trim());

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
        {/* Green Gradient Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg p-1.5">
                <Image src="/JS-logo.png" alt="JobSync" width={40} height={40} className="rounded-lg object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Release Hire Status</h3>
                <p className="text-emerald-100 text-sm">Allow applicant to apply for new positions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Info Section */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Unlock className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-900 mb-2">Hire Release Details</h4>
                <div className="space-y-2 text-sm text-emerald-700">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span><strong>Applicant:</strong> {applicantName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span><strong>Current Position:</strong> {jobTitle}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Releasing hire status will:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-700 ml-4">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Change application status to "Archived"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Allow applicant to apply for other positions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Send notification to applicant</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Log this action in audit trail</span>
              </li>
            </ul>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Release Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              disabled={submitting}
            >
              <option value="">Select a reason...</option>
              {RELEASE_REASONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          {/* Custom Reason */}
          {releaseReason === 'Other' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Custom Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify the reason for releasing hire status..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                disabled={submitting}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="success"
            className="flex-1"
            disabled={!isFormValid || submitting}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Releasing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Unlock className="w-4 h-4" />
                Release Hire Status
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
