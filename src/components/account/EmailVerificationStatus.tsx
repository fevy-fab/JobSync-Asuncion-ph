'use client';

import React, { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface EmailVerificationStatusProps {
  currentEmail: string;
  pendingEmail: string | null;
  onResend?: () => Promise<void>;
  onCancel?: () => Promise<void>;
}

/**
 * EmailVerificationStatus Component
 *
 * Displays email verification status when user has a pending email change.
 * Shows current email, pending new email, and verification instructions.
 */
export function EmailVerificationStatus({
  currentEmail,
  pendingEmail,
  onResend,
  onCancel,
}: EmailVerificationStatusProps) {
  const [resending, setResending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!pendingEmail) {
    return null;
  }

  const handleResend = async () => {
    if (!onResend) return;

    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;

    setCancelling(true);
    try {
      await onCancel();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Mail className="h-5 w-5 text-orange-600" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-orange-900">
              Email Verification Pending
            </h3>
            <div className="flex-1 border-t border-orange-200"></div>
          </div>

          <div className="space-y-3">
            {/* Current Email */}
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-gray-600">Current email:</span>{' '}
                <span className="font-medium text-gray-900">{currentEmail}</span>
              </div>
            </div>

            {/* Pending Email */}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-gray-600">New email (pending):</span>{' '}
                <span className="font-medium text-orange-900">{pendingEmail}</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-3 pl-6 text-sm text-gray-700 space-y-1">
              <p className="font-medium">To complete the email change:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Check your <strong>current email</strong> ({currentEmail}) for a confirmation link</li>
                <li>Check your <strong>new email</strong> ({pendingEmail}) for a confirmation link</li>
                <li>Click both confirmation links to verify the change</li>
              </ol>
              <p className="mt-2 text-xs text-gray-600 italic">
                Both emails must be confirmed before the change takes effect.
              </p>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2 flex-wrap">
              {onResend && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleResend}
                  loading={resending}
                  disabled={resending || cancelling}
                  icon={RefreshCw}
                  className="text-xs"
                >
                  {resending ? 'Resending...' : 'Resend Verification Emails'}
                </Button>
              )}

              {onCancel && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleCancel}
                  loading={cancelling}
                  disabled={resending || cancelling}
                  className="text-xs"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Email Change'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
