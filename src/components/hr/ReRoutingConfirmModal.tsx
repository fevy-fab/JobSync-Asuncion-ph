'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { X, AlertCircle, Briefcase, Users, ArrowRightLeft, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface ReRoutingConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  jobId: string;
  pendingCount: number;
  onConfirm: (customReason?: string) => Promise<void>;
  submitting: boolean;
}

export const ReRoutingConfirmModal: React.FC<ReRoutingConfirmModalProps> = ({
  isOpen,
  onClose,
  jobTitle,
  jobId,
  pendingCount,
  onConfirm,
  submitting
}) => {
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm(customReason.trim() || undefined);
    setCustomReason('');
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all">
        {/* Purple Gradient Header - AI Re-routing Theme */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg p-1.5">
                <Image src="/JS-logo.png" alt="JobSync" width={40} height={40} className="rounded-lg object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Re-route Remaining Applicants
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </h3>
                <p className="text-sm text-white/90">AI-powered job matching</p>
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
          {/* Info Message */}
          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900 mb-1">AI-Powered Job Matching</h4>
                <p className="text-sm text-purple-800">
                  Gemini AI will analyze each applicant's qualifications and automatically find the best matching
                  alternative job position for them.
                </p>
              </div>
            </div>
          </div>

          {/* Job & Applicant Info */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Briefcase className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current Job</p>
                <p className="font-semibold text-gray-900">{jobTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-purple-600 uppercase tracking-wide">Applicants to Re-route</p>
                <p className="font-semibold text-purple-900">
                  {pendingCount} {pendingCount === 1 ? 'applicant' : 'applicants'}
                </p>
              </div>
            </div>
          </div>

          {/* What Will Happen Section */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
              What will happen:
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">1.</span>
                <span>
                  <strong>AI Analysis:</strong> Gemini AI will evaluate each applicant's education, experience, skills,
                  and eligibilities
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">2.</span>
                <span>
                  <strong>Job Matching:</strong> The best alternative job will be selected based on AI scoring
                  (minimum 30% match required)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">3.</span>
                <span>
                  <strong>New Applications:</strong> Automatically create new applications for matched jobs with
                  pre-calculated scores
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">4.</span>
                <span>
                  <strong>Status Update:</strong> Original applications marked as 're_routed' with full audit trail
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">5.</span>
                <span>
                  <strong>Notifications:</strong> Applicants receive detailed messages explaining the re-routing and
                  the AI's reasoning
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">6.</span>
                <span>
                  <strong>No Match? Denied:</strong> If no suitable job found (or no active jobs), applicant is denied
                  with explanation
                </span>
              </li>
            </ul>
          </div>

          {/* Safety Features */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <h5 className="font-semibold text-blue-900 text-sm mb-2">Safety Features:</h5>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Maximum 2 re-routes per applicant per 30 days (prevents infinite loops)</li>
              <li>• Excludes applicants already hired for other positions</li>
              <li>• Only processes pending/under_review applications</li>
              <li>• Complete re-routing history tracked in database</li>
            </ul>
          </div>

          {/* Optional Custom Message */}
          <div>
            <label htmlFor="customReason" className="block text-sm font-medium text-gray-700 mb-2">
              Optional: Additional Message for Applicants
            </label>
            <textarea
              id="customReason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Add a custom message to include in the notification (optional)"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be appended to the AI-generated re-routing explanation
            </p>
          </div>

          {/* Action Summary */}
          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-900">
              <strong>Action Summary:</strong> Re-route {pendingCount} {pendingCount === 1 ? 'applicant' : 'applicants'}{' '}
              from <strong>"{jobTitle}"</strong> to AI-matched alternative positions
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Confirm Re-routing
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
