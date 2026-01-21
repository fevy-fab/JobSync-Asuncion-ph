// scripts/test-ranking.ts

// Load environment variables (so GEMINI_API_KEY is available)
import 'dotenv/config';

import { rankApplicantsForJob } from '../src/lib/gemini/rankApplicants';

async function main() {
  // 1) Define a sample job (shape matches your rankApplicantsForJob input)
  const job = {
    id: 'JOB-001',
    title: 'Administrative Officer II',
    description:
      'Administrative Officer II position responsible for office management, records, and coordination tasks in the municipal hall.',
    degreeRequirement: 'Bachelor of Science in Office Administration or Public Administration',
    eligibilities: ['Civil Service Professional Eligibility'],
    skills: [
      'Records management',
      'Office administration',
      'Communication skills',
      'Microsoft Office',
    ],
    yearsOfExperience: 2,
  };

  // 2) Define a few sample applicants
  const applicants = [
    {
      applicantId: 'APP-001',
      applicantProfileId: 'P-001',
      applicantName: 'Juan Dela Cruz',
      highestEducationalAttainment: 'BS in Office Administration',
      eligibilities: [
        { eligibilityTitle: 'Career Service Professional Eligible' },
      ],
      skills: [
        'Records management',
        'Office admin',
        'Microsoft Word',
        'Microsoft Excel',
      ],
      totalYearsExperience: 3,
      workExperienceTitles: ['Administrative Aide', 'Office Clerk'],
    },
    {
      applicantId: 'APP-002',
      applicantProfileId: 'P-002',
      applicantName: 'Maria Santos',
      highestEducationalAttainment: 'Bachelor of Science in Business Administration',
      eligibilities: [
        { eligibilityTitle: 'Civil Service Professional Eligibility' },
      ],
      skills: ['Communication skills', 'Customer service', 'Microsoft Office'],
      totalYearsExperience: 1,
      workExperienceTitles: ['Customer Service Representative'],
    },
    {
      applicantId: 'APP-003',
      applicantProfileId: 'P-003',
      applicantName: 'Pedro Reyes',
      highestEducationalAttainment: 'BS Accountancy',
      eligibilities: [
        { eligibilityTitle: 'ICT Eligibility' },
      ],
      skills: ['Accounting', 'Bookkeeping'],
      totalYearsExperience: 4,
      workExperienceTitles: ['Bookkeeper'],
    },
  ];

  console.log('▶ Running rankApplicantsForJob test...\n');

  try {
    const ranked = await rankApplicantsForJob(job, applicants);

    console.log('✅ Ranking completed. Results:\n');
    console.dir(ranked, { depth: null });

    console.log('\nTop candidate:', ranked[0]?.applicantName, '-', ranked[0]?.matchScore + '%');
  } catch (err) {
    console.error('❌ Error while ranking applicants:', err);
  }
}

main().then(() => {
  // Exit explicitly so Node process ends.
  process.exit(0);
});
