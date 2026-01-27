'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import SignatureCanvas from 'react-signature-canvas';
import { CheckCircle, X } from 'lucide-react';

import type { OtherInformation } from '@/types/pds.types';
import { otherInformationSchema } from '@/lib/pds/validation';

import { PDFOverlayRenderer, type OverlayField } from '../overlay/PDFOverlayRenderer';
import { PAGE4_STEP4_FIELDS, PDS_PAGE_ASPECT } from '../overlay/pdsOverlayConfigs';

type Props = {
  otherInformation?: OtherInformation;
  onOtherInformationChange: (data: OtherInformation) => void;
};

export const Page4OverlayForm: React.FC<Props> = ({
  otherInformation,
  onOtherInformationChange,
}) => {
  // =====================================================================================
  // STATE + REFS
  // =====================================================================================
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const [signatureUploadStatus, setSignatureUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [signatureError, setSignatureError] = useState<string | null>(null);

  // =====================================================================================
  // FORM
  // =====================================================================================
  const {
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OtherInformation>({
    resolver: zodResolver(otherInformationSchema),
    defaultValues: {
      skills: [],
      recognitions: [],
      memberships: [],
      references: [
        { name: '', address: '', telephoneNo: '' },
        { name: '', address: '', telephoneNo: '' },
        { name: '', address: '', telephoneNo: '' },
      ],
      governmentIssuedId: {
        type: '',
        idNumber: '',
        dateIssued: '',
      },
      declaration: {
        agreed: false,
        dateAccomplished: '',
        signatureData: undefined,
        signatureUrl: undefined,
        signatureUploadedAt: undefined,
      },
    },
    mode: 'onBlur',
  });

  // =====================================================================================
  // SAFE RESET FROM PROPS (GUARDED)
  // =====================================================================================
  const loadedRef = useRef<string>('');
  useEffect(() => {
    const incoming = JSON.stringify(otherInformation || {});
    if (incoming === loadedRef.current) return;

    loadedRef.current = incoming;
    reset(otherInformation as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherInformation]);

  // =====================================================================================
  // SAFE PARENT UPDATE (SUBSCRIPTION, NO LOOPS)
  // =====================================================================================
  const prevRef = useRef<string>('');
  useEffect(() => {
    const sub = watch((value) => {
      const current = JSON.stringify(value);
      if (current !== prevRef.current) {
        prevRef.current = current;
        onOtherInformationChange(value as OtherInformation);
      }
    });
    return () => sub.unsubscribe();
  }, [watch, onOtherInformationChange]);

  // =====================================================================================
  // SIGNATURE MODAL LOAD (SAFE)
  // =====================================================================================
  useEffect(() => {
    if (!isSignatureModalOpen) return;

    const t = setTimeout(() => {
      if (signatureRef.current) {
        if (watch()?.declaration?.signatureData) {
          try {
            signatureRef.current.fromDataURL(
              watch().declaration.signatureData
            );
          } catch {
            signatureRef.current.clear();
          }
        } else {
          signatureRef.current.clear();
        }
      }
    }, 50);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignatureModalOpen]);

  // =====================================================================================
  // SIGNATURE UPLOAD
  // =====================================================================================
  const uploadSignature = async (signatureDataUrl: string) => {
    setSignatureUploadStatus('uploading');
    setSignatureError(null);

    const res = await fetch(signatureDataUrl);
    const blob = await res.blob();

    const formData = new FormData();
    formData.append('signature', blob, 'signature.png');

    const response = await fetch('/api/pds/signature', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to upload signature');
    }

    setValue('declaration.signatureUrl', result.data.filePath);
    setValue('declaration.signatureUploadedAt', result.data.uploadedAt);
    setValue('declaration.signatureData', signatureDataUrl);

    setSignatureUploadStatus('success');
    setTimeout(() => setSignatureUploadStatus('idle'), 3000);
  };

  // =====================================================================================
  // SIGNATURE HANDLERS
  // =====================================================================================
  const handleSignatureSave = async () => {
    if (!signatureRef.current) return;

    if (signatureRef.current.isEmpty()) {
      setSignatureError('Please draw your signature before saving.');
      setSignatureUploadStatus('error');
      return;
    }

    try {
      const data = signatureRef.current.toDataURL('image/png');
      await uploadSignature(data);
      setSignatureError(null);
      setIsSignatureModalOpen(false);
    } catch (err: any) {
      setSignatureError(err?.message || 'Upload failed');
      setSignatureUploadStatus('error');
    }
  };

  const handleSignatureClearInModal = () => {
    signatureRef.current?.clear();
    setSignatureUploadStatus('idle');
    setSignatureError(null);
  };

  // =====================================================================================
  // OVERLAY FIELD RENDERER (UNCHANGED STRUCTURE)
  // =====================================================================================
  const renderField = (f: OverlayField) => {
    if (f.key === 'declaration_signature_canvas') {
      const watched = watch();
      const hasSignature =
        !!watched?.declaration?.signatureData ||
        !!watched?.declaration?.signatureUrl;

      const previewSrc = watched?.declaration?.signatureData
        ? watched.declaration.signatureData
        : watched?.declaration?.signatureUrl || '';

      return (
        <div className="w-full h-full relative">
          {hasSignature && previewSrc && (
            <img
              src={previewSrc}
              alt="Signature preview"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          )}

          <button
            type="button"
            onClick={() => {
              setSignatureError(null);
              setSignatureUploadStatus('idle');
              setIsSignatureModalOpen(true);
            }}
            className="absolute inset-0 w-full h-full text-[11px] font-medium
                       flex items-center justify-center bg-white/0 hover:bg-white/50"
          >
            {hasSignature ? 'Edit Signature' : 'Create'}
          </button>

          <div className="absolute left-0 -bottom-5 flex items-center gap-2">
            {signatureUploadStatus === 'uploading' && (
              <span className="text-[10px] text-blue-600">Uploading…</span>
            )}
            {signatureUploadStatus === 'success' && (
              <span className="text-[10px] text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Saved
              </span>
            )}
            {signatureUploadStatus === 'error' && (
              <span className="text-[10px] text-red-600">
                {signatureError || 'Upload failed'}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <Controller
        name={f.name as any}
        control={control}
        render={({ field }) => {
          if (f.type === 'checkbox') {
            const val = !!field.value;
            const isNo = f.checkboxValue === 'NO';
            const checked = isNo ? !val : val;

            return (
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                  field.onChange(isNo ? !e.target.checked : e.target.checked)
                }
                className="w-full h-full cursor-pointer accent-black"
              />
            );
          }

          const base =
            'w-full h-full bg-white/0 text-[10px] px-1 outline-none border border-transparent focus:border-[#22A555]';

          if (f.type === 'textarea') {
            return (
              <textarea
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={f.placeholder}
                className={`${base} resize-none`}
              />
            );
          }

          return (
            <input
              type={
                f.type === 'date'
                  ? 'date'
                  : f.type === 'number'
                  ? 'number'
                  : 'text'
              }
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={f.placeholder}
              className={base}
            />
          );
        }}
      />
    );
  };

  const pageImg = useMemo(() => '/pds/page4.png', []);

  // =====================================================================================
  // RENDER
  // =====================================================================================
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-1">
          Step 4: Other Information
        </h3>
        <p className="text-sm text-gray-600">
          Fill out Questions 34–40, References, Government ID, and agree to the
          declaration.
        </p>

        {errors?.declaration?.agreed && (
          <p className="text-xs text-red-600 mt-2">
            {errors.declaration.agreed.message}
          </p>
        )}
        {errors?.declaration?.dateAccomplished && (
          <p className="text-xs text-red-600 mt-1">
            {errors.declaration.dateAccomplished.message}
          </p>
        )}
      </div>

      <PDFOverlayRenderer
        imageSrc={pageImg}
        aspectRatio={PDS_PAGE_ASPECT.page4}
        fields={PAGE4_STEP4_FIELDS}
        renderField={renderField}
      />

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-700">
          Required: <strong>Declaration</strong> and{' '}
          <strong>Date Accomplished</strong>.
        </p>
      </div>

      {/* ====================== SIGNATURE MODAL ====================== */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSignatureModalOpen(false)}
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Create Signature
                </h4>
                <p className="text-xs text-gray-600">
                  Draw your signature below, then Save.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(false)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="p-5">
              <div className="border rounded-lg overflow-hidden bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full',
                    style: { width: '100%', height: 220 },
                  }}
                />
              </div>

              {signatureUploadStatus === 'uploading' && (
                <p className="text-xs text-blue-600 mt-2">Uploading…</p>
              )}
              {signatureUploadStatus === 'success' && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Signature saved.
                </p>
              )}
              {signatureUploadStatus === 'error' && (
                <p className="text-xs text-red-600 mt-2">
                  {signatureError || 'Upload failed.'}
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={handleSignatureClearInModal}
                className="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(false)}
                  className="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSignatureSave}
                  className="px-4 py-2 rounded-lg bg-[#22A555] text-white text-sm hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
