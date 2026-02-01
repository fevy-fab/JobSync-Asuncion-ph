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
    surname: pt(150, 117),
    firstName: pt(150, 132),
    middleName: pt(150, 147),
    nameExtension: pt(434, 134),

    dateOfBirth: pt(190, 166),
    placeOfBirth: pt(150, 187),

    sexMale: pt(153, 203),
    sexFemale: pt(222, 203),

    civilStatusSingle: pt(152.8, 217.5),
    civilStatusMarried: pt(222.2, 217.5),
    civilStatusWidowed: pt(153, 227),
    civilStatusSeparated: pt(222, 227),
    civilStatusOthers: pt(153, 237),
    civilStatusOthersText: pt(186, 237),

    height: pt(150, 253),
    weight: pt(150, 268),
    bloodType: pt(150, 284),

    umidNo: pt(150, 301.5),
    pagibigNo: pt(150, 318),
    philhealthNo: pt(150, 335),
    sssNo: pt(150, 330),
    philsysNo: pt(150, 352),
    tinNo: pt(150, 368.5),
    agencyEmployeeNo: pt(150, 385),

    citizenshipFilipino: pt(380, 165  ),
    citizenshipDual: pt(425, 165),
    citizenshipDualByBirth: pt(436, 176),
    citizenshipDualByNaturalization: pt(475, 176),
    dualCitizenshipCountry: pt(432, 203),

    residentialHouseNo: pt(340, 217),
    residentialStreet: pt(442, 217),
    residentialSubdivision: pt(340, 233),
    residentialBarangay: pt(442, 233),
    residentialCity: pt(340, 250),
    residentialProvince: pt(442, 250),
    residentialZip: pt(340, 268),

    permanentHouseNo: pt(340, 281),
    permanentStreet: pt(442, 281),
    permanentSubdivision: pt(340, 298),
    permanentBarangay: pt(442, 298),
    permanentCity: pt(340, 315),
    permanentProvince: pt(442, 315),
    permanentZip: pt(340, 335),

    telephoneNo: pt(340, 352),
    mobileNo: pt(340, 368),
    emailAddress: pt(340, 384),

    spouseSurname: pt(150, 412),
    spouseFirstName: pt(150, 426),
    spouseMiddleName: pt(150, 439),
    spouseOccupation: pt(150, 454),
    spouseEmployer: pt(150, 468),
    spouseBusinessAddress: pt(150, 483),
    spouseTelephone: pt(150, 497),

    fatherSurname: pt(150, 512),
    fatherFirstName: pt(150, 526),
    fatherMiddleName: pt(150, 540),

    motherSurname: pt(150, 567),
    motherFirstName: pt(150, 581),
    motherMiddleName: pt(150, 595),

    childrenNameX: 340,
    childrenDobX: 500,
    childrenStartTop: 426,
    childrenRowStep: 14.1,
    childrenMaxRows: 12,

    educational: {
      startTop: 656,
      rowStep: 19,
      maxRows: 5,
      levelX: 70,
      nameOfSchoolX: 150,
      basicEducationX: 267,
      basicEducationMaxWidth: 155,
      fromX: 379,
      toX: 408,
      highestLevelX: 446,
      yearGraduatedX: 486,
      scholarshipX: 512,
    },
  },

  page2: {
    eligibility: {
      startTop: 65,
      rowStep: 19.7,
      maxRows: 7,
      careerServiceX: 105,
      ratingX: 270,
      dateOfExamX: 314.5,
      placeOfExamX: 360,
      licenseNumberX: 447,
      licenseValidityX: 484,
    },

    workExperience: {
      startTop: 269,
      rowStep: 17.40,
      maxRows: 28,
      fromX: 105,
      toX: 144,
      positionTitleX: 182,
      departmentX: 306,
      statusOfAppointmentX: 431,
      govServiceX: 497,
    },

    declarationDate: pt(470, 735),
  },

  page3: {
    voluntaryWork: {
      startTop: 80,
      rowStep: 18.35,
      maxRows: 8,
      organizationNameX: 65,
      fromX: 283,
      toX: 322,
      hoursX: 372,
      positionX: 397,
    },

    trainings: {
      startTop: 263.5,
      rowStep: 16.20,
      maxRows: 21,
      titleX: 65,
      fromX: 282,
      toX: 321,
      hoursX: 372,
      typeOfLDX: 396,
      conductedByX: 440,
    },

    skills: { startTop: 650, rowStep: 16.20, maxRows: 7, x: 65 },
    recognitions: { startTop: 650, rowStep: 16.20, maxRows: 7, x: 191 },
    memberships: { startTop: 650, rowStep: 16.20, maxRows: 7, x: 437 },

    declarationDate: pt(470, 745),
  },

  page4: {
    questions: {
      q34a_yes: pt(384, 68),
      q34a_no: pt(434, 68),
      q34a_details: pt(300, 200),

      q34b_yes: pt(384, 81),
      q34b_no: pt(435, 81),
      q34b_details: pt(390, 103),

      q35a_yes: pt(382.50, 119),
      q35a_no: pt(437, 119),
      q35a_details: pt(390, 143),

      q35b_yes: pt(382.50, 161),
      q35b_no: pt(439, 160),
      q35b_details: pt(450, 190),
      q35b_dateFiled: pt(442, 182),
      q35b_status: pt(442, 194),

      q36_yes: pt(440, 210),
      q36_no: pt(441, 211),
      q36_details: pt(390, 233),

      q37_yes: pt(381.50, 251),
      q37_no: pt(440, 251),
      q37_details: pt(390, 267),

      q38a_yes: pt(382.40, 285),
      q38a_no: pt(445, 285),
      q38a_details: pt(443, 295),

      q38b_yes: pt(383.40, 309),
      q38b_no: pt(446, 310),
      q38b_details: pt(443, 322),

      q39_yes: pt(383, 338),
      q39_no: pt(445, 339),
      q39_country: pt(390, 357),

      q40a_yes: pt(382.50, 407),
      q40a_no: pt(446, 407),
      q40a_group: pt(474, 416),

      q40b_yes: pt(382.50, 428),
      q40b_no: pt(446, 428),
      q40b_id: pt(474, 438),

      q40c_yes: pt(382.50, 450),
      q40c_no: pt(446, 450),
      q40c_id: pt(474, 457),
    },

    references: {
      startTop: 507,
      rowStep: 18,
      maxRows: 3,
      nameX: 70,
      addressX: 260,
      telephoneX: 375,
    },

    govIdType: pt(137, 648),
    govIdNumber: pt(137, 664),
    govIdDateIssued: pt(137, 681),

    declarationDateAccomplished: pt(325, 676),

    signatureBox: {
      x: 230,
      y: yFromTop(670),
      w: 220,
      h: 55,
    } as PdfRect,
  },
} as const;
