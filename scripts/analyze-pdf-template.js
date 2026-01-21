/**
 * Analyze PDF Template Form Fields
 *
 * This script loads the official CSC PDS 2025 PDF template and extracts all form field names.
 * Run with: node scripts/analyze-pdf-template.js
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function analyzePDFTemplate() {
  try {
    console.log('🔍 Analyzing CS Form 212, Revised 2025 PDF Template...\n');

    const templatePath = path.join(__dirname, '../public/templates/CS_Form_212_2025.pdf');
    const pdfBytes = fs.readFileSync(templatePath);

    console.log(`📄 Loading PDF from: ${templatePath}`);
    console.log(`📦 File size: ${(pdfBytes.length / 1024).toFixed(2)} KB\n`);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`📝 Total Form Fields Found: ${fields.length}\n`);
    console.log('=' .repeat(80));
    console.log('FORM FIELD DETAILS');
    console.log('='.repeat(80));

    const fieldsBySection = {
      'Personal Information': [],
      'Family Background': [],
      'Educational Background': [],
      'Eligibility': [],
      'Work Experience': [],
      'Voluntary Work': [],
      'Trainings': [],
      'Other Information': [],
      'Unknown': []
    };

    fields.forEach((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;

      // Try to categorize by field name pattern
      let section = 'Unknown';
      if (fieldName.match(/surname|firstname|middlename|name|dob|birth|sex|civil|height|weight|blood|gsis|pagibig|philhealth|tin|residential|permanent|telephone|mobile|email|citizenship/i)) {
        section = 'Personal Information';
      } else if (fieldName.match(/spouse|child|children|father|mother/i)) {
        section = 'Family Background';
      } else if (fieldName.match(/elementary|secondary|vocational|college|graduate|school|degree|course|year.*graduated/i)) {
        section = 'Educational Background';
      } else if (fieldName.match(/eligibility|career.*service|exam|license|rating/i)) {
        section = 'Eligibility';
      } else if (fieldName.match(/work|position|department|agency|salary|grade|appointment/i)) {
        section = 'Work Experience';
      } else if (fieldName.match(/voluntary|organization|civic/i)) {
        section = 'Voluntary Work';
      } else if (fieldName.match(/training|learning|development|seminar|hours/i)) {
        section = 'Trainings';
      } else if (fieldName.match(/skill|recognition|membership|reference|question|q\d+|declaration/i)) {
        section = 'Other Information';
      }

      fieldsBySection[section].push({
        index,
        name: fieldName,
        type: fieldType
      });

      console.log(`${index + 1}. [${fieldType}] ${fieldName}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('FIELDS GROUPED BY SECTION');
    console.log('='.repeat(80));

    Object.entries(fieldsBySection).forEach(([section, sectionFields]) => {
      if (sectionFields.length > 0) {
        console.log(`\n📋 ${section} (${sectionFields.length} fields):`);
        sectionFields.forEach(field => {
          console.log(`   - ${field.name} (${field.type})`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis complete!');
    console.log('='.repeat(80));

    // Save field names to JSON for easy reference
    const outputPath = path.join(__dirname, '../src/lib/pds/pdfFieldNames.json');
    const fieldNames = fields.map(f => ({
      name: f.getName(),
      type: f.constructor.name
    }));

    fs.writeFileSync(outputPath, JSON.stringify({ fields: fieldNames, fieldsBySection }, null, 2));
    console.log(`\n💾 Field names saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error analyzing PDF template:', error);
    process.exit(1);
  }
}

analyzePDFTemplate();
