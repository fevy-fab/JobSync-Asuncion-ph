/**
 * Training Certificate PDF Generator (Refactored)
 *
 * Routes certificate generation to appropriate template based on template type
 * Supports 5 template variants: classic, modern, government, colorful, professional
 */

import { CertificateData, CertificateLayoutParams, CertificateTemplate } from '@/types/certificate.types';
import {
  generateClassicFormalCertificate,
  generateModernMinimalistCertificate,
  generateGovernmentOfficialCertificate,
  generateColorfulAchievementCertificate,
  generateProfessionalBusinessCertificate,
} from './templates';

/**
 * Generate PDF certificate from certificate data using specified template
 *
 * @param data - Certificate data including trainee, program, and completion info
 * @param template - Certificate template variant (defaults to 'classic')
 * @param layoutParams - Optional layout customization parameters
 * @returns PDF as Uint8Array that can be uploaded to storage
 */
export async function generateCertificatePDF(
  data: CertificateData,
  template: CertificateTemplate = 'classic',
  layoutParams?: CertificateLayoutParams
): Promise<Uint8Array> {
  // Route to appropriate template generator
  switch (template) {
    case 'classic':
      return generateClassicFormalCertificate(data, layoutParams);

    case 'modern':
      return generateModernMinimalistCertificate(data, layoutParams);

    case 'government':
      return generateGovernmentOfficialCertificate(data, layoutParams);

    case 'colorful':
      return generateColorfulAchievementCertificate(data, layoutParams);

    case 'professional':
      return generateProfessionalBusinessCertificate(data, layoutParams);

    default:
      // Fallback to classic if unknown template
      console.warn(`Unknown template '${template}', falling back to 'classic'`);
      return generateClassicFormalCertificate(data, layoutParams);
  }
}

/**
 * Generate PDF as Blob (for client-side preview)
 *
 * @param data - Certificate data
 * @param template - Certificate template variant
 * @param layoutParams - Optional layout parameters
 * @returns PDF Blob
 */
export async function generateCertificatePreview(
  data: CertificateData,
  template: CertificateTemplate = 'classic',
  layoutParams?: CertificateLayoutParams
): Promise<Blob> {
  const pdfBytes = await generateCertificatePDF(data, template, layoutParams);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Generate PDF and trigger download (for client-side download)
 *
 * @param data - Certificate data
 * @param template - Certificate template variant
 * @param filename - Optional custom filename
 */
export async function downloadCertificatePDF(
  data: CertificateData,
  template: CertificateTemplate = 'classic',
  filename?: string
): Promise<void> {
  const blob = await generateCertificatePreview(data, template);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `certificate-${data.certification.certificate_id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get template display metadata for UI
 */
export function getTemplateMetadata(template: CertificateTemplate) {
  const metadata = {
    classic: {
      name: 'Classic Formal',
      description: 'Traditional certificate with ornamental borders and serif fonts',
      colorScheme: 'Green & Gold on Cream',
      orientation: 'Landscape',
      style: 'Traditional',
    },
    modern: {
      name: 'Modern Minimalist',
      description: 'Sophisticated modern design with navy and gold accents',
      colorScheme: 'Navy & Gold on Off-White',
      orientation: 'Landscape',
      style: 'Contemporary',
    },
    government: {
      name: 'Government Official',
      description: 'Formal government document style with seal',
      colorScheme: 'Navy & Gold on Off-White',
      orientation: 'Portrait',
      style: 'Official',
    },
    colorful: {
      name: 'Colorful Achievement',
      description: 'Elegant celebratory design with burgundy and gold accents',
      colorScheme: 'Burgundy & Gold on Cream',
      orientation: 'Landscape',
      style: 'Celebratory',
    },
    professional: {
      name: 'Professional Business',
      description: 'Executive modern style with centered layout and teal accents',
      colorScheme: 'Charcoal & Teal on White',
      orientation: 'Landscape',
      style: 'Corporate',
    },
  };

  return metadata[template] || metadata.classic;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): CertificateTemplate[] {
  return ['classic', 'modern', 'government', 'colorful', 'professional'];
}

// Re-export shared utilities for backward compatibility
export { generateCertificateId } from './shared';
