'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type {
  PersonalInformation,
  FamilyBackground,
  EducationalBackground,
} from '@/types/pds.types';

import {
  personalInformationSchema,
  familyBackgroundSchema,
  educationalBackgroundSchema,
} from '@/lib/pds/validation';

import { PDFOverlayRenderer, type OverlayField } from '../overlay/PDFOverlayRenderer';
import { PAGE1_STEP1_FIELDS, PDS_PAGE_ASPECT } from '../overlay/pdsOverlayConfigs';

type Props = {
  personalInfo?: PersonalInformation;
  familyBackground?: FamilyBackground;
  educationalBackground?: EducationalBackground[];

  onPersonalChange: (data: PersonalInformation) => void;
  onFamilyChange: (data: FamilyBackground) => void;
  onEducationChange: (data: EducationalBackground[]) => void;
};

type EducationFormShape = { items: EducationalBackground[] };

const EDUCATION_LEVELS: EducationalBackground['level'][] = [
  'Elementary',
  'Secondary',
  'Vocational/Trade Course',
  'College',
  'Graduate Studies',
];

const makeEmptyEducationRows = (): EducationalBackground[] =>
  EDUCATION_LEVELS.map((level) => ({
    level,
    nameOfSchool: '',
    basicEducationDegreeCourse: '',
    periodOfAttendance: { from: '', to: '' },
    highestLevelUnitsEarned: '',
    yearGraduated: '',
    scholarshipAcademicHonors: '',
  }));

const hasAnyEducationValue = (e: EducationalBackground) => {
  return Boolean(
    e.nameOfSchool ||
      e.basicEducationDegreeCourse ||
      e.periodOfAttendance?.from ||
      e.periodOfAttendance?.to ||
      e.highestLevelUnitsEarned ||
      e.yearGraduated ||
      e.scholarshipAcademicHonors
  );
};

const makeFamilyDefaults = (): FamilyBackground => ({
  spouse: {
    surname: '',
    firstName: '',
    middleName: '',
    occupation: '',
    employerBusinessName: '',
    businessAddress: '',
    telephoneNo: '',
  },
  children: Array.from({ length: 12 }).map(() => ({ fullName: '', dateOfBirth: '' })),
  father: { surname: '', firstName: '', middleName: '' },
  mother: { surname: '', firstName: '', middleName: '' },
});

