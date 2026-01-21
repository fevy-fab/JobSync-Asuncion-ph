'use client';

import React, { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';

import type { EducationalBackground } from '@/types/pds.types';

import { PDFOverlayRenderer } from '../overlay/PDFOverlayRenderer';
import { EDUCATIONAL_BACKGROUND_PAGE1_FIELDS, PDS_PAGE_ASPECT } from '../overlay/pdsOverlayConfigs';

type Props = {
  data?: EducationalBackground[];
  onChange: (data: EducationalBackground[]) => void;
};

const LEVELS: EducationalBackground['level'][] = [
  'Elementary',
  'Secondary',
  'Vocational/Trade Course',
  'College',
  'Graduate Studies',
];

type FormShape = {
  items: EducationalBackground[];
};

const makeEmptyRow = (level: EducationalBackground['level']): EducationalBackground => ({
  level,
  nameOfSchool: '',
  basicEducationDegreeCourse: '',
  periodOfAttendance: { from: '', to: '' },
  highestLevelUnitsEarned: '',
  yearGraduated: '',
  scholarshipAcademicHonors: '',
});

const hasAnyData = (row: EducationalBackground) => {
  return (
    (row.nameOfSchool || '').trim() ||
    (row.basicEducationDegreeCourse || '').trim() ||
    (row.periodOfAttendance?.from || '').trim() ||
    (row.periodOfAttendance?.to || '').trim() ||
    (row.highestLevelUnitsEarned || '').trim() ||
    (row.yearGraduated || '').trim() ||
    (row.scholarshipAcademicHonors || '').trim()
  );
};

export const EducationalBackgroundOverlayForm: React.FC<Props> = ({ data, onChange }) => {
  const { control, watch, reset } = useForm<FormShape>({
    defaultValues: {
      items: LEVELS.map((lvl) => {
        const existing = (data || []).find((d) => d.level === lvl);
        return existing ? { ...makeEmptyRow(lvl), ...existing } : makeEmptyRow(lvl);
      }),
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!data) return;
    reset({
      items: LEVELS.map((lvl) => {
        const existing = data.find((d) => d.level === lvl);
        return existing ? { ...makeEmptyRow(lvl), ...existing } : makeEmptyRow(lvl);
      }),
    });
  }, [data, reset]);

  const watchedItems = watch('items');

  const previousDataRef = useRef<string>('');
  useEffect(() => {
    const currentData = JSON.stringify(watchedItems);
    if (currentData !== previousDataRef.current) {
      previousDataRef.current = currentData;

      // ✅ Emit same shape as old form: EducationalBackground[]
      // Only include rows that actually have data
      const cleaned = (watchedItems || [])
        .map((r, idx) => ({ ...r, level: LEVELS[idx] }))
        .filter(hasAnyData);

      onChange(cleaned);
    }
  }, [watchedItems, onChange]);

  const inputBase =
    'w-full h-full bg-transparent outline-none px-1 text-[12px] leading-none ' +
    'border border-transparent focus:border-[#22A555] focus:bg-white/70 rounded';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">Section III: Educational Background</h3>
        <p className="text-sm text-gray-600">
          Fill directly on the form. This overlays inputs on the official PDS layout (Page 1).
        </p>
      </div>

      <PDFOverlayRenderer
        imageSrc="/pds/page1.png"
        aspectRatio={PDS_PAGE_ASPECT.page1}
        fields={EDUCATIONAL_BACKGROUND_PAGE1_FIELDS}
        renderField={(f) => (
          <Controller
            name={f.name as any}
            control={control}
            render={({ field }) => (
              <input
                type={f.type}
                value={(field.value ?? '') as any}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={f.placeholder}
                className={inputBase}
              />
            )}
          />
        )}
      />
    </div>
  );
};
