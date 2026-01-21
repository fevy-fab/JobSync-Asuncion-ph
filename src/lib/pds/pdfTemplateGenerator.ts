/**
 * PDF Template Generator for Official CSC PDS 2025
 *
 * This generator uses the official CS Form No. 212, Revised 2025 PDF template
 * and overlays applicant data using coordinate-based text placement.
 *
 * Since the official template has no form fields, we use pdf-lib to:
 * 1. Load the template PDF
 * 2. Embed text at specific coordinates
 * 3. Embed signature image
 * 4. Add watermark
 * 5. Flatten the PDF (make non-editable)
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import type { CompletePDS } from '@/types/pds.types';

export interface PDFGenerationOptions {
  includeSignature?: boolean;
  useCurrentDate?: boolean;
  currentDateOverride?: string;
  addWatermark?: boolean;
}

/**
 * Generate official CSC PDS PDF by overlaying data on template
 */
export async function generateOfficialPDS(
  pdsData: CompletePDS,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const {
    includeSignature = true,
    useCurrentDate = false,
    currentDateOverride,
    addWatermark = true
  } = options;

  try {
    // Load the official template
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'CS_Form_212_2025.pdf');
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 9;
    const smallFontSize = 7;

    // Get pages (CS Form 212 typically has 4 pages)
    const pages = pdfDoc.getPages();

    // Page 1: Personal Information (Section I & II)
    if (pages[0]) {
      await fillPersonalInformation(pages[0], pdsData.personal_info, font, fontBold, fontSize);
      await fillFamilyBackground(pages[0], pdsData.family_background, font, fontSize);
    }

    // Page 2: Educational Background, Eligibility (Section III & IV)
    if (pages[1]) {
      await fillEducationalBackground(pages[1], pdsData.educational_background, font, fontSize);
      await fillEligibility(pages[1], pdsData.eligibility, font, fontSize);
    }

    // Page 3: Work Experience, Voluntary Work (Section V & VI)
    if (pages[2]) {
      await fillWorkExperience(pages[2], pdsData.work_experience, font, fontSize);
      await fillVoluntaryWork(pages[2], pdsData.voluntary_work, font, fontSize);
    }

    // Page 4: Trainings, Other Information (Section VII & VIII)
    if (pages[3]) {
      await fillTrainings(pages[3], pdsData.trainings, font, fontSize);
      await fillOtherInformation(pages[3], pdsData.other_information, font, fontSize);
    }

    // Embed signature if requested and available
    if (includeSignature && pdsData.signature_url) {
      await embedSignature(pdfDoc, pdsData.signature_url);
    }

    // Add watermark if requested
    if (addWatermark) {
      await addWatermarkToPDF(pdfDoc, 'Official Copy - Do Not Edit');
    }

    // Flatten the PDF (makes it non-editable by removing any form fields if present)
    try {
      const form = pdfDoc.getForm();
      form.flatten();
    } catch (e) {
      // No form fields to flatten, which is expected for this template
    }

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('Error generating official PDS PDF:', error);
    throw new Error(`Failed to generate official PDS: ${error.message}`);
  }
}

/**
 * Fill Section I: Personal Information
 * NOTE: Coordinates are approximate and may need adjustment based on actual template
 */
async function fillPersonalInformation(
  page: any,
  data: any,
  font: any,
  fontBold: any,
  fontSize: number
) {
  const { width, height } = page.getSize();

  // These coordinates are placeholders - adjust based on actual template layout
  const leftMargin = 50;
  const topMargin = height - 100;
  const lineHeight = 15;

  let yPos = topMargin;

  // Name fields (typically at the top of Section I)
  page.drawText(data.surname?.toUpperCase() || '', {
    x: leftMargin,
    y: yPos,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  page.drawText(data.firstName || '', {
    x: leftMargin + 150,
    y: yPos,
    size: fontSize,
    font,
    color: rgb(0, 0, 0)
  });

  page.drawText(data.middleName || '', {
    x: leftMargin + 300,
    y: yPos,
    size: fontSize,
    font,
    color: rgb(0, 0, 0)
  });

  yPos -= lineHeight * 2;

  // Date of Birth
  if (data.dateOfBirth) {
    page.drawText(formatDate(data.dateOfBirth), {
      x: leftMargin,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    });
  }

  // Place of Birth
  if (data.placeOfBirth) {
    page.drawText(data.placeOfBirth, {
      x: leftMargin + 150,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    });
  }

  yPos -= lineHeight;

  // Additional fields would continue here...
  // For now, this is a simplified implementation
  // Full implementation would map all personal info fields to their coordinates

  // Note: Actual coordinate mapping requires visual inspection of the template
}

/**
 * Fill Section II: Family Background
 */
async function fillFamilyBackground(
  page: any,
  data: any,
  font: any,
  fontSize: number
) {
  // Implementation placeholder
  // Would map family background data to template coordinates
}

/**
 * Fill Section III: Educational Background
 */
async function fillEducationalBackground(
  page: any,
  data: any[],
  font: any,
  fontSize: number
) {
  // Implementation placeholder
  // Would iterate through educational background array and place in table rows
}

/**
 * Fill Section IV: Civil Service Eligibility
 */
async function fillEligibility(
  page: any,
  data: any[],
  font: any,
  fontSize: number
) {
  // Implementation placeholder
}

/**
 * Fill Section V: Work Experience
 */
async function fillWorkExperience(
  page: any,
  data: any[],
  font: any,
  fontSize: number
) {
  // Implementation placeholder
}

/**
 * Fill Section VI: Voluntary Work
 */
async function fillVoluntaryWork(
  page: any,
  data: any[],
  font: any,
  fontSize: number
) {
  // Implementation placeholder
}

/**
 * Fill Section VII: Learning and Development (Trainings)
 */
async function fillTrainings(
  page: any,
  data: any[],
  font: any,
  fontSize: number
) {
  // Implementation placeholder
}

/**
 * Fill Section VIII: Other Information
 */
async function fillOtherInformation(
  page: any,
  data: any,
  font: any,
  fontSize: number
) {
  // Implementation placeholder
}

/**
 * Embed digital signature image at the appropriate location
 */
async function embedSignature(pdfDoc: PDFDocument, signatureUrl: string) {
  try {
    // Fetch signature from storage
    // For now, skip if URL is not accessible
    // In production, this would fetch from Supabase storage
    console.log('Signature embedding not yet implemented:', signatureUrl);
  } catch (error) {
    console.warn('Failed to embed signature:', error);
  }
}

/**
 * Add watermark text to all pages
 */
async function addWatermarkToPDF(pdfDoc: PDFDocument, watermarkText: string) {
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const page of pages) {
    const { width, height } = page.getSize();

    page.drawText(watermarkText, {
      x: width / 2 - 80,
      y: height - 20,
      size: 8,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.5
    });
  }
}

/**
 * Format date for display
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}
