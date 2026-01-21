'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { FamilyBackground } from '@/types/pds.types';
import { familyBackgroundSchema } from '@/lib/pds/validation';

import { PDFOverlayRenderer } from '../overlay/PDFOverlayRenderer';
import { FAMILY_BACKGROUND_PAGE1_FIELDS, PDS_PAGE_ASPECT } from '../overlay/pdsOverlayConfigs';

type Props = {
  data?: FamilyBackground;
  onChange: (data: FamilyBackground) => void;
};

export const FamilyBackgroundOverlayForm: React.FC<Props> = ({ data, onChange }) => {
  const {
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FamilyBackground>({
    resolver: zodResolver(familyBackgroundSchema),
    defaultValues: data || {
      spouse: {
        surname: '',
        firstName: '',
        middleName: '',
        // ✅ optional field used by overlay
        nameExtension: '',
        occupation: '',
        employerBusinessName: '',
        businessAddress: '',
        telephoneNo: '',
      } as any,
      children: [],
      father: { surname: '', firstName: '', middleName: '' },
      mother: { surname: '', firstName: '', middleName: '' },
    },
    mode: 'onBlur',
  });

  // children array (we render up to 12 overlay rows)
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'children',
  });

  // Ensure children array has at least 12 items so overlay always has inputs
  useEffect(() => {
    const current = watch('children') || [];
    if (current.length < 12) {
      const filled = [...current];
      while (filled.length < 12) filled.push({ fullName: '', dateOfBirth: '' });
      replace(filled as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when data changes
  useEffect(() => {
    if (data) {
      const incomingChildren = data.children || [];
      const normalized = [...incomingChildren];
      while (normalized.length < 12) normalized.push({ fullName: '', dateOfBirth: '' });
      reset({
        ...data,
        children: normalized,
      });
    }
  }, [data, reset]);

  const watchedData = watch();

  const previousDataRef = useRef<string>('');
  useEffect(() => {
    const currentData = JSON.stringify(watchedData);
    if (currentData !== previousDataRef.current) {
      previousDataRef.current = currentData;

      // Optional: trim completely empty children rows before saving upstream
      const trimmedChildren = (watchedData.children || []).filter(
        (c) => (c?.fullName || '').trim() !== '' || (c?.dateOfBirth || '').trim() !== ''
      );

      onChange({
        ...watchedData,
        children: trimmedChildren,
      });
    }
  }, [watchedData, onChange]);

  const inputBase =
    'w-full h-full bg-transparent outline-none px-1 text-[12px] leading-none ' +
    'border border-transparent focus:border-[#22A555] focus:bg-white/70 rounded';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">Section II: Family Background</h3>
        <p className="text-sm text-gray-600">
          Fill directly on the form. This overlays inputs on the official PDS layout (Page 1).
        </p>
      </div>

      <PDFOverlayRenderer
        imageSrc="/pds/page1.png"
        aspectRatio={PDS_PAGE_ASPECT.page1}
        fields={FAMILY_BACKGROUND_PAGE1_FIELDS}
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

      {Object.keys(errors || {}).length > 0 && (
        <div className="text-xs text-red-600">
          Some fields have validation errors. (We can add error highlighting later.)
        </div>
      )}
    </div>
  );
};
