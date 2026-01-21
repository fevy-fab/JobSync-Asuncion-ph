/**
 * Real PDF Template Overlay Generator
 *
 * This generator loads the actual CS Form No. 212, Revised 2025 PDF template
 * and overlays applicant data at specific coordinates.
 *
 * Unlike pdfTemplateGenerator.ts (which uses programmatic generation),
 * this implementation uses the REAL PDF file and writes text on top of it.
 */

import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import type { CompletePDS } from '@/types/pds.types';
import { PDF_COORDINATES, getTableRowY } from './pdfCoordinates';

export interface PDFGenerationOptions {
  includeSignature?: boolean;
  useCurrentDate?: boolean;
  currentDateOverride?: string;
  addWatermark?: boolean;
}

/**
 * Generate PDS by overlaying data on the real CS Form 212 template
 */
export async function generateRealTemplatePDS(
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
    // Load the REAL official template
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'CS_Form_212_2025.pdf');
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Get pages
    const pages = pdfDoc.getPages();

    // Fill each page with data
    if (pages[0] && pdsData.personal_info) {
      await fillPage1(pages[0], pdsData, font, fontBold);
    }

    if (pages[1]) {
      await fillPage2(pages[1], pdsData, font);
    }

    if (pages[2]) {
      await fillPage3(pages[2], pdsData, font);
    }

    if (pages[3]) {
      await fillPage4(pages[3], pdsData, font, fontBold, includeSignature, useCurrentDate, currentDateOverride);
    }

    // Add watermark if requested
    if (addWatermark) {
      await addWatermarkToPDF(pdfDoc);
    }

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('Error generating real template PDS:', error);
    throw new Error(`Failed to generate template PDS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fill Page 1: Personal Information & Family Background
 */
async function fillPage1(page: any, pdsData: CompletePDS, font: PDFFont, fontBold: PDFFont) {
  const coords = PDF_COORDINATES.page1;
  const pi = pdsData.personal_info;
  const fb = pdsData.family_background;

  if (!pi) return;

  // Section I: Personal Information
  // Name
  if (pi.surname) {
    page.drawText(pi.surname.toUpperCase(), {
      x: coords.personalInfo.surname.x,
      y: coords.personalInfo.surname.y,
      size: coords.personalInfo.surname.size,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.firstName) {
    page.drawText(pi.firstName, {
      x: coords.personalInfo.firstName.x,
      y: coords.personalInfo.firstName.y,
      size: coords.personalInfo.firstName.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.middleName) {
    page.drawText(pi.middleName, {
      x: coords.personalInfo.middleName.x,
      y: coords.personalInfo.middleName.y,
      size: coords.personalInfo.middleName.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.nameExtension) {
    page.drawText(pi.nameExtension, {
      x: coords.personalInfo.nameExtension.x,
      y: coords.personalInfo.nameExtension.y,
      size: coords.personalInfo.nameExtension.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  // Date of Birth, Place of Birth, Sex
  if (pi.dateOfBirth) {
    page.drawText(formatDate(pi.dateOfBirth), {
      x: coords.personalInfo.dateOfBirth.x,
      y: coords.personalInfo.dateOfBirth.y,
      size: coords.personalInfo.dateOfBirth.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.placeOfBirth) {
    page.drawText(truncateText(pi.placeOfBirth, 20), {
      x: coords.personalInfo.placeOfBirth.x,
      y: coords.personalInfo.placeOfBirth.y,
      size: coords.personalInfo.placeOfBirth.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.sexAtBirth) {
    page.drawText(pi.sexAtBirth, {
      x: coords.personalInfo.sex.x,
      y: coords.personalInfo.sex.y,
      size: coords.personalInfo.sex.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  // Civil Status, Height, Weight, Blood Type
  if (pi.civilStatus) {
    page.drawText(pi.civilStatus, {
      x: coords.personalInfo.civilStatus.x,
      y: coords.personalInfo.civilStatus.y,
      size: coords.personalInfo.civilStatus.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.height) {
    page.drawText(`${pi.height}m`, {
      x: coords.personalInfo.height.x,
      y: coords.personalInfo.height.y,
      size: coords.personalInfo.height.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.weight) {
    page.drawText(`${pi.weight}kg`, {
      x: coords.personalInfo.weight.x,
      y: coords.personalInfo.weight.y,
      size: coords.personalInfo.weight.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.bloodType) {
    page.drawText(pi.bloodType, {
      x: coords.personalInfo.bloodType.x,
      y: coords.personalInfo.bloodType.y,
      size: coords.personalInfo.bloodType.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  // Government IDs
  if (pi.umidNo) {
    page.drawText(pi.umidNo, {
      x: coords.personalInfo.gsis.x,
      y: coords.personalInfo.gsis.y,
      size: coords.personalInfo.gsis.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.pagibigNo) {
    page.drawText(pi.pagibigNo, {
      x: coords.personalInfo.pagibig.x,
      y: coords.personalInfo.pagibig.y,
      size: coords.personalInfo.pagibig.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.philhealthNo) {
    page.drawText(pi.philhealthNo, {
      x: coords.personalInfo.philhealth.x,
      y: coords.personalInfo.philhealth.y,
      size: coords.personalInfo.philhealth.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.tinNo) {
    page.drawText(pi.tinNo, {
      x: coords.personalInfo.tin.x,
      y: coords.personalInfo.tin.y,
      size: coords.personalInfo.tin.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  // Addresses
  if (pi.residentialAddress) {
    const ra = pi.residentialAddress;
    if (ra.houseBlockLotNo) {
      page.drawText(truncateText(ra.houseBlockLotNo, 15), {
        x: coords.personalInfo.resHouseNo.x,
        y: coords.personalInfo.resHouseNo.y,
        size: coords.personalInfo.resHouseNo.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (ra.street) {
      page.drawText(truncateText(ra.street, 20), {
        x: coords.personalInfo.resStreet.x,
        y: coords.personalInfo.resStreet.y,
        size: coords.personalInfo.resStreet.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (ra.barangay) {
      page.drawText(truncateText(ra.barangay, 20), {
        x: coords.personalInfo.resBarangay.x,
        y: coords.personalInfo.resBarangay.y,
        size: coords.personalInfo.resBarangay.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (ra.cityMunicipality) {
      page.drawText(truncateText(ra.cityMunicipality, 18), {
        x: coords.personalInfo.resCity.x,
        y: coords.personalInfo.resCity.y,
        size: coords.personalInfo.resCity.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (ra.province) {
      page.drawText(truncateText(ra.province, 15), {
        x: coords.personalInfo.resProvince.x,
        y: coords.personalInfo.resProvince.y,
        size: coords.personalInfo.resProvince.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (ra.zipCode) {
      page.drawText(ra.zipCode, {
        x: coords.personalInfo.resZipCode.x,
        y: coords.personalInfo.resZipCode.y,
        size: coords.personalInfo.resZipCode.size,
        font,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Contact
  if (pi.telephoneNo) {
    page.drawText(pi.telephoneNo, {
      x: coords.personalInfo.telephoneNo.x,
      y: coords.personalInfo.telephoneNo.y,
      size: coords.personalInfo.telephoneNo.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.mobileNo) {
    page.drawText(pi.mobileNo, {
      x: coords.personalInfo.mobileNo.x,
      y: coords.personalInfo.mobileNo.y,
      size: coords.personalInfo.mobileNo.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  if (pi.emailAddress) {
    page.drawText(truncateText(pi.emailAddress, 30), {
      x: coords.personalInfo.emailAddress.x,
      y: coords.personalInfo.emailAddress.y,
      size: coords.personalInfo.emailAddress.size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  // Section II: Family Background
  if (fb?.spouse) {
    const spouse = fb.spouse;
    if (spouse.surname) {
      page.drawText(spouse.surname.toUpperCase(), {
        x: coords.familyBackground.spouseSurname.x,
        y: coords.familyBackground.spouseSurname.y,
        size: coords.familyBackground.spouseSurname.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (spouse.firstName) {
      page.drawText(spouse.firstName, {
        x: coords.familyBackground.spouseFirstName.x,
        y: coords.familyBackground.spouseFirstName.y,
        size: coords.familyBackground.spouseFirstName.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (spouse.middleName) {
      page.drawText(spouse.middleName, {
        x: coords.familyBackground.spouseMiddleName.x,
        y: coords.familyBackground.spouseMiddleName.y,
        size: coords.familyBackground.spouseMiddleName.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (spouse.occupation) {
      page.drawText(truncateText(spouse.occupation, 25), {
        x: coords.familyBackground.spouseOccupation.x,
        y: coords.familyBackground.spouseOccupation.y,
        size: coords.familyBackground.spouseOccupation.size,
        font,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Children (up to 12)
  if (fb?.children && Array.isArray(fb.children)) {
    const childCoords = coords.familyBackground.childrenTableStart;
    fb.children.slice(0, 12).forEach((child: any, index: number) => {
      const y = childCoords.y - (index * childCoords.lineHeight);

      if (child.fullName) {
        page.drawText(truncateText(child.fullName, 30), {
          x: childCoords.x,
          y,
          size: 8,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (child.dateOfBirth) {
        page.drawText(formatDate(child.dateOfBirth), {
          x: childCoords.x + 250,
          y,
          size: 8,
          font,
          color: rgb(0, 0, 0)
        });
      }
    });
  }

  // Parents
  if (fb?.father) {
    if (fb.father.surname) {
      page.drawText(fb.father.surname.toUpperCase(), {
        x: coords.familyBackground.fatherSurname.x,
        y: coords.familyBackground.fatherSurname.y,
        size: coords.familyBackground.fatherSurname.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (fb.father.firstName) {
      page.drawText(fb.father.firstName, {
        x: coords.familyBackground.fatherFirstName.x,
        y: coords.familyBackground.fatherFirstName.y,
        size: coords.familyBackground.fatherFirstName.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (fb.father.middleName) {
      page.drawText(fb.father.middleName, {
        x: coords.familyBackground.fatherMiddleName.x,
        y: coords.familyBackground.fatherMiddleName.y,
        size: coords.familyBackground.fatherMiddleName.size,
        font,
        color: rgb(0, 0, 0)
      });
    }
  }

  if (fb?.mother) {
    if (fb.mother.surname) {
      page.drawText(fb.mother.surname.toUpperCase(), {
        x: coords.familyBackground.motherSurname.x,
        y: coords.familyBackground.motherSurname.y,
        size: coords.familyBackground.motherSurname.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (fb.mother.firstName) {
      page.drawText(fb.mother.firstName, {
        x: coords.familyBackground.motherFirstName.x,
        y: coords.familyBackground.motherFirstName.y,
        size: coords.familyBackground.motherFirstName.size,
        font,
        color: rgb(0, 0, 0)
      });
    }

    if (fb.mother.middleName) {
      page.drawText(fb.mother.middleName, {
        x: coords.familyBackground.motherMiddleName.x,
        y: coords.familyBackground.motherMiddleName.y,
        size: coords.familyBackground.motherMiddleName.size,
        font,
        color: rgb(0, 0, 0)
      });
    }
  }
}

/**
 * Fill Page 2: Educational Background & Eligibility
 */
async function fillPage2(page: any, pdsData: CompletePDS, font: PDFFont) {
  const coords = PDF_COORDINATES.page2;

  // Section III: Educational Background (up to 5 entries)
  if (pdsData.educational_background && Array.isArray(pdsData.educational_background)) {
    const eduTable = coords.educationTable;
    pdsData.educational_background.slice(0, 5).forEach((edu: any, index: number) => {
      const y = getTableRowY(eduTable.startY, index, eduTable.lineHeight);
      const fontSize = 7;

      if (edu.level) {
        page.drawText(truncateText(edu.level, 12), {
          x: eduTable.columns.level.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (edu.nameOfSchool) {
        page.drawText(truncateText(edu.nameOfSchool, 22), {
          x: eduTable.columns.schoolName.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (edu.basicEducationDegreeCourse) {
        page.drawText(truncateText(edu.basicEducationDegreeCourse, 20), {
          x: eduTable.columns.course.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (edu.periodOfAttendance?.from) {
        page.drawText(formatYear(edu.periodOfAttendance.from), {
          x: eduTable.columns.periodFrom.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (edu.periodOfAttendance?.to) {
        page.drawText(formatYear(edu.periodOfAttendance.to), {
          x: eduTable.columns.periodTo.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (edu.yearGraduated) {
        page.drawText(edu.yearGraduated.toString(), {
          x: eduTable.columns.yearGraduated.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }
    });
  }

  // Section IV: Eligibility (up to 7 entries)
  if (pdsData.eligibility && Array.isArray(pdsData.eligibility)) {
    const eligTable = coords.eligibilityTable;
    pdsData.eligibility.slice(0, 7).forEach((elig: any, index: number) => {
      const y = getTableRowY(eligTable.startY, index, eligTable.lineHeight);
      const fontSize = 7;

      if (elig.careerService) {
        page.drawText(truncateText(elig.careerService, 20), {
          x: eligTable.columns.careerService.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (elig.rating) {
        page.drawText(elig.rating, {
          x: eligTable.columns.rating.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (elig.dateOfExaminationConferment) {
        page.drawText(formatDate(elig.dateOfExaminationConferment), {
          x: eligTable.columns.dateOfExam.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (elig.placeOfExaminationConferment) {
        page.drawText(truncateText(elig.placeOfExaminationConferment, 18), {
          x: eligTable.columns.placeOfExam.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (elig.licenseNumber) {
        page.drawText(elig.licenseNumber, {
          x: eligTable.columns.licenseNumber.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }
    });
  }
}

/**
 * Fill Page 3: Work Experience & Voluntary Work
 */
async function fillPage3(page: any, pdsData: CompletePDS, font: PDFFont) {
  const coords = PDF_COORDINATES.page3;

  // Section V: Work Experience (up to 28 entries)
  if (pdsData.work_experience && Array.isArray(pdsData.work_experience)) {
    const workTable = coords.workExperienceTable;
    pdsData.work_experience.slice(0, 28).forEach((work: any, index: number) => {
      const y = getTableRowY(workTable.startY, index, workTable.lineHeight);
      const fontSize = 6;

      if (work.periodOfService?.from) {
        page.drawText(formatDate(work.periodOfService.from), {
          x: workTable.columns.periodFrom.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (work.periodOfService?.to) {
        const toText = work.periodOfService.to === 'Present' ? 'Present' : formatDate(work.periodOfService.to);
        page.drawText(toText, {
          x: workTable.columns.periodTo.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (work.positionTitle) {
        page.drawText(truncateText(work.positionTitle, 20), {
          x: workTable.columns.position.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (work.departmentAgencyOfficeCompany) {
        page.drawText(truncateText(work.departmentAgencyOfficeCompany, 18), {
          x: workTable.columns.department.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (work.monthlySalary) {
        page.drawText(work.monthlySalary.toString(), {
          x: workTable.columns.monthlySalary.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (work.salaryGrade) {
        page.drawText(work.salaryGrade, {
          x: workTable.columns.salaryGrade.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (work.governmentService !== undefined) {
        page.drawText(work.governmentService ? 'Y' : 'N', {
          x: workTable.columns.govtService.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }
    });
  }

  // Section VI: Voluntary Work (up to 7 entries)
  if (pdsData.voluntary_work && Array.isArray(pdsData.voluntary_work)) {
    const volTable = coords.voluntaryWorkTable;
    pdsData.voluntary_work.slice(0, 7).forEach((vol: any, index: number) => {
      const y = getTableRowY(volTable.startY, index, volTable.lineHeight);
      const fontSize = 7;

      if (vol.organizationName) {
        page.drawText(truncateText(vol.organizationName, 25), {
          x: volTable.columns.organization.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (vol.periodOfInvolvement?.from) {
        page.drawText(formatDate(vol.periodOfInvolvement.from), {
          x: volTable.columns.periodFrom.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (vol.periodOfInvolvement?.to) {
        const toText = vol.periodOfInvolvement.to === 'Present' ? 'Present' : formatDate(vol.periodOfInvolvement.to);
        page.drawText(toText, {
          x: volTable.columns.periodTo.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (vol.numberOfHours) {
        page.drawText(vol.numberOfHours.toString(), {
          x: volTable.columns.hours.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (vol.positionNatureOfWork) {
        page.drawText(truncateText(vol.positionNatureOfWork, 22), {
          x: volTable.columns.position.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }
    });
  }
}

/**
 * Fill Page 4: Trainings & Other Information
 */
async function fillPage4(
  page: any,
  pdsData: CompletePDS,
  font: PDFFont,
  fontBold: PDFFont,
  includeSignature: boolean,
  useCurrentDate: boolean,
  currentDateOverride?: string
) {
  const coords = PDF_COORDINATES.page4;

  // Section VII: Trainings (up to 21 entries)
  if (pdsData.trainings && Array.isArray(pdsData.trainings)) {
    const trainTable = coords.trainingsTable;
    pdsData.trainings.slice(0, 21).forEach((train: any, index: number) => {
      const y = getTableRowY(trainTable.startY, index, trainTable.lineHeight);
      const fontSize = 6;

      if (train.title) {
        page.drawText(truncateText(train.title, 25), {
          x: trainTable.columns.title.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (train.periodOfAttendance?.from) {
        page.drawText(formatDate(train.periodOfAttendance.from), {
          x: trainTable.columns.periodFrom.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (train.periodOfAttendance?.to) {
        page.drawText(formatDate(train.periodOfAttendance.to), {
          x: trainTable.columns.periodTo.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (train.numberOfHours) {
        page.drawText(train.numberOfHours.toString(), {
          x: trainTable.columns.hours.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (train.typeOfLD) {
        page.drawText(truncateText(train.typeOfLD, 12), {
          x: trainTable.columns.type.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      if (train.conductedSponsoredBy) {
        page.drawText(truncateText(train.conductedSponsoredBy, 18), {
          x: trainTable.columns.sponsor.x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }
    });
  }

  // Section VIII: Other Information
  if (pdsData.other_information) {
    const oi = pdsData.other_information;

    // Skills
    if (oi.skills && Array.isArray(oi.skills)) {
      const skillsCoords = coords.otherInformation.skillsStart;
      oi.skills.slice(0, 21).forEach((skill: string, index: number) => {
        const col = index % skillsCoords.columns;
        const row = Math.floor(index / skillsCoords.columns);
        const x = skillsCoords.x + (col * skillsCoords.columnWidth);
        const y = skillsCoords.y - (row * skillsCoords.lineHeight);

        page.drawText(truncateText(skill, 25), {
          x,
          y,
          size: 7,
          font,
          color: rgb(0, 0, 0)
        });
      });
    }

    // Signature and Date
    if (includeSignature && oi.declaration?.signatureData) {
      // Signature embedding would go here - complex, skipping for now
      // In production, you'd embed the signature image at signatureX, signatureY
    }

    const dateToUse = useCurrentDate
      ? currentDateOverride || new Date().toISOString()
      : oi.declaration?.dateAccomplished || new Date().toISOString();

    page.drawText(formatDate(dateToUse), {
      x: coords.otherInformation.dateAccomplished.x,
      y: coords.otherInformation.dateAccomplished.y,
      size: coords.otherInformation.dateAccomplished.size,
      font,
      color: rgb(0, 0, 0)
    });
  }
}

/**
 * Add watermark to all pages
 */
async function addWatermarkToPDF(pdfDoc: PDFDocument) {
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const page of pages) {
    const { width, height } = page.getSize();

    page.drawText('Official Copy - Generated by JobSync', {
      x: width / 2 - 120,
      y: height - 15,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.6
    });
  }
}

/**
 * Helper: Format date as MM/DD/YYYY
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Helper: Format year from date
 */
function formatYear(isoDate: string): string {
  if (!isoDate) return '';
  return new Date(isoDate).getFullYear().toString();
}

/**
 * Helper: Truncate text to fit field
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength - 2) + '..' : text;
}