export const Page1OverlayForm: React.FC<Props> = ({
  personalInfo,
  familyBackground,
  educationalBackground,
  onPersonalChange,
  onFamilyChange,
  onEducationChange,
}) => {
  // -------------------------
  // PERSONAL FORM
  // -------------------------
  const personalForm = useForm<PersonalInformation>({
    resolver: zodResolver(personalInformationSchema),
    defaultValues: personalInfo || {
      citizenship: 'Filipino',
      civilStatus: 'Single',
      sexAtBirth: 'Male',
      residentialAddress: {
        barangay: '',
        cityMunicipality: '',
        province: '',
        zipCode: '',
      },
      permanentAddress: {},
    },
    mode: 'onBlur',
  });

  const citizenship = personalForm.watch('citizenship');
  const civilStatus = personalForm.watch('civilStatus');

  // ✅ FIX: Prevent reset loops by only resetting when incoming data actually changed
  const personalLoadedRef = useRef<string>('');
  useEffect(() => {
    const incoming = JSON.stringify(personalInfo || {});
    if (!personalInfo) return;

    if (incoming === personalLoadedRef.current) return;
    personalLoadedRef.current = incoming;

    personalForm.reset(personalInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalInfo]);

  // ✅ FIX: Use watch subscription instead of useEffect([watch()])
  const personalPrev = useRef<string>('');
  useEffect(() => {
    const sub = personalForm.watch((value) => {
      const current = JSON.stringify(value);
      if (current !== personalPrev.current) {
        personalPrev.current = current;
        onPersonalChange(value as PersonalInformation);
      }
    });
    return () => sub.unsubscribe();
  }, [personalForm, onPersonalChange]);

  // -------------------------
  // FAMILY FORM
  // -------------------------
  const familyForm = useForm<FamilyBackground>({
    resolver: zodResolver(familyBackgroundSchema),
    defaultValues: familyBackground || makeFamilyDefaults(),
    mode: 'onBlur',
  });

  // ✅ FIX: Prevent reset loops by guarding incoming familyBackground
  const familyLoadedRef = useRef<string>('');
  useEffect(() => {
    if (!familyBackground) return;

    const incomingStr = JSON.stringify(familyBackground || {});
    if (incomingStr === familyLoadedRef.current) return;
    familyLoadedRef.current = incomingStr;

    // Ensure 12 children slots exist
    const incoming = {
      ...makeFamilyDefaults(),
      ...familyBackground,
    };
    const kids = (familyBackground.children || []).slice(0, 12);
    incoming.children = [
      ...kids,
      ...Array.from({ length: Math.max(0, 12 - kids.length) }).map(() => ({
        fullName: '',
        dateOfBirth: '',
      })),
    ];
    familyForm.reset(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyBackground]);

  // ✅ FIX: watch subscription + stable compare + clean children before bubbling
  const familyPrev = useRef<string>('');
  useEffect(() => {
    const sub = familyForm.watch((value) => {
      const current = JSON.stringify(value);
      if (current !== familyPrev.current) {
        familyPrev.current = current;

        const v = value as FamilyBackground;

        // Save only filled children rows (keep same shape as old form)
        const cleanedChildren = (v.children || []).filter((c) => c?.fullName || c?.dateOfBirth);

        onFamilyChange({
          ...v,
          children: cleanedChildren,
        });
      }
    });

    return () => sub.unsubscribe();
  }, [familyForm, onFamilyChange]);

  // -------------------------
  // EDUCATION FORM (5 fixed rows)
  // -------------------------
  const educationResolver = useMemo(() => {
    // Keep your existing schema rules but on array wrapper
    const arraySchema = z.array(educationalBackgroundSchema);
    return zodResolver(z.object({ items: arraySchema }));
  }, []);

  const educationForm = useForm<EducationFormShape>({
    resolver: educationResolver,
    defaultValues: {
      items: (() => {
        const base = makeEmptyEducationRows();

        if (!educationalBackground || educationalBackground.length === 0) return base;

        // Merge by "level" when available
        for (const entry of educationalBackground) {
          const idx = EDUCATION_LEVELS.indexOf(entry.level);
          if (idx >= 0) base[idx] = { ...base[idx], ...entry };
        }
        return base;
      })(),
    },
    mode: 'onBlur',
  });

  // ✅ FIX: Prevent reset loops by guarding incoming educationalBackground
  const eduLoadedRef = useRef<string>('');
  useEffect(() => {
    const incomingStr = JSON.stringify(educationalBackground || []);
    if (incomingStr === eduLoadedRef.current) return;
    eduLoadedRef.current = incomingStr;

    const base = makeEmptyEducationRows();
    if (!educationalBackground || educationalBackground.length === 0) {
      educationForm.reset({ items: base });
      return;
    }
    for (const entry of educationalBackground) {
      const idx = EDUCATION_LEVELS.indexOf(entry.level);
      if (idx >= 0) base[idx] = { ...base[idx], ...entry };
    }
    educationForm.reset({ items: base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [educationalBackground]);

  // ✅ FIX: watch subscription + clean before bubbling
  const eduPrev = useRef<string>('');
  useEffect(() => {
    const sub = educationForm.watch((value) => {
      const items = (value as any)?.items as EducationalBackground[] | undefined;
      const current = JSON.stringify(items || []);
      if (current !== eduPrev.current) {
        eduPrev.current = current;

        // Only save rows that have at least one value
        const cleaned = (items || []).filter(hasAnyEducationValue);
        onEducationChange(cleaned);
      }
    });

    return () => sub.unsubscribe();
  }, [educationForm, onEducationChange]);

  // -------------------------
  // Shared UI styles
  // -------------------------
  const inputBase =
    'w-full h-full bg-transparent outline-none px-1 text-[12px] leading-none ' +
    'border border-transparent focus:border-[#22A555] focus:bg-white/70 rounded';

  const checkboxWrap = 'w-full h-full flex items-center justify-center';

  /**
   * ✅ UPDATED: Match Page4Overlay checkbox look:
   * - Black filled box
   * - White thick tick
   * - No extra border (PDF already has printed checkbox border)
   */
  const CheckboxBox = ({ checked }: { checked: boolean }) => (
    <div className="w-full h-full flex items-center justify-center">
      {checked ? (
        <div className="w-[88%] h-[88%] bg-black flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[85%] h-[85%]" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              fill="none"
              stroke="white"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : null}
    </div>
  );

  // Helper to choose which RHF control to use
  const pickControl = (f: OverlayField) => {
    if (f.formKey === 'family') return familyForm.control;
    if (f.formKey === 'education') return educationForm.control;
    return personalForm.control; // default
  };

  const pickSetValue = (f: OverlayField) => {
    if (f.formKey === 'family') return familyForm.setValue as any;
    if (f.formKey === 'education') return educationForm.setValue as any;
    return personalForm.setValue as any;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">
          Step 1: Personal, Family & Education
        </h3>
        <p className="text-sm text-gray-600">
          Fill directly on the official PDS Page 1.
        </p>
      </div>

      <PDFOverlayRenderer
        imageSrc="/pds/page1.png"
        aspectRatio={PDS_PAGE_ASPECT.page1}
        fields={PAGE1_STEP1_FIELDS}
        renderField={(f) => {
          const control = pickControl(f);
          const setValue = pickSetValue(f);

          // ==========================
          // CHECKBOX (boolean or string)
          // ==========================
          if (f.type === 'checkbox') {
            const checkboxValue = f.checkboxValue;

            return (
              <Controller
                name={f.name as any}
                control={control}
                render={({ field }) => {
                  // Radio-like string checkbox
                  if (checkboxValue) {
                    // Hide dual fields unless Dual Citizenship selected (personal form only)
                    if (
                      (f.name === 'dualCitizenshipType' || f.name === 'dualCitizenshipCountry') &&
                      citizenship !== 'Dual Citizenship'
                    ) {
                      return null;
                    }

                    const isChecked = field.value === checkboxValue;

                    const onToggle = () => {
                      field.onChange(checkboxValue);

                      // Cleanup logic matches your old behavior
                      if (f.formKey !== 'family' && f.formKey !== 'education') {
                        if (f.name === 'citizenship' && checkboxValue === 'Filipino') {
                          setValue('dualCitizenshipType', undefined as any);
                          setValue('dualCitizenshipCountry', undefined as any);
                        }
                        if (f.name === 'civilStatus' && checkboxValue !== 'Others') {
                          setValue('civilStatusOthers', undefined as any);
                        }
                      }
                    };

                    return (
                      <div className={checkboxWrap}>
                        <button
                          type="button"
                          onClick={onToggle}
                          className="w-full h-full bg-transparent cursor-pointer"
                          aria-pressed={isChecked}
                        >
                          <CheckboxBox checked={isChecked} />
                        </button>
                      </div>
                    );
                  }

                  // Boolean checkbox (match Page4 look)
                  const checked = !!field.value;
                  return (
                    <div className={checkboxWrap}>
                      <button
                        type="button"
                        onClick={() => field.onChange(!checked)}
                        className="w-full h-full bg-transparent cursor-pointer"
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

          // ==========================
          // TEXT (hide conditional personal fields)
          // ==========================
          if (f.name === 'civilStatusOthers' && civilStatus !== 'Others') {
            return null;
          }
          if (f.name === 'dualCitizenshipCountry' && citizenship !== 'Dual Citizenship') {
            return null;
          }

          // Select (if used later)
          if (f.type === 'select') {
            return (
              <Controller
                name={f.name as any}
                control={control}
                render={({ field }) => (
                  <select value={field.value || ''} onChange={field.onChange} className={inputBase}>
                    <option value="" />
                    {(f.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            );
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
    </div>
  );
};
