/* =====================================================================================
   FILE: PDSWizard.tsx
   ===================================================================================== */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from './ProgressBar';
import { useToast } from '@/contexts/ToastContext';
import { useAutoSavePDS } from '@/hooks/useAutoSavePDS';
import { PDSData, PDSSection, PDSWizardStep } from '@/types/pds.types';
import { ChevronLeft, ChevronRight, Save, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// ✅ Step 1 single-page overlay form (Personal + Family + Education)
import { Page1OverlayForm } from './sections/Page1OverlayForm';

// ✅ Step 2 single-page overlay form (Eligibility + Work)
import { Page2OverlayForm } from './sections/Page2OverlayForm';

// ✅ Step 3 single-page overlay form (Voluntary + Training + OtherInformation)
import { Page3OverlayForm } from './sections/Page3OverlayForm';

// ✅ Step 4 single-page overlay form (Questions 34–40 + References + Gov ID + Signature)
import { Page4OverlayForm } from './sections/Page4OverlayForm';

// Review
import { ReviewSubmit } from './sections/ReviewSubmit';

const WIZARD_STEPS: PDSWizardStep[] = [
  { id: 'personal-information', title: 'Page 1', description: 'Personal + Family + Education', isComplete: false },
  { id: 'page-2', title: 'Page 2', description: 'Eligibility + Work', isComplete: false },
  { id: 'page-3', title: 'Page 3', description: 'Voluntary + Training + Other Info', isComplete: false },
  { id: 'page-4', title: 'Page 4', description: 'Questions + References + Signature', isComplete: false },
  { id: 'review', title: 'Review', description: 'Review & submit', isComplete: false },
];

/**
 * Normalizes PDS data to ensure all nested structures have proper defaults
 */
const normalizePDSData = (data: any): Partial<PDSData> => ({
  id: data.id,
  userId: data.userId || data.user_id,
  personalInfo: data.personalInfo || data.personal_info || {},
  familyBackground: {
    children: [],
    father: { surname: '', firstName: '', middleName: '' },
    mother: { surname: '', firstName: '', middleName: '' },
    ...(data.familyBackground || data.family_background || {}),
  },
  educationalBackground: data.educationalBackground || data.educational_background || [],
  eligibility: data.eligibility || [],
  workExperience: data.workExperience || data.work_experience || [],
  voluntaryWork: data.voluntaryWork || data.voluntary_work || [],
  trainings: data.trainings || [],
  otherInformation: {
    skills: [],
    recognitions: [],
    memberships: [],
    references: [],
    governmentIssuedId: {},
    declaration: {},
    ...(data.otherInformation || data.other_information || {}),
  },
  completionPercentage: data.completionPercentage || data.completion_percentage || 0,
  isCompleted: data.isCompleted || data.is_completed || false,
  lastSavedSection: data.lastSavedSection || data.last_saved_section,
});

export const PDSWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [pdsData, setPdsData] = useState<Partial<PDSData>>({});
  const [steps, setSteps] = useState<PDSWizardStep[]>(WIZARD_STEPS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useToast();

  const validateSectionData = (sectionId: PDSSection, data: any): boolean => {
    switch (sectionId) {
      case 'personal-information':
        return !!(data?.personalInfo?.surname && data?.personalInfo?.firstName && data?.personalInfo?.dateOfBirth);

      case 'page-2':
        return (
          (Array.isArray(data?.eligibility) && data.eligibility.length > 0) ||
          (Array.isArray(data?.workExperience) && data.workExperience.length > 0)
        );

      case 'page-3':
        return (
          (Array.isArray(data?.voluntaryWork) && data.voluntaryWork.length > 0) ||
          (Array.isArray(data?.trainings) && data.trainings.length > 0) ||
          (Array.isArray(data?.otherInformation?.skills) && data.otherInformation.skills.length > 0) ||
          (Array.isArray(data?.otherInformation?.recognitions) && data.otherInformation.recognitions.length > 0) ||
          (Array.isArray(data?.otherInformation?.memberships) && data.otherInformation.memberships.length > 0)
        );

      case 'page-4':
        // Minimal completion for page4: declaration agreed + date accomplished
        return !!(data?.declaration?.agreed && data?.declaration?.dateAccomplished);

      default:
        return false;
    }
  };

  const { saveStatus, saveError, triggerSave, lastSavedAt } = useAutoSavePDS(pdsData, {
    debounceMs: 2000,
    onSaveSuccess: (data) => {
      if (data && data.id) {
        setPdsData((prev) => ({
          ...prev,
          id: data.id,
          userId: data.user_id || prev.userId,
        }));
      }
    },
    onSaveError: (error) => {
      showToast(`Auto-save failed: ${error}`, 'error');
    },
  });

  useEffect(() => {
    loadPDSData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPDSData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pds');
      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        setPdsData(normalizePDSData(data));
        updateStepCompletion(data);

        if (data.last_saved_section && !data.is_completed) {
          const stepIndex = steps.findIndex((s) => s.id === data.last_saved_section);
          if (stepIndex !== -1) setCurrentStep(stepIndex);
        }
      } else if (result.success && !result.data) {
        setPdsData(normalizePDSData({}));
      }
    } catch (error) {
      console.error('Error loading PDS data:', error);
      showToast('Failed to load your PDS data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStepCompletion = (data: any) => {
    const updatedSteps = [...steps];

    // Step 1
    updatedSteps[0].isComplete = !!data.personal_info?.surname;

    // Step 2
    updatedSteps[1].isComplete = (data.eligibility?.length || 0) > 0 || (data.work_experience?.length || 0) > 0;

    // Step 3
    const hasVol = (data.voluntary_work?.length || 0) > 0;
    const hasTr = (data.trainings?.length || 0) > 0;
    const hasSkills = (data.other_information?.skills?.length || 0) > 0;
    const hasRecog = (data.other_information?.recognitions?.length || 0) > 0;
    const hasMem = (data.other_information?.memberships?.length || 0) > 0;
    updatedSteps[2].isComplete = hasVol || hasTr || hasSkills || hasRecog || hasMem;

    // Step 4 (declaration agreed + date)
    updatedSteps[3].isComplete = !!(
      data.other_information?.declaration?.agreed && data.other_information?.declaration?.dateAccomplished
    );

    // Review
    updatedSteps[4].isComplete = data.is_completed || false;

    setSteps(updatedSteps);
  };

  const calculateCompletion = () => {
    const completableSteps = steps.slice(0, -1);
    const completedSteps = completableSteps.filter((s) => s.isComplete).length;
    const percentage = (completedSteps / completableSteps.length) * 100;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      setPdsData((prev) => ({
        ...prev,
        lastSavedSection: steps[nextStep].id,
      }));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);

      setPdsData((prev) => ({
        ...prev,
        lastSavedSection: steps[prevStep].id,
      }));
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await triggerSave();
      showToast('Draft saved successfully!', 'success');
    } catch {
      showToast('Failed to save draft', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSectionChange = useCallback(
    (sectionId: PDSSection, data: any) => {
      setPdsData((prev) => {
        const updated = { ...prev };

        switch (sectionId) {
          case 'personal-information':
            updated.personalInfo = data.personalInfo;
            updated.familyBackground = data.familyBackground;
            updated.educationalBackground = data.educationalBackground;
            break;

          case 'page-2':
            updated.eligibility = data.eligibility;
            updated.workExperience = data.workExperience;
            break;

          case 'page-3':
            updated.voluntaryWork = data.voluntaryWork;
            updated.trainings = data.trainings;

            // ✅ merge (keep page4 fields too)
            updated.otherInformation = {
              ...(updated.otherInformation || {}),
              ...(data.otherInformation || {}),
            };
            break;

          case 'page-4':
            // Page 4 ONLY touches otherInformation
            updated.otherInformation = {
              ...(updated.otherInformation || {}),
              ...(data || {}),
            };
            break;
        }

        updated.completionPercentage = calculateCompletion();
        updated.lastSavedSection = sectionId;

        return updated;
      });

      setSteps((prevSteps) => {
        const updatedSteps = [...prevSteps];
        const current = updatedSteps[currentStep];
        if (current) current.isComplete = validateSectionData(sectionId, data);
        return updatedSteps;
      });
    },
    [currentStep, steps]
  );

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/pds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pdsData,
          isCompleted: true,
          completionPercentage: 100,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('PDS submitted successfully!', 'success');
        window.location.href = '/applicant/dashboard';
      } else {
        throw new Error(result.error || 'Failed to submit PDS');
      }
    } catch (error: any) {
      console.error('Error submitting PDS:', error);
      showToast(error.message || 'Failed to submit PDS', 'error');
    }
  };

  const renderCurrentSection = () => {
    const currentSectionId = steps[currentStep]?.id;

    switch (currentSectionId) {
      case 'personal-information':
        return (
          <Page1OverlayForm
            personalInfo={pdsData.personalInfo}
            familyBackground={pdsData.familyBackground}
            educationalBackground={pdsData.educationalBackground || []}
            onPersonalChange={(pi) =>
              handleSectionChange('personal-information', {
                personalInfo: pi,
                familyBackground: pdsData.familyBackground,
                educationalBackground: pdsData.educationalBackground || [],
              })
            }
            onFamilyChange={(fb) =>
              handleSectionChange('personal-information', {
                personalInfo: pdsData.personalInfo,
                familyBackground: fb,
                educationalBackground: pdsData.educationalBackground || [],
              })
            }
            onEducationChange={(ed) =>
              handleSectionChange('personal-information', {
                personalInfo: pdsData.personalInfo,
                familyBackground: pdsData.familyBackground,
                educationalBackground: ed,
              })
            }
          />
        );

      case 'page-2':
        return (
          <Page2OverlayForm
            eligibility={pdsData.eligibility || []}
            workExperience={pdsData.workExperience || []}
            onEligibilityChange={(elig) =>
              handleSectionChange('page-2', {
                eligibility: elig,
                workExperience: pdsData.workExperience || [],
              })
            }
            onWorkChange={(work) =>
              handleSectionChange('page-2', {
                eligibility: pdsData.eligibility || [],
                workExperience: work,
              })
            }
          />
        );

      case 'page-3':
        return (
          <Page3OverlayForm
            voluntaryWork={pdsData.voluntaryWork || []}
            trainings={pdsData.trainings || []}
            otherInformation={pdsData.otherInformation as any}
            onVoluntaryChange={(vw) =>
              handleSectionChange('page-3', {
                voluntaryWork: vw,
                trainings: pdsData.trainings || [],
                otherInformation: pdsData.otherInformation,
              })
            }
            onTrainingChange={(tr) =>
              handleSectionChange('page-3', {
                voluntaryWork: pdsData.voluntaryWork || [],
                trainings: tr,
                otherInformation: pdsData.otherInformation,
              })
            }
            onOtherInformationChange={(oi) =>
              handleSectionChange('page-3', {
                voluntaryWork: pdsData.voluntaryWork || [],
                trainings: pdsData.trainings || [],
                otherInformation: oi,
              })
            }
          />
        );

      case 'page-4':
        return (
          <Page4OverlayForm
            otherInformation={pdsData.otherInformation as any}
            onOtherInformationChange={(oi) => handleSectionChange('page-4', oi)}
          />
        );

      case 'review':
        return (
          <ReviewSubmit
            pdsData={pdsData}
            pdsId={pdsData.id}
            onEdit={(sectionIndex) => setCurrentStep(sectionIndex)}
            onSubmit={handleSubmit}
          />
        );

      default:
        return <div>Section not found</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22A555] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your PDS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <ProgressBar
        currentStep={currentStep}
        totalSteps={steps.length}
        completionPercentage={calculateCompletion()}
        steps={steps}
      />

      <div className="flex items-center justify-between mb-6 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <>
              <Clock className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-600">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle className="w-4 h-4 text-[#22A555]" />
              <span className="text-sm text-[#22A555]">Saved automatically</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{saveError || 'Save failed'}</span>
            </>
          )}
          {saveStatus === 'idle' && lastSavedAt && (
            <span className="text-sm text-gray-500">Last saved: {new Date(lastSavedAt).toLocaleTimeString()}</span>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Save}
          onClick={handleSaveDraft}
          disabled={isSaving}
          loading={isSaving}
        >
          Save Draft
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">{renderCurrentSection()}</div>

      {currentStep < steps.length - 1 ? (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-6 py-4">
          <Button variant="secondary" onClick={handlePrevious} disabled={currentStep === 0} icon={ChevronLeft}>
            Previous
          </Button>

          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>

          <Button variant="primary" onClick={handleNext} icon={ChevronRight} iconPosition="right">
            Next
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-6 py-4">
          <Button variant="secondary" onClick={handlePrevious} icon={ChevronLeft}>
            Previous
          </Button>

          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>

          <div className="w-24"></div>
        </div>
      )}

      <p className="text-center text-sm text-gray-500 mt-4">
        Your progress is automatically saved. You can complete this form in multiple sessions.
      </p>
    </div>
  );
};
