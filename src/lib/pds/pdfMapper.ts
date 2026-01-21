export type PdfPoint = { x: number; y: number };
export type PdfRect = { x: number; y: number; w: number; h: number };

export const PDF_PAGE_SIZE = {
  width: 612, // US Letter
  height: 792,
} as const;

export function yFromTop(yTop: number, pageHeight = PDF_PAGE_SIZE.height): number {
  return pageHeight - yTop;
}

export function pt(x: number, yTop: number, pageHeight = PDF_PAGE_SIZE.height): PdfPoint {
  return { x, y: yFromTop(yTop, pageHeight) };
}

export const PDS_PDF_MAP = {
  page1: {
    surname: pt(150, 120),
    firstName: pt(150, 135),
    middleName: pt(150, 150),
    nameExtension: pt(435, 135),

    dateOfBirth: pt(150, 170),
    placeOfBirth: pt(150, 185),

    sexMale: pt(155, 202),
    sexFemale: pt(225, 202),

    civilStatusSingle: pt(155, 216),
    civilStatusMarried: pt(226, 216),
    civilStatusWidowed: pt(156, 226),
    civilStatusSeparated: pt(226, 227),
    civilStatusOthers: pt(155, 237),
    civilStatusOthersText: pt(520, 238),

    height: pt(150, 255),
    weight: pt(150, 270),
    bloodType: pt(150, 285),

    umidNo: pt(150, 300),
    pagibigNo: pt(150, 320),
    philhealthNo: pt(150, 340),
    sssNo: pt(150, 355),
    philsysNo: pt(150, 357),
    tinNo: pt(150, 370),
    agencyEmployeeNo: pt(150, 386),

    citizenshipFilipino: pt(382, 163),
    citizenshipDualByBirth: pt(428, 163),
    citizenshipDualByNaturalization: pt(476, 173),
    dualCitizenshipCountry: pt(432, 201),

    residentialHouseNo: pt(365, 220),
    residentialStreet: pt(470, 220),
    residentialSubdivision: pt(365, 235),
    residentialBarangay: pt(470, 235),
    residentialCity: pt(365, 250),
    residentialProvince: pt(470, 250),
    residentialZip: pt(365, 268),

    permanentHouseNo: pt(365, 281),
    permanentStreet: pt(470, 281),
    permanentSubdivision: pt(365, 298),
    permanentBarangay: pt(470, 298),
    permanentCity: pt(365, 315),
    permanentProvince: pt(470, 315),
    permanentZip: pt(365, 335),

    telephoneNo: pt(365, 352),
    mobileNo: pt(365, 368),
    emailAddress: pt(365, 384),

    spouseSurname: pt(150, 415),
    spouseFirstName: pt(150, 430),
    spouseMiddleName: pt(150, 441),
    spouseOccupation: pt(150, 455),
    spouseEmployer: pt(150, 468),
    spouseBusinessAddress: pt(150, 485),
    spouseTelephone: pt(150, 497),

    fatherSurname: pt(150, 512),
    fatherFirstName: pt(150, 526),
    fatherMiddleName: pt(150, 540),

    motherSurname: pt(150, 570),
    motherFirstName: pt(150, 584),
    motherMiddleName: pt(150, 597),

    childrenNameX: 350,
    childrenDobX: 515,
    childrenStartTop: 430,
    childrenRowStep: 21,
    childrenMaxRows: 8,

    educational: {
      startTop: 660,
      rowStep: 18,
      maxRows: 5,
      levelX: 70,
      nameOfSchoolX: 160,
      basicEducationX: 270,
      basicEducationMaxWidth: 155,
      fromX: 380,
      toX: 410,
      highestLevelX: 450,
      yearGraduatedX: 490,
      scholarshipX: 530,
    },
  },

  page2: {
    eligibility: {
      startTop: 65,
      rowStep: 18,
      maxRows: 7,
      careerServiceX: 100,
      ratingX: 270,
      dateOfExamX: 320,
      placeOfExamX: 380,
      licenseNumberX: 450,
      licenseValidityX: 545,
    },

    workExperience: {
      startTop: 275,
      rowStep: 14,
      maxRows: 28,
      fromX: 100,
      toX: 140,
      positionTitleX: 200,
      departmentX: 330,
      statusOfAppointmentX: 440,
      govServiceX: 490,
    },

    declarationDate: pt(470, 735),
  },

  page3: {
    voluntaryWork: {
      startTop: 80,
      rowStep: 18,
      maxRows: 8,
      organizationNameX: 65,
      fromX: 280,
      toX: 320,
      hoursX: 380,
      positionX: 445,
    },

    trainings: {
      startTop: 265,
      rowStep: 14,
      maxRows: 20,
      titleX: 65,
      fromX: 280,
      toX: 320,
      hoursX: 380,
      typeOfLDX: 400,
      conductedByX: 450,
    },

    skills: { startTop: 650, rowStep: 16, maxRows: 7, x: 65 },
    recognitions: { startTop: 650, rowStep: 16, maxRows: 7, x: 240 },
    memberships: { startTop: 650, rowStep: 16, maxRows: 7, x: 440 },

    declarationDate: pt(470, 745),
  },

  page4: {
    questions: {
      q34a_yes: pt(388, 64),
      q34a_no: pt(437, 65),
      q34a_details: pt(400, 105),

      q34b_yes: pt(388, 77),
      q34b_no: pt(438, 79),
      q34b_details: pt(475, 105),

      q35a_yes: pt(385, 117),
      q35a_no: pt(440, 117),
      q35a_details: pt(400, 143),

      q35b_yes: pt(388, 157),
      q35b_no: pt(439, 157),
      q35b_details: pt(450, 192),
      q35b_dateFiled: pt(450, 180),
      q35b_status: pt(495, 194),

      q36_yes: pt(387, 210),
      q36_no: pt(445, 210),
      q36_details: pt(400, 230),

      q37_yes: pt(387, 250),
      q37_no: pt(445, 250),
      q37_details: pt(400, 267),

      q38a_yes: pt(387, 283),
      q38a_no: pt(450, 285),
      q38a_details: pt(480, 290),

      q38b_yes: pt(388, 308),
      q38b_no: pt(450, 310),
      q38b_details: pt(470, 317),

      q39_yes: pt(388, 337),
      q39_no: pt(450, 340),
      q39_country: pt(400, 356),

      q40a_yes: pt(388, 407),
      q40a_no: pt(450, 407),
      q40a_group: pt(490, 415),

      q40b_yes: pt(388, 428),
      q40b_no: pt(450, 428),
      q40b_id: pt(490, 438),

      q40c_yes: pt(388, 451),
      q40c_no: pt(450, 451),
      q40c_id: pt(490, 460),
    },

    references: {
      startTop: 510,
      rowStep: 18,
      maxRows: 3,
      nameX: 106,
      addressX: 272,
      telephoneX: 375,
    },

    govIdType: pt(137, 652),
    govIdNumber: pt(137, 667),
    govIdDateIssued: pt(137, 683),

    declarationDateAccomplished: pt(320, 679),

    signatureBox: {
      x: 230,
      y: yFromTop(670),
      w: 220,
      h: 55,
    } as PdfRect,
  },
} as const;
