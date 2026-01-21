'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { X, AlertTriangle, Briefcase, Users, XCircle, Lock } from 'lucide-react';
import Image from 'next/image';

interface AutoDenyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  jobId: string;
  pendingCount: number;
  onConfirm: (reason: string) => Promise<void>;
  submitting: boolean;
}

const BULK_DENIAL_REASONS = [
  'Position has been filled',
  'Hiring process completed',
  'Required number of applicants approved',
  'Job requirements changed',
  'Position no longer available',
  'Other'
];

export const AutoDenyModal: React.FC<AutoDenyModalProps> = ({
  isOpen,
  onClose,
  jobTitle,
  jobId,
  pendingCount,
  onConfirm,
  submitting
}) => {
  const [denialReason, setDenialReason] = useState('Position has been filled');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const finalReason = denialReason === 'Other' ? customReason : denialReason;
    if (!finalReason.trim()) return;

    await onConfirm(finalReason);

    // Reset form
    setDenialReason('Position has been filled');
    setCustomReason('');
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
        {/* Red/Orange Gradient Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg p-1.5">
                <Image src="/JS-logo.png" alt="JobSync" width={40} height={40} className="rounded-lg object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Close Job & Deny Remaining</h3>
                <p className="text-sm text-white/90">Bulk denial for pending applicants</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/30 hover:text-gray-100 rounded-lg p-2 transition-all duration-200"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 mb-1">Bulk Action Warning</p>
                <p className="text-sm text-orange-700">
                  This will <strong>close the job posting</strong> and automatically <strong>deny all {pendingCount} pending {pendingCount === 1 ? 'applicant' : 'applicants'}</strong>.
                  All affected applicants will be notified. This action can be reversed by reopening the job.
                </p>
              </div>
            </div>
          </div>

          {/* Job Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Job Details:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{jobTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">
                  <strong className="text-orange-600">{pendingCount}</strong> pending {pendingCount === 1 ? 'applicant' : 'applicants'} will be denied
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">
                  Job status will change to <strong className="text-red-600">Closed</strong>
                </span>
              </div>
            </div>
          </div>

          {/* No Pending Applicants Warning */}
          {pendingCount === 0 && (
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800 mb-1">No Pending Applicants</p>
                  <p className="text-sm text-blue-700">
                    There are no pending applicants for this job. Only the job status will be changed to "Closed".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Denial Reason (Required) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Closing & Denying <span className="text-red-600">*</span>
            </label>
            <select
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
              disabled={submitting}
            >
              {BULK_DENIAL_REASONS.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          {/* Custom Reason (if Other selected) */}
          {denialReason === 'Other' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Custom Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify the reason..."
                rows={3}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">This will be shown to all denied applicants</p>
            </div>
          )}

          {/* Summary Box */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-800 mb-2">Action Summary:</p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Job status: <strong>Active</strong> → <strong className="text-red-600">Closed</strong></li>
              <li>{pendingCount} pending {pendingCount === 1 ? 'applicant' : 'applicants'} will be <strong>denied</strong></li>
              <li>All denied applicants will receive email notifications</li>
              <li>Job can be reopened later if needed</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={XCircle}
              loading={submitting}
              onClick={handleConfirm}
              className="flex-1"
              disabled={submitting || (denialReason === 'Other' && !customReason.trim())}
            >
              {submitting ? 'Processing...' : `Close Job & Deny ${pendingCount > 0 ? `(${pendingCount})` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
