'use client';

/**
 * Certificate Template Modal Component
 *
 * Simplified modal for selecting certificate templates
 * No live preview - users can preview via "Preview in New Tab" in main modal
 */

import React, { useState } from 'react';
import { CertificateTemplate } from '@/types/certificate.types';
import { getTemplateMetadata } from '@/lib/certificates/certificateGenerator';
import TemplateSelector from './TemplateSelector';

interface CertificateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: CertificateTemplate;
  onTemplateChange: (template: CertificateTemplate) => void;
}

export default function CertificateTemplateModal({
  isOpen,
  onClose,
  selectedTemplate,
  onTemplateChange,
}: CertificateTemplateModalProps) {
  const [tempSelectedTemplate, setTempSelectedTemplate] = useState<CertificateTemplate>(selectedTemplate);

  if (!isOpen) return null;

  const handleTemplateChange = (template: CertificateTemplate) => {
    setTempSelectedTemplate(template);
  };

  const handleConfirm = () => {
    onTemplateChange(tempSelectedTemplate);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedTemplate(selectedTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Select Certificate Template</h2>
            <p className="text-sm text-green-100 mt-1">
              Choose a template design for your training certificates
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-white hover:text-green-200 transition-colors p-2"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Templates</h3>
            <TemplateSelector
              selectedTemplate={tempSelectedTemplate}
              onTemplateChange={handleTemplateChange}
              showPreview={true}
            />

            {/* Template Details */}
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
              <h4 className="font-semibold text-base text-gray-900 mb-3">
                {getTemplateMetadata(tempSelectedTemplate).name}
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                <div>
                  <span className="font-medium block text-gray-700">Style</span>
                  {getTemplateMetadata(tempSelectedTemplate).style}
                </div>
                <div>
                  <span className="font-medium block text-gray-700">Colors</span>
                  {getTemplateMetadata(tempSelectedTemplate).colorScheme}
                </div>
                <div>
                  <span className="font-medium block text-gray-700">Orientation</span>
                  {getTemplateMetadata(tempSelectedTemplate).orientation}
                </div>
              </div>
              <p className="text-sm text-gray-700">
                {getTemplateMetadata(tempSelectedTemplate).description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {tempSelectedTemplate !== selectedTemplate && (
              <span className="text-orange-600 font-medium">
                ⚠ Template changed - click "Confirm Selection" to apply
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
