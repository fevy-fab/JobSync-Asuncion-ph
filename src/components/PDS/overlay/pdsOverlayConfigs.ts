/* =====================================================================================
   FILE: pdsOverlayConfigs.ts
   ===================================================================================== */
import type { OverlayField } from './PDFOverlayRenderer';

export const PDS_PAGE_ASPECT = {
  page1: 0.7724609375,
  page2: 0.7724609375,
  page3: 0.7724609375,
  page4: 0.7724609375,
};

/**
 * ✅ STEP 1 = PAGE 1 ONLY
 * Includes:
 * - Personal Information
 * - Family Background
 * - Educational Background
 */
export const PAGE1_STEP1_FIELDS: OverlayField[] = [
  // ======================================================================
  // PERSONAL INFORMATION (your provided alignment) — formKey: 'personal'
  // ======================================================================
  { key: 'surname', name: 'surname', type: 'text', xPct: 23.8, yPct: 13.4, wPct:66.5, hPct: 1.9, formKey: 'personal' },
  { key: 'firstName', name: 'firstName', type: 'text', xPct: 23.8, yPct: 15.3, wPct: 46.6, hPct: 1.9, formKey: 'personal' },
  { key: 'middleName', name: 'middleName', type: 'text', xPct: 23.8, yPct: 17.2, wPct: 66.5, hPct: 1.9, formKey: 'personal' },
  { key: 'nameExtension', name: 'nameExtension', type: 'text', xPct: 70.4, yPct: 15.6, wPct: 20, hPct: 1.5, formKey: 'personal' },

  { key: 'dob', name: 'dateOfBirth', type: 'date', xPct: 23.8, yPct: 19.3, wPct: 19.2, hPct: 3.1, formKey: 'personal' },
  { key: 'pob', name: 'placeOfBirth', type: 'text', xPct: 23.8, yPct: 22.3, wPct: 19.2, hPct: 2, formKey: 'personal' },

  { key: 'sexAtBirth_male', name: 'sexAtBirth', type: 'checkbox', xPct: 25, yPct: 25, wPct: 1, hPct: 1, checkboxValue: 'Male', formKey: 'personal' },
  { key: 'sexAtBirth_female', name: 'sexAtBirth', type: 'checkbox', xPct: 36.5, yPct: 25, wPct: 1, hPct: 1, checkboxValue: 'Female', formKey: 'personal' },

  { key: 'civil_single', name: 'civilStatus', type: 'checkbox', xPct: 25, yPct: 26.8, wPct: 1, hPct: 1, checkboxValue: 'Single', formKey: 'personal' },
  { key: 'civil_widowed', name: 'civilStatus', type: 'checkbox', xPct: 25, yPct: 28.0, wPct: 1, hPct: 1, checkboxValue: 'Widowed', formKey: 'personal' },
  { key: 'civil_others', name: 'civilStatus', type: 'checkbox', xPct: 25, yPct: 29.3, wPct: 1, hPct: 1, checkboxValue: 'Other/s', formKey: 'personal' },

  { key: 'civil_married', name: 'civilStatus', type: 'checkbox', xPct: 36.3, yPct: 27.0, wPct: 1, hPct: 1, checkboxValue: 'Married', formKey: 'personal' },
  { key: 'civil_separated', name: 'civilStatus', type: 'checkbox', xPct: 36.3, yPct: 28.0, wPct: 1, hPct: 1, checkboxValue: 'Separated', formKey: 'personal' },

  { key: 'civilStatusOthers', name: 'civilStatusOthers', type: 'text', xPct: 30.3, yPct: 28.8, wPct: 12.8, hPct: 1.7, formKey: 'personal' },

  { key: 'cit_filipino', name: 'citizenship', type: 'checkbox', xPct: 62, yPct: 20.1, wPct: 1, hPct: 1, checkboxValue: 'Filipino', formKey: 'personal' },
  { key: 'cit_dual', name: 'citizenship', type: 'checkbox', xPct: 69.5, yPct: 20.1, wPct: 1, hPct: 1, checkboxValue: 'Dual Citizenship', formKey: 'personal' },

  { key: 'dual_by_birth', name: 'dualCitizenshipType', type: 'checkbox', xPct: 71.5, yPct: 21.5, wPct: 1, hPct: 1, checkboxValue: 'by birth', formKey: 'personal' },
  { key: 'dual_by_naturalization', name: 'dualCitizenshipType', type: 'checkbox', xPct: 77.6, yPct: 21.5, wPct: 1, hPct: 1, checkboxValue: 'by naturalization', formKey: 'personal' },

  { key: 'dual_country', name: 'dualCitizenshipCountry', type: 'text', xPct: 60.6, yPct: 24.4, wPct: 26, hPct: 2.3, formKey: 'personal' },

  { key: 'height', name: 'height', type: 'number', xPct: 23.8, yPct: 30.7, wPct: 19.2, hPct: 2.1, formKey: 'personal' },
  { key: 'weight', name: 'weight', type: 'number', xPct: 23.8, yPct: 32.6, wPct: 19.2, hPct: 2, formKey: 'personal' },
  { key: 'bloodType', name: 'bloodType', type: 'text', xPct: 23.8, yPct: 34.7, wPct: 19.2, hPct: 2.1, formKey: 'personal' },

  { key: 'umid', name: 'umidNo', type: 'text', xPct: 23.8, yPct: 36.8, wPct: 19.2, hPct: 2.1, formKey: 'personal' },
  { key: 'pagibig', name: 'pagibigNo', type: 'text', xPct: 23.8, yPct: 38.9, wPct: 19.2, hPct: 2.1, formKey: 'personal' },
  { key: 'philhealth', name: 'philhealthNo', type: 'text', xPct: 23.8, yPct: 41, wPct: 19.2, hPct: 2.1, formKey: 'personal' },
  { key: 'philsys', name: 'philsysNo', type: 'text', xPct: 23.8, yPct: 43.2, wPct: 19.2, hPct: 2.1, formKey: 'personal' },
  { key: 'tin', name: 'tinNo', type: 'text', xPct: 23.8, yPct: 45.3, wPct: 19.2, hPct: 2.1, formKey: 'personal' },
  { key: 'agency', name: 'agencyEmployeeNo', type: 'text', xPct: 23.8, yPct: 47.5, wPct: 19.2, hPct: 2.1, formKey: 'personal' },

  { key: 'telephone', name: 'telephoneNo', type: 'text', xPct: 54.8, yPct: 43.2, wPct: 35.4, hPct: 2.1, formKey: 'personal' },
  { key: 'mobile', name: 'mobileNo', type: 'text', xPct: 54.8, yPct: 45.3, wPct: 35.4, hPct: 2.1, formKey: 'personal' },
  { key: 'email', name: 'emailAddress', type: 'text', xPct: 54.8, yPct: 47.5, wPct: 35.4, hPct: 2.1, formKey: 'personal' },

  { key: 'res_house', name: 'residentialAddress.houseBlockLotNo', type: 'text', xPct: 54.8, yPct: 26.2, wPct: 17.5, hPct: 1.4, formKey: 'personal' },
  { key: 'res_street', name: 'residentialAddress.street', type: 'text', xPct: 72.2, yPct: 26.2, wPct: 18, hPct: 1.4, formKey: 'personal' },
  { key: 'res_subd', name: 'residentialAddress.subdivisionVillage', type: 'text', xPct: 54.8, yPct: 28.3, wPct: 17.5, hPct: 1.4, formKey: 'personal' },
  { key: 'res_brgy', name: 'residentialAddress.barangay', type: 'text', xPct: 72.2, yPct: 28.2, wPct: 18, hPct: 1.4, formKey: 'personal' },
  { key: 'res_city', name: 'residentialAddress.cityMunicipality', type: 'text', xPct: 54.8, yPct: 30.3, wPct: 17.5, hPct: 1.4, formKey: 'personal' },
  { key: 'res_prov', name: 'residentialAddress.province', type: 'text', xPct: 72.2, yPct: 30.2, wPct: 18, hPct: 1.4, formKey: 'personal' },
  { key: 'res_zip', name: 'residentialAddress.zipCode', type: 'text', xPct: 54.8, yPct: 32.68, wPct: 35.5, hPct: 1.9, formKey: 'personal' },

  // Permanent Address (manual entry only)
  { key: 'perm_house', name: 'permanentAddress.houseBlockLotNo', type: 'text', xPct: 54.8, yPct: 34.3, wPct: 17.5, hPct: 1.4, formKey: 'personal' },
  { key: 'perm_street', name: 'permanentAddress.street', type: 'text', xPct: 72.2, yPct: 34.3, wPct: 18, hPct: 1.4, formKey: 'personal' },
  { key: 'perm_subd', name: 'permanentAddress.subdivisionVillage', type: 'text', xPct: 54.8, yPct: 36.35, wPct: 17.5, hPct: 1.4, formKey: 'personal' },
  { key: 'perm_brgy', name: 'permanentAddress.barangay', type: 'text', xPct: 72.2, yPct: 36.35, wPct: 18, hPct: 1.4, formKey: 'personal' },
  { key: 'perm_city', name: 'permanentAddress.cityMunicipality', type: 'text', xPct: 54.8, yPct: 38.5, wPct: 17.5, hPct: 1.4, formKey: 'personal' },
  { key: 'perm_prov', name: 'permanentAddress.province', type: 'text', xPct: 72.2, yPct: 38.5, wPct: 18, hPct: 1.4, formKey: 'personal' },
  { key: 'perm_zip', name: 'permanentAddress.zipCode', type: 'text', xPct: 54.8, yPct: 41.1, wPct: 35.5, hPct: 2.1, formKey: 'personal' },

  // ======================================================================
  // FAMILY BACKGROUND — formKey: 'family'
  // NOTE: STARTER COORDINATES (adjust xPct/yPct to match your page1)
  // ======================================================================

  // Spouse
  { key: 'sp_surname', name: 'spouse.surname', type: 'text', xPct: 23.8, yPct: 50.8, wPct: 31, hPct: 1.8, formKey: 'family' },
  { key: 'sp_first', name: 'spouse.firstName', type: 'text', xPct: 23.8, yPct: 52.6, wPct: 19.3, hPct: 1.8, formKey: 'family' },
  { key: 'sp_ext', name: 'spouse.ext', type: 'text', xPct: 43, yPct: 52.9, wPct: 11.6, hPct: 1.2, formKey: 'family' },
  { key: 'sp_middle', name: 'spouse.middleName', type: 'text', xPct: 23.8, yPct: 54.4, wPct: 31, hPct: 1.8, formKey: 'family' },
  { key: 'sp_occupation', name: 'spouse.occupation', type: 'text', xPct: 23.8, yPct: 56.2, wPct: 31, hPct: 1.8, formKey: 'family' },
  { key: 'sp_employer', name: 'spouse.employerBusinessName', type: 'text', xPct: 23.8, yPct: 57.9, wPct: 31, hPct: 1.8, formKey: 'family' },
  { key: 'sp_business_addr', name: 'spouse.businessAddress', type: 'text', xPct: 23.8, yPct: 59.8, wPct: 31, hPct: 1.8, formKey: 'family' },
  { key: 'sp_tel', name: 'spouse.telephoneNo', type: 'text', xPct: 23.8, yPct: 61.5, wPct: 31, hPct: 1.8, formKey: 'family' },

  // Children table (12 rows) — fullName + dob
  ...Array.from({ length: 12 }).flatMap((_, i) => {
    const y = 52.7 + i * 1.78; // starter
    const rowFields: OverlayField[] = [
      { key: `ch_name_${i}`, name: `children.${i}.fullName`, type: 'text', xPct: 54.6, yPct: y, wPct: 23, hPct: 1.8, formKey: 'family' },
      { key: `ch_dob_${i}`, name: `children.${i}.dateOfBirth`, type: 'date', xPct: 77.6, yPct: y, wPct: 12.5, hPct: 1.8, formKey: 'family' },
    ];
    return rowFields;
  }),

  // Father
  { key: 'fa_surname', name: 'father.surname', type: 'text', xPct: 23.8, yPct: 63.3, wPct: 31, hPct: 1.8, formKey: 'family' },
  { key: 'fa_first', name: 'father.firstName', type: 'text', xPct: 23.8, yPct: 65.18, wPct: 19.3, hPct: 1.8, formKey: 'family' },
  { key: 'fa_ext', name: 'father.ext', type: 'text', xPct: 43, yPct: 65.4, wPct: 11.6, hPct: 1.2, formKey: 'family' },
  { key: 'fa_middle', name: 'father.middleName', type: 'text', xPct: 23.8, yPct: 66.8, wPct: 31, hPct: 1.8, formKey: 'family' },

  // Mother
  { key: 'mo_surname', name: 'mother.surname', type: 'text', xPct: 23.8, yPct: 70.5, wPct: 31, hPct: 1.8, formKey: 'family' },
  { key: 'mo_first', name: 'mother.firstName', type: 'text', xPct: 23.8, yPct: 72.3, wPct: 31, hPct: 1.8, formKey: 'family' },
  { key: 'mo_middle', name: 'mother.middleName', type: 'text', xPct: 23.8, yPct: 74.1, wPct: 31, hPct: 1.8, formKey: 'family' },

  // ======================================================================
  // EDUCATIONAL BACKGROUND — formKey: 'education'
  // NOTE: STARTER COORDINATES (adjust xPct/yPct to match your page1)
  // ======================================================================
  ...Array.from({ length: 5 }).flatMap((_, i) => {
    const y = 81.6 + i * 2.42; // starter
    const rowFields: OverlayField[] = [
      { key: `edu_school_${i}`, name: `items.${i}.nameOfSchool`, type: 'text', xPct: 23.8, yPct: y, wPct: 19.2, hPct: 2.4, formKey: 'education' },
      { key: `edu_course_${i}`, name: `items.${i}.basicEducationDegreeCourse`, type: 'text', xPct: 43, yPct: y, wPct: 17.75, hPct: 2.4, formKey: 'education' },
      { key: `edu_from_${i}`, name: `items.${i}.periodOfAttendance.from`, type: 'text', xPct: 60.6, yPct: y, wPct: 5, hPct: 2.4, formKey: 'education' },
      { key: `edu_to_${i}`, name: `items.${i}.periodOfAttendance.to`, type: 'text', xPct: 65.6  , yPct: y, wPct: 4.9, hPct: 2.4, formKey: 'education' },
      { key: `edu_units_${i}`, name: `items.${i}.highestLevelUnitsEarned`, type: 'text', xPct: 70.4, yPct: y, wPct: 7.2, hPct: 2.4, formKey: 'education' },
      { key: `edu_year_${i}`, name: `items.${i}.yearGraduated`, type: 'text', xPct: 77.6, yPct: y, wPct: 6, hPct: 2.4, formKey: 'education' },
      { key: `edu_honors_${i}`, name: `items.${i}.scholarshipAcademicHonors`, type: 'text', xPct: 83.4, yPct: y, wPct: 7, hPct: 2.4, formKey: 'education' },
    ];
    return rowFields;
  }),
];

