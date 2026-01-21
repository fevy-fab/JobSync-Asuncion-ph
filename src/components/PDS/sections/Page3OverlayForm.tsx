/* =====================================================================================
   FILE: Page3OverlayForm.tsx
   ===================================================================================== */
'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { VoluntaryWork, Training, OtherInformation } from '@/types/pds.types';
import { voluntaryWorkSchema, trainingSchema, otherInformationSchema } from '@/lib/pds/validation';

import { PDFOverlayRenderer, type OverlayField } from '../overlay/PDFOverlayRenderer';
import { PAGE3_STEP3_FIELDS, PDS_PAGE_ASPECT } from '../overlay/pdsOverlayConfigs';

type Props = {
  voluntaryWork?: VoluntaryWork[];
  trainings?: Training[];
  otherInformation?: OtherInformation;

  onVoluntaryChange: (data: VoluntaryWork[]) => void;
  onTrainingChange: (data: Training[]) => void;
  onOtherInformationChange: (data: OtherInformation) => void;
};

type VolShape = { items: VoluntaryWork[] };
type TrShape = { items: Training[] };

const voluntaryArraySchema = z.array(voluntaryWorkSchema);
const trainingArraySchema = z.array(trainingSchema);

// page3 limits (match overlay rows)
const VOL_ROWS = 7;
const TR_ROWS = 21;

// other info limits
const OTHER_SKILLS_ROWS = 7;
const OTHER_RECOG_ROWS = 7;
const OTHER_MEM_ROWS = 7;

const makeEmptyVolRows = (): VoluntaryWork[] =>
  Array.from({ length: VOL_ROWS }).map(() => ({
    organizationName: '',
    organizationAddress: '',
    positionNatureOfWork: '',
    numberOfHours: undefined,
    periodOfInvolvement: { from: '', to: '' },
  }));

const makeEmptyTrainingRows = (): Training[] =>
  Array.from({ length: TR_ROWS }).map(() => ({
    title: '',
    periodOfAttendance: { from: '', to: '' },
    numberOfHours: undefined,
    typeOfLD: '',
    conductedSponsoredBy: '',
  }));

const makeEmptyOtherInformation = (): OtherInformation => ({
  skills: [],
  recognitions: [],
  memberships: [],
  references: [],
  governmentIssuedId: {},
  declaration: {
    agreed: false,
    dateAccomplished: '',
  },
});

const padStringArray = (arr: string[], len: number) => {
  const base = Array.from({ length: len }).map(() => '');
  const incoming = (arr || []).slice(0, len);
  for (let i = 0; i < incoming.length; i++) base[i] = incoming[i] ?? '';
  return base;
};

const cleanStringArray = (arr: string[]) =>
  (arr || []).map((s) => (s ?? '').trim()).filter(Boolean);

const isEmptyVol = (v: VoluntaryWork) =>
  !(
    v?.organizationName ||
    v?.organizationAddress ||
    v?.positionNatureOfWork ||
    v?.numberOfHours ||
    v?.periodOfInvolvement?.from ||
    v?.periodOfInvolvement?.to
  );

const isEmptyTraining = (t: Training) =>
  !(
    t?.title ||
    t?.periodOfAttendance?.from ||
    t?.periodOfAttendance?.to ||
    t?.numberOfHours ||
    t?.typeOfLD ||
    t?.conductedSponsoredBy
  );

