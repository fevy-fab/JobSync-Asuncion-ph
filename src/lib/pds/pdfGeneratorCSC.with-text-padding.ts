import jsPDF from 'jspdf';
import { PDSData } from '@/types/pds.types';
import { formatDateOnly } from '@/lib/utils/dateFormatters';
import { ensureArray } from '@/lib/utils/dataTransformers';

/**
 * Generate a CSC-compliant PDF document from PDS data
 * Exact replica of CS Form No. 212, Revised 2025
 * Box-based layout matching official CSC format
 *
 * @param pdsData - The PDS data to export
 * @param includeSignature - Whether to include the digital signature image
 * @param returnDoc - Whether to return the document instead of auto-downloading
 * @param useCurrentDate - Whether to use current date instead of original PDS date
 */
export async function generateCSCFormatPDF(
  pdsData: Partial<PDSData>,
  includeSignature: boolean = false,
  returnDoc: boolean = false,
  useCurrentDate: boolean = false
): Promise<jsPDF | void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;
  let pageNumber = 1;

  // Helper: Check if new page needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 15) {
      addPageNumber();
      doc.addPage();
      pageNumber++;
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper: Add page number
  const addPageNumber = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  };

  // Helper: Draw box
  const drawBox = (x: number, y: number, width: number, height: number) => {
    doc.rect(x, y, width, height);
  };

  // Text padding constant - ensures text stays within box borders
  const TEXT_PADDING = 2; // mm from left/right edges

  // Helper: Draw text in box
  const drawTextInBox = (
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number = 8,
    bold: boolean = false
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');

    // Calculate available width for text (subtract padding from both sides)
    const availableWidth = width - (2 * TEXT_PADDING);

    // Word wrap if text is too long - use available width
    const lines = doc.splitTextToSize(text, availableWidth);
    const lineHeight = fontSize * 0.35;
    const textY = y + height / 2 + (lines.length * lineHeight) / 4;

    lines.forEach((line: string, index: number) => {
      // Add left padding to ensure text starts inside border
      doc.text(line, x + TEXT_PADDING, textY + index * lineHeight);
    });
  };

  // Helper: Draw label + value box
  const drawLabelValueBox = (
    label: string,
    value: string,
    x: number,
    y: number,
    labelWidth: number,
    valueWidth: number,
    height: number = 7
  ) => {
    // Label box
    drawBox(x, y, labelWidth, height);
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, labelWidth, height, 'F');
    drawTextInBox(label, x, y, labelWidth, height, 7, true);

    // Value box
    drawBox(x + labelWidth, y, valueWidth, height);
    drawTextInBox(value, x + labelWidth, y, valueWidth, height, 8);

    return y + height;
  };

  // Helper: Draw checkbox with label
  const drawCheckbox = (
    x: number,
    y: number,
    isChecked: boolean,
    size: number = 3
  ) => {
    // Draw checkbox square
    drawBox(x, y, size, size);

    // Draw checkmark if checked
    if (isChecked) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('✓', x + 0.5, y + 2.5);
    }
  };

  // ============================================================================
  // HEADER
  // ============================================================================
  // Top-left: CS Form Number and Revision
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('CS Form No. 212', margin, yPosition + 3);
  doc.text('Revised 2025', margin, yPosition + 6);

  // Photo Box - Top Right Corner (4x5 cm)
  const photoBoxWidth = 35;
  const photoBoxHeight = 45;
  const photoBoxX = pageWidth - margin - photoBoxWidth;
  const photoBoxY = yPosition;

  drawBox(photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('PHOTO', photoBoxX + photoBoxWidth / 2, photoBoxY + photoBoxHeight + 3, { align: 'center' });
  doc.text('(4.5cm x 3.5cm)', photoBoxX + photoBoxWidth / 2, photoBoxY + photoBoxHeight + 6, { align: 'center' });

  // Title (centered)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PERSONAL DATA SHEET', pageWidth / 2, yPosition + 3, { align: 'center' });
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('(CS Form No. 212, Revised 2025)', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Warning text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const warningText = 'WARNING: Any misrepresentation made in the Personal Data Sheet and the Work Experience Sheet shall cause the filing of administrative/criminal case/s against the person concerned.';
  const warningLines = doc.splitTextToSize(warningText, contentWidth);
  warningLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 3;
  });
  yPosition += 5;

  // Instruction text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  const instructionText = 'READ THE ATTACHED GUIDE TO FILLING OUT THE PERSONAL DATA SHEET (PDS) BEFORE ACCOMPLISHING THE PDS FORM.';
  doc.text(instructionText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Ensure yPosition clears the photo box
  if (yPosition < photoBoxY + photoBoxHeight + 8) {
    yPosition = photoBoxY + photoBoxHeight + 8;
  }

  // ============================================================================
  // I. PERSONAL INFORMATION
  // ============================================================================
  checkPageBreak(80);

  // Section header
  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('I. PERSONAL INFORMATION', margin + 2, yPosition + 5);
  yPosition += 7;

  if (pdsData.personalInfo) {
    const pi = pdsData.personalInfo;

    // CS ID Number (Field #1) - For CSC use only
    yPosition = drawLabelValueBox('1. CS ID NO. (Do not fill up. For CSC use only)', '', margin, yPosition, 70, contentWidth - 70);

    // Name fields (row 1)
    drawBox(margin, yPosition, contentWidth, 7);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, contentWidth / 4, 7, 'F');
    doc.rect(margin + contentWidth / 4, yPosition, contentWidth / 4, 7, 'F');
    doc.rect(margin + contentWidth / 2, yPosition, contentWidth / 4, 7, 'F');
    doc.rect(margin + 3 * contentWidth / 4, yPosition, contentWidth / 4, 7, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('2. SURNAME', margin + TEXT_PADDING, yPosition + 5);
    doc.text('FIRST NAME', margin + contentWidth / 4 + TEXT_PADDING, yPosition + 5);
    doc.text('MIDDLE NAME', margin + contentWidth / 2 + TEXT_PADDING, yPosition + 5);
    doc.text('NAME EXTENSION (JR., SR)', margin + 3 * contentWidth / 4 + TEXT_PADDING, yPosition + 5);
    yPosition += 7;

    // Name values (row 2)
    drawBox(margin, yPosition, contentWidth / 4, 8);
    drawBox(margin + contentWidth / 4, yPosition, contentWidth / 4, 8);
    drawBox(margin + contentWidth / 2, yPosition, contentWidth / 4, 8);
    drawBox(margin + 3 * contentWidth / 4, yPosition, contentWidth / 4, 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text((pi.surname || '').toUpperCase(), margin + TEXT_PADDING, yPosition + 5);
    doc.text((pi.firstName || '').toUpperCase(), margin + contentWidth / 4 + TEXT_PADDING, yPosition + 5);
    doc.text((pi.middleName || '').toUpperCase(), margin + contentWidth / 2 + TEXT_PADDING, yPosition + 5);
    doc.text((pi.nameExtension || '').toUpperCase(), margin + 3 * contentWidth / 4 + TEXT_PADDING, yPosition + 5);
    yPosition += 8;

    // Date of birth row
    yPosition = drawLabelValueBox('3. DATE OF BIRTH', formatDateOnly(pi.dateOfBirth) || 'N/A', margin, yPosition, 40, contentWidth - 40);

    // Place of birth row
    yPosition = drawLabelValueBox('4. PLACE OF BIRTH', pi.placeOfBirth || 'N/A', margin, yPosition, 40, contentWidth - 40);

    // Sex with checkboxes (row)
    const infoBoxWidth = contentWidth / 5;
    drawBox(margin, yPosition, infoBoxWidth, 7);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, 20, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('5. SEX', margin + TEXT_PADDING, yPosition + 5);

    // Sex checkboxes: Male/Female
    const sexBoxX = margin + 20 + 2;
    const sexBoxY = yPosition + 2;
    drawCheckbox(sexBoxX, sexBoxY, pi.sexAtBirth?.toLowerCase() === 'male');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Male', sexBoxX + 4, sexBoxY + 2.5);
    drawCheckbox(sexBoxX + 15, sexBoxY, pi.sexAtBirth?.toLowerCase() === 'female');
    doc.text('Female', sexBoxX + 19, sexBoxY + 2.5);

    // Civil Status with checkboxes
    drawBox(margin + infoBoxWidth, yPosition, infoBoxWidth * 2, 7);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin + infoBoxWidth, yPosition, 30, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('6. CIVIL STATUS', margin + infoBoxWidth + TEXT_PADDING, yPosition + 5);

    // Civil Status checkboxes
    const csBoxX = margin + infoBoxWidth + 30 + 2;
    const csBoxY = yPosition + 2;
    const civilStatus = pi.civilStatus?.toLowerCase() || '';
    drawCheckbox(csBoxX, csBoxY, civilStatus === 'single');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Single', csBoxX + 4, csBoxY + 2.5);
    drawCheckbox(csBoxX + 13, csBoxY, civilStatus === 'married');
    doc.text('Married', csBoxX + 17, csBoxY + 2.5);
    drawCheckbox(csBoxX + 30, csBoxY, civilStatus === 'widowed');
    doc.text('Widowed', csBoxX + 34, csBoxY + 2.5);
    drawCheckbox(csBoxX + 48, csBoxY, civilStatus === 'separated');
    doc.text('Separated', csBoxX + 52, csBoxY + 2.5);

    // Height, Weight, Blood Type (same row)
    yPosition = drawLabelValueBox('7. HEIGHT (m)', pi.height?.toString() || 'N/A', margin + 3 * infoBoxWidth, yPosition, 20, infoBoxWidth - 20, 7);
    yPosition -= 7;
    yPosition = drawLabelValueBox('8. WEIGHT (kg)', pi.weight?.toString() || 'N/A', margin + 4 * infoBoxWidth, yPosition, 20, infoBoxWidth - 20, 7);
    yPosition -= 7;

    // Blood Type on next row
    drawBox(margin, yPosition, infoBoxWidth, 7);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, 25, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('9. BLOOD TYPE', margin + TEXT_PADDING, yPosition + 5);
    drawBox(margin + 25, yPosition, infoBoxWidth - 25, 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(pi.bloodType || 'N/A', margin + 26, yPosition + 5);
    yPosition += 7;

    // Government IDs (Fields 10-15) - 2-column layout
    checkPageBreak(40);
    yPosition = drawLabelValueBox('10. GSIS ID NO.', pi.gsisNo || 'N/A', margin, yPosition, 40, contentWidth / 2 - 40);
    yPosition -= 7;
    yPosition = drawLabelValueBox('11. PAG-IBIG ID NO.', pi.pagibigNo || 'N/A', margin + contentWidth / 2, yPosition, 40, contentWidth / 2 - 40);

    yPosition = drawLabelValueBox('12. PHILHEALTH NO.', pi.philhealthNo || 'N/A', margin, yPosition, 40, contentWidth / 2 - 40);
    yPosition -= 7;
    yPosition = drawLabelValueBox('13. SSS NO.', pi.sssNo || 'N/A', margin + contentWidth / 2, yPosition, 40, contentWidth / 2 - 40);

    yPosition = drawLabelValueBox('14. TIN NO.', pi.tinNo || 'N/A', margin, yPosition, 40, contentWidth / 2 - 40);
    yPosition -= 7;
    yPosition = drawLabelValueBox('15. AGENCY EMPLOYEE NO.', pi.agencyEmployeeNo || 'N/A', margin + contentWidth / 2, yPosition, 40, contentWidth / 2 - 40);

    // Citizenship (Field 16) with checkboxes
    yPosition = drawLabelValueBox('16. CITIZENSHIP', '', margin, yPosition, 40, contentWidth - 40, 8);
    yPosition -= 8; // Return to same position for checkbox content
    const citizenshipY = yPosition + 2;

    // Filipino checkbox
    drawCheckbox(margin + 42, citizenshipY, pi.citizenship === 'Filipino');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Filipino', margin + 46, citizenshipY + 2.5);

    // Dual Citizenship checkbox
    drawCheckbox(margin + 70, citizenshipY, pi.citizenship === 'Dual Citizenship');
    doc.text('Dual Citizenship', margin + 74, citizenshipY + 2.5);
    yPosition += 8; // Move to next row

    // If dual citizenship, show additional options
    if (pi.citizenship === 'Dual Citizenship') {
      const dualY = yPosition + 2;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('If holder of dual citizenship, indicate the details:', margin + 42, dualY);
      yPosition += 6;

      const optionsY = yPosition + 2;
      drawCheckbox(margin + 42, optionsY, pi.dualCitizenshipType === 'by birth');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('by birth', margin + 46, optionsY + 2.5);

      drawCheckbox(margin + 70, optionsY, pi.dualCitizenshipType === 'by naturalization');
      doc.text('by naturalization', margin + 74, optionsY + 2.5);
      yPosition += 6;

      yPosition = drawLabelValueBox('    Pls. indicate country:', pi.dualCitizenshipCountry || 'N/A', margin + 40, yPosition, 50, contentWidth - 90, 6);
    }

    // Residential Address (Field 17)
    yPosition = drawLabelValueBox(
      '17. RESIDENTIAL ADDRESS',
      [
        pi.residentialAddress?.houseBlockLotNo,
        pi.residentialAddress?.street,
        pi.residentialAddress?.subdivisionVillage,
        pi.residentialAddress?.barangay,
        pi.residentialAddress?.cityMunicipality,
        pi.residentialAddress?.province,
        pi.residentialAddress?.zipCode,
      ].filter(Boolean).join(', ') || 'N/A',
      margin,
      yPosition,
      40,
      contentWidth - 40,
      12
    );

    // ZIP CODE
    yPosition = drawLabelValueBox('    ZIP CODE', pi.residentialAddress?.zipCode || 'N/A', margin, yPosition, 40, contentWidth - 40);

    // Permanent Address (Field 18)
    const permAddress = pi.permanentAddress?.sameAsResidential
      ? 'Same as Residential Address'
      : [
          pi.permanentAddress?.houseBlockLotNo,
          pi.permanentAddress?.street,
          pi.permanentAddress?.subdivisionVillage,
          pi.permanentAddress?.barangay,
          pi.permanentAddress?.cityMunicipality,
          pi.permanentAddress?.province,
          pi.permanentAddress?.zipCode,
        ].filter(Boolean).join(', ') || 'N/A';

    yPosition = drawLabelValueBox('18. PERMANENT ADDRESS', permAddress, margin, yPosition, 40, contentWidth - 40, 12);
    yPosition = drawLabelValueBox('    ZIP CODE', pi.permanentAddress?.sameAsResidential ? pi.residentialAddress?.zipCode || 'N/A' : pi.permanentAddress?.zipCode || 'N/A', margin, yPosition, 40, contentWidth - 40);

    // Contact Info (Fields 19-21)
    yPosition = drawLabelValueBox('19. TELEPHONE NO.', pi.telephoneNo || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('20. MOBILE NO.', pi.mobileNo || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('21. E-MAIL ADDRESS (if any)', pi.emailAddress || 'N/A', margin, yPosition, 40, contentWidth - 40);
  }

  yPosition += 3;

  // ============================================================================
  // II. FAMILY BACKGROUND
  // ============================================================================
  checkPageBreak(60);

  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('II. FAMILY BACKGROUND', margin + 2, yPosition + 5);
  yPosition += 7;

  if (pdsData.familyBackground) {
    const fb = pdsData.familyBackground;

    // Spouse's information
    yPosition = drawLabelValueBox('22. SPOUSE\'S SURNAME', fb.spouse?.surname || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    FIRST NAME', fb.spouse?.firstName || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    MIDDLE NAME', fb.spouse?.middleName || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    NAME EXTENSION', fb.spouse?.nameExtension || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    OCCUPATION', fb.spouse?.occupation || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    EMPLOYER/BUSINESS NAME', fb.spouse?.employerBusinessName || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    BUSINESS ADDRESS', fb.spouse?.businessAddress || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    TELEPHONE NO.', fb.spouse?.telephoneNo || 'N/A', margin, yPosition, 40, contentWidth - 40);

    // Father's information
    yPosition = drawLabelValueBox('23. FATHER\'S SURNAME', fb.father?.surname || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    FIRST NAME', fb.father?.firstName || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    MIDDLE NAME', fb.father?.middleName || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    NAME EXTENSION', fb.father?.nameExtension || 'N/A', margin, yPosition, 40, contentWidth - 40);

    // Mother's maiden name
    yPosition = drawLabelValueBox('24. MOTHER\'S MAIDEN SURNAME', fb.mother?.surname || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    FIRST NAME', fb.mother?.firstName || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    MIDDLE NAME', fb.mother?.middleName || 'N/A', margin, yPosition, 40, contentWidth - 40);

    // Children
    if (fb.children && fb.children.length > 0) {
      checkPageBreak(30 + fb.children.length * 7);

      drawBox(margin, yPosition, contentWidth, 7);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, contentWidth, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('25. NAME OF CHILDREN (Write full name and list all)', margin + TEXT_PADDING, yPosition + 5);
      yPosition += 7;

      // Children header
      drawBox(margin, yPosition, contentWidth * 0.7, 6);
      drawBox(margin + contentWidth * 0.7, yPosition, contentWidth * 0.3, 6);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, contentWidth * 0.7, 6, 'F');
      doc.rect(margin + contentWidth * 0.7, yPosition, contentWidth * 0.3, 6, 'F');
      doc.setFontSize(7);
      doc.text('NAME', margin + TEXT_PADDING, yPosition + 4);
      doc.text('DATE OF BIRTH (mm/dd/yyyy)', margin + contentWidth * 0.7 + TEXT_PADDING, yPosition + 4);
      yPosition += 6;

      fb.children.forEach((child) => {
        // Calculate required height for child name BEFORE drawing
        doc.setFontSize(8); // Ensure 8pt font for accurate text splitting
        const nameLines = doc.splitTextToSize((child.fullName || 'N/A').toUpperCase(), contentWidth * 0.7 - 2);

        // Find maximum lines
        const maxLines = Math.max(nameLines.length, 1); // Minimum 1 line

        // Calculate dynamic row height
        const lineHeight = 3.5; // mm per line (for 8pt font with descenders)
        const paddingTop = 2; // mm - initial text offset
        const paddingBottom = 2; // mm - bottom padding
        const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

        checkPageBreak(rowHeight);

        drawBox(margin, yPosition, contentWidth * 0.7, rowHeight);
        drawBox(margin + contentWidth * 0.7, yPosition, contentWidth * 0.3, rowHeight);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        // Name - already split above
        nameLines.forEach((line: string, index: number) => {
          doc.text(line, margin + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
        });

        // Date of Birth - centered vertically for single line
        const dobYOffset = maxLines === 1 ? 4 : paddingTop + 1;
        doc.text(formatDateOnly(child.dateOfBirth) || 'N/A', margin + contentWidth * 0.7 + TEXT_PADDING, yPosition + dobYOffset);

        yPosition += rowHeight;
      });
    }
  }

  yPosition += 3;

  // ============================================================================
  // III. EDUCATIONAL BACKGROUND
  // ============================================================================
  checkPageBreak(80);

  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('III. EDUCATIONAL BACKGROUND', margin + 2, yPosition + 5);
  yPosition += 7;

  // Table header - Updated to match official template with separate From/To and Honors columns
  const colWidths = {
    level: contentWidth * 0.12,       // Level
    school: contentWidth * 0.26,      // School Name
    course: contentWidth * 0.22,      // Course/Degree
    periodFrom: contentWidth * 0.08,  // From (split from period)
    periodTo: contentWidth * 0.08,    // To (split from period)
    units: contentWidth * 0.08,       // Units/Level
    year: contentWidth * 0.08,        // Year Graduated
    honors: contentWidth * 0.08,      // Honors/Awards (NEW)
  };

  // Draw header boxes for all 8 columns
  let colX = margin;
  drawBox(colX, yPosition, colWidths.level, 12); colX += colWidths.level;
  drawBox(colX, yPosition, colWidths.school, 12); colX += colWidths.school;
  drawBox(colX, yPosition, colWidths.course, 12); colX += colWidths.course;
  drawBox(colX, yPosition, colWidths.periodFrom, 12); colX += colWidths.periodFrom;
  drawBox(colX, yPosition, colWidths.periodTo, 12); colX += colWidths.periodTo;
  drawBox(colX, yPosition, colWidths.units, 12); colX += colWidths.units;
  drawBox(colX, yPosition, colWidths.year, 12); colX += colWidths.year;
  drawBox(colX, yPosition, colWidths.honors, 12);

  // Fill headers with gray background
  doc.setFillColor(240, 240, 240);
  colX = margin;
  doc.rect(colX, yPosition, colWidths.level, 12, 'F'); colX += colWidths.level;
  doc.rect(colX, yPosition, colWidths.school, 12, 'F'); colX += colWidths.school;
  doc.rect(colX, yPosition, colWidths.course, 12, 'F'); colX += colWidths.course;
  doc.rect(colX, yPosition, colWidths.periodFrom, 12, 'F'); colX += colWidths.periodFrom;
  doc.rect(colX, yPosition, colWidths.periodTo, 12, 'F'); colX += colWidths.periodTo;
  doc.rect(colX, yPosition, colWidths.units, 12, 'F'); colX += colWidths.units;
  doc.rect(colX, yPosition, colWidths.year, 12, 'F'); colX += colWidths.year;
  doc.rect(colX, yPosition, colWidths.honors, 12, 'F');

  // Add header labels - use TEXT_PADDING for consistent spacing
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  colX = margin;
  doc.text('26. LEVEL', colX + TEXT_PADDING, yPosition + 6); colX += colWidths.level;
  doc.text('27. NAME OF', colX + TEXT_PADDING, yPosition + 4);
  doc.text('SCHOOL', colX + TEXT_PADDING, yPosition + 8); colX += colWidths.school;
  doc.text('28. BASIC EDUC/', colX + TEXT_PADDING, yPosition + 4);
  doc.text('DEGREE/COURSE', colX + TEXT_PADDING, yPosition + 8); colX += colWidths.course;
  doc.text('29. FROM', colX + TEXT_PADDING, yPosition + 6); colX += colWidths.periodFrom;
  doc.text('TO', colX + TEXT_PADDING, yPosition + 6); colX += colWidths.periodTo;
  doc.text('30. UNITS', colX + TEXT_PADDING, yPosition + 4);
  doc.text('EARNED', colX + TEXT_PADDING, yPosition + 8); colX += colWidths.units;
  doc.text('31. YEAR', colX + TEXT_PADDING, yPosition + 4);
  doc.text('GRAD.', colX + TEXT_PADDING, yPosition + 8); colX += colWidths.year;
  doc.text('32.HONORS', colX + TEXT_PADDING, yPosition + 4);
  doc.text('RECEIVED', colX + TEXT_PADDING, yPosition + 8);
  yPosition += 12;

  if (pdsData.educationalBackground && pdsData.educationalBackground.length > 0) {
    pdsData.educationalBackground.forEach((edu) => {
      // Calculate required height for each column BEFORE drawing
      doc.setFontSize(7); // Ensure 7pt font for accurate text splitting
      // Use TEXT_PADDING for proper text wrapping within columns
      const schoolLines = doc.splitTextToSize(edu.nameOfSchool || 'N/A', colWidths.school - (2 * TEXT_PADDING));
      const courseLines = doc.splitTextToSize(edu.basicEducationDegreeCourse || 'N/A', colWidths.course - (2 * TEXT_PADDING));

      // Find maximum lines among all columns
      const maxLines = Math.max(schoolLines.length, courseLines.length, 2); // Minimum 2 lines

      // Calculate dynamic row height
      const lineHeight = 3.5; // mm per line (increased for 7pt font with descenders)
      const paddingTop = 3; // mm - initial text offset
      const paddingBottom = 3; // mm - bottom padding (increased to prevent text overlap with border)
      const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

      checkPageBreak(rowHeight);

      // Draw boxes with dynamic height for all 8 columns
      colX = margin;
      drawBox(colX, yPosition, colWidths.level, rowHeight); colX += colWidths.level;
      drawBox(colX, yPosition, colWidths.school, rowHeight); colX += colWidths.school;
      drawBox(colX, yPosition, colWidths.course, rowHeight); colX += colWidths.course;
      drawBox(colX, yPosition, colWidths.periodFrom, rowHeight); colX += colWidths.periodFrom;
      drawBox(colX, yPosition, colWidths.periodTo, rowHeight); colX += colWidths.periodTo;
      drawBox(colX, yPosition, colWidths.units, rowHeight); colX += colWidths.units;
      drawBox(colX, yPosition, colWidths.year, rowHeight); colX += colWidths.year;
      drawBox(colX, yPosition, colWidths.honors, rowHeight);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      // Level - centered vertically for single line - use TEXT_PADDING
      const levelYOffset = maxLines === 2 ? 6 : 5;
      doc.text(edu.level || '', margin + TEXT_PADDING, yPosition + levelYOffset);

      // School name - already split above - use TEXT_PADDING
      colX = margin + colWidths.level;
      schoolLines.forEach((line: string, index: number) => {
        doc.text(line, colX + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
      });

      // Course - already split above - use TEXT_PADDING
      colX += colWidths.school;
      courseLines.forEach((line: string, index: number) => {
        doc.text(line, colX + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
      });

      // Period From - centered vertically - use TEXT_PADDING
      colX += colWidths.course;
      const periodFrom = edu.periodOfAttendance?.from || 'N/A';
      doc.text(periodFrom, colX + TEXT_PADDING, yPosition + levelYOffset);

      // Period To - centered vertically - use TEXT_PADDING
      colX += colWidths.periodFrom;
      const periodTo = edu.periodOfAttendance?.to || 'N/A';
      doc.text(periodTo, colX + TEXT_PADDING, yPosition + levelYOffset);

      // Units - centered vertically - use TEXT_PADDING
      colX += colWidths.periodTo;
      doc.text(edu.highestLevelUnitsEarned || 'N/A', colX + TEXT_PADDING, yPosition + levelYOffset);

      // Year graduated - centered vertically - use TEXT_PADDING
      colX += colWidths.units;
      doc.text(edu.yearGraduated || 'N/A', colX + TEXT_PADDING, yPosition + levelYOffset);

      // Honors/Awards - centered vertically (NEW) - use TEXT_PADDING
      colX += colWidths.year;
      doc.text(edu.honorsReceived || '', colX + TEXT_PADDING, yPosition + levelYOffset);

      yPosition += rowHeight;
    });
  }

  yPosition += 3;

  // ============================================================================
  // IV. CIVIL SERVICE ELIGIBILITY
  // ============================================================================
  checkPageBreak(50);

  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IV. CIVIL SERVICE ELIGIBILITY', margin + 2, yPosition + 5);
  yPosition += 7;

  // Table header
  const eligColWidths = {
    career: contentWidth * 0.30,
    rating: contentWidth * 0.10,
    dateExam: contentWidth * 0.15,
    placeExam: contentWidth * 0.20,
    license: contentWidth * 0.15,
    validity: contentWidth * 0.10,
  };

  drawBox(margin, yPosition, eligColWidths.career, 10);
  drawBox(margin + eligColWidths.career, yPosition, eligColWidths.rating, 10);
  drawBox(margin + eligColWidths.career + eligColWidths.rating, yPosition, eligColWidths.dateExam, 10);
  drawBox(margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam, yPosition, eligColWidths.placeExam, 10);
  drawBox(margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam, yPosition, eligColWidths.license, 10);
  drawBox(margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam + eligColWidths.license, yPosition, eligColWidths.validity, 10);

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, contentWidth, 10, 'F');

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('32. CAREER SERVICE/', margin + TEXT_PADDING, yPosition + 4);
  doc.text('RA 1080 (BOARD/', margin + TEXT_PADDING, yPosition + 7);
  doc.text('BAR) UNDER SPECIAL LAWS/', margin + TEXT_PADDING, yPosition + 9.5);

  doc.text('33. RATING', margin + eligColWidths.career + TEXT_PADDING, yPosition + 6);
  doc.text('(If Applicable)', margin + eligColWidths.career + TEXT_PADDING, yPosition + 9);

  doc.text('34. DATE OF', margin + eligColWidths.career + eligColWidths.rating + TEXT_PADDING, yPosition + 4);
  doc.text('EXAMINATION /', margin + eligColWidths.career + eligColWidths.rating + TEXT_PADDING, yPosition + 7);
  doc.text('CONFERMENT', margin + eligColWidths.career + eligColWidths.rating + TEXT_PADDING, yPosition + 9.5);

  doc.text('35. PLACE OF', margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + TEXT_PADDING, yPosition + 4);
  doc.text('EXAMINATION /', margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + TEXT_PADDING, yPosition + 7);
  doc.text('CONFERMENT', margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + TEXT_PADDING, yPosition + 9.5);

  doc.text('36. LICENSE', margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam + TEXT_PADDING, yPosition + 5);
  doc.text('NUMBER', margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam + TEXT_PADDING, yPosition + 8);

  doc.text('37. DATE OF', margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam + eligColWidths.license + TEXT_PADDING, yPosition + 5);
  doc.text('VALIDITY', margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam + eligColWidths.license + TEXT_PADDING, yPosition + 8);

  yPosition += 10;

  if (pdsData.eligibility && pdsData.eligibility.length > 0) {
    pdsData.eligibility.forEach((elig) => {
      // Calculate required height for each column BEFORE drawing
      doc.setFontSize(7); // Ensure 7pt font for accurate text splitting
      const careerLines = doc.splitTextToSize(elig.careerService || 'N/A', eligColWidths.career - 2);
      const placeLines = doc.splitTextToSize(elig.placeOfExaminationConferment || 'N/A', eligColWidths.placeExam - 2);
      const licenseLines = doc.splitTextToSize(elig.licenseNumber || 'N/A', eligColWidths.license - 2);
      const validityText = formatDateOnly(elig.dateOfValidity) || 'N/A';
      const validityLines = doc.splitTextToSize(validityText, eligColWidths.validity - 2);

      // Find maximum lines among all columns
      const maxLines = Math.max(careerLines.length, placeLines.length, licenseLines.length, validityLines.length, 2); // Minimum 2 lines

      // Calculate dynamic row height
      const lineHeight = 3; // mm per line (for 7pt font)
      const paddingTop = 3; // mm - initial text offset
      const paddingBottom = 3; // mm - bottom padding (increased to prevent text overlap with border)
      const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

      checkPageBreak(rowHeight);

      // Draw boxes with dynamic height
      drawBox(margin, yPosition, eligColWidths.career, rowHeight);
      drawBox(margin + eligColWidths.career, yPosition, eligColWidths.rating, rowHeight);
      drawBox(margin + eligColWidths.career + eligColWidths.rating, yPosition, eligColWidths.dateExam, rowHeight);
      drawBox(margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam, yPosition, eligColWidths.placeExam, rowHeight);
      drawBox(margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam, yPosition, eligColWidths.license, rowHeight);
      drawBox(margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam + eligColWidths.license, yPosition, eligColWidths.validity, rowHeight);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      // Career Service - already split above
      careerLines.forEach((line: string, index: number) => {
        doc.text(line, margin + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
      });

      // Rating - centered vertically for single line
      const singleLineYOffset = maxLines === 2 ? 4 : 5;
      doc.text(elig.rating || 'N/A', margin + eligColWidths.career + TEXT_PADDING, yPosition + singleLineYOffset);

      // Date of Examination - centered vertically for single line
      doc.text(formatDateOnly(elig.dateOfExaminationConferment) || 'N/A', margin + eligColWidths.career + eligColWidths.rating + TEXT_PADDING, yPosition + singleLineYOffset);

      // Place of Examination - already split above
      placeLines.forEach((line: string, index: number) => {
        doc.text(line, margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
      });

      // License Number - already split above
      licenseLines.forEach((line: string, index: number) => {
        doc.text(line, margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
      });

      // Date of Validity - already split above
      validityLines.forEach((line: string, index: number) => {
        doc.text(line, margin + eligColWidths.career + eligColWidths.rating + eligColWidths.dateExam + eligColWidths.placeExam + eligColWidths.license + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
      });

      yPosition += rowHeight;
    });
  }

  yPosition += 3;

  // ============================================================================
  // V. WORK EXPERIENCE
  // ============================================================================
  checkPageBreak(50);

  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('V. WORK EXPERIENCE', margin + 2, yPosition + 5);
  yPosition += 7;

  // Work Experience table header - Updated to match official template with separate From/To columns
  const workColWidths = {
    periodFrom: contentWidth * 0.08,  // From (split from period)
    periodTo: contentWidth * 0.08,    // To (split from period)
    position: contentWidth * 0.21,    // Position Title
    company: contentWidth * 0.21,     // Department/Agency/Company
    salary: contentWidth * 0.11,      // Monthly Salary
    grade: contentWidth * 0.07,       // Salary Grade
    step: contentWidth * 0.06,        // Step
    status: contentWidth * 0.10,      // Status of Appointment
    govt: contentWidth * 0.08,        // Gov't Service
  };

  // Draw header boxes for all 9 columns
  let workColX = margin;
  drawBox(workColX, yPosition, workColWidths.periodFrom, 12); workColX += workColWidths.periodFrom;
  drawBox(workColX, yPosition, workColWidths.periodTo, 12); workColX += workColWidths.periodTo;
  drawBox(workColX, yPosition, workColWidths.position, 12); workColX += workColWidths.position;
  drawBox(workColX, yPosition, workColWidths.company, 12); workColX += workColWidths.company;
  drawBox(workColX, yPosition, workColWidths.salary, 12); workColX += workColWidths.salary;
  drawBox(workColX, yPosition, workColWidths.grade, 12); workColX += workColWidths.grade;
  drawBox(workColX, yPosition, workColWidths.step, 12); workColX += workColWidths.step;
  drawBox(workColX, yPosition, workColWidths.status, 12); workColX += workColWidths.status;
  drawBox(workColX, yPosition, workColWidths.govt, 12);

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, contentWidth, 12, 'F');

  // Add header labels - use TEXT_PADDING for consistent spacing
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  workColX = margin;
  doc.text('38. FROM', workColX + TEXT_PADDING, yPosition + 6); workColX += workColWidths.periodFrom;
  doc.text('TO', workColX + TEXT_PADDING, yPosition + 6); workColX += workColWidths.periodTo;
  doc.text('39. POSITION', workColX + TEXT_PADDING, yPosition + 5);
  doc.text('TITLE', workColX + TEXT_PADDING, yPosition + 8); workColX += workColWidths.position;
  doc.text('40. DEPT/', workColX + TEXT_PADDING, yPosition + 3);
  doc.text('AGENCY/', workColX + TEXT_PADDING, yPosition + 6);
  doc.text('OFFICE/', workColX + TEXT_PADDING, yPosition + 9);
  doc.text('COMPANY', workColX + TEXT_PADDING, yPosition + 11.5); workColX += workColWidths.company;
  doc.text('41. MONTHLY', workColX + TEXT_PADDING, yPosition + 5);
  doc.text('SALARY', workColX + TEXT_PADDING, yPosition + 8); workColX += workColWidths.salary;
  doc.text('42. SALARY', workColX + TEXT_PADDING, yPosition + 5);
  doc.text('GRADE', workColX + TEXT_PADDING, yPosition + 8); workColX += workColWidths.grade;
  doc.text('STEP', workColX + TEXT_PADDING, yPosition + 6); workColX += workColWidths.step;
  doc.text('43. STATUS', workColX + TEXT_PADDING, yPosition + 5);
  doc.text('OF APPT.', workColX + TEXT_PADDING, yPosition + 8); workColX += workColWidths.status;
  doc.text('44. GOV\'T', workColX + TEXT_PADDING, yPosition + 5);
  doc.text('SERVICE', workColX + TEXT_PADDING, yPosition + 8);

  yPosition += 12;

  if (pdsData.workExperience && pdsData.workExperience.length > 0) {
    pdsData.workExperience.forEach((work) => {
      // Calculate required height for each column BEFORE drawing
      doc.setFontSize(6); // Ensure 6pt font for accurate text splitting
      // Use TEXT_PADDING for proper text wrapping within columns
      const posLines = doc.splitTextToSize(work.positionTitle || 'N/A', workColWidths.position - (2 * TEXT_PADDING));
      const companyLines = doc.splitTextToSize(work.departmentAgencyOfficeCompany || 'N/A', workColWidths.company - (2 * TEXT_PADDING));

      // Find maximum lines among all columns (From/To are now single-line fields)
      const maxLines = Math.max(posLines.length, companyLines.length, 2); // Minimum 2 lines

      // Calculate dynamic row height
      const lineHeight = 3; // mm per line (for 6pt font)
      const paddingTop = 3; // mm - initial text offset
      const paddingBottom = 3; // mm - bottom padding (increased to prevent text overlap with border)
      const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

      checkPageBreak(rowHeight);

      // Draw boxes with dynamic height for all 9 columns
      workColX = margin;
      drawBox(workColX, yPosition, workColWidths.periodFrom, rowHeight); workColX += workColWidths.periodFrom;
      drawBox(workColX, yPosition, workColWidths.periodTo, rowHeight); workColX += workColWidths.periodTo;
      drawBox(workColX, yPosition, workColWidths.position, rowHeight); workColX += workColWidths.position;
      drawBox(workColX, yPosition, workColWidths.company, rowHeight); workColX += workColWidths.company;
      drawBox(workColX, yPosition, workColWidths.salary, rowHeight); workColX += workColWidths.salary;
      drawBox(workColX, yPosition, workColWidths.grade, rowHeight); workColX += workColWidths.grade;
      drawBox(workColX, yPosition, workColWidths.step, rowHeight); workColX += workColWidths.step;
      drawBox(workColX, yPosition, workColWidths.status, rowHeight); workColX += workColWidths.status;
      drawBox(workColX, yPosition, workColWidths.govt, rowHeight);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      // Centered vertical offset for single-line fields
      const singleLineYOffset = maxLines === 2 ? 5 : 6;

      // Period From - single line, centered - use TEXT_PADDING
      workColX = margin;
      const periodFrom = work.periodOfService?.from ? formatDateOnly(work.periodOfService.from) : 'N/A';
      doc.text(periodFrom, workColX + TEXT_PADDING, yPosition + singleLineYOffset); workColX += workColWidths.periodFrom;

      // Period To - single line, centered - use TEXT_PADDING
      const periodTo = work.periodOfService?.to === 'Present' ? 'Present' : work.periodOfService?.to ? formatDateOnly(work.periodOfService.to) : 'N/A';
      doc.text(periodTo, workColX + TEXT_PADDING, yPosition + singleLineYOffset); workColX += workColWidths.periodTo;

      // Position - multi-line, already split above - use TEXT_PADDING
      posLines.forEach((line: string, index: number) => {
        doc.text(line, workColX + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
      });
      workColX += workColWidths.position;

      // Company - multi-line, already split above - use TEXT_PADDING
      companyLines.forEach((line: string, index: number) => {
        doc.text(line, workColX + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
      });
      workColX += workColWidths.company;

      // Salary - single line, centered - use TEXT_PADDING
      doc.text(work.monthlySalary ? String(work.monthlySalary) : 'N/A', workColX + TEXT_PADDING, yPosition + singleLineYOffset); workColX += workColWidths.salary;

      // Grade - single line, centered - use TEXT_PADDING
      doc.text(work.salaryGrade || 'N/A', workColX + TEXT_PADDING, yPosition + singleLineYOffset); workColX += workColWidths.grade;

      // Step - single line, centered - use TEXT_PADDING
      doc.text(work.stepIncrement || 'N/A', workColX + TEXT_PADDING, yPosition + singleLineYOffset); workColX += workColWidths.step;

      // Status - single line, centered - use TEXT_PADDING
      doc.text(work.statusOfAppointment || 'N/A', workColX + TEXT_PADDING, yPosition + singleLineYOffset); workColX += workColWidths.status;

      // Govt Service - single line, centered (Y/N) - use TEXT_PADDING
      doc.text(work.governmentService ? 'Y' : 'N', workColX + TEXT_PADDING, yPosition + singleLineYOffset);

      yPosition += rowHeight;
    });
  }

  yPosition += 3;

  // ============================================================================
  // VI. VOLUNTARY WORK
  // ============================================================================
  checkPageBreak(50);

  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('VI. VOLUNTARY WORK OR INVOLVEMENT IN CIVIC / NON-GOVERNMENT / PEOPLE / VOLUNTARY ORGANIZATION/S', margin + 2, yPosition + 5);
  yPosition += 7;

  // Voluntary Work table header
  const volColWidths = {
    org: contentWidth * 0.40,
    period: contentWidth * 0.20,
    hours: contentWidth * 0.15,
    position: contentWidth * 0.25,
  };

  drawBox(margin, yPosition, volColWidths.org, 10);
  drawBox(margin + volColWidths.org, yPosition, volColWidths.period, 10);
  drawBox(margin + volColWidths.org + volColWidths.period, yPosition, volColWidths.hours, 10);
  drawBox(margin + volColWidths.org + volColWidths.period + volColWidths.hours, yPosition, volColWidths.position, 10);

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, contentWidth, 10, 'F');

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('45. NAME & ADDRESS OF', margin + TEXT_PADDING, yPosition + 4);
  doc.text('ORGANIZATION', margin + TEXT_PADDING, yPosition + 7);

  doc.text('46. INCLUSIVE DATES', margin + volColWidths.org + TEXT_PADDING, yPosition + 4);
  doc.text('(mm/dd/yyyy)', margin + volColWidths.org + TEXT_PADDING, yPosition + 7);

  doc.text('47. NUMBER OF', margin + volColWidths.org + volColWidths.period + TEXT_PADDING, yPosition + 4);
  doc.text('HOURS', margin + volColWidths.org + volColWidths.period + TEXT_PADDING, yPosition + 7);

  doc.text('48. POSITION / NATURE', margin + volColWidths.org + volColWidths.period + volColWidths.hours + TEXT_PADDING, yPosition + 4);
  doc.text('OF WORK', margin + volColWidths.org + volColWidths.period + volColWidths.hours + TEXT_PADDING, yPosition + 7);

  yPosition += 10;

  if (pdsData.voluntaryWork && pdsData.voluntaryWork.length > 0) {
    pdsData.voluntaryWork.forEach((vol) => {
      // Calculate required height for each column BEFORE drawing
      const orgAddress = [vol.organizationName, vol.organizationAddress].filter(Boolean).join(', ');
      doc.setFontSize(7); // Ensure 7pt font for accurate organization text splitting
      const orgLines = doc.splitTextToSize(orgAddress || 'N/A', volColWidths.org - 2);

      // For position, temporarily set font size 6 to calculate accurate split
      doc.setFontSize(6);
      const posLines = doc.splitTextToSize(vol.positionNatureOfWork || 'N/A', volColWidths.position - 2);
      doc.setFontSize(7); // Restore for other calculations

      // Find maximum lines among all columns
      const maxLines = Math.max(orgLines.length, posLines.length, 2); // Minimum 2 lines

      // Calculate dynamic row height
      const lineHeight = 3.5; // mm per line (increased for 7pt font with descenders)
      const paddingTop = 4; // mm - initial text offset
      const paddingBottom = 4; // mm - bottom padding (increased to prevent text overlap with border)
      const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

      checkPageBreak(rowHeight);

      // Draw boxes with dynamic height
      drawBox(margin, yPosition, volColWidths.org, rowHeight);
      drawBox(margin + volColWidths.org, yPosition, volColWidths.period, rowHeight);
      drawBox(margin + volColWidths.org + volColWidths.period, yPosition, volColWidths.hours, rowHeight);
      drawBox(margin + volColWidths.org + volColWidths.period + volColWidths.hours, yPosition, volColWidths.position, rowHeight);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      // Organization - already split above
      orgLines.forEach((line: string, index: number) => {
        doc.text(line, margin + TEXT_PADDING, yPosition + 4 + index * lineHeight);
      });

      // Period
      const period = vol.periodOfInvolvement
        ? `${formatDateOnly(vol.periodOfInvolvement.from) || ''} to ${formatDateOnly(vol.periodOfInvolvement.to) || ''}`
        : 'N/A';
      doc.text(period, margin + volColWidths.org + TEXT_PADDING, yPosition + 6);

      // Hours
      doc.text(vol.numberOfHours?.toString() || 'N/A', margin + volColWidths.org + volColWidths.period + TEXT_PADDING, yPosition + 6);

      // Position - Use font size 6 for better fit and readability
      doc.setFontSize(6);
      // Already split above - posLines
      posLines.forEach((line: string, index: number) => {
        doc.text(line, margin + volColWidths.org + volColWidths.period + volColWidths.hours + TEXT_PADDING, yPosition + 4 + index * 3);
      });
      doc.setFontSize(7); // Restore to 7 for consistency

      yPosition += rowHeight;
    });
  }

  yPosition += 3;

  // ============================================================================
  // VII. LEARNING AND DEVELOPMENT (L&D) INTERVENTIONS/TRAINING PROGRAMS ATTENDED
  // ============================================================================
  checkPageBreak(50);

  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('VII. LEARNING AND DEVELOPMENT (L&D) INTERVENTIONS/TRAINING PROGRAMS ATTENDED', margin + 2, yPosition + 5);
  yPosition += 7;

  // Training table header
  const trainColWidths = {
    title: contentWidth * 0.28,    // Reduced from 0.30 to make room for period
    period: contentWidth * 0.18,   // Increased from 0.15 to prevent date overlap
    hours: contentWidth * 0.12,
    type: contentWidth * 0.17,     // Reduced from 0.18 to maintain 100% total
    sponsor: contentWidth * 0.25,
  };

  drawBox(margin, yPosition, trainColWidths.title, 10);
  drawBox(margin + trainColWidths.title, yPosition, trainColWidths.period, 10);
  drawBox(margin + trainColWidths.title + trainColWidths.period, yPosition, trainColWidths.hours, 10);
  drawBox(margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours, yPosition, trainColWidths.type, 10);
  drawBox(margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + trainColWidths.type, yPosition, trainColWidths.sponsor, 10);

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, contentWidth, 10, 'F');

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('49. TITLE OF LEARNING', margin + TEXT_PADDING, yPosition + 4);
  doc.text('AND DEVELOPMENT', margin + TEXT_PADDING, yPosition + 7);

  doc.text('50. INCLUSIVE DATES', margin + trainColWidths.title + TEXT_PADDING, yPosition + 4);
  doc.text('(mm/dd/yyyy)', margin + trainColWidths.title + TEXT_PADDING, yPosition + 7);

  doc.text('51. NUMBER', margin + trainColWidths.title + trainColWidths.period + TEXT_PADDING, yPosition + 4);
  doc.text('OF HOURS', margin + trainColWidths.title + trainColWidths.period + TEXT_PADDING, yPosition + 7);

  doc.text('52. TYPE OF LD', margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + TEXT_PADDING, yPosition + 4);
  doc.text('(Managerial/', margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + TEXT_PADDING, yPosition + 7);
  doc.text('Supervisory/Technical/etc)', margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + TEXT_PADDING, yPosition + 9.5);

  doc.text('53. CONDUCTED/', margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + trainColWidths.type + TEXT_PADDING, yPosition + 4);
  doc.text('SPONSORED BY', margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + trainColWidths.type + TEXT_PADDING, yPosition + 7);

  yPosition += 10;

  if (pdsData.trainings && pdsData.trainings.length > 0) {
    pdsData.trainings.forEach((training) => {
      // Calculate required height for each column BEFORE drawing
      doc.setFontSize(7); // Ensure 7pt font for accurate title text splitting
      const titleLines = doc.splitTextToSize(training.title || 'N/A', trainColWidths.title - 2);

      // For sponsor, temporarily set font size 6 to calculate accurate split
      doc.setFontSize(6);
      const sponsorLines = doc.splitTextToSize(training.conductedSponsoredBy || 'N/A', trainColWidths.sponsor - 2);
      doc.setFontSize(7); // Restore for other calculations

      // Find maximum lines among all columns
      const maxLines = Math.max(titleLines.length, sponsorLines.length, 2); // Minimum 2 lines

      // Calculate dynamic row height
      const lineHeight = 3; // mm per line
      const paddingTop = 4; // mm - initial text offset
      const paddingBottom = 4; // mm - bottom padding (increased to prevent text overlap with border)
      const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

      checkPageBreak(rowHeight);

      drawBox(margin, yPosition, trainColWidths.title, rowHeight);
      drawBox(margin + trainColWidths.title, yPosition, trainColWidths.period, rowHeight);
      drawBox(margin + trainColWidths.title + trainColWidths.period, yPosition, trainColWidths.hours, rowHeight);
      drawBox(margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours, yPosition, trainColWidths.type, rowHeight);
      drawBox(margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + trainColWidths.type, yPosition, trainColWidths.sponsor, rowHeight);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      // Title - already split above
      titleLines.forEach((line: string, index: number) => {
        doc.text(line, margin + TEXT_PADDING, yPosition + 4 + index * lineHeight);
      });

      // Period - with text wrapping to prevent overlap
      const period = training.periodOfAttendance
        ? `${formatDateOnly(training.periodOfAttendance.from) || ''} to ${formatDateOnly(training.periodOfAttendance.to) || ''}`
        : 'N/A';
      const periodLines = doc.splitTextToSize(period, trainColWidths.period - 2);
      periodLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + trainColWidths.title + TEXT_PADDING, yPosition + 6 + (idx * 3));
      });

      // Hours
      doc.text(training.numberOfHours?.toString() || 'N/A', margin + trainColWidths.title + trainColWidths.period + TEXT_PADDING, yPosition + 6);

      // Type
      doc.text(training.typeOfLD || 'N/A', margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + TEXT_PADDING, yPosition + 6);

      // Sponsor - Use font size 6 for better fit and readability
      doc.setFontSize(6);
      // Already split above - sponsorLines
      sponsorLines.forEach((line: string, index: number) => {
        doc.text(line, margin + trainColWidths.title + trainColWidths.period + trainColWidths.hours + trainColWidths.type + TEXT_PADDING, yPosition + 4 + index * lineHeight);
      });
      doc.setFontSize(7); // Restore to 7 for consistency

      yPosition += rowHeight;
    });
  }

  yPosition += 3;

  // ============================================================================
  // VIII. OTHER INFORMATION
  // ============================================================================
  checkPageBreak(100);

  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('VIII. OTHER INFORMATION', margin + 2, yPosition + 5);
  yPosition += 7;

  if (pdsData.otherInformation) {
    const oi = pdsData.otherInformation;

    // Special Skills/Hobbies - Dynamic row height
    if (ensureArray(oi.skills).length > 0) {
      const labelText = '54. SPECIAL SKILLS AND HOBBIES';
      const valueText = ensureArray(oi.skills).join(', ');
      const labelWidth = 50;
      const valueWidth = contentWidth - 50;

      // Pre-calculate text split for both label and value
      doc.setFontSize(7);
      const labelLines = doc.splitTextToSize(labelText, labelWidth - 2);
      const valueLines = doc.splitTextToSize(valueText, valueWidth - 2);

      // Calculate dynamic height based on BOTH label and value lines
      const maxLines = Math.max(labelLines.length, valueLines.length, 2); // Minimum 2 lines
      const lineHeight = 3.5; // mm per line (for 7pt font with descenders)
      const paddingTop = 4; // mm
      const paddingBottom = 4; // mm - bottom padding (increased to prevent text overlap with border)
      const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

      // Check page break
      checkPageBreak(rowHeight);

      // Draw label box
      drawBox(margin, yPosition, labelWidth, rowHeight);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, labelWidth, rowHeight, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');

      // Render label text line by line
      labelLines.forEach((line: string, index: number) => {
        doc.text(line, margin + TEXT_PADDING, yPosition + paddingTop + index * lineHeight);
      });

      // Draw value box
      drawBox(margin + labelWidth, yPosition, valueWidth, rowHeight);
      doc.setFont('helvetica', 'normal');

      // Render text lines
      valueLines.forEach((line: string, index: number) => {
        doc.text(line, margin + labelWidth + TEXT_PADDING, yPosition + paddingTop + index * lineHeight);
      });

      yPosition += rowHeight;
    }

    // Recognitions - Dynamic row height
    if (ensureArray(oi.recognitions).length > 0) {
      const labelText = '55. NON-ACADEMIC DISTINCTIONS / RECOGNITION';
      const valueText = ensureArray(oi.recognitions).join(', ');
      const labelWidth = 50;
      const valueWidth = contentWidth - 50;

      // Pre-calculate text split for both label and value
      doc.setFontSize(7);
      const labelLines = doc.splitTextToSize(labelText, labelWidth - 2);
      const valueLines = doc.splitTextToSize(valueText, valueWidth - 2);

      // Calculate dynamic height based on BOTH label and value lines
      const maxLines = Math.max(labelLines.length, valueLines.length, 2); // Minimum 2 lines
      const lineHeight = 3.5; // mm per line (for 7pt font with descenders)
      const paddingTop = 4; // mm
      const paddingBottom = 4; // mm - bottom padding (increased to prevent text overlap with border)
      const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

      // Check page break
      checkPageBreak(rowHeight);

      // Draw label box
      drawBox(margin, yPosition, labelWidth, rowHeight);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, labelWidth, rowHeight, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');

      // Render label text line by line
      labelLines.forEach((line: string, index: number) => {
        doc.text(line, margin + TEXT_PADDING, yPosition + paddingTop + index * lineHeight);
      });

      // Draw value box
      drawBox(margin + labelWidth, yPosition, valueWidth, rowHeight);
      doc.setFont('helvetica', 'normal');

      // Render text lines
      valueLines.forEach((line: string, index: number) => {
        doc.text(line, margin + labelWidth + TEXT_PADDING, yPosition + paddingTop + index * lineHeight);
      });

      yPosition += rowHeight;
    }

    // Memberships - Dynamic row height
    if (ensureArray(oi.memberships).length > 0) {
      const labelText = '56. MEMBERSHIP IN ASSOCIATION/ORGANIZATION';
      const valueText = ensureArray(oi.memberships).join(', ');
      const labelWidth = 50;
      const valueWidth = contentWidth - 50;

      // Pre-calculate text split for both label and value
      doc.setFontSize(7);
      const labelLines = doc.splitTextToSize(labelText, labelWidth - 2);
      const valueLines = doc.splitTextToSize(valueText, valueWidth - 2);

      // Calculate dynamic height based on BOTH label and value lines
      const maxLines = Math.max(labelLines.length, valueLines.length, 2); // Minimum 2 lines
      const lineHeight = 3.5; // mm per line (for 7pt font with descenders)
      const paddingTop = 4; // mm
      const paddingBottom = 4; // mm - bottom padding (increased to prevent text overlap with border)
      const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

      // Check page break
      checkPageBreak(rowHeight);

      // Draw label box
      drawBox(margin, yPosition, labelWidth, rowHeight);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, labelWidth, rowHeight, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');

      // Render label text line by line
      labelLines.forEach((line: string, index: number) => {
        doc.text(line, margin + TEXT_PADDING, yPosition + paddingTop + index * lineHeight);
      });

      // Draw value box
      drawBox(margin + labelWidth, yPosition, valueWidth, rowHeight);
      doc.setFont('helvetica', 'normal');

      // Render text lines
      valueLines.forEach((line: string, index: number) => {
        doc.text(line, margin + labelWidth + TEXT_PADDING, yPosition + paddingTop + index * lineHeight);
      });

      yPosition += rowHeight;
    }

    // Questions 34-40 (Critical compliance questions)
    checkPageBreak(80);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ANSWER THE FOLLOWING QUESTIONS:', margin, yPosition);
    yPosition += 5;

    const questions = [
      { num: '34a', q: 'Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed, within the third degree?', answer: oi.relatedThirdDegree ? 'YES' : 'NO', details: oi.relatedThirdDegreeDetails },
      { num: '34b', q: 'within the fourth degree (for Local Government Unit - Career Employees)?', answer: oi.relatedFourthDegree ? 'YES' : 'NO', details: oi.relatedFourthDegreeDetails },
      { num: '35', q: 'Have you ever been found guilty of any administrative offense?', answer: oi.guiltyAdministrativeOffense ? 'YES' : 'NO', details: oi.guiltyAdministrativeOffenseDetails },
      { num: '36', q: 'Have you been criminally charged before any court?', answer: oi.criminallyCharged ? 'YES' : 'NO', details: oi.criminallyChargedDetails },
      { num: '37', q: 'Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation by any court or tribunal?', answer: oi.convicted ? 'YES' : 'NO', details: oi.convictedDetails },
      { num: '38', q: 'Have you ever been separated from the service in any of the following modes: resignation, retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased out (abolition) in the public or private sector?', answer: oi.separatedFromService ? 'YES' : 'NO', details: oi.separatedFromServiceDetails },
      { num: '39', q: 'Have you ever been a candidate in a national or local election held within the last year (except Barangay election)?', answer: oi.candidateNationalLocal ? 'YES' : 'NO', details: oi.candidateNationalLocalDetails },
      { num: '40', q: 'Have you resigned from the government service during the three (3)-month period before the last election to promote/actively campaign for a national or local candidate?', answer: oi.resignedForCandidacy ? 'YES' : 'NO', details: oi.resignedForCandidacyDetails },
      { num: '41', q: 'Have you acquired the status of an immigrant or permanent resident of another country?', answer: oi.immigrantOrPermanentResident ? 'YES' : 'NO', details: oi.immigrantOrPermanentResidentCountry },
      { num: '42a', q: 'Are you a member of any indigenous group?', answer: oi.indigenousGroupMember ? 'YES' : 'NO', details: oi.indigenousGroupName },
      { num: '42b', q: 'Are you a person with disability?', answer: oi.personWithDisability ? 'YES' : 'NO', details: oi.personWithDisabilityDetails },
      { num: '42c', q: 'Are you a solo parent?', answer: oi.soloParent ? 'YES' : 'NO', details: oi.soloParentIdNumber ? `ID Number: ${oi.soloParentIdNumber}` : undefined },
    ];

    questions.forEach((q) => {
      checkPageBreak(15);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(`${q.num}.`, margin, yPosition);

      const qLines = doc.splitTextToSize(q.q, contentWidth - 30);
      doc.setFont('helvetica', 'normal');
      qLines.forEach((line: string, index: number) => {
        doc.text(line, margin + 5, yPosition + index * 3);
      });

      yPosition += qLines.length * 3 + 2;

      doc.setFont('helvetica', 'bold');
      doc.text('Answer:', margin + 10, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(q.answer.toUpperCase(), margin + 25, yPosition);
      yPosition += 4;

      if (q.details) {
        doc.setFont('helvetica', 'italic');
        doc.text('Details:', margin + 10, yPosition);
        const detailLines = doc.splitTextToSize(q.details, contentWidth - 30);
        detailLines.forEach((line: string, index: number) => {
          doc.text(line, margin + 25, yPosition + index * 3);
        });
        yPosition += detailLines.length * 3 + 2;
      }

      yPosition += 3;
    });

    // References
    if (oi.references && oi.references.length > 0) {
      checkPageBreak(40);

      yPosition = drawLabelValueBox('57. REFERENCES (Person not related by consanguinity or affinity to applicant / appointee)', '', margin, yPosition, contentWidth, 0, 7);

      // References table header
      drawBox(margin, yPosition, contentWidth / 3, 6);
      drawBox(margin + contentWidth / 3, yPosition, contentWidth / 3, 6);
      drawBox(margin + 2 * contentWidth / 3, yPosition, contentWidth / 3, 6);

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, contentWidth, 6, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('NAME', margin + TEXT_PADDING, yPosition + 4);
      doc.text('ADDRESS', margin + contentWidth / 3 + TEXT_PADDING, yPosition + 4);
      doc.text('TEL. NO.', margin + 2 * contentWidth / 3 + TEXT_PADDING, yPosition + 4);
      yPosition += 6;

      oi.references.forEach((ref) => {
        // Calculate required height for each column BEFORE drawing
        doc.setFontSize(7); // Ensure 7pt font for accurate text splitting
        const nameLines = doc.splitTextToSize(ref.name || 'N/A', contentWidth / 3 - 2);
        const addressLines = doc.splitTextToSize(ref.address || 'N/A', contentWidth / 3 - 2);

        // Find maximum lines among name and address columns
        const maxLines = Math.max(nameLines.length, addressLines.length, 1); // Minimum 1 line

        // Calculate dynamic row height
        const lineHeight = 3.5; // mm per line (for 7pt font with descenders)
        const paddingTop = 2; // mm - initial text offset
        const paddingBottom = 2; // mm - bottom padding
        const rowHeight = paddingTop + (maxLines * lineHeight) + paddingBottom;

        checkPageBreak(rowHeight);

        drawBox(margin, yPosition, contentWidth / 3, rowHeight);
        drawBox(margin + contentWidth / 3, yPosition, contentWidth / 3, rowHeight);
        drawBox(margin + 2 * contentWidth / 3, yPosition, contentWidth / 3, rowHeight);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');

        // Name - already split above
        nameLines.forEach((line: string, index: number) => {
          doc.text(line, margin + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
        });

        // Address - already split above
        addressLines.forEach((line: string, index: number) => {
          doc.text(line, margin + contentWidth / 3 + TEXT_PADDING, yPosition + paddingTop + 1 + index * lineHeight);
        });

        // Tel No - centered vertically for single line
        const telYOffset = maxLines === 1 ? 4 : paddingTop + 1;
        doc.text(ref.telephoneNo || 'N/A', margin + 2 * contentWidth / 3 + TEXT_PADDING, yPosition + telYOffset);

        yPosition += rowHeight;
      });
    }

    // Government Issued ID
    yPosition = drawLabelValueBox('58. GOVERNMENT ISSUED ID', oi.governmentIssuedId?.type || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    ID/LICENSE/PASSPORT NO.', oi.governmentIssuedId?.idNumber || 'N/A', margin, yPosition, 40, contentWidth - 40);
    yPosition = drawLabelValueBox('    DATE/PLACE OF ISSUANCE', oi.governmentIssuedId?.dateIssued ? formatDateOnly(oi.governmentIssuedId.dateIssued) : 'N/A', margin, yPosition, 40, contentWidth - 40);
  }

  yPosition += 3;

  // ============================================================================
  // IX. DECLARATION
  // ============================================================================
  checkPageBreak(60);

  drawBox(margin, yPosition, contentWidth, 7);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IX. DECLARATION', margin + 2, yPosition + 5);
  yPosition += 7 + 3;  // Add 3mm breathing space after header

  // Declaration text with box container and dynamic height
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  const declarationText = 'I declare under oath that I have personally accomplished this Personal Data Sheet which is a true, correct and complete statement pursuant to the provisions of pertinent laws, rules and regulations of the Republic of the Philippines. I authorize the agency head/authorized representative to verify/validate the contents stated herein. I agree that any misrepresentation made in this document and its attachments shall cause the filing of administrative/criminal case/s against me.';
  const declLines = doc.splitTextToSize(declarationText, contentWidth - 4);
  const declPaddingTop = 2;
  const declPaddingBottom = 2;
  const declLineHeight = 3; // 3mm per line for 7pt font (consistent with other sections)
  const declTextHeight = declPaddingTop + (declLines.length * declLineHeight) + declPaddingBottom;

  // Check page break before rendering declaration text
  checkPageBreak(declTextHeight);

  // Draw container box around declaration text
  drawBox(margin, yPosition, contentWidth, declTextHeight);

  // Render text lines with proper padding
  declLines.forEach((line: string, index: number) => {
    doc.text(line, margin + 2, yPosition + declPaddingTop + index * declLineHeight);
  });
  yPosition += declTextHeight + 6; // Add 6mm spacing for better visual separation

  // ============================================================================
  // Add page number to last page
  // ============================================================================
  addPageNumber();

  // ============================================================================
  // Signature and Date section (side by side)
  // ============================================================================
  const signatureBoxWidth = contentWidth / 2 - 1; // Use half width minus 1mm spacing
  const signatureDateBoxHeight = 30; // Same height for both boxes
  const yPositionBeforeSignature = yPosition; // Save position for date box

  // Signature section (if included)
  if (includeSignature && pdsData.otherInformation?.declaration?.signatureData) {
    checkPageBreak(signatureDateBoxHeight);

    // Draw signature box (left side)
    drawBox(margin, yPosition, signatureBoxWidth, signatureDateBoxHeight);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGNATURE', margin + 2, yPosition + 6);

    try {
      // Try to add signature image with proper centering and padding
      const signatureData = pdsData.otherInformation.declaration.signatureData;
      if (signatureData && (signatureData.startsWith('data:image') || signatureData.startsWith('http'))) {
        // Center signature image in box with 5mm side padding
        const imgX = margin + 5;
        const imgY = yPosition + 10;
        const imgWidth = signatureBoxWidth - 10;
        const imgHeight = 15;
        doc.addImage(signatureData, 'PNG', imgX, imgY, imgWidth, imgHeight);
      }
    } catch (error) {
      console.error('Error adding signature to PDF:', error);
    }

    yPosition += signatureDateBoxHeight;
  }

  // Date accomplished section (positioned next to signature or standalone)
  const dateAccomplished = useCurrentDate
    ? new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    : pdsData.otherInformation?.declaration?.dateAccomplished || new Date().toISOString().split('T')[0];

  const formattedDate = formatDateOnly(dateAccomplished);

  // Position date box next to signature if signature exists, otherwise below declaration
  if (includeSignature && pdsData.otherInformation?.declaration?.signatureData) {
    // Date box on right side, aligned with signature
    const dateBoxX = margin + signatureBoxWidth + 2; // Position next to signature with 2mm gap
    const dateBoxWidth = contentWidth - signatureBoxWidth - 2;

    // Draw date box at same Y position as signature
    drawBox(dateBoxX, yPositionBeforeSignature, dateBoxWidth, signatureDateBoxHeight);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', dateBoxX + 2, yPositionBeforeSignature + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, dateBoxX + 2, yPositionBeforeSignature + 15);
  } else {
    // No signature, draw date box full width below
    checkPageBreak(10);
    yPosition = drawLabelValueBox('DATE', formattedDate, margin, yPosition, 30, contentWidth - 30);
  }

  // ============================================================================
  // Right Thumbmark Box (below signature/date section)
  // ============================================================================
  yPosition += 5; // Add spacing
  const thumbBoxWidth = 40;
  const thumbBoxHeight = 30;
  const thumbBoxX = pageWidth - margin - thumbBoxWidth;

  checkPageBreak(thumbBoxHeight + 8);

  drawBox(thumbBoxX, yPosition, thumbBoxWidth, thumbBoxHeight);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('RIGHT THUMBMARK', thumbBoxX + thumbBoxWidth / 2, yPosition + thumbBoxHeight + 4, { align: 'center' });

  // ============================================================================
  // Download or return
  // ============================================================================
  if (returnDoc) {
    return doc;
  } else {
    const filename = `PDS_CSC_Format_${pdsData.personalInfo?.surname || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }
}
