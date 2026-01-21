'use client';

/**
 * Template Selector Component
 *
 * Displays all 5 certificate templates as preview cards for selection
 * Used in program creation/editing and certificate generation
 */

import React from 'react';
import { CertificateTemplate } from '@/types/certificate.types';
import { getTemplateMetadata } from '@/lib/certificates/certificateGenerator';

interface TemplateSelectorProps {
  selectedTemplate: CertificateTemplate;
  onTemplateChange: (template: CertificateTemplate) => void;
  showPreview?: boolean;
}

const TEMPLATE_PREVIEWS = {
  classic: (
    <div className="h-40 bg-gradient-to-br from-amber-50 to-yellow-50 border-4 border-green-700 rounded-lg p-4 flex flex-col items-center justify-center">
      <div className="w-full border-t-2 border-b-2 border-yellow-600 py-2 text-center">
        <p className="text-lg font-serif font-bold text-green-800">CERTIFICATE</p>
        <p className="text-xs font-serif text-green-700">OF TRAINING COMPLETION</p>
      </div>
      <div className="mt-2 text-center">
        <p className="text-xs font-serif italic text-gray-600">Classic Formal Style</p>
        <div className="flex gap-1 mt-2 justify-center">
          <div className="w-4 h-4 rounded-full bg-green-700 border-2 border-yellow-600"></div>
          <div className="w-4 h-4 rounded-full bg-yellow-600 border-2 border-green-700"></div>
        </div>
      </div>
    </div>
  ),
  modern: (
    <div className="h-40 bg-slate-50 border-2 border-blue-900 rounded-lg p-4 flex flex-col items-center justify-center relative">
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-yellow-600"></div>
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-yellow-600"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-yellow-600"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-yellow-600"></div>
      <div className="text-center">
        <p className="text-sm font-bold text-blue-900">CERTIFICATE OF COMPLETION</p>
        <div className="mt-2 h-px bg-yellow-600 w-1/2 mx-auto"></div>
        <p className="text-xs text-gray-600 mt-2">Modern Minimalist</p>
        <div className="mt-2 bg-amber-50 border border-yellow-600 rounded p-2">
          <p className="text-[10px] text-gray-700">Clean & Contemporary</p>
        </div>
      </div>
    </div>
  ),
  government: (
    <div className="h-40 bg-gray-50 border-4 border-blue-900 rounded-lg p-3 flex flex-col items-center">
      <div className="w-12 h-12 rounded-full bg-blue-900 border-4 border-yellow-500 flex items-center justify-center mb-2">
        <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
      </div>
      <div className="text-center flex-1 flex flex-col justify-center">
        <p className="text-xs font-bold text-blue-900">REPUBLIC OF THE PHILIPPINES</p>
        <p className="text-[10px] text-gray-700 mt-1">CERTIFICATE</p>
        <p className="text-[10px] text-gray-700">OF TRAINING COMPLETION</p>
        <div className="mt-2 border-t border-b border-yellow-600 py-1">
          <p className="text-[9px] text-gray-600">Government Official</p>
        </div>
      </div>
    </div>
  ),
  colorful: (
    <div className="h-40 bg-amber-50 border-4 border-rose-900 rounded-lg p-3 relative overflow-hidden">
      <div className="absolute top-1 left-1 text-yellow-700 text-xl">❖</div>
      <div className="absolute top-1 right-1 text-yellow-700 text-xl">❖</div>
      <div className="absolute bottom-1 left-1 text-yellow-700 text-xl">❖</div>
      <div className="absolute bottom-1 right-1 text-yellow-700 text-xl">❖</div>
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg font-bold text-rose-900">CERTIFICATE</p>
        <p className="text-xs font-bold text-rose-800">OF ACHIEVEMENT</p>
        <div className="mt-2 h-px bg-yellow-700 w-1/3 mx-auto"></div>
        <div className="mt-2 flex gap-1">
          <div className="w-3 h-3 rounded-full bg-rose-900 border border-yellow-700"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-700 border border-rose-900"></div>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">❖ CONGRATULATIONS! ❖</p>
      </div>
    </div>
  ),
  professional: (
    <div className="h-40 bg-white border-2 border-teal-500 rounded-lg p-4 flex flex-col items-center justify-center">
      <div className="flex gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-teal-500"></div>
        <div className="w-5 h-5 rounded-full bg-gray-400"></div>
        <div className="w-5 h-5 rounded-full bg-teal-300"></div>
      </div>
      <div className="flex-1 text-center">
        <p className="text-sm font-bold text-gray-800">CERTIFICATE OF COMPLETION</p>
        <div className="h-px bg-teal-500 w-20 mt-1 mx-auto"></div>
        <p className="text-[10px] text-gray-500 mt-2">Professional Training Certification</p>
        <div className="mt-2 bg-gray-50 border border-gray-200 p-2 rounded">
          <p className="text-[9px] text-gray-600">Professional Business</p>
        </div>
      </div>
    </div>
  ),
};

export default function TemplateSelector({
  selectedTemplate,
  onTemplateChange,
  showPreview = true,
}: TemplateSelectorProps) {
  const templates: CertificateTemplate[] = ['classic', 'modern', 'government', 'colorful', 'professional'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const metadata = getTemplateMetadata(template);
          const isSelected = selectedTemplate === template;

          return (
            <button
              key={template}
              type="button"
              onClick={() => onTemplateChange(template)}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${
                  isSelected
                    ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Template preview */}
              {showPreview && <div className="mb-3">{TEMPLATE_PREVIEWS[template]}</div>}

              {/* Template info */}
              <div className="text-left space-y-2">
                <h4
                  className={`font-semibold text-sm ${
                    isSelected ? 'text-green-700' : 'text-gray-900'
                  }`}
                >
                  {metadata.name}
                </h4>
                <p className="text-xs text-gray-600">{metadata.description}</p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                    {metadata.colorScheme}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                    {metadata.orientation}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                    {metadata.style}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected template summary */}
      {selectedTemplate && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Selected: {getTemplateMetadata(selectedTemplate).name}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                This template will be used for all certificates generated from this training program.
                You can preview the template before downloading.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
