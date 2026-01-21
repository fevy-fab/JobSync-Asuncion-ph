/**
 * PDF Template Coordinates Mapping
 *
 * Coordinates for text placement on the official CS Form 212, Revised 2025 template.
 * All coordinates are in PDF points (1 point = 1/72 inch)
 *
 * Coordinate System:
 * - Origin (0,0) is at BOTTOM-LEFT corner
 * - X increases to the RIGHT
 * - Y increases UPWARD
 * - Page size: 612 x 792 points (8.5" x 11")
 *
 * NOTE: These coordinates are approximate and based on visual inspection.
 * They may need fine-tuning based on the actual template layout.
 */

// Helper to convert from top-down to bottom-up coordinates
const fromTop = (y: number) => 792 - y;

export const PDF_COORDINATES = {
  // Page 1: Personal Information & Family Background
  page1: {
    // Section I: Personal Information
    personalInfo: {
      surname: { x: 150, y: fromTop(120), size: 10 },
      firstName: { x: 300, y: fromTop(120), size: 10 },
      middleName: { x: 450, y: fromTop(120), size: 10 },
      nameExtension: { x: 560, y: fromTop(120), size: 8 },

      dateOfBirth: { x: 150, y: fromTop(145), size: 9 },
      placeOfBirth: { x: 300, y: fromTop(145), size: 9 },
      sex: { x: 520, y: fromTop(145), size: 9 },

      civilStatus: { x: 150, y: fromTop(170), size: 9 },
      height: { x: 300, y: fromTop(170), size: 9 },
      weight: { x: 380, y: fromTop(170), size: 9 },
      bloodType: { x: 460, y: fromTop(170), size: 9 },

      gsis: { x: 150, y: fromTop(195), size: 8 },
      pagibig: { x: 330, y: fromTop(195), size: 8 },
      philhealth: { x: 150, y: fromTop(220), size: 8 },
      sss: { x: 330, y: fromTop(220), size: 8 },
      tin: { x: 150, y: fromTop(245), size: 8 },
      employeeNo: { x: 330, y: fromTop(245), size: 8 },

      citizenship: { x: 150, y: fromTop(270), size: 9 },
      dualCitizenshipType: { x: 350, y: fromTop(270), size: 8 },

      // Residential Address
      resHouseNo: { x: 150, y: fromTop(305), size: 8 },
      resStreet: { x: 250, y: fromTop(305), size: 8 },
      resSubdivision: { x: 400, y: fromTop(305), size: 8 },
      resBarangay: { x: 150, y: fromTop(325), size: 8 },
      resCity: { x: 300, y: fromTop(325), size: 8 },
      resProvince: { x: 450, y: fromTop(325), size: 8 },
      resZipCode: { x: 550, y: fromTop(325), size: 8 },

      // Permanent Address
      permHouseNo: { x: 150, y: fromTop(360), size: 8 },
      permStreet: { x: 250, y: fromTop(360), size: 8 },
      permSubdivision: { x: 400, y: fromTop(360), size: 8 },
      permBarangay: { x: 150, y: fromTop(380), size: 8 },
      permCity: { x: 300, y: fromTop(380), size: 8 },
      permProvince: { x: 450, y: fromTop(380), size: 8 },
      permZipCode: { x: 550, y: fromTop(380), size: 8 },

      telephoneNo: { x: 150, y: fromTop(410), size: 9 },
      mobileNo: { x: 350, y: fromTop(410), size: 9 },
      emailAddress: { x: 150, y: fromTop(435), size: 9 },
    },

    // Section II: Family Background
    familyBackground: {
      spouseSurname: { x: 150, y: fromTop(480), size: 9 },
      spouseFirstName: { x: 300, y: fromTop(480), size: 9 },
      spouseMiddleName: { x: 450, y: fromTop(480), size: 9 },
      spouseOccupation: { x: 150, y: fromTop(505), size: 8 },
      spouseEmployer: { x: 350, y: fromTop(505), size: 8 },
      spouseBusinessAddress: { x: 150, y: fromTop(530), size: 8 },
      spouseTelephoneNo: { x: 450, y: fromTop(530), size: 8 },

      // Children - table rows (up to 12 children)
      childrenTableStart: { x: 150, y: fromTop(575), lineHeight: 15 },

      fatherSurname: { x: 150, y: fromTop(760), size: 9 },
      fatherFirstName: { x: 300, y: fromTop(760), size: 9 },
      fatherMiddleName: { x: 450, y: fromTop(760), size: 9 },

      motherSurname: { x: 150, y: fromTop(785), size: 9 },
      motherFirstName: { x: 300, y: fromTop(785), size: 9 },
      motherMiddleName: { x: 450, y: fromTop(785), size: 9 },
    }
  },

  // Page 2: Educational Background & Eligibility
  page2: {
    // Section III: Educational Background (table with 5 rows)
    educationTable: {
      startY: fromTop(120),
      lineHeight: 40, // Approximate space per education entry
      columns: {
        level: { x: 60, width: 80 },
        schoolName: { x: 145, width: 150 },
        course: { x: 300, width: 130 },
        periodFrom: { x: 435, width: 40 },
        periodTo: { x: 480, width: 40 },
        unitsEarned: { x: 525, width: 35 },
        yearGraduated: { x: 565, width: 40 },
        honors: { x: 610, width: 80 }
      }
    },

    // Section IV: Civil Service Eligibility (table)
    eligibilityTable: {
      startY: fromTop(360),
      lineHeight: 35,
      columns: {
        careerService: { x: 60, width: 140 },
        rating: { x: 205, width: 40 },
        dateOfExam: { x: 250, width: 70 },
        placeOfExam: { x: 325, width: 120 },
        licenseNumber: { x: 450, width: 70 },
        licenseValidity: { x: 525, width: 70 }
      }
    }
  },

  // Page 3: Work Experience & Voluntary Work
  page3: {
    // Section V: Work Experience (table)
    workExperienceTable: {
      startY: fromTop(120),
      lineHeight: 30,
      columns: {
        periodFrom: { x: 60, width: 45 },
        periodTo: { x: 110, width: 45 },
        position: { x: 160, width: 140 },
        department: { x: 305, width: 130 },
        monthlySalary: { x: 440, width: 60 },
        salaryGrade: { x: 505, width: 35 },
        statusOfAppointment: { x: 545, width: 70 },
        govtService: { x: 620, width: 25 }
      }
    },

    // Section VI: Voluntary Work (table)
    voluntaryWorkTable: {
      startY: fromTop(520),
      lineHeight: 30,
      columns: {
        organization: { x: 60, width: 180 },
        periodFrom: { x: 245, width: 45 },
        periodTo: { x: 295, width: 45 },
        hours: { x: 345, width: 40 },
        position: { x: 390, width: 160 }
      }
    }
  },

  // Page 4: Trainings & Other Information
  page4: {
    // Section VII: Learning & Development (table)
    trainingsTable: {
      startY: fromTop(120),
      lineHeight: 28,
      columns: {
        title: { x: 60, width: 180 },
        periodFrom: { x: 245, width: 45 },
        periodTo: { x: 295, width: 45 },
        hours: { x: 345, width: 35 },
        type: { x: 385, width: 80 },
        sponsor: { x: 470, width: 130 }
      }
    },

    // Section VIII: Other Information
    otherInformation: {
      // Skills (3 columns, 7 rows)
      skillsStart: { x: 70, y: fromTop(420), lineHeight: 12, columns: 3, columnWidth: 180 },

      // Recognitions (similar layout)
      recognitionsStart: { x: 70, y: fromTop(500), lineHeight: 12, columns: 3, columnWidth: 180 },

      // Memberships
      membershipsStart: { x: 70, y: fromTop(570), lineHeight: 12, columns: 3, columnWidth: 180 },

      // References (3 references)
      referencesStart: { x: 70, y: fromTop(640), lineHeight: 20 },

      // Government ID
      govtIdType: { x: 150, y: fromTop(710), size: 8 },
      govtIdNumber: { x: 350, y: fromTop(710), size: 8 },
      govtIdIssuedDate: { x: 500, y: fromTop(710), size: 8 },

      // Signature area
      signatureX: 120,
      signatureY: fromTop(770),
      signatureWidth: 150,
      signatureHeight: 40,

      dateAccomplished: { x: 450, y: fromTop(780), size: 9 }
    }
  }
};

// Helper functions for coordinate calculation
export function getTableRowY(startY: number, rowIndex: number, lineHeight: number): number {
  return startY - (rowIndex * lineHeight);
}

export function getColumnX(columnConfig: { x: number; width: number }): number {
  return columnConfig.x;
}
