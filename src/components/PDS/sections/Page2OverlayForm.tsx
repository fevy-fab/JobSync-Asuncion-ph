'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { Eligibility, WorkExperience } from '@/types/pds.types';
import { eligibilitySchema, workExperienceSchema } from '@/lib/pds/validation';

import { PDFOverlayRenderer, type OverlayField } from '../overlay/PDFOverlayRenderer';
import { PAGE2_STEP2_FIELDS, PDS_PAGE_ASPECT } from '../overlay/pdsOverlayConfigs';

type Props = {
  eligibility?: Eligibility[];
  workExperience?: WorkExperience[];
  onEligibilityChange: (data: Eligibility[]) => void;
  onWorkChange: (data: WorkExperience[]) => void;
};

type EligibilityShape = { items: Eligibility[] };
type WorkShape = { items: WorkExperience[] };

const eligibilityArraySchema = z.array(eligibilitySchema);
const workArraySchema = z.array(workExperienceSchema);

// page2 limits (match overlay rows)
const ELIG_ROWS = 7;
const WORK_ROWS = 28;

const makeEmptyEligibilityRows = (): Eligibility[] =>
  Array.from({ length: ELIG_ROWS }).map(() => ({
    careerService: '',
    rating: '',
    dateOfExaminationConferment: '',
    placeOfExaminationConferment: '',
    licenseNumber: '',
    licenseValidity: '',
  }));

const makeEmptyWorkRows = (): WorkExperience[] =>
  Array.from({ length: WORK_ROWS }).map(() => ({
    positionTitle: '',
    departmentAgencyOfficeCompany: '',
    governmentService: false,
    periodOfService: { from: '', to: '' },
    monthlySalary: undefined,
    salaryGrade: '',
    statusOfAppointment: '',
  }));

const isEmptyEligibility = (e: Eligibility) =>
  !(
    e?.careerService ||
    e?.rating ||
    e?.dateOfExaminationConferment ||
    e?.placeOfExaminationConferment ||
    e?.licenseNumber ||
    e?.licenseValidity
  );

const isEmptyWork = (w: WorkExperience) =>
  !(
    w?.positionTitle ||
    w?.departmentAgencyOfficeCompany ||
    w?.periodOfService?.from ||
    w?.periodOfService?.to ||
    w?.monthlySalary ||
    w?.salaryGrade ||
    w?.statusOfAppointment ||
    w?.governmentService
  );

export const Page2OverlayForm: React.FC<Props> = ({
  eligibility,
  workExperience,
  onEligibilityChange,
  onWorkChange,
}) => {
  // -------------------------
  // ELIGIBILITY FORM
  // -------------------------
  const eligibilityResolver = useMemo(
    () => zodResolver(z.object({ items: eligibilityArraySchema })),
    []
  );

  const eligibilityForm = useForm<EligibilityShape>({
    resolver: eligibilityResolver,
    defaultValues: {
      items: makeEmptyEligibilityRows(),
    },
    mode: 'onBlur',
  });

  // ✅ prevent reset loop
  const eligLoadedRef = useRef<string>('');
  useEffect(() => {
    const incoming = JSON.stringify(eligibility || []);
    if (incoming === eligLoadedRef.current) return;
    eligLoadedRef.current = incoming;

    const base = makeEmptyEligibilityRows();
    const incomingRows = (eligibility || []).slice(0, ELIG_ROWS);
    for (let i = 0; i < incomingRows.length; i++) {
      base[i] = { ...base[i], ...incomingRows[i] };
    }
    eligibilityForm.reset({ items: base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibility]);

  // ✅ watch subscription (NO dependency loop)
  const eligPrev = useRef<string>('');
  useEffect(() => {
    const sub = eligibilityForm.watch((value) => {
      const items = (value as EligibilityShape)?.items || [];
      const current = JSON.stringify(items);

      if (current !== eligPrev.current) {
        eligPrev.current = current;
        const cleaned = items.filter((x) => !isEmptyEligibility(x));
        onEligibilityChange(cleaned);
      }
    });

    return () => sub.unsubscribe();
  }, [eligibilityForm, onEligibilityChange]);

  // -------------------------
  // WORK EXPERIENCE FORM
  // -------------------------
  const workResolver = useMemo(
    () => zodResolver(z.object({ items: workArraySchema })),
    []
  );

  const workForm = useForm<WorkShape>({
    resolver: workResolver,
    defaultValues: {
      items: makeEmptyWorkRows(),
    },
    mode: 'onBlur',
  });

  // ✅ prevent reset loop
  const workLoadedRef = useRef<string>('');
  useEffect(() => {
    const incoming = JSON.stringify(workExperience || []);
    if (incoming === workLoadedRef.current) return;
    workLoadedRef.current = incoming;

    const base = makeEmptyWorkRows();
    const incomingRows = (workExperience || []).slice(0, WORK_ROWS);
    for (let i = 0; i < incomingRows.length; i++) {
      base[i] = {
        ...base[i],
        ...incomingRows[i],
        periodOfService: {
          from: incomingRows[i]?.periodOfService?.from || '',
          to: incomingRows[i]?.periodOfService?.to || '',
        },
      };
    }
    workForm.reset({ items: base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workExperience]);

  // ✅ watch subscription
  const workPrev = useRef<string>('');
  useEffect(() => {
    const sub = workForm.watch((value) => {
      const items = (value as WorkShape)?.items || [];
      const current = JSON.stringify(items);

      if (current !== workPrev.current) {
        workPrev.current = current;
        const cleaned = items.filter((x) => !isEmptyWork(x));
        onWorkChange(cleaned);
      }
    });

    return () => sub.unsubscribe();
  }, [workForm, onWorkChange]);

  // -------------------------
  // Shared UI rendering
  // -------------------------
  const inputBase =
    'w-full h-full bg-transparent outline-none px-1 text-[12px] leading-none ' +
    'border border-transparent focus:border-[#22A555] focus:bg-white/70 rounded';

  const checkboxWrap = 'w-full h-full flex items-center justify-center';

  const pickControl = (f: OverlayField) => {
    if (f.formKey === 'eligibility') return eligibilityForm.control;
    return workForm.control;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">
          Step 2: Eligibility & Work Experience
        </h3>
        <p className="text-sm text-gray-600">
          Fill directly on the official PDS Page 2.
        </p>
      </div>

      <PDFOverlayRenderer
        imageSrc="/pds/page2.png"
        aspectRatio={PDS_PAGE_ASPECT.page2}
        fields={PAGE2_STEP2_FIELDS}
        renderField={(f) => {
          const control = pickControl(f);

          if (f.type === 'checkbox') {
            return (
              <Controller
                name={f.name as any}
                control={control}
                render={({ field }) => (
                  <div className={checkboxWrap}>
                    <input
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-4 h-4 accent-[#000000]"
                    />
                  </div>
                )}
              />
            );
          }

          return (
            <Controller
              name={f.name as any}
              control={control}
              render={({ field }) => (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
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