export const Page3OverlayForm: React.FC<Props> = ({
  voluntaryWork,
  trainings,
  otherInformation,
  onVoluntaryChange,
  onTrainingChange,
  onOtherInformationChange,
}) => {
  /* =========================================================================
     VOLUNTARY FORM
     ========================================================================= */
  const volResolver = useMemo(
    () => zodResolver(z.object({ items: voluntaryArraySchema })),
    []
  );

  const volForm = useForm<VolShape>({
    resolver: volResolver,
    defaultValues: { items: makeEmptyVolRows() },
    mode: 'onBlur',
  });

  // prevent reset loop
  const volLoadedRef = useRef<string>('');
  useEffect(() => {
    const incoming = JSON.stringify(voluntaryWork || []);
    if (incoming === volLoadedRef.current) return;
    volLoadedRef.current = incoming;

    const base = makeEmptyVolRows();
    const incomingRows = (voluntaryWork || []).slice(0, VOL_ROWS);
    for (let i = 0; i < incomingRows.length; i++) {
      base[i] = {
        ...base[i],
        ...incomingRows[i],
        periodOfInvolvement: {
          from: incomingRows[i]?.periodOfInvolvement?.from || '',
          to: incomingRows[i]?.periodOfInvolvement?.to || '',
        },
      };
    }
    volForm.reset({ items: base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voluntaryWork]);

  const volPrev = useRef<string>('');
  useEffect(() => {
    const sub = volForm.watch((value) => {
      const items = (value as VolShape)?.items || [];
      const current = JSON.stringify(items);
      if (current !== volPrev.current) {
        volPrev.current = current;
        onVoluntaryChange(items.filter((x) => !isEmptyVol(x)));
      }
    });
    return () => sub.unsubscribe();
  }, [volForm, onVoluntaryChange]);

  /* =========================================================================
     TRAINING FORM
     ========================================================================= */
  const trResolver = useMemo(
    () => zodResolver(z.object({ items: trainingArraySchema })),
    []
  );

  const trForm = useForm<TrShape>({
    resolver: trResolver,
    defaultValues: { items: makeEmptyTrainingRows() },
    mode: 'onBlur',
  });

  const trLoadedRef = useRef<string>('');
  useEffect(() => {
    const incoming = JSON.stringify(trainings || []);
    if (incoming === trLoadedRef.current) return;
    trLoadedRef.current = incoming;

    const base = makeEmptyTrainingRows();
    const incomingRows = (trainings || []).slice(0, TR_ROWS);
    for (let i = 0; i < incomingRows.length; i++) {
      base[i] = {
        ...base[i],
        ...incomingRows[i],
        periodOfAttendance: {
          from: incomingRows[i]?.periodOfAttendance?.from || '',
          to: incomingRows[i]?.periodOfAttendance?.to || '',
        },
      };
    }
    trForm.reset({ items: base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainings]);

  const trPrev = useRef<string>('');
  useEffect(() => {
    const sub = trForm.watch((value) => {
      const items = (value as TrShape)?.items || [];
      const current = JSON.stringify(items);
      if (current !== trPrev.current) {
        trPrev.current = current;
        onTrainingChange(items.filter((x) => !isEmptyTraining(x)));
      }
    });
    return () => sub.unsubscribe();
  }, [trForm, onTrainingChange]);

  /* =========================================================================
     OTHER INFORMATION FORM
     ========================================================================= */
  const otherResolver = useMemo(() => zodResolver(otherInformationSchema), []);

  const otherForm = useForm<OtherInformation>({
    resolver: otherResolver,
    defaultValues: makeEmptyOtherInformation(),
    mode: 'onBlur',
  });

  const otherLoadedRef = useRef<string>('');
  useEffect(() => {
    const incomingStr = JSON.stringify(otherInformation || {});
    if (incomingStr === otherLoadedRef.current) return;
    otherLoadedRef.current = incomingStr;

    const base = makeEmptyOtherInformation();
    const incoming = otherInformation || ({} as OtherInformation);

    otherForm.reset({
      ...base,
      ...incoming,
      skills: padStringArray(incoming.skills || [], OTHER_SKILLS_ROWS),
      recognitions: padStringArray(incoming.recognitions || [], OTHER_RECOG_ROWS),
      memberships: padStringArray(incoming.memberships || [], OTHER_MEM_ROWS),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherInformation]);

  const otherPrev = useRef<string>('');
  useEffect(() => {
    const sub = otherForm.watch((value) => {
      const current = JSON.stringify(value);
      if (current !== otherPrev.current) {
        otherPrev.current = current;
        onOtherInformationChange({
          ...value,
          skills: cleanStringArray(value.skills || []),
          recognitions: cleanStringArray(value.recognitions || []),
          memberships: cleanStringArray(value.memberships || []),
        });
      }
    });
    return () => sub.unsubscribe();
  }, [otherForm, onOtherInformationChange]);

  /* =========================================================================
     UI
     ========================================================================= */
  const inputBase =
    'w-full h-full bg-transparent outline-none px-1 text-[12px] leading-none ' +
    'border border-transparent focus:border-[#22A555] focus:bg-white/70 rounded';

  const smallTextInput =
  'w-full h-full bg-transparent outline-none px-1 text-[10px] leading-none ' +
  'border border-transparent focus:border-[#22A555] focus:bg-white/70 rounded';

  const checkboxWrap = 'w-full h-full flex items-center justify-center';

  const pickControl = (f: OverlayField) => {
    if (f.formKey === 'voluntary') return volForm.control;
    if (f.formKey === 'training') return trForm.control;
    if (f.formKey === 'other') return otherForm.control;
    return trForm.control;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">
          Step 3: Page 3 (Voluntary Work + Training + Other Information)
        </h3>
        <p className="text-sm text-gray-600">
          Fill directly on page 3. (This page saves Voluntary Work, Training, and Other Information.)
        </p>
      </div>

      <PDFOverlayRenderer
        imageSrc="/pds/page3.png"
        aspectRatio={PDS_PAGE_ASPECT.page3}
        fields={PAGE3_STEP3_FIELDS}
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
                      className="w-4 h-4 accent-[#22A555]"
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
              render={({ field }) => {
                const isFromTo =
                  f.name.endsWith('.from') || f.name.endsWith('.to');

                return (
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
                    className={isFromTo ? smallTextInput : inputBase}
                  />
                );
              }}
            />
          );

        }}
      />
    </div>
  );
};
