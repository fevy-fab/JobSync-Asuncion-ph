'use client';

import React from 'react';

export type OverlayFieldType = 'text' | 'date' | 'number' | 'select' | 'checkbox' | 'textarea';

export type OverlayField = {
  key: string; // unique id for react key
  name: string; // react-hook-form path (e.g. "surname", "children.0.fullName")
  type: OverlayFieldType;
  required?: boolean;

  // Position in percentages relative to the overlay container
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;

  placeholder?: string;
  options?: { label: string; value: string }[]; // for select
  className?: string;
  requiredWhen?: (allValues: any) => boolean;

  /**
   * MULTI-FORM OVERLAY SUPPORT
   * Page 1: personal/family/education
   * Page 2: eligibility/work
   * Page 3: voluntary/training/other
   */
  formKey?: 'personal' | 'family' | 'education' | 'eligibility' | 'work' | 'voluntary' | 'training' | 'other';

  /**
   * When checkbox stores a STRING (radio-like behavior) instead of boolean.
   */
  checkboxValue?: string;

  label?: string;
};

type Props = {
  imageSrc: string;
  aspectRatio: number; // width / height
  fields: OverlayField[];
  renderField: (field: OverlayField) => React.ReactNode;
};

export const PDFOverlayRenderer: React.FC<Props> = ({
  imageSrc,
  aspectRatio,
  fields,
  renderField,
}) => {
  return (
    <div className="w-full">
      <div
        className="relative w-full bg-white border border-gray-200 rounded-lg overflow-hidden"
        style={{ aspectRatio }}
      >
        {/* Background page image */}
        <img
          src={imageSrc}
          alt="PDS Form Page"
          className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
          draggable={false}
        />

        {/* Overlay layer */}
        <div className="absolute inset-0">
          {fields.map((f) => (
            <div
              key={f.key}
              className="absolute"
              style={{
                left: `${f.xPct}%`,
                top: `${f.yPct}%`,
                width: `${f.wPct}%`,
                height: `${f.hPct}%`,
              }}
            >
              {renderField(f)}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