/**
 * ✅ STEP 2 = PAGE 2 ONLY
 * Includes:
 * - Civil Service Eligibility
 * - Work Experience
 *
 * IMPORTANT:
 * - This is ONLY field mapping. It DOES NOT create new pages.
 * - We use formKey: 'eligibility' and formKey: 'work'
 */
export const PAGE2_STEP2_FIELDS: OverlayField[] = [
  // ======================================================================
  // ELIGIBILITY (7 rows) — formKey: 'eligibility'
  // ======================================================================
  ...Array.from({ length: 7 }).flatMap((_, i) => {
    const y = 6.9 + i * 2.5; // starter spacing
    const rowFields: OverlayField[] = [
      { key: `elig_career_${i}`, name: `items.${i}.careerService`, type: 'text', xPct: 15.6, yPct: y, wPct: 25.3, hPct: 2.6, formKey: 'eligibility' },
      { key: `elig_rating_${i}`, name: `items.${i}.rating`, type: 'text', xPct: 40.8, yPct: y, wPct: 8.8, hPct: 2.6, formKey: 'eligibility' },
      { key: `elig_date_${i}`, name: `items.${i}.dateOfExaminationConferment`, type: 'text', xPct: 49.4, yPct: y, wPct: 9.2, hPct: 2.6, formKey: 'eligibility' },
      { key: `elig_place_${i}`, name: `items.${i}.placeOfExaminationConferment`, type: 'text', xPct: 58.6, yPct: y, wPct: 12, hPct: 2.6, formKey: 'eligibility' },
      { key: `elig_lic_${i}`, name: `items.${i}.licenseNumber`, type: 'text', xPct: 70.6, yPct: y, wPct: 7.9, hPct: 2.6, formKey: 'eligibility' },
      { key: `elig_valid_${i}`, name: `items.${i}.licenseValidity`, type: 'text', xPct: 78.3, yPct: y, wPct: 7.9, hPct: 2.6, formKey: 'eligibility' },
    ];
    return rowFields;
  }),

  // ======================================================================
  // WORK EXPERIENCE (7 rows) — formKey: 'work'
  // ======================================================================
  ...Array.from({ length: 28 }).flatMap((_, i) => {
    const y = 33.2 + i * 2.22; // starter spacing
    const rowFields: OverlayField[] = [
      { key: `work_from_${i}`, name: `items.${i}.periodOfService.from`, type: 'text', xPct: 15.5, yPct: y, wPct: 6.8, hPct: 2.3, formKey: 'work' },
      { key: `work_to_${i}`, name: `items.${i}.periodOfService.to`, type: 'text', xPct: 22, yPct: y, wPct: 6.8, hPct: 2.3, formKey: 'work' },
      { key: `work_pos_${i}`, name: `items.${i}.positionTitle`, type: 'text', xPct: 28.7, yPct: y, wPct: 20.8, hPct: 2.3, formKey: 'work' },
      { key: `work_agency_${i}`, name: `items.${i}.departmentAgencyOfficeCompany`, type: 'text', xPct: 49.5, yPct: y, wPct: 21.1, hPct: 2.3, formKey: 'work' },
      { key: `work_status_${i}`, name: `items.${i}.statusOfAppointment`, type: 'text', xPct: 70.7, yPct: y, wPct: 7.7, hPct: 2.3, formKey: 'work' },
      { key: `work_gov_${i}`, name: `items.${i}.governmentService`, type: 'checkbox', xPct: 81, yPct: y + 0.6, wPct: 1.3, hPct: 1.3, formKey: 'work' },
    ];
    return rowFields;
  }),
];

