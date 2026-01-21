'use client';

import React, { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { PersonalInformation } from '@/types/pds.types';
import { personalInformationSchema } from '@/lib/pds/validation';
import { formatPhilippinePhone } from '@/lib/utils/phoneFormatter';

import { PDFOverlayRenderer } from '../overlay/PDFOverlayRenderer';
import { PERSONAL_INFO_PAGE1_FIELDS, PDS_PAGE_ASPECT } from '../overlay/pdsOverlayConfigs';

type Props = {
  data?: PersonalInformation;
  onChange: (data: PersonalInformation) => void;
};

export const PersonalInformationOverlayForm: React.FC<Props> = ({ data, onChange }) => {
  const {
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PersonalInformation>({
    resolver: zodResolver(personalInformationSchema),
    defaultValues: data || {
      citizenship: 'Filipino',
      civilStatus: 'Single',
      sexAtBirth: 'Male',
      residentialAddress: {
        barangay: '',
        cityMunicipality: '',
        province: '',
        zipCode: '',
      },
      // ✅ keep object but NO sameAsResidential logic
      permanentAddress: {},
    },
    mode: 'onBlur',
  });

  // Sync form fields with data prop changes
  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const watchedData = watch();
  const citizenship = watch('citizenship');
  const civilStatus = watch('civilStatus');

  // Update parent component when form changes
  const previousDataRef = useRef<string>('');
  useEffect(() => {
    const currentData = JSON.stringify(watchedData);
    if (currentData !== previousDataRef.current) {
      previousDataRef.current = currentData;
      onChange(watchedData);
    }
  }, [watchedData, onChange]);

  const inputBase =
    'w-full h-full bg-transparent outline-none px-1 text-[12px] leading-none ' +
    'border border-transparent focus:border-[#22A555] focus:bg-white/70 rounded';

  const checkboxWrap = 'w-full h-full flex items-center justify-center';

  const CheckboxBox = ({ checked }: { checked: boolean }) => (
    <div className="w-full h-full border border-gray-700 bg-white flex items-center justify-center">
      {checked ? <div className="w-[70%] h-[70%] bg-black" /> : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">Section I: Personal Information</h3>
        <p className="text-sm text-gray-600">
          Fill directly on the form. This overlays inputs on the official PDS layout.
        </p>
      </div>

      <PDFOverlayRenderer
        imageSrc="/pds/page1.png"
        aspectRatio={PDS_PAGE_ASPECT.page1}
        fields={PERSONAL_INFO_PAGE1_FIELDS}
        renderField={(f) => {
          // ✅ Checkbox:
          // - radio-like checkboxValue for sex/civil/citizenship
          // - boolean checkbox fallback (if you add any in future)
          if (f.type === 'checkbox') {
            return (
              <Controller
                name={f.name as any}
                control={control}
                render={({ field }) => {
                  // Radio-like checkbox storing string
                  if (f.checkboxValue) {
                    // Hide dual citizenship type + country unless Dual Citizenship selected
                    if (
                      (f.name === 'dualCitizenshipType' || f.name === 'dualCitizenshipCountry') &&
                      citizenship !== 'Dual Citizenship'
                    ) {
                      return null;
                    }

                    const isChecked = field.value === f.checkboxValue;

                    const onToggle = () => {
                      field.onChange(f.checkboxValue);

                      // Cleanup rules (same behavior as before)
                      if (f.name === 'citizenship') {
                        if (f.checkboxValue === 'Filipino') {
                          setValue('dualCitizenshipType', undefined as any);
                          setValue('dualCitizenshipCountry', undefined as any);
                        }
                      }

                      if (f.name === 'civilStatus') {
                        if (f.checkboxValue !== 'Other/s') {
                          setValue('civilStatusOthers', undefined as any);
                        }
                      }
                    };

                    return (
                      <div className={checkboxWrap}>
                        <button
                          type="button"
                          onClick={onToggle}
                          className="w-full h-full bg-transparent"
                          aria-pressed={isChecked}
                        >
                          <CheckboxBox checked={isChecked} />
                        </button>
                      </div>
                    );
                  }

                  // Boolean checkbox (not used currently)
                  const checked = !!field.value;
                  return (
                    <div className={checkboxWrap}>
                      <button
                        type="button"
                        onClick={() => field.onChange(!checked)}
                        className="w-full h-full bg-transparent"
                        aria-pressed={checked}
                      >
                        <CheckboxBox checked={checked} />
                      </button>
                    </div>
                  );
                }}
              />
            );
          }

          // ✅ Hide civilStatusOthers unless Other/s selected
          if (f.name === 'civilStatusOthers' && civilStatus !== 'Other/s') {
            return null;
          }

          // ✅ Hide dualCitizenshipCountry unless Dual Citizenship selected
          if (f.name === 'dualCitizenshipCountry' && citizenship !== 'Dual Citizenship') {
            return null;
          }

          // Textarea
          if (f.type === 'textarea') {
            return (
              <Controller
                name={f.name as any}
                control={control}
                render={({ field }) => (
                  <textarea
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder={f.placeholder}
                    className={inputBase + ' resize-none'}
                  />
                )}
              />
            );
          }

          // Text/Date/Number
          return (
            <Controller
              name={f.name as any}
              control={control}
              render={({ field }) => (
                <input
                  type={f.type}
                  value={(field.value ?? '') as any}
                  onChange={(e) => {
                    if (f.type === 'number') {
                      const n = parseFloat(e.target.value);
                      field.onChange(Number.isNaN(n) ? undefined : n);
                      return;
                    }

                    if (f.name === 'mobileNo') {
                      field.onChange(formatPhilippinePhone(e.target.value));
                      return;
                    }

                    field.onChange(e.target.value);
                  }}
                  placeholder={f.placeholder}
                  className={inputBase}
                />
              )}
            />
          );
        }}
      />

      {Object.keys(errors || {}).length > 0 && (
        <div className="text-xs text-red-600">
          Some fields have validation errors. (We can add per-field error tooltips later if you want.)
        </div>
      )}
    </div>
  );
};
