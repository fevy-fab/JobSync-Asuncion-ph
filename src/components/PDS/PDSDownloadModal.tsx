'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import {
  FileText,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  FileBadge,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';

interface PDSDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdsId: string;
}

export function PDSDownloadModal({ isOpen, onClose, pdsId }: PDSDownloadModalProps) {
  const { showToast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<'csc' | 'modern' | 'official' | 'excel'>('csc');
  const [includeSignature, setIncludeSignature] = useState(false);
  const [useCurrentDate, setUseCurrentDate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Ownership-based logic (not role-based)
  const [isOwnPDS, setIsOwnPDS] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pds } = await supabase
        .from('applicant_pds')
        .select('user_id')
        .eq('id', pdsId)
        .single();

      if (pds?.user_id === user.id) {
        setIsOwnPDS(true);
      } else {
        setIsOwnPDS(false);
      }
    };

    if (isOpen) checkOwnership();
  }, [pdsId, isOpen]);

  // Reset options every time modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('csc');
      setIncludeSignature(false);
      setUseCurrentDate(false);
    }
  }, [isOpen]);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const params = new URLSearchParams({
        format: selectedFormat,
        includeSignature: includeSignature.toString(),
        useCurrentDate: useCurrentDate.toString(),
      });

      const response = await fetch(`/api/pds/${pdsId}/download?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to download PDS');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/i);
        if (match && match[1]) filename = match[1];
      }

      if (!filename) {
        const dateStr = new Date().toISOString().split('T')[0];
        filename =
          selectedFormat === 'excel'
            ? `PDS_${dateStr}.xlsx`
            : `PDS_${selectedFormat.toUpperCase()}_${dateStr}.pdf`;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(
        `PDS downloaded successfully as ${
          selectedFormat === 'excel' ? 'Excel' : 'PDF'
        }!`,
        'success'
      );
      onClose();
    } catch (error) {
      console.error('Error downloading PDS:', error);
      showToast('Failed to download PDS. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Download Personal Data Sheet"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Format:</h3>
          <div className={`grid ${isOwnPDS ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
            {/* CSC */}
            <button
              onClick={() => setSelectedFormat('csc')}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'csc'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedFormat === 'csc' ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                >
                  <FileText
                    className={`w-6 h-6 ${
                      selectedFormat === 'csc' ? 'text-white' : 'text-gray-600'
                    }`}
                  />
                </div>
                <h4 className="font-semibold text-gray-900">Boxed-based PDS (PDF)</h4>
                <p className="text-xs text-gray-500">Structured traditional layout</p>
                {selectedFormat === 'csc' && (
                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-green-500" />
                )}
              </div>
            </button>

            {/* Modern */}
            <button
              onClick={() => setSelectedFormat('modern')}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'modern'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedFormat === 'modern' ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                >
                  <FileText
                    className={`w-6 h-6 ${
                      selectedFormat === 'modern' ? 'text-white' : 'text-gray-600'
                    }`}
                  />
                </div>
                <h4 className="font-semibold text-gray-900">Modern PDS (PDF)</h4>
                <p className="text-xs text-gray-500">Clean, simple table design</p>
                {selectedFormat === 'modern' && (
                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-blue-500" />
                )}
              </div>
            </button>

            {/* Official */}
            <button
              onClick={() => setSelectedFormat('official')}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'official'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedFormat === 'official' ? 'bg-purple-500' : 'bg-gray-200'
                  }`}
                >
                  <FileBadge
                    className={`w-6 h-6 ${
                      selectedFormat === 'official' ? 'text-white' : 'text-gray-600'
                    }`}
                  />
                </div>
                <h4 className="font-semibold text-gray-900">Official CS PDS (PDF)</h4>
                <p className="text-xs text-gray-600 mt-1">
                  CSC Form No. 212, Revised 2025
                </p>
                {selectedFormat === 'official' && (
                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-purple-500" />
                )}
              </div>
            </button>

            {/* Excel (only if own PDS) */}
            {isOwnPDS && (
              <button
                onClick={() => setSelectedFormat('excel')}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  selectedFormat === 'excel'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedFormat === 'excel' ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                  >
                    <FileSpreadsheet
                      className={`w-6 h-6 ${
                        selectedFormat === 'excel' ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                  </div>
                  <h4 className="font-semibold text-gray-900">Official CS PDS (Excel)</h4>
                  <p className="text-xs text-gray-500">For government submission</p>
                  {selectedFormat === 'excel' && (
                    <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-teal-500" />
                  )}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Download Options */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Download Options:</h3>
          <div className="space-y-2">
            {selectedFormat !== 'excel' && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={(e) => setIncludeSignature(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Include Digital Signature</span>
              </label>
            )}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCurrentDate}
                onChange={(e) => setUseCurrentDate(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                Use Current Date (instead of saved PDS date)
              </span>
            </label>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            {selectedFormat === 'csc'
              ? 'Box-based PDS Form'
              : selectedFormat === 'modern'
              ? 'Modern Table Format'
              : selectedFormat === 'official'
              ? 'Official Civil Service Form (PDF)'
              : 'Official Excel Format'}
          </h4>
          <p className="text-xs text-gray-600">
            {selectedFormat === 'official'
              ? 'Official government PDF version (CS Form No. 212, Revised 2025) suitable for direct submission.'
              : selectedFormat === 'csc'
              ? 'Structured traditional form with defined boxes and sections for formal submissions.'
              : selectedFormat === 'modern'
              ? 'Streamlined table layout optimized for readability and printing.'
              : 'Official government Excel version (CS Form No. 212, Revised 2025) suitable for HR submission and electronic records.'}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex-1 flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ${
              selectedFormat === 'excel'
                ? 'bg-teal-600 hover:bg-teal-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Download className="w-4 h-4" />
            {isDownloading
              ? 'Downloading...'
              : `Download ${selectedFormat === 'excel' ? 'Excel' : 'PDF'}`}
          </button>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Cancel
          </button>
        </div>

        <div className="text-xs text-gray-500 italic">
          <p>
            Note: The {selectedFormat === 'excel' ? 'Excel file' : 'PDF'} will be generated
            according to your selected format and options.
          </p>
        </div>
      </div>
    </Modal>
  );
}
  