export const PAGE3_STEP3_FIELDS: OverlayField[] = [
  // ======================================================================
  // VOLUNTARY WORK (max 7 rows) — formKey: 'voluntary'
  // ======================================================================
  ...Array.from({ length: 7 }).flatMap((_, i) => {
    const y = 8.6 + i * 2.33
    const rowFields: OverlayField[] = [
      { key: `vol_org_${i}`, name: `items.${i}.organizationName`, type: 'text', xPct: 9.7, yPct: y, wPct: 19, hPct: 2.3, formKey: 'voluntary' },
      { key: `vol_addr_${i}`, name: `items.${i}.organizationAddress`, type: 'text', xPct: 28.5, yPct: y, wPct: 17, hPct: 2.3, formKey: 'voluntary' },
      { key: `vol_from_${i}`, name: `items.${i}.periodOfInvolvement.from`, type: 'text', xPct: 45.3, yPct: y, wPct: 6.5, hPct: 2.3, formKey: 'voluntary' },
      { key: `vol_to_${i}`, name: `items.${i}.periodOfInvolvement.to`, type: 'text', xPct: 51.8, yPct: y, wPct: 6.4, hPct: 2.3, formKey: 'voluntary'},
      { key: `vol_hours_${i}`, name: `items.${i}.numberOfHours`, type: 'number', xPct: 58, yPct: y, wPct: 6.5, hPct: 2.3, formKey: 'voluntary' },
      { key: `vol_pos_${i}`, name: `items.${i}.positionNatureOfWork`, type: 'text', xPct: 64.4, yPct: y, wPct: 27.7, hPct: 2.3, formKey: 'voluntary' },
    ];
    return rowFields;
  }),

  // ======================================================================
  // TRAINING / L&D (max 21 rows) — formKey: 'training'
  // ======================================================================
  ...Array.from({ length: 21 }).flatMap((_, i) => {
    const y = 31.9 + i * 2.05;
    const rowFields: OverlayField[] = [
      { key: `tr_title_${i}`, name: `items.${i}.title`, type: 'text', xPct: 9.7, yPct: y, wPct: 35.7, hPct: 2.1, formKey: 'training' },
      { key: `tr_from_${i}`, name: `items.${i}.periodOfAttendance.from`, type: 'text', xPct: 45.4, yPct: y, wPct: 6.4, hPct: 2.1, formKey: 'training'},
      { key: `tr_to_${i}`, name: `items.${i}.periodOfAttendance.to`, type: 'text', xPct: 51.8, yPct: y, wPct: 6.4, hPct: 2.1, formKey: 'training'},
      { key: `tr_hours_${i}`, name: `items.${i}.numberOfHours`, type: 'number', xPct: 58, yPct: y, wPct: 6.5, hPct: 2.1, formKey: 'training' },
      { key: `tr_type_${i}`, name: `items.${i}.typeOfLD`, type: 'text', xPct: 64.5, yPct: y, wPct: 6.9, hPct: 2.1, formKey: 'training' },
      { key: `tr_sponsor_${i}`, name: `items.${i}.conductedSponsoredBy`, type: 'text', xPct: 71.2, yPct: y, wPct: 21, hPct: 2.1, formKey: 'training' },
    ];
    return rowFields;
  }),

  // ======================================================================
  // OTHER INFORMATION (page3 bottom) — formKey: 'other'
  // ======================================================================
  ...Array.from({ length: 7 }).flatMap((_, i) => {
    const y = 80.95 + i * 2.05  ;
    const rowFields: OverlayField[] = [
      { key: `oth_skill_${i}`, name: `skills.${i}`, type: 'text', xPct: 9.7, yPct: y, wPct: 21, hPct: 2.15, formKey: 'other' },
    ];
    return rowFields;
  }),

  ...Array.from({ length: 7 }).flatMap((_, i) => {
    const y = 80.95 + i * 2.05;
    const rowFields: OverlayField[] = [
      { key: `oth_recog_${i}`, name: `recognitions.${i}`, type: 'text', xPct: 30.7, yPct: y, wPct: 40.7, hPct: 2.15, formKey: 'other' },
    ];
    return rowFields;
  }),

  ...Array.from({ length: 7 }).flatMap((_, i) => {
    const y = 80.95 + i * 2.05;
    const rowFields: OverlayField[] = [
      { key: `oth_mem_${i}`, name: `memberships.${i}`, type: 'text', xPct: 71.2, yPct: y, wPct: 20.9, hPct: 2.15, formKey: 'other' },
    ];
    return rowFields;
  }),
];

/**
 * ✅ STEP 4 = PAGE 4 ONLY (Questions 34-40 + References + Gov ID + Signature/Date)
 * formKey: 'other'
 */
export const PAGE4_STEP4_FIELDS: OverlayField[] = [
  // ----------------------------------------------------------------------
  // Q34a / Q34b YES/NO
  // ----------------------------------------------------------------------
  { key: 'q34a_yes', name: 'relatedThirdDegree', type: 'checkbox', xPct: 62.6, yPct: 7.7, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q34a_no',  name: 'relatedThirdDegree', type: 'checkbox', xPct: 71, yPct: 7.7, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },

  { key: 'q34b_yes', name: 'relatedFourthDegree', type: 'checkbox', xPct: 62.6, yPct: 9.4, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q34b_no',  name: 'relatedFourthDegree', type: 'checkbox', xPct: 71, yPct: 9.4, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },

  { key: 'q34_details', name: 'relatedFourthDegreeDetails', type: 'text', xPct: 63.3, yPct: 11.5, wPct: 26.5, hPct: 2.0, formKey: 'other' },

  // ----------------------------------------------------------------------
  // Q35a / Q35b
  // ----------------------------------------------------------------------
  { key: 'q35a_yes', name: 'guiltyAdministrativeOffense', type: 'checkbox', xPct: 62.3, yPct: 14.4, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q35a_no',  name: 'guiltyAdministrativeOffense', type: 'checkbox', xPct: 71.2, yPct: 14.4, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q35a_details', name: 'guiltyAdministrativeOffenseDetails', type: 'text', xPct: 63.3, yPct: 16.5, wPct: 26.5, hPct: 2.0, formKey: 'other' },

  { key: 'q35b_yes', name: 'criminallyCharged', type: 'checkbox', xPct: 62.3, yPct: 19.6, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q35b_no',  name: 'criminallyCharged', type: 'checkbox', xPct: 71.5, yPct: 19.6, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },

  { key: 'q35b_details', name: 'criminallyChargedDetails', type: 'text', xPct: 72, yPct: 23, wPct: 3, hPct: 1.8, formKey: 'other' },
  { key: 'q35b_date', name: 'criminallyChargedDateFiled', type: 'text', xPct: 72, yPct: 21.7, wPct: 18, hPct: 1.8, formKey: 'other' },
  { key: 'q35b_status', name: 'criminallyChargedStatus', type: 'text', xPct: 76, yPct: 23, wPct: 14, hPct: 1.8, formKey: 'other' },

  // ----------------------------------------------------------------------
  // Q36
  // ----------------------------------------------------------------------
  { key: 'q36_yes', name: 'convicted', type: 'checkbox', xPct: 62.3, yPct: 26, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q36_no',  name: 'convicted', type: 'checkbox', xPct: 72, yPct: 26, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q36_details', name: 'convictedDetails', type: 'text', xPct: 63.3, yPct: 28, wPct: 26.5, hPct: 2.0, formKey: 'other' },

  // ----------------------------------------------------------------------
  // Q37
  // ----------------------------------------------------------------------
  { key: 'q37_yes', name: 'separatedFromService', type: 'checkbox', xPct: 62.3, yPct: 31, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q37_no',  name: 'separatedFromService', type: 'checkbox', xPct: 72, yPct: 31, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q37_details', name: 'separatedFromServiceDetails', type: 'text', xPct: 63.3, yPct: 32.5, wPct: 26.5, hPct: 2.0, formKey: 'other' },

  // ----------------------------------------------------------------------
  // Q38a / Q38b
  // ----------------------------------------------------------------------
  { key: 'q38a_yes', name: 'candidateNationalLocal', type: 'checkbox', xPct: 62.3, yPct:35.3, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q38a_no',  name: 'candidateNationalLocal', type: 'checkbox', xPct: 72.4, yPct: 35.3, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q38a_details', name: 'candidateNationalLocalDetails', type: 'text', xPct: 72, yPct: 36, wPct: 18.0, hPct: 2.0, formKey: 'other' },

  { key: 'q38b_yes', name: 'resignedForCandidacy', type: 'checkbox', xPct: 62.6, yPct: 38.4, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q38b_no',  name: 'resignedForCandidacy', type: 'checkbox', xPct: 72.8, yPct: 38.4, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q38b_details', name: 'resignedForCandidacyDetails', type: 'text', xPct: 72, yPct: 39.5, wPct: 18.0, hPct: 2.0, formKey: 'other' },

  // ----------------------------------------------------------------------
  // Q39
  // ----------------------------------------------------------------------
  { key: 'q39_yes', name: 'immigrantOrPermanentResident', type: 'checkbox', xPct: 62.4, yPct: 42.1, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q39_no',  name: 'immigrantOrPermanentResident', type: 'checkbox', xPct: 72.6, yPct: 42.1, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q39_country', name: 'immigrantOrPermanentResidentCountry', type: 'text', xPct: 63.1, yPct: 44, wPct: 27.0, hPct: 2.0, formKey: 'other' },

  // ----------------------------------------------------------------------
  // Q40a / Q40b / Q40c
  // ----------------------------------------------------------------------
  { key: 'q40a_yes', name: 'indigenousGroupMember', type: 'checkbox', xPct: 62.4, yPct: 50.9, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q40a_no',  name: 'indigenousGroupMember', type: 'checkbox', xPct: 73, yPct: 50.9, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q40a_spec', name: 'indigenousGroupName', type: 'text', xPct: 77.1, yPct: 51.5, wPct: 13, hPct: 2.0, formKey: 'other' },

  { key: 'q40b_yes', name: 'personWithDisability', type: 'checkbox', xPct: 62.4, yPct: 53.4, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q40b_no',  name: 'personWithDisability', type: 'checkbox', xPct: 73, yPct: 53.5, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q40b_id', name: 'pwdIdNumber', type: 'text', xPct: 77.1, yPct: 54, wPct: 13, hPct: 2.0, formKey: 'other' },

  { key: 'q40c_yes', name: 'soloParent', type: 'checkbox', xPct: 62.4, yPct: 56.3, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },
  { key: 'q40c_no',  name: 'soloParent', type: 'checkbox', xPct: 73, yPct: 56.3, wPct: 1.4, hPct: 1.4, checkboxValue: 'NO',  formKey: 'other' },
  { key: 'q40c_id', name: 'soloParentIdNumber', type: 'text', xPct: 77.1, yPct: 56.5 , wPct: 13, hPct: 2.0, formKey: 'other' },

  // ----------------------------------------------------------------------
  // REFERENCES (3 rows)
  // ----------------------------------------------------------------------
  { key: 'ref_name_0', name: 'references.0.name', type: 'text', xPct: 10.4, yPct: 63.1, wPct: 31.1, hPct: 2.4, formKey: 'other' },
  { key: 'ref_addr_0', name: 'references.0.address', type: 'text', xPct: 41.5, yPct: 63.1, wPct: 19.4, hPct: 2.4, formKey: 'other' },
  { key: 'ref_tel_0',  name: 'references.0.telephoneNo', type: 'text', xPct: 60.8, yPct: 63.1, wPct: 10, hPct: 2.4, formKey: 'other' },

  { key: 'ref_name_1', name: 'references.1.name', type: 'text', xPct: 10.4, yPct: 65.3, wPct: 31.1, hPct: 2.4, formKey: 'other' },
  { key: 'ref_addr_1', name: 'references.1.address', type: 'text', xPct: 41.5, yPct: 65.45, wPct: 19.4, hPct: 2.4, formKey: 'other' },
  { key: 'ref_tel_1',  name: 'references.1.telephoneNo', type: 'text', xPct: 60.8, yPct: 65.5, wPct: 10.0, hPct: 2.4, formKey: 'other' },

  { key: 'ref_name_2', name: 'references.2.name', type: 'text', xPct: 10.4, yPct: 67.75, wPct: 31.1, hPct: 2.4, formKey: 'other' },
  { key: 'ref_addr_2', name: 'references.2.address', type: 'text', xPct: 41.5, yPct: 67.75, wPct: 19.4, hPct: 2.4, formKey: 'other' },
  { key: 'ref_tel_2',  name: 'references.2.telephoneNo', type: 'text', xPct: 60.8, yPct: 67.75, wPct: 10.0, hPct: 2.4, formKey: 'other' },

  // ----------------------------------------------------------------------
  // GOVERNMENT ISSUED ID BOX (bottom-left)
  // ----------------------------------------------------------------------
  { key: 'gov_type', name: 'governmentIssuedId.type', type: 'text', xPct: 22, yPct: 81 , wPct: 17.6, hPct: 2.0, formKey: 'other' },
  { key: 'gov_no',   name: 'governmentIssuedId.idNumber', type: 'text', xPct: 22, yPct: 83, wPct: 17.6, hPct: 2.0, formKey: 'other' },
  { key: 'gov_date', name: 'governmentIssuedId.dateIssued', type: 'text', xPct: 22, yPct: 85.05, wPct: 17.6, hPct: 2.2, formKey: 'other' },

  // ----------------------------------------------------------------------
  // DECLARATION AGREED checkbox
  // ----------------------------------------------------------------------
  { key: 'decl_agree', name: 'declaration.agreed', type: 'checkbox', xPct: 10.7, yPct: 71, wPct: 1.4, hPct: 1.4, checkboxValue: 'YES', formKey: 'other' },

  // ----------------------------------------------------------------------
  // SIGNATURE BOX + DATE ACCOMPLISHED
  // ----------------------------------------------------------------------
  { key: 'declaration_signature_canvas', name: 'declaration.signatureData', type: 'textarea', xPct: 41, yPct: 77.5, wPct: 30, hPct: 7, formKey: 'other' },
  { key: 'decl_date', name: 'declaration.dateAccomplished', type: 'date', xPct: 50.5, yPct: 84.5  , wPct: 12  , hPct: 2.0, formKey: 'other' },
];